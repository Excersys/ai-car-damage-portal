"""
Multi-camera capture orchestrator.
Captures from all discovered cameras concurrently, compresses images,
and saves them to local storage.
"""

from __future__ import annotations

import logging
import os
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

import cv2

import config
from camera_discover import CameraInfo, discover_all

logger = logging.getLogger(__name__)


@dataclass
class CaptureResult:
    """Result of a single camera capture."""

    camera_id: str
    local_path: Path
    timestamp: str
    size_bytes: int = 0
    success: bool = True
    error: str = ""


def generate_event_id() -> str:
    """Generate a unique event identifier."""
    return uuid.uuid4().hex[:16]


def _compress_image(raw_frame, output_path: Path) -> int:
    """Resize and compress a captured frame. Returns file size in bytes."""
    h, w = raw_frame.shape[:2]
    max_dim = config.IMAGE_MAX_DIMENSION
    if max(h, w) > max_dim:
        scale = max_dim / max(h, w)
        new_w, new_h = int(w * scale), int(h * scale)
        raw_frame = cv2.resize(
            raw_frame, (new_w, new_h), interpolation=cv2.INTER_AREA
        )

    params = [cv2.IMWRITE_JPEG_QUALITY, config.IMAGE_JPEG_QUALITY]
    cv2.imwrite(str(output_path), raw_frame, params)
    return output_path.stat().st_size


def _capture_usb(device: str, output_path: Path) -> tuple[bool, int, str]:
    """Capture and compress one frame from a V4L2 USB camera."""
    cap = cv2.VideoCapture(device)
    if not cap.isOpened():
        return False, 0, f"Could not open {device}"
    try:
        ok, frame = cap.read()
        if not ok or frame is None:
            return False, 0, "Failed to read frame"
        size = _compress_image(frame, output_path)
        return True, size, ""
    except Exception as exc:
        return False, 0, str(exc)
    finally:
        cap.release()


def _capture_rtsp(url: str, output_path: Path) -> tuple[bool, int, str]:
    """Capture and compress one frame from a network RTSP camera."""
    timeout_ms = config.CAMERA_TIMEOUT_MS
    transport = config.RTSP_TRANSPORT

    os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = f"rtsp_transport;{transport}"
    cap = cv2.VideoCapture(url, cv2.CAP_FFMPEG)
    cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, timeout_ms)
    cap.set(cv2.CAP_PROP_READ_TIMEOUT_MSEC, timeout_ms)

    if not cap.isOpened():
        return False, 0, f"Could not open RTSP stream: {config._redact_url(url)}"
    try:
        ok, frame = cap.read()
        if not ok or frame is None:
            return False, 0, "Failed to read RTSP frame"
        size = _compress_image(frame, output_path)
        return True, size, ""
    except Exception as exc:
        return False, 0, str(exc)
    finally:
        cap.release()


def _capture_csi(output_path: Path) -> tuple[bool, int, str]:
    """Capture and compress one frame from Raspberry Pi CSI camera."""
    try:
        from picamera2 import Picamera2
    except ImportError:
        return False, 0, "picamera2 not installed"

    picam2 = Picamera2()
    picam2.start()
    try:
        frame = picam2.capture_array()
        size = _compress_image(frame, output_path)
        return True, size, ""
    except Exception as exc:
        return False, 0, str(exc)
    finally:
        picam2.stop()


def _capture_single(camera: CameraInfo, output_path: Path) -> CaptureResult:
    """Capture from a single camera and return the result."""
    camera_id = f"{camera.kind}_{camera.index}"
    ts = datetime.now(timezone.utc).isoformat()
    output_path.parent.mkdir(parents=True, exist_ok=True)

    if camera.kind == "rtsp":
        ok, size, err = _capture_rtsp(camera.device, output_path)
    elif camera.kind == "usb":
        ok, size, err = _capture_usb(camera.device, output_path)
    elif camera.kind == "csi":
        ok, size, err = _capture_csi(output_path)
    else:
        ok, size, err = False, 0, f"Unknown camera kind: {camera.kind}"

    result = CaptureResult(
        camera_id=camera_id,
        local_path=output_path,
        timestamp=ts,
        size_bytes=size,
        success=ok,
        error=err,
    )

    if ok:
        logger.info("Captured %s -> %s (%d bytes)", camera_id, output_path, size)
    else:
        logger.error("Capture failed for %s: %s", camera_id, err)

    return result


def capture_all(
    event_id: str, cameras: list[CameraInfo] | None = None
) -> list[CaptureResult]:
    """
    Capture from all discovered cameras concurrently.

    Images saved to: {LOCAL_STORAGE_PATH}/{event_id}/{camera_id}.jpg
    """
    if cameras is None:
        cameras = discover_all()

    if not cameras:
        logger.warning("No cameras discovered -- nothing to capture")
        return []

    base = config.LOCAL_STORAGE_PATH / event_id
    base.mkdir(parents=True, exist_ok=True)

    results: list[CaptureResult] = []

    with ThreadPoolExecutor(max_workers=len(cameras)) as pool:
        futures = {}
        for cam in cameras:
            camera_id = f"{cam.kind}_{cam.index}"
            out_path = base / f"{camera_id}.jpg"
            futures[pool.submit(_capture_single, cam, out_path)] = camera_id

        for future in as_completed(futures):
            try:
                results.append(future.result())
            except Exception as exc:
                cid = futures[future]
                logger.error("Unexpected error capturing %s: %s", cid, exc)
                results.append(
                    CaptureResult(
                        camera_id=cid,
                        local_path=base / f"{cid}.jpg",
                        timestamp=datetime.now(timezone.utc).isoformat(),
                        success=False,
                        error=str(exc),
                    )
                )

    succeeded = sum(1 for r in results if r.success)
    logger.info(
        "Capture complete for event %s: %d/%d succeeded",
        event_id,
        succeeded,
        len(results),
    )
    return results
