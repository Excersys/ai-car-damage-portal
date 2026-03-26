"""
License plate detection and OCR.

Two-stage pipeline:
    1. Detect plate region via contour analysis on the vehicle crop
    2. Read plate text using Tesseract OCR

Runs entirely on CPU with no PyTorch dependency.
Requires: pytesseract, tesseract-ocr system package.

Falls back gracefully if Tesseract is not installed.
"""

from __future__ import annotations

import logging
import re
from pathlib import Path

import cv2
import numpy as np

logger = logging.getLogger("tunnel-detect.plate")

try:
    import pytesseract
    _HAS_TESSERACT = True
except ImportError:
    _HAS_TESSERACT = False
    logger.warning("pytesseract not installed — plate reading disabled")

_PLATE_PATTERN = re.compile(r"^[A-Z0-9]{2,8}$")
_MIN_PLATE_AREA = 2000
_MAX_PLATE_AREA = 100000
_PLATE_ASPECT_MIN = 1.5
_PLATE_ASPECT_MAX = 6.0


# ---------------------------------------------------------------------------
# Plate detection via contour analysis
# ---------------------------------------------------------------------------


def _find_plate_candidates(image: np.ndarray) -> list[np.ndarray]:
    """
    Find rectangular regions that look like license plates.

    Uses edge detection + contour filtering by aspect ratio and area.
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    gray = cv2.bilateralFilter(gray, 11, 17, 17)
    edges = cv2.Canny(gray, 30, 200)

    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    edges = cv2.dilate(edges, kernel, iterations=1)

    contours, _ = cv2.findContours(edges, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
    candidates: list[np.ndarray] = []

    for cnt in sorted(contours, key=cv2.contourArea, reverse=True)[:50]:
        area = cv2.contourArea(cnt)
        if area < _MIN_PLATE_AREA or area > _MAX_PLATE_AREA:
            continue

        peri = cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, 0.02 * peri, True)

        if len(approx) == 4:
            x, y, w, h = cv2.boundingRect(approx)
            aspect = w / max(h, 1)
            if _PLATE_ASPECT_MIN <= aspect <= _PLATE_ASPECT_MAX:
                candidates.append(image[y : y + h, x : x + w])

    return candidates


def _preprocess_plate(plate_img: np.ndarray) -> np.ndarray:
    """Prepare plate crop for OCR: resize, grayscale, threshold."""
    h, w = plate_img.shape[:2]
    scale = max(1, 200 / h)
    plate_img = cv2.resize(
        plate_img,
        (int(w * scale), int(h * scale)),
        interpolation=cv2.INTER_CUBIC,
    )
    gray = cv2.cvtColor(plate_img, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (3, 3), 0)
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    return thresh


def _ocr_plate(plate_img: np.ndarray) -> tuple[str, float]:
    """Run Tesseract OCR on a preprocessed plate image. Returns (text, confidence)."""
    if not _HAS_TESSERACT:
        return "", 0.0

    config = "--oem 3 --psm 7 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    try:
        data = pytesseract.image_to_data(
            plate_img, config=config, output_type=pytesseract.Output.DICT
        )
    except Exception:
        logger.debug("Tesseract OCR failed", exc_info=True)
        return "", 0.0

    texts: list[str] = []
    confs: list[float] = []
    for i, text in enumerate(data["text"]):
        text = text.strip()
        conf = float(data["conf"][i])
        if text and conf > 30:
            texts.append(text)
            confs.append(conf)

    raw = "".join(texts).upper().replace(" ", "")
    avg_conf = sum(confs) / max(len(confs), 1)
    return raw, avg_conf


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def read_plate(frame: np.ndarray, vehicle_bbox: list[float] | None = None) -> str | None:
    """
    Detect and read a license plate from a camera frame.

    Args:
        frame: Full-resolution BGR image.
        vehicle_bbox: Optional [x1, y1, x2, y2] to crop the vehicle region.

    Returns:
        Plate string (e.g. "ABC1234") or None.
    """
    if not _HAS_TESSERACT:
        return None

    if vehicle_bbox:
        x1, y1, x2, y2 = [max(0, int(v)) for v in vehicle_bbox]
        crop = frame[y1:y2, x1:x2]
    else:
        crop = frame

    candidates = _find_plate_candidates(crop)
    if not candidates:
        return None

    best_text = ""
    best_conf = 0.0

    for plate_img in candidates[:5]:
        processed = _preprocess_plate(plate_img)
        text, conf = _ocr_plate(processed)

        clean = re.sub(r"[^A-Z0-9]", "", text)
        if len(clean) < 2:
            continue

        if conf > best_conf:
            best_text = clean
            best_conf = conf

    if best_text and _PLATE_PATTERN.match(best_text):
        logger.info("Plate read: %s (conf=%.0f%%)", best_text, best_conf)
        return best_text

    if best_text:
        logger.debug("Low-quality plate read: %s (conf=%.0f%%)", best_text, best_conf)
        return best_text

    return None


def read_plate_from_scan(
    event_dir: Path, frames: list,
) -> str | None:
    """
    Try to read a license plate from the best frames in a burst scan.

    Prioritizes frames with vehicle detections and tries multiple cameras.
    """
    if not _HAS_TESSERACT:
        return None

    frames_with_vehicles = [f for f in frames if f.detections]
    if not frames_with_vehicles:
        frames_with_vehicles = frames[:8]

    plates: dict[str, int] = {}

    for bf in frames_with_vehicles[:12]:
        img_path = bf.path if isinstance(bf.path, Path) else Path(bf.path)
        if not img_path.exists():
            continue

        frame = cv2.imread(str(img_path))
        if frame is None:
            continue

        for det in (bf.detections or [{}]):
            bbox = det.get("bbox")
            plate = read_plate(frame, vehicle_bbox=bbox)
            if plate and len(plate) >= 3:
                plates[plate] = plates.get(plate, 0) + 1

    if not plates:
        return None

    # Return most frequently detected plate
    return max(plates, key=plates.get)  # type: ignore[arg-type]
