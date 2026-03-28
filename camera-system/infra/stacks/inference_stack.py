"""
Inference stack: DamageDetection Lambda triggered by S3 ObjectCreated events
via EventBridge (avoids cross-stack circular dependency with the bucket).
Invokes a SageMaker endpoint and writes results to DynamoDB.
"""

from __future__ import annotations

import sys
from pathlib import Path

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
    """Lambda that processes uploaded images through SageMaker."""

    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        *,
        env_name: str = "dev",
        image_bucket: s3.IBucket,
        events_table: dynamodb.ITable,
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

        self.damage_detection_fn = _lambda.Function(
            self,
            "DamageDetectionFn",
            function_name=f"TunnelDamageDetection-{env_name}",
            runtime=_lambda.Runtime.PYTHON_3_11,
            handler="handler.lambda_handler",
            code=_lambda.Code.from_asset("../lambdas/damage_detection"),
            memory_size=512,
            timeout=cdk.Duration.seconds(60),
            environment={
                "SAGEMAKER_ENDPOINT": sagemaker_endpoint_name.value_as_string,
                "DYNAMODB_TABLE": events_table.table_name,
                "CONFIDENCE_THRESHOLD": confidence_threshold.value_as_string,
            },
        )

        image_bucket.grant_read(self.damage_detection_fn)
        events_table.grant_write_data(self.damage_detection_fn)

        self.damage_detection_fn.add_to_role_policy(
            iam.PolicyStatement(
                actions=["sagemaker:InvokeEndpoint"],
                resources=[
                    f"arn:aws:sagemaker:{cdk.Aws.REGION}:{cdk.Aws.ACCOUNT_ID}"
                    f":endpoint/{sagemaker_endpoint_name.value_as_string}",
                ],
            )
        )

        # EventBridge rule triggers the Lambda on S3 ObjectCreated events
        # for JPEG uploads under the scans/ prefix. This avoids the
        # cross-stack circular dependency that S3 bucket notifications cause.
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
