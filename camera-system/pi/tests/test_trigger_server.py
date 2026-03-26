"""
Unit tests for trigger_server FastAPI endpoints.
All capture, upload, and queue operations are mocked.
"""

from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from capture_service import CaptureResult
from s3_uploader import S3Result


@pytest.fixture
def client():
    with patch("trigger_server.worker") as mock_worker:
        mock_worker.start = MagicMock()
        mock_worker.stop = MagicMock()
        from trigger_server import app

        with TestClient(app) as c:
            yield c


class TestTriggerEndpoint:
    @patch("trigger_server.queue")
    @patch("trigger_server.upload_event")
    @patch("trigger_server.capture_all")
    @patch("trigger_server.generate_event_id", return_value="abc123")
    def test_trigger_success(self, mock_eid, mock_capture, mock_upload, mock_q, client):
        mock_capture.return_value = [
            CaptureResult(
                camera_id="usb_0",
                local_path=Path("/tmp/usb_0.jpg"),
                timestamp="2026-01-01T00:00:00Z",
                size_bytes=300,
                success=True,
            ),
        ]
        mock_upload.return_value = [
            S3Result(
                camera_id="usb_0",
                local_path=Path("/tmp/usb_0.jpg"),
                s3_key="abc123/usb_0.jpg",
                success=True,
            ),
        ]

        resp = client.post("/trigger", json={"sensor_id": "s1", "timestamp": "t"})

        assert resp.status_code == 200
        body = resp.json()
        assert body["event_id"] == "abc123"
        assert body["cameras_captured"] == 1
        assert body["cameras_uploaded"] == 1
        assert body["cameras_queued"] == 0

    @patch("trigger_server.queue")
    @patch("trigger_server.upload_event")
    @patch("trigger_server.capture_all")
    @patch("trigger_server.generate_event_id", return_value="abc123")
    def test_trigger_offline_queues(self, mock_eid, mock_capture, mock_upload, mock_q, client):
        mock_capture.return_value = [
            CaptureResult(
                camera_id="usb_0",
                local_path=Path("/tmp/usb_0.jpg"),
                timestamp="t",
                size_bytes=300,
                success=True,
            ),
        ]
        mock_upload.return_value = [
            S3Result(
                camera_id="usb_0",
                local_path=Path("/tmp/usb_0.jpg"),
                s3_key="abc123/usb_0.jpg",
                success=False,
                error="no internet",
            ),
        ]
        mock_q.enqueue_failures.return_value = 1

        resp = client.post("/trigger", json={"sensor_id": "s1", "timestamp": "t"})

        assert resp.status_code == 200
        body = resp.json()
        assert body["cameras_uploaded"] == 0
        assert body["cameras_queued"] == 1
        mock_q.enqueue_failures.assert_called_once()


class TestManualTrigger:
    @patch("trigger_server.queue")
    @patch("trigger_server.upload_event")
    @patch("trigger_server.capture_all")
    @patch("trigger_server.generate_event_id", return_value="manual1")
    def test_manual_trigger(self, mock_eid, mock_capture, mock_upload, mock_q, client):
        mock_capture.return_value = []
        mock_upload.return_value = []

        resp = client.post("/trigger/manual")

        assert resp.status_code == 200
        assert resp.json()["event_id"] == "manual1"


class TestHealthEndpoint:
    @patch("trigger_server.queue")
    @patch("trigger_server.check_connectivity", return_value=True)
    @patch("trigger_server.discover_all")
    def test_health_ok(self, mock_discover, mock_conn, mock_q, client):
        mock_discover.return_value = [MagicMock(), MagicMock()]
        mock_q.stats.return_value = MagicMock(pending=0)

        resp = client.get("/health")

        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "ok"
        assert body["cameras_discovered"] == 2
        assert body["s3_connectivity"] is True


class TestCamerasEndpoint:
    @patch("trigger_server.discover_all")
    def test_list_cameras(self, mock_discover, client):
        from camera_discover import CameraInfo

        mock_discover.return_value = [
            CameraInfo(kind="usb", device="/dev/video0", name="v0", index=0),
        ]

        resp = client.get("/cameras")

        assert resp.status_code == 200
        cams = resp.json()
        assert len(cams) == 1
        assert cams[0]["kind"] == "usb"


class TestQueueStatusEndpoint:
    @patch("trigger_server.queue")
    def test_queue_status(self, mock_q, client):
        mock_q.stats.return_value = MagicMock(
            pending=3, uploading=1, uploaded=10, failed=0, total=14
        )

        resp = client.get("/queue/status")

        assert resp.status_code == 200
        body = resp.json()
        assert body["pending"] == 3
        assert body["total"] == 14
