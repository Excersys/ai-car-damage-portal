"""Pure functions for grouping DynamoDB items (no AWS imports)."""

from __future__ import annotations

from typing import Any

# Reserved sort key for event-level QC metadata (written by Review API POST /qc).
QC_SORT_KEY = "__qc__"


def aggregate_event_summaries(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Group DynamoDB items by event_id for the list endpoint."""
    by_event: dict[str, dict[str, Any]] = {}

    for item in items:
        eid = item.get("event_id")
        if not eid:
            continue
        cf = item.get("camera_frame", "")
        if cf == QC_SORT_KEY:
            if eid not in by_event:
                by_event[eid] = {
                    "event_id": eid,
                    "camera_ids": set(),
                    "last_timestamp": "",
                    "_sort_ts": "",
                    "license_plate": "",
                    "any_damage": False,
                    "_preview_key": "",
                    "qc_status": "pending",
                }
            by_event[eid]["qc_status"] = item.get("qc_status", "pending")
            continue
        if eid not in by_event:
            by_event[eid] = {
                "event_id": eid,
                "camera_ids": set(),
                "last_timestamp": "",
                "_sort_ts": "",
                "license_plate": "",
                "any_damage": False,
                "_preview_key": "",
                "qc_status": "pending",
            }
        agg = by_event[eid]
        cam = item.get("camera_id", "")
        if cam:
            agg["camera_ids"].add(cam)
        ts = item.get("timestamp", "")
        if ts > agg["_sort_ts"]:
            agg["_sort_ts"] = ts
            agg["last_timestamp"] = ts
        if item.get("damage_detected"):
            agg["any_damage"] = True
        plate = item.get("license_plate", "")
        if plate and not agg["license_plate"]:
            agg["license_plate"] = plate
        img = item.get("image_path", "")
        if img and not agg["_preview_key"]:
            agg["_preview_key"] = img

    out: list[dict[str, Any]] = []
    for agg in by_event.values():
        cams = agg["camera_ids"]
        out.append(
            {
                "event_id": agg["event_id"],
                "last_timestamp": agg["last_timestamp"] or agg["_sort_ts"],
                "_sort_ts": agg["_sort_ts"],
                "license_plate": agg["license_plate"],
                "any_damage": agg["any_damage"],
                "camera_count": len(cams) if cams else 1,
                "_preview_key": agg["_preview_key"],
                "qc_status": agg.get("qc_status", "pending"),
            }
        )
    return out
