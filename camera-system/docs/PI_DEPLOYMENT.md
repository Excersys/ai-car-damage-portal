# Raspberry Pi Deployment Guide

End-to-end instructions for deploying the tunnel capture service and vehicle detection daemon on a Raspberry Pi.

## Prerequisites

- Raspberry Pi 4 (4 GB+ recommended) running Raspberry Pi OS (64-bit)
- Python 3.11+
- Up to 4 RTSP network cameras (or USB/CSI cameras) accessible on the local network
- AWS credentials configured (`~/.aws/credentials` or instance role)
- The S3 bucket deployed via CDK (`tunnel-images-{ACCOUNT_ID}`)

## 1. ONNX Model Provisioning

The YOLOv8 vehicle detection model (`yolov8n.onnx`) is **not stored in Git** due to its size. You must download or export it before running the detection daemon.

### Option A — Download pre-exported ONNX

```bash
# From the ultralytics hub or a shared team bucket:
curl -L -o /home/pi/camera-system/model/yolov8n.onnx \
  "https://github.com/ultralytics/assets/releases/download/v8.1.0/yolov8n.onnx"
```

### Option B — Export from PyTorch

```bash
pip install ultralytics
yolo export model=yolov8n.pt format=onnx imgsz=640
mv yolov8n.onnx /home/pi/camera-system/model/
```

Verify the file is in the expected location:

```bash
ls -lh /home/pi/camera-system/model/yolov8n.onnx
```

The path is controlled by the `YOLO_MODEL` environment variable (default: `yolov8n.onnx`, resolved relative to the working directory).

## 2. RTSP Camera Configuration

Cameras are configured via the `CAMERAS_JSON` environment variable. It accepts either an inline JSON array or a path to a `.json` file.

### Format

```json
[
  {"id": "cam_061", "url": "rtsp://${CAMERA_USER}:${CAMERA_PASS}@192.168.1.61:554/stream1", "name": "Tunnel Entrance Left"},
  {"id": "cam_062", "url": "rtsp://${CAMERA_USER}:${CAMERA_PASS}@192.168.1.62:554/stream1", "name": "Tunnel Entrance Right"},
  {"id": "cam_063", "url": "rtsp://${CAMERA_USER}:${CAMERA_PASS}@192.168.1.63:554/stream1", "name": "Tunnel Exit Left"},
  {"id": "cam_064", "url": "rtsp://${CAMERA_USER}:${CAMERA_PASS}@192.168.1.64:554/stream1", "name": "Tunnel Exit Right"}
]
```

The `${CAMERA_USER}` and `${CAMERA_PASS}` placeholders are interpolated at runtime from the `CAMERA_USER` and `CAMERA_PASS` environment variables. This avoids embedding credentials in config files.

### Using a file

```bash
# Store cameras in a secure file
sudo mkdir -p /etc/tunnel-detect
sudo nano /etc/tunnel-detect/cameras.json   # paste the JSON array
sudo chmod 600 /etc/tunnel-detect/cameras.json
```

Then set:

```bash
CAMERAS_JSON=/etc/tunnel-detect/cameras.json
```

### Credential rotation

When rotating camera credentials:

1. Update `CAMERA_USER` and `CAMERA_PASS` in `/etc/tunnel-detect/tunnel-detect.env`
2. Restart both services: `sudo systemctl restart tunnel-trigger tunnel-detect`

## 3. Environment Variable Reference

Create the environment file at `/etc/tunnel-detect/tunnel-detect.env`:

```bash
sudo mkdir -p /etc/tunnel-detect
sudo tee /etc/tunnel-detect/tunnel-detect.env > /dev/null << 'EOF'
# AWS
AWS_REGION=us-east-1
S3_BUCKET=tunnel-images-<YOUR_ACCOUNT_ID>

# Local storage
LOCAL_STORAGE_PATH=/data/tunnel/images
UPLOAD_QUEUE_DB=/data/tunnel/queue.db
MAX_LOCAL_STORAGE_MB=5000

# Image processing
IMAGE_MAX_DIMENSION=1920
IMAGE_JPEG_QUALITY=85

# Capture
CAPTURE_TIMEOUT_S=5.0

# Upload
UPLOAD_TIMEOUT_S=10.0
UPLOAD_WORKER_INTERVAL_S=10.0
UPLOAD_WORKER_BACKOFF_MAX_S=300.0
UPLOAD_MAX_RETRIES=5

# FastAPI trigger server
SERVER_HOST=0.0.0.0
SERVER_PORT=8000

# Logging
LOG_LEVEL=INFO

# Camera credentials (do NOT commit)
CAMERA_USER=admin
CAMERA_PASS=changeme
CAMERAS_JSON=/etc/tunnel-detect/cameras.json
RTSP_TRANSPORT=tcp
CAMERA_TIMEOUT_MS=5000

# Vehicle detection daemon
YOLO_MODEL=yolov8n.onnx
DETECTION_CONFIDENCE=0.5
BURST_INTERVAL=1.0
BURST_MAX_DURATION=15
BURST_EXIT_MISSES=3
SCAN_RESULTS_DIR=/data/tunnel/scans

# SageMaker (only needed if running deploy_endpoint.py from the Pi)
# MODEL_ARTIFACT_S3_URI=s3://your-bucket/model.tar.gz
# SAGEMAKER_IMAGE_URI=<framework-container-uri>
# SAGEMAKER_ENDPOINT_NAME=tunnel-damage-detection
EOF

sudo chmod 600 /etc/tunnel-detect/tunnel-detect.env
```

## 4. Install Python Dependencies

```bash
cd /home/pi/camera-system/pi
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# For the detection daemon (from model/ directory)
cd /home/pi/camera-system/model
pip install -r requirements.txt
```

## 5. systemd Services

Two services are provided: the **trigger server** (FastAPI, receives webhooks) and the **detection daemon** (YOLO vehicle detection + burst capture).

### Trigger Server

Create `/etc/systemd/system/tunnel-trigger.service`:

```ini
[Unit]
Description=Tunnel Capture Trigger Server
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=pi
Group=pi
WorkingDirectory=/home/pi/camera-system/pi
EnvironmentFile=/etc/tunnel-detect/tunnel-detect.env
ExecStart=/home/pi/camera-system/pi/.venv/bin/python3 trigger_server.py
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=tunnel-trigger
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=/data/tunnel
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

### Detection Daemon

The service file is provided at `model/tunnel-detect.service`. Install it:

```bash
sudo cp /home/pi/camera-system/model/tunnel-detect.service /etc/systemd/system/
sudo systemctl daemon-reload
```

### Enable and start both services

```bash
sudo mkdir -p /data/tunnel/images /data/tunnel/scans

sudo systemctl enable tunnel-trigger tunnel-detect
sudo systemctl start tunnel-trigger tunnel-detect
```

### Check status and logs

```bash
sudo systemctl status tunnel-trigger tunnel-detect

# Live logs
journalctl -u tunnel-trigger -f
journalctl -u tunnel-detect -f

# JSON-structured logs for CloudWatch agent parsing
journalctl -u tunnel-trigger -o cat --no-pager | tail -20
```

## 6. Verifying the Deployment

### Health check

```bash
curl http://localhost:8000/health
```

Expected response:

```json
{
  "status": "ok",
  "cameras_discovered": 4,
  "s3_connectivity": true,
  "queue_pending": 0
}
```

### Manual trigger

```bash
curl -X POST http://localhost:8000/trigger/manual
```

### Check the upload queue

```bash
curl http://localhost:8000/queue/status
```

## 7. Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `cameras_discovered: 0` | Cameras unreachable or `CAMERAS_JSON` not set | Verify RTSP URLs, check `CAMERA_USER`/`CAMERA_PASS` |
| `s3_connectivity: false` | Missing AWS credentials or wrong bucket name | Run `aws sts get-caller-identity`, verify `S3_BUCKET` |
| Queue keeps growing | S3 unreachable or repeated upload failures | Check `journalctl -u tunnel-trigger` for error details |
| Dead-letter items accumulating | Uploads failing after `UPLOAD_MAX_RETRIES` | Check network; inspect queue DB: `sqlite3 /data/tunnel/queue.db "SELECT * FROM upload_queue WHERE status='dead_letter'"` |
| YOLO model not found | `yolov8n.onnx` missing from working directory | See section 1 above |
| RTSP timeout | Camera network issues or wrong transport | Try `RTSP_TRANSPORT=udp`, increase `CAMERA_TIMEOUT_MS` |
