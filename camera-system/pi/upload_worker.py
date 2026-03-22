"""
Background worker that drains the offline upload queue.
Runs as an asyncio task inside the FastAPI server. Checks for pending
uploads periodically, tests S3 connectivity, and uploads in batches
with exponential backoff on repeated failures.
"""

from __future__ import annotations

import asyncio
import logging

import config
from s3_uploader import check_connectivity, upload_image
from upload_queue import UploadQueue

logger = logging.getLogger(__name__)


class UploadWorker:
    """Async background worker that retries queued uploads."""

    def __init__(self, queue: UploadQueue, batch_size: int = 10):
        self._queue = queue
        self._batch_size = batch_size
        self._interval = config.UPLOAD_WORKER_INTERVAL_S
        self._backoff_max = config.UPLOAD_WORKER_BACKOFF_MAX_S
        self._current_backoff = self._interval
        self._running = False
        self._task: asyncio.Task | None = None

    async def start(self) -> None:
        """Start the worker loop as a background task."""
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._loop())
        logger.info("Upload worker started (interval=%.0fs)", self._interval)

    async def stop(self) -> None:
        """Gracefully stop the worker."""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("Upload worker stopped")

    async def _loop(self) -> None:
        while self._running:
            try:
                drained = await self._drain_once()
                if drained > 0:
                    self._current_backoff = self._interval
                else:
                    self._current_backoff = min(
                        self._current_backoff * 2, self._backoff_max
                    )
            except Exception:
                logger.exception("Upload worker error")
                self._current_backoff = min(
                    self._current_backoff * 2, self._backoff_max
                )

            await asyncio.sleep(self._current_backoff)

    async def _drain_once(self) -> int:
        """
        Attempt one batch of uploads.
        Returns number of items successfully uploaded.
        """
        stats = self._queue.stats()
        if stats.pending == 0:
            return 0

        logger.info("Queue has %d pending items, checking connectivity...", stats.pending)

        online = await asyncio.to_thread(check_connectivity)
        if not online:
            logger.warning("No S3 connectivity -- will retry after backoff")
            return 0

        batch = self._queue.dequeue_batch(self._batch_size)
        if not batch:
            return 0

        uploaded = 0
        for item in batch:
            result = await asyncio.to_thread(
                upload_image,
                item.local_path,
                item.s3_key,
                item.camera_id,
            )
            if result.success:
                self._queue.mark_uploaded(item.id)
                uploaded += 1
                logger.info(
                    "Queue upload succeeded: %s (attempt %d)",
                    item.s3_key,
                    item.attempts + 1,
                )
            else:
                self._queue.mark_failed(item.id, result.error)
                logger.warning(
                    "Queue upload failed: %s (attempt %d): %s",
                    item.s3_key,
                    item.attempts + 1,
                    result.error,
                )

        if uploaded:
            self._queue.cleanup_uploaded(delete_files=False)

        return uploaded
