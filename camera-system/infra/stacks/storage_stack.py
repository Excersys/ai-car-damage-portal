"""
Storage stack: S3 bucket, DynamoDB table, and damage-detection Lambda (same stack
as the bucket so S3 event notifications do not create a cross-stack dependency cycle).
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


class StorageStack(cdk.Stack):
    """S3 bucket, DynamoDB table, and Lambda processing for tunnel damage detection."""

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        self.image_bucket = s3.Bucket(
            self,
            "TunnelImagesBucket",
            bucket_name=f"tunnel-images-{cdk.Aws.ACCOUNT_ID}",
            versioned=True,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            encryption=s3.BucketEncryption.S3_MANAGED,
            removal_policy=cdk.RemovalPolicy.RETAIN,
            lifecycle_rules=[
                s3.LifecycleRule(
                    id="archive-old-images",
                    transitions=[
                        s3.Transition(
                            storage_class=s3.StorageClass.INFREQUENT_ACCESS,
                            transition_after=cdk.Duration.days(90),
                        ),
                    ],
                ),
            ],
        )

        # Sort key: one row per frame — "{camera_id}#{frame_stem}" e.g. rtsp_0#frame_0001
        self.events_table = dynamodb.Table(
            self,
            "TunnelDamageEvents",
            table_name="tunnel_damage_events",
            partition_key=dynamodb.Attribute(
                name="event_id", type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="camera_frame", type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=cdk.RemovalPolicy.RETAIN,
            point_in_time_recovery_specification=dynamodb.PointInTimeRecoverySpecification(
                point_in_time_recovery_enabled=True,
            ),
        )

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
                "DYNAMODB_TABLE": self.events_table.table_name,
                "CONFIDENCE_THRESHOLD": confidence_threshold.value_as_string,
            },
        )

        self.image_bucket.grant_read(self.damage_detection_fn)
        self.events_table.grant_write_data(self.damage_detection_fn)

        self.damage_detection_fn.add_to_role_policy(
            iam.PolicyStatement(
                actions=["sagemaker:InvokeEndpoint"],
                resources=[
                    f"arn:aws:sagemaker:{cdk.Aws.REGION}:{cdk.Aws.ACCOUNT_ID}"
                    f":endpoint/{sagemaker_endpoint_name.value_as_string}",
                ],
            )
        )

        self.image_bucket.add_event_notification(
            s3.EventType.OBJECT_CREATED,
            s3n.LambdaDestination(self.damage_detection_fn),
            s3.NotificationKeyFilter(prefix="scans/", suffix=".jpg"),
        )

        cdk.CfnOutput(self, "BucketName", value=self.image_bucket.bucket_name)
        cdk.CfnOutput(self, "TableName", value=self.events_table.table_name)
