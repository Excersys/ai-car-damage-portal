"""
Unit tests for upload_worker module.
Mocks S3 connectivity and upload calls.
"""

import asyncio
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from s3_uploader import S3Result
from upload_queue import QueueItem, UploadQueue
from upload_worker import UploadWorker


@pytest.fixture
def q(tmp_path):
    return UploadQueue(db_path=tmp_path / "test.db")


@pytest.fixture
def worker_instance(q):
    w = UploadWorker(q, batch_size=5)
    return w


class TestDrainOnce:
    @pytest.mark.asyncio
    async def test_no_pending_items_returns_zero(self, worker_instance):
        count = await worker_instance._drain_once()
        assert count == 0

    @pytest.mark.asyncio
    @patch("upload_worker.check_connectivity", return_value=False)
    async def test_offline_returns_zero(self, mock_conn, worker_instance, q):
        q.enqueue("evt1", "usb_0", "/tmp/a.jpg", "evt1/usb_0.jpg")
        count = await worker_instance._drain_once()
        assert count == 0
        assert q.stats().pending == 1

    @pytest.mark.asyncio
    @patch("upload_worker.upload_image")
    @patch("upload_worker.check_connectivity", return_value=True)
    async def test_online_uploads_pending(self, mock_conn, mock_upload, worker_instance, q):
        mock_upload.return_value = S3Result(
            camera_id="usb_0",
            local_path=Path("/tmp/a.jpg"),
            s3_key="evt1/usb_0.jpg",
            success=True,
        )
        q.enqueue("evt1", "usb_0", "/tmp/a.jpg", "evt1/usb_0.jpg")

        count = await worker_instance._drain_once()

        assert count == 1

    @pytest.mark.asyncio
    @patch("upload_worker.upload_image")
    @patch("upload_worker.check_connectivity", return_value=True)
    async def test_failed_upload_marks_for_retry(self, mock_conn, mock_upload, worker_instance, q):
        mock_upload.return_value = S3Result(
            camera_id="usb_0",
            local_path=Path("/tmp/a.jpg"),
            s3_key="evt1/usb_0.jpg",
            success=False,
            error="timeout",
        )
        q.enqueue("evt1", "usb_0", "/tmp/a.jpg", "evt1/usb_0.jpg")

        count = await worker_instance._drain_once()

        assert count == 0
        assert q.stats().pending == 1


class TestStartStop:
    @pytest.mark.asyncio
    async def test_start_stop_lifecycle(self, worker_instance):
        await worker_instance.start()
        assert worker_instance._running is True
        assert worker_instance._task is not None

        await worker_instance.stop()
        assert worker_instance._running is False

    @pytest.mark.asyncio
    async def test_double_start_is_safe(self, worker_instance):
        await worker_instance.start()
        await worker_instance.start()
        assert worker_instance._running is True
        await worker_instance.stop()
