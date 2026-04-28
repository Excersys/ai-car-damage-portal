"""
Monitoring stack: CloudWatch alarms, dashboards, and SNS notifications
for the Tunnel Damage Detection pipeline.
"""

from __future__ import annotations

from typing import Optional

from constructs import Construct
import aws_cdk as cdk
from aws_cdk import (
    aws_cloudwatch as cw,
    aws_cloudwatch_actions as cw_actions,
    aws_dynamodb as dynamodb,
    aws_lambda as _lambda,
    aws_sns as sns,
)


class MonitoringStack(cdk.Stack):
    """CloudWatch alarms, dashboards, and SNS alerts for the tunnel detection pipeline."""

    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        *,
        env_name: str = "dev",
        inference_lambda: _lambda.IFunction,
        review_lambda: _lambda.IFunction,
        sagemaker_endpoint_name: Optional[str] = None,
        events_table: Optional[dynamodb.ITable] = None,
        **kwargs,
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # --- SNS topic for alarm notifications ---
        self.alarm_topic = sns.Topic(
            self,
            "AlarmTopic",
            topic_name=f"TunnelAlarms-{env_name}",
            display_name=f"Tunnel Damage Detection Alarms ({env_name})",
        )
        alarm_action = cw_actions.SnsAction(self.alarm_topic)

        # --- Lambda alarms ---
        inference_errors_alarm = cw.Alarm(
            self,
            "InferenceLambdaErrors",
            alarm_name=f"TunnelInference-Errors-{env_name}",
            metric=inference_lambda.metric_errors(period=cdk.Duration.minutes(5)),
            evaluation_periods=1,
            threshold=1,
            comparison_operator=cw.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            treat_missing_data=cw.TreatMissingData.NOT_BREACHING,
        )
        inference_errors_alarm.add_alarm_action(alarm_action)

        inference_duration_alarm = cw.Alarm(
            self,
            "InferenceLambdaDuration",
            alarm_name=f"TunnelInference-HighLatency-{env_name}",
            metric=inference_lambda.metric_duration(
                period=cdk.Duration.minutes(5),
                statistic="p99",
            ),
            evaluation_periods=2,
            threshold=30_000,
            comparison_operator=cw.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treat_missing_data=cw.TreatMissingData.NOT_BREACHING,
        )
        inference_duration_alarm.add_alarm_action(alarm_action)

        review_errors_alarm = cw.Alarm(
            self,
            "ReviewLambdaErrors",
            alarm_name=f"TunnelReviewApi-Errors-{env_name}",
            metric=review_lambda.metric_errors(period=cdk.Duration.minutes(5)),
            evaluation_periods=1,
            threshold=3,
            comparison_operator=cw.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            treat_missing_data=cw.TreatMissingData.NOT_BREACHING,
        )
        review_errors_alarm.add_alarm_action(alarm_action)

        # --- Dashboard ---
        dashboard = cw.Dashboard(
            self,
            "TunnelDashboard",
            dashboard_name=f"TunnelDamageDetection-{env_name}",
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

        # --- SageMaker endpoint metrics (conditional) ---
        if sagemaker_endpoint_name:
            self._add_sagemaker_widgets(
                dashboard, sagemaker_endpoint_name, env_name, alarm_action
            )

        # --- DynamoDB table metrics (conditional) ---
        if events_table:
            self._add_dynamodb_widgets(dashboard, events_table)

        # --- Stack outputs ---
        cdk.CfnOutput(
            self,
            "AlarmTopicArn",
            value=self.alarm_topic.topic_arn,
            description="SNS topic ARN for monitoring alarm notifications",
        )

    def _add_sagemaker_widgets(
        self,
        dashboard: cw.Dashboard,
        endpoint_name: str,
        env_name: str,
        alarm_action: cw_actions.SnsAction,
    ) -> None:
        """Add SageMaker endpoint metrics widgets and alarms to the dashboard."""
        period = cdk.Duration.minutes(5)
        dimension = {"EndpointName": endpoint_name, "VariantName": "AllTraffic"}

        invocations_metric = cw.Metric(
            namespace="AWS/SageMaker",
            metric_name="Invocations",
            dimensions_map=dimension,
            period=period,
            statistic="Sum",
        )

        latency_metric = cw.Metric(
            namespace="AWS/SageMaker",
            metric_name="ModelLatency",
            dimensions_map=dimension,
            period=period,
            statistic="Average",
        )

        error_4xx_metric = cw.Metric(
            namespace="AWS/SageMaker",
            metric_name="Invocation4XXErrors",
            dimensions_map=dimension,
            period=period,
            statistic="Sum",
        )

        error_5xx_metric = cw.Metric(
            namespace="AWS/SageMaker",
            metric_name="Invocation5XXErrors",
            dimensions_map=dimension,
            period=period,
            statistic="Sum",
        )

        dashboard.add_widgets(
            cw.GraphWidget(
                title="SageMaker Invocations",
                left=[invocations_metric],
                width=8,
            ),
            cw.GraphWidget(
                title="SageMaker Model Latency",
                left=[latency_metric],
                width=8,
            ),
            cw.GraphWidget(
                title="SageMaker Invocation Errors",
                left=[error_4xx_metric, error_5xx_metric],
                width=8,
            ),
        )

        sagemaker_5xx_alarm = cw.Alarm(
            self,
            "SageMaker5xxErrors",
            alarm_name=f"TunnelSageMaker-5xxErrors-{env_name}",
            metric=error_5xx_metric,
            evaluation_periods=1,
            threshold=1,
            comparison_operator=cw.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            treat_missing_data=cw.TreatMissingData.NOT_BREACHING,
        )
        sagemaker_5xx_alarm.add_alarm_action(alarm_action)

    @staticmethod
    def _add_dynamodb_widgets(
        dashboard: cw.Dashboard,
        table: dynamodb.ITable,
    ) -> None:
        """Add DynamoDB read/write capacity widgets to the dashboard."""
        period = cdk.Duration.minutes(5)

        dashboard.add_widgets(
            cw.GraphWidget(
                title="DynamoDB Read Capacity",
                left=[
                    table.metric_consumed_read_capacity_units(period=period),
                ],
                width=12,
            ),
            cw.GraphWidget(
                title="DynamoDB Write Capacity",
                left=[
                    table.metric_consumed_write_capacity_units(period=period),
                ],
                width=12,
            ),
        )
