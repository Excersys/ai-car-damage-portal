"""Unit tests for JSON contract validators."""

import pytest

from contracts import (
    ContractError,
    validate_event_detail_response,
    validate_event_list_response,
    validate_stored_damage_row,
)


def test_validate_list_accepts_valid_payload():
    body = {
        "events": [
            {
                "event_id": "e1",
                "last_timestamp": "2026-01-01T00:00:00Z",
                "license_plate": "ABC",
                "any_damage": False,
                "camera_count": 2,
                "preview_image_url": "https://example.com/p",
            }
        ],
        "count": 1,
    }
    validate_event_list_response(body)


def test_validate_list_rejects_count_mismatch():
    body = {"events": [], "count": 1}
    with pytest.raises(ContractError, match="count"):
        validate_event_list_response(body)


def test_validate_list_allows_extra_keys_on_event():
    body = {
        "events": [
            {
                "event_id": "e1",
                "last_timestamp": "t",
                "license_plate": "",
                "any_damage": True,
                "camera_count": 1,
                "preview_image_url": "",
                "future_field": 1,
            }
        ],
        "count": 1,
    }
    validate_event_list_response(body)


def test_validate_detail_accepts_valid_payload():
    body = {
        "event_id": "e1",
        "total_cameras": 1,
        "any_damage": False,
        "cameras": [
            {
                "camera_id": "c0",
                "camera_frame": "c0#f1",
                "frame": "f1",
                "image_url": "https://x",
                "damage_detected": False,
                "damage_type": "none",
                "confidence_score": 0.1,
                "bounding_boxes": [],
                "timestamp": "2026-01-01T00:00:00Z",
            }
        ],
    }
    validate_event_detail_response(body)


def test_validate_detail_rejects_wrong_total():
    cam = {
        "camera_id": "c0",
        "camera_frame": "c0#f1",
        "frame": "f1",
        "image_url": "",
        "damage_detected": False,
        "damage_type": "none",
        "confidence_score": 0.0,
        "bounding_boxes": [],
        "timestamp": "t",
    }
    body = {
        "event_id": "e1",
        "total_cameras": 2,
        "any_damage": False,
        "cameras": [cam],
    }
    with pytest.raises(ContractError, match="total_cameras"):
        validate_event_detail_response(body)


def test_validate_stored_row():
    validate_stored_damage_row(
        {
            "event_id": "e",
            "camera_frame": "a#b",
            "camera_id": "a",
            "timestamp": "t",
            "image_path": "k",
            "license_plate": "",
            "frame": "b",
            "damage_detected": False,
            "damage_type": "unknown",
            "confidence_score": "0.5",
            "bounding_boxes": "[]",
        }
    )
