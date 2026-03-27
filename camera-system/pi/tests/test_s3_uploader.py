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
    def test_format(self):
        assert s3_key_for("evt123", "usb_0") == "scans/unknown/evt123/usb_0/frame_0000.jpg"


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
