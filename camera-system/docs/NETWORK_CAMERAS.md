# Network Camera Setup

Hardware reference and configuration for the 4 IP cameras used in the tunnel damage detection system.

## Network Topology

```
[Raspberry Pi]                    [IP Cameras]
camerapi @ 192.168.0.158  --->   192.168.0.62  (Tunnel Cam 062)
       (SSH port 22)       --->   192.168.0.135 (Tunnel Cam 135)
       (Trigger API :8000) --->   192.168.0.142 (Tunnel Cam 142)
                           --->   192.168.0.202 (Tunnel Cam 202)

All devices on 192.168.0.0/24, gateway 192.168.0.1 (UniFi)
```

## Camera Details

| Camera ID | IP Address | RTSP Port | Protocol | Resolution (native) | Resolution (captured) |
|-----------|------------|-----------|----------|---------------------|-----------------------|
| cam_062 | 192.168.0.62 | 554 | RTSP | 4512x2512 | 1920x1068 |
| cam_135 | 192.168.0.135 | 554 | RTSP | 4512x2512 | 1920x1068 |
| cam_142 | 192.168.0.142 | 554 | RTSP | 4512x2512 | 1920x1068 |
| cam_202 | 192.168.0.202 | 554 | RTSP | 4512x2512 | 1920x1068 |

- **Stream URL format:** `rtsp://<user>:<pass>@<ip>:554/`
- **RTSP path:** root (`/`) — no subpath required
- **Transport:** TCP (configured via `RTSP_TRANSPORT` env var)
- **Authentication:** required (401 Unauthorized without credentials)
- **ONVIF:** not supported by these cameras
- **HTTP interface:** none on port 80 (cameras are RTSP-only)

There is also a device at **192.168.0.7** with RTSP (port 554) and an HTTP web UI (`login.asp` style). This appears to be an NVR/DVR and is **not** used by the capture pipeline.

## Raspberry Pi (camerapi)

| Property | Value |
|----------|-------|
| Hostname | `camerapi` |
| mDNS | `camerapi.localdomain` |
| IP Address | 192.168.0.158 |
| SSH | port 22, key-based auth as `pi` user |
| OS | Raspberry Pi OS (Debian-based) |
| Python | 3.13.5 |
| Project path | `~/camera-system/pi/` |
| Venv | `~/camera-system/pi/.venv/` |
| Data directory | `/data/tunnel/images/` |

### SSH Access

```bash
ssh pi@192.168.0.158
# or
ssh pi@camerapi.localdomain
```

Key-based authentication is configured; no password needed from the dev machine.

## Configuration

The camera list is provided via the `CAMERAS_JSON` environment variable — either as an inline JSON array or a path to a `.json` file.

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CAMERAS_JSON` | Yes | `""` | JSON array of camera defs, or path to a `.json` file |
| `CAMERA_USER` | Yes | `""` | Username for RTSP auth (interpolated into `${CAMERA_USER}` placeholders) |
| `CAMERA_PASS` | Yes | `""` | Password for RTSP auth (interpolated into `${CAMERA_PASS}` placeholders) |
| `RTSP_TRANSPORT` | No | `tcp` | RTSP transport protocol (`tcp` or `udp`) |
| `CAMERA_TIMEOUT_MS` | No | `5000` | OpenCV connection/read timeout in milliseconds |

### Example: Inline JSON

```bash
export CAMERA_USER="admin"
export CAMERA_PASS="Password2026"
export CAMERAS_JSON='[
  {"id":"cam_062","url":"rtsp://${CAMERA_USER}:${CAMERA_PASS}@192.168.0.62:554/","name":"Tunnel Cam 062"},
  {"id":"cam_135","url":"rtsp://${CAMERA_USER}:${CAMERA_PASS}@192.168.0.135:554/","name":"Tunnel Cam 135"},
  {"id":"cam_142","url":"rtsp://${CAMERA_USER}:${CAMERA_PASS}@192.168.0.142:554/","name":"Tunnel Cam 142"},
  {"id":"cam_202","url":"rtsp://${CAMERA_USER}:${CAMERA_PASS}@192.168.0.202:554/","name":"Tunnel Cam 202"}
]'
```

### Example: File-based Config

```bash
export CAMERA_USER="admin"
export CAMERA_PASS="Password2026"
export CAMERAS_JSON="/etc/tunnel/cameras.json"
```

Where `/etc/tunnel/cameras.json` contains the same JSON array.

### Camera Entry Schema

Each object in the JSON array:

| Field | Required | Description |
|-------|----------|-------------|
| `url` | Yes | RTSP URL. May contain `${CAMERA_USER}` and `${CAMERA_PASS}` placeholders |
| `id` | No | Camera identifier (defaults to `cam_<index>`) |
| `name` | No | Human-readable label (defaults to `id`) |

## Validation

### Quick connectivity check from dev machine

```bash
# Ping the Pi
ping 192.168.0.158

# Check RTSP port on a camera
nc -z -w 2 192.168.0.62 554 && echo "OPEN" || echo "CLOSED"

# RTSP OPTIONS probe (should return 200 OK)
echo -e "OPTIONS rtsp://192.168.0.62:554/ RTSP/1.0\r\nCSeq: 1\r\n\r\n" | nc -w 3 192.168.0.62 554
```

### Test capture from the Pi

```bash
ssh pi@192.168.0.158

# Set env vars (or source from a file)
export CAMERA_USER="admin"
export CAMERA_PASS="Password2026"
export CAMERAS_JSON='[{"id":"cam_062","url":"rtsp://admin:Password2026@192.168.0.62:554/","name":"Tunnel Cam 062"}]'

cd ~/camera-system/pi
~/camera-system/pi/.venv/bin/python3 capture_frame.py /tmp/test_frame.jpg
```

### Full pipeline test (all 4 cameras)

```bash
# From the Pi, with all env vars set:
cd ~/camera-system/pi
~/camera-system/pi/.venv/bin/python3 -c "
from camera_discover import discover_rtsp_cameras
from capture_service import generate_event_id, capture_all

cams = discover_rtsp_cameras()
results = capture_all(generate_event_id(), cameras=cams)
for r in results:
    print(f'{r.camera_id}: {\"OK\" if r.success else r.error}  ({r.size_bytes} bytes)')
"
```

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `CAMERAS_JSON` empty, 0 cameras discovered | Env var not set | Export `CAMERAS_JSON` before starting server |
| `401 Unauthorized` in OpenCV logs | Wrong credentials | Verify `CAMERA_USER` / `CAMERA_PASS` |
| `Could not open RTSP stream` | Camera offline or wrong IP | Ping the camera IP, check `nc -z <ip> 554` |
| `Failed to read RTSP frame` | Stream opened but no data | Check `RTSP_TRANSPORT` (try `udp` if `tcp` fails) |
| Capture timeout | Network congestion | Increase `CAMERA_TIMEOUT_MS` (default 5000) |
| Images too large | High resolution source | Adjust `IMAGE_MAX_DIMENSION` (default 1920) |
| `/data/tunnel` permission denied | Directory not created | `sudo mkdir -p /data/tunnel/images && sudo chown -R pi:pi /data/tunnel` |
