"""
SageMaker execution role stack.
Creates an IAM role for SageMaker model deployment with access to the
tunnel-images S3 bucket and CloudWatch logging.
"""

from constructs import Construct
import aws_cdk as cdk
from aws_cdk import (
    aws_iam as iam,
    aws_s3 as s3,
)


class SageMakerRoleStack(cdk.Stack):
    """IAM role used by the SageMaker endpoint at inference time."""

    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        *,
        image_bucket: s3.IBucket,
        **kwargs,
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        self.execution_role = iam.Role(
            self,
            "TunnelSageMakerExecutionRole",
            role_name="TunnelSageMakerExecutionRole",
            assumed_by=iam.ServicePrincipal("sagemaker.amazonaws.com"),
            managed_policies=[
                iam.ManagedPolicy.from_aws_managed_policy_name(
                    "AmazonSageMakerFullAccess"
                ),
            ],
        )

        image_bucket.grant_read(self.execution_role)

        self.execution_role.add_to_policy(
            iam.PolicyStatement(
                actions=[
                    "logs:CreateLogGroup",
                    "logs:CreateLogStream",
                    "logs:PutLogEvents",
                ],
                resources=["arn:aws:logs:*:*:*"],
            )
        )

        cdk.CfnOutput(
            self,
            "ExecutionRoleArn",
            value=self.execution_role.role_arn,
            description="SageMaker execution role ARN — set as SAGEMAKER_EXECUTION_ROLE",
        )
