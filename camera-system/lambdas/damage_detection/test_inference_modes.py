"""Tests for ``INFERENCE_MODE`` other than ``sagemaker`` (stub / ONNX)."""

from unittest.mock import MagicMock, patch

import numpy as np
import pytest


def test_stub_does_not_call_sagemaker(stub_env_handler):
    h = stub_env_handler
    h.s3.get_object.return_value = {
        "Body": MagicMock(read=lambda: b"jpeg-bytes"),
    }

    event = {
        "Records": [{
            "s3": {
                "bucket": {"name": "b"},
                "object": {"key": "scans/P/e1/c0/frame_0000.jpg"},
            },
        }],
    }
    h.lambda_handler(event, None)

    h.sagemaker_runtime.invoke_endpoint.assert_not_called()
    h.table.put_item.assert_called_once()
    item = h.table.put_item.call_args[1]["Item"]
    assert item["damage_detected"] is False
    assert float(item["confidence_score"]) == 0.0


@patch("os.path.isfile", return_value=True)
@patch("onnxruntime.InferenceSession")
def test_onnx_multiclass_softmax(mock_session_cls, _isfile, onnx_env_handler):
    h = onnx_env_handler
    mock_sess = MagicMock()
    mock_session_cls.return_value = mock_sess
    mock_sess.get_inputs.return_value = [
        MagicMock(name="input", shape=["batch", 3, 224, 224]),
    ]
    # logits for 4 classes — index 2 wins after softmax
    mock_sess.run.return_value = [np.array([[2.0, 1.0, 3.0, 0.5]], dtype=np.float32)]

    h.s3.get_object.return_value = {
        "Body": MagicMock(read=lambda: _minimal_jpeg_bytes()),
    }

    event = {
        "Records": [{
            "s3": {
                "bucket": {"name": "b"},
                "object": {"key": "scans/P/e1/c0/frame_0000.jpg"},
            },
        }],
    }
    h.lambda_handler(event, None)

    h.sagemaker_runtime.invoke_endpoint.assert_not_called()
    h.table.put_item.assert_called_once()
    item = h.table.put_item.call_args[1]["Item"]
    assert item["damage_type"] == "dent"
    assert float(item["confidence_score"]) > 0.6


def _minimal_jpeg_bytes() -> bytes:
    """Tiny valid JPEG (1x1 pixel) for PIL decode in ONNX path."""
    return (
        b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00"
        b"\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c"
        b"\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c"
        b"\x1c $.\' \",#\x1c\x1c(7),01444\x1f\'9=82<.342\xff\xc0\x00\x0b\x08"
        b"\x00\x01\x00\x01\x01\x01\x11\x00\xff\xc4\x00\x14\x00\x01\x00\x00\x00"
        b"\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\xff\xda\x00"
        b"\x08\x01\x01\x00\x00?\x00\xaa\xff\xd9"
    )
