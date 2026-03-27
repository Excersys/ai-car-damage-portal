"""
Shared S3 key layout for tunnel scans.

Both the Pi trigger path and the RTSP detect_daemon + scan_uploader path must
emit keys the damage-detection Lambda understands:

    scans/{license_plate}/{event_id}/{camera_id}/frame_NNNN.jpg

See lambdas/damage_detection/handler.py::_parse_s3_key.
"""

from __future__ import annotations

import re

# Safe path segment: alphanumerics only, bounded length (S3 key sanity).
_MAX_PLATE_LEN = 32
_PLATE_CLEAN = re.compile(r"[^A-Z0-9]+")


def normalize_plate_segment(raw: str | None) -> str:
    """
    Normalize a plate (or default) for use as a single S3 path segment.

    Empty or invalid input becomes ``unknown`` so legacy keys stay consistent.
    """
    if not raw or not str(raw).strip():
        return "unknown"
    cleaned = _PLATE_CLEAN.sub("", str(raw).upper())
    if not cleaned:
        return "unknown"
    return cleaned[:_MAX_PLATE_LEN]


def scan_frame_key(
    license_plate: str | None,
    event_id: str,
    camera_id: str,
    frame_index: int,
) -> str:
    """Full S3 object key for one JPEG frame."""
    plate = normalize_plate_segment(license_plate)
    return f"scans/{plate}/{event_id}/{camera_id}/frame_{frame_index:04d}.jpg"


def scan_prefix(license_plate: str | None, event_id: str) -> str:
    """Directory-style prefix (no trailing slash) for a scan event."""
    plate = normalize_plate_segment(license_plate)
    return f"scans/{plate}/{event_id}"
