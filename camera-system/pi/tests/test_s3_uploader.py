"""
Unit tests for s3_uploader module.
All AWS calls are mocked.
"""

from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from capture_service import CaptureResult
from s3_uploader import S3Result, check_connectivity, s3_key_for, upload_event, upload_image


class TestS3KeyFor:
    def test_default_plate(self):
        assert s3_key_for("evt123", "usb_0") == "scans/unknown/evt123/usb_0/frame_0000.jpg"

    def test_with_plate(self):
        assert s3_key_for("evt123", "usb_0", plate="ABC1234") == "scans/ABC1234/evt123/usb_0/frame_0000.jpg"

    def test_empty_plate_fallback(self):
        assert s3_key_for("evt123", "usb_0", plate="  ") == "scans/unknown/evt123/usb_0/frame_0000.jpg"

    def test_frame_index(self):
        assert s3_key_for("evt123", "usb_0", plate="XY99", frame_index=3) == "scans/XY99/evt123/usb_0/frame_0003.jpg"


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
    def test_uses_capture_frame_index_not_enumerate_position(self, mock_upload):
        """Frame index in the S3 key must come from CaptureResult.frame_index,
        not from the position of the capture in the filtered to_upload list."""
        captured_keys: list[str] = []

        def _record_key(local_path, s3_key, camera_id=""):
            captured_keys.append(s3_key)
            return S3Result(
                camera_id=camera_id,
                local_path=local_path,
                s3_key=s3_key,
                success=True,
            )

        mock_upload.side_effect = _record_key

        captures = [
            CaptureResult(
                camera_id="usb_0",
                local_path=Path("/tmp/a.jpg"),
                timestamp="t",
                success=False,  # failure — must not shift other indices
            ),
            CaptureResult(
                camera_id="usb_1",
                local_path=Path("/tmp/b.jpg"),
                timestamp="t",
                success=True,
                frame_index=0,
            ),
            CaptureResult(
                camera_id="usb_2",
                local_path=Path("/tmp/c.jpg"),
                timestamp="t",
                success=True,
                frame_index=2,  # original burst frame 2, not position 1
            ),
        ]

        results = upload_event("evt123", captures, plate="ABC123")

        assert len(results) == 2
        # Keys must reflect the original frame_index, not enumerate position
        assert "scans/ABC123/evt123/usb_1/frame_0000.jpg" in captured_keys
        assert "scans/ABC123/evt123/usb_2/frame_0002.jpg" in captured_keys
        # Enumerate-position key (frame_0001 for usb_2) must NOT appear
        assert "scans/ABC123/evt123/usb_2/frame_0001.jpg" not in captured_keys

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
