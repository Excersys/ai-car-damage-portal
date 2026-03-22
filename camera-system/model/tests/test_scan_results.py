"""Tests for scan_results module."""

from __future__ import annotations

import json
import os
from pathlib import Path

import pytest

import scan_results


@pytest.fixture(autouse=True)
def tmp_scans_dir(tmp_path, monkeypatch):
    """Point scan results at a temporary directory."""
    monkeypatch.setattr(scan_results.cfg, "SCAN_RESULTS_DIR", str(tmp_path / "scans"))
    return tmp_path / "scans"


def _make_scan(event_id: str = "scan_001", plate: str = "ABC1234", damages=None):
    return {
        "event_id": event_id,
        "license_plate": plate,
        "timestamp": "2026-03-04T22:00:00Z",
        "damages": damages or [],
    }


class TestSaveScanResult:
    def test_creates_file(self, tmp_scans_dir):
        scan = _make_scan()
        path = scan_results.save_scan_result(scan)
        assert path.exists()
        data = json.loads(path.read_text())
        assert data["event_id"] == "scan_001"
        assert data["license_plate"] == "ABC1234"

    def test_organizes_by_plate(self, tmp_scans_dir):
        scan_results.save_scan_result(_make_scan(plate="XYZ789"))
        assert (tmp_scans_dir / "XYZ789").is_dir()

    def test_unknown_plate(self, tmp_scans_dir):
        scan_results.save_scan_result(_make_scan(plate=""))
        assert (tmp_scans_dir / "unknown").is_dir()


class TestGetPreviousScan:
    def test_no_previous(self, tmp_scans_dir):
        assert scan_results.get_previous_scan("ABC1234") is None

    def test_returns_latest(self, tmp_scans_dir):
        scan_results.save_scan_result(_make_scan("scan_001"))
        scan_results.save_scan_result(_make_scan("scan_002"))
        prev = scan_results.get_previous_scan("ABC1234")
        assert prev is not None
        assert prev["event_id"] == "scan_002"

    def test_empty_plate(self, tmp_scans_dir):
        assert scan_results.get_previous_scan("") is None


class TestGetAllScans:
    def test_returns_all(self, tmp_scans_dir):
        scan_results.save_scan_result(_make_scan("scan_001"))
        scan_results.save_scan_result(_make_scan("scan_002"))
        scans = scan_results.get_all_scans("ABC1234")
        assert len(scans) == 2


class TestCompareScans:
    def test_all_new(self):
        current = _make_scan(damages=[
            {"damage_type": "scratch", "bounding_boxes": [[10, 20, 50, 60]]},
        ])
        previous = _make_scan(damages=[])
        result = scan_results.compare_scans(current, previous)
        assert result["new_damage_count"] == 1
        assert result["existing_damage_count"] == 0

    def test_existing_damage(self):
        dmg = {"damage_type": "scratch", "bounding_boxes": [[10, 20, 50, 60]]}
        current = _make_scan(damages=[dmg])
        previous = _make_scan(damages=[dmg])
        result = scan_results.compare_scans(current, previous)
        assert result["new_damage_count"] == 0
        assert result["existing_damage_count"] == 1

    def test_resolved_damage(self):
        current = _make_scan(damages=[])
        previous = _make_scan(damages=[
            {"damage_type": "dent", "bounding_boxes": [[100, 200, 150, 250]]},
        ])
        result = scan_results.compare_scans(current, previous)
        assert result["resolved_damage_count"] == 1
        assert result["new_damage_count"] == 0

    def test_mixed(self):
        current = _make_scan(damages=[
            {"damage_type": "scratch", "bounding_boxes": [[10, 20, 50, 60]]},
            {"damage_type": "dent", "bounding_boxes": [[300, 400, 350, 450]]},
        ])
        previous = _make_scan(damages=[
            {"damage_type": "scratch", "bounding_boxes": [[10, 20, 50, 60]]},
            {"damage_type": "crack", "bounding_boxes": [[500, 600, 550, 650]]},
        ])
        result = scan_results.compare_scans(current, previous)
        assert result["new_damage_count"] == 1
        assert result["existing_damage_count"] == 1
        assert result["resolved_damage_count"] == 1


class TestEnrichWithComparison:
    def test_no_plate(self, tmp_scans_dir):
        scan = _make_scan(plate="")
        result = scan_results.enrich_scan_with_comparison(scan)
        assert "comparison" not in result

    def test_with_previous(self, tmp_scans_dir):
        scan_results.save_scan_result(_make_scan("scan_001", damages=[
            {"damage_type": "scratch", "bounding_boxes": [[10, 20, 50, 60]]},
        ]))
        current = _make_scan("scan_002", damages=[
            {"damage_type": "scratch", "bounding_boxes": [[10, 20, 50, 60]]},
            {"damage_type": "dent", "bounding_boxes": [[300, 400, 350, 450]]},
        ])
        result = scan_results.enrich_scan_with_comparison(current)
        assert result["previous_scan_id"] == "scan_001"
        assert result["comparison"]["new_damage_count"] == 1
