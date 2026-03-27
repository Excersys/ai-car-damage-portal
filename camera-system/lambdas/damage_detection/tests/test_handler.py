"""
Contract tests for the DamageDetection Lambda handler.

Validates S3 key parsing and DynamoDB storage against all known key formats
and SageMaker response shapes.
"""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def _load_fixture(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


# ---------------------------------------------------------------------------
# We need to patch env vars before the handler module is imported, because it
# reads them at module level.
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def _patch_env(monkeypatch):
    monkeypatch.setenv("SAGEMAKER_ENDPOINT", "test-endpoint")
    monkeypatch.setenv("DYNAMODB_TABLE", "test-table")
    monkeypatch.setenv("CONFIDENCE_THRESHOLD", "0.6")


@pytest.fixture()
def handler_module(_patch_env):
    """Import the handler after env vars are set."""
    import importlib
    import handler as mod
    importlib.reload(mod)
    return mod


# ===================================================================
# _parse_s3_key
# ===================================================================


class TestParseS3Key:
    """Validate both old and new S3 key formats."""

    def test_new_format_full(self, handler_module):
        result = handler_module._parse_s3_key(
            "scans/ABC123/evt-001/cam_061/frame_0002.jpg"
        )
        assert result == {
            "license_plate": "ABC123",
            "event_id": "evt-001",
            "camera_id": "cam_061",
            "frame": "frame_0002",
        }

    def test_new_format_unknown_plate(self, handler_module):
        result = handler_module._parse_s3_key(
            "scans/unknown/evt-002/usb_0/frame_0000.jpg"
        )
        assert result == {
            "license_plate": "unknown",
            "event_id": "evt-002",
            "camera_id": "usb_0",
            "frame": "frame_0000",
        }

    def test_old_flat_format(self, handler_module):
        result = handler_module._parse_s3_key("evt-003/cam_062.jpg")
        assert result == {
            "license_plate": "",
            "event_id": "evt-003",
            "camera_id": "cam_062",
            "frame": "frame_0000",
        }

    def test_invalid_key_returns_none(self, handler_module):
        assert handler_module._parse_s3_key("bad-key.jpg") is None

    def test_empty_key_returns_none(self, handler_module):
        assert handler_module._parse_s3_key("") is None

    def test_deep_nested_key_returns_none(self, handler_module):
        assert handler_module._parse_s3_key("a/b/c/d/e/f/g.jpg") is None


# ===================================================================
# _store_result — validates DynamoDB item shape against fixtures
# ===================================================================


class TestStoreResult:
    """Ensure results are stored with the composite sort key."""

    @pytest.fixture(autouse=True)
    def _mock_table(self, handler_module):
        self.mock_table = MagicMock()
        handler_module.table = self.mock_table
        self.handler = handler_module

    def _parsed(self, **overrides):
        defaults = {
            "event_id": "evt-100",
            "camera_id": "cam_061",
            "frame": "frame_0003",
            "license_plate": "XYZ789",
        }
        defaults.update(overrides)
        return defaults

    def test_damage_found(self):
        prediction = _load_fixture("damage_found.json")
        self.handler._store_result(
            self._parsed(), "scans/XYZ789/evt-100/cam_061/frame_0003.jpg", prediction
        )

        self.mock_table.put_item.assert_called_once()
        item = self.mock_table.put_item.call_args[1]["Item"]

        assert item["event_id"] == "evt-100"
        assert item["camera_frame"] == "cam_061#frame_0003"
        assert item["camera_id"] == "cam_061"
        assert item["frame"] == "frame_0003"
        assert item["damage_detected"] is True
        assert item["damage_type"] == "dent"
        assert float(item["confidence_score"]) == 0.92
        boxes = json.loads(item["bounding_boxes"])
        assert len(boxes) == 1

    def test_no_damage(self):
        prediction = _load_fixture("no_damage.json")
        self.handler._store_result(
            self._parsed(), "scans/XYZ789/evt-100/cam_061/frame_0003.jpg", prediction
        )

        item = self.mock_table.put_item.call_args[1]["Item"]
        assert item["damage_detected"] is False
        assert item["damage_type"] == "none"
        boxes = json.loads(item["bounding_boxes"])
        assert boxes == []

    def test_low_confidence_below_threshold(self):
        prediction = _load_fixture("low_confidence.json")
        self.handler._store_result(
            self._parsed(), "scans/XYZ789/evt-100/cam_061/frame_0003.jpg", prediction
        )

        item = self.mock_table.put_item.call_args[1]["Item"]
        assert item["damage_detected"] is False
        assert float(item["confidence_score"]) == 0.45

    def test_multiple_bounding_boxes(self):
        prediction = _load_fixture("multiple_boxes.json")
        self.handler._store_result(
            self._parsed(), "scans/XYZ789/evt-100/cam_061/frame_0003.jpg", prediction
        )

        item = self.mock_table.put_item.call_args[1]["Item"]
        assert item["damage_detected"] is True
        boxes = json.loads(item["bounding_boxes"])
        assert len(boxes) == 3

    def test_composite_sort_key_prevents_overwrite(self):
        """Two frames from the same camera produce different sort keys."""
        prediction = _load_fixture("damage_found.json")

        self.handler._store_result(
            self._parsed(frame="frame_0000"),
            "scans/XYZ789/evt-100/cam_061/frame_0000.jpg",
            prediction,
        )
        self.handler._store_result(
            self._parsed(frame="frame_0001"),
            "scans/XYZ789/evt-100/cam_061/frame_0001.jpg",
            prediction,
        )

        assert self.mock_table.put_item.call_count == 2
        items = [
            call[1]["Item"] for call in self.mock_table.put_item.call_args_list
        ]
        sort_keys = {item["camera_frame"] for item in items}
        assert sort_keys == {"cam_061#frame_0000", "cam_061#frame_0001"}

    def test_default_frame_when_missing(self):
        prediction = _load_fixture("no_damage.json")
        parsed = self._parsed(frame="frame_0000")
        del parsed["frame"]
        self.handler._store_result(
            parsed, "scans/XYZ789/evt-100/cam_061/frame_0000.jpg", prediction
        )

        item = self.mock_table.put_item.call_args[1]["Item"]
        assert item["camera_frame"] == "cam_061#frame_0000"


# ===================================================================
# Full handler integration (S3 event -> parse -> model -> store)
# ===================================================================


class TestLambdaHandler:
    """End-to-end handler test with mocked AWS services."""

    @pytest.fixture(autouse=True)
    def _mock_aws(self, handler_module):
        self.handler = handler_module
        self.mock_s3 = MagicMock()
        self.mock_sagemaker = MagicMock()
        self.mock_table = MagicMock()
        handler_module.s3 = self.mock_s3
        handler_module.sagemaker_runtime = self.mock_sagemaker
        handler_module.table = self.mock_table

    def _s3_event(self, bucket: str, key: str) -> dict:
        return {
            "Records": [
                {"s3": {"bucket": {"name": bucket}, "object": {"key": key}}}
            ]
        }

    def test_full_pipeline_new_key(self):
        self.mock_s3.get_object.return_value = {
            "Body": MagicMock(read=lambda: b"\xff\xd8\xff")
        }
        fixture = _load_fixture("damage_found.json")
        self.mock_sagemaker.invoke_endpoint.return_value = {
            "Body": MagicMock(read=lambda: json.dumps(fixture).encode())
        }

        result = self.handler.lambda_handler(
            self._s3_event(
                "tunnel-images-123456",
                "scans/ABC123/evt-500/cam_062/frame_0005.jpg",
            ),
            None,
        )

        assert result["statusCode"] == 200
        self.mock_table.put_item.assert_called_once()
        item = self.mock_table.put_item.call_args[1]["Item"]
        assert item["event_id"] == "evt-500"
        assert item["camera_frame"] == "cam_062#frame_0005"
        assert item["license_plate"] == "ABC123"

    def test_skips_non_jpg(self):
        result = self.handler.lambda_handler(
            self._s3_event("bucket", "scans/X/evt/cam/frame.png"), None
        )
        assert result["statusCode"] == 200
        self.mock_table.put_item.assert_not_called()

    def test_handles_s3_read_failure(self):
        self.mock_s3.get_object.side_effect = Exception("access denied")
        result = self.handler.lambda_handler(
            self._s3_event("bucket", "scans/X/evt/cam/frame_0000.jpg"), None
        )
        assert result["statusCode"] == 200
        self.mock_table.put_item.assert_not_called()

    def test_handles_sagemaker_failure(self):
        self.mock_s3.get_object.return_value = {
            "Body": MagicMock(read=lambda: b"\xff\xd8\xff")
        }
        self.mock_sagemaker.invoke_endpoint.side_effect = Exception("timeout")
        result = self.handler.lambda_handler(
            self._s3_event("bucket", "scans/X/evt/cam/frame_0000.jpg"), None
        )
        assert result["statusCode"] == 200
        self.mock_table.put_item.assert_not_called()
