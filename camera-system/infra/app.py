#!/usr/bin/env python3
"""
CDK application entry point.
Deploys all stacks for the Tunnel Damage Detection system.
"""

import aws_cdk as cdk

from stacks.storage_stack import StorageStack
from stacks.api_stack import ApiStack
from stacks.monitoring_stack import MonitoringStack

app = cdk.App()

env = cdk.Environment(
    account=app.node.try_get_context("account"),
    region=app.node.try_get_context("region") or "us-east-1",
)

_grant_sm = app.node.try_get_context("grantSageMakerInvoke")
if _grant_sm is None:
    grant_sagemaker_invoke = True
elif isinstance(_grant_sm, str):
    grant_sagemaker_invoke = _grant_sm.lower() in ("true", "1", "yes")
else:
    grant_sagemaker_invoke = bool(_grant_sm)

onnx_layer_arn = app.node.try_get_context("damageDetectionOnnxLayerArn")

storage = StorageStack(
    app,
    "TunnelStorage",
    env=env,
    grant_sagemaker_invoke=grant_sagemaker_invoke,
    onnx_layer_arn=onnx_layer_arn,
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
    inference_lambda=storage.damage_detection_fn,
    review_lambda=api.review_fn,
    env=env,
)

app.synth()
