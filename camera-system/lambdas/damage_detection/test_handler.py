"""Unit tests for DamageDetection Lambda handler (all AWS calls mocked)."""

import json
import os
import sys
from unittest.mock import MagicMock

import pytest

pytestmark = pytest.mark.usefixtures("env_and_handler")


def _s3_event(bucket: str, key: str) -> dict:
    return {
        "Records": [{
            "s3": {
                "bucket": {"name": bucket},
                "object": {"key": key},
            },
        }],
    }


class TestParseS3Key:
    def test_new_format(self, env_and_handler):
        h = env_and_handler
        result = h._parse_s3_key("scans/PLT1/evt1/cam_a/frame_0001.jpg")
        assert result == {
            "license_plate": "PLT1",
            "event_id": "evt1",
            "camera_id": "cam_a",
            "frame": "frame_0001",
        }

    def test_old_format(self, env_and_handler):
        h = env_and_handler
        result = h._parse_s3_key("evt2/cam_b.jpg")
        assert result == {
            "license_plate": "",
            "event_id": "evt2",
            "camera_id": "cam_b",
            "frame": "frame_0000",
        }

    def test_bad_format_returns_none(self, env_and_handler):
        assert env_and_handler._parse_s3_key("just_a_file.jpg") is None


class TestCameraFrameKey:
    def test_composite_key(self, env_and_handler):
        assert env_and_handler._camera_frame_key("cam_0", "frame_0001") == "cam_0#frame_0001"


class TestLambdaHandler:
    def test_end_to_end_stores_result(self, env_and_handler):
        h = env_and_handler
        h.s3.get_object.return_value = {
            "Body": MagicMock(read=lambda: b"fake-image-bytes"),
        }
        h.sagemaker_runtime.invoke_endpoint.return_value = {
            "Body": MagicMock(
                read=lambda: json.dumps({
                    "confidence": 0.92,
                    "damage_type": "dent",
                    "bounding_boxes": [{"x": 10, "y": 20, "w": 30, "h": 40}],
                }).encode()
            ),
        }

        event = _s3_event("my-bucket", "scans/ABC/evt1/rtsp_0/frame_0001.jpg")
        resp = h.lambda_handler(event, None)

        assert resp["statusCode"] == 200
        h.table.put_item.assert_called_once()
        item = h.table.put_item.call_args[1]["Item"]
        assert item["event_id"] == "evt1"
        assert item["camera_frame"] == "rtsp_0#frame_0001"
        assert item["damage_detected"] is True
        assert item["license_plate"] == "ABC"

    def test_below_threshold_no_damage(self, env_and_handler):
        h = env_and_handler
        h.s3.get_object.return_value = {
            "Body": MagicMock(read=lambda: b"img"),
        }
        h.sagemaker_runtime.invoke_endpoint.return_value = {
            "Body": MagicMock(
                read=lambda: json.dumps({"confidence": 0.1}).encode()
            ),
        }

        event = _s3_event("b", "scans/X/evt2/c0/frame_0000.jpg")
        h.lambda_handler(event, None)

        item = h.table.put_item.call_args[1]["Item"]
        assert item["damage_detected"] is False

    def test_skips_non_jpg(self, env_and_handler):
        h = env_and_handler
        event = _s3_event("b", "scans/X/e/c/frame.png")
        h.lambda_handler(event, None)
        h.s3.get_object.assert_not_called()

    def test_sagemaker_failure_no_store(self, env_and_handler):
        h = env_and_handler
        h.s3.get_object.return_value = {
            "Body": MagicMock(read=lambda: b"img"),
        }
        h.sagemaker_runtime.invoke_endpoint.side_effect = RuntimeError("timeout")

        event = _s3_event("b", "scans/X/evt3/c0/frame_0000.jpg")
        resp = h.lambda_handler(event, None)

        assert resp["statusCode"] == 200
        h.table.put_item.assert_not_called()

    def test_stored_row_matches_contract(self, env_and_handler):
        """Validate the DynamoDB item against the published contract."""
        h = env_and_handler
        review_api_path = os.path.join(os.path.dirname(__file__), "..", "review_api")
        if review_api_path not in sys.path:
            sys.path.insert(0, review_api_path)
        from contracts import validate_stored_damage_row

        h.s3.get_object.return_value = {
            "Body": MagicMock(read=lambda: b"img"),
        }
        h.sagemaker_runtime.invoke_endpoint.return_value = {
            "Body": MagicMock(
                read=lambda: json.dumps({
                    "confidence": 0.75,
                    "damage_type": "scratch",
                    "bounding_boxes": [],
                }).encode()
            ),
        }

        event = _s3_event("b", "scans/PLT/e1/c0/frame_0000.jpg")
        h.lambda_handler(event, None)

        item = h.table.put_item.call_args[1]["Item"]
        validate_stored_damage_row(item)


class TestInferenceRoundtrip:
    """End-to-end: model response -> Lambda parsing -> DynamoDB item, all validated."""

    FIXTURE_RESPONSES = [
        {
            "confidence": 0.92,
            "damage_type": "dent",
            "bounding_boxes": [{"x": 10, "y": 20, "w": 30, "h": 40}],
        },
        {
            "confidence": 0.0,
            "damage_type": "none",
            "bounding_boxes": [],
        },
        {
            "confidence": 0.45,
        },
        {
            "confidence": 0.78,
            "damage_type": "scratch",
            "bounding_boxes": [
                {"x": 100, "y": 200, "w": 50, "h": 60},
                {"x": 300, "y": 400, "w": 25, "h": 30},
            ],
            "model_version": "v1.0",
        },
    ]

    @pytest.mark.parametrize("model_response", FIXTURE_RESPONSES)
    def test_valid_model_response_produces_valid_row(self, env_and_handler, model_response):
        """Every fixture response must pass the inference contract AND
        produce a DynamoDB row that passes the stored-row contract."""
        review_api_path = os.path.join(os.path.dirname(__file__), "..", "review_api")
        if review_api_path not in sys.path:
            sys.path.insert(0, review_api_path)
        from contracts import validate_inference_response, validate_stored_damage_row

        h = env_and_handler
        validate_inference_response(model_response)

        h.s3.get_object.return_value = {
            "Body": MagicMock(read=lambda: b"img"),
        }
        h.sagemaker_runtime.invoke_endpoint.return_value = {
            "Body": MagicMock(
                read=lambda: json.dumps(model_response).encode()
            ),
        }

        event = _s3_event("b", "scans/PLT/e1/cam0/frame_0000.jpg")
        resp = h.lambda_handler(event, None)
        assert resp["statusCode"] == 200

        item = h.table.put_item.call_args[1]["Item"]
        validate_stored_damage_row(item)

        conf = model_response.get("confidence", 0)
        assert item["damage_detected"] == (conf >= 0.6)
        assert item["damage_type"] == model_response.get("damage_type", "unknown")
        assert json.loads(item["bounding_boxes"]) == model_response.get("bounding_boxes", [])
