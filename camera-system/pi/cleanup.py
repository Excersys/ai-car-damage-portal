#!/usr/bin/env python3
"""
Local storage cleanup for the Pi edge layer.

Deletes local image files after they've been successfully uploaded to S3,
and removes old event directories that exceed the retention period.

Run via cron or systemd timer:
    */30 * * * * /home/pi/camera-system/pi/.venv/bin/python3 /home/pi/camera-system/pi/cleanup.py

Environment:
    LOCAL_STORAGE_PATH  — base image directory (default: /data/tunnel/images)
    CLEANUP_MAX_AGE_H   — delete events older than N hours (default: 24)
    CLEANUP_MAX_DISK_MB — trigger aggressive cleanup above this (default: 2000)
    CLEANUP_DRY_RUN     — set "true" to log without deleting
"""

from __future__ import annotations

import logging
import os
import shutil
import time
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] cleanup: %(message)s",
)
logger = logging.getLogger(__name__)

LOCAL_STORAGE_PATH = Path(os.environ.get("LOCAL_STORAGE_PATH", "/data/tunnel/images"))
EVENTS_PATH = Path(os.environ.get("EVENTS_PATH", "/data/tunnel/events"))
MAX_AGE_HOURS = int(os.environ.get("CLEANUP_MAX_AGE_H", "24"))
MAX_DISK_MB = int(os.environ.get("CLEANUP_MAX_DISK_MB", "2000"))
DRY_RUN = os.environ.get("CLEANUP_DRY_RUN", "").lower() in ("true", "1", "yes")


def dir_size_mb(path: Path) -> float:
    """Return total size of a directory in MB."""
    total = sum(f.stat().st_size for f in path.rglob("*") if f.is_file())
    return total / (1024 * 1024)


def cleanup_uploaded_images() -> int:
    """Delete local image dirs where all frames have been uploaded (dir older than 1 hour)."""
    if not LOCAL_STORAGE_PATH.exists():
        return 0

    removed = 0
    cutoff = time.time() - 3600  # 1 hour grace period

    for event_dir in LOCAL_STORAGE_PATH.iterdir():
        if not event_dir.is_dir():
            continue

        # Skip recent events (still might be uploading)
        try:
            mtime = event_dir.stat().st_mtime
        except OSError:
            continue

        if mtime > cutoff:
            continue

        if DRY_RUN:
            logger.info("[DRY RUN] Would remove uploaded event dir: %s", event_dir.name)
        else:
            shutil.rmtree(event_dir, ignore_errors=True)
            logger.info("Removed uploaded event dir: %s", event_dir.name)
        removed += 1

    return removed


def cleanup_old_events() -> int:
    """Delete detect_daemon event directories older than MAX_AGE_HOURS."""
    if not EVENTS_PATH.exists():
        return 0

    removed = 0
    cutoff = time.time() - (MAX_AGE_HOURS * 3600)

    for event_dir in EVENTS_PATH.iterdir():
        if not event_dir.is_dir():
            continue

        try:
            mtime = event_dir.stat().st_mtime
        except OSError:
            continue

        if mtime > cutoff:
            continue

        if DRY_RUN:
            logger.info("[DRY RUN] Would remove old event: %s", event_dir.name)
        else:
            shutil.rmtree(event_dir, ignore_errors=True)
            logger.info("Removed old event: %s", event_dir.name)
        removed += 1

    return removed


def emergency_cleanup() -> int:
    """If total /data/tunnel exceeds MAX_DISK_MB, aggressively remove oldest dirs."""
    tunnel_root = Path("/data/tunnel")
    if not tunnel_root.exists():
        return 0

    current_mb = dir_size_mb(tunnel_root)
    if current_mb <= MAX_DISK_MB:
        return 0

    logger.warning(
        "Disk usage %.0fMB exceeds limit %dMB — running emergency cleanup",
        current_mb, MAX_DISK_MB,
    )

    removed = 0
    # Sort all subdirs by mtime, remove oldest first
    all_dirs = []
    for search_path in [EVENTS_PATH, LOCAL_STORAGE_PATH]:
        if search_path.exists():
            for d in search_path.iterdir():
                if d.is_dir():
                    try:
                        all_dirs.append((d.stat().st_mtime, d))
                    except OSError:
                        pass

    all_dirs.sort()  # oldest first

    for mtime, d in all_dirs:
        if dir_size_mb(tunnel_root) <= MAX_DISK_MB * 0.7:  # clean down to 70%
            break
        if DRY_RUN:
            logger.info("[DRY RUN] Emergency remove: %s", d)
        else:
            shutil.rmtree(d, ignore_errors=True)
            logger.info("Emergency removed: %s", d)
        removed += 1

    return removed


def main():
    logger.info("Starting cleanup (max_age=%dh, max_disk=%dMB, dry_run=%s)",
                MAX_AGE_HOURS, MAX_DISK_MB, DRY_RUN)

    images_removed = cleanup_uploaded_images()
    events_removed = cleanup_old_events()
    emergency_removed = emergency_cleanup()

    total = images_removed + events_removed + emergency_removed
    logger.info(
        "Cleanup complete: %d images dirs, %d event dirs, %d emergency (%d total)",
        images_removed, events_removed, emergency_removed, total,
    )

    # Report final usage
    tunnel_root = Path("/data/tunnel")
    if tunnel_root.exists():
        logger.info("Current /data/tunnel usage: %.0fMB", dir_size_mb(tunnel_root))


if __name__ == "__main__":
    main()
