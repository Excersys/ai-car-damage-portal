"""Tests for the detect_daemon burst capture logic."""

from __future__ import annotations

import json
import logging
from pathlib import Path
from unittest.mock import patch, MagicMock, call

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


class TestTryEnqueueToS3:
    """Unit tests for _try_enqueue_to_s3 and its USE_UPLOAD_QUEUE toggle."""

    def _make_scan(self, tmp_path, *, event_id="test_enqueue", plate="ABC123",
                    num_cameras=1, frames_per_camera=1) -> daemon.ScanEvent:
        scan = daemon.ScanEvent(
            event_id=event_id,
            trigger_camera="cam_1",
            trigger_detections=[{"class_name": "car", "confidence": 0.9, "bbox": [1, 2, 3, 4]}],
            start_time="2026-03-04T22:00:00Z",
            license_plate=plate,
        )
        with patch.object(daemon, "EVENT_OUTPUT_DIR", str(tmp_path)):
            event_dir = tmp_path / event_id
            event_dir.mkdir(parents=True)
            for c in range(num_cameras):
                cam_id = f"cam_{c + 1}"
                (event_dir / cam_id).mkdir()
                for f_idx in range(frames_per_camera):
                    frame_path = event_dir / cam_id / f"frame_{f_idx:04d}.jpg"
                    frame_path.write_bytes(b"\xff\xd8\xff")
                    scan.frames.append(daemon.BurstFrame(
                        camera_id=cam_id, frame_index=f_idx,
                        path=frame_path, detections=[], timestamp="",
                    ))
            (event_dir / "event.json").write_text(json.dumps(scan.to_dict()))
        return scan

    @patch.object(daemon, "_USE_UPLOAD_QUEUE", True)
    def test_enqueues_frames_to_upload_queue(self, tmp_path):
        scan = self._make_scan(tmp_path)
        mock_queue_cls = MagicMock()
        mock_queue_instance = MagicMock()
        mock_queue_instance.enqueue_scan.return_value = 2
        mock_queue_cls.return_value = mock_queue_instance

        with (
            patch.object(daemon, "EVENT_OUTPUT_DIR", str(tmp_path)),
            patch.object(type(scan), "event_dir", new_callable=lambda: property(lambda self: tmp_path / "test_enqueue")),
            patch.dict("sys.modules", {"upload_queue": MagicMock(UploadQueue=mock_queue_cls)}),
        ):
            daemon._try_enqueue_to_s3(scan)

        mock_queue_instance.enqueue_scan.assert_called_once()
        args = mock_queue_instance.enqueue_scan.call_args
        assert args[0][0] == "test_enqueue"
        frames_arg = args[0][1]
        assert len(frames_arg) == 1
        assert frames_arg[0][0] == "cam_1"

    @patch.object(daemon, "_USE_UPLOAD_QUEUE", True)
    def test_multi_camera_multi_frame_enqueue(self, tmp_path):
        """All frames from a 4-camera, 3-frame burst are enqueued."""
        scan = self._make_scan(tmp_path, event_id="multi_cam", plate="XYZ999",
                                num_cameras=4, frames_per_camera=3)
        mock_queue_cls = MagicMock()
        mock_queue_instance = MagicMock()
        mock_queue_instance.enqueue_scan.return_value = 13  # 12 frames + event.json
        mock_queue_cls.return_value = mock_queue_instance

        with (
            patch.object(daemon, "EVENT_OUTPUT_DIR", str(tmp_path)),
            patch.object(type(scan), "event_dir", new_callable=lambda: property(lambda self: tmp_path / "multi_cam")),
            patch.dict("sys.modules", {"upload_queue": MagicMock(UploadQueue=mock_queue_cls)}),
        ):
            daemon._try_enqueue_to_s3(scan)

        args = mock_queue_instance.enqueue_scan.call_args
        frames_arg = args[0][1]
        assert len(frames_arg) == 12
        camera_ids_in_frames = {f[0] for f in frames_arg}
        assert camera_ids_in_frames == {"cam_1", "cam_2", "cam_3", "cam_4"}

    @patch.object(daemon, "_USE_UPLOAD_QUEUE", True)
    def test_s3_keys_use_correct_plate(self, tmp_path):
        """S3 keys in enqueued frames contain the normalized license plate."""
        scan = self._make_scan(tmp_path, event_id="plate_test", plate="AB-C 123")
        mock_queue_cls = MagicMock()
        mock_queue_instance = MagicMock()
        mock_queue_instance.enqueue_scan.return_value = 2
        mock_queue_cls.return_value = mock_queue_instance

        with (
            patch.object(daemon, "EVENT_OUTPUT_DIR", str(tmp_path)),
            patch.object(type(scan), "event_dir", new_callable=lambda: property(lambda self: tmp_path / "plate_test")),
            patch.dict("sys.modules", {"upload_queue": MagicMock(UploadQueue=mock_queue_cls)}),
        ):
            daemon._try_enqueue_to_s3(scan)

        args = mock_queue_instance.enqueue_scan.call_args
        frames_arg = args[0][1]
        s3_key = frames_arg[0][2]
        assert "ABC123" in s3_key
        assert s3_key.startswith("scans/ABC123/")

    @patch.object(daemon, "_USE_UPLOAD_QUEUE", True)
    def test_empty_plate_uses_unknown_in_s3_keys(self, tmp_path):
        """When license_plate is empty, S3 keys fall back to 'unknown'."""
        scan = self._make_scan(tmp_path, event_id="no_plate", plate="")
        mock_queue_cls = MagicMock()
        mock_queue_instance = MagicMock()
        mock_queue_instance.enqueue_scan.return_value = 2
        mock_queue_cls.return_value = mock_queue_instance

        with (
            patch.object(daemon, "EVENT_OUTPUT_DIR", str(tmp_path)),
            patch.object(type(scan), "event_dir", new_callable=lambda: property(lambda self: tmp_path / "no_plate")),
            patch.dict("sys.modules", {"upload_queue": MagicMock(UploadQueue=mock_queue_cls)}),
        ):
            daemon._try_enqueue_to_s3(scan)

        args = mock_queue_instance.enqueue_scan.call_args
        frames_arg = args[0][1]
        assert frames_arg[0][2].startswith("scans/unknown/")

        event_json_key = args[1]["event_json_s3_key"]
        assert event_json_key.startswith("scans/unknown/")

    @patch.object(daemon, "_USE_UPLOAD_QUEUE", True)
    def test_event_json_s3_key_format(self, tmp_path):
        """event.json S3 key follows scans/{plate}/{event_id}/event.json."""
        scan = self._make_scan(tmp_path, event_id="evt_json_key", plate="TEST1")
        mock_queue_cls = MagicMock()
        mock_queue_instance = MagicMock()
        mock_queue_instance.enqueue_scan.return_value = 2
        mock_queue_cls.return_value = mock_queue_instance

        with (
            patch.object(daemon, "EVENT_OUTPUT_DIR", str(tmp_path)),
            patch.object(type(scan), "event_dir", new_callable=lambda: property(lambda self: tmp_path / "evt_json_key")),
            patch.dict("sys.modules", {"upload_queue": MagicMock(UploadQueue=mock_queue_cls)}),
        ):
            daemon._try_enqueue_to_s3(scan)

        args = mock_queue_instance.enqueue_scan.call_args
        event_json_key = args[1]["event_json_s3_key"]
        assert event_json_key == "scans/TEST1/evt_json_key/event.json"
        event_json_path = args[1]["event_json_path"]
        assert event_json_path.endswith("event.json")

    @patch.object(daemon, "_USE_UPLOAD_QUEUE", True)
    def test_exception_in_enqueue_does_not_propagate(self, tmp_path, caplog):
        """Exceptions inside _try_enqueue_to_s3 are logged, not raised."""
        scan = self._make_scan(tmp_path, event_id="err_test", plate="OOPS")
        mock_queue_cls = MagicMock()
        mock_queue_cls.side_effect = RuntimeError("DB locked")

        with (
            patch.object(daemon, "EVENT_OUTPUT_DIR", str(tmp_path)),
            patch.object(type(scan), "event_dir", new_callable=lambda: property(lambda self: tmp_path / "err_test")),
            patch.dict("sys.modules", {"upload_queue": MagicMock(UploadQueue=mock_queue_cls)}),
            caplog.at_level(logging.ERROR),
        ):
            daemon._try_enqueue_to_s3(scan)

        assert "Failed to enqueue scan" in caplog.text

    @patch.object(daemon, "_USE_UPLOAD_QUEUE", True)
    def test_db_path_and_max_retries_from_module_vars(self, tmp_path):
        """UploadQueue is instantiated with _UPLOAD_QUEUE_DB and _UPLOAD_MAX_RETRIES."""
        scan = self._make_scan(tmp_path, event_id="cfg_check", plate="X")
        mock_queue_cls = MagicMock()
        mock_queue_instance = MagicMock()
        mock_queue_instance.enqueue_scan.return_value = 2
        mock_queue_cls.return_value = mock_queue_instance

        with (
            patch.object(daemon, "EVENT_OUTPUT_DIR", str(tmp_path)),
            patch.object(daemon, "_UPLOAD_QUEUE_DB", "/custom/queue.db"),
            patch.object(daemon, "_UPLOAD_MAX_RETRIES", 10),
            patch.object(type(scan), "event_dir", new_callable=lambda: property(lambda self: tmp_path / "cfg_check")),
            patch.dict("sys.modules", {"upload_queue": MagicMock(UploadQueue=mock_queue_cls)}),
        ):
            daemon._try_enqueue_to_s3(scan)

        mock_queue_cls.assert_called_once_with(db_path="/custom/queue.db", max_retries=10)

    @patch.object(daemon, "_USE_UPLOAD_QUEUE", False)
    def test_falls_back_to_scan_uploader_when_disabled(self, tmp_path):
        scan = self._make_scan(tmp_path)
        mock_upload = MagicMock()

        with patch.dict("sys.modules", {"scan_uploader": MagicMock(upload_scan=mock_upload)}):
            daemon._try_enqueue_to_s3(scan)

        mock_upload.assert_called_once_with(scan)

    @patch.object(daemon, "_USE_UPLOAD_QUEUE", False)
    def test_fallback_scan_uploader_import_error(self, tmp_path, caplog):
        """When USE_UPLOAD_QUEUE=0 and scan_uploader is missing, it logs debug and continues."""
        scan = self._make_scan(tmp_path, event_id="fallback_missing")

        # Remove scan_uploader from sys.modules to trigger ImportError
        import sys as _sys
        saved = _sys.modules.pop("scan_uploader", None)
        try:
            with caplog.at_level(logging.DEBUG, logger="tunnel-detect"):
                daemon._try_enqueue_to_s3(scan)
        finally:
            if saved is not None:
                _sys.modules["scan_uploader"] = saved


class TestHandleVehicleEntryHookOrder:
    """Verify that event.json is written before _try_enqueue_to_s3 is called."""

    @patch.object(daemon, "burst_capture")
    @patch.object(daemon, "_try_read_plate")
    @patch.object(daemon, "_try_enqueue_to_s3")
    @patch.object(daemon, "_try_save_results")
    @patch.object(daemon, "_try_generate_viewer")
    @patch.object(daemon, "_post_webhook")
    def test_event_json_written_before_enqueue(
        self, mock_webhook, mock_viewer, mock_save, mock_enqueue,
        mock_plate, mock_burst, tmp_path,
    ):
        enqueue_saw_event_json = []

        def track_enqueue(scan):
            meta = scan.event_dir / "event.json"
            enqueue_saw_event_json.append(meta.exists())

        mock_enqueue.side_effect = track_enqueue

        cameras = _make_cameras()
        trigger_cam = cameras[0]
        frame = _fake_frame()

        with patch.object(daemon, "EVENT_OUTPUT_DIR", str(tmp_path)):
            scan = daemon.handle_vehicle_entry(
                MagicMock(), cameras, trigger_cam,
                [{"class_name": "car", "confidence": 0.9, "bbox": [1, 2, 3, 4]}],
                frame,
            )
            assert enqueue_saw_event_json == [True], "event.json must exist before _try_enqueue_to_s3"
            assert (scan.event_dir / "event.json").exists()

    @patch.object(daemon, "burst_capture")
    @patch.object(daemon, "_try_read_plate")
    @patch.object(daemon, "_try_enqueue_to_s3")
    @patch.object(daemon, "_try_save_results")
    @patch.object(daemon, "_try_generate_viewer")
    @patch.object(daemon, "_post_webhook")
    def test_hook_call_order(
        self, mock_webhook, mock_viewer, mock_save, mock_enqueue,
        mock_plate, mock_burst, tmp_path,
    ):
        """Verify the exact order: plate → (event.json write) → save → viewer → enqueue → webhook."""
        call_log: list[str] = []
        mock_plate.side_effect = lambda s: call_log.append("plate")
        mock_save.side_effect = lambda s: call_log.append("save")
        mock_viewer.side_effect = lambda s: call_log.append("viewer")
        mock_enqueue.side_effect = lambda s: call_log.append("enqueue")
        mock_webhook.side_effect = lambda d: call_log.append("webhook")

        cameras = _make_cameras()
        with patch.object(daemon, "EVENT_OUTPUT_DIR", str(tmp_path)):
            daemon.handle_vehicle_entry(
                MagicMock(), cameras, cameras[0],
                [{"class_name": "car", "confidence": 0.9, "bbox": [1, 2, 3, 4]}],
                _fake_frame(),
            )

        assert call_log == ["plate", "save", "viewer", "enqueue", "webhook"]

    @patch.object(daemon, "burst_capture")
    @patch.object(daemon, "_try_read_plate")
    @patch.object(daemon, "_try_enqueue_to_s3")
    @patch.object(daemon, "_try_save_results")
    @patch.object(daemon, "_try_generate_viewer")
    @patch.object(daemon, "_post_webhook")
    def test_event_json_contains_valid_json(
        self, mock_webhook, mock_viewer, mock_save, mock_enqueue,
        mock_plate, mock_burst, tmp_path,
    ):
        """The event.json written to disk is parseable and contains expected fields."""
        cameras = _make_cameras()
        with patch.object(daemon, "EVENT_OUTPUT_DIR", str(tmp_path)):
            scan = daemon.handle_vehicle_entry(
                MagicMock(), cameras, cameras[0],
                [{"class_name": "car", "confidence": 0.9, "bbox": [1, 2, 3, 4]}],
                _fake_frame(),
            )
            meta = scan.event_dir / "event.json"
            assert meta.exists()
            data = json.loads(meta.read_text())
            assert data["event_type"] == "vehicle_scan"
            assert data["event_id"] == scan.event_id
            assert data["trigger_camera"] == cameras[0].cam_id

    @patch.object(daemon, "burst_capture")
    @patch.object(daemon, "_try_read_plate")
    @patch.object(daemon, "_try_enqueue_to_s3")
    @patch.object(daemon, "_try_save_results")
    @patch.object(daemon, "_try_generate_viewer")
    @patch.object(daemon, "_post_webhook")
    def test_trigger_frame_saved_as_frame_0000(
        self, mock_webhook, mock_viewer, mock_save, mock_enqueue,
        mock_plate, mock_burst, tmp_path,
    ):
        """The trigger frame is saved to disk as frame_0000.jpg."""
        cameras = _make_cameras()
        frame = _fake_frame()
        with patch.object(daemon, "EVENT_OUTPUT_DIR", str(tmp_path)):
            scan = daemon.handle_vehicle_entry(
                MagicMock(), cameras, cameras[0],
                [{"class_name": "car", "confidence": 0.9, "bbox": [1, 2, 3, 4]}],
                frame,
            )
            trigger_img = scan.event_dir / cameras[0].cam_id / "frame_0000.jpg"
            assert trigger_img.exists()
            assert trigger_img.stat().st_size > 0
