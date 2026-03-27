"""
Centralized configuration for the Pi edge layer.
All values are sourced from environment variables with sensible defaults.
"""

from __future__ import annotations

import json
import logging
import os
import re
from pathlib import Path

logger = logging.getLogger(__name__)

AWS_REGION: str = os.environ.get("AWS_REGION", "us-east-1")
# CDK creates the bucket as "tunnel-images-{ACCOUNT_ID}"; set via env var.
S3_BUCKET: str = os.environ.get("S3_BUCKET", "tunnel-images")

LOCAL_STORAGE_PATH: Path = Path(
    os.environ.get("LOCAL_STORAGE_PATH", "/data/tunnel/images")
)
UPLOAD_QUEUE_DB: Path = Path(
    os.environ.get("UPLOAD_QUEUE_DB", "/data/tunnel/queue.db")
)

MAX_LOCAL_STORAGE_MB: int = int(os.environ.get("MAX_LOCAL_STORAGE_MB", "5000"))

IMAGE_MAX_DIMENSION: int = int(os.environ.get("IMAGE_MAX_DIMENSION", "1920"))
IMAGE_JPEG_QUALITY: int = int(os.environ.get("IMAGE_JPEG_QUALITY", "85"))

CAPTURE_TIMEOUT_S: float = float(os.environ.get("CAPTURE_TIMEOUT_S", "5.0"))

UPLOAD_TIMEOUT_S: float = float(os.environ.get("UPLOAD_TIMEOUT_S", "10.0"))
UPLOAD_WORKER_INTERVAL_S: float = float(
    os.environ.get("UPLOAD_WORKER_INTERVAL_S", "10.0")
)
UPLOAD_WORKER_BACKOFF_MAX_S: float = float(
    os.environ.get("UPLOAD_WORKER_BACKOFF_MAX_S", "300.0")
)
UPLOAD_MAX_RETRIES: int = int(os.environ.get("UPLOAD_MAX_RETRIES", "5"))

# Refuse new enqueues when pending rows >= this (backpressure / disk safety).
UPLOAD_QUEUE_MAX_PENDING: int = int(
    os.environ.get("UPLOAD_QUEUE_MAX_PENDING", "2000")
)

SERVER_HOST: str = os.environ.get("SERVER_HOST", "0.0.0.0")
SERVER_PORT: int = int(os.environ.get("SERVER_PORT", "8000"))

LOG_LEVEL: str = os.environ.get("LOG_LEVEL", "INFO")

# License plate segment for S3 keys (scans/{plate}/...). OCR optional; see s3_uploader.
TUNNEL_LICENSE_PLATE: str = os.environ.get("TUNNEL_LICENSE_PLATE", "").strip()
PI_PLATE_OCR: bool = os.environ.get("PI_PLATE_OCR", "").lower() in (
    "1",
    "true",
    "yes",
)

# ---------------------------------------------------------------------------
# Network (RTSP) camera settings
# ---------------------------------------------------------------------------

CAMERA_USER: str = os.environ.get("CAMERA_USER", "")
CAMERA_PASS: str = os.environ.get("CAMERA_PASS", "")

RTSP_TRANSPORT: str = os.environ.get("RTSP_TRANSPORT", "tcp")

CAMERA_TIMEOUT_MS: int = int(os.environ.get("CAMERA_TIMEOUT_MS", "5000"))

# JSON array of camera definitions, either inline or a path to a .json file.
# Each entry: {"id": "cam_062", "url": "rtsp://...", "name": "Tunnel Cam 062"}
# The url may contain ${CAMERA_USER} and ${CAMERA_PASS} placeholders.
_CAMERAS_JSON_RAW: str = os.environ.get("CAMERAS_JSON", "")


def _interpolate_credentials(url: str) -> str:
    """Replace ${CAMERA_USER} and ${CAMERA_PASS} placeholders in a URL."""
    url = url.replace("${CAMERA_USER}", CAMERA_USER)
    url = url.replace("${CAMERA_PASS}", CAMERA_PASS)
    return url


def _redact_url(url: str) -> str:
    """Return RTSP URL with password replaced by '***' for safe logging."""
    return re.sub(r"(://[^:]+:)[^@]+(@)", r"\1***\2", url)


def load_cameras_json() -> list[dict]:
    """
    Parse CAMERAS_JSON into a list of camera dicts.

    Accepts either a raw JSON array string or a filesystem path to a .json file.
    Returns an empty list when the variable is unset.
    """
    raw = _CAMERAS_JSON_RAW.strip()
    if not raw:
        return []

    text = raw
    if not raw.startswith("["):
        path = Path(raw)
        if not path.is_file():
            logger.warning("CAMERAS_JSON path does not exist: %s", path)
            return []
        text = path.read_text()

    try:
        cameras = json.loads(text)
    except json.JSONDecodeError as exc:
        logger.error("Failed to parse CAMERAS_JSON: %s", exc)
        return []

    if not isinstance(cameras, list):
        logger.error("CAMERAS_JSON must be a JSON array, got %s", type(cameras).__name__)
        return []

    result = []
    for entry in cameras:
        if not isinstance(entry, dict) or "url" not in entry:
            logger.warning("Skipping malformed camera entry: %s", entry)
            continue
        entry["url"] = _interpolate_credentials(entry["url"])
        result.append(entry)

    return result
