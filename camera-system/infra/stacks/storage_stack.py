"""
Storage stack: S3 bucket for tunnel images and DynamoDB table for damage events.
"""

from constructs import Construct
import aws_cdk as cdk
from aws_cdk import (
    aws_dynamodb as dynamodb,
    aws_s3 as s3,
    aws_ssm as ssm,
)


class StorageStack(cdk.Stack):
    """S3 bucket and DynamoDB table for tunnel damage detection."""

    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        *,
        env_name: str = "dev",
        **kwargs,
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        is_prod = env_name == "prod"

        self.image_bucket = s3.Bucket(
            self,
            "TunnelImagesBucket",
            bucket_name=f"tunnel-images-{env_name}-{cdk.Aws.ACCOUNT_ID}",
            versioned=True,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            encryption=s3.BucketEncryption.S3_MANAGED,
            removal_policy=cdk.RemovalPolicy.RETAIN if is_prod else cdk.RemovalPolicy.DESTROY,
            event_bridge_enabled=True,
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

        # Sort key must be unique per (camera, frame) for a burst, e.g.
        # ``cam_061#frame_0002``. Damage handler and Review API rely on this
        # (see lambdas/damage_detection/handler._store_result).
        self.events_table = dynamodb.Table(
            self,
            "TunnelDamageEvents",
            table_name=f"tunnel_damage_events_{env_name}",
            partition_key=dynamodb.Attribute(
                name="event_id", type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="camera_frame", type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=cdk.RemovalPolicy.RETAIN if is_prod else cdk.RemovalPolicy.DESTROY,
            point_in_time_recovery=True,
        )

        cdk.CfnOutput(self, "BucketName", value=self.image_bucket.bucket_name)
        cdk.CfnOutput(self, "TableName", value=self.events_table.table_name)

        ssm.StringParameter(
            self,
            "SSMBucketName",
            parameter_name=f"/acr/{env_name}/tunnel/bucket-name",
            string_value=self.image_bucket.bucket_name,
            description="Tunnel S3 bucket name",
        )
        ssm.StringParameter(
            self,
            "SSMTableName",
            parameter_name=f"/acr/{env_name}/tunnel/table-name",
            string_value=self.events_table.table_name,
            description="Tunnel DynamoDB table name",
        )
