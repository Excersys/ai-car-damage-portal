"""Tests for the detect_daemon burst capture logic."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import patch, MagicMock
from datetime import datetime, timezone

import numpy as np
import pytest

import detect_daemon as daemon


def _fake_frame(h: int = 480, w: int = 640) -> np.ndarray:
    return np.random.randint(0, 255, (h, w, 3), dtype=np.uint8)


def _make_cameras() -> list[daemon.CameraInfo]:
    return [
        daemon.CameraInfo("cam_1", "rtsp://fake:554/1", "Cam 1"),
        daemon.CameraInfo("cam_2", "rtsp://fake:554/2", "Cam 2"),
    ]


class TestScanEvent:
    def test_to_dict(self):
        scan = daemon.ScanEvent(
            event_id="test_001",
            trigger_camera="cam_1",
            trigger_detections=[{"class_name": "car", "confidence": 0.9, "bbox": [1, 2, 3, 4]}],
            start_time="2026-03-04T22:00:00Z",
        )
        d = scan.to_dict()
        assert d["event_type"] == "vehicle_scan"
        assert d["event_id"] == "test_001"
        assert d["trigger_camera"] == "cam_1"
        assert d["total_frames"] == 0

    def test_frames_by_camera(self):
        scan = daemon.ScanEvent(
            event_id="test_001",
            trigger_camera="cam_1",
            trigger_detections=[],
            start_time="2026-03-04T22:00:00Z",
        )
        scan.frames.append(daemon.BurstFrame(
            camera_id="cam_1", frame_index=0,
            path=Path("/tmp/frame.jpg"), detections=[], timestamp="",
        ))
        scan.frames.append(daemon.BurstFrame(
            camera_id="cam_2", frame_index=0,
            path=Path("/tmp/frame.jpg"), detections=[], timestamp="",
        ))
        d = scan.to_dict()
        assert "cam_1" in d["cameras"]
        assert "cam_2" in d["cameras"]
        assert len(d["cameras"]["cam_1"]) == 1


class TestGrabFramesParallel:
    @patch.object(daemon, "grab_frame")
    def test_returns_dict_per_camera(self, mock_grab):
        mock_grab.return_value = _fake_frame()
        cameras = _make_cameras()
        result = daemon.grab_frames_parallel(cameras)
        assert set(result.keys()) == {"cam_1", "cam_2"}
        assert all(v is not None for v in result.values())

    @patch.object(daemon, "grab_frame")
    def test_handles_failures(self, mock_grab):
        mock_grab.side_effect = [_fake_frame(), None]
        cameras = _make_cameras()
        result = daemon.grab_frames_parallel(cameras)
        assert result["cam_1"] is not None
        assert result["cam_2"] is None


class TestBurstCapture:
    @patch.object(daemon, "grab_frames_parallel")
    @patch.object(daemon, "BURST_MAX_DURATION", 2)
    @patch.object(daemon, "BURST_INTERVAL", 0.5)
    @patch.object(daemon, "BURST_EXIT_MISSES", 2)
    def test_captures_frames(self, mock_grab, tmp_path):
        mock_grab.return_value = {
            "cam_1": _fake_frame(),
            "cam_2": _fake_frame(),
        }
        detector = MagicMock()
        detector.detect.return_value = [{"class_name": "car", "confidence": 0.8, "bbox": [1, 2, 3, 4]}]

        scan = daemon.ScanEvent(
            event_id="test_burst",
            trigger_camera="cam_1",
            trigger_detections=[],
            start_time="2026-03-04T22:00:00Z",
        )
        with patch.object(daemon, "EVENT_OUTPUT_DIR", str(tmp_path)):
            scan_dir = tmp_path / "test_burst"
            scan_dir.mkdir()
            object.__setattr__(scan, "_event_dir_override", scan_dir)
            with patch.object(type(scan), "event_dir", new_callable=lambda: property(lambda self: scan_dir)):
                daemon.burst_capture(detector, _make_cameras(), scan)

        assert len(scan.frames) > 0
        assert scan.end_time != ""

    @patch.object(daemon, "grab_frames_parallel")
    @patch.object(daemon, "BURST_MAX_DURATION", 10)
    @patch.object(daemon, "BURST_INTERVAL", 0.1)
    @patch.object(daemon, "BURST_EXIT_MISSES", 2)
    def test_exits_early_when_vehicle_leaves(self, mock_grab, tmp_path):
        mock_grab.return_value = {
            "cam_1": _fake_frame(),
            "cam_2": _fake_frame(),
        }
        detector = MagicMock()
        detector.detect.return_value = []

        scan = daemon.ScanEvent(
            event_id="test_exit",
            trigger_camera="cam_1",
            trigger_detections=[],
            start_time="2026-03-04T22:00:00Z",
        )

        with patch.object(daemon, "EVENT_OUTPUT_DIR", str(tmp_path)):
            scan_dir = tmp_path / "test_exit"
            scan_dir.mkdir()
            with patch.object(type(scan), "event_dir", new_callable=lambda: property(lambda self: scan_dir)):
                daemon.burst_capture(detector, _make_cameras(), scan)

        assert len(scan.frames) <= 4  # 2 cameras × 2 empty cycles


class TestRedact:
    def test_redacts_password(self):
        assert "Password" not in daemon._redact("rtsp://admin:Password@1.2.3.4/")
        assert "***" in daemon._redact("rtsp://admin:Password@1.2.3.4/")

    def test_preserves_no_auth(self):
        assert daemon._redact("rtsp://1.2.3.4/") == "rtsp://1.2.3.4/"
