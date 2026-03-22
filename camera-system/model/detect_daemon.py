#!/usr/bin/env python3
"""
Tunnel vehicle detection and burst-capture daemon.

Continuously watches RTSP cameras for vehicles. When a vehicle is detected,
switches to burst-capture mode — grabbing frames from ALL cameras at ~1 fps
for full front/side/rear coverage as the car drives through.

State machine (global):
    SCANNING ──(vehicle on any cam)──▶ BURST ──(done/timeout)──▶ COOLDOWN ──▶ SCANNING
"""

from __future__ import annotations

import json
import logging
import os
import re
import signal
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum, auto
from pathlib import Path
from typing import Any

import cv2
import numpy as np
import onnxruntime as ort

import config as cfg

try:
    from systemd.daemon import notify as sd_notify  # type: ignore[import-untyped]
except ImportError:
    def sd_notify(status: str) -> None:  # type: ignore[misc]
        pass

logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("tunnel-detect")

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

SCAN_INTERVAL: float = float(os.environ.get("SCAN_INTERVAL", "3"))
COOLDOWN_SECONDS: float = float(os.environ.get("COOLDOWN_SECONDS", "30"))
EVENT_OUTPUT_DIR: str = os.environ.get("EVENT_OUTPUT_DIR", "/data/tunnel/events")
WEBHOOK_URL: str = os.environ.get("WEBHOOK_URL", "")
TRIGGER_CAMERA_IDS: list[str] = (
    json.loads(os.environ["TRIGGER_CAMERA_IDS"])
    if os.environ.get("TRIGGER_CAMERA_IDS")
    else []
)

BURST_INTERVAL: float = float(os.environ.get("BURST_INTERVAL", "1.0"))
BURST_MAX_DURATION: float = float(os.environ.get("BURST_MAX_DURATION", "15"))
BURST_EXIT_MISSES: int = int(os.environ.get("BURST_EXIT_MISSES", "3"))


# ---------------------------------------------------------------------------
# Camera data
# ---------------------------------------------------------------------------

@dataclass
class CameraInfo:
    cam_id: str
    url: str
    name: str


# ---------------------------------------------------------------------------
# ONNX detector
# ---------------------------------------------------------------------------

COCO_VEHICLE_NAMES = {2: "car", 3: "motorcycle", 5: "bus", 7: "truck"}
INPUT_SIZE = 640


class VehicleDetector:
    """YOLOv8 ONNX model for vehicle detection."""

    def __init__(self, model_path: str):
        self._session = ort.InferenceSession(
            model_path, providers=["CPUExecutionProvider"]
        )
        meta = self._session.get_inputs()[0]
        self._input_name = meta.name
        logger.info("Loaded ONNX model: %s", model_path)

    def _preprocess(self, image: np.ndarray) -> tuple[np.ndarray, float, int, int]:
        h, w = image.shape[:2]
        scale = min(INPUT_SIZE / h, INPUT_SIZE / w)
        new_w, new_h = int(w * scale), int(h * scale)
        resized = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_LINEAR)
        canvas = np.full((INPUT_SIZE, INPUT_SIZE, 3), 114, dtype=np.uint8)
        pad_y, pad_x = (INPUT_SIZE - new_h) // 2, (INPUT_SIZE - new_w) // 2
        canvas[pad_y : pad_y + new_h, pad_x : pad_x + new_w] = resized
        blob = canvas.astype(np.float32) / 255.0
        blob = blob.transpose(2, 0, 1)[np.newaxis]
        return blob, scale, pad_x, pad_y

    def detect(self, image: np.ndarray, confidence: float | None = None) -> list[dict]:
        conf = confidence or cfg.DETECTION_CONFIDENCE
        blob, scale, pad_x, pad_y = self._preprocess(image)
        outputs = self._session.run(None, {self._input_name: blob})
        return self._postprocess(outputs[0], scale, pad_x, pad_y, conf)

    def _postprocess(
        self, preds: np.ndarray, scale: float,
        pad_x: int, pad_y: int, conf_thresh: float,
    ) -> list[dict]:
        preds = preds[0].T
        cx, cy, w, h = preds[:, 0], preds[:, 1], preds[:, 2], preds[:, 3]
        class_scores = preds[:, 4:]
        class_ids = class_scores.argmax(axis=1)
        confidences = class_scores[np.arange(len(class_ids)), class_ids]

        mask = confidences >= conf_thresh
        cx, cy, w, h = cx[mask], cy[mask], w[mask], h[mask]
        class_ids, confidences = class_ids[mask], confidences[mask]
        if len(confidences) == 0:
            return []

        x1, y1 = (cx - w / 2 - pad_x) / scale, (cy - h / 2 - pad_y) / scale
        x2, y2 = (cx + w / 2 - pad_x) / scale, (cy + h / 2 - pad_y) / scale
        boxes = np.stack([x1, y1, x2, y2], axis=1).astype(np.float32)
        scores = confidences.astype(np.float32)

        indices = cv2.dnn.NMSBoxes(boxes.tolist(), scores.tolist(), conf_thresh, 0.45)
        if len(indices) == 0:
            return []

        detections: list[dict] = []
        for i in indices.flatten():
            cls_id = int(class_ids[i])
            if cls_id not in cfg.VEHICLE_CLASSES:
                continue
            detections.append({
                "class_id": cls_id,
                "class_name": COCO_VEHICLE_NAMES.get(cls_id, f"class_{cls_id}"),
                "confidence": round(float(scores[i]), 3),
                "bbox": [round(float(v), 1) for v in boxes[i]],
            })
        return detections


# ---------------------------------------------------------------------------
# Frame grabber
# ---------------------------------------------------------------------------


def grab_frame(url: str) -> np.ndarray | None:
    os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"
    cap = cv2.VideoCapture(url, cv2.CAP_FFMPEG)
    cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, cfg.CAMERA_TIMEOUT_MS)
    cap.set(cv2.CAP_PROP_READ_TIMEOUT_MSEC, cfg.CAMERA_TIMEOUT_MS)
    if not cap.isOpened():
        return None
    try:
        ok, frame = cap.read()
        return frame if ok else None
    finally:
        cap.release()


def grab_frames_parallel(cameras: list[CameraInfo]) -> dict[str, np.ndarray | None]:
    """Grab one frame from each camera concurrently."""
    results: dict[str, np.ndarray | None] = {}
    with ThreadPoolExecutor(max_workers=len(cameras)) as pool:
        futures = {
            pool.submit(grab_frame, cam.url): cam for cam in cameras
        }
        for fut in as_completed(futures):
            cam = futures[fut]
            try:
                results[cam.cam_id] = fut.result()
            except Exception:
                results[cam.cam_id] = None
    return results


def _redact(url: str) -> str:
    return re.sub(r"(://[^:]+:)[^@]+(@)", r"\1***\2", url)


# ---------------------------------------------------------------------------
# Scan event — aggregates all data for one car transit
# ---------------------------------------------------------------------------

@dataclass
class BurstFrame:
    """A single captured frame within a burst."""
    camera_id: str
    frame_index: int
    path: Path
    detections: list[dict]
    timestamp: str


@dataclass
class ScanEvent:
    """All data captured during a single car transit."""
    event_id: str
    trigger_camera: str
    trigger_detections: list[dict]
    start_time: str
    end_time: str = ""
    frames: list[BurstFrame] = field(default_factory=list)
    license_plate: str = ""
    total_vehicles_seen: int = 0

    @property
    def event_dir(self) -> Path:
        return Path(EVENT_OUTPUT_DIR) / self.event_id

    def to_dict(self) -> dict[str, Any]:
        return {
            "event_type": "vehicle_scan",
            "event_id": self.event_id,
            "trigger_camera": self.trigger_camera,
            "trigger_detections": self.trigger_detections,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "license_plate": self.license_plate,
            "total_frames": len(self.frames),
            "total_vehicles_seen": self.total_vehicles_seen,
            "cameras": self._frames_by_camera(),
        }

    def _frames_by_camera(self) -> dict[str, list[dict]]:
        by_cam: dict[str, list[dict]] = {}
        for f in self.frames:
            by_cam.setdefault(f.camera_id, []).append({
                "frame_index": f.frame_index,
                "path": str(f.path),
                "detections": f.detections,
                "timestamp": f.timestamp,
            })
        return by_cam


# ---------------------------------------------------------------------------
# Burst capture
# ---------------------------------------------------------------------------


def burst_capture(
    detector: VehicleDetector,
    cameras: list[CameraInfo],
    scan: ScanEvent,
) -> None:
    """
    Capture frames from all cameras at ~1fps until the vehicle leaves
    or BURST_MAX_DURATION is reached.
    """
    scan.event_dir.mkdir(parents=True, exist_ok=True)
    for cam in cameras:
        (scan.event_dir / cam.cam_id).mkdir(exist_ok=True)

    frame_counter = 0
    consecutive_empty = 0
    burst_start = time.monotonic()

    logger.info(
        "BURST START  event=%s  cameras=%d  max_duration=%.0fs",
        scan.event_id, len(cameras), BURST_MAX_DURATION,
    )

    while not _shutdown:
        cycle_start = time.monotonic()
        elapsed = cycle_start - burst_start

        if elapsed >= BURST_MAX_DURATION:
            logger.info("Burst max duration reached (%.0fs)", elapsed)
            break

        frames = grab_frames_parallel(cameras)
        any_vehicle = False

        for cam in cameras:
            frame = frames.get(cam.cam_id)
            if frame is None:
                continue

            detections = detector.detect(frame)
            if detections:
                any_vehicle = True
                scan.total_vehicles_seen += 1

            fname = f"frame_{frame_counter:04d}.jpg"
            fpath = scan.event_dir / cam.cam_id / fname
            cv2.imwrite(str(fpath), frame)

            scan.frames.append(BurstFrame(
                camera_id=cam.cam_id,
                frame_index=frame_counter,
                path=fpath,
                detections=detections,
                timestamp=datetime.now(timezone.utc).isoformat(),
            ))

        frame_counter += 1

        if any_vehicle:
            consecutive_empty = 0
        else:
            consecutive_empty += 1
            if consecutive_empty >= BURST_EXIT_MISSES:
                logger.info(
                    "Vehicle left all cameras (%d empty cycles)", consecutive_empty
                )
                break

        cycle_elapsed = time.monotonic() - cycle_start
        sleep = max(0, BURST_INTERVAL - cycle_elapsed)
        if sleep > 0:
            time.sleep(sleep)

    scan.end_time = datetime.now(timezone.utc).isoformat()
    logger.info(
        "BURST END  event=%s  frames=%d  duration=%.1fs",
        scan.event_id, len(scan.frames),
        time.monotonic() - burst_start,
    )


# ---------------------------------------------------------------------------
# Post-burst processing hooks
# ---------------------------------------------------------------------------


def _try_read_plate(scan: ScanEvent) -> None:
    """Attempt license plate recognition on captured frames."""
    try:
        from plate_reader import read_plate_from_scan
        plate = read_plate_from_scan(scan.event_dir, scan.frames)
        if plate:
            scan.license_plate = plate
            logger.info("License plate: %s", plate)
    except ImportError:
        logger.debug("plate_reader not available, skipping LPR")
    except Exception:
        logger.exception("Plate reader failed")


def _try_upload_to_s3(scan: ScanEvent) -> None:
    """Upload burst images to S3 if configured."""
    try:
        from scan_uploader import upload_scan
        upload_scan(scan)
    except ImportError:
        logger.debug("scan_uploader not available, skipping S3 upload")
    except Exception:
        logger.exception("S3 upload failed")


def _try_save_results(scan: ScanEvent) -> None:
    """Save structured scan results."""
    try:
        from scan_results import save_scan_result
        save_scan_result(scan.to_dict())
    except ImportError:
        logger.debug("scan_results not available, skipping")
    except Exception:
        logger.exception("Save results failed")


def _try_generate_viewer(scan: ScanEvent) -> None:
    """Generate 360 viewer HTML."""
    try:
        from viewer_360 import generate_viewer
        generate_viewer(scan.event_dir, scan.to_dict())
    except ImportError:
        logger.debug("viewer_360 not available, skipping")
    except Exception:
        logger.exception("Viewer generation failed")


# ---------------------------------------------------------------------------
# Event handler — orchestrates the full scan pipeline
# ---------------------------------------------------------------------------


def handle_vehicle_entry(
    detector: VehicleDetector,
    cameras: list[CameraInfo],
    trigger_cam: CameraInfo,
    trigger_detections: list[dict],
    trigger_frame: np.ndarray,
) -> ScanEvent:
    """Full pipeline when a vehicle is first detected."""
    now = datetime.now(timezone.utc)
    event_id = f"scan_{now.strftime('%Y%m%d_%H%M%S')}"

    scan = ScanEvent(
        event_id=event_id,
        trigger_camera=trigger_cam.cam_id,
        trigger_detections=trigger_detections,
        start_time=now.isoformat(),
    )

    logger.info(
        "VEHICLE ENTRY  camera=%s  vehicles=%d  top_conf=%.0f%%  event=%s",
        trigger_cam.name,
        len(trigger_detections),
        max(d["confidence"] for d in trigger_detections) * 100,
        event_id,
    )

    # Save the trigger frame as frame_0000
    scan.event_dir.mkdir(parents=True, exist_ok=True)
    (scan.event_dir / trigger_cam.cam_id).mkdir(exist_ok=True)
    trigger_path = scan.event_dir / trigger_cam.cam_id / "frame_0000.jpg"
    cv2.imwrite(str(trigger_path), trigger_frame)
    scan.frames.append(BurstFrame(
        camera_id=trigger_cam.cam_id,
        frame_index=0,
        path=trigger_path,
        detections=trigger_detections,
        timestamp=now.isoformat(),
    ))

    # Burst capture from all cameras
    burst_capture(detector, cameras, scan)

    # Post-burst pipeline
    _try_read_plate(scan)
    _try_upload_to_s3(scan)
    _try_save_results(scan)
    _try_generate_viewer(scan)

    # Save event metadata
    meta_path = scan.event_dir / "event.json"
    meta_path.write_text(json.dumps(scan.to_dict(), indent=2))
    logger.info("Scan complete: %s  frames=%d  plate=%s",
                event_id, len(scan.frames), scan.license_plate or "unknown")

    _post_webhook(scan.to_dict())
    return scan


def _post_webhook(event: dict) -> None:
    if not WEBHOOK_URL:
        return
    try:
        import urllib.request
        data = json.dumps(event).encode()
        req = urllib.request.Request(
            WEBHOOK_URL, data=data,
            headers={"Content-Type": "application/json"}, method="POST",
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            logger.info("Webhook response: %d", resp.status)
    except Exception:
        logger.exception("Webhook POST failed")


# ---------------------------------------------------------------------------
# Camera config loader
# ---------------------------------------------------------------------------


def load_cameras() -> list[CameraInfo]:
    raw = os.environ.get("CAMERAS_JSON", "").strip()
    if not raw:
        logger.error("CAMERAS_JSON not set")
        sys.exit(1)

    text = raw if raw.startswith("[") else Path(raw).read_text()
    cameras = json.loads(text)

    user = os.environ.get("CAMERA_USER", "")
    passwd = os.environ.get("CAMERA_PASS", "")

    infos: list[CameraInfo] = []
    for entry in cameras:
        url = entry.get("url", "")
        if not url:
            continue
        url = url.replace("${CAMERA_USER}", user).replace("${CAMERA_PASS}", passwd)
        cam_id = entry.get("id", f"cam_{len(infos)}")
        name = entry.get("name", cam_id)
        infos.append(CameraInfo(cam_id=cam_id, url=url, name=name))

    logger.info("Loaded %d camera(s)", len(infos))
    for c in infos:
        logger.info("  %s  %s", c.cam_id, _redact(c.url))
    return infos


# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------

_shutdown = False


def _handle_signal(signum: int, _frame: Any) -> None:
    global _shutdown
    logger.info("Received signal %d, shutting down gracefully…", signum)
    _shutdown = True


class DaemonState(Enum):
    SCANNING = auto()
    COOLDOWN = auto()


def run(detector: VehicleDetector, cameras: list[CameraInfo]) -> None:
    """Main loop: scan → detect → burst-capture → cooldown → repeat."""
    trigger_cams = cameras
    if TRIGGER_CAMERA_IDS:
        trigger_set = set(TRIGGER_CAMERA_IDS)
        trigger_cams = [c for c in cameras if c.cam_id in trigger_set]

    logger.info(
        "Daemon started  scan=%.1fs  cooldown=%.0fs  burst=%.0fs@%.1ffps  triggers=%s",
        SCAN_INTERVAL, COOLDOWN_SECONDS, BURST_MAX_DURATION, 1 / BURST_INTERVAL,
        [c.cam_id for c in trigger_cams],
    )
    sd_notify("READY=1")

    state = DaemonState.SCANNING
    cooldown_until = 0.0

    while not _shutdown:
        cycle_start = time.monotonic()

        if state == DaemonState.COOLDOWN:
            if time.monotonic() >= cooldown_until:
                state = DaemonState.SCANNING
                logger.info("Cooldown expired → SCANNING")
            else:
                sd_notify("WATCHDOG=1")
                time.sleep(min(1.0, cooldown_until - time.monotonic()))
                continue

        # Scan trigger cameras for vehicles
        for cam in trigger_cams:
            if _shutdown:
                break

            frame = grab_frame(cam.url)
            if frame is None:
                continue

            detections = detector.detect(frame)
            if detections:
                handle_vehicle_entry(
                    detector, cameras, cam, detections, frame,
                )
                state = DaemonState.COOLDOWN
                cooldown_until = time.monotonic() + COOLDOWN_SECONDS
                break

        sd_notify("WATCHDOG=1")
        elapsed = time.monotonic() - cycle_start
        sleep_time = max(0, SCAN_INTERVAL - elapsed)
        if sleep_time > 0 and not _shutdown and state == DaemonState.SCANNING:
            time.sleep(sleep_time)

    sd_notify("STOPPING=1")
    logger.info("Daemon stopped.")


def main() -> None:
    signal.signal(signal.SIGTERM, _handle_signal)
    signal.signal(signal.SIGINT, _handle_signal)

    Path(EVENT_OUTPUT_DIR).mkdir(parents=True, exist_ok=True)

    model_path = cfg.YOLO_MODEL
    logger.info("Loading model: %s", model_path)
    detector = VehicleDetector(model_path)

    cameras = load_cameras()
    if not cameras:
        logger.error("No cameras to watch. Exiting.")
        sys.exit(1)

    run(detector, cameras)


if __name__ == "__main__":
    main()
