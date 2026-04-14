"""Tests for scan_uploader S3 key building and upload logic."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

import scan_uploader as uploader
import detect_daemon as daemon


class TestBuildS3Prefix:
    def test_with_plate(self):
        assert uploader.build_s3_prefix({"license_plate": "ABC123", "event_id": "e1"}) == "scans/ABC123/e1"

    def test_unknown_plate(self):
        assert uploader.build_s3_prefix({"license_plate": "", "event_id": "e2"}) == "scans/unknown/e2"

    def test_missing_plate_key(self):
        assert uploader.build_s3_prefix({"event_id": "e3"}) == "scans/unknown/e3"


class TestUploadResult:
    def test_defaults(self):
        r = uploader.UploadResult(local_path=Path("/a"), s3_key="k")
        assert r.success is True
        assert r.error == ""


def _make_scan(event_id: str, plate: str = "") -> daemon.ScanEvent:
    return daemon.ScanEvent(
        event_id=event_id,
        trigger_camera="cam_1",
        trigger_detections=[],
        start_time="2026-01-01T00:00:00Z",
        license_plate=plate,
    )


class TestUploadScan:
    @patch.object(uploader, "_HAS_BOTO3", False)
    def test_skips_when_no_boto3(self, tmp_path):
        with patch.object(daemon, "EVENT_OUTPUT_DIR", str(tmp_path)):
            (tmp_path / "e1").mkdir()
            scan = _make_scan("e1")
            results = uploader.upload_scan(scan)
        assert results == []

    @patch.object(uploader, "_HAS_BOTO3", True)
    @patch.object(uploader, "_get_s3_client")
    def test_uploads_frames(self, mock_get_client, tmp_path):
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client

        with patch.object(daemon, "EVENT_OUTPUT_DIR", str(tmp_path)):
            event_dir = tmp_path / "e1"
            event_dir.mkdir()
            cam_dir = event_dir / "cam_1"
            cam_dir.mkdir()
            frame_path = cam_dir / "frame_0000.jpg"
            frame_path.write_bytes(b"fake-jpg")

            scan = _make_scan("e1", plate="XYZ")
            scan.frames.append(daemon.BurstFrame(
                camera_id="cam_1",
                frame_index=0,
                path=frame_path,
                detections=[],
                timestamp="2026-01-01T00:00:00Z",
            ))

            results = uploader.upload_scan(scan)

        assert len(results) >= 1
        uploaded_keys = [r.s3_key for r in results if r.success]
        assert any("scans/XYZ/e1/cam_1/frame_0000.jpg" in k for k in uploaded_keys)

    @patch.object(uploader, "_HAS_BOTO3", True)
    @patch.object(uploader, "_get_s3_client")
    def test_upload_with_event_json(self, mock_get_client, tmp_path):
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client

        with patch.object(daemon, "EVENT_OUTPUT_DIR", str(tmp_path)):
            event_dir = tmp_path / "e2"
            event_dir.mkdir()
            meta = event_dir / "event.json"
            meta.write_text("{}")

            scan = _make_scan("e2")
            results = uploader.upload_scan(scan)

        meta_uploads = [r for r in results if "event.json" in r.s3_key]
        assert len(meta_uploads) == 1

    @patch.object(uploader, "_HAS_BOTO3", True)
    @patch.object(uploader, "_get_s3_client")
    def test_handles_s3_error(self, mock_get_client, tmp_path):
        mock_client = MagicMock()
        mock_client.upload_file.side_effect = RuntimeError("network error")
        mock_get_client.return_value = mock_client

        with patch.object(daemon, "EVENT_OUTPUT_DIR", str(tmp_path)):
            event_dir = tmp_path / "e3"
            event_dir.mkdir()
            cam_dir = event_dir / "cam_1"
            cam_dir.mkdir()
            frame_path = cam_dir / "frame_0000.jpg"
            frame_path.write_bytes(b"img")

            scan = _make_scan("e3")
            scan.frames.append(daemon.BurstFrame(
                camera_id="cam_1",
                frame_index=0,
                path=frame_path,
                detections=[],
                timestamp="t",
            ))

            results = uploader.upload_scan(scan)

        failed = [r for r in results if not r.success]
        assert len(failed) >= 1
        assert "network error" in failed[0].error
