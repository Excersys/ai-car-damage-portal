"""
Inference stack: DamageDetection Lambda triggered by S3 ObjectCreated events
via EventBridge. Supports SageMaker, ONNX, or stub inference via INFERENCE_MODE.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Optional

_CS_ROOT = Path(__file__).resolve().parents[2]
if str(_CS_ROOT) not in sys.path:
    sys.path.insert(0, str(_CS_ROOT))

from common.s3_paths import INFERENCE_S3_NOTIFICATION_PREFIX

from constructs import Construct
import aws_cdk as cdk
from aws_cdk import (
    aws_dynamodb as dynamodb,
    aws_events as events,
    aws_events_targets as targets,
    aws_iam as iam,
    aws_lambda as _lambda,
    aws_s3 as s3,
)


class InferenceStack(cdk.Stack):
    """Lambda that processes uploaded images through SageMaker / ONNX / stub."""

    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        *,
        env_name: str = "dev",
        image_bucket: s3.IBucket,
        events_table: dynamodb.ITable,
        grant_sagemaker_invoke: bool = True,
        onnx_layer_arn: Optional[str] = None,
        **kwargs,
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        sagemaker_endpoint_name = cdk.CfnParameter(
            self,
            "SageMakerEndpointName",
            type="String",
            default="tunnel-damage-detection",
            description="Name of the SageMaker real-time inference endpoint",
        )

        confidence_threshold = cdk.CfnParameter(
            self,
            "ConfidenceThreshold",
            type="String",
            default="0.6",
            description="Minimum confidence score to flag damage",
        )

        inference_mode = cdk.CfnParameter(
            self,
            "InferenceMode",
            type="String",
            default="sagemaker",
            allowed_values=["sagemaker", "onnx", "stub"],
            description="sagemaker=SageMaker endpoint; onnx=CPU ONNX in Lambda; stub=placeholder output",
        )

        onnx_model_path = cdk.CfnParameter(
            self,
            "OnnxModelPath",
            type="String",
            default="/opt/models/model.onnx",
            description="Filesystem path to the ONNX model when InferenceMode=onnx",
        )

        layers = []
        if onnx_layer_arn:
            layers.append(
                _lambda.LayerVersion.from_layer_version_arn(
                    self, "DamageDetectionOnnxLayer", onnx_layer_arn
                )
            )

        self.damage_detection_fn = _lambda.Function(
            self,
            "DamageDetectionFn",
            function_name=f"TunnelDamageDetection-{env_name}",
            runtime=_lambda.Runtime.PYTHON_3_11,
            handler="handler.lambda_handler",
            code=_lambda.Code.from_asset("../lambdas/damage_detection"),
            layers=layers,
            memory_size=1024,
            timeout=cdk.Duration.seconds(60),
            environment={
                "INFERENCE_MODE": inference_mode.value_as_string,
                "SAGEMAKER_ENDPOINT": sagemaker_endpoint_name.value_as_string,
                "ONNX_MODEL_PATH": onnx_model_path.value_as_string,
                "DYNAMODB_TABLE": events_table.table_name,
                "CONFIDENCE_THRESHOLD": confidence_threshold.value_as_string,
            },
        )

        image_bucket.grant_read(self.damage_detection_fn)
        events_table.grant_write_data(self.damage_detection_fn)

        if grant_sagemaker_invoke:
            self.damage_detection_fn.add_to_role_policy(
                iam.PolicyStatement(
                    actions=["sagemaker:InvokeEndpoint"],
                    resources=[
                        f"arn:aws:sagemaker:{cdk.Aws.REGION}:{cdk.Aws.ACCOUNT_ID}"
                        f":endpoint/{sagemaker_endpoint_name.value_as_string}",
                    ],
                )
            )

        prefix = INFERENCE_S3_NOTIFICATION_PREFIX
        events.Rule(
            self,
            "S3ObjectCreatedRule",
            rule_name=f"tunnel-scan-uploaded-{env_name}",
            event_pattern=events.EventPattern(
                source=["aws.s3"],
                detail_type=["Object Created"],
                detail={
                    "bucket": {"name": [image_bucket.bucket_name]},
                    "object": {"key": [{"prefix": prefix}, {"suffix": ".jpg"}]},
                },
            ),
            targets=[targets.LambdaFunction(self.damage_detection_fn)],
        )
