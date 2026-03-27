"""
S3 upload module.
Uploads captured images to the tunnel-images bucket with short timeouts
so the happy path stays fast. Returns per-image success/failure.
"""

from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from pathlib import Path

import boto3
from botocore.config import Config as BotoConfig
from botocore.exceptions import BotoCoreError, ClientError

import config

logger = logging.getLogger(__name__)

_s3_client = None


def _get_s3_client():
    """Lazy-initialised S3 client with aggressive timeouts."""
    global _s3_client
    if _s3_client is None:
        _s3_client = boto3.client(
            "s3",
            region_name=config.AWS_REGION,
            config=BotoConfig(
                connect_timeout=3,
                read_timeout=int(config.UPLOAD_TIMEOUT_S),
                retries={"max_attempts": 1},
            ),
        )
    return _s3_client


@dataclass
class S3Result:
    """Outcome of a single S3 upload attempt."""

    camera_id: str
    local_path: Path
    s3_key: str
    success: bool = True
    error: str = ""


def s3_key_for(event_id: str, camera_id: str) -> str:
    """Build the S3 object key matching the scans/ prefix expected by the
    inference Lambda trigger (see ``inference_stack.py``)."""
    return f"scans/unknown/{event_id}/{camera_id}/frame_0000.jpg"


def upload_image(
    local_path: Path, s3_key: str, camera_id: str = "", event_id: str = ""
) -> S3Result:
    """Upload a single image file to S3."""
    extra: dict = {}
    if event_id:
        extra["event_id"] = event_id
    try:
        _get_s3_client().upload_file(
            str(local_path),
            config.S3_BUCKET,
            s3_key,
            ExtraArgs={"ContentType": "image/jpeg"},
        )
        logger.info(
            "Uploaded %s -> s3://%s/%s", local_path, config.S3_BUCKET, s3_key,
            extra=extra,
        )
        return S3Result(
            camera_id=camera_id,
            local_path=local_path,
            s3_key=s3_key,
            success=True,
        )
    except (BotoCoreError, ClientError, OSError) as exc:
        logger.warning("Upload failed for %s: %s", s3_key, exc, extra=extra)
        return S3Result(
            camera_id=camera_id,
            local_path=local_path,
            s3_key=s3_key,
            success=False,
            error=str(exc),
        )


def upload_event(
    event_id: str,
    captures: list,
) -> list[S3Result]:
    """
    Upload all captured images for an event in parallel.
    Only attempts upload for successful captures.
    Returns a list of S3Result (one per capture).
    """
    to_upload = [c for c in captures if c.success]
    if not to_upload:
        return []

    results: list[S3Result] = []

    with ThreadPoolExecutor(max_workers=len(to_upload)) as pool:
        futures = {}
        for cap in to_upload:
            s3_key = s3_key_for(event_id, cap.camera_id)
            fut = pool.submit(
                upload_image, cap.local_path, s3_key, cap.camera_id, event_id
            )
            futures[fut] = cap.camera_id

        for future in as_completed(futures):
            try:
                results.append(future.result())
            except Exception as exc:
                cid = futures[future]
                logger.error("Unexpected upload error for %s: %s", cid, exc)
                results.append(
                    S3Result(
                        camera_id=cid,
                        local_path=Path(""),
                        s3_key=s3_key_for(event_id, cid),
                        success=False,
                        error=str(exc),
                    )
                )

    ok = sum(1 for r in results if r.success)
    logger.info("Upload for event %s: %d/%d succeeded", event_id, ok, len(results))
    return results


def check_connectivity() -> bool:
    """Quick connectivity test against the S3 bucket."""
    try:
        _get_s3_client().head_bucket(Bucket=config.S3_BUCKET)
        return True
    except Exception:
        return False
