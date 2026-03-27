"""
Storage stack: S3 bucket for tunnel images and DynamoDB table for damage events.
"""

from constructs import Construct
import aws_cdk as cdk
from aws_cdk import (
    aws_dynamodb as dynamodb,
    aws_s3 as s3,
)


class StorageStack(cdk.Stack):
    """S3 bucket and DynamoDB table for tunnel damage detection."""

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
            point_in_time_recovery=True,
        )

        cdk.CfnOutput(self, "BucketName", value=self.image_bucket.bucket_name)
        cdk.CfnOutput(self, "TableName", value=self.events_table.table_name)
