"""
FastAPI server running on the Raspberry Pi.
Receives sensor webhooks, orchestrates capture + upload,
and exposes health/status endpoints.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI
from pydantic import BaseModel, Field

import config
from camera_discover import discover_all
from capture_service import CaptureResult, capture_all, generate_event_id
from s3_uploader import check_connectivity, s3_key_for, upload_event
from upload_queue import UploadQueue
from upload_worker import UploadWorker

logging.basicConfig(
    level=getattr(logging, config.LOG_LEVEL, logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

queue = UploadQueue()
worker = UploadWorker(queue)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start the background upload worker on startup, stop on shutdown."""
    await worker.start()
    yield
    await worker.stop()


app = FastAPI(
    title="Tunnel Capture Service",
    description="Raspberry Pi edge service for tunnel car damage detection",
    version="1.0.0",
    lifespan=lifespan,
)


# ---------------------------------------------------------------------------
# Request / response models
# ---------------------------------------------------------------------------


class TriggerPayload(BaseModel):
    """Payload sent by the motion sensor."""

    sensor_id: str = "manual"
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    plate: str = "unknown"
    license_plate: str = ""

    def get_plate(self) -> str:
        """Return license_plate if provided, otherwise fall back to plate."""
        return self.license_plate or self.plate


class CameraResultItem(BaseModel):
    camera_id: str
    success: bool
    uploaded: bool
    queued: bool
    size_bytes: int
    error: str = ""


class TriggerResponse(BaseModel):
    event_id: str
    timestamp: str
    sensor_id: str
    cameras_captured: int
    cameras_uploaded: int
    cameras_queued: int
    results: list[CameraResultItem]


class HealthResponse(BaseModel):
    status: str
    cameras_discovered: int
    s3_connectivity: bool
    queue_pending: int
    queue_max_pending: int
    queue_at_capacity: bool


class QueueStatusResponse(BaseModel):
    pending: int
    uploading: int
    uploaded: int
    failed: int
    total: int
    max_pending: int
    at_capacity: bool


class ScanUploadItem(BaseModel):
    """A single file to upload from a daemon burst scan."""
    local_path: str
    camera_id: str
    frame_index: int = 0


class ScanUploadPayload(BaseModel):
    """Payload sent by detect_daemon after a burst capture."""
    event_id: str
    plate: str = "unknown"
    files: list[ScanUploadItem]


class ScanUploadResponse(BaseModel):
    event_id: str
    uploaded: int
    queued: int
    failed: int


class CameraItem(BaseModel):
    kind: str
    device: str
    name: str
    index: int


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@app.post("/trigger", response_model=TriggerResponse)
async def trigger(payload: TriggerPayload):
    """
    Main trigger endpoint.
    1) Capture from all cameras (always local, always succeeds if cameras work)
    2) Attempt immediate S3 upload (cloud-first)
    3) Queue any failures for background retry
    """
    event_id = generate_event_id()
    logger.info(
        "Trigger received: sensor=%s event=%s", payload.sensor_id, event_id
    )

    captures: list[CaptureResult] = capture_all(event_id)
    captured_count = sum(1 for c in captures if c.success)

    s3_results = upload_event(event_id, captures, plate=payload.get_plate())
    uploaded_ids = {r.camera_id for r in s3_results if r.success}
    failed_results = [r for r in s3_results if not r.success]

    queued_count = 0
    if failed_results:
        queued_count = queue.enqueue_failures(event_id, failed_results)

    result_items = []
    for cap in captures:
        uploaded = cap.camera_id in uploaded_ids
        queued = (
            not uploaded
            and cap.success
            and any(r.camera_id == cap.camera_id for r in failed_results)
        )
        result_items.append(
            CameraResultItem(
                camera_id=cap.camera_id,
                success=cap.success,
                uploaded=uploaded,
                queued=queued,
                size_bytes=cap.size_bytes,
                error=cap.error,
            )
        )

    logger.info(
        "Event %s complete: captured=%d uploaded=%d queued=%d",
        event_id,
        captured_count,
        len(uploaded_ids),
        queued_count,
    )

    return TriggerResponse(
        event_id=event_id,
        timestamp=payload.timestamp,
        sensor_id=payload.sensor_id,
        cameras_captured=captured_count,
        cameras_uploaded=len(uploaded_ids),
        cameras_queued=queued_count,
        results=result_items,
    )


@app.post("/scan/upload", response_model=ScanUploadResponse)
async def scan_upload(payload: ScanUploadPayload):
    """Accept pre-captured burst frames from detect_daemon and upload via the queue."""
    from pathlib import Path as _Path

    class _FakeCapture:
        def __init__(self, camera_id: str, local_path: str, frame_index: int = 0):
            self.camera_id = camera_id
            self.local_path = _Path(local_path)
            self.success = self.local_path.exists()
            self.frame_index = frame_index

    captures = [
        _FakeCapture(f.camera_id, f.local_path, f.frame_index)
        for f in payload.files
    ]

    s3_results = upload_event(payload.event_id, captures, plate=payload.get_plate())
    uploaded_ids = {r.camera_id for r in s3_results if r.success}
    failed_results = [r for r in s3_results if not r.success]

    queued_count = 0
    if failed_results:
        queued_count = queue.enqueue_failures(payload.event_id, failed_results)

    logger.info(
        "Scan upload %s: uploaded=%d queued=%d failed=%d",
        payload.event_id, len(uploaded_ids), queued_count,
        len(failed_results) - queued_count,
    )
    return ScanUploadResponse(
        event_id=payload.event_id,
        uploaded=len(uploaded_ids),
        queued=queued_count,
        failed=len(failed_results) - queued_count,
    )


@app.post("/trigger/manual", response_model=TriggerResponse)
async def trigger_manual():
    """Manual trigger for testing -- no payload needed."""
    payload = TriggerPayload()
    return await trigger(payload)


@app.get("/health", response_model=HealthResponse)
async def health():
    """Health check including camera count, S3 connectivity, and queue depth."""
    cameras = discover_all()
    online = check_connectivity()
    stats = queue.stats()
    cap = config.MAX_UPLOAD_QUEUE_PENDING
    at_cap = stats.pending >= cap
    return HealthResponse(
        status="ok",
        cameras_discovered=len(cameras),
        s3_connectivity=online,
        queue_pending=stats.pending,
        queue_max_pending=cap,
        queue_at_capacity=at_cap,
    )


@app.get("/cameras", response_model=list[CameraItem])
async def list_cameras():
    """List all discovered cameras."""
    return [
        CameraItem(kind=c.kind, device=c.device, name=c.name, index=c.index)
        for c in discover_all()
    ]


@app.get("/queue/status", response_model=QueueStatusResponse)
async def queue_status():
    """Offline upload queue statistics."""
    s = queue.stats()
    cap = config.MAX_UPLOAD_QUEUE_PENDING
    return QueueStatusResponse(
        pending=s.pending,
        uploading=s.uploading,
        uploaded=s.uploaded,
        failed=s.failed,
        total=s.total,
        max_pending=cap,
        at_capacity=s.pending >= cap,
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "trigger_server:app",
        host=config.SERVER_HOST,
        port=config.SERVER_PORT,
        reload=False,
    )
