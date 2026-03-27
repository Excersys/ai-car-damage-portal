"""
Unit tests for s3_uploader module.
All AWS calls are mocked.
"""

import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

_CAMERA_SYSTEM = Path(__file__).resolve().parents[2]
_MODEL_DIR = _CAMERA_SYSTEM / "model"


def _ensure_plate_reader_importable() -> None:
    """model/plate_reader is on sys.path when s3_uploader runs; preload for @patch."""
    if str(_MODEL_DIR) not in sys.path:
        sys.path.insert(0, str(_MODEL_DIR))
    import plate_reader  # noqa: F401 — register module for patch("plate_reader.read_plate")

from capture_service import CaptureResult
import s3_uploader
from s3_uploader import S3Result, check_connectivity, s3_key_for, upload_event, upload_image


class TestS3KeyFor:
    def test_format_unknown_plate(self):
        assert s3_key_for("evt123", "usb_0") == "scans/unknown/evt123/usb_0/frame_0000.jpg"

    def test_format_normalized_plate(self):
        assert (
            s3_key_for("evt123", "usb_0", license_plate="ab-1234")
            == "scans/AB1234/evt123/usb_0/frame_0000.jpg"
        )


class TestUploadImage:
    @patch("s3_uploader._get_s3_client")
    def test_success(self, mock_client_fn, tmp_path):
        mock_client = MagicMock()
        mock_client_fn.return_value = mock_client

        img = tmp_path / "test.jpg"
        img.write_bytes(b"\xff\xd8\xff")

        result = upload_image(img, "evt/usb_0.jpg", "usb_0")

        assert result.success is True
        assert result.s3_key == "evt/usb_0.jpg"
        mock_client.upload_file.assert_called_once()

    @patch("s3_uploader._get_s3_client")
    def test_failure(self, mock_client_fn, tmp_path):
        mock_client = MagicMock()
        mock_client.upload_file.side_effect = OSError("no network")
        mock_client_fn.return_value = mock_client

        img = tmp_path / "test.jpg"
        img.write_bytes(b"\xff\xd8\xff")

        result = upload_image(img, "evt/usb_0.jpg", "usb_0")

        assert result.success is False
        assert "no network" in result.error


class TestS3KeysForEvent:
    """Plate segment in keys: TUNNEL_LICENSE_PLATE, optional PI_PLATE_OCR (ACR-156)."""

    @staticmethod
    def _capture(tmp_path, cam_id: str = "usb_0") -> CaptureResult:
        img = tmp_path / f"{cam_id}.jpg"
        img.write_bytes(b"\xff\xd8\xff")
        return CaptureResult(
            camera_id=cam_id,
            local_path=img,
            timestamp="t",
            size_bytes=10,
            success=True,
        )

    def test_uses_tunnel_license_plate_when_set(self, tmp_path):
        cap = self._capture(tmp_path)
        with patch.object(s3_uploader.config, "TUNNEL_LICENSE_PLATE", "ab-9999"), patch.object(
            s3_uploader.config, "PI_PLATE_OCR", False
        ):
            keys = s3_uploader.s3_keys_for_event("evt1", [cap])
        assert keys["usb_0"] == "scans/AB9999/evt1/usb_0/frame_0000.jpg"

    def test_prefers_ocr_when_enabled(self, tmp_path):
        _ensure_plate_reader_importable()
        cap = self._capture(tmp_path)
        with patch("plate_reader.read_plate", return_value="ocr88") as mock_rp, patch(
            "cv2.imread", return_value=object()
        ), patch.object(s3_uploader.config, "PI_PLATE_OCR", True), patch.object(
            s3_uploader.config, "TUNNEL_LICENSE_PLATE", "ENV1"
        ):
            keys = s3_uploader.s3_keys_for_event("evt_ocr", [cap])
        assert keys["usb_0"] == "scans/OCR88/evt_ocr/usb_0/frame_0000.jpg"
        mock_rp.assert_called_once()

    def test_falls_back_to_tunnel_when_ocr_returns_none(self, tmp_path):
        _ensure_plate_reader_importable()
        cap = self._capture(tmp_path)
        with patch("plate_reader.read_plate", return_value=None), patch(
            "cv2.imread", return_value=object()
        ), patch.object(s3_uploader.config, "PI_PLATE_OCR", True), patch.object(
            s3_uploader.config, "TUNNEL_LICENSE_PLATE", "fb-42"
        ):
            keys = s3_uploader.s3_keys_for_event("e3", [cap])
        assert keys["usb_0"] == "scans/FB42/e3/usb_0/frame_0000.jpg"

    @patch("cv2.imread", return_value=None)
    def test_imread_none_uses_tunnel_plate(self, _mock_imread, tmp_path):
        cap = self._capture(tmp_path)
        with patch.object(s3_uploader.config, "PI_PLATE_OCR", True), patch.object(
            s3_uploader.config, "TUNNEL_LICENSE_PLATE", "Z9"
        ):
            keys = s3_uploader.s3_keys_for_event("e4", [cap])
        assert keys["usb_0"] == "scans/Z9/e4/usb_0/frame_0000.jpg"

    def test_unknown_when_no_plate_source(self, tmp_path):
        cap = self._capture(tmp_path)
        with patch.object(s3_uploader.config, "TUNNEL_LICENSE_PLATE", ""), patch.object(
            s3_uploader.config, "PI_PLATE_OCR", False
        ):
            keys = s3_uploader.s3_keys_for_event("e5", [cap])
        assert keys["usb_0"] == "scans/unknown/e5/usb_0/frame_0000.jpg"


class TestUploadEvent:
    @patch("s3_uploader.upload_image")
    def test_uploads_successful_captures_only(self, mock_upload):
        mock_upload.return_value = S3Result(
            camera_id="usb_0",
            local_path=Path("/tmp/x.jpg"),
            s3_key="evt/usb_0.jpg",
            success=True,
        )
        captures = [
            CaptureResult(
                camera_id="usb_0",
                local_path=Path("/tmp/x.jpg"),
                timestamp="t",
                size_bytes=100,
                success=True,
            ),
            CaptureResult(
                camera_id="usb_1",
                local_path=Path("/tmp/y.jpg"),
                timestamp="t",
                size_bytes=0,
                success=False,
                error="capture failed",
            ),
        ]

        results = upload_event("evt123", captures)

        assert len(results) == 1
        assert results[0].success is True

    @patch("s3_uploader.upload_image")
    def test_empty_captures(self, mock_upload):
        results = upload_event("evt123", [])
        assert results == []
        mock_upload.assert_not_called()


class TestCheckConnectivity:
    @patch("s3_uploader._get_s3_client")
    def test_online(self, mock_client_fn):
        mock_client = MagicMock()
        mock_client_fn.return_value = mock_client
        assert check_connectivity() is True

    @patch("s3_uploader._get_s3_client")
    def test_offline(self, mock_client_fn):
        mock_client = MagicMock()
        mock_client.head_bucket.side_effect = Exception("timeout")
        mock_client_fn.return_value = mock_client
        assert check_connectivity() is False
