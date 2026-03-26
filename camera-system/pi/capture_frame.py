#!/usr/bin/env python3
"""
Capture a single frame from the first available camera (RTSP, USB, or CSI).
Usage: python capture_frame.py [output_path]
Default output: frame.png in current directory.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import config
from camera_discover import discover_all


def capture_rtsp(url: str, output_path: Path) -> bool:
    """Capture one frame from a network RTSP camera using OpenCV."""
    try:
        import cv2
    except ImportError:
        print("Install opencv: pip install opencv-python-headless", file=sys.stderr)
        return False

    os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = f"rtsp_transport;{config.RTSP_TRANSPORT}"
    cap = cv2.VideoCapture(url, cv2.CAP_FFMPEG)
    cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, config.CAMERA_TIMEOUT_MS)
    cap.set(cv2.CAP_PROP_READ_TIMEOUT_MSEC, config.CAMERA_TIMEOUT_MS)

    if not cap.isOpened():
        print(f"Could not open RTSP stream: {config._redact_url(url)}", file=sys.stderr)
        return False
    try:
        ok, frame = cap.read()
        if not ok or frame is None:
            print("Failed to read RTSP frame", file=sys.stderr)
            return False
        return cv2.imwrite(str(output_path), frame)
    finally:
        cap.release()


def capture_usb(device: str, output_path: Path) -> bool:
    """Capture one frame from a V4L2 USB camera using OpenCV."""
    try:
        import cv2
    except ImportError:
        print("Install opencv: pip install opencv-python-headless", file=sys.stderr)
        return False
    cap = cv2.VideoCapture(device)
    if not cap.isOpened():
        print(f"Could not open {device}", file=sys.stderr)
        return False
    try:
        ok, frame = cap.read()
        if not ok or frame is None:
            print("Failed to read frame", file=sys.stderr)
            return False
        return cv2.imwrite(str(output_path), frame)
    finally:
        cap.release()


def capture_csi(output_path: Path) -> bool:
    """Capture one frame from Raspberry Pi CSI camera."""
    try:
        from picamera2 import Picamera2
    except ImportError:
        print("Install picamera2 on Pi for CSI: pip install picamera2", file=sys.stderr)
        return False
    picam2 = Picamera2()
    picam2.start()
    try:
        picam2.capture_file(str(output_path))
        return True
    except Exception as e:
        print(f"CSI capture failed: {e}", file=sys.stderr)
        return False
    finally:
        picam2.stop()


def main() -> int:
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("frame.png")
    cameras = discover_all()
    if not cameras:
        print("No cameras found. Run camera_discover.py to debug.", file=sys.stderr)
        return 1
    cam = cameras[0]
    ok = False
    if cam.kind == "rtsp":
        ok = capture_rtsp(cam.device, out)
    elif cam.kind == "usb":
        ok = capture_usb(cam.device, out)
    elif cam.kind == "csi":
        ok = capture_csi(out)
    if not ok:
        return 1
    print(f"Saved: {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
