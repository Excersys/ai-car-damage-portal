"""
Model configuration for tunnel car damage detection.

Section 1: Local vehicle detection (YOLOv8 on Pi or dev machine)
Section 2: SageMaker model deployment (cloud inference)
"""

from __future__ import annotations

import json
import os

# ---------------------------------------------------------------------------
# 1. Local vehicle detection (YOLOv8)
# ---------------------------------------------------------------------------

YOLO_MODEL: str = os.environ.get("YOLO_MODEL", "yolov8n.onnx")

DETECTION_CONFIDENCE: float = float(
    os.environ.get("DETECTION_CONFIDENCE", "0.5")
)

# COCO class IDs treated as "vehicle": car=2, motorcycle=3, bus=5, truck=7
_default_vehicle_classes = [2, 3, 5, 7]
_raw_classes = os.environ.get("VEHICLE_CLASSES", "")
VEHICLE_CLASSES: list[int] = (
    json.loads(_raw_classes) if _raw_classes else _default_vehicle_classes
)

CAMERA_TIMEOUT_MS: int = int(os.environ.get("CAMERA_TIMEOUT_MS", "5000"))

# ---------------------------------------------------------------------------
# 1b. Burst capture
# ---------------------------------------------------------------------------

BURST_INTERVAL: float = float(os.environ.get("BURST_INTERVAL", "1.0"))
BURST_MAX_DURATION: float = float(os.environ.get("BURST_MAX_DURATION", "15"))
BURST_EXIT_MISSES: int = int(os.environ.get("BURST_EXIT_MISSES", "3"))

# ---------------------------------------------------------------------------
# 1c. Scan results storage
# ---------------------------------------------------------------------------

SCAN_RESULTS_DIR: str = os.environ.get("SCAN_RESULTS_DIR", "/data/tunnel/scans")

# ---------------------------------------------------------------------------
# 2. SageMaker deployment (cloud inference)
# ---------------------------------------------------------------------------

MODEL_ARTIFACT_S3_URI: str = os.environ.get(
    "MODEL_ARTIFACT_S3_URI",
    "",
)

ENDPOINT_NAME: str = os.environ.get("SAGEMAKER_ENDPOINT_NAME", "tunnel-damage-detection")

INSTANCE_TYPE: str = os.environ.get("SAGEMAKER_INSTANCE_TYPE", "ml.m5.large")
INITIAL_INSTANCE_COUNT: int = int(os.environ.get("SAGEMAKER_INSTANCE_COUNT", "1"))

INFERENCE_IMAGE_URI: str = os.environ.get("SAGEMAKER_IMAGE_URI", "")

CONFIDENCE_THRESHOLD: float = float(os.environ.get("CONFIDENCE_THRESHOLD", "0.6"))

AWS_REGION: str = os.environ.get("AWS_REGION", "us-east-1")

SAGEMAKER_EXECUTION_ROLE: str = os.environ.get("SAGEMAKER_EXECUTION_ROLE", "")
