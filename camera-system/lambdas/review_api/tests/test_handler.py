"""
Contract tests for the ReviewAPI Lambda handler.

Validates that the API correctly handles the composite ``camera_frame``
sort key and returns per-frame results.
"""

from __future__ import annotations

import json
from unittest.mock import MagicMock, patch

import pytest


@pytest.fixture(autouse=True)
def _patch_env(monkeypatch):
    monkeypatch.setenv("DYNAMODB_TABLE", "test-table")
    monkeypatch.setenv("S3_BUCKET", "test-bucket")
    monkeypatch.setenv("PRESIGNED_URL_EXPIRY", "3600")


@pytest.fixture()
def handler_module(_patch_env):
    import importlib
    import handler as mod
    importlib.reload(mod)
    return mod


def _api_event(event_id: str) -> dict:
    return {"pathParameters": {"event_id": event_id}}


class TestReviewApi:
    @pytest.fixture(autouse=True)
    def _mock_aws(self, handler_module):
        self.handler = handler_module
        self.mock_table = MagicMock()
        self.mock_s3 = MagicMock()
        handler_module.table = self.mock_table
        handler_module.s3_client = self.mock_s3
        self.mock_s3.generate_presigned_url.return_value = "https://signed.url/img.jpg"

    def test_returns_frames_with_composite_key(self):
        self.mock_table.query.return_value = {
            "Items": [
                {
                    "event_id": "evt-1",
                    "camera_frame": "cam_061#frame_0000",
                    "camera_id": "cam_061",
                    "frame": "frame_0000",
                    "image_path": "scans/X/evt-1/cam_061/frame_0000.jpg",
                    "damage_detected": True,
                    "damage_type": "dent",
                    "confidence_score": "0.9",
                    "bounding_boxes": "[]",
                    "timestamp": "2026-03-26T12:00:00Z",
                },
                {
                    "event_id": "evt-1",
                    "camera_frame": "cam_061#frame_0001",
                    "camera_id": "cam_061",
                    "frame": "frame_0001",
                    "image_path": "scans/X/evt-1/cam_061/frame_0001.jpg",
                    "damage_detected": False,
                    "damage_type": "none",
                    "confidence_score": "0.1",
                    "bounding_boxes": "[]",
                    "timestamp": "2026-03-26T12:00:01Z",
                },
            ]
        }

        resp = self.handler.lambda_handler(_api_event("evt-1"), None)
        assert resp["statusCode"] == 200
        body = json.loads(resp["body"])

        assert body["event_id"] == "evt-1"
        assert body["total_frames"] == 2
        assert body["total_cameras"] == 1
        assert body["any_damage"] is True
        assert len(body["frames"]) == 2
        assert body["frames"][0]["camera_id"] == "cam_061"
        assert body["frames"][0]["frame"] == "frame_0000"

    def test_multiple_cameras(self):
        self.mock_table.query.return_value = {
            "Items": [
                {
                    "event_id": "evt-2",
                    "camera_frame": "cam_061#frame_0000",
                    "camera_id": "cam_061",
                    "frame": "frame_0000",
                    "image_path": "img1.jpg",
                    "damage_detected": False,
                    "damage_type": "none",
                    "confidence_score": "0.1",
                    "bounding_boxes": "[]",
                    "timestamp": "2026-03-26T12:00:00Z",
                },
                {
                    "event_id": "evt-2",
                    "camera_frame": "cam_062#frame_0000",
                    "camera_id": "cam_062",
                    "frame": "frame_0000",
                    "image_path": "img2.jpg",
                    "damage_detected": True,
                    "damage_type": "scratch",
                    "confidence_score": "0.8",
                    "bounding_boxes": "[]",
                    "timestamp": "2026-03-26T12:00:01Z",
                },
            ]
        }

        resp = self.handler.lambda_handler(_api_event("evt-2"), None)
        body = json.loads(resp["body"])

        assert body["total_cameras"] == 2
        assert body["total_frames"] == 2
        assert body["any_damage"] is True

    def test_event_not_found(self):
        self.mock_table.query.return_value = {"Items": []}
        resp = self.handler.lambda_handler(_api_event("missing"), None)
        assert resp["statusCode"] == 404

    def test_missing_event_id(self):
        resp = self.handler.lambda_handler({"pathParameters": {}}, None)
        assert resp["statusCode"] == 400

    def test_dynamodb_failure(self):
        self.mock_table.query.side_effect = Exception("connection error")
        resp = self.handler.lambda_handler(_api_event("evt-3"), None)
        assert resp["statusCode"] == 500

    def test_fallback_camera_id_from_composite_key(self):
        """If camera_id attribute is missing, extract from camera_frame."""
        self.mock_table.query.return_value = {
            "Items": [
                {
                    "event_id": "evt-4",
                    "camera_frame": "cam_063#frame_0000",
                    "image_path": "img.jpg",
                    "damage_detected": False,
                    "damage_type": "none",
                    "confidence_score": "0.1",
                    "bounding_boxes": "[]",
                    "timestamp": "2026-03-26T12:00:00Z",
                },
            ]
        }

        resp = self.handler.lambda_handler(_api_event("evt-4"), None)
        body = json.loads(resp["body"])
        assert body["frames"][0]["camera_id"] == "cam_063"
        assert body["frames"][0]["frame"] == "frame_0000"
