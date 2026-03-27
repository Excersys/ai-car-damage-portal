"""
Integration tests for the unified upload pipeline (ACR-155).

These tests exercise the end-to-end flow: producers (trigger_server-style
single enqueue, daemon-style enqueue_scan) push into a shared SQLite queue,
and the UploadWorker drains items to "S3" (mocked).

Covers:
  - Daemon enqueue_scan → UploadWorker drain → mark uploaded
  - Mixed producer scenario (trigger + daemon)
  - Dead-letter flow through the full pipeline
  - File cleanup after successful upload
  - Worker backoff on connectivity loss
"""

from __future__ import annotations

import asyncio
import threading
import time
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from s3_uploader import S3Result
from upload_queue import UploadQueue
from upload_worker import UploadWorker


@pytest.fixture
def shared_db(tmp_path):
    return tmp_path / "integration_queue.db"


@pytest.fixture
def producer(shared_db):
    return UploadQueue(db_path=shared_db, max_retries=3)


@pytest.fixture
def consumer(shared_db):
    return UploadQueue(db_path=shared_db, max_retries=3)


def _make_s3_result(s3_key: str, *, success: bool = True, error: str = "") -> S3Result:
    return S3Result(
        camera_id="any",
        local_path=Path("/tmp/any.jpg"),
        s3_key=s3_key,
        success=success,
        error=error,
    )


class TestDaemonEnqueueWorkerDrain:
    """End-to-end: daemon enqueues burst frames, worker drains them."""

    @pytest.mark.asyncio
    @patch("upload_worker.upload_image")
    @patch("upload_worker.check_connectivity", return_value=True)
    async def test_enqueue_scan_then_drain(self, mock_conn, mock_upload, shared_db):
        mock_upload.side_effect = lambda path, key, cam: _make_s3_result(key, success=True)

        q = UploadQueue(db_path=shared_db, max_retries=3)
        frames = [
            ("cam_1", "/tmp/cam_1/frame_0000.jpg", "scans/ABC/evt1/cam_1/frame_0000.jpg"),
            ("cam_1", "/tmp/cam_1/frame_0001.jpg", "scans/ABC/evt1/cam_1/frame_0001.jpg"),
            ("cam_2", "/tmp/cam_2/frame_0000.jpg", "scans/ABC/evt1/cam_2/frame_0000.jpg"),
        ]
        q.enqueue_scan(
            "evt1", frames,
            event_json_path="/tmp/evt1/event.json",
            event_json_s3_key="scans/ABC/evt1/event.json",
        )
        assert q.stats().pending == 4

        worker = UploadWorker(q, batch_size=10)
        drained = await worker._drain_once()

        assert drained == 4
        assert q.stats().uploaded == 0  # cleanup_uploaded removes the status
        assert q.stats().pending == 0

    @pytest.mark.asyncio
    @patch("upload_worker.upload_image")
    @patch("upload_worker.check_connectivity", return_value=True)
    async def test_partial_failure_retries(self, mock_conn, mock_upload, shared_db):
        """Some items fail on first drain; they return to pending for retry."""
        call_count = {"n": 0}

        def upload_side_effect(path, key, cam):
            call_count["n"] += 1
            if "frame_0001" in key:
                return _make_s3_result(key, success=False, error="timeout")
            return _make_s3_result(key, success=True)

        mock_upload.side_effect = upload_side_effect

        q = UploadQueue(db_path=shared_db, max_retries=5)
        frames = [
            ("cam_1", "/tmp/f0.jpg", "scans/X/e/cam_1/frame_0000.jpg"),
            ("cam_1", "/tmp/f1.jpg", "scans/X/e/cam_1/frame_0001.jpg"),
            ("cam_1", "/tmp/f2.jpg", "scans/X/e/cam_1/frame_0002.jpg"),
        ]
        q.enqueue_scan("evt1", frames)

        worker = UploadWorker(q, batch_size=10)
        drained = await worker._drain_once()

        assert drained == 2
        stats = q.stats()
        assert stats.pending == 1
        assert stats.dead_letter == 0


class TestMixedProducerPipeline:
    """Both trigger_server-style enqueue and daemon enqueue_scan feed the same worker."""

    @pytest.mark.asyncio
    @patch("upload_worker.upload_image")
    @patch("upload_worker.check_connectivity", return_value=True)
    async def test_mixed_producers_single_worker(self, mock_conn, mock_upload, shared_db):
        mock_upload.side_effect = lambda path, key, cam: _make_s3_result(key, success=True)

        trigger_q = UploadQueue(db_path=shared_db, max_retries=3)
        daemon_q = UploadQueue(db_path=shared_db, max_retries=3)

        trigger_q.enqueue("trig_evt_1", "usb_0", "/tmp/trig.jpg", "scans/T/trig_evt_1/usb_0/frame_0000.jpg")
        trigger_q.enqueue("trig_evt_2", "usb_0", "/tmp/trig2.jpg", "scans/T/trig_evt_2/usb_0/frame_0000.jpg")

        daemon_frames = [
            ("cam_1", "/tmp/d1.jpg", "scans/D/daemon_evt/cam_1/frame_0000.jpg"),
            ("cam_2", "/tmp/d2.jpg", "scans/D/daemon_evt/cam_2/frame_0000.jpg"),
            ("cam_3", "/tmp/d3.jpg", "scans/D/daemon_evt/cam_3/frame_0000.jpg"),
        ]
        daemon_q.enqueue_scan("daemon_evt", daemon_frames)

        worker_q = UploadQueue(db_path=shared_db, max_retries=3)
        assert worker_q.stats().pending == 5

        worker = UploadWorker(worker_q, batch_size=10)
        drained = await worker._drain_once()

        assert drained == 5
        assert worker_q.stats().pending == 0

    @pytest.mark.asyncio
    @patch("upload_worker.upload_image")
    @patch("upload_worker.check_connectivity", return_value=True)
    async def test_concurrent_produce_and_drain(self, mock_conn, mock_upload, shared_db):
        """Producer thread enqueues while worker drains asynchronously."""
        mock_upload.side_effect = lambda path, key, cam: _make_s3_result(key, success=True)

        q = UploadQueue(db_path=shared_db, max_retries=3)
        worker = UploadWorker(q, batch_size=5)
        total_drained = {"n": 0}
        errors: list[Exception] = []

        def produce():
            try:
                pq = UploadQueue(db_path=shared_db, max_retries=3)
                for i in range(5):
                    frames = [
                        (f"cam_{c}", f"/tmp/{i}_{c}.jpg", f"scans/C/evt_{i}/cam_{c}/frame_0000.jpg")
                        for c in range(3)
                    ]
                    pq.enqueue_scan(f"evt_{i}", frames)
                    time.sleep(0.01)
            except Exception as exc:
                errors.append(exc)

        async def drain_loop():
            for _ in range(30):
                n = await worker._drain_once()
                total_drained["n"] += n
                await asyncio.sleep(0.02)
                if total_drained["n"] >= 15:
                    break

        t = threading.Thread(target=produce)
        t.start()
        await drain_loop()
        t.join(timeout=10)

        assert not errors
        assert total_drained["n"] == 15


class TestDeadLetterPipeline:
    """Full dead-letter lifecycle: enqueue → repeated failures → dead-letter."""

    @pytest.mark.asyncio
    @patch("upload_worker.upload_image")
    @patch("upload_worker.check_connectivity", return_value=True)
    async def test_item_moves_to_dead_letter_after_max_retries(
        self, mock_conn, mock_upload, shared_db,
    ):
        mock_upload.side_effect = lambda path, key, cam: _make_s3_result(
            key, success=False, error="connection refused"
        )

        q = UploadQueue(db_path=shared_db, max_retries=3)
        q.enqueue("evt_dl", "cam_1", "/tmp/dl.jpg", "scans/X/evt_dl/cam_1/frame_0000.jpg")

        worker = UploadWorker(q, batch_size=1)

        for attempt in range(3):
            await worker._drain_once()

        stats = q.stats()
        assert stats.dead_letter == 1
        assert stats.pending == 0
        assert stats.uploading == 0

    @pytest.mark.asyncio
    @patch("upload_worker.upload_image")
    @patch("upload_worker.check_connectivity", return_value=True)
    async def test_enqueue_scan_dead_letter_flow(self, mock_conn, mock_upload, shared_db):
        """Bulk enqueue_scan items go to dead-letter after max_retries failures."""
        mock_upload.side_effect = lambda path, key, cam: _make_s3_result(
            key, success=False, error="503 Service Unavailable"
        )

        q = UploadQueue(db_path=shared_db, max_retries=2)
        frames = [
            ("cam_1", "/tmp/a.jpg", "scans/X/evt/cam_1/frame_0000.jpg"),
            ("cam_2", "/tmp/b.jpg", "scans/X/evt/cam_2/frame_0000.jpg"),
        ]
        q.enqueue_scan("evt_bulk_dl", frames)

        worker = UploadWorker(q, batch_size=10)

        for _ in range(2):
            await worker._drain_once()

        stats = q.stats()
        assert stats.dead_letter == 2
        assert stats.pending == 0


class TestFileCleanup:
    """Verify that cleanup_uploaded removes local files for scan items."""

    def test_cleanup_deletes_burst_frame_files(self, tmp_path, shared_db):
        q = UploadQueue(db_path=shared_db, max_retries=3)

        frame_file = tmp_path / "frame_0000.jpg"
        frame_file.write_bytes(b"\xff\xd8\xff")
        meta_file = tmp_path / "event.json"
        meta_file.write_text("{}")

        frames = [("cam_1", str(frame_file), "scans/X/e/cam_1/frame_0000.jpg")]
        q.enqueue_scan(
            "evt_clean", frames,
            event_json_path=str(meta_file),
            event_json_s3_key="scans/X/e/event.json",
        )

        batch = q.dequeue_batch(10)
        for item in batch:
            q.mark_uploaded(item.id)

        removed = q.cleanup_uploaded(delete_files=True)
        assert removed == 2
        assert not frame_file.exists()
        assert not meta_file.exists()

    def test_cleanup_handles_missing_files_gracefully(self, shared_db):
        """If local file is already gone, cleanup doesn't crash."""
        q = UploadQueue(db_path=shared_db, max_retries=3)
        q.enqueue("evt_gone", "cam_1", "/nonexistent/path.jpg", "s3/key.jpg")
        batch = q.dequeue_batch(1)
        q.mark_uploaded(batch[0].id)
        removed = q.cleanup_uploaded(delete_files=True)
        assert removed == 1


class TestWorkerConnectivity:
    """Worker behavior when S3 is unreachable."""

    @pytest.mark.asyncio
    @patch("upload_worker.check_connectivity", return_value=False)
    async def test_worker_skips_drain_when_offline(self, mock_conn, shared_db):
        q = UploadQueue(db_path=shared_db, max_retries=3)
        frames = [
            ("cam_1", "/tmp/a.jpg", "scans/X/e/cam_1/frame_0000.jpg"),
            ("cam_2", "/tmp/b.jpg", "scans/X/e/cam_2/frame_0000.jpg"),
        ]
        q.enqueue_scan("offline_evt", frames)

        worker = UploadWorker(q, batch_size=10)
        drained = await worker._drain_once()

        assert drained == 0
        assert q.stats().pending == 2

    @pytest.mark.asyncio
    @patch("upload_worker.upload_image")
    @patch("upload_worker.check_connectivity")
    async def test_worker_drains_after_connectivity_returns(
        self, mock_conn, mock_upload, shared_db,
    ):
        """Simulates offline → online transition."""
        mock_upload.side_effect = lambda path, key, cam: _make_s3_result(key, success=True)

        q = UploadQueue(db_path=shared_db, max_retries=3)
        q.enqueue_scan("evt_reconn", [
            ("cam_1", "/tmp/a.jpg", "scans/R/e/cam_1/frame_0000.jpg"),
        ])
        worker = UploadWorker(q, batch_size=10)

        mock_conn.return_value = False
        drained = await worker._drain_once()
        assert drained == 0
        assert q.stats().pending == 1

        mock_conn.return_value = True
        drained = await worker._drain_once()
        assert drained == 1
        assert q.stats().pending == 0


class TestMultipleEvents:
    """Multiple scan events queued in sequence, drained in order."""

    @pytest.mark.asyncio
    @patch("upload_worker.upload_image")
    @patch("upload_worker.check_connectivity", return_value=True)
    async def test_fifo_ordering(self, mock_conn, mock_upload, shared_db):
        """Items are drained in FIFO order (oldest first)."""
        uploaded_keys: list[str] = []

        def track_upload(path, key, cam):
            uploaded_keys.append(key)
            return _make_s3_result(key, success=True)

        mock_upload.side_effect = track_upload

        q = UploadQueue(db_path=shared_db, max_retries=3)

        q.enqueue_scan("evt_first", [("cam_1", "/tmp/first.jpg", "scans/F/first/cam_1/frame_0000.jpg")])
        q.enqueue_scan("evt_second", [("cam_1", "/tmp/second.jpg", "scans/S/second/cam_1/frame_0000.jpg")])

        worker = UploadWorker(q, batch_size=10)
        await worker._drain_once()

        assert uploaded_keys[0] == "scans/F/first/cam_1/frame_0000.jpg"
        assert uploaded_keys[1] == "scans/S/second/cam_1/frame_0000.jpg"

    @pytest.mark.asyncio
    @patch("upload_worker.upload_image")
    @patch("upload_worker.check_connectivity", return_value=True)
    async def test_mixed_events_from_different_producers(self, mock_conn, mock_upload, shared_db):
        """Trigger and daemon events interleave in the queue by creation time."""
        mock_upload.side_effect = lambda path, key, cam: _make_s3_result(key, success=True)

        q = UploadQueue(db_path=shared_db, max_retries=3)

        q.enqueue("trig_1", "usb_0", "/tmp/t1.jpg", "scans/T/trig_1/usb_0/frame_0000.jpg")
        q.enqueue_scan("daemon_1", [
            ("cam_1", "/tmp/d1.jpg", "scans/D/daemon_1/cam_1/frame_0000.jpg"),
            ("cam_2", "/tmp/d2.jpg", "scans/D/daemon_1/cam_2/frame_0000.jpg"),
        ])
        q.enqueue("trig_2", "usb_0", "/tmp/t2.jpg", "scans/T/trig_2/usb_0/frame_0000.jpg")

        worker = UploadWorker(q, batch_size=10)
        drained = await worker._drain_once()

        assert drained == 4
        assert q.stats().pending == 0
