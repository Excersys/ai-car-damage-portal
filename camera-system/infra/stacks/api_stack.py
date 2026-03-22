"""
API stack: API Gateway REST API with a ReviewAPI Lambda for querying damage events.
"""

from constructs import Construct
import aws_cdk as cdk
from aws_cdk import (
    aws_apigateway as apigw,
    aws_dynamodb as dynamodb,
    aws_lambda as _lambda,
    aws_s3 as s3,
)


class ApiStack(cdk.Stack):
    """REST API for reviewing tunnel damage detection events."""

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

        self.review_fn = _lambda.Function(
            self,
            "ReviewApiFn",
            function_name="TunnelReviewApi",
            runtime=_lambda.Runtime.PYTHON_3_11,
            handler="handler.lambda_handler",
            code=_lambda.Code.from_asset("../lambdas/review_api"),
            memory_size=256,
            timeout=cdk.Duration.seconds(15),
            environment={
                "DYNAMODB_TABLE": events_table.table_name,
                "S3_BUCKET": image_bucket.bucket_name,
                "PRESIGNED_URL_EXPIRY": "3600",
            },
        )

        events_table.grant_read_data(self.review_fn)
        image_bucket.grant_read(self.review_fn)

        api = apigw.RestApi(
            self,
            "TunnelApi",
            rest_api_name="TunnelDamageDetectionAPI",
            description="API for reviewing tunnel car damage detection results",
            deploy_options=apigw.StageOptions(stage_name="v1"),
        )

        api_key = api.add_api_key("TunnelApiKey", api_key_name="tunnel-api-key")

        plan = api.add_usage_plan(
            "TunnelUsagePlan",
            name="TunnelStandard",
            throttle=apigw.ThrottleSettings(rate_limit=50, burst_limit=100),
        )
        plan.add_api_key(api_key)
        plan.add_api_stage(stage=api.deployment_stage)

        tunnel = api.root.add_resource("tunnel")
        events = tunnel.add_resource("events")
        event_by_id = events.add_resource("{event_id}")

        event_by_id.add_method(
            "GET",
            apigw.LambdaIntegration(self.review_fn),
            api_key_required=True,
        )

        cdk.CfnOutput(self, "ApiUrl", value=api.url)
