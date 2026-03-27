"""
DamageDetection Lambda handler.

Triggered by S3 ObjectCreated events under the ``scans/`` prefix.
Reads the image, sends it to a SageMaker endpoint for inference,
and writes structured results to DynamoDB.

Expected S3 key format:
    scans/{license_plate}/{event_id}/{camera_id}/frame_NNNN.jpg
"""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone

import boto3

logger = logging.getLogger()
logger.setLevel(logging.INFO)

SAGEMAKER_ENDPOINT = os.environ["SAGEMAKER_ENDPOINT"]
DYNAMODB_TABLE = os.environ["DYNAMODB_TABLE"]
CONFIDENCE_THRESHOLD = float(os.environ.get("CONFIDENCE_THRESHOLD", "0.6"))

s3 = boto3.client("s3")
sagemaker_runtime = boto3.client("sagemaker-runtime")
dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(DYNAMODB_TABLE)


def lambda_handler(event: dict, context) -> dict:
    """Process S3 ObjectCreated events through the damage detection model."""
    for record in event.get("Records", []):
        bucket = record["s3"]["bucket"]["name"]
        key = record["s3"]["object"]["key"]

        if not key.endswith(".jpg"):
            continue

        logger.info("Processing s3://%s/%s", bucket, key)
        parsed = _parse_s3_key(key)
        if parsed is None:
            continue

        image_bytes = _read_image(bucket, key)
        if image_bytes is None:
            continue

        prediction = _invoke_model(image_bytes)
        if prediction is None:
            continue

        _store_result(parsed, key, prediction)

    return {"statusCode": 200}


def _parse_s3_key(key: str) -> dict | None:
    """
    Parse the S3 key into components.

    Supports both formats:
        New: scans/{plate}/{event_id}/{camera_id}/frame_NNNN.jpg
        Old: {event_id}/{camera_id}.jpg
    """
    parts = key.split("/")

    if parts[0] == "scans" and len(parts) >= 5:
        return {
            "license_plate": parts[1],
            "event_id": parts[2],
            "camera_id": parts[3],
            "frame": parts[4].replace(".jpg", ""),
        }

    if len(parts) == 2:
        return {
            "license_plate": "",
            "event_id": parts[0],
            "camera_id": parts[1].replace(".jpg", ""),
            "frame": "frame_0000",
        }

    logger.error("Unexpected S3 key format: %s", key)
    return None


def _read_image(bucket: str, key: str) -> bytes | None:
    try:
        resp = s3.get_object(Bucket=bucket, Key=key)
        return resp["Body"].read()
    except Exception:
        logger.exception("Failed to read s3://%s/%s", bucket, key)
        return None


def _invoke_model(image_bytes: bytes) -> dict | None:
    """Send image to SageMaker endpoint and parse the response."""
    try:
        resp = sagemaker_runtime.invoke_endpoint(
            EndpointName=SAGEMAKER_ENDPOINT,
            ContentType="image/jpeg",
            Body=image_bytes,
        )
        body = json.loads(resp["Body"].read().decode("utf-8"))
        logger.info("Model response: %s", json.dumps(body)[:500])
        return body
    except Exception:
        logger.exception("SageMaker invocation failed")
        return None


def _store_result(parsed: dict, image_path: str, prediction: dict) -> None:
    """Write the structured detection result to DynamoDB.

    The sort key is ``camera_frame`` — a composite of camera_id and frame
    (e.g. ``cam_061#frame_0002``).  This prevents multi-frame bursts from
    overwriting each other while still allowing efficient queries by event.
    """
    confidence = prediction.get("confidence", 0)
    damage_detected = confidence >= CONFIDENCE_THRESHOLD
    camera_id = parsed["camera_id"]
    frame = parsed.get("frame", "frame_0000")

    item = {
        "event_id": parsed["event_id"],
        "camera_frame": f"{camera_id}#{frame}",
        "camera_id": camera_id,
        "frame": frame,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "image_path": image_path,
        "license_plate": parsed.get("license_plate", ""),
        "damage_detected": damage_detected,
        "damage_type": prediction.get("damage_type", "unknown"),
        "confidence_score": str(confidence),
        "bounding_boxes": json.dumps(prediction.get("bounding_boxes", [])),
        "raw_prediction": json.dumps(prediction),
    }

    try:
        table.put_item(Item=item)
        logger.info(
            "Stored: %s/%s#%s damage=%s conf=%s plate=%s",
            parsed["event_id"], camera_id,
            frame, damage_detected,
            item["confidence_score"], parsed.get("license_plate"),
        )
    except Exception:
        logger.exception("Failed to write to DynamoDB")
