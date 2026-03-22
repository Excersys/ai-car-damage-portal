"""
Monitoring stack: CloudWatch alarms for Lambda errors and latency.
"""

from constructs import Construct
import aws_cdk as cdk
from aws_cdk import (
    aws_cloudwatch as cw,
    aws_lambda as _lambda,
)


class MonitoringStack(cdk.Stack):
    """CloudWatch alarms and dashboards for tunnel detection pipeline."""

    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        *,
        inference_lambda: _lambda.IFunction,
        review_lambda: _lambda.IFunction,
        **kwargs,
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        cw.Alarm(
            self,
            "InferenceLambdaErrors",
            alarm_name="TunnelInference-Errors",
            metric=inference_lambda.metric_errors(period=cdk.Duration.minutes(5)),
            evaluation_periods=1,
            threshold=1,
            comparison_operator=cw.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            treat_missing_data=cw.TreatMissingData.NOT_BREACHING,
        )

        cw.Alarm(
            self,
            "InferenceLambdaDuration",
            alarm_name="TunnelInference-HighLatency",
            metric=inference_lambda.metric_duration(
                period=cdk.Duration.minutes(5),
                statistic="p99",
            ),
            evaluation_periods=2,
            threshold=30_000,
            comparison_operator=cw.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treat_missing_data=cw.TreatMissingData.NOT_BREACHING,
        )

        cw.Alarm(
            self,
            "ReviewLambdaErrors",
            alarm_name="TunnelReviewApi-Errors",
            metric=review_lambda.metric_errors(period=cdk.Duration.minutes(5)),
            evaluation_periods=1,
            threshold=3,
            comparison_operator=cw.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            treat_missing_data=cw.TreatMissingData.NOT_BREACHING,
        )

        dashboard = cw.Dashboard(
            self,
            "TunnelDashboard",
            dashboard_name="TunnelDamageDetection",
        )

        dashboard.add_widgets(
            cw.GraphWidget(
                title="Inference Lambda Invocations",
                left=[
                    inference_lambda.metric_invocations(period=cdk.Duration.minutes(5)),
                    inference_lambda.metric_errors(period=cdk.Duration.minutes(5)),
                ],
                width=12,
            ),
            cw.GraphWidget(
                title="Inference Lambda Duration",
                left=[
                    inference_lambda.metric_duration(
                        period=cdk.Duration.minutes(5), statistic="avg"
                    ),
                    inference_lambda.metric_duration(
                        period=cdk.Duration.minutes(5), statistic="p99"
                    ),
                ],
                width=12,
            ),
        )

        dashboard.add_widgets(
            cw.GraphWidget(
                title="Review API Invocations",
                left=[
                    review_lambda.metric_invocations(period=cdk.Duration.minutes(5)),
                    review_lambda.metric_errors(period=cdk.Duration.minutes(5)),
                ],
                width=12,
            ),
        )
