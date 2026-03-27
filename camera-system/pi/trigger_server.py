"""
FastAPI server running on the Raspberry Pi.
Receives sensor webhooks, orchestrates capture + upload,
and exposes health/status endpoints.
"""

from __future__ import annotations

import contextvars
import json as _json
import logging
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI
from pydantic import BaseModel, Field

import config
from camera_discover import discover_all
from capture_service import CaptureResult, capture_all, generate_event_id
from s3_uploader import check_connectivity, upload_event
from upload_queue import UploadQueue
from upload_worker import UploadWorker

# Request-scoped id for log correlation (matches event_id on /trigger).
correlation_id_ctx: contextvars.ContextVar[str | None] = contextvars.ContextVar(
    "correlation_id", default=None
)


class _JSONFormatter(logging.Formatter):
    """Structured JSON formatter for CloudWatch-compatible log parsing."""

    def format(self, record: logging.LogRecord) -> str:
        entry: dict = {
            "ts": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        cid = getattr(record, "correlation_id", None) or correlation_id_ctx.get()
        if cid:
            entry["correlation_id"] = cid
        if hasattr(record, "event_id"):
            entry["event_id"] = record.event_id
        if hasattr(record, "metric"):
            entry["metric"] = record.metric
        if record.exc_info and record.exc_info[0]:
            entry["exception"] = self.formatException(record.exc_info)
        return _json.dumps(entry, default=str)


_handler = logging.StreamHandler()
_handler.setFormatter(_JSONFormatter())
logging.basicConfig(
    level=getattr(logging, config.LOG_LEVEL, logging.INFO),
    handlers=[_handler],
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
    queue_saturated: bool = False
    results: list[CameraResultItem]


class HealthResponse(BaseModel):
    status: str
    cameras_discovered: int
    s3_connectivity: bool
    queue_pending: int


class QueueStatusResponse(BaseModel):
    pending: int
    uploading: int
    uploaded: int
    failed: int
    dead_letter: int
    total: int


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
    cid_token = correlation_id_ctx.set(event_id)
    try:
        extra = {"event_id": event_id, "correlation_id": event_id}
        logger.info(
            "Trigger received: sensor=%s event=%s", payload.sensor_id, event_id,
            extra=extra,
        )

        t0 = time.monotonic()
        captures: list[CaptureResult] = capture_all(event_id)
        capture_ms = (time.monotonic() - t0) * 1000
        captured_count = sum(1 for c in captures if c.success)

        t1 = time.monotonic()
        s3_results = upload_event(event_id, captures)
        upload_ms = (time.monotonic() - t1) * 1000
        uploaded_ids = {r.camera_id for r in s3_results if r.success}
        failed_results = [r for r in s3_results if not r.success]

        queued_count = 0
        queue_saturated = False
        to_queue = []
        if failed_results:
            q_stats_pre = queue.stats()
            cap_max = config.UPLOAD_QUEUE_MAX_PENDING
            room = max(0, cap_max - q_stats_pre.pending)
            if room == 0:
                queue_saturated = True
                logger.error(
                    "Upload queue at capacity (pending=%d max=%d); "
                    "dropping %d failed upload(s) for retry enqueue",
                    q_stats_pre.pending,
                    cap_max,
                    len(failed_results),
                    extra={
                        "event_id": event_id,
                        "correlation_id": event_id,
                        "metric": {
                            "queue_saturated": True,
                            "failures_not_queued": len(failed_results),
                        },
                    },
                )
            else:
                to_queue = failed_results[:room]
                if len(to_queue) < len(failed_results):
                    queue_saturated = True
                    logger.warning(
                        "Queue backpressure: enqueueing %d of %d failure(s)",
                        len(to_queue),
                        len(failed_results),
                        extra={
                            "event_id": event_id,
                            "correlation_id": event_id,
                            "metric": {
                                "queue_saturated": True,
                                "failures_dropped": len(failed_results) - len(to_queue),
                            },
                        },
                    )
                queued_count = queue.enqueue_failures(event_id, to_queue)

        enqueued_camera_ids = {r.camera_id for r in to_queue}

        result_items = []
        for cap in captures:
            uploaded = cap.camera_id in uploaded_ids
            queued = cap.success and cap.camera_id in enqueued_camera_ids
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

        q_stats = queue.stats()
        logger.info(
            "Event %s complete: captured=%d uploaded=%d queued=%d",
            event_id, captured_count, len(uploaded_ids), queued_count,
            extra={
                "event_id": event_id,
                "correlation_id": event_id,
                "metric": {
                    "capture_ms": round(capture_ms, 1),
                    "upload_ms": round(upload_ms, 1),
                    "captured": captured_count,
                    "uploaded": len(uploaded_ids),
                    "failed": len(failed_results),
                    "queued": queued_count,
                    "queue_saturated": queue_saturated,
                    "queue_depth": q_stats.pending,
                    "queue_dead_letter": q_stats.dead_letter,
                },
            },
        )

        return TriggerResponse(
            event_id=event_id,
            timestamp=payload.timestamp,
            sensor_id=payload.sensor_id,
            cameras_captured=captured_count,
            cameras_uploaded=len(uploaded_ids),
            cameras_queued=queued_count,
            queue_saturated=queue_saturated,
            results=result_items,
        )
    finally:
        correlation_id_ctx.reset(cid_token)


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
    return HealthResponse(
        status="ok",
        cameras_discovered=len(cameras),
        s3_connectivity=online,
        queue_pending=stats.pending,
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
    return QueueStatusResponse(
        pending=s.pending,
        uploading=s.uploading,
        uploaded=s.uploaded,
        failed=s.failed,
        dead_letter=s.dead_letter,
        total=s.total,
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "trigger_server:app",
        host=config.SERVER_HOST,
        port=config.SERVER_PORT,
        reload=False,
    )
