#!/usr/bin/env python3
"""
Discover cameras available on the system.

Supported kinds:
  - "rtsp"  -- Network IP cameras configured via CAMERAS_JSON
  - "usb"   -- Local V4L2 devices under /dev/video*
  - "csi"   -- Raspberry Pi CSI camera via picamera2
"""

from __future__ import annotations

import logging
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

import config

logger = logging.getLogger(__name__)


@dataclass
class CameraInfo:
    """Info for a single camera."""

    kind: str   # "usb", "csi", or "rtsp"
    device: str  # /dev/video0, "csi", or rtsp://... URL
    name: str
    index: int


# ---------------------------------------------------------------------------
# RTSP (network) cameras
# ---------------------------------------------------------------------------


def discover_rtsp_cameras() -> list[CameraInfo]:
    """
    Build CameraInfo list from the CAMERAS_JSON configuration.

    Each entry in the JSON array must have at least a ``url`` key.
    Optional keys: ``id`` (used for camera_id), ``name`` (human label).
    """
    entries = config.load_cameras_json()
    cameras: list[CameraInfo] = []
    for idx, entry in enumerate(entries):
        cam_id = entry.get("id", f"cam_{idx}")
        name = entry.get("name", cam_id)
        url = entry["url"]
        cameras.append(
            CameraInfo(kind="rtsp", device=url, name=name, index=idx)
        )
        logger.debug(
            "RTSP camera configured: %s @ %s", name, config._redact_url(url)
        )
    return cameras


# ---------------------------------------------------------------------------
# USB (V4L2) cameras
# ---------------------------------------------------------------------------


def discover_v4l2_cameras() -> list[CameraInfo]:
    """Find USB (V4L2) cameras under /dev/video*."""
    cameras: list[CameraInfo] = []
    dev = Path("/dev")
    for p in sorted(dev.glob("video*")):
        if not p.is_block_device() and not p.is_char_device():
            continue
        name = p.name
        try:
            idx = int("".join(c for c in name if c.isdigit()))
        except ValueError:
            idx = 0
        cameras.append(
            CameraInfo(kind="usb", device=str(p), name=name, index=idx)
        )
    return cameras


def get_v4l2_device_name(device_path: str) -> str:
    """Get human-readable name for a V4L2 device (e.g. via v4l2-ctl)."""
    try:
        out = subprocess.run(
            ["v4l2-ctl", "--device", device_path, "--info"],
            capture_output=True,
            text=True,
            timeout=2,
        )
        if out.returncode != 0:
            return device_path
        for line in out.stdout.splitlines():
            if "Card type" in line or "Driver name" in line:
                return line.split(":", 1)[-1].strip() or device_path
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass
    return device_path


# ---------------------------------------------------------------------------
# CSI camera
# ---------------------------------------------------------------------------


def discover_csi_camera() -> CameraInfo | None:
    """Detect Raspberry Pi CSI camera if present and supported."""
    try:
        import picamera2  # noqa: F401
    except ImportError:
        return None
    return CameraInfo(kind="csi", device="csi", name="Raspberry Pi CSI", index=0)


# ---------------------------------------------------------------------------
# Aggregate discovery
# ---------------------------------------------------------------------------


def discover_all() -> list[CameraInfo]:
    """
    Return all discovered cameras.

    Priority: RTSP (network) first, then USB, then CSI.
    When RTSP cameras are configured they are the primary source; USB/CSI
    are still included so mixed setups work out of the box.
    """
    cameras: list[CameraInfo] = []
    cameras.extend(discover_rtsp_cameras())
    cameras.extend(discover_v4l2_cameras())
    csi = discover_csi_camera()
    if csi:
        cameras.append(csi)
    return cameras


def main() -> int:
    """Print discovered cameras and exit."""
    cameras = discover_all()
    if not cameras:
        print("No cameras found.", file=sys.stderr)
        print(
            "RTSP: set CAMERAS_JSON env var.  "
            "USB: ensure /dev/video* exists (v4l2).  "
            "CSI: enable in raspi-config and install picamera2.",
            file=sys.stderr,
        )
        return 1
    for c in cameras:
        if c.kind == "usb":
            extra = f" ({get_v4l2_device_name(c.device)})"
        elif c.kind == "rtsp":
            extra = f" ({config._redact_url(c.device)})"
        else:
            extra = ""
        print(f"{c.kind.upper()}\t{c.device if c.kind != 'rtsp' else config._redact_url(c.device)}\t{c.name}{extra}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
