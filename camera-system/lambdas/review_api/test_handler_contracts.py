"""
Contract tests: mocked AWS, real handler, assert JSON matches published shapes.
"""

import json
import os
from unittest.mock import MagicMock, patch

import pytest

from contracts import (
    validate_event_detail_response,
    validate_event_list_response,
    validate_qc_post_request,
)


@pytest.fixture
def env_vars():
    return {
        "DYNAMODB_TABLE": "tunnel_damage_events",
        "S3_BUCKET": "tunnel-images-test",
        "PRESIGNED_URL_EXPIRY": "3600",
    }


def _reload_handler(env_vars: dict):
    with patch.dict(os.environ, env_vars, clear=False):
        import importlib

        import handler

        importlib.reload(handler)
        return handler


def test_list_events_response_matches_contract(env_vars):
    items = [
        {
            "event_id": "evt1",
            "camera_id": "cam_a",
            "timestamp": "2026-04-10T12:00:00+00:00",
            "license_plate": "PLT1",
            "damage_detected": False,
            "image_path": "scans/PLT1/evt1/cam_a/frame_0001.jpg",
        },
        {
            "event_id": "evt1",
            "camera_id": "cam_b",
            "timestamp": "2026-04-10T12:05:00+00:00",
            "license_plate": "PLT1",
            "damage_detected": True,
            "image_path": "scans/PLT1/evt1/cam_b/frame_0001.jpg",
        },
    ]
    mock_table = MagicMock()
    mock_table.scan.return_value = {"Items": items}

    mock_s3 = MagicMock()
    mock_s3.generate_presigned_url.return_value = "https://bucket.s3.amazonaws.com/presigned"

    with patch.dict(os.environ, env_vars, clear=False):
        with patch("boto3.resource") as mock_resource:
            mock_resource.return_value.Table.return_value = mock_table
            with patch("boto3.client", return_value=mock_s3):
                handler = _reload_handler(env_vars)

                event = {"pathParameters": None, "httpMethod": "GET"}
                resp = handler.lambda_handler(event, None)

    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    validate_event_list_response(body)
    assert body["count"] == 1
    assert body["events"][0]["event_id"] == "evt1"
    assert body["events"][0]["any_damage"] is True
    assert body["events"][0]["camera_count"] == 2
    assert body["events"][0]["qc_status"] == "pending"


def test_get_event_detail_response_matches_contract(env_vars):
    items = [
        {
            "event_id": "evt2",
            "camera_id": "rtsp_0",
            "camera_frame": "rtsp_0#frame_0001",
            "frame": "frame_0001",
            "timestamp": "2026-04-10T12:00:00Z",
            "image_path": "scans/X/evt2/rtsp_0/frame_0001.jpg",
            "license_plate": "ABC",
            "damage_detected": True,
            "damage_type": "dent",
            "confidence_score": "0.85",
            "bounding_boxes": "[]",
        },
    ]
    mock_table = MagicMock()
    mock_table.query.return_value = {"Items": items}

    mock_s3 = MagicMock()
    mock_s3.generate_presigned_url.return_value = "https://signed.example/img.jpg"

    with patch.dict(os.environ, env_vars, clear=False):
        with patch("boto3.resource") as mock_resource:
            mock_resource.return_value.Table.return_value = mock_table
            with patch("boto3.client", return_value=mock_s3):
                handler = _reload_handler(env_vars)

                event = {
                    "pathParameters": {"event_id": "evt2"},
                    "httpMethod": "GET",
                    "resource": "/tunnel/events/{event_id}",
                }
                resp = handler.lambda_handler(event, None)

    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    validate_event_detail_response(body)
    assert body["event_id"] == "evt2"
    assert body["any_damage"] is True
    assert body["cameras"][0]["confidence_score"] == 0.85
    assert body["cameras"][0]["bounding_boxes"] == []
    assert body["qc"] is None


def test_post_qc_persists_and_validates(env_vars):
    mock_table = MagicMock()
    mock_s3 = MagicMock()
    mock_s3.generate_presigned_url.return_value = "https://x"

    with patch.dict(os.environ, env_vars, clear=False):
        with patch("boto3.resource") as mock_resource:
            mock_resource.return_value.Table.return_value = mock_table
            with patch("boto3.client", return_value=mock_s3):
                handler = _reload_handler(env_vars)

                event = {
                    "pathParameters": {"event_id": "evt9"},
                    "httpMethod": "POST",
                    "resource": "/tunnel/events/{event_id}/qc",
                    "body": json.dumps(
                        {
                            "status": "approved",
                            "notes": "looks ok",
                            "reviewer_id": "agent-1",
                        }
                    ),
                }
                resp = handler.lambda_handler(event, None)

    assert resp["statusCode"] == 200
    out = json.loads(resp["body"])
    assert out["event_id"] == "evt9"
    assert out["qc"]["status"] == "approved"
    validate_qc_post_request(
        {
            "status": "approved",
            "notes": "looks ok",
            "reviewer_id": "agent-1",
        }
    )
    mock_table.put_item.assert_called_once()
    put = mock_table.put_item.call_args[1]["Item"]
    assert put["event_id"] == "evt9"
    assert put["camera_frame"] == "__qc__"
    assert put["qc_status"] == "approved"
