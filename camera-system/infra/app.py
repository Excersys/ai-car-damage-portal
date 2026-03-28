#!/usr/bin/env python3
"""
CDK application entry point.
Deploys all stacks for the Tunnel Damage Detection system.

Usage:
    cdk deploy --all --context environment=dev
    cdk deploy --all --context environment=prod
"""

from __future__ import annotations

import json
from pathlib import Path

import aws_cdk as cdk

from stacks.storage_stack import StorageStack
from stacks.inference_stack import InferenceStack
from stacks.api_stack import ApiStack
from stacks.monitoring_stack import MonitoringStack
from stacks.sagemaker_role_stack import SageMakerRoleStack

app = cdk.App()

env_name: str = app.node.try_get_context("environment") or "dev"

_ENV_CFG_PATH = Path(__file__).resolve().parent.parent.parent / "infra" / "environments.json"
if _ENV_CFG_PATH.exists():
    _envs = json.loads(_ENV_CFG_PATH.read_text())
    _cfg = _envs.get(env_name, {})
    account = _cfg.get("account") or app.node.try_get_context("account")
    region = _cfg.get("region") or app.node.try_get_context("region") or "us-east-1"
else:
    account = app.node.try_get_context("account")
    region = app.node.try_get_context("region") or "us-east-1"

cdk_env = cdk.Environment(account=account, region=region)

COMMON_TAGS = {"Project": "AICarRental", "Environment": env_name, "Component": "Tunnel"}

storage = StorageStack(
    app,
    f"TunnelStorage-{env_name}",
    env_name=env_name,
    env=cdk_env,
)

inference = InferenceStack(
    app,
    f"TunnelInference-{env_name}",
    env_name=env_name,
    image_bucket=storage.image_bucket,
    events_table=storage.events_table,
    env=cdk_env,
)

api = ApiStack(
    app,
    f"TunnelApi-{env_name}",
    env_name=env_name,
    image_bucket=storage.image_bucket,
    events_table=storage.events_table,
    env=cdk_env,
)

MonitoringStack(
    app,
    f"TunnelMonitoring-{env_name}",
    env_name=env_name,
    inference_lambda=inference.damage_detection_fn,
    review_lambda=api.review_fn,
    env=cdk_env,
)

SageMakerRoleStack(
    app,
    f"TunnelSageMakerRole-{env_name}",
    env_name=env_name,
    image_bucket=storage.image_bucket,
    env=cdk_env,
)

for stack in app.node.children:
    if isinstance(stack, cdk.Stack):
        for key, val in COMMON_TAGS.items():
            cdk.Tags.of(stack).add(key, val)

app.synth()
