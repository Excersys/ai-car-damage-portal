"""
Unit tests for detect_car module.
YOLO model and camera I/O are fully mocked.
"""

from __future__ import annotations

from pathlib import Path
from unittest.mock import MagicMock, patch

import numpy as np
import pytest

from detect_car import (
    annotate_image,
    detect_vehicles,
    _print_detections,
)


# ---------------------------------------------------------------------------
# Helpers to build fake YOLO results
# ---------------------------------------------------------------------------


def _make_box(cls_id: int, confidence: float, xyxy: list[float]) -> MagicMock:
    """Create a mock ultralytics Box object."""
    import torch

    box = MagicMock()
    box.cls = torch.tensor([cls_id])
    box.conf = torch.tensor([confidence])
    box.xyxy = torch.tensor([xyxy])
    return box


def _make_yolo_result(boxes: list[MagicMock]) -> MagicMock:
    """Wrap mock boxes into the structure returned by model(image)."""
    result = MagicMock()
    result.boxes = boxes
    return [result]


# ---------------------------------------------------------------------------
# detect_vehicles
# ---------------------------------------------------------------------------


class TestDetectVehicles:
    """Test the core detection + filtering logic."""

    def test_returns_only_vehicle_classes(self):
        """Non-vehicle detections (person=0, dog=16) are excluded."""
        boxes = [
            _make_box(cls_id=2, confidence=0.9, xyxy=[10, 20, 300, 400]),   # car
            _make_box(cls_id=0, confidence=0.95, xyxy=[50, 60, 200, 300]),  # person
            _make_box(cls_id=7, confidence=0.8, xyxy=[400, 100, 700, 500]), # truck
            _make_box(cls_id=16, confidence=0.7, xyxy=[0, 0, 50, 50]),      # dog
        ]
        model = MagicMock()
        model.return_value = _make_yolo_result(boxes)

        image = np.zeros((640, 640, 3), dtype=np.uint8)
        detections = detect_vehicles(model, image, confidence=0.5)

        assert len(detections) == 2
        class_ids = {d["class_id"] for d in detections}
        assert class_ids == {2, 7}

    def test_filters_by_confidence(self):
        """Detections below the threshold are excluded by YOLO internally,
        but our function also respects the threshold it passes."""
        boxes = [
            _make_box(cls_id=2, confidence=0.9, xyxy=[10, 20, 300, 400]),
        ]
        model = MagicMock()
        model.return_value = _make_yolo_result(boxes)

        image = np.zeros((640, 640, 3), dtype=np.uint8)
        detections = detect_vehicles(model, image, confidence=0.95)

        model.assert_called_once()
        call_kwargs = model.call_args
        assert call_kwargs[1]["conf"] == 0.95

    def test_empty_when_no_vehicles(self):
        """Only non-vehicle objects in the frame."""
        boxes = [
            _make_box(cls_id=0, confidence=0.99, xyxy=[10, 10, 200, 200]),  # person
        ]
        model = MagicMock()
        model.return_value = _make_yolo_result(boxes)

        image = np.zeros((640, 640, 3), dtype=np.uint8)
        detections = detect_vehicles(model, image, confidence=0.5)

        assert detections == []

    def test_empty_when_no_detections_at_all(self):
        model = MagicMock()
        model.return_value = _make_yolo_result([])

        image = np.zeros((640, 640, 3), dtype=np.uint8)
        detections = detect_vehicles(model, image, confidence=0.5)

        assert detections == []

    def test_custom_vehicle_classes(self):
        """Caller can override which class IDs count as vehicles."""
        boxes = [
            _make_box(cls_id=0, confidence=0.9, xyxy=[10, 20, 300, 400]),  # person
        ]
        model = MagicMock()
        model.return_value = _make_yolo_result(boxes)

        image = np.zeros((640, 640, 3), dtype=np.uint8)
        detections = detect_vehicles(
            model, image, confidence=0.5, vehicle_classes=[0]
        )

        assert len(detections) == 1
        assert detections[0]["class_id"] == 0

    def test_detection_dict_structure(self):
        """Each detection has the expected keys and types."""
        boxes = [
            _make_box(cls_id=5, confidence=0.87, xyxy=[100.5, 200.3, 500.9, 600.1]),
        ]
        model = MagicMock()
        model.return_value = _make_yolo_result(boxes)

        image = np.zeros((640, 640, 3), dtype=np.uint8)
        detections = detect_vehicles(model, image, confidence=0.5)

        assert len(detections) == 1
        d = detections[0]
        assert d["class_id"] == 5
        assert d["class_name"] == "bus"
        assert isinstance(d["confidence"], float)
        assert len(d["bbox"]) == 4
        assert all(isinstance(v, float) for v in d["bbox"])

    def test_all_vehicle_types_detected(self):
        """car, motorcycle, bus, truck are all recognized."""
        boxes = [
            _make_box(cls_id=2, confidence=0.9, xyxy=[0, 0, 100, 100]),
            _make_box(cls_id=3, confidence=0.8, xyxy=[0, 0, 100, 100]),
            _make_box(cls_id=5, confidence=0.7, xyxy=[0, 0, 100, 100]),
            _make_box(cls_id=7, confidence=0.6, xyxy=[0, 0, 100, 100]),
        ]
        model = MagicMock()
        model.return_value = _make_yolo_result(boxes)

        image = np.zeros((640, 640, 3), dtype=np.uint8)
        detections = detect_vehicles(model, image, confidence=0.5)

        names = {d["class_name"] for d in detections}
        assert names == {"car", "motorcycle", "bus", "truck"}


# ---------------------------------------------------------------------------
# annotate_image
# ---------------------------------------------------------------------------


class TestAnnotateImage:
    def test_returns_new_image_same_shape(self):
        image = np.zeros((480, 640, 3), dtype=np.uint8)
        detections = [
            {"class_name": "car", "confidence": 0.9, "bbox": [10.0, 20.0, 300.0, 400.0]},
        ]
        result = annotate_image(image, detections)

        assert result.shape == image.shape
        assert result is not image

    def test_does_not_modify_original(self):
        image = np.zeros((480, 640, 3), dtype=np.uint8)
        original_sum = image.sum()
        detections = [
            {"class_name": "truck", "confidence": 0.8, "bbox": [50.0, 50.0, 200.0, 200.0]},
        ]
        annotate_image(image, detections)

        assert image.sum() == original_sum

    def test_empty_detections_returns_copy(self):
        image = np.ones((100, 100, 3), dtype=np.uint8) * 128
        result = annotate_image(image, [])
        assert np.array_equal(result, image)
        assert result is not image


# ---------------------------------------------------------------------------
# _print_detections (smoke test)
# ---------------------------------------------------------------------------


class TestPrintDetections:
    def test_no_vehicles_prints_message(self, capsys):
        _print_detections([], "test_cam")
        out = capsys.readouterr().out
        assert "No vehicles detected" in out

    def test_vehicles_prints_count(self, capsys):
        detections = [
            {"class_name": "car", "confidence": 0.9, "bbox": [10.0, 20.0, 300.0, 400.0]},
            {"class_name": "truck", "confidence": 0.7, "bbox": [50.0, 50.0, 200.0, 200.0]},
        ]
        _print_detections(detections, "test")
        out = capsys.readouterr().out
        assert "2 vehicle(s)" in out
        assert "car" in out
        assert "truck" in out
