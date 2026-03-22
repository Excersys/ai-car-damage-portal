# Tunnel Car Detection System

## Product Requirements Document (PRD)

Version: 1.0\
Author: Omid Halavi\
Target Platform: Raspberry Pi 4\
Primary Goal: Detect when a vehicle approaches or enters a tunnel and
automatically capture images or video using existing cameras.

------------------------------------------------------------------------

# 1. Overview

The Tunnel Car Detection System continuously monitors camera feeds using
a Raspberry Pi and a lightweight YOLO object detection model.

The system detects vehicles approaching or entering the tunnel and
triggers a capture mode that records high‑resolution images or video
clips.

This allows the system to avoid constant high‑cost image processing
while still reliably detecting vehicles.

------------------------------------------------------------------------

# 2. Objectives

Primary objectives:

-   Detect vehicles approaching the tunnel
-   Trigger high resolution capture when detection occurs
-   Avoid constant heavy computation
-   Integrate with existing Reolink camera infrastructure
-   Run on Raspberry Pi 4

Secondary objectives:

-   Save detection images with timestamps
-   Optionally record short video clips
-   Allow integration with other systems via HTTP or MQTT
-   Support multiple cameras

------------------------------------------------------------------------

# 3. System Architecture

Reolink Cameras → RTSP Stream → Raspberry Pi 4 → YOLO Watch Mode →
Capture Mode (Images/Video)

------------------------------------------------------------------------

# 4. Hardware Requirements

Required hardware:

-   Raspberry Pi 4 (4GB+ recommended)
-   Network connection
-   Reolink cameras with RTSP enabled

Optional accelerators:

-   Google Coral USB
-   Hailo AI accelerator
-   Raspberry Pi 5 upgrade

------------------------------------------------------------------------

# 5. Software Stack

Operating System

Raspberry Pi OS (64‑bit)

Programming Language

Python 3.10+

Primary Libraries

-   OpenCV
-   Ultralytics YOLO
-   FFmpeg
-   NumPy

Optional

-   MQTT
-   Flask dashboard

------------------------------------------------------------------------

# 6. Camera Integration

Example RTSP URLs

Main stream:

rtsp://user:password@CAMERA_IP:554/h264Preview_01_main

Sub stream:

rtsp://user:password@CAMERA_IP:554/h264Preview_01_sub

Sub stream is used for detection.\
Main stream is used for capture.

------------------------------------------------------------------------

# 7. Detection Logic

## Watch Mode

Low resource monitoring:

-   Uses sub‑stream
-   YOLO detection at low FPS
-   Detect classes: car, truck, bus, motorcycle
-   Inference size \~640px

Default detection rate:

1--3 FPS

------------------------------------------------------------------------

## Region of Interest (ROI)

A detection zone is defined around the tunnel entrance.

A trigger only occurs when the bounding box center enters the ROI.

------------------------------------------------------------------------

## Trigger Conditions

Trigger occurs when:

1.  Vehicle detected
2.  Confidence above threshold
3.  Object center inside ROI
4.  Detection persists across frames

Default:

confidence_threshold = 0.5\
required_frames = 3

------------------------------------------------------------------------

# 8. Capture Mode

When triggered the system captures high resolution data.

### Option A -- Images

Capture JPEG snapshots

Example:

1 image every 0.5 seconds\
for 10 seconds

Resolution:

1080p or camera native

### Option B -- Video

Record clip using FFmpeg

Example:

10--20 second MP4 clip

------------------------------------------------------------------------

# 9. Storage Structure

Example directory layout

/captures /camera1 /YYYY-MM-DD car_10-21-03.jpg car_10-21-04.jpg
clip_10-21-03.mp4

------------------------------------------------------------------------

# 10. Performance Strategy

To reduce CPU load:

-   Use sub‑stream for detection
-   Sample frames at low FPS
-   Pause heavy inference during capture
-   Apply cooldown between triggers

Default cooldown: 15 seconds

------------------------------------------------------------------------

# 11. Multi Camera Strategy

Recommended:

1 camera handles detection.

Other cameras only record when triggered.

Example:

Camera 1 → Tunnel entrance detection\
Camera 2 → Inside tunnel capture\
Camera 3 → Exit view\
Camera 4 → Wide angle

------------------------------------------------------------------------

# 12. Event Notifications

Example event payload:

{ "event": "vehicle_detected", "camera_id": "cam1", "timestamp":
"2026-03-04T10:21:03", "confidence": 0.87 }

Events can be sent via:

-   HTTP webhook
-   MQTT
-   Local logs

------------------------------------------------------------------------

# 13. Logging

Log events:

-   system_start
-   camera_connection
-   detection_events
-   capture_started
-   capture_finished
-   errors

Example log path:

/logs/tunnel_detection.log

------------------------------------------------------------------------

# 14. Configuration

Example config.yaml

cameras: cam1: sub_stream:
rtsp://user:pass@192.168.1.20/h264Preview_01_sub main_stream:
rtsp://user:pass@192.168.1.20/h264Preview_01_main

detection: confidence: 0.5 fps: 2 required_frames: 3

capture: duration_seconds: 15 snapshot_interval: 0.5

cooldown_seconds: 15

------------------------------------------------------------------------

# 15. Deployment

Install dependencies

sudo apt update sudo apt install ffmpeg python3-opencv pip install
ultralytics

Run system

python tunnel_detector.py

------------------------------------------------------------------------

# 16. Future Enhancements

-   Vehicle tracking
-   Direction detection
-   License plate recognition
-   Cloud storage upload
-   Web dashboard
-   SMS alerts
-   Custom trained model
-   Hardware acceleration

------------------------------------------------------------------------

# 17. Success Metrics

-   Detection accuracy \> 90%
-   False triggers \< 5%
-   Detection latency \< 2 seconds
-   System uptime \> 99%

------------------------------------------------------------------------

# 18. Risks

Possible risks:

-   CPU overload on Raspberry Pi
-   RTSP stream interruptions
-   Lighting variability
-   Network issues

Mitigation:

-   Frame sampling
-   Stream reconnect logic
-   Detection cooldown

------------------------------------------------------------------------

# 19. Timeline

Prototype: 1--2 days\
Production-ready: 1--2 weeks

------------------------------------------------------------------------

# 20. Summary

This system provides a lightweight AI‑based vehicle detection platform
using YOLO on Raspberry Pi to monitor tunnel traffic efficiently while
minimizing computational load.
