"""Tests for shared S3 path helpers."""

from common.s3_paths import normalize_plate_segment, scan_frame_key, scan_prefix


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
