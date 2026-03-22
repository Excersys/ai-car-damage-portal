"""
Unit tests for capture_service module.
All camera hardware and filesystem operations are mocked.
"""

from pathlib import Path
from unittest.mock import MagicMock, patch

import numpy as np
import pytest

from camera_discover import CameraInfo
from capture_service import (
    CaptureResult,
    _capture_rtsp,
    _capture_single,
    _compress_image,
    capture_all,
    generate_event_id,
)


class TestGenerateEventId:
    def test_returns_16_char_hex(self):
        eid = generate_event_id()
        assert len(eid) == 16
        int(eid, 16)  # must be valid hex

    def test_unique(self):
        ids = {generate_event_id() for _ in range(100)}
        assert len(ids) == 100


class TestCompressImage:
    def test_downsizes_large_image(self, tmp_path):
        frame = np.zeros((3000, 4000, 3), dtype=np.uint8)
        out = tmp_path / "out.jpg"

        with patch("capture_service.config") as mock_cfg:
            mock_cfg.IMAGE_MAX_DIMENSION = 1920
            mock_cfg.IMAGE_JPEG_QUALITY = 85
            size = _compress_image(frame, out)

        assert out.exists()
        assert size > 0

    def test_keeps_small_image(self, tmp_path):
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        out = tmp_path / "small.jpg"

        with patch("capture_service.config") as mock_cfg:
            mock_cfg.IMAGE_MAX_DIMENSION = 1920
            mock_cfg.IMAGE_JPEG_QUALITY = 85
            size = _compress_image(frame, out)

        assert out.exists()
        assert size > 0


# ---------------------------------------------------------------------------
# RTSP capture
# ---------------------------------------------------------------------------


class TestCaptureRtsp:
    """Test _capture_rtsp with mocked cv2.VideoCapture."""

    @patch("capture_service.cv2")
    @patch("capture_service.config")
    def test_success(self, mock_cfg, mock_cv2, tmp_path):
        mock_cfg.CAMERA_TIMEOUT_MS = 5000
        mock_cfg.RTSP_TRANSPORT = "tcp"
        mock_cfg.IMAGE_MAX_DIMENSION = 1920
        mock_cfg.IMAGE_JPEG_QUALITY = 85
        mock_cfg._redact_url = lambda u: "rtsp://***"

        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        mock_cap = MagicMock()
        mock_cap.isOpened.return_value = True
        mock_cap.read.return_value = (True, frame)
        mock_cv2.VideoCapture.return_value = mock_cap
        mock_cv2.CAP_FFMPEG = 1900
        mock_cv2.CAP_PROP_OPEN_TIMEOUT_MSEC = 53
        mock_cv2.CAP_PROP_READ_TIMEOUT_MSEC = 54
        mock_cv2.INTER_AREA = 3
        mock_cv2.IMWRITE_JPEG_QUALITY = 1

        out = tmp_path / "rtsp.jpg"
        mock_cv2.imwrite = lambda path, img, params: Path(path).write_bytes(b"\xff\xd8") or True
        mock_cv2.resize = lambda img, size, interpolation: img

        ok, size, err = _capture_rtsp("rtsp://admin:pass@10.0.0.1:554/", out)

        assert ok is True
        assert err == ""
        mock_cv2.VideoCapture.assert_called_once_with(
            "rtsp://admin:pass@10.0.0.1:554/", mock_cv2.CAP_FFMPEG
        )
        mock_cap.release.assert_called_once()

    @patch("capture_service.cv2")
    @patch("capture_service.config")
    def test_open_failure(self, mock_cfg, mock_cv2, tmp_path):
        mock_cfg.CAMERA_TIMEOUT_MS = 5000
        mock_cfg.RTSP_TRANSPORT = "tcp"
        mock_cfg._redact_url = lambda u: "rtsp://***"

        mock_cap = MagicMock()
        mock_cap.isOpened.return_value = False
        mock_cv2.VideoCapture.return_value = mock_cap
        mock_cv2.CAP_FFMPEG = 1900
        mock_cv2.CAP_PROP_OPEN_TIMEOUT_MSEC = 53
        mock_cv2.CAP_PROP_READ_TIMEOUT_MSEC = 54

        out = tmp_path / "fail.jpg"
        ok, size, err = _capture_rtsp("rtsp://bad@10.0.0.1:554/", out)

        assert ok is False
        assert "Could not open RTSP stream" in err

    @patch("capture_service.cv2")
    @patch("capture_service.config")
    def test_read_failure(self, mock_cfg, mock_cv2, tmp_path):
        mock_cfg.CAMERA_TIMEOUT_MS = 5000
        mock_cfg.RTSP_TRANSPORT = "tcp"
        mock_cfg._redact_url = lambda u: "rtsp://***"

        mock_cap = MagicMock()
        mock_cap.isOpened.return_value = True
        mock_cap.read.return_value = (False, None)
        mock_cv2.VideoCapture.return_value = mock_cap
        mock_cv2.CAP_FFMPEG = 1900
        mock_cv2.CAP_PROP_OPEN_TIMEOUT_MSEC = 53
        mock_cv2.CAP_PROP_READ_TIMEOUT_MSEC = 54

        out = tmp_path / "fail.jpg"
        ok, size, err = _capture_rtsp("rtsp://admin:pass@10.0.0.1:554/", out)

        assert ok is False
        assert "Failed to read RTSP frame" in err
        mock_cap.release.assert_called_once()


# ---------------------------------------------------------------------------
# Single-camera dispatch
# ---------------------------------------------------------------------------


class TestCaptureSingle:
    @patch("capture_service._capture_rtsp")
    def test_rtsp_success(self, mock_rtsp, tmp_path):
        mock_rtsp.return_value = (True, 2000, "")
        cam = CameraInfo(
            kind="rtsp",
            device="rtsp://admin:pass@192.168.0.62:554/",
            name="cam_062",
            index=0,
        )
        out = tmp_path / "test.jpg"

        result = _capture_single(cam, out)

        assert result.success is True
        assert result.camera_id == "rtsp_0"
        assert result.size_bytes == 2000
        mock_rtsp.assert_called_once_with("rtsp://admin:pass@192.168.0.62:554/", out)

    @patch("capture_service._capture_rtsp")
    def test_rtsp_failure(self, mock_rtsp, tmp_path):
        mock_rtsp.return_value = (False, 0, "connection refused")
        cam = CameraInfo(
            kind="rtsp",
            device="rtsp://admin:pass@192.168.0.62:554/",
            name="cam_062",
            index=0,
        )
        out = tmp_path / "test.jpg"

        result = _capture_single(cam, out)

        assert result.success is False
        assert "connection refused" in result.error

    @patch("capture_service._capture_usb")
    def test_usb_success(self, mock_usb, tmp_path):
        mock_usb.return_value = (True, 1234, "")
        cam = CameraInfo(kind="usb", device="/dev/video0", name="video0", index=0)
        out = tmp_path / "test.jpg"

        result = _capture_single(cam, out)

        assert result.success is True
        assert result.camera_id == "usb_0"
        assert result.size_bytes == 1234
        mock_usb.assert_called_once_with("/dev/video0", out)

    @patch("capture_service._capture_usb")
    def test_usb_failure(self, mock_usb, tmp_path):
        mock_usb.return_value = (False, 0, "device busy")
        cam = CameraInfo(kind="usb", device="/dev/video0", name="video0", index=0)
        out = tmp_path / "test.jpg"

        result = _capture_single(cam, out)

        assert result.success is False
        assert "device busy" in result.error

    def test_unknown_kind(self, tmp_path):
        cam = CameraInfo(kind="infrared", device="/dev/ir0", name="ir0", index=0)
        out = tmp_path / "test.jpg"

        result = _capture_single(cam, out)

        assert result.success is False
        assert "Unknown camera kind" in result.error


# ---------------------------------------------------------------------------
# Capture-all orchestrator
# ---------------------------------------------------------------------------


class TestCaptureAll:
    @patch("capture_service._capture_single")
    @patch("capture_service.config")
    def test_captures_all_cameras(self, mock_cfg, mock_single, tmp_path):
        mock_cfg.LOCAL_STORAGE_PATH = tmp_path
        mock_single.return_value = CaptureResult(
            camera_id="usb_0",
            local_path=tmp_path / "test.jpg",
            timestamp="2026-01-01T00:00:00Z",
            size_bytes=500,
            success=True,
        )
        cameras = [
            CameraInfo(kind="usb", device="/dev/video0", name="v0", index=0),
            CameraInfo(kind="usb", device="/dev/video2", name="v2", index=2),
        ]

        results = capture_all("evt123", cameras=cameras)

        assert len(results) == 2
        assert mock_single.call_count == 2

    @patch("capture_service._capture_single")
    @patch("capture_service.config")
    def test_captures_rtsp_cameras(self, mock_cfg, mock_single, tmp_path):
        mock_cfg.LOCAL_STORAGE_PATH = tmp_path
        mock_single.return_value = CaptureResult(
            camera_id="rtsp_0",
            local_path=tmp_path / "test.jpg",
            timestamp="2026-01-01T00:00:00Z",
            size_bytes=1500,
            success=True,
        )
        cameras = [
            CameraInfo(kind="rtsp", device="rtsp://a:b@10.0.0.1:554/", name="c1", index=0),
            CameraInfo(kind="rtsp", device="rtsp://a:b@10.0.0.2:554/", name="c2", index=1),
            CameraInfo(kind="rtsp", device="rtsp://a:b@10.0.0.3:554/", name="c3", index=2),
            CameraInfo(kind="rtsp", device="rtsp://a:b@10.0.0.4:554/", name="c4", index=3),
        ]

        results = capture_all("evt456", cameras=cameras)

        assert len(results) == 4
        assert all(r.success for r in results)

    @patch("capture_service.discover_all")
    @patch("capture_service.config")
    def test_no_cameras_returns_empty(self, mock_cfg, mock_discover, tmp_path):
        mock_cfg.LOCAL_STORAGE_PATH = tmp_path
        mock_discover.return_value = []

        results = capture_all("evt123")

        assert results == []
