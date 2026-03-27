#!/usr/bin/env python3
"""
CDK application entry point.
Deploys all stacks for the Tunnel Damage Detection system.
"""

import aws_cdk as cdk

from stacks.storage_stack import StorageStack
from stacks.inference_stack import InferenceStack
from stacks.api_stack import ApiStack
from stacks.monitoring_stack import MonitoringStack
from stacks.sagemaker_role_stack import SageMakerRoleStack

app = cdk.App()

env = cdk.Environment(
    account=app.node.try_get_context("account"),
    region=app.node.try_get_context("region") or "us-east-1",
)

storage = StorageStack(app, "TunnelStorage", env=env)

inference = InferenceStack(
    app,
    "TunnelInference",
    image_bucket=storage.image_bucket,
    events_table=storage.events_table,
    env=env,
)

api = ApiStack(
    app,
    "TunnelApi",
    image_bucket=storage.image_bucket,
    events_table=storage.events_table,
    env=env,
)

MonitoringStack(
    app,
    "TunnelMonitoring",
    inference_lambda=inference.damage_detection_fn,
    review_lambda=api.review_fn,
    env=env,
)

SageMakerRoleStack(
    app,
    "TunnelSageMakerRole",
    image_bucket=storage.image_bucket,
    env=env,
)

app.synth()
