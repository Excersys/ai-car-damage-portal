# Raspberry Pi — Tunnel capture and detection deployment

This document describes how to run the edge stack on a Raspberry Pi: FastAPI trigger server, upload queue, optional YOLO vehicle-detection daemon, and environment variables for AWS.

## Prerequisites

- Raspberry Pi OS (64-bit recommended for ONNX runtime where used)
- Python 3.11+ virtualenv under `camera-system/pi/.venv` (see `setup_pi.sh`)
- Network path to RTSP cameras (or USB/CSI if `INCLUDE_USB_CAMERAS=true`)
- IAM credentials with `s3:PutObject` (and `s3:GetObject` if needed) on the tunnel images bucket, correct `AWS_REGION`

## Environment variables (common)

| Variable | Purpose |
|----------|---------|
| `S3_BUCKET` | Target bucket for event images |
| `AWS_REGION` | Region for S3 and SDK |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Or instance role / SSO profile on supported setups |
| `CAMERAS_JSON` | JSON list of RTSP URLs and labels (RTSP-first discovery skips USB unless overridden) |
| `INCLUDE_USB_CAMERAS` | Set `true` to discover USB/CSI in addition to RTSP |
| `UPLOAD_QUEUE_DB` | SQLite path for offline upload queue (default under `/data` or project dir) |
| `MAX_UPLOAD_QUEUE_PENDING` | Cap on queued rows; enqueue returns empty when full (default `5000`) |

Place shared secrets in `/etc/tunnel-detect/tunnel-detect.env` or a systemd `EnvironmentFile` for services.

## Trigger server (FastAPI)

Runs `trigger_server.py` (uvicorn). Responsibilities: sensor webhook → capture → S3 upload → queue on failure.

```bash
cd /home/pi/camera-system/pi
source .venv/bin/activate
uvicorn trigger_server:app --host 0.0.0.0 --port 8080
```

### Health and queue observability

- `GET /health` — `s3_connectivity`, `cameras_discovered`, `queue_pending`, `queue_max_pending`, `queue_at_capacity`
- `GET /queue/status` — pending/uploading/uploaded/failed totals plus `max_pending` and `at_capacity`

Use these for monitoring and alerts when the queue is back-pressured or S3 is unreachable.

## YOLO detection daemon (optional)

The vehicle-detection loop lives in `camera-system/model/detect_daemon.py`. It uses the same repo layout as development; ONNX model path and trigger integration are configured via `model/config.py` and environment.

### Systemd unit

Shipped as `camera-system/model/tunnel-detect.service`. Adjust `User`, `WorkingDirectory`, and `ExecStart` paths to match the Pi home directory.

1. Copy the unit to `/etc/systemd/system/tunnel-detect.service`
2. Create `/etc/tunnel-detect/tunnel-detect.env` with `PYTHONPATH`, model paths, and any API URLs
3. `sudo systemctl daemon-reload && sudo systemctl enable --now tunnel-detect`

The unit expects read/write under `/data/tunnel/events` for burst output; align `ReadWritePaths` with your actual data directory.

### Dependencies

Install `onnxruntime` (wheel appropriate for Pi arch), OpenCV, and project `model/requirements.txt` inside the same venv used by `ExecStart` or a dedicated venv.

## CDK / cloud alignment

Tunnel storage (S3 + DynamoDB) and Lambdas are defined under `camera-system/infra/`. After changing table keys or bucket policies, run `cdk diff` before `cdk deploy` and plan data migration if a DynamoDB table replacement is shown.

## Operational notes

- **Disk space:** Full disks break SQLite queue and Python imports; monitor `/data` and rotate or archive old `events` trees.
- **Camera 202 / RTSP:** Verify URL, credentials, and firewall; use `ffplay` or `ffmpeg` from the Pi to validate the stream before relying on discovery.
