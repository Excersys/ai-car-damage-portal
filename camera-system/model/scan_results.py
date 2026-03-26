"""
Scan results storage and comparison.

Saves damage detection results to JSON files organized by license plate.
Supports loading previous scans and diffing to find NEW damage.

Directory structure:
    /data/tunnel/scans/
    ├── ABC1234/
    │   ├── scan_20260304_220228.json
    │   └── scan_20260305_140015.json
    └── XYZ7890/
        └── scan_20260304_183045.json
"""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import config as cfg

logger = logging.getLogger("tunnel-detect.results")


def _scans_root() -> Path:
    return Path(cfg.SCAN_RESULTS_DIR)


# ---------------------------------------------------------------------------
# Save
# ---------------------------------------------------------------------------


def save_scan_result(scan_dict: dict[str, Any]) -> Path:
    """
    Persist a scan result to disk.

    Args:
        scan_dict: Output of ScanEvent.to_dict() — contains event_id,
                   license_plate, timestamp, images, etc.

    Returns:
        Path to the saved JSON file.
    """
    plate = scan_dict.get("license_plate", "") or "unknown"
    event_id = scan_dict["event_id"]

    plate_dir = _scans_root() / plate
    plate_dir.mkdir(parents=True, exist_ok=True)

    out_path = plate_dir / f"{event_id}.json"
    out_path.write_text(json.dumps(scan_dict, indent=2, default=str))
    logger.info("Saved scan result: %s", out_path)
    return out_path


# ---------------------------------------------------------------------------
# Load
# ---------------------------------------------------------------------------


def get_previous_scan(license_plate: str) -> dict[str, Any] | None:
    """
    Load the most recent scan for a given license plate.

    Returns:
        Parsed JSON dict, or None if no previous scan exists.
    """
    if not license_plate:
        return None

    plate_dir = _scans_root() / license_plate
    if not plate_dir.is_dir():
        return None

    json_files = sorted(plate_dir.glob("*.json"), reverse=True)
    if not json_files:
        return None

    try:
        return json.loads(json_files[0].read_text())
    except (json.JSONDecodeError, OSError) as exc:
        logger.warning("Could not read previous scan: %s", exc)
        return None


def get_all_scans(license_plate: str) -> list[dict[str, Any]]:
    """Load all scans for a license plate, newest first."""
    if not license_plate:
        return []

    plate_dir = _scans_root() / license_plate
    if not plate_dir.is_dir():
        return []

    scans: list[dict[str, Any]] = []
    for path in sorted(plate_dir.glob("*.json"), reverse=True):
        try:
            scans.append(json.loads(path.read_text()))
        except (json.JSONDecodeError, OSError):
            continue
    return scans


# ---------------------------------------------------------------------------
# Compare
# ---------------------------------------------------------------------------


def _damage_key(damage: dict) -> str:
    """Unique key for a damage item based on type and approximate location."""
    dtype = damage.get("damage_type", "unknown")
    bboxes = damage.get("bounding_boxes", [])
    if bboxes:
        bbox = bboxes[0] if isinstance(bboxes[0], list) else bboxes
        center_x = (bbox[0] + bbox[2]) / 2 if len(bbox) >= 4 else 0
        center_y = (bbox[1] + bbox[3]) / 2 if len(bbox) >= 4 else 0
        return f"{dtype}_{int(center_x / 50)}_{int(center_y / 50)}"
    return dtype


def compare_scans(
    current: dict[str, Any],
    previous: dict[str, Any],
    location_tolerance: float = 100.0,
) -> dict[str, Any]:
    """
    Compare two scan results to identify new damage.

    Args:
        current: Current scan result dict.
        previous: Previous scan result dict.
        location_tolerance: Pixel distance within which two damages
                            are considered the same.

    Returns:
        Comparison result dict with new_damages, existing_damages, resolved_damages.
    """
    current_damages = current.get("damages", [])
    previous_damages = previous.get("damages", [])

    prev_keys = {_damage_key(d): d for d in previous_damages}
    curr_keys = {_damage_key(d): d for d in current_damages}

    new_damages: list[dict] = []
    existing_damages: list[dict] = []
    resolved_damages: list[dict] = []

    for key, dmg in curr_keys.items():
        if key in prev_keys:
            existing_damages.append({**dmg, "is_new": False, "status": "existing"})
        else:
            new_damages.append({**dmg, "is_new": True, "status": "new"})

    for key, dmg in prev_keys.items():
        if key not in curr_keys:
            resolved_damages.append({**dmg, "status": "resolved"})

    return {
        "current_event_id": current.get("event_id"),
        "previous_event_id": previous.get("event_id"),
        "license_plate": current.get("license_plate", ""),
        "comparison_time": datetime.now(timezone.utc).isoformat(),
        "new_damage_count": len(new_damages),
        "existing_damage_count": len(existing_damages),
        "resolved_damage_count": len(resolved_damages),
        "new_damages": new_damages,
        "existing_damages": existing_damages,
        "resolved_damages": resolved_damages,
    }


def enrich_scan_with_comparison(scan_dict: dict[str, Any]) -> dict[str, Any]:
    """
    If a previous scan exists for the same plate, add comparison data.

    Mutates and returns the scan dict.
    """
    plate = scan_dict.get("license_plate", "")
    if not plate:
        return scan_dict

    previous = get_previous_scan(plate)
    if previous and previous.get("event_id") != scan_dict.get("event_id"):
        comparison = compare_scans(scan_dict, previous)
        scan_dict["comparison"] = comparison
        scan_dict["previous_scan_id"] = previous.get("event_id")
        logger.info(
            "Comparison: %d new, %d existing, %d resolved damages",
            comparison["new_damage_count"],
            comparison["existing_damage_count"],
            comparison["resolved_damage_count"],
        )
    else:
        scan_dict["previous_scan_id"] = None

    return scan_dict
