"""
Inference stack: DamageDetection Lambda triggered by S3 ObjectCreated events.
Invokes a SageMaker endpoint and writes results to DynamoDB.
"""

from constructs import Construct
import aws_cdk as cdk
from aws_cdk import (
    aws_dynamodb as dynamodb,
    aws_iam as iam,
    aws_lambda as _lambda,
    aws_s3 as s3,
    aws_s3_notifications as s3n,
)


class InferenceStack(cdk.Stack):
    """Lambda that processes uploaded images through SageMaker."""

    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        *,
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
            function_name="TunnelDamageDetection",
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

        image_bucket.add_event_notification(
            s3.EventType.OBJECT_CREATED,
            s3n.LambdaDestination(self.damage_detection_fn),
            s3.NotificationKeyFilter(prefix="scans/", suffix=".jpg"),
        )
