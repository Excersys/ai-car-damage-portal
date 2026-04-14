"""
ReviewAPI Lambda handler.
Handles GET /tunnel/events (list), GET /tunnel/events/{event_id} (detail),
and POST /tunnel/events/{event_id}/qc (QC decision).
Queries DynamoDB and returns presigned S3 URLs for images.
"""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from typing import Any

import boto3
from boto3.dynamodb.conditions import Key

from aggregation import QC_SORT_KEY, aggregate_event_summaries
from contracts import ContractError, validate_qc_post_request

logger = logging.getLogger()
logger.setLevel(logging.INFO)

DYNAMODB_TABLE = os.environ["DYNAMODB_TABLE"]
S3_BUCKET = os.environ["S3_BUCKET"]
PRESIGNED_URL_EXPIRY = int(os.environ.get("PRESIGNED_URL_EXPIRY", "3600"))
LIST_SCAN_ITEM_LIMIT = int(os.environ.get("LIST_SCAN_ITEM_LIMIT", "2000"))
LIST_MAX_EVENTS = int(os.environ.get("LIST_MAX_EVENTS", "25"))

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(DYNAMODB_TABLE)
s3_client = boto3.client("s3")


def lambda_handler(event: dict, context) -> dict:
    """API Gateway proxy handler for event list, detail, and QC POST."""
    method = (
        event.get("httpMethod")
        or event.get("requestContext", {}).get("http", {}).get("method")
        or "GET"
    ).upper()

    if method == "OPTIONS":
        return _response(200, {})

    resource = event.get("resource") or ""
    path = (event.get("path") or "").rstrip("/")

    if method == "POST" and (resource.endswith("/qc") or path.endswith("/qc")):
        return _post_qc(event)

    path_params = event.get("pathParameters") or {}
    event_id = path_params.get("event_id")

    if event_id:
        return _get_event_detail(event_id)

    return _list_events()


def _list_events() -> dict:
    """GET /tunnel/events — scan recent rows and return distinct events, newest first."""
    items: list[dict[str, Any]] = []
    scan_kwargs: dict[str, Any] = {"Limit": min(LIST_SCAN_ITEM_LIMIT, 1000)}
    try:
        response = table.scan(**scan_kwargs)
        items.extend(response.get("Items", []))
        while "LastEvaluatedKey" in response and len(items) < LIST_SCAN_ITEM_LIMIT:
            response = table.scan(
                ExclusiveStartKey=response["LastEvaluatedKey"],
                Limit=min(LIST_SCAN_ITEM_LIMIT - len(items), 1000),
            )
            items.extend(response.get("Items", []))
    except Exception:
        logger.exception("DynamoDB scan failed")
        return _response(500, {"error": "Internal server error"})

    summaries = aggregate_event_summaries(items)
    summaries.sort(key=lambda s: s["_sort_ts"], reverse=True)
    summaries = summaries[:LIST_MAX_EVENTS]

    for s in summaries:
        s["preview_image_url"] = _presigned_url(s.pop("_preview_key", ""))
        del s["_sort_ts"]

    return _response(200, {"events": summaries, "count": len(summaries)})


def _get_event_detail(event_id: str) -> dict:
    """GET /tunnel/events/{event_id} — all cameras for one event plus optional QC row."""
    logger.info("Fetching results for event_id=%s", event_id)

    try:
        result = table.query(KeyConditionExpression=Key("event_id").eq(event_id))
    except Exception:
        logger.exception("DynamoDB query failed")
        return _response(500, {"error": "Internal server error"})

    items = result.get("Items", [])
    if not items:
        return _response(404, {"error": f"Event {event_id} not found"})

    qc_row: dict[str, Any] | None = None
    camera_items: list[dict[str, Any]] = []
    for item in items:
        if item.get("camera_frame") == QC_SORT_KEY:
            qc_row = item
        else:
            camera_items.append(item)

    if not camera_items:
        return _response(404, {"error": f"Event {event_id} not found"})

    cameras = []
    for item in camera_items:
        image_url = _presigned_url(item.get("image_path", ""))
        cameras.append({
            "camera_id": item["camera_id"],
            "camera_frame": item.get("camera_frame", ""),
            "frame": item.get("frame", ""),
            "image_url": image_url,
            "damage_detected": item.get("damage_detected", False),
            "damage_type": item.get("damage_type", "unknown"),
            "confidence_score": float(item.get("confidence_score", 0)),
            "bounding_boxes": json.loads(item.get("bounding_boxes", "[]")),
            "timestamp": item.get("timestamp", ""),
        })

    qc_out: dict[str, Any] | None
    if qc_row:
        qc_out = {
            "status": qc_row.get("qc_status", "pending"),
            "notes": qc_row.get("qc_notes", "") or "",
            "reviewer_id": qc_row.get("reviewer_id", "") or "",
            "updated_at": qc_row.get("qc_updated_at", "") or "",
        }
    else:
        qc_out = None

    body = {
        "event_id": event_id,
        "cameras": cameras,
        "total_cameras": len(cameras),
        "any_damage": any(c["damage_detected"] for c in cameras),
        "qc": qc_out,
    }

    return _response(200, body)


def _post_qc(event: dict) -> dict:
    """POST /tunnel/events/{event_id}/qc — upsert QC metadata for an event."""
    params = event.get("pathParameters") or {}
    event_id = params.get("event_id")
    if not event_id:
        return _response(400, {"error": "missing event_id"})

    raw = event.get("body") or "{}"
    try:
        body = json.loads(raw) if isinstance(raw, str) else raw
    except json.JSONDecodeError:
        return _response(400, {"error": "invalid JSON"})

    if not isinstance(body, dict):
        return _response(400, {"error": "body must be a JSON object"})

    try:
        validate_qc_post_request(body)
    except ContractError as err:
        return _response(400, {"error": str(err)})

    status = body["status"]
    notes = body.get("notes", "")
    if not isinstance(notes, str):
        notes = str(notes)
    reviewer_id = body.get("reviewer_id", "")
    if not isinstance(reviewer_id, str):
        reviewer_id = str(reviewer_id)

    now = datetime.now(timezone.utc).isoformat()

    item = {
        "event_id": event_id,
        "camera_frame": QC_SORT_KEY,
        "qc_status": status,
        "qc_notes": notes,
        "reviewer_id": reviewer_id,
        "qc_updated_at": now,
    }

    try:
        table.put_item(Item=item)
    except Exception:
        logger.exception("QC put_item failed")
        return _response(500, {"error": "Internal server error"})

    return _response(
        200,
        {
            "event_id": event_id,
            "qc": {
                "status": status,
                "notes": notes,
                "reviewer_id": reviewer_id,
                "updated_at": now,
            },
        },
    )


def _presigned_url(s3_key: str) -> str:
    """Generate a presigned GET URL for an S3 object."""
    if not s3_key:
        return ""
    try:
        return s3_client.generate_presigned_url(
            "get_object",
            Params={"Bucket": S3_BUCKET, "Key": s3_key},
            ExpiresIn=PRESIGNED_URL_EXPIRY,
        )
    except Exception:
        logger.exception("Failed to generate presigned URL for %s", s3_key)
        return ""


def _response(status_code: int, body: dict) -> dict:
    """Build an API Gateway proxy response."""
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps(body),
    }
