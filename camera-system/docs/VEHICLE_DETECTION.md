# Tunnel Vehicle Detection and Scan Pipeline

End-to-end vehicle detection and damage inspection running on a Raspberry Pi 4, using YOLOv8 (ONNX Runtime) against four Reolink RTSP cameras. The system continuously watches camera feeds, burst-captures images when a vehicle enters, reads the license plate, and feeds images into a damage detection pipeline.

---

## Architecture

```
┌──────────────┐    RTSP     ┌───────────────┐   state change    ┌────────────────┐
│  4× Reolink  │───────────▶│  Raspberry Pi  │──────────────────▶│  Event Output  │
│  IP Cameras  │  every 3s   │  YOLO (ONNX)  │  IDLE → TRIGGERED │  • image+JSON  │
│  192.168.0.x │            │  detect_daemon │                   │  • webhook     │
└──────────────┘            └───────────────┘                   │  • email (opt) │
                                                                 └────────────────┘
```

### State Machine (per camera)

```
       vehicle detected
IDLE ─────────────────────▶ TRIGGERED ──(cooldown 30s)──▶ IDLE
  ▲                                                         │
  └─────────────────────────────────────────────────────────┘
```

- **IDLE** — scanning frames, no vehicle present
- **TRIGGERED** — vehicle detected, event fired, cooldown active
- After cooldown expires the camera returns to IDLE. If the vehicle is still visible it re-triggers.

---

## Components

| File | Purpose |
|------|---------|
| `model/detect_daemon.py` | Systemd daemon — continuous camera watcher with state machine |
| `model/detect_car.py` | CLI tool — one-shot detection on an image, RTSP URL, or all cameras |
| `model/config.py` | Shared configuration (model path, confidence, vehicle classes, timeouts) |
| `model/yolov8n.onnx` | YOLOv8-nano model exported to ONNX (12.3 MB, opset 17) |
| `model/tunnel-detect.service` | Systemd unit file |
| `model/tunnel-detect.env` | Environment config for the daemon |
| `model/requirements.txt` | Python dependencies |
| `model/tests/test_detect_car.py` | Unit tests |

---

## Detection Model

- **Model**: YOLOv8n (nano) — optimised for edge devices
- **Format**: ONNX with opset 17 — runs on `onnxruntime` (no PyTorch needed)
- **Vehicle classes** (COCO): car (2), motorcycle (3), bus (5), truck (7)
- **Confidence threshold**: 0.5 (configurable)
- **Inference time**: ~4s per camera frame on Pi 4 CPU (Cortex-A72)

### Why ONNX instead of PyTorch?

PyTorch 2.10+ uses ARM instructions not available on the Pi 4's Cortex-A72 (ARMv8.0), causing `Illegal instruction` crashes. ONNX Runtime has full aarch64 support and a 15 MB wheel vs 146 MB for torch.

---

## Hardware

| Device | IP | Role |
|--------|----|------|
| Raspberry Pi 4 (4GB) | `192.168.0.158` | Edge compute — runs detection daemon |
| Reolink Cam 062 (Camera 3) | `192.168.0.62` | Driveway view |
| Reolink Cam 135 (Camera 1) | `192.168.0.135` | Gate/driveway approach |
| Reolink Cam 142 (Camera 4) | `192.168.0.142` | Gate area |
| Reolink Cam 202 (Camera 2) | `192.168.0.202` | Side view |

All cameras connected via RTSP on port 554 over TCP.

---

## Quick Start

### 1. One-shot detection (CLI)

```bash
# SSH into the Pi
ssh pi@192.168.0.158

# Detect from a local image
cd ~/camera-system/model
~/.venv/bin/python3 detect_car.py photo.jpg

# Detect from a single RTSP camera
~/.venv/bin/python3 detect_car.py --rtsp "rtsp://admin:Password2026@192.168.0.62:554/"

# Detect from all configured cameras
export CAMERAS_JSON='[
  {"id":"cam_062","url":"rtsp://admin:Password2026@192.168.0.62:554/","name":"Tunnel Cam 062"},
  {"id":"cam_135","url":"rtsp://admin:Password2026@192.168.0.135:554/","name":"Tunnel Cam 135"},
  {"id":"cam_142","url":"rtsp://admin:Password2026@192.168.0.142:554/","name":"Tunnel Cam 142"},
  {"id":"cam_202","url":"rtsp://admin:Password2026@192.168.0.202:554/","name":"Tunnel Cam 202"}
]'
~/.venv/bin/python3 detect_car.py --all-cameras
```

Output:
```
[Tunnel Cam 062] Detected 1 vehicle(s):
           car  conf=83%  bbox=[1238, 1161, 1708, 1454]
[Tunnel Cam 135] No vehicles detected.
[Tunnel Cam 142] No vehicles detected.
[Tunnel Cam 202] Detected 1 vehicle(s):
           car  conf=86%  bbox=[1, 1588, 461, 2071]
```

Annotated images are saved as `<camera_id>_detected.jpg`.

### 2. Continuous daemon (systemd service)

The daemon runs automatically as a systemd service on the Pi.

```bash
# Check status
sudo systemctl status tunnel-detect

# View live logs
sudo journalctl -u tunnel-detect -f

# Restart after config change
sudo systemctl restart tunnel-detect

# Stop
sudo systemctl stop tunnel-detect

# Start
sudo systemctl start tunnel-detect
```

---

## Service Management

### Auto-start on boot

The service is `enabled` — it starts automatically when the Pi boots.

```bash
# Verify
sudo systemctl is-enabled tunnel-detect
# → enabled
```

### Auto-restart on crash

Configured with `Restart=always` and `RestartSec=5`. If the daemon crashes, systemd restarts it within 5 seconds (up to 5 times in 5 minutes).

### Logs

All output goes to journald:

```bash
# Last 50 lines
sudo journalctl -u tunnel-detect -n 50

# Since a specific time
sudo journalctl -u tunnel-detect --since "10 min ago"

# Follow live
sudo journalctl -u tunnel-detect -f
```

---

## Events Output

When a vehicle is detected, the daemon saves an event to `/data/tunnel/events/`:

```
/data/tunnel/events/
├── cam_062_20260304_220228/
│   ├── event.json          # structured event metadata
│   └── frame.jpg           # annotated image with bounding boxes
├── cam_202_20260304_220241/
│   ├── event.json
│   └── frame.jpg
```

### Event JSON format

```json
{
  "event_type": "vehicle_entry",
  "event_id": "cam_062_20260304_220228",
  "timestamp": "2026-03-04T22:02:28.735789+00:00",
  "camera_id": "cam_062",
  "camera_name": "Tunnel Cam 062",
  "detections": [
    {
      "class_id": 2,
      "class_name": "car",
      "confidence": 0.808,
      "bbox": [1240.1, 1160.2, 1705.8, 1453.4]
    }
  ],
  "frame_shape": [2512, 4512, 3]
}
```

---

## Configuration

All settings live in `/etc/tunnel-detect/tunnel-detect.env` on the Pi.

| Variable | Default | Description |
|----------|---------|-------------|
| `CAMERAS_JSON` | *(required)* | JSON array of cameras (inline or file path) |
| `TRIGGER_CAMERA_IDS` | all cameras | JSON array of camera IDs to use as triggers |
| `YOLO_MODEL` | `yolov8n.onnx` | Path to the ONNX model file |
| `DETECTION_CONFIDENCE` | `0.5` | Minimum confidence for a detection |
| `CAMERA_TIMEOUT_MS` | `5000` | RTSP connection/read timeout |
| `SCAN_INTERVAL` | `3` | Seconds between scan cycles |
| `COOLDOWN_SECONDS` | `30` | Per-camera cooldown after a trigger |
| `EVENT_OUTPUT_DIR` | `/data/tunnel/events` | Where event images and JSON are saved |
| `LOG_LEVEL` | `INFO` | Logging level (DEBUG, INFO, WARNING, ERROR) |
| `WEBHOOK_URL` | *(empty)* | Optional URL for POST notifications |

### Editing config

```bash
ssh pi@192.168.0.158
sudo nano /etc/tunnel-detect/tunnel-detect.env
sudo systemctl restart tunnel-detect
```

---

## Testing

### Verify the service is running

```bash
ssh pi@192.168.0.158 'sudo systemctl status tunnel-detect'
```

### Watch live detections

```bash
ssh pi@192.168.0.158 'sudo journalctl -u tunnel-detect -f'
```

You'll see output like:
```
VEHICLE ENTRY  camera=Tunnel Cam 062  vehicles=1  top_conf=83%
Event saved: /data/tunnel/events/cam_062_20260304_221256
```

### Test enter/leave cycle

1. With logs streaming, move a car out of camera view
2. Detections stop — cameras go back to IDLE
3. Drive the car back in
4. See `VEHICLE ENTRY` event fire immediately

### Run detection manually

```bash
ssh pi@192.168.0.158 'cd ~/camera-system/model && \
  CAMERAS_JSON=/etc/tunnel-detect/tunnel-detect.env \
  ~/camera-system/pi/.venv/bin/python3 detect_car.py --all-cameras'
```

### Run unit tests locally

```bash
cd camera-system/model
python3 -m pytest tests/ -v
```

---

## Installation (from scratch)

If reinstalling on a fresh Pi:

```bash
# 1. Create virtualenv
python3 -m venv ~/camera-system/pi/.venv
source ~/camera-system/pi/.venv/bin/activate

# 2. Install dependencies (no PyTorch needed)
pip install opencv-python-headless onnxruntime

# 3. Copy model files to ~/camera-system/model/
#    (detect_daemon.py, detect_car.py, config.py, yolov8n.onnx)

# 4. Create data directory
sudo mkdir -p /data/tunnel/events
sudo chown -R pi:pi /data/tunnel

# 5. Install env config
sudo mkdir -p /etc/tunnel-detect
sudo cp tunnel-detect.env /etc/tunnel-detect/tunnel-detect.env
sudo chmod 600 /etc/tunnel-detect/tunnel-detect.env

# 6. Install and enable systemd service
sudo cp tunnel-detect.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable tunnel-detect
sudo systemctl start tunnel-detect
```

### Re-exporting the ONNX model

If you need to update the YOLO model (run on a dev machine with PyTorch):

```bash
pip install ultralytics onnx onnxslim onnxruntime
python3 -c "
from ultralytics import YOLO
model = YOLO('yolov8n.pt')
model.export(format='onnx', imgsz=640, simplify=True, opset=17)
"
scp yolov8n.onnx pi@192.168.0.158:~/camera-system/model/
```

---

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| `Illegal instruction` | PyTorch binary incompatible with Pi 4 ARM | Use ONNX Runtime instead (already configured) |
| `Could not open RTSP stream` | Camera offline or wrong credentials | Check camera IP, verify `ping`, try `ffprobe rtsp://...` |
| Service keeps restarting | Check `journalctl -u tunnel-detect` for errors | Fix config or code issue shown in logs |
| No events saved | No vehicles in view, or confidence too high | Lower `DETECTION_CONFIDENCE` to 0.3 for testing |
| Events too frequent | Parked car keeps re-triggering | Increase `COOLDOWN_SECONDS` or set `TRIGGER_CAMERA_IDS` to limit trigger cameras |
| Disk filling up | Events accumulate images | Add a cron job to prune old events: `find /data/tunnel/events -mtime +7 -delete` |

---

## Scan Pipeline

When the daemon detects a vehicle, it runs a full scan pipeline:

```
1. YOLO detects vehicle on any trigger camera
2. BURST CAPTURE — grab frames from ALL 4 cameras at ~1fps for up to 15s
3. LICENSE PLATE — OCR reads the plate from captured frames
4. S3 UPLOAD — all images uploaded as scans/{plate}/{event_id}/{cam}/{frame}.jpg
5. DAMAGE DETECTION — Lambda triggered by S3 → SageMaker endpoint → DynamoDB
6. RESULTS — JSON file saved locally, compared with previous scan for same plate
7. VIEWER — self-contained HTML multi-angle viewer generated
```

### Scan event output

```
/data/tunnel/events/scan_20260304_220228/
├── cam_062/
│   ├── frame_0000.jpg          # trigger frame
│   ├── frame_0001.jpg          # burst frames...
│   └── frame_0010.jpg
├── cam_135/
│   └── frame_0001.jpg ... frame_0010.jpg
├── cam_142/
│   └── ...
├── cam_202/
│   └── ...
├── event.json                  # full event metadata
└── viewer.html                 # multi-angle viewer (open in browser)
```

### Scan results (by license plate)

```
/data/tunnel/scans/
├── ABC1234/
│   ├── scan_20260304_220228.json     # each scan for this vehicle
│   └── scan_20260305_140015.json
└── XYZ7890/
    └── scan_20260304_183045.json
```

### New configuration for scan pipeline

| Variable | Default | Description |
|----------|---------|-------------|
| `BURST_INTERVAL` | `1.0` | Seconds between burst frames |
| `BURST_MAX_DURATION` | `15` | Max burst duration in seconds |
| `BURST_EXIT_MISSES` | `3` | Stop burst after N cycles with no vehicle |
| `SCAN_RESULTS_DIR` | `/data/tunnel/scans` | Where scan result JSONs are saved |
| `S3_BUCKET` | `tunnel-images` | S3 bucket for image uploads |
| `WEBHOOK_URL` | *(empty)* | Optional webhook for event notifications |

---

## Pipeline Components

| File | Purpose |
|------|---------|
| `model/detect_daemon.py` | Main daemon — detection, burst capture, pipeline orchestration |
| `model/detect_car.py` | CLI — one-shot detection on image/RTSP/all cameras |
| `model/plate_reader.py` | License plate detection + OCR (Tesseract) |
| `model/scan_uploader.py` | S3 upload for burst images |
| `model/scan_results.py` | Save/load/compare scan results as JSON |
| `model/viewer_360.py` | Generate self-contained HTML multi-angle viewer |
| `model/reconstruct_3d.py` | 3D Gaussian Splatting pipeline (GPU instance) |
| `model/config.py` | Shared configuration |
| `model/yolov8n.onnx` | YOLOv8-nano ONNX model (12.3 MB) |
| `lambdas/damage_detection/handler.py` | Lambda: S3 trigger → SageMaker → DynamoDB |
| `infra/stacks/inference_stack.py` | CDK stack for SageMaker + Lambda |

---

## File Locations on Pi

```
/home/pi/camera-system/
├── model/
│   ├── detect_daemon.py       # daemon (runs as service)
│   ├── detect_car.py          # CLI tool
│   ├── plate_reader.py        # license plate OCR
│   ├── scan_uploader.py       # S3 upload
│   ├── scan_results.py        # results storage + comparison
│   ├── viewer_360.py          # HTML viewer generator
│   ├── reconstruct_3d.py      # 3D reconstruction (GPU only)
│   ├── config.py              # shared config
│   ├── yolov8n.onnx           # YOLO model (12.3 MB)
│   └── requirements.txt
├── pi/
│   ├── .venv/                 # Python virtual environment
│   ├── trigger_server.py      # FastAPI trigger server (separate)
│   ├── capture_service.py     # multi-camera capture
│   └── ...
/etc/tunnel-detect/
│   └── tunnel-detect.env      # daemon configuration
/etc/systemd/system/
│   └── tunnel-detect.service  # systemd unit
/data/tunnel/
├── events/                     # burst capture events + viewers
└── scans/                      # scan results by license plate
```
