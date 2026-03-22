"""Tests for plate_reader module."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import patch, MagicMock

import numpy as np
import pytest

import plate_reader


def _blank_image(h: int = 200, w: int = 400) -> np.ndarray:
    return np.zeros((h, w, 3), dtype=np.uint8)


class TestFindPlateCandidates:
    def test_no_candidates_on_blank(self):
        candidates = plate_reader._find_plate_candidates(_blank_image())
        assert candidates == []

    def test_returns_list(self):
        img = _blank_image(500, 800)
        candidates = plate_reader._find_plate_candidates(img)
        assert isinstance(candidates, list)


class TestPreprocessPlate:
    def test_output_is_grayscale(self):
        plate = np.random.randint(0, 255, (30, 120, 3), dtype=np.uint8)
        result = plate_reader._preprocess_plate(plate)
        assert len(result.shape) == 2

    def test_upscales_small_plates(self):
        plate = np.random.randint(0, 255, (20, 80, 3), dtype=np.uint8)
        result = plate_reader._preprocess_plate(plate)
        assert result.shape[0] >= 100


class TestReadPlate:
    def test_returns_none_without_tesseract(self, monkeypatch):
        monkeypatch.setattr(plate_reader, "_HAS_TESSERACT", False)
        result = plate_reader.read_plate(_blank_image())
        assert result is None

    @patch.object(plate_reader, "_HAS_TESSERACT", True)
    @patch.object(plate_reader, "_find_plate_candidates")
    @patch.object(plate_reader, "_ocr_plate")
    def test_returns_plate_text(self, mock_ocr, mock_find):
        mock_find.return_value = [np.zeros((30, 120, 3), dtype=np.uint8)]
        mock_ocr.return_value = ("ABC1234", 85.0)
        result = plate_reader.read_plate(_blank_image())
        assert result == "ABC1234"

    @patch.object(plate_reader, "_HAS_TESSERACT", True)
    @patch.object(plate_reader, "_find_plate_candidates")
    def test_returns_none_no_candidates(self, mock_find):
        mock_find.return_value = []
        result = plate_reader.read_plate(_blank_image())
        assert result is None

    @patch.object(plate_reader, "_HAS_TESSERACT", True)
    @patch.object(plate_reader, "_find_plate_candidates")
    @patch.object(plate_reader, "_ocr_plate")
    def test_with_vehicle_bbox(self, mock_ocr, mock_find):
        mock_find.return_value = [np.zeros((30, 120, 3), dtype=np.uint8)]
        mock_ocr.return_value = ("XYZ789", 90.0)
        img = np.zeros((1000, 1500, 3), dtype=np.uint8)
        result = plate_reader.read_plate(img, vehicle_bbox=[100, 200, 800, 700])
        assert result == "XYZ789"


class TestReadPlateFromScan:
    def test_returns_none_without_tesseract(self, monkeypatch):
        monkeypatch.setattr(plate_reader, "_HAS_TESSERACT", False)
        result = plate_reader.read_plate_from_scan(Path("/tmp"), [])
        assert result is None

    @patch.object(plate_reader, "_HAS_TESSERACT", True)
    @patch.object(plate_reader, "read_plate")
    def test_returns_most_common_plate(self, mock_read, tmp_path):
        img_path = tmp_path / "frame.jpg"
        np_img = np.zeros((100, 200, 3), dtype=np.uint8)
        import cv2
        cv2.imwrite(str(img_path), np_img)

        frame1 = MagicMock(path=img_path, detections=[{"bbox": [0, 0, 100, 50]}])
        frame2 = MagicMock(path=img_path, detections=[{"bbox": [0, 0, 100, 50]}])
        frame3 = MagicMock(path=img_path, detections=[{"bbox": [0, 0, 100, 50]}])

        mock_read.side_effect = ["ABC1234", "ABC1234", "XYZ789"]
        result = plate_reader.read_plate_from_scan(tmp_path, [frame1, frame2, frame3])
        assert result == "ABC1234"
