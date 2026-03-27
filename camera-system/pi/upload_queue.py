"""
SQLite-backed persistent upload queue.
Tracks images that failed immediate upload so the background worker
can retry them when connectivity returns. Survives Pi reboots.

Importable from both pi/ (trigger_server) and model/ (detect_daemon);
pass explicit *db_path* / *max_retries* when ``pi.config`` is not on
``sys.path``.
"""

from __future__ import annotations

import logging
import os
import sqlite3
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

try:
    import config as _cfg

    _DEFAULT_DB_PATH: str = str(_cfg.UPLOAD_QUEUE_DB)
    _DEFAULT_MAX_RETRIES: int = _cfg.UPLOAD_MAX_RETRIES
except Exception:
    _DEFAULT_DB_PATH = "/data/tunnel/queue.db"
    _DEFAULT_MAX_RETRIES = 5


def _max_pending_cap() -> int:
    try:
        import config as _cfg

        return int(_cfg.UPLOAD_QUEUE_MAX_PENDING)
    except Exception:
        return int(os.environ.get("UPLOAD_QUEUE_MAX_PENDING", "2000"))


logger = logging.getLogger(__name__)

_CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS upload_queue (
    id          TEXT PRIMARY KEY,
    event_id    TEXT NOT NULL,
    camera_id   TEXT NOT NULL,
    local_path  TEXT NOT NULL,
    s3_key      TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'pending',
    created_at  TEXT NOT NULL,
    attempts    INTEGER NOT NULL DEFAULT 0,
    last_error  TEXT
);
"""

_CREATE_INDEX_SQL = """
CREATE INDEX IF NOT EXISTS idx_status ON upload_queue (status);
"""


@dataclass
class QueueItem:
    """A single row from the upload queue."""

    id: str
    event_id: str
    camera_id: str
    local_path: str
    s3_key: str
    status: str
    created_at: str
    attempts: int
    last_error: str | None


@dataclass
class QueueStats:
    """Aggregate counts by status."""

    pending: int = 0
    uploading: int = 0
    uploaded: int = 0
    failed: int = 0
    dead_letter: int = 0

    @property
    def total(self) -> int:
        return self.pending + self.uploading + self.uploaded + self.failed + self.dead_letter


class UploadQueue:
    """Persistent queue backed by SQLite.

    Both ``trigger_server`` and ``detect_daemon`` can instantiate this class.
    Pass *db_path* / *max_retries* explicitly when importing outside ``pi/``.
    """

    def __init__(
        self,
        db_path: Path | str | None = None,
        max_retries: int | None = None,
    ):
        self._db_path = str(db_path or _DEFAULT_DB_PATH)
        self._max_retries = max_retries if max_retries is not None else _DEFAULT_MAX_RETRIES
        self._ensure_dir()
        self._init_db()

    def _ensure_dir(self) -> None:
        Path(self._db_path).parent.mkdir(parents=True, exist_ok=True)

    def _conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path, timeout=5)
        conn.execute("PRAGMA journal_mode=WAL")
        return conn

    def _init_db(self) -> None:
        with self._conn() as conn:
            conn.execute(_CREATE_TABLE_SQL)
            conn.execute(_CREATE_INDEX_SQL)

    def _pending_count(self) -> int:
        with self._conn() as conn:
            row = conn.execute(
                "SELECT COUNT(*) FROM upload_queue WHERE status = 'pending'"
            ).fetchone()
        return int(row[0]) if row else 0

    def enqueue(self, event_id: str, camera_id: str, local_path: str, s3_key: str) -> str | None:
        """Add one failed upload to the queue. Returns item id, or None if at capacity."""
        cap = _max_pending_cap()
        if self._pending_count() >= cap:
            logger.error(
                "enqueue refused: pending at cap (%d) for %s/%s",
                cap,
                event_id,
                camera_id,
            )
            return None
        item_id = uuid.uuid4().hex[:16]
        now = datetime.now(timezone.utc).isoformat()
        with self._conn() as conn:
            conn.execute(
                """
                INSERT INTO upload_queue
                    (id, event_id, camera_id, local_path, s3_key, status, created_at)
                VALUES (?, ?, ?, ?, ?, 'pending', ?)
                """,
                (item_id, event_id, camera_id, local_path, s3_key, now),
            )
        logger.info(
            "Enqueued %s/%s for retry (id=%s)",
            event_id,
            camera_id,
            item_id,
            extra={"event_id": event_id, "correlation_id": event_id},
        )
        return item_id

    def enqueue_scan(
        self,
        event_id: str,
        frames: list[tuple[str, str, str]],
        event_json_path: str | None = None,
        event_json_s3_key: str | None = None,
    ) -> int:
        """Enqueue all frames (and optionally event.json) from a burst scan.

        *frames* is a list of ``(camera_id, local_path, s3_key)`` tuples.
        Returns total number of items enqueued.
        """
        now = datetime.now(timezone.utc).isoformat()
        rows: list[tuple[str, str, str, str, str, str]] = []
        for camera_id, local_path, s3_key in frames:
            rows.append((uuid.uuid4().hex[:16], event_id, camera_id, local_path, s3_key, now))

        if event_json_path and event_json_s3_key:
            rows.append(
                (uuid.uuid4().hex[:16], event_id, "__meta__", event_json_path, event_json_s3_key, now)
            )

        cap = _max_pending_cap()
        pending = self._pending_count()
        if pending + len(rows) > cap:
            logger.error(
                "enqueue_scan refused: pending=%d adding=%d cap=%d event=%s",
                pending,
                len(rows),
                cap,
                event_id,
                extra={"event_id": event_id, "correlation_id": event_id},
            )
            return 0

        with self._conn() as conn:
            conn.executemany(
                """
                INSERT INTO upload_queue
                    (id, event_id, camera_id, local_path, s3_key, status, created_at)
                VALUES (?, ?, ?, ?, ?, 'pending', ?)
                """,
                rows,
            )
        logger.info(
            "enqueue_scan: queued %d items for event %s",
            len(rows),
            event_id,
            extra={"event_id": event_id, "correlation_id": event_id},
        )
        return len(rows)

    def enqueue_failures(self, event_id: str, s3_results: list) -> int:
        """
        Convenience: enqueue all failed S3Result items from an upload attempt.
        Returns number of items enqueued.
        """
        count = 0
        for r in s3_results:
            if not r.success:
                qid = self.enqueue(event_id, r.camera_id, str(r.local_path), r.s3_key)
                if qid:
                    count += 1
        return count

    def dequeue_batch(self, batch_size: int = 10) -> list[QueueItem]:
        """
        Get the next batch of pending items and mark them as 'uploading'.
        Returns list of QueueItem.
        """
        with self._conn() as conn:
            rows = conn.execute(
                """
                SELECT id, event_id, camera_id, local_path, s3_key,
                       status, created_at, attempts, last_error
                FROM upload_queue
                WHERE status = 'pending'
                ORDER BY created_at ASC
                LIMIT ?
                """,
                (batch_size,),
            ).fetchall()

            items = [QueueItem(*row) for row in rows]
            if items:
                ids = [it.id for it in items]
                placeholders = ",".join("?" * len(ids))
                conn.execute(
                    f"UPDATE upload_queue SET status = 'uploading' WHERE id IN ({placeholders})",
                    ids,
                )
            return items

    def mark_uploaded(self, item_id: str) -> None:
        """Mark an item as successfully uploaded."""
        with self._conn() as conn:
            conn.execute(
                "UPDATE upload_queue SET status = 'uploaded' WHERE id = ?",
                (item_id,),
            )

    def mark_failed(
        self,
        item_id: str,
        error: str,
        max_retries: int | None = None,
        *,
        event_id: str | None = None,
    ) -> bool:
        """Mark an item as failed and increment the attempt counter.

        If *max_retries* is provided and the item has exceeded it, the status
        is set to ``'dead_letter'`` instead of ``'pending'``.

        Returns ``True`` if the item was moved to dead-letter.
        """
        if max_retries is None:
            max_retries = self._max_retries

        with self._conn() as conn:
            row = conn.execute(
                "SELECT attempts FROM upload_queue WHERE id = ?", (item_id,)
            ).fetchone()
            new_attempts = (row[0] if row else 0) + 1
            new_status = "dead_letter" if new_attempts >= max_retries else "pending"
            conn.execute(
                """
                UPDATE upload_queue
                SET status = ?, attempts = ?, last_error = ?
                WHERE id = ?
                """,
                (new_status, new_attempts, error, item_id),
            )
            if new_status == "dead_letter":
                extra: dict = {}
                if event_id:
                    extra["event_id"] = event_id
                    extra["correlation_id"] = event_id
                logger.warning(
                    "Item %s moved to dead-letter after %d attempts: %s",
                    item_id,
                    new_attempts,
                    error,
                    extra=extra,
                )
            return new_status == "dead_letter"

    def stats(self) -> QueueStats:
        """Return aggregate counts by status."""
        with self._conn() as conn:
            rows = conn.execute(
                "SELECT status, COUNT(*) FROM upload_queue GROUP BY status"
            ).fetchall()
        s = QueueStats()
        for status, count in rows:
            if hasattr(s, status):
                setattr(s, status, count)
        return s

    def cleanup_uploaded(self, delete_files: bool = True) -> int:
        """
        Remove entries with status='uploaded' and optionally delete local files.
        Returns number of entries removed.
        """
        with self._conn() as conn:
            if delete_files:
                rows = conn.execute(
                    "SELECT local_path FROM upload_queue WHERE status = 'uploaded'"
                ).fetchall()
                for (path_str,) in rows:
                    p = Path(path_str)
                    if p.exists():
                        p.unlink()
                        logger.debug("Deleted local file %s", p)

            cursor = conn.execute(
                "DELETE FROM upload_queue WHERE status = 'uploaded'"
            )
            removed = cursor.rowcount
            if removed:
                logger.info("Cleaned up %d uploaded queue entries", removed)
            return removed
