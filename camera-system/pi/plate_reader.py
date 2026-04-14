"""
License plate reader using AWS Rekognition DetectText.

Falls back to Tesseract OCR if Rekognition fails or isn't available.
"""

from __future__ import annotations

import logging
import re
from pathlib import Path

import cv2

logger = logging.getLogger("tunnel-detect.plate")

_PLATE_PATTERN = re.compile(r"^[A-Z0-9]{5,8}$")


def read_plate(image) -> str | None:
    """Read license plate from an image (numpy array or file path)."""
    if isinstance(image, (str, Path)):
        image = cv2.imread(str(image))
    if image is None:
        return None

    result = _read_plate_rekognition(image)
    if result:
        return result

    return _read_plate_tesseract(image)


def _read_plate_rekognition(image) -> str | None:
    """Use AWS Rekognition DetectText to find plate text."""
    try:
        import boto3
        client = boto3.client("rekognition", region_name="us-east-1")

        _, buffer = cv2.imencode(".jpg", image, [cv2.IMWRITE_JPEG_QUALITY, 85])
        response = client.detect_text(Image={"Bytes": buffer.tobytes()})

        candidates = []
        for det in response.get("TextDetections", []):
            if det["Type"] != "LINE" or det["Confidence"] < 80:
                continue
            text = re.sub(r"[^A-Z0-9]", "", det["DetectedText"].upper())
            if _PLATE_PATTERN.match(text):
                candidates.append((det["Confidence"], text))

        if candidates:
            best = max(candidates, key=lambda x: x[0])
            logger.info("Rekognition plate: %s (%.1f%%)", best[1], best[0])
            return best[1]

        return None
    except Exception as exc:
        logger.warning("Rekognition plate read failed: %s", exc)
        return None


def _read_plate_tesseract(image) -> str | None:
    """Fallback: Tesseract OCR on bottom portion of image."""
    try:
        import pytesseract
    except ImportError:
        return None

    h = image.shape[0]
    bottom = image[int(h * 0.6):, :]
    gray = cv2.cvtColor(bottom, cv2.COLOR_BGR2GRAY)
    gray = cv2.resize(gray, (gray.shape[1] * 2, gray.shape[0] * 2))

    config = "--oem 3 --psm 6 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    try:
        text = pytesseract.image_to_string(gray, config=config).strip()
        text = re.sub(r"[^A-Z0-9]", "", text.upper())
        matches = _PLATE_PATTERN.findall(text)
        if matches:
            return max(matches, key=len)
    except Exception:
        pass

    return None


def read_plate_from_scan(event_dir, frames) -> str | None:
    """Read plate from a list of frame paths."""
    for frame in frames:
        path = event_dir / frame.filename if hasattr(frame, "filename") else frame
        result = read_plate(str(path))
        if result:
            return result
    return None
