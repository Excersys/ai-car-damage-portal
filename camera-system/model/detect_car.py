#!/usr/bin/env python3
"""
Detect vehicles in tunnel camera images using YOLOv8 (ONNX Runtime).

Runs entirely on CPU with no PyTorch dependency -- suitable for Raspberry Pi.

Usage:
    python detect_car.py image.jpg                         # from a local file
    python detect_car.py --rtsp rtsp://user:pass@ip:554/   # single RTSP grab
    python detect_car.py --all-cameras                     # all CAMERAS_JSON feeds

Exit codes:
    0  -- at least one vehicle detected
    1  -- no vehicles detected (or error)
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import re
import sys
from pathlib import Path

import cv2
import numpy as np
import onnxruntime as ort

import config as cfg

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

COCO_VEHICLE_NAMES = {2: "car", 3: "motorcycle", 5: "bus", 7: "truck"}

INPUT_SIZE = 640


# ---------------------------------------------------------------------------
# ONNX model wrapper
# ---------------------------------------------------------------------------


class VehicleDetector:
    """YOLOv8 ONNX model for vehicle detection."""

    def __init__(self, model_path: str):
        self._session = ort.InferenceSession(
            model_path, providers=["CPUExecutionProvider"]
        )
        meta = self._session.get_inputs()[0]
        self._input_name = meta.name
        self._input_shape = meta.shape  # [1, 3, 640, 640]
        logger.info(
            "Loaded ONNX model: %s  input=%s", model_path, self._input_shape
        )

    def _preprocess(self, image: np.ndarray) -> tuple[np.ndarray, float, int, int]:
        """Letterbox-resize and normalize image for YOLO input."""
        h, w = image.shape[:2]
        scale = min(INPUT_SIZE / h, INPUT_SIZE / w)
        new_w, new_h = int(w * scale), int(h * scale)
        resized = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_LINEAR)

        canvas = np.full((INPUT_SIZE, INPUT_SIZE, 3), 114, dtype=np.uint8)
        pad_y, pad_x = (INPUT_SIZE - new_h) // 2, (INPUT_SIZE - new_w) // 2
        canvas[pad_y : pad_y + new_h, pad_x : pad_x + new_w] = resized

        blob = canvas.astype(np.float32) / 255.0
        blob = blob.transpose(2, 0, 1)[np.newaxis]  # BCHW
        return blob, scale, pad_x, pad_y

    def detect(
        self,
        image: np.ndarray,
        confidence: float | None = None,
        vehicle_classes: list[int] | None = None,
    ) -> list[dict]:
        """
        Run inference and return vehicle detections.

        Each dict: {class_id, class_name, confidence, bbox: [x1, y1, x2, y2]}
        """
        conf_thresh = confidence if confidence is not None else cfg.DETECTION_CONFIDENCE
        classes = vehicle_classes if vehicle_classes is not None else cfg.VEHICLE_CLASSES

        blob, scale, pad_x, pad_y = self._preprocess(image)
        outputs = self._session.run(None, {self._input_name: blob})
        preds = outputs[0]  # shape: [1, 84, 8400]

        return self._postprocess(
            preds, scale, pad_x, pad_y, conf_thresh, classes
        )

    def _postprocess(
        self,
        preds: np.ndarray,
        scale: float,
        pad_x: int,
        pad_y: int,
        conf_thresh: float,
        vehicle_classes: list[int],
    ) -> list[dict]:
        """Apply NMS and filter for vehicle classes."""
        preds = preds[0].T  # [8400, 84]

        # Columns: cx, cy, w, h, class_scores[80]
        cx, cy, w, h = preds[:, 0], preds[:, 1], preds[:, 2], preds[:, 3]
        class_scores = preds[:, 4:]

        class_ids = class_scores.argmax(axis=1)
        confidences = class_scores[np.arange(len(class_ids)), class_ids]

        # Filter by confidence
        mask = confidences >= conf_thresh
        cx, cy, w, h = cx[mask], cy[mask], w[mask], h[mask]
        class_ids = class_ids[mask]
        confidences = confidences[mask]

        if len(confidences) == 0:
            return []

        # Convert cx/cy/w/h to x1/y1/x2/y2
        x1 = cx - w / 2
        y1 = cy - h / 2
        x2 = cx + w / 2
        y2 = cy + h / 2

        # Scale back to original image coordinates
        x1 = (x1 - pad_x) / scale
        y1 = (y1 - pad_y) / scale
        x2 = (x2 - pad_x) / scale
        y2 = (y2 - pad_y) / scale

        boxes = np.stack([x1, y1, x2, y2], axis=1).astype(np.float32)
        scores = confidences.astype(np.float32)

        # NMS
        indices = cv2.dnn.NMSBoxes(
            boxes.tolist(), scores.tolist(), conf_thresh, 0.45
        )
        if len(indices) == 0:
            return []
        indices = indices.flatten()

        detections: list[dict] = []
        for i in indices:
            cls_id = int(class_ids[i])
            if cls_id not in vehicle_classes:
                continue
            detections.append({
                "class_id": cls_id,
                "class_name": COCO_VEHICLE_NAMES.get(cls_id, f"class_{cls_id}"),
                "confidence": round(float(scores[i]), 3),
                "bbox": [round(float(v), 1) for v in boxes[i]],
            })

        return detections


# ---------------------------------------------------------------------------
# Image acquisition
# ---------------------------------------------------------------------------


def load_image(path: str) -> np.ndarray:
    """Read an image file and return the BGR numpy array."""
    img = cv2.imread(path)
    if img is None:
        logger.error("Could not read image: %s", path)
        sys.exit(1)
    return img


def grab_rtsp_frame(url: str) -> np.ndarray | None:
    """Capture a single frame from an RTSP stream."""
    os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"
    cap = cv2.VideoCapture(url, cv2.CAP_FFMPEG)
    cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, cfg.CAMERA_TIMEOUT_MS)
    cap.set(cv2.CAP_PROP_READ_TIMEOUT_MSEC, cfg.CAMERA_TIMEOUT_MS)

    if not cap.isOpened():
        logger.error("Could not open RTSP stream: %s", _redact(url))
        return None
    try:
        ok, frame = cap.read()
        if not ok or frame is None:
            logger.error("Failed to read frame from %s", _redact(url))
            return None
        return frame
    finally:
        cap.release()


def _redact(url: str) -> str:
    """Replace password in RTSP URL for safe logging."""
    return re.sub(r"(://[^:]+:)[^@]+(@)", r"\1***\2", url)


# ---------------------------------------------------------------------------
# Annotation
# ---------------------------------------------------------------------------


def annotate_image(image: np.ndarray, detections: list[dict]) -> np.ndarray:
    """Draw bounding boxes and labels on a copy of the image."""
    annotated = image.copy()
    for det in detections:
        x1, y1, x2, y2 = [int(v) for v in det["bbox"]]
        label = f"{det['class_name']} {det['confidence']:.0%}"
        cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 255, 0), 2)
        cv2.putText(
            annotated, label, (x1, y1 - 8),
            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2,
        )
    return annotated


# ---------------------------------------------------------------------------
# Multi-camera mode
# ---------------------------------------------------------------------------


def load_cameras_json() -> list[dict]:
    """Load camera list from CAMERAS_JSON env var (inline JSON or file path)."""
    raw = os.environ.get("CAMERAS_JSON", "").strip()
    if not raw:
        return []

    text = raw
    if not raw.startswith("["):
        p = Path(raw)
        if not p.is_file():
            logger.warning("CAMERAS_JSON path not found: %s", p)
            return []
        text = p.read_text()

    try:
        cameras = json.loads(text)
    except json.JSONDecodeError as exc:
        logger.error("Invalid CAMERAS_JSON: %s", exc)
        return []

    if not isinstance(cameras, list):
        return []

    user = os.environ.get("CAMERA_USER", "")
    passwd = os.environ.get("CAMERA_PASS", "")
    for entry in cameras:
        if "url" in entry:
            entry["url"] = entry["url"].replace("${CAMERA_USER}", user)
            entry["url"] = entry["url"].replace("${CAMERA_PASS}", passwd)
    return [e for e in cameras if "url" in e]


def run_all_cameras(detector: VehicleDetector) -> bool:
    """Detect vehicles on every configured RTSP camera. Returns True if any found."""
    cameras = load_cameras_json()
    if not cameras:
        logger.error("No cameras configured. Set CAMERAS_JSON env var.")
        return False

    any_detected = False
    for cam in cameras:
        cam_id = cam.get("id", cam["url"])
        name = cam.get("name", cam_id)
        logger.info("--- %s ---", name)

        frame = grab_rtsp_frame(cam["url"])
        if frame is None:
            continue

        detections = detector.detect(frame)
        _print_detections(detections, name)

        if detections:
            any_detected = True
            out_path = f"{cam_id}_detected.jpg"
            annotated = annotate_image(frame, detections)
            cv2.imwrite(out_path, annotated)
            logger.info("Saved annotated image: %s", out_path)

    return any_detected


# ---------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------


def _print_detections(detections: list[dict], source: str = "") -> None:
    prefix = f"[{source}] " if source else ""
    if not detections:
        print(f"{prefix}No vehicles detected.")
        return
    print(f"{prefix}Detected {len(detections)} vehicle(s):")
    for d in detections:
        print(f"  {d['class_name']:>12s}  conf={d['confidence']:.0%}  "
              f"bbox=[{d['bbox'][0]:.0f}, {d['bbox'][1]:.0f}, "
              f"{d['bbox'][2]:.0f}, {d['bbox'][3]:.0f}]")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description="Detect vehicles in tunnel camera images using YOLOv8 (ONNX).",
    )
    p.add_argument(
        "image", nargs="?", default=None,
        help="Path to an image file to analyse",
    )
    p.add_argument(
        "--rtsp", metavar="URL",
        help="Grab a single frame from an RTSP URL and detect",
    )
    p.add_argument(
        "--all-cameras", action="store_true",
        help="Detect on every camera in CAMERAS_JSON",
    )
    p.add_argument(
        "--model", default=cfg.YOLO_MODEL,
        help=f"Path to ONNX model (default: {cfg.YOLO_MODEL})",
    )
    p.add_argument(
        "--confidence", type=float, default=None,
        help=f"Minimum detection confidence (default: {cfg.DETECTION_CONFIDENCE})",
    )
    p.add_argument(
        "--output", "-o", default=None,
        help="Output path for annotated image (default: <input>_detected.jpg)",
    )
    return p


def main() -> int:
    args = build_parser().parse_args()

    logger.info("Loading ONNX model: %s", args.model)
    detector = VehicleDetector(args.model)

    if args.all_cameras:
        found = run_all_cameras(detector)
        return 0 if found else 1

    if args.rtsp:
        logger.info("Grabbing frame from %s", _redact(args.rtsp))
        image = grab_rtsp_frame(args.rtsp)
        if image is None:
            return 1
        source_name = _redact(args.rtsp)
        out_path = args.output or "rtsp_detected.jpg"
    elif args.image:
        image = load_image(args.image)
        source_name = args.image
        stem = Path(args.image).stem
        out_path = args.output or f"{stem}_detected.jpg"
    else:
        build_parser().print_help()
        return 1

    detections = detector.detect(image, confidence=args.confidence)
    _print_detections(detections, source_name)

    if detections:
        annotated = annotate_image(image, detections)
        cv2.imwrite(out_path, annotated)
        logger.info("Saved annotated image: %s", out_path)

    return 0 if detections else 1


if __name__ == "__main__":
    sys.exit(main())
