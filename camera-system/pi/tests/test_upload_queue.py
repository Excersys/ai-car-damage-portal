"""
Unit tests for upload_queue module.
Uses a temporary SQLite database for each test.
"""

import sqlite3
import threading
import time
from pathlib import Path

import pytest

from upload_queue import QueueItem, QueueStats, UploadQueue


@pytest.fixture
def q(tmp_path):
    db = tmp_path / "test_queue.db"
    return UploadQueue(db_path=db, max_retries=5)


@pytest.fixture
def db_path(tmp_path):
    """Return a fresh DB path for tests that need to construct UploadQueue themselves."""
    return tmp_path / "custom_queue.db"


class TestEnqueue:
    def test_enqueue_returns_id(self, q):
        item_id = q.enqueue("evt1", "usb_0", "/tmp/a.jpg", "evt1/usb_0.jpg")
        assert isinstance(item_id, str)
        assert len(item_id) == 16

    def test_enqueue_refused_at_pending_cap(self, q, monkeypatch):
        monkeypatch.setattr("upload_queue._max_pending_cap", lambda: 2)
        assert q.enqueue("evt1", "usb_0", "/tmp/a.jpg", "k1") is not None
        assert q.enqueue("evt1", "usb_1", "/tmp/b.jpg", "k2") is not None
        assert q.enqueue("evt1", "usb_2", "/tmp/c.jpg", "k3") is None
        assert q.stats().pending == 2

    def test_enqueue_shows_in_stats(self, q):
        q.enqueue("evt1", "usb_0", "/tmp/a.jpg", "evt1/usb_0.jpg")
        q.enqueue("evt1", "usb_1", "/tmp/b.jpg", "evt1/usb_1.jpg")
        stats = q.stats()
        assert stats.pending == 2
        assert stats.total == 2


class TestEnqueueScan:
    def test_enqueues_all_frames(self, q):
        frames = [
            ("cam_1", "/tmp/cam_1/frame_0000.jpg", "scans/ABC123/evt1/cam_1/frame_0000.jpg"),
            ("cam_1", "/tmp/cam_1/frame_0001.jpg", "scans/ABC123/evt1/cam_1/frame_0001.jpg"),
            ("cam_2", "/tmp/cam_2/frame_0000.jpg", "scans/ABC123/evt1/cam_2/frame_0000.jpg"),
        ]
        count = q.enqueue_scan("evt1", frames)
        assert count == 3
        assert q.stats().pending == 3

    def test_enqueues_frames_and_event_json(self, q):
        frames = [
            ("cam_1", "/tmp/cam_1/frame_0000.jpg", "scans/ABC123/evt1/cam_1/frame_0000.jpg"),
        ]
        count = q.enqueue_scan(
            "evt1",
            frames,
            event_json_path="/tmp/evt1/event.json",
            event_json_s3_key="scans/ABC123/evt1/event.json",
        )
        assert count == 2
        assert q.stats().pending == 2

    def test_enqueue_scan_items_are_dequeueable(self, q):
        frames = [
            ("cam_1", "/tmp/frame.jpg", "scans/X/e/cam_1/frame_0000.jpg"),
            ("cam_2", "/tmp/frame2.jpg", "scans/X/e/cam_2/frame_0000.jpg"),
        ]
        q.enqueue_scan("evt1", frames)
        batch = q.dequeue_batch(10)
        assert len(batch) == 2
        s3_keys = {item.s3_key for item in batch}
        assert "scans/X/e/cam_1/frame_0000.jpg" in s3_keys
        assert "scans/X/e/cam_2/frame_0000.jpg" in s3_keys

    def test_enqueue_scan_empty_frames(self, q):
        count = q.enqueue_scan("evt1", [])
        assert count == 0
        assert q.stats().pending == 0

    def test_enqueue_scan_refused_when_would_exceed_cap(self, q, monkeypatch):
        monkeypatch.setattr("upload_queue._max_pending_cap", lambda: 2)
        q.enqueue("e0", "c", "/tmp/x", "k")
        q.enqueue("e0", "c2", "/tmp/y", "k2")
        frames = [("cam_1", "/tmp/f.jpg", "scans/X/e/cam_1/frame_0000.jpg")]
        assert q.enqueue_scan("evt1", frames) == 0
        assert q.stats().pending == 2

    def test_enqueue_scan_event_json_only_when_both_args(self, q):
        """event.json is only enqueued when both path and s3_key are given."""
        frames = [("cam_1", "/tmp/f.jpg", "scans/X/e/cam_1/frame_0000.jpg")]
        count = q.enqueue_scan("evt1", frames, event_json_path="/tmp/event.json")
        assert count == 1  # no s3_key → event.json skipped

    def test_enqueue_scan_meta_camera_id(self, q):
        """event.json row uses __meta__ as camera_id."""
        frames = [("cam_1", "/tmp/f.jpg", "scans/X/e/cam_1/frame_0000.jpg")]
        q.enqueue_scan(
            "evt1", frames,
            event_json_path="/tmp/event.json",
            event_json_s3_key="scans/X/e/event.json",
        )
        batch = q.dequeue_batch(10)
        camera_ids = {item.camera_id for item in batch}
        assert "cam_1" in camera_ids
        assert "__meta__" in camera_ids

    def test_enqueue_scan_preserves_event_id(self, q):
        """All items share the same event_id."""
        frames = [
            ("cam_1", "/tmp/a.jpg", "scans/X/e/cam_1/frame_0000.jpg"),
            ("cam_2", "/tmp/b.jpg", "scans/X/e/cam_2/frame_0000.jpg"),
        ]
        q.enqueue_scan(
            "my_event_42", frames,
            event_json_path="/tmp/event.json",
            event_json_s3_key="scans/X/my_event_42/event.json",
        )
        batch = q.dequeue_batch(10)
        assert all(item.event_id == "my_event_42" for item in batch)

    def test_enqueue_scan_large_burst(self, q):
        """Handles a realistic large burst (e.g. 60 frames across 4 cameras)."""
        frames = [
            (f"cam_{c}", f"/tmp/cam_{c}/frame_{f:04d}.jpg", f"scans/P/e/cam_{c}/frame_{f:04d}.jpg")
            for c in range(4)
            for f in range(15)
        ]
        count = q.enqueue_scan("large_evt", frames)
        assert count == 60
        assert q.stats().pending == 60

    def test_enqueue_scan_unique_ids(self, q):
        """Each enqueued item gets a unique queue id."""
        frames = [
            ("cam_1", f"/tmp/{i}.jpg", f"scans/X/e/cam_1/frame_{i:04d}.jpg")
            for i in range(10)
        ]
        q.enqueue_scan("evt1", frames)
        batch = q.dequeue_batch(20)
        ids = [item.id for item in batch]
        assert len(ids) == len(set(ids)), "Queue item IDs must be unique"

    def test_enqueue_scan_atomicity(self, q):
        """All items from one enqueue_scan call have the same created_at timestamp."""
        frames = [
            (f"cam_{i}", f"/tmp/{i}.jpg", f"scans/X/e/cam_{i}/frame_0000.jpg")
            for i in range(5)
        ]
        q.enqueue_scan("evt1", frames)
        batch = q.dequeue_batch(10)
        timestamps = {item.created_at for item in batch}
        assert len(timestamps) == 1, "All items in a scan batch should share the same timestamp"


class TestEnqueueFailures:
    def test_enqueues_only_failures(self, q):
        from s3_uploader import S3Result

        results = [
            S3Result(camera_id="usb_0", local_path=Path("/a.jpg"), s3_key="e/0.jpg", success=True),
            S3Result(camera_id="usb_1", local_path=Path("/b.jpg"), s3_key="e/1.jpg", success=False, error="net"),
            S3Result(camera_id="usb_2", local_path=Path("/c.jpg"), s3_key="e/2.jpg", success=False, error="net"),
        ]
        count = q.enqueue_failures("evt1", results)
        assert count == 2
        assert q.stats().pending == 2


class TestDequeueBatch:
    def test_dequeue_marks_as_uploading(self, q):
        q.enqueue("evt1", "usb_0", "/tmp/a.jpg", "evt1/usb_0.jpg")
        q.enqueue("evt1", "usb_1", "/tmp/b.jpg", "evt1/usb_1.jpg")

        batch = q.dequeue_batch(10)

        assert len(batch) == 2
        stats = q.stats()
        assert stats.pending == 0
        assert stats.uploading == 2

    def test_dequeue_respects_limit(self, q):
        for i in range(5):
            q.enqueue("evt1", f"usb_{i}", f"/tmp/{i}.jpg", f"evt1/usb_{i}.jpg")

        batch = q.dequeue_batch(2)
        assert len(batch) == 2
        assert q.stats().pending == 3
        assert q.stats().uploading == 2

    def test_dequeue_empty_queue(self, q):
        batch = q.dequeue_batch(10)
        assert batch == []


class TestMarkUploaded:
    def test_mark_uploaded(self, q):
        item_id = q.enqueue("evt1", "usb_0", "/tmp/a.jpg", "evt1/usb_0.jpg")
        q.dequeue_batch(1)
        q.mark_uploaded(item_id)

        stats = q.stats()
        assert stats.uploaded == 1
        assert stats.uploading == 0


class TestMarkFailed:
    def test_mark_failed_resets_to_pending(self, q):
        item_id = q.enqueue("evt1", "usb_0", "/tmp/a.jpg", "evt1/usb_0.jpg")
        q.dequeue_batch(1)
        q.mark_failed(item_id, "timeout")

        stats = q.stats()
        assert stats.pending == 1
        assert stats.uploading == 0

    def test_mark_failed_increments_attempts(self, q):
        item_id = q.enqueue("evt1", "usb_0", "/tmp/a.jpg", "evt1/usb_0.jpg")

        for _ in range(3):
            q.dequeue_batch(1)
            q.mark_failed(item_id, "timeout")

        batch = q.dequeue_batch(1)
        assert batch[0].attempts == 3


class TestCleanupUploaded:
    def test_cleanup_removes_uploaded_entries(self, q, tmp_path):
        f = tmp_path / "a.jpg"
        f.write_bytes(b"data")

        item_id = q.enqueue("evt1", "usb_0", str(f), "evt1/usb_0.jpg")
        q.dequeue_batch(1)
        q.mark_uploaded(item_id)

        removed = q.cleanup_uploaded(delete_files=True)

        assert removed == 1
        assert q.stats().total == 0
        assert not f.exists()

    def test_cleanup_keeps_pending(self, q):
        q.enqueue("evt1", "usb_0", "/tmp/a.jpg", "evt1/usb_0.jpg")
        removed = q.cleanup_uploaded(delete_files=False)
        assert removed == 0
        assert q.stats().pending == 1


class TestMarkFailedDeadLetter:
    """Dead-letter behavior when max_retries is exceeded."""

    def test_dead_letter_after_max_retries(self, tmp_path):
        q = UploadQueue(db_path=tmp_path / "dl.db", max_retries=3)
        item_id = q.enqueue("evt1", "usb_0", "/tmp/a.jpg", "evt1/usb_0.jpg")

        for i in range(3):
            q.dequeue_batch(1)
            is_dead = q.mark_failed(item_id, f"error_{i}")

        assert is_dead is True
        assert q.stats().dead_letter == 1
        assert q.stats().pending == 0

    def test_not_dead_letter_before_max(self, tmp_path):
        q = UploadQueue(db_path=tmp_path / "dl2.db", max_retries=5)
        item_id = q.enqueue("evt1", "usb_0", "/tmp/a.jpg", "evt1/usb_0.jpg")

        for _ in range(4):
            q.dequeue_batch(1)
            is_dead = q.mark_failed(item_id, "timeout")

        assert is_dead is False
        assert q.stats().pending == 1
        assert q.stats().dead_letter == 0

    def test_mark_failed_override_max_retries(self, q):
        """Explicit max_retries kwarg on mark_failed overrides the instance default."""
        item_id = q.enqueue("evt1", "usb_0", "/tmp/a.jpg", "evt1/usb_0.jpg")
        q.dequeue_batch(1)
        is_dead = q.mark_failed(item_id, "err", max_retries=1)
        assert is_dead is True
        assert q.stats().dead_letter == 1

    def test_dead_letter_records_last_error(self, tmp_path):
        q = UploadQueue(db_path=tmp_path / "dl_err.db", max_retries=1)
        item_id = q.enqueue("evt1", "usb_0", "/tmp/a.jpg", "evt1/usb_0.jpg")
        q.dequeue_batch(1)
        q.mark_failed(item_id, "S3 connection refused")

        conn = sqlite3.connect(str(tmp_path / "dl_err.db"))
        row = conn.execute(
            "SELECT last_error, status FROM upload_queue WHERE id = ?", (item_id,)
        ).fetchone()
        conn.close()
        assert row[0] == "S3 connection refused"
        assert row[1] == "dead_letter"


class TestMaxRetriesKwarg:
    def test_instance_max_retries_is_used(self, tmp_path):
        q = UploadQueue(db_path=tmp_path / "mr.db", max_retries=2)
        item_id = q.enqueue("evt1", "usb_0", "/tmp/a.jpg", "evt1/usb_0.jpg")

        q.dequeue_batch(1)
        is_dead = q.mark_failed(item_id, "err1")
        assert is_dead is False

        q.dequeue_batch(1)
        is_dead = q.mark_failed(item_id, "err2")
        assert is_dead is True

    def test_string_db_path(self, tmp_path):
        """db_path accepts a string as well as a Path."""
        db = str(tmp_path / "str_path.db")
        q = UploadQueue(db_path=db, max_retries=3)
        q.enqueue("evt1", "cam_0", "/tmp/a.jpg", "s3/key.jpg")
        assert q.stats().pending == 1


class TestWALModeVerification:
    def test_database_uses_wal_mode(self, tmp_path):
        db = tmp_path / "wal_verify.db"
        q = UploadQueue(db_path=db, max_retries=5)
        conn = sqlite3.connect(str(db))
        mode = conn.execute("PRAGMA journal_mode").fetchone()[0]
        conn.close()
        assert mode == "wal"

    def test_connection_sets_wal_each_time(self, tmp_path):
        """Each _conn() call enables WAL — verify via the internal method."""
        db = tmp_path / "wal_conn.db"
        q = UploadQueue(db_path=db)
        conn = q._conn()
        mode = conn.execute("PRAGMA journal_mode").fetchone()[0]
        conn.close()
        assert mode == "wal"


class TestQueueItemDataclass:
    def test_queue_item_fields(self, q):
        q.enqueue("evt1", "cam_0", "/tmp/frame.jpg", "scans/X/e/cam_0/frame_0000.jpg")
        items = q.dequeue_batch(1)
        item = items[0]
        assert isinstance(item, QueueItem)
        assert item.event_id == "evt1"
        assert item.camera_id == "cam_0"
        assert item.local_path == "/tmp/frame.jpg"
        assert item.s3_key == "scans/X/e/cam_0/frame_0000.jpg"
        # dequeue_batch returns items as selected (status='pending') then updates
        # the DB to 'uploading' — the returned objects reflect pre-update state
        assert item.status == "pending"
        assert item.attempts == 0
        assert item.last_error is None

    def test_dequeue_updates_db_to_uploading(self, q):
        """Verify the DB row transitions to 'uploading' after dequeue."""
        q.enqueue("evt1", "cam_0", "/tmp/frame.jpg", "scans/X/e/cam_0/frame_0000.jpg")
        q.dequeue_batch(1)
        stats = q.stats()
        assert stats.uploading == 1
        assert stats.pending == 0


class TestQueueStatsDataclass:
    def test_total_property(self):
        s = QueueStats(pending=3, uploading=2, uploaded=10, failed=1, dead_letter=1)
        assert s.total == 17

    def test_default_values(self):
        s = QueueStats()
        assert s.total == 0


class TestStats:
    def test_empty_queue(self, q):
        stats = q.stats()
        assert stats.pending == 0
        assert stats.total == 0

    def test_mixed_statuses(self, q):
        id1 = q.enqueue("e1", "c1", "/a.jpg", "s3/a")
        id2 = q.enqueue("e1", "c2", "/b.jpg", "s3/b")
        q.enqueue("e1", "c3", "/c.jpg", "s3/c")

        q.dequeue_batch(2)
        q.mark_uploaded(id1)
        q.mark_failed(id2, "timeout")

        stats = q.stats()
        assert stats.uploaded == 1
        assert stats.pending == 2  # id2 went back to pending + id3 original pending
        assert stats.total == 3


class TestWALConcurrency:
    """Simulates the daemon (producer) and worker (consumer) sharing the DB."""

    def test_concurrent_enqueue_and_dequeue(self, tmp_path):
        db = tmp_path / "wal_test.db"
        producer = UploadQueue(db_path=db, max_retries=5)
        consumer = UploadQueue(db_path=db, max_retries=5)

        errors: list[Exception] = []

        def produce():
            try:
                frames = [
                    (f"cam_{i}", f"/tmp/{i}.jpg", f"scans/X/e/cam_{i}/frame_0000.jpg")
                    for i in range(20)
                ]
                producer.enqueue_scan("evt_wal", frames)
            except Exception as exc:
                errors.append(exc)

        def consume():
            try:
                total = 0
                for _ in range(50):
                    batch = consumer.dequeue_batch(5)
                    for item in batch:
                        consumer.mark_uploaded(item.id)
                        total += 1
                    if total >= 20:
                        break
            except Exception as exc:
                errors.append(exc)

        t1 = threading.Thread(target=produce)
        t2 = threading.Thread(target=consume)
        t1.start()
        t2.start()
        t1.join(timeout=10)
        t2.join(timeout=10)

        assert not errors, f"Concurrent access errors: {errors}"
        stats = consumer.stats()
        assert stats.pending == 0
        assert stats.dead_letter == 0

    def test_multiple_producers_single_consumer(self, tmp_path):
        """Two producers (trigger_server + daemon) enqueue concurrently; one consumer drains."""
        db = tmp_path / "multi_prod.db"
        trigger_q = UploadQueue(db_path=db, max_retries=5)
        daemon_q = UploadQueue(db_path=db, max_retries=5)
        consumer_q = UploadQueue(db_path=db, max_retries=5)

        errors: list[Exception] = []

        def trigger_produce():
            try:
                for i in range(10):
                    trigger_q.enqueue(f"trig_evt_{i}", "usb_0", f"/tmp/trig_{i}.jpg", f"scans/T/trig_{i}/usb_0/frame_0000.jpg")
                    time.sleep(0.001)
            except Exception as exc:
                errors.append(exc)

        def daemon_produce():
            try:
                for i in range(5):
                    frames = [
                        (f"cam_{c}", f"/tmp/d_{i}_{c}.jpg", f"scans/D/daemon_{i}/cam_{c}/frame_0000.jpg")
                        for c in range(4)
                    ]
                    daemon_q.enqueue_scan(f"daemon_evt_{i}", frames)
                    time.sleep(0.001)
            except Exception as exc:
                errors.append(exc)

        def consume():
            try:
                total = 0
                for _ in range(200):
                    batch = consumer_q.dequeue_batch(10)
                    for item in batch:
                        consumer_q.mark_uploaded(item.id)
                        total += 1
                    if total >= 30:
                        break
                    time.sleep(0.005)
            except Exception as exc:
                errors.append(exc)

        threads = [
            threading.Thread(target=trigger_produce),
            threading.Thread(target=daemon_produce),
            threading.Thread(target=consume),
        ]
        for t in threads:
            t.start()
        for t in threads:
            t.join(timeout=15)

        assert not errors, f"Multi-producer errors: {errors}"
        stats = consumer_q.stats()
        assert stats.dead_letter == 0
        expected_total = 10 + (5 * 4)  # trigger items + daemon frames
        assert stats.uploaded + stats.pending + stats.uploading == expected_total

    def test_concurrent_enqueue_scan_stress(self, tmp_path):
        """Stress test: many enqueue_scan calls from separate threads."""
        db = tmp_path / "stress.db"
        errors: list[Exception] = []
        num_producers = 8
        frames_per_producer = 10

        def produce(thread_id: int):
            try:
                q = UploadQueue(db_path=db, max_retries=5)
                frames = [
                    (f"cam_{i}", f"/tmp/t{thread_id}_{i}.jpg", f"scans/S/t{thread_id}/cam_{i}/frame_0000.jpg")
                    for i in range(frames_per_producer)
                ]
                q.enqueue_scan(f"stress_evt_{thread_id}", frames)
            except Exception as exc:
                errors.append(exc)

        threads = [threading.Thread(target=produce, args=(i,)) for i in range(num_producers)]
        for t in threads:
            t.start()
        for t in threads:
            t.join(timeout=15)

        assert not errors, f"Stress test errors: {errors}"
        q = UploadQueue(db_path=db, max_retries=5)
        stats = q.stats()
        assert stats.pending == num_producers * frames_per_producer
