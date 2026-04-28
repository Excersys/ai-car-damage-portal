"""Tests for MonitoringStack — SNS topic, alarms, dashboard widgets."""

from __future__ import annotations

import json

import aws_cdk as cdk
from aws_cdk import assertions, aws_dynamodb as dynamodb, aws_lambda as _lambda

from stacks.monitoring_stack import MonitoringStack


def _make_app() -> cdk.App:
    return cdk.App()


def _stub_lambda(stack: cdk.Stack, fn_id: str) -> _lambda.Function:
    """Create a minimal Lambda function for test wiring."""
    return _lambda.Function(
        stack,
        fn_id,
        runtime=_lambda.Runtime.PYTHON_3_12,
        handler="index.handler",
        code=_lambda.Code.from_inline("def handler(e, c): pass"),
    )


def _stub_table(stack: cdk.Stack, table_id: str) -> dynamodb.Table:
    """Create a minimal DynamoDB table for test wiring."""
    return dynamodb.Table(
        stack,
        table_id,
        partition_key=dynamodb.Attribute(
            name="pk", type=dynamodb.AttributeType.STRING
        ),
        removal_policy=cdk.RemovalPolicy.DESTROY,
    )


# ---------------------------------------------------------------------------
# Helpers to build the stack under various configurations
# ---------------------------------------------------------------------------

def _synth_base_stack() -> assertions.Template:
    """Synthesize MonitoringStack with only the required Lambda parameters."""
    app = _make_app()
    deps = cdk.Stack(app, "Deps")
    inference_fn = _stub_lambda(deps, "InferenceFn")
    review_fn = _stub_lambda(deps, "ReviewFn")

    monitoring = MonitoringStack(
        app,
        "TestMonitoring",
        env_name="test",
        inference_lambda=inference_fn,
        review_lambda=review_fn,
    )
    return assertions.Template.from_stack(monitoring)


def _synth_full_stack() -> assertions.Template:
    """Synthesize MonitoringStack with SageMaker + DynamoDB parameters."""
    app = _make_app()
    deps = cdk.Stack(app, "Deps")
    inference_fn = _stub_lambda(deps, "InferenceFn")
    review_fn = _stub_lambda(deps, "ReviewFn")
    table = _stub_table(deps, "EventsTable")

    monitoring = MonitoringStack(
        app,
        "TestMonitoring",
        env_name="test",
        inference_lambda=inference_fn,
        review_lambda=review_fn,
        sagemaker_endpoint_name="my-test-endpoint",
        events_table=table,
    )
    return assertions.Template.from_stack(monitoring)


# ---------------------------------------------------------------------------
# Tests — base configuration
# ---------------------------------------------------------------------------

class TestBaseMonitoringStack:
    """Tests for the stack with only Lambda inputs (no SageMaker, no DynamoDB)."""

    def test_synthesizes_without_errors(self) -> None:
        template = _synth_base_stack()
        assert template is not None

    def test_sns_topic_created(self) -> None:
        template = _synth_base_stack()
        template.resource_count_is("AWS::SNS::Topic", 1)
        template.has_resource_properties(
            "AWS::SNS::Topic",
            {"TopicName": "TunnelAlarms-test"},
        )

    def test_lambda_alarms_have_sns_action(self) -> None:
        template = _synth_base_stack()
        template.resource_count_is("AWS::CloudWatch::Alarm", 3)
        alarms = template.find_resources("AWS::CloudWatch::Alarm")
        for _logical_id, resource in alarms.items():
            props = resource["Properties"]
            assert "AlarmActions" in props, "Every alarm must have AlarmActions"
            assert len(props["AlarmActions"]) >= 1

    def test_dashboard_created(self) -> None:
        template = _synth_base_stack()
        template.resource_count_is("AWS::CloudWatch::Dashboard", 1)

    def test_base_dashboard_widget_count(self) -> None:
        """Base config: 3 Lambda widgets (invocations, duration, review)."""
        template = _synth_base_stack()
        assert _count_dashboard_widgets(template) == 3

    def test_alarm_topic_arn_exported(self) -> None:
        template = _synth_base_stack()
        outputs = template.find_outputs("AlarmTopicArn")
        assert len(outputs) == 1


# ---------------------------------------------------------------------------
# Tests — full configuration (SageMaker + DynamoDB)
# ---------------------------------------------------------------------------

class TestFullMonitoringStack:
    """Tests with SageMaker endpoint and DynamoDB table enabled."""

    def test_synthesizes_without_errors(self) -> None:
        template = _synth_full_stack()
        assert template is not None

    def test_sagemaker_alarm_created(self) -> None:
        """4 Lambda alarms + 1 SageMaker 5xx alarm = 4 total alarms."""
        template = _synth_full_stack()
        template.resource_count_is("AWS::CloudWatch::Alarm", 4)

    def test_full_dashboard_widget_count(self) -> None:
        """3 Lambda + 3 SageMaker + 2 DynamoDB = 8 widgets total."""
        template = _synth_full_stack()
        assert _count_dashboard_widgets(template) == 8

    def test_sagemaker_5xx_alarm_has_sns_action(self) -> None:
        template = _synth_full_stack()
        template.has_resource_properties(
            "AWS::CloudWatch::Alarm",
            assertions.Match.object_like({
                "AlarmName": "TunnelSageMaker-5xxErrors-test",
                "AlarmActions": assertions.Match.any_value(),
            }),
        )


# ---------------------------------------------------------------------------
# Utility
# ---------------------------------------------------------------------------

def _count_dashboard_widgets(template: assertions.Template) -> int:
    """
    Count widgets in the synthesized dashboard body.

    The CFN template stores the body as an Fn::Join whose string parts
    contain escaped JSON.  We count ``\\"type\\":\\"metric\\"`` occurrences
    in the serialised representation, which maps 1-to-1 with widgets.
    """
    dashboard = template.find_resources("AWS::CloudWatch::Dashboard")
    logical_id = next(iter(dashboard))
    body_raw = json.dumps(dashboard[logical_id]["Properties"]["DashboardBody"])
    return body_raw.count('\\"type\\":\\"metric\\"')
