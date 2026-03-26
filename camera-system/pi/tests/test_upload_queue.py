"""
Unit tests for upload_queue module.
Uses a temporary SQLite database for each test.
"""

from pathlib import Path

import pytest

from upload_queue import UploadQueue


@pytest.fixture
def q(tmp_path):
    db = tmp_path / "test_queue.db"
    return UploadQueue(db_path=db)


class TestEnqueue:
    def test_enqueue_returns_id(self, q):
        item_id = q.enqueue("evt1", "usb_0", "/tmp/a.jpg", "evt1/usb_0.jpg")
        assert isinstance(item_id, str)
        assert len(item_id) == 16

    def test_enqueue_shows_in_stats(self, q):
        q.enqueue("evt1", "usb_0", "/tmp/a.jpg", "evt1/usb_0.jpg")
        q.enqueue("evt1", "usb_1", "/tmp/b.jpg", "evt1/usb_1.jpg")
        stats = q.stats()
        assert stats.pending == 2
        assert stats.total == 2


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


class TestStats:
    def test_empty_queue(self, q):
        stats = q.stats()
        assert stats.pending == 0
        assert stats.total == 0
