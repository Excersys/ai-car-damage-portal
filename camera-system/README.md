# Tunnel Car Damage Detection System

Automated pipeline that detects when a car enters a tunnel, captures images from 4 fixed cameras via a Raspberry Pi, uploads to AWS, runs damage detection inference, and stores results for review.

## Architecture

```
[Motion Sensor] --webhook--> [Raspberry Pi] --S3 upload--> [AWS Cloud]
                              - captures 4 cameras            - Lambda inference
                              - compresses images              - SageMaker model
                              - cloud-first upload             - DynamoDB results
                              - offline queue fallback         - API for review
```

**Cloud-first design**: images go straight to S3 for fastest inference (~5-7s trigger-to-result). If internet is down, images queue locally on the Pi and auto-upload when connectivity returns.

## Project Layout

| Path | Purpose |
|------|---------|
| `pi/` | Raspberry Pi edge layer (capture, upload, trigger server) |
| `pi/config.py` | Environment-based configuration |
| `pi/camera_discover.py` | Discover USB (V4L2) and CSI cameras |
| `pi/capture_service.py` | Multi-camera concurrent capture + compression |
| `pi/s3_uploader.py` | S3 upload with fast-fail timeouts |
| `pi/upload_queue.py` | SQLite-backed offline upload queue |
| `pi/upload_worker.py` | Background worker that drains the queue |
| `pi/trigger_server.py` | FastAPI server (sensor webhook + status endpoints) |
| `infra/` | AWS CDK (Python) infrastructure-as-code |
| `infra/stacks/storage_stack.py` | S3 bucket + DynamoDB table |
| `infra/stacks/inference_stack.py` | DamageDetection Lambda + S3 trigger |
| `infra/stacks/api_stack.py` | API Gateway + ReviewAPI Lambda |
| `infra/stacks/monitoring_stack.py` | CloudWatch alarms + dashboard |
| `lambdas/damage_detection/` | Lambda: S3 event -> SageMaker -> DynamoDB |
| `lambdas/review_api/` | Lambda: GET /tunnel/events/{event_id} |
| `model/` | SageMaker model deployment script + config |
| `scripts/` | Simulation and E2E test scripts |
| `docs/` | PRD, Pi setup guides, [sprint QA checklist (Pi)](docs/SPRINT_QA_CHECKLIST_RASPBERRY_PI.md) |

## Quick Start

### 1. Raspberry Pi Setup

Full production steps (ONNX model, `/etc/tunnel-detect` env, systemd units, RTSP rotation) are in **[`docs/PI_DEPLOYMENT.md`](docs/PI_DEPLOYMENT.md)**. Env template: [`docs/tunnel-detect.env.example`](docs/tunnel-detect.env.example).

```bash
cd pi
chmod +x setup_pi.sh
./setup_pi.sh
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Run the Trigger Server on the Pi

```bash
cd pi
python trigger_server.py
```

The server starts on port 8000. Endpoints:

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/trigger` | Sensor webhook (capture + upload) |
| POST | `/trigger/manual` | Manual trigger for testing |
| GET | `/health` | Pi health check |
| GET | `/cameras` | List discovered cameras |
| GET | `/queue/status` | Offline queue stats |

### 3. Deploy AWS Infrastructure

```bash
cd infra
pip install -r requirements.txt
cdk bootstrap   # first time only
cdk deploy --all
```

### 4. Deploy the SageMaker Model

```bash
cd model
export MODEL_ARTIFACT_S3_URI=s3://your-bucket/model.tar.gz
export SAGEMAKER_IMAGE_URI=<framework-container-uri>
python deploy_endpoint.py
```

### 5. Test the Pipeline

```bash
# Simulate a sensor trigger
./scripts/simulate_trigger.sh <pi-ip> 8000

# End-to-end test (upload image -> verify DynamoDB result)
export S3_BUCKET=tunnel-images-<account-id>
python scripts/test_pipeline_e2e.py camera_062.jpg
```

## Environment Variables

### Pi Edge Layer (`pi/`)

| Variable | Default | Description |
|----------|---------|-------------|
| `AWS_REGION` | `us-east-1` | AWS region for S3 uploads |
| `S3_BUCKET` | `tunnel-images` | S3 bucket name |
| `LOCAL_STORAGE_PATH` | `/data/tunnel/images` | Local image storage directory |
| `UPLOAD_QUEUE_DB` | `/data/tunnel/queue.db` | SQLite queue database path |
| `IMAGE_MAX_DIMENSION` | `1920` | Max image dimension (resize before upload) |
| `IMAGE_JPEG_QUALITY` | `85` | JPEG compression quality |
| `SERVER_PORT` | `8000` | FastAPI server port |
| `LOG_LEVEL` | `INFO` | Logging level |

### AWS Lambdas

| Variable | Description |
|----------|-------------|
| `SAGEMAKER_ENDPOINT` | SageMaker endpoint name |
| `DYNAMODB_TABLE` | DynamoDB table name |
| `CONFIDENCE_THRESHOLD` | Min confidence to flag damage (default: 0.6) |
| `S3_BUCKET` | S3 bucket (for presigned URLs) |

## Tests

```bash
# Pi unit tests
cd pi && source .venv/bin/activate
pip install pytest-asyncio
python -m pytest tests/ -v

# CDK synth (validates infrastructure)
cd infra && cdk synth
```

## When the Sensor Arrives

Configure the motion sensor's webhook URL to:
```
http://<pi-ip-address>:8000/trigger
```

Payload format:
```json
{"sensor_id": "tunnel_entrance_1", "timestamp": "2026-02-26T10:30:00Z"}
```
