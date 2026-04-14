"""
DamageDetection Lambda handler.

Triggered by S3 ObjectCreated events under the ``scans/`` prefix.
Reads the image, runs inference (SageMaker endpoint, local ONNX, or stub),
and writes structured results to DynamoDB.

Expected S3 key format:
    scans/{license_plate}/{event_id}/{camera_id}/frame_NNNN.jpg

Environment:
    INFERENCE_MODE: ``sagemaker`` | ``onnx`` | ``stub`` (default: ``sagemaker``).
    SAGEMAKER_ENDPOINT: required when INFERENCE_MODE=sagemaker.
    ONNX_MODEL_PATH: path to .onnx file when INFERENCE_MODE=onnx.
    ONNX_CLASS_NAMES: optional comma-separated labels for classification head.
"""

from __future__ import annotations

import io
import json
import logging
import os
from datetime import datetime, timezone

import boto3

logger = logging.getLogger()
logger.setLevel(logging.INFO)

INFERENCE_MODE = os.environ.get("INFERENCE_MODE", "sagemaker").lower().strip()
SAGEMAKER_ENDPOINT = os.environ.get("SAGEMAKER_ENDPOINT", "")
DYNAMODB_TABLE = os.environ["DYNAMODB_TABLE"]
CONFIDENCE_THRESHOLD = float(os.environ.get("CONFIDENCE_THRESHOLD", "0.6"))
ONNX_MODEL_PATH = os.environ.get("ONNX_MODEL_PATH", "/var/task/model.onnx")
ONNX_CLASS_NAMES = os.environ.get(
    "ONNX_CLASS_NAMES", "none,scratch,dent,bent"
)

s3 = boto3.client("s3")
sagemaker_runtime = boto3.client("sagemaker-runtime")
dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(DYNAMODB_TABLE)

_onnx_session = None


def _extract_s3_items(event: dict) -> list[tuple[str, str]]:
    """Extract (bucket, key) pairs from S3 direct or EventBridge events."""
    # Direct S3 notification: {"Records": [{"s3": {"bucket": ..., "object": ...}}]}
    if "Records" in event:
        return [
            (r["s3"]["bucket"]["name"], r["s3"]["object"]["key"])
            for r in event["Records"]
        ]
    # EventBridge: {"detail": {"bucket": {"name": ...}, "object": {"key": ...}}}
    if "detail" in event:
        detail = event["detail"]
        bucket = detail.get("bucket", {}).get("name", "")
        key = detail.get("object", {}).get("key", "")
        if bucket and key:
            return [(bucket, key)]
    logger.warning("Unrecognized event format: %s", list(event.keys()))
    return []


def lambda_handler(event: dict, context) -> dict:
    """Process S3 ObjectCreated events through the damage detection model."""
    items = _extract_s3_items(event)
    if not items:
        logger.warning("No S3 items extracted from event")
        return {"statusCode": 200}

    for bucket, key in items:
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
    """Dispatch to SageMaker, ONNX, or stub inference."""
    mode = INFERENCE_MODE
    if mode == "sagemaker":
        return _invoke_sagemaker(image_bytes)
    if mode == "onnx":
        return _invoke_onnx(image_bytes)
    if mode == "stub":
        return _invoke_stub(image_bytes)
    logger.error("Unknown INFERENCE_MODE: %s", mode)
    return None


def _invoke_sagemaker(image_bytes: bytes) -> dict | None:
    """Send image to SageMaker endpoint and parse the JSON response."""
    if not SAGEMAKER_ENDPOINT:
        logger.error("SAGEMAKER_ENDPOINT is required when INFERENCE_MODE=sagemaker")
        return None
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


def _invoke_stub(image_bytes: bytes) -> dict:
    """Deterministic placeholder for tests and pipeline smoke checks (no ML)."""
    _ = image_bytes
    return {
        "confidence": 0.0,
        "damage_type": "none",
        "bounding_boxes": [],
    }


def _invoke_onnx(image_bytes: bytes) -> dict | None:
    """
    Run a bundled ONNX classification model (CPU).

    Expects a single vector output (logits); applies softmax and maps the
    winning class to ``damage_type``. For other output shapes, extend this
    function to match your export.
    """
    global _onnx_session
    try:
        import numpy as np
        from PIL import Image
        import onnxruntime as ort

        try:
            _resize_resample = Image.Resampling.BILINEAR
        except AttributeError:  # Pillow < 9
            _resize_resample = Image.BILINEAR
    except ImportError:
        logger.exception("onnx inference requires numpy, Pillow, and onnxruntime")
        return None

    path = ONNX_MODEL_PATH
    if not os.path.isfile(path):
        logger.error("ONNX model not found at %s", path)
        return None

    try:
        if _onnx_session is None:
            _onnx_session = ort.InferenceSession(
                path, providers=["CPUExecutionProvider"]
            )

        session = _onnx_session
        input_meta = session.get_inputs()[0]
        name = input_meta.name
        shape = input_meta.shape

        def _resolve_dim(d, fallback: int) -> int:
            if isinstance(d, int) and d > 0:
                return d
            return fallback

        # Assume NCHW if len(shape)==4
        if len(shape) == 4:
            _, c, h, w = shape
            h = _resolve_dim(h, 224)
            w = _resolve_dim(w, 224)
            img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            img = img.resize((w, h), _resize_resample)
            arr = np.asarray(img, dtype=np.float32) / 255.0
            arr = arr.transpose(2, 0, 1)[np.newaxis, ...]
        else:
            # Flattened or other: best-effort 224 square RGB
            h = w = 224
            img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            img = img.resize((w, h), _resize_resample)
            arr = np.asarray(img, dtype=np.float32).reshape(1, -1)

        outputs = session.run(None, {name: arr})
        out = np.asarray(outputs[0], dtype=np.float32).reshape(-1)

        if out.size == 0:
            logger.error("ONNX model returned empty output")
            return None

        if out.size == 1:
            conf = float(np.clip(out[0], 0.0, 1.0))
            return {
                "confidence": conf,
                "damage_type": "unknown",
                "bounding_boxes": [],
            }

        exp = np.exp(out - np.max(out))
        probs = exp / np.sum(exp)
        idx = int(np.argmax(probs))
        conf = float(probs[idx])
        labels = [x.strip() for x in ONNX_CLASS_NAMES.split(",") if x.strip()]
        damage_type = labels[idx] if idx < len(labels) else "unknown"
        result = {
            "confidence": conf,
            "damage_type": damage_type,
            "bounding_boxes": [],
        }
        logger.info("ONNX result: %s", json.dumps(result))
        return result
    except Exception:
        logger.exception("ONNX inference failed")
        return None


def _camera_frame_key(camera_id: str, frame_stem: str) -> str:
    """DynamoDB sort key: unique per camera + frame (multi-frame bursts)."""
    return f"{camera_id}#{frame_stem}"


def _store_result(parsed: dict, image_path: str, prediction: dict) -> None:
    """Write the structured detection result to DynamoDB."""
    confidence = prediction.get("confidence", 0)
    damage_detected = confidence >= CONFIDENCE_THRESHOLD
    cam = parsed["camera_id"]
    frame_stem = parsed.get("frame", "frame_0000")
    camera_frame = _camera_frame_key(cam, frame_stem)

    item = {
        "event_id": parsed["event_id"],
        "camera_frame": camera_frame,
        "camera_id": cam,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "image_path": image_path,
        "license_plate": parsed.get("license_plate", ""),
        "frame": frame_stem,
        "damage_detected": damage_detected,
        "damage_type": prediction.get("damage_type", "unknown"),
        "confidence_score": str(confidence),
        "bounding_boxes": json.dumps(prediction.get("bounding_boxes", [])),
        "raw_prediction": json.dumps(prediction),
    }

    try:
        table.put_item(Item=item)
        logger.info(
            "Stored: %s/%s frame=%s damage=%s conf=%s plate=%s",
            parsed["event_id"], camera_frame,
            frame_stem, damage_detected,
            item["confidence_score"], parsed.get("license_plate"),
        )
    except Exception:
        logger.exception("Failed to write to DynamoDB")
