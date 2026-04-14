"""
Stable JSON shapes for the Review API and stored tunnel events.

Used by contract tests; callers can import these helpers to validate payloads
in integration tests without coupling to boto3.
"""

from __future__ import annotations

from typing import Any


class ContractError(ValueError):
    """Raised when a response body does not match the published API contract."""


def _require_present_keys(d: dict[str, Any], keys: set[str], *, label: str) -> None:
    """Ensure every key in ``keys`` exists; extra keys are allowed."""
    missing = keys - d.keys()
    if missing:
        raise ContractError(f"{label}: missing keys {sorted(missing)}")


def validate_event_list_response(body: dict[str, Any]) -> None:
    """
    Contract for GET /tunnel/events (200 JSON body after json.loads).

    Fields:
      events: list of summary objects
      count: int, length of events
    """
    if "events" not in body or "count" not in body:
        raise ContractError("list response must include 'events' and 'count'")
    if not isinstance(body["events"], list):
        raise ContractError("'events' must be a list")
    if not isinstance(body["count"], int):
        raise ContractError("'count' must be an int")
    if body["count"] != len(body["events"]):
        raise ContractError("'count' must equal len(events)")

    required_event = {
        "event_id",
        "last_timestamp",
        "license_plate",
        "any_damage",
        "camera_count",
        "preview_image_url",
    }
    for i, ev in enumerate(body["events"]):
        if not isinstance(ev, dict):
            raise ContractError(f"events[{i}] must be an object")
        _require_present_keys(ev, required_event, label=f"events[{i}]")
        if not isinstance(ev["event_id"], str):
            raise ContractError(f"events[{i}].event_id must be str")
        if not isinstance(ev["any_damage"], bool):
            raise ContractError(f"events[{i}].any_damage must be bool")
        if not isinstance(ev["camera_count"], int):
            raise ContractError(f"events[{i}].camera_count must be int")
        if not isinstance(ev["preview_image_url"], str):
            raise ContractError(f"events[{i}].preview_image_url must be str")


def validate_event_detail_response(body: dict[str, Any]) -> None:
    """
    Contract for GET /tunnel/events/{event_id} (200 JSON body).
    """
    required = {"event_id", "cameras", "total_cameras", "any_damage"}
    _require_present_keys(body, required, label="detail")

    if not isinstance(body["event_id"], str):
        raise ContractError("detail.event_id must be str")
    if not isinstance(body["cameras"], list):
        raise ContractError("detail.cameras must be a list")
    if not isinstance(body["total_cameras"], int):
        raise ContractError("detail.total_cameras must be int")
    if not isinstance(body["any_damage"], bool):
        raise ContractError("detail.any_damage must be bool")
    if body["total_cameras"] != len(body["cameras"]):
        raise ContractError("detail.total_cameras must equal len(cameras)")

    cam_keys = {
        "camera_id",
        "camera_frame",
        "frame",
        "image_url",
        "damage_detected",
        "damage_type",
        "confidence_score",
        "bounding_boxes",
        "timestamp",
    }
    for i, cam in enumerate(body["cameras"]):
        if not isinstance(cam, dict):
            raise ContractError(f"cameras[{i}] must be an object")
        _require_present_keys(cam, cam_keys, label=f"cameras[{i}]")
        if not isinstance(cam["damage_detected"], bool):
            raise ContractError(f"cameras[{i}].damage_detected must be bool")
        if not isinstance(cam["confidence_score"], (int, float)):
            raise ContractError(f"cameras[{i}].confidence_score must be numeric")
        if not isinstance(cam["bounding_boxes"], list):
            raise ContractError(f"cameras[{i}].bounding_boxes must be a list")


def validate_inference_response(body: dict[str, Any]) -> None:
    """
    Contract for the JSON body returned by the damage-detection model
    (SageMaker endpoint or Lambda-native ONNX).

    Required fields:
      confidence: float in [0, 1]
    Optional fields (handler uses defaults when absent):
      damage_type: str
      bounding_boxes: list of dicts with x, y, w, h
    """
    if not isinstance(body, dict):
        raise ContractError("inference response must be an object")
    if "confidence" not in body:
        raise ContractError("inference response must include 'confidence'")
    conf = body["confidence"]
    if not isinstance(conf, (int, float)):
        raise ContractError("inference confidence must be numeric")
    if not (0 <= conf <= 1):
        raise ContractError(f"inference confidence must be in [0, 1], got {conf}")
    if "damage_type" in body and not isinstance(body["damage_type"], str):
        raise ContractError("inference damage_type must be str when present")
    if "bounding_boxes" in body:
        bboxes = body["bounding_boxes"]
        if not isinstance(bboxes, list):
            raise ContractError("inference bounding_boxes must be a list")
        for i, box in enumerate(bboxes):
            if not isinstance(box, dict):
                raise ContractError(f"bounding_boxes[{i}] must be an object")


def validate_stored_damage_row(item: dict[str, Any]) -> None:
    """
    Contract for a DynamoDB item written by damage_detection Lambda
    (attribute names and coarse types after boto3 deserializer).
    """
    required = {
        "event_id",
        "camera_frame",
        "camera_id",
        "timestamp",
        "image_path",
        "license_plate",
        "frame",
        "damage_detected",
        "damage_type",
        "confidence_score",
        "bounding_boxes",
    }
    _require_present_keys(item, required, label="stored row")
    if not isinstance(item["damage_detected"], bool):
        raise ContractError("stored row damage_detected must be bool")
    if not isinstance(item["bounding_boxes"], str):
        raise ContractError("stored row bounding_boxes must be JSON string")
