"""Unit tests for review_api aggregation logic."""

from aggregation import aggregate_event_summaries


def test_aggregate_groups_by_event_and_picks_latest_timestamp():
    items = [
        {
            "event_id": "e1",
            "camera_id": "cam-a",
            "timestamp": "2026-04-01T10:00:00+00:00",
            "license_plate": "ABC",
            "damage_detected": False,
            "image_path": "scans/ABC/e1/cam-a/frame_0001.jpg",
        },
        {
            "event_id": "e1",
            "camera_id": "cam-b",
            "timestamp": "2026-04-01T11:00:00+00:00",
            "license_plate": "ABC",
            "damage_detected": True,
            "image_path": "scans/ABC/e1/cam-b/frame_0001.jpg",
        },
        {
            "event_id": "e2",
            "camera_id": "cam-a",
            "timestamp": "2026-04-02T09:00:00+00:00",
            "license_plate": "XYZ",
            "damage_detected": False,
            "image_path": "k1.jpg",
        },
    ]
    out = aggregate_event_summaries(items)
    assert len(out) == 2
    by_id = {x["event_id"]: x for x in out}
    assert by_id["e1"]["camera_count"] == 2
    assert by_id["e1"]["any_damage"] is True
    assert "11:00:00" in by_id["e1"]["last_timestamp"] or by_id["e1"]["last_timestamp"].startswith("2026-04-01T11")
    assert by_id["e2"]["license_plate"] == "XYZ"


def test_aggregate_skips_rows_without_event_id():
    assert aggregate_event_summaries([{"camera_id": "x"}]) == []


def test_aggregate_merges_qc_row():
    items = [
        {
            "event_id": "e1",
            "camera_id": "cam-a",
            "camera_frame": "cam-a#f1",
            "timestamp": "2026-04-01T10:00:00+00:00",
            "license_plate": "ABC",
            "damage_detected": False,
            "image_path": "scans/ABC/e1/cam-a/frame_0001.jpg",
        },
        {
            "event_id": "e1",
            "camera_frame": "__qc__",
            "qc_status": "approved",
        },
    ]
    out = aggregate_event_summaries(items)
    assert len(out) == 1
    assert out[0]["qc_status"] == "approved"
    assert out[0]["camera_count"] == 1
