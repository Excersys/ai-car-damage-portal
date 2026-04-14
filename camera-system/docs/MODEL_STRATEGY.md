# Tunnel damage detection: model acquisition, ONNX, and cost

This document describes how to obtain a model, run it cost-effectively in AWS, and when to move to SageMaker.

## Deployment modes (`INFERENCE_MODE`)

The Damage Detection Lambda supports three modes (set via environment variable `INFERENCE_MODE`):

| Mode | Use case | Cost profile |
|------|----------|----------------|
| `sagemaker` | Production-grade GPU/CPU endpoint, custom containers | Pay for the endpoint instance (or Serverless config) + invocations |
| `onnx` | **Interim / low traffic**: ONNX file + CPU inference in Lambda | Lambda GB-seconds + S3/DynamoDB; no SageMaker infrastructure |
| `stub` | CI, pipeline smoke tests, local wiring | Minimal; returns a fixed low-confidence result (no real model) |

Default in CDK remains **`sagemaker`** for backward compatibility with existing stacks. For cost-sensitive pilots, set **`onnx`** and supply a model (see below).

## Cost comparison (rules of thumb)

- **Lambda + ONNX (CPU)**  
  - Best when invocation volume is low or bursty and latency of a few seconds is acceptable.  
  - You pay per invoke and memory duration; there is no always-on inference fleet.  
  - Watch **deployment package size** and **memory**: ONNX Runtime adds binary weight; use a **Lambda layer** for `onnxruntime` + model if the function ZIP grows large.

- **SageMaker real-time endpoint**  
  - Best when you need steady throughput, strict latency, or a custom GPU stack.  
  - You pay for the instance while the endpoint is **InService** (unless you use Serverless Inference or scale-to-zero patterns).

- **SageMaker Serverless Inference**  
  - Middle ground: pay per inference when traffic is intermittent; cold starts apply.

**Recommendation:** Start with **`onnx`** for early tunnel rollout and validation; move to **SageMaker** when traffic, SLA, or model size (e.g. large detectors) justifies dedicated capacity.

## Model acquisition

1. **Train or obtain weights**  
   Use your team’s preferred workflow (e.g. YOLOv8 / Ultralytics, custom PyTorch). The contract expected downstream is documented in `camera-system/lambdas/review_api/contracts.py` (`validate_inference_response`): at minimum **`confidence`** in `[0, 1]`; optional **`damage_type`**, **`bounding_boxes`**.

2. **Export to ONNX**  
   - PyTorch: `torch.onnx.export` or `torch.onnx.dynamo_export` as appropriate.  
   - Ultralytics YOLO: `model.export(format="onnx")` (verify input size and NCHW vs NHWC).  
   - Validate outputs in a notebook before uploading.

3. **Classification-style ONNX in Lambda**  
   The reference `onnx` path treats the primary output as **class logits** (vector). It applies softmax, uses the max probability as **`confidence`**, and maps the argmax index to labels from `ONNX_CLASS_NAMES` (comma-separated, default `none,scratch,dent,bent`).  
   **Detection models** (many bounding boxes) need a dedicated post-process aligned to your export; extend the handler or wrap a small adapter when you standardize on a single architecture.

4. **Where to put the file**  
   - **Function bundle:** `ONNX_MODEL_PATH` pointing at a file under the deployment package (small models only).  
   - **Lambda layer (recommended for larger artifacts):** place the model under e.g. `/opt/models/model.onnx` and set `ONNX_MODEL_PATH=/opt/models/model.onnx`.  
   - **S3 download (optional future):** cache on cold start; not implemented in the baseline handler.

## CDK: SageMaker IAM vs ONNX-only

- By default the stack still grants `sagemaker:InvokeEndpoint` when you deploy with **`grantSageMakerInvoke`** unset (see `infra/app.py` context).  
- For **onnx** or **stub**-only environments, deploy with:

  ```bash
  cdk deploy -c grantSageMakerInvoke=false
  ```

  so the role does not include SageMaker invoke (least privilege).

- Optional **ONNX layer ARN** (context key `damageDetectionOnnxLayerArn`): attach a layer that contains `onnxruntime` wheels and/or the `.onnx` file.

## Operational checklist

- [ ] Set `INFERENCE_MODE` and `ONNX_MODEL_PATH` / layer as appropriate.  
- [ ] Tune Lambda **memory** and **timeout** for ONNX (often 1024 MB+ for medium models).  
- [ ] Confirm outputs satisfy `validate_inference_response` and stored rows pass `validate_stored_damage_row`.  
- [ ] If using SageMaker, keep `SAGEMAKER_ENDPOINT` in sync with the deployed endpoint name.
