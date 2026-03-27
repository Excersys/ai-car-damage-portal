#!/usr/bin/env python3
"""
End-to-end pipeline test.
Uploads a test image directly to S3 and verifies that the inference Lambda
processes it and writes results to DynamoDB.

Usage:
    export AWS_REGION=us-east-1
    export S3_BUCKET=tunnel-images-<account-id>
    export DYNAMODB_TABLE=tunnel_damage_events
    python test_pipeline_e2e.py [path-to-test-image]
"""

from __future__ import annotations

import json
import os
import sys
import time
import uuid

import boto3

AWS_REGION = os.environ.get("AWS_REGION", "us-east-1")
S3_BUCKET = os.environ["S3_BUCKET"]
DYNAMODB_TABLE = os.environ.get("DYNAMODB_TABLE", "tunnel_damage_events")

s3 = boto3.client("s3", region_name=AWS_REGION)
dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)
table = dynamodb.Table(DYNAMODB_TABLE)


def main() -> int:
    test_image = sys.argv[1] if len(sys.argv) > 1 else "camera_062.jpg"
    if not os.path.exists(test_image):
        print(f"Test image not found: {test_image}", file=sys.stderr)
        return 1

    event_id = f"e2e-test-{uuid.uuid4().hex[:8]}"
    camera_id = "test_cam_0"
    s3_key = f"scans/unknown/{event_id}/{camera_id}/frame_0000.jpg"

    print(f"Event ID:  {event_id}")
    print(f"S3 Key:    {s3_key}")
    print(f"Image:     {test_image}")
    print()

    print("1. Uploading test image to S3...")
    s3.upload_file(
        test_image,
        S3_BUCKET,
        s3_key,
        ExtraArgs={"ContentType": "image/jpeg"},
    )
    print(f"   Uploaded to s3://{S3_BUCKET}/{s3_key}")
    print()

    print("2. Waiting for Lambda to process (polling DynamoDB)...")
    result = _poll_dynamodb(event_id, f"{camera_id}#frame_0000", timeout_s=60)

    if result is None:
        print("   TIMEOUT: No result found in DynamoDB after 60s", file=sys.stderr)
        print("   Check CloudWatch logs for the DamageDetection Lambda.", file=sys.stderr)
        return 1

    print("   Result found!")
    print(f"   Damage detected: {result.get('damage_detected')}")
    print(f"   Damage type:     {result.get('damage_type')}")
    print(f"   Confidence:      {result.get('confidence_score')}")
    print(f"   Full result:     {json.dumps(result, indent=2, default=str)}")
    print()

    print("3. Cleaning up test data...")
    s3.delete_object(Bucket=S3_BUCKET, Key=s3_key)
    table.delete_item(Key={"event_id": event_id, "camera_id": f"{camera_id}#frame_0000"})
    print("   Cleaned up.")
    print()

    print("E2E test PASSED.")
    return 0


def _poll_dynamodb(event_id: str, camera_frame: str, timeout_s: int = 60) -> dict | None:
    """Poll DynamoDB until the result appears or timeout."""
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        resp = table.get_item(Key={"event_id": event_id, "camera_frame": camera_frame})
        item = resp.get("Item")
        if item:
            return item
        time.sleep(3)
        print("   ... still waiting")
    return None


if __name__ == "__main__":
    sys.exit(main())
