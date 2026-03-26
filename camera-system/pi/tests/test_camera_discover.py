"""
Unit tests for camera_discover module.
Run on any system: python -m pytest pi/tests/ -v
"""

import json
from unittest.mock import patch

from camera_discover import (
    CameraInfo,
    discover_rtsp_cameras,
    discover_v4l2_cameras,
    discover_all,
    get_v4l2_device_name,
)


# ---------------------------------------------------------------------------
# RTSP discovery
# ---------------------------------------------------------------------------


class TestDiscoverRtsp:
    """Test RTSP camera discovery from CAMERAS_JSON config."""

    def test_returns_empty_when_no_config(self):
        with patch("config.load_cameras_json", return_value=[]):
            result = discover_rtsp_cameras()
        assert result == []

    def test_returns_cameras_from_valid_config(self):
        cameras_json = [
            {"id": "cam_062", "url": "rtsp://admin:pass@192.168.0.62:554/", "name": "Cam 062"},
            {"id": "cam_135", "url": "rtsp://admin:pass@192.168.0.135:554/", "name": "Cam 135"},
        ]
        with patch("config.load_cameras_json", return_value=cameras_json):
            result = discover_rtsp_cameras()

        assert len(result) == 2
        assert all(c.kind == "rtsp" for c in result)
        assert result[0].name == "Cam 062"
        assert result[0].device == "rtsp://admin:pass@192.168.0.62:554/"
        assert result[0].index == 0
        assert result[1].index == 1

    def test_auto_generates_id_and_name_when_missing(self):
        cameras_json = [
            {"url": "rtsp://admin:pass@192.168.0.62:554/"},
        ]
        with patch("config.load_cameras_json", return_value=cameras_json):
            result = discover_rtsp_cameras()

        assert len(result) == 1
        assert result[0].name == "cam_0"

    def test_preserves_url_in_device_field(self):
        url = "rtsp://user:secret@10.0.0.5:554/stream1"
        with patch("config.load_cameras_json", return_value=[{"url": url}]):
            result = discover_rtsp_cameras()

        assert result[0].device == url


# ---------------------------------------------------------------------------
# V4L2 discovery
# ---------------------------------------------------------------------------


class TestDiscoverV4l2:
    """Test V4L2 camera discovery."""

    def test_returns_list(self):
        result = discover_v4l2_cameras()
        assert isinstance(result, list)

    def test_each_element_is_camera_info_with_usb_kind(self):
        result = discover_v4l2_cameras()
        for c in result:
            assert isinstance(c, CameraInfo)
            assert c.kind == "usb"
            assert c.device.startswith("/dev/video")
            assert c.name.startswith("video")
            assert isinstance(c.index, int)


class TestGetV4l2DeviceName:
    """Test human-readable name lookup."""

    def test_missing_v4l2_ctl_returns_device_path(self):
        with patch("camera_discover.subprocess.run") as m:
            m.side_effect = FileNotFoundError()
            assert get_v4l2_device_name("/dev/video0") == "/dev/video0"

    def test_nonzero_return_returns_device_path(self):
        with patch("camera_discover.subprocess.run") as m:
            m.return_value = type("R", (), {"returncode": 1, "stdout": ""})()
            assert get_v4l2_device_name("/dev/video0") == "/dev/video0"


# ---------------------------------------------------------------------------
# Aggregate discovery
# ---------------------------------------------------------------------------


class TestDiscoverAll:
    """Test combined discovery."""

    def test_returns_list(self):
        result = discover_all()
        assert isinstance(result, list)

    def test_elements_are_camera_info(self):
        result = discover_all()
        for c in result:
            assert isinstance(c, CameraInfo)
            assert c.kind in ("usb", "csi", "rtsp")
            assert c.device
            assert c.name

    def test_rtsp_cameras_appear_first(self):
        rtsp_entry = [{"id": "cam_1", "url": "rtsp://x:y@10.0.0.1:554/", "name": "Net Cam"}]
        with patch("config.load_cameras_json", return_value=rtsp_entry):
            result = discover_all()

        assert len(result) >= 1
        assert result[0].kind == "rtsp"

    def test_includes_rtsp_and_usb(self):
        """When both RTSP config and V4L2 devices exist, both are returned."""
        rtsp_entry = [{"id": "cam_1", "url": "rtsp://x:y@10.0.0.1:554/"}]
        fake_usb = [CameraInfo(kind="usb", device="/dev/video0", name="video0", index=0)]
        with (
            patch("config.load_cameras_json", return_value=rtsp_entry),
            patch("camera_discover.discover_v4l2_cameras", return_value=fake_usb),
        ):
            result = discover_all()

        kinds = [c.kind for c in result]
        assert "rtsp" in kinds
        assert "usb" in kinds


# ---------------------------------------------------------------------------
# Config parsing (load_cameras_json)
# ---------------------------------------------------------------------------


class TestLoadCamerasJson:
    """Test the config.load_cameras_json helper."""

    def test_empty_env_returns_empty(self):
        with patch("config._CAMERAS_JSON_RAW", ""):
            from config import load_cameras_json
            assert load_cameras_json() == []

    def test_valid_inline_json(self):
        data = json.dumps([
            {"id": "c1", "url": "rtsp://a:b@1.2.3.4:554/", "name": "Cam1"},
        ])
        with patch("config._CAMERAS_JSON_RAW", data), patch("config.CAMERA_USER", "a"), patch("config.CAMERA_PASS", "b"):
            from config import load_cameras_json
            result = load_cameras_json()
        assert len(result) == 1
        assert result[0]["id"] == "c1"

    def test_interpolates_credentials(self):
        data = json.dumps([
            {"url": "rtsp://${CAMERA_USER}:${CAMERA_PASS}@10.0.0.1:554/"},
        ])
        with patch("config._CAMERAS_JSON_RAW", data), patch("config.CAMERA_USER", "admin"), patch("config.CAMERA_PASS", "secret"):
            from config import load_cameras_json
            result = load_cameras_json()
        assert result[0]["url"] == "rtsp://admin:secret@10.0.0.1:554/"

    def test_malformed_json_returns_empty(self):
        with patch("config._CAMERAS_JSON_RAW", "{bad json"):
            from config import load_cameras_json
            assert load_cameras_json() == []

    def test_non_array_returns_empty(self):
        with patch("config._CAMERAS_JSON_RAW", '{"not": "an array"}'):
            from config import load_cameras_json
            assert load_cameras_json() == []

    def test_skips_entries_without_url(self):
        data = json.dumps([
            {"id": "good", "url": "rtsp://a:b@1.2.3.4:554/"},
            {"id": "bad", "name": "missing url"},
        ])
        with patch("config._CAMERAS_JSON_RAW", data), patch("config.CAMERA_USER", ""), patch("config.CAMERA_PASS", ""):
            from config import load_cameras_json
            result = load_cameras_json()
        assert len(result) == 1
        assert result[0]["id"] == "good"

    def test_loads_from_file_path(self, tmp_path):
        cam_file = tmp_path / "cameras.json"
        cam_file.write_text(json.dumps([
            {"id": "file_cam", "url": "rtsp://x:y@10.0.0.1:554/"},
        ]))
        with patch("config._CAMERAS_JSON_RAW", str(cam_file)), patch("config.CAMERA_USER", "x"), patch("config.CAMERA_PASS", "y"):
            from config import load_cameras_json
            result = load_cameras_json()
        assert len(result) == 1
        assert result[0]["id"] == "file_cam"

    def test_missing_file_returns_empty(self):
        with patch("config._CAMERAS_JSON_RAW", "/nonexistent/cameras.json"):
            from config import load_cameras_json
            assert load_cameras_json() == []
