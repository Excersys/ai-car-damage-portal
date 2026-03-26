"""
ReviewAPI Lambda handler.
Handles GET /tunnel/events/{event_id} from API Gateway.
Queries DynamoDB for all camera results and returns presigned S3 URLs.
"""

from __future__ import annotations

import json
import logging
import os

import boto3
from boto3.dynamodb.conditions import Key

logger = logging.getLogger()
logger.setLevel(logging.INFO)

DYNAMODB_TABLE = os.environ["DYNAMODB_TABLE"]
S3_BUCKET = os.environ["S3_BUCKET"]
PRESIGNED_URL_EXPIRY = int(os.environ.get("PRESIGNED_URL_EXPIRY", "3600"))

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(DYNAMODB_TABLE)
s3_client = boto3.client("s3")


def lambda_handler(event: dict, context) -> dict:
    """API Gateway proxy handler for event review."""
    event_id = event.get("pathParameters", {}).get("event_id")

    if not event_id:
        return _response(400, {"error": "event_id is required"})

    logger.info("Fetching results for event_id=%s", event_id)

    try:
        result = table.query(KeyConditionExpression=Key("event_id").eq(event_id))
    except Exception:
        logger.exception("DynamoDB query failed")
        return _response(500, {"error": "Internal server error"})

    items = result.get("Items", [])
    if not items:
        return _response(404, {"error": f"Event {event_id} not found"})

    cameras = []
    for item in items:
        image_url = _presigned_url(item.get("image_path", ""))
        cameras.append({
            "camera_id": item["camera_id"],
            "image_url": image_url,
            "damage_detected": item.get("damage_detected", False),
            "damage_type": item.get("damage_type", "unknown"),
            "confidence_score": float(item.get("confidence_score", 0)),
            "bounding_boxes": json.loads(item.get("bounding_boxes", "[]")),
            "timestamp": item.get("timestamp", ""),
        })

    body = {
        "event_id": event_id,
        "cameras": cameras,
        "total_cameras": len(cameras),
        "any_damage": any(c["damage_detected"] for c in cameras),
    }

    return _response(200, body)


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
