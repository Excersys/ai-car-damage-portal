"""
Upload burst-captured scan images to S3.

Organizes uploads by license plate for easy retrieval of all scans
for a given vehicle. Falls back to event_id if plate is unknown.

S3 key structure:
    scans/{license_plate}/{event_id}/{camera_id}/frame_NNNN.jpg

Requires: boto3, configured AWS credentials.
"""

from __future__ import annotations

import logging
import os
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from pathlib import Path

_camera_system_root = Path(__file__).resolve().parent.parent
if str(_camera_system_root) not in sys.path:
    sys.path.insert(0, str(_camera_system_root))
from common.s3_paths import scan_prefix

logger = logging.getLogger("tunnel-detect.upload")

try:
    import boto3
    from botocore.config import Config as BotoConfig
    from botocore.exceptions import BotoCoreError, ClientError
    _HAS_BOTO3 = True
except ImportError:
    _HAS_BOTO3 = False
    logger.warning("boto3 not installed — S3 upload disabled")

S3_BUCKET: str = os.environ.get("S3_BUCKET", "tunnel-images")
AWS_REGION: str = os.environ.get("AWS_REGION", "us-east-1")
UPLOAD_TIMEOUT_S: int = int(os.environ.get("UPLOAD_TIMEOUT_S", "10"))
UPLOAD_WORKERS: int = int(os.environ.get("UPLOAD_WORKERS", "4"))

_s3_client = None


def _get_s3_client():
    global _s3_client
    if _s3_client is None and _HAS_BOTO3:
        _s3_client = boto3.client(
            "s3",
            region_name=AWS_REGION,
            config=BotoConfig(
                connect_timeout=3,
                read_timeout=UPLOAD_TIMEOUT_S,
                retries={"max_attempts": 2},
            ),
        )
    return _s3_client


@dataclass
class UploadResult:
    local_path: Path
    s3_key: str
    success: bool = True
    error: str = ""


def _upload_one(local_path: Path, s3_key: str) -> UploadResult:
    """Upload a single file to S3."""
    client = _get_s3_client()
    if client is None:
        return UploadResult(local_path, s3_key, False, "boto3 not available")
    try:
        client.upload_file(
            str(local_path), S3_BUCKET, s3_key,
            ExtraArgs={"ContentType": "image/jpeg"},
        )
        return UploadResult(local_path, s3_key, True)
    except Exception as exc:
        return UploadResult(local_path, s3_key, False, str(exc))


def build_s3_prefix(scan_dict: dict) -> str:
    """Build the S3 prefix for a scan event (same layout as Pi uploads)."""
    plate = scan_dict.get("license_plate") or None
    event_id = scan_dict["event_id"]
    return scan_prefix(plate, event_id)


def upload_scan(scan) -> list[UploadResult]:
    """
    Upload all burst images for a scan to S3.

    Args:
        scan: ScanEvent instance (has .to_dict(), .frames, .event_dir).

    Returns:
        List of UploadResult.
    """
    if not _HAS_BOTO3:
        logger.info("S3 upload skipped (boto3 not available)")
        return []

    scan_dict = scan.to_dict() if hasattr(scan, "to_dict") else scan
    prefix = build_s3_prefix(scan_dict)

    files_to_upload: list[tuple[Path, str]] = []

    event_dir = scan.event_dir if hasattr(scan, "event_dir") else Path(scan_dict.get("event_dir", ""))
    for bf in scan.frames if hasattr(scan, "frames") else []:
        path = bf.path if isinstance(bf.path, Path) else Path(bf.path)
        if not path.exists():
            continue
        s3_key = f"{prefix}/{bf.camera_id}/frame_{bf.frame_index:04d}.jpg"
        files_to_upload.append((path, s3_key))

    # Also upload the event.json
    meta_path = event_dir / "event.json" if event_dir else None
    if meta_path and meta_path.exists():
        files_to_upload.append((meta_path, f"{prefix}/event.json"))

    if not files_to_upload:
        logger.info("No files to upload for %s", scan_dict.get("event_id"))
        return []

    results: list[UploadResult] = []
    workers = min(UPLOAD_WORKERS, len(files_to_upload))

    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {
            pool.submit(_upload_one, path, key): key
            for path, key in files_to_upload
        }
        for fut in as_completed(futures):
            try:
                results.append(fut.result())
            except Exception as exc:
                key = futures[fut]
                results.append(UploadResult(Path(""), key, False, str(exc)))

    ok = sum(1 for r in results if r.success)
    logger.info(
        "S3 upload: %d/%d succeeded  prefix=s3://%s/%s",
        ok, len(results), S3_BUCKET, prefix,
    )
    return results
