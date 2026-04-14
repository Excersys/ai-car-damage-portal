# Spike: Model Artifact and Inference Hosting Strategy

**Ticket:** ACR-115 | **Status:** Decision made

## Decision Summary

**Three-mode inference** is already implemented in the CDK infrastructure via `InferenceMode` parameter. The recommended path forward:

| Mode | When to use | Cost | Latency |
|------|------------|------|---------|
| **stub** | Dev/testing without model | Free | ~100ms |
| **onnx** | Low-traffic / cost-sensitive | Lambda only | ~2-5s cold, ~500ms warm |
| **sagemaker** | Production with real-time requirements | ~$0.07/hr (ml.m5.large) | ~200ms |

### Recommended Rollout

1. **Dev/Staging:** `InferenceMode=stub` or `onnx` (no SageMaker cost)
2. **Production MVP:** `InferenceMode=onnx` with Lambda layer containing ONNX Runtime + model weights
3. **Production Scale:** `InferenceMode=sagemaker` when volume justifies always-on endpoint

## Artifact Storage

| Artifact | Location | Notes |
|----------|----------|-------|
| YOLO vehicle detection model (.pt) | Pi local filesystem | Runs on-device, not in cloud |
| Damage detection model (.onnx) | S3 bucket → Lambda layer | Packaged as Lambda layer ARN via `damageDetectionOnnxLayerArn` CDK context |
| SageMaker model artifacts | S3 → SageMaker Model Registry | Deployed via `deploy_endpoint.py` script |

**Never in git.** Model files are too large for version control.

## CI/CD Promotion

```
Train model → Export to ONNX → Upload to S3 (versioned)
                                    ↓
                        Build Lambda layer (zip with onnxruntime + model.onnx)
                                    ↓
                        Publish layer version → update CDK context
                                    ↓
                        Deploy: cdk deploy --context damageDetectionOnnxLayerArn=arn:...
```

For SageMaker:
```
Train model → Upload to S3 → Create SageMaker Model → Create/Update Endpoint
                                    ↓
                        deploy_endpoint.py (already exists in camera-system/model/)
```

## Rollback

- **ONNX:** Revert `damageDetectionOnnxLayerArn` to previous layer version, redeploy
- **SageMaker:** Update endpoint to previous model version, or switch `InferenceMode` back to `onnx`
- **Emergency:** Set `InferenceMode=stub` — returns placeholder results, no inference errors

## Pi vs Cloud Responsibilities

| Component | Runs on | Purpose |
|-----------|---------|---------|
| YOLO vehicle detection | Raspberry Pi | Trigger: detect car entering tunnel |
| Frame capture + upload | Raspberry Pi | Capture images, upload to S3 |
| Damage detection inference | AWS Lambda / SageMaker | Analyze uploaded frames for damage |
| Result storage | AWS (DynamoDB) | Store inference results |
| QC review | Portal (Vercel) | Human review of AI decisions |

## Infrastructure Already in Place

- `inference_stack.py` — Lambda with `INFERENCE_MODE` env var, S3 trigger, SageMaker IAM
- `sagemaker_role_stack.py` — IAM role for SageMaker endpoint with S3/ECR access
- `deploy_endpoint.py` — Script to create/update SageMaker endpoints
- CDK context params: `grantSageMakerInvoke`, `damageDetectionOnnxLayerArn`
