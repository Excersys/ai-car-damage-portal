# 🚗 Tunnel Car Damage Detection System

## Product Requirements Document (PRD)

------------------------------------------------------------------------

# 1. Overview

Build an automated AWS-based pipeline that:

1.  Detects when an object enters the tunnel\
2.  Captures images from 4 fixed cameras\
3.  Uploads images to AWS\
4.  Runs damage detection model inference\
5.  Stores results\
6.  Exposes API / dashboard for review

------------------------------------------------------------------------

# 2. System Architecture (High-Level)

Motion Sensor → Trigger API → Camera Capture → S3 Upload\
S3 Event → Lambda → SageMaker Endpoint (Model)\
Results → DynamoDB\
Dashboard / API / Alerts

------------------------------------------------------------------------

# 3. Phase 1 --- Tunnel Entry Detection

## 3.1 Objective

Detect when something enters the tunnel and trigger capture workflow.

## 3.2 Hardware

-   WiFi Motion Sensor (Shelly Motion 2 or similar)
-   Powered via USB
-   Sends HTTP webhook or MQTT message

## 3.3 Backend Requirements

### Task 1: Create API Gateway Endpoint

-   Method: POST
-   Route: /tunnel/trigger
-   Auth: API Key or IAM
-   Throttling enabled

### Task 2: Create Lambda -- TunnelTriggerHandler

Responsibilities: - Validate request - Generate event_id - Publish
message to SQS queue (tunnel-capture-queue) - Return 200 response

### Task 3: Configure Sensor Webhook

Sensor sends HTTP POST to: https://api.yourdomain.com/tunnel/trigger

Example Payload: { "sensor_id": "tunnel_entrance_1", "timestamp":
"ISO8601" }

------------------------------------------------------------------------

# 4. Phase 2 --- Camera Capture Layer

## 4.1 Objective

Capture images from all 4 cameras once triggered.

### Task 4: Create Capture Worker Lambda

Triggered by SQS message.

Responsibilities: - Call camera API endpoints - Retrieve image
snapshots - Store in S3: s3://tunnel-images/{event_id}/{camera_id}.jpg

### Task 5: Configure S3 Bucket

-   Bucket name: tunnel-images
-   Versioning enabled
-   Lifecycle rules (optional)
-   Block public access

------------------------------------------------------------------------

# 5. Phase 3 --- Model Inference

Assumption: Model already deployed as SageMaker Endpoint.

### Task 6: Create S3 Event Trigger

Trigger on ObjectCreated → invoke DamageDetectionLambda

### Task 7: Create Lambda -- DamageDetectionLambda

Responsibilities: - Read image from S3 - Send image to SageMaker
endpoint - Parse detection results - Store structured results in
DynamoDB

Example inference payload: { "image_s3_path": "...",
"confidence_threshold": 0.6 }

------------------------------------------------------------------------

# 6. Phase 4 --- Data Storage

## DynamoDB Table: tunnel_damage_events

Primary Key: - event_id (Partition Key)

Attributes: - timestamp - camera_id - damage_detected (boolean) -
damage_type - bounding_boxes - confidence_score - image_path

------------------------------------------------------------------------

# 7. Phase 5 --- API for Review

GET /tunnel/events/{event_id}

Returns: - Images - Damage results - Metadata

------------------------------------------------------------------------

# 8. Security Requirements

-   IAM roles with least privilege
-   S3 bucket private
-   API Gateway authentication
-   VPC endpoint for SageMaker
-   CloudWatch logging enabled

------------------------------------------------------------------------

# 9. Monitoring

-   CloudWatch alarms for:
    -   Lambda errors
    -   SageMaker latency
    -   SQS queue backlog
-   Enable structured logs

------------------------------------------------------------------------

# 10. Estimated Dev Timeline

Detection: 1 day\
Capture: 2 days\
S3 + Lambda: 1--2 days\
SageMaker Integration: 1 day\
API + Storage: 1--2 days

Total: \~7--10 days

------------------------------------------------------------------------

# 11. Definition of Done

-   Motion sensor triggers capture\
-   Images stored in S3 correctly\
-   Model runs automatically\
-   Damage results stored in DynamoDB\
-   API returns full event payload\
-   Logs show no runtime errors
