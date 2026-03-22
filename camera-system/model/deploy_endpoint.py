#!/usr/bin/env python3
"""
Deploy the trained damage detection model to a SageMaker real-time endpoint.

Usage:
    export MODEL_ARTIFACT_S3_URI=s3://your-bucket/model.tar.gz
    export SAGEMAKER_IMAGE_URI=<framework-image-uri>
    python deploy_endpoint.py

The script creates (or updates) a SageMaker model, endpoint configuration,
and endpoint. It waits for the endpoint to become InService.
"""

from __future__ import annotations

import logging
import sys
import time

import boto3

import config as cfg

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

sm = boto3.client("sagemaker", region_name=cfg.AWS_REGION)


def _get_or_default_image_uri() -> str:
    """Return the inference container image URI."""
    if cfg.INFERENCE_IMAGE_URI:
        return cfg.INFERENCE_IMAGE_URI
    logger.error(
        "SAGEMAKER_IMAGE_URI is required. Set it to the SageMaker framework "
        "container URI for your model (e.g. PyTorch, TensorFlow, or custom)."
    )
    sys.exit(1)


def create_model(model_name: str, image_uri: str) -> None:
    """Create or replace a SageMaker model."""
    try:
        sm.delete_model(ModelName=model_name)
        logger.info("Deleted existing model: %s", model_name)
    except sm.exceptions.ClientError:
        pass

    execution_role = _get_execution_role()

    sm.create_model(
        ModelName=model_name,
        PrimaryContainer={
            "Image": image_uri,
            "ModelDataUrl": cfg.MODEL_ARTIFACT_S3_URI,
        },
        ExecutionRoleArn=execution_role,
    )
    logger.info("Created model: %s", model_name)


def create_endpoint_config(config_name: str, model_name: str) -> None:
    """Create or replace an endpoint configuration."""
    try:
        sm.delete_endpoint_config(EndpointConfigName=config_name)
        logger.info("Deleted existing endpoint config: %s", config_name)
    except sm.exceptions.ClientError:
        pass

    sm.create_endpoint_config(
        EndpointConfigName=config_name,
        ProductionVariants=[
            {
                "VariantName": "primary",
                "ModelName": model_name,
                "InstanceType": cfg.INSTANCE_TYPE,
                "InitialInstanceCount": cfg.INITIAL_INSTANCE_COUNT,
            },
        ],
    )
    logger.info("Created endpoint config: %s", config_name)


def deploy_endpoint(endpoint_name: str, config_name: str) -> None:
    """Create or update a SageMaker endpoint and wait for it to be InService."""
    try:
        sm.describe_endpoint(EndpointName=endpoint_name)
        logger.info("Updating existing endpoint: %s", endpoint_name)
        sm.update_endpoint(
            EndpointName=endpoint_name,
            EndpointConfigName=config_name,
        )
    except sm.exceptions.ClientError:
        logger.info("Creating new endpoint: %s", endpoint_name)
        sm.create_endpoint(
            EndpointName=endpoint_name,
            EndpointConfigName=config_name,
        )

    _wait_for_endpoint(endpoint_name)


def _wait_for_endpoint(endpoint_name: str, timeout_minutes: int = 15) -> None:
    """Poll until the endpoint is InService or times out."""
    deadline = time.time() + timeout_minutes * 60
    while time.time() < deadline:
        resp = sm.describe_endpoint(EndpointName=endpoint_name)
        status = resp["EndpointStatus"]
        logger.info("Endpoint %s status: %s", endpoint_name, status)
        if status == "InService":
            logger.info("Endpoint is live.")
            return
        if status == "Failed":
            reason = resp.get("FailureReason", "unknown")
            logger.error("Endpoint creation failed: %s", reason)
            sys.exit(1)
        time.sleep(30)

    logger.error("Timeout waiting for endpoint to become InService")
    sys.exit(1)


def _get_execution_role() -> str:
    """Get the SageMaker execution role ARN from the environment or IAM."""
    role = cfg.__dict__.get("SAGEMAKER_EXECUTION_ROLE", "")
    if not role:
        sts = boto3.client("sts", region_name=cfg.AWS_REGION)
        account_id = sts.get_caller_identity()["Account"]
        role = f"arn:aws:iam::{account_id}:role/SageMakerExecutionRole"
        logger.warning("Using default role: %s (create it if it doesn't exist)", role)
    return role


def main() -> None:
    image_uri = _get_or_default_image_uri()
    model_name = cfg.ENDPOINT_NAME
    config_name = f"{cfg.ENDPOINT_NAME}-config"

    logger.info("Model artifact: %s", cfg.MODEL_ARTIFACT_S3_URI)
    logger.info("Image URI: %s", image_uri)
    logger.info("Instance type: %s x%d", cfg.INSTANCE_TYPE, cfg.INITIAL_INSTANCE_COUNT)

    create_model(model_name, image_uri)
    create_endpoint_config(config_name, model_name)
    deploy_endpoint(cfg.ENDPOINT_NAME, config_name)

    logger.info("Deployment complete: endpoint=%s", cfg.ENDPOINT_NAME)


if __name__ == "__main__":
    main()
