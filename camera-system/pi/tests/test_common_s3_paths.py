"""Tests for shared S3 path helpers."""

from common.s3_paths import (
    CANONICAL_SCAN_ROOT,
    INFERENCE_S3_NOTIFICATION_PREFIX,
    normalize_plate_segment,
    scan_frame_key,
    scan_prefix,
)


def test_normalize_empty():
    assert normalize_plate_segment(None) == "unknown"
    assert normalize_plate_segment("") == "unknown"
    assert normalize_plate_segment("  ") == "unknown"


def test_normalize_alphanumeric():
    assert normalize_plate_segment("ab-1234") == "AB1234"


def test_scan_frame_key():
    key = scan_frame_key("ca·1234ab", "evt1", "cam_0", 3)
    assert key == "scans/CA1234AB/evt1/cam_0/frame_0003.jpg"


def test_scan_prefix():
    assert scan_prefix(None, "e1") == "scans/unknown/e1"


def test_frame_keys_match_inference_notification_prefix():
    """Lambda S3 trigger uses the same root as producers (ACR-129)."""
    assert INFERENCE_S3_NOTIFICATION_PREFIX == f"{CANONICAL_SCAN_ROOT}/"
    key = scan_frame_key("X", "ev", "cam", 0)
    assert key.startswith(INFERENCE_S3_NOTIFICATION_PREFIX)
