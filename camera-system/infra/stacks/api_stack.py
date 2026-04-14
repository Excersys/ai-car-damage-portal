"""
API stack: API Gateway REST API with a ReviewAPI Lambda for querying damage events
and submitting QC decisions.
"""

from constructs import Construct
import aws_cdk as cdk
from aws_cdk import (
    aws_apigateway as apigw,
    aws_dynamodb as dynamodb,
    aws_lambda as _lambda,
    aws_s3 as s3,
    aws_ssm as ssm,
)


class ApiStack(cdk.Stack):
    """REST API for reviewing tunnel damage detection events."""

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

        self.review_fn = _lambda.Function(
            self,
            "ReviewApiFn",
            function_name=f"TunnelReviewApi-{env_name}",
            runtime=_lambda.Runtime.PYTHON_3_11,
            handler="handler.lambda_handler",
            code=_lambda.Code.from_asset("../lambdas/review_api"),
            memory_size=256,
            timeout=cdk.Duration.seconds(30),
            environment={
                "DYNAMODB_TABLE": events_table.table_name,
                "S3_BUCKET": image_bucket.bucket_name,
                "PRESIGNED_URL_EXPIRY": "3600",
            },
        )

        events_table.grant_read_write_data(self.review_fn)
        image_bucket.grant_read(self.review_fn)

        api = apigw.RestApi(
            self,
            "TunnelApi",
            rest_api_name=f"TunnelDamageDetectionAPI-{env_name}",
            description="API for reviewing tunnel car damage detection results",
            deploy_options=apigw.StageOptions(stage_name="v1"),
            default_cors_preflight_options=apigw.CorsOptions(
                allow_origins=apigw.Cors.ALL_ORIGINS,
                allow_methods=["GET", "POST", "OPTIONS"],
                allow_headers=[
                    "Content-Type",
                    "X-Api-Key",
                    "Authorization",
                ],
            ),
        )

        api_key = api.add_api_key(
            "TunnelApiKey",
            api_key_name=f"tunnel-api-key-{env_name}",
        )

        plan = api.add_usage_plan(
            "TunnelUsagePlan",
            name=f"TunnelStandard-{env_name}",
            throttle=apigw.ThrottleSettings(rate_limit=50, burst_limit=100),
        )
        plan.add_api_key(api_key)
        plan.add_api_stage(stage=api.deployment_stage)

        tunnel = api.root.add_resource("tunnel")
        events_res = tunnel.add_resource("events")
        event_by_id = events_res.add_resource("{event_id}")

        events_res.add_method(
            "GET",
            apigw.LambdaIntegration(self.review_fn),
            api_key_required=True,
        )

        event_by_id.add_method(
            "GET",
            apigw.LambdaIntegration(self.review_fn),
            api_key_required=True,
        )

        event_qc = event_by_id.add_resource("qc")
        event_qc.add_method(
            "POST",
            apigw.LambdaIntegration(self.review_fn),
            api_key_required=True,
        )

        cdk.CfnOutput(self, "ApiUrl", value=api.url)

        ssm.StringParameter(
            self,
            "SSMApiUrl",
            parameter_name=f"/acr/{env_name}/tunnel/api-url",
            string_value=api.url,
            description="Tunnel API Gateway URL",
        )
        ssm.StringParameter(
            self,
            "SSMApiKeyId",
            parameter_name=f"/acr/{env_name}/tunnel/api-key-id",
            string_value=api_key.key_id,
            description="Tunnel API key ID",
        )
