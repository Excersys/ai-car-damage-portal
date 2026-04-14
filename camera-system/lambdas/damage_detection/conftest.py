"""Shared pytest fixtures for loading ``handler`` with different ``INFERENCE_MODE`` values."""

import importlib.util
import os
import sys
from unittest.mock import MagicMock, patch

import pytest


def _load_handler_module(inference_mode: str):
    env = {
        "SAGEMAKER_ENDPOINT": "test-endpoint",
        "DYNAMODB_TABLE": "test_table",
        "CONFIDENCE_THRESHOLD": "0.6",
        "AWS_DEFAULT_REGION": "us-east-1",
        "INFERENCE_MODE": inference_mode,
        "ONNX_MODEL_PATH": os.path.join(
            os.path.dirname(__file__), "nonexistent_model.onnx"
        ),
    }
    env_patch = patch.dict(os.environ, env, clear=False)

    mock_ddb_resource = MagicMock()
    mock_s3_client = MagicMock()
    mock_sm_client = MagicMock()

    def _client(service, **kw):
        if service == "s3":
            return mock_s3_client
        if service == "sagemaker-runtime":
            return mock_sm_client
        return MagicMock()

    boto_patch = patch("boto3.client", side_effect=_client)
    ddb_patch = patch("boto3.resource", return_value=mock_ddb_resource)
    env_patch.start()
    boto_patch.start()
    ddb_patch.start()

    mod_name = f"damage_detection_handler_{inference_mode}"
    sys.modules.pop(mod_name, None)
    handler_path = os.path.join(os.path.dirname(__file__), "handler.py")
    spec = importlib.util.spec_from_file_location(mod_name, handler_path)
    h = importlib.util.module_from_spec(spec)
    sys.modules[mod_name] = h
    spec.loader.exec_module(h)

    h.s3 = mock_s3_client
    h.sagemaker_runtime = mock_sm_client
    h.table = mock_ddb_resource.Table.return_value

    yield h

    boto_patch.stop()
    ddb_patch.stop()
    env_patch.stop()
    sys.modules.pop(mod_name, None)


@pytest.fixture
def env_and_handler():
    """Default: ``INFERENCE_MODE=sagemaker`` with mocked SageMaker."""
    yield from _load_handler_module("sagemaker")


@pytest.fixture
def stub_env_handler():
    """``INFERENCE_MODE=stub`` — no SageMaker calls."""
    yield from _load_handler_module("stub")


@pytest.fixture
def onnx_env_handler():
    """``INFERENCE_MODE=onnx`` — for tests that mock ONNX Runtime."""
    yield from _load_handler_module("onnx")
