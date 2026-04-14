"""
Contract tests for the inference model response shape.

These tests validate the JSON contract between the damage-detection model
(SageMaker endpoint or Lambda-native ONNX) and the Lambda handler that
parses the response. No AWS mocks needed -- pure schema validation.
"""

import os
import sys

import pytest

_contracts_path = os.path.join(os.path.dirname(__file__), "..", "review_api")
if _contracts_path not in sys.path:
    sys.path.insert(0, _contracts_path)

from contracts import ContractError, validate_inference_response


class TestInferenceResponseContract:

    def test_full_valid_response(self):
        validate_inference_response({
            "confidence": 0.87,
            "damage_type": "dent",
            "bounding_boxes": [{"x": 10, "y": 20, "w": 50, "h": 60}],
        })

    def test_confidence_only_is_valid(self):
        validate_inference_response({"confidence": 0.3})

    def test_missing_confidence_raises(self):
        with pytest.raises(ContractError, match="confidence"):
            validate_inference_response({"damage_type": "scratch"})

    def test_confidence_out_of_range_raises(self):
        with pytest.raises(ContractError, match="confidence"):
            validate_inference_response({"confidence": 1.5})

    def test_negative_confidence_raises(self):
        with pytest.raises(ContractError, match="confidence"):
            validate_inference_response({"confidence": -0.1})

    def test_non_numeric_confidence_raises(self):
        with pytest.raises(ContractError, match="numeric"):
            validate_inference_response({"confidence": "high"})

    def test_non_dict_raises(self):
        with pytest.raises(ContractError, match="object"):
            validate_inference_response([0.5])

    def test_bad_damage_type_raises(self):
        with pytest.raises(ContractError, match="damage_type"):
            validate_inference_response({"confidence": 0.5, "damage_type": 123})

    def test_bad_bounding_boxes_type_raises(self):
        with pytest.raises(ContractError, match="bounding_boxes"):
            validate_inference_response({"confidence": 0.5, "bounding_boxes": "invalid"})

    def test_bad_bounding_box_item_raises(self):
        with pytest.raises(ContractError, match="bounding_boxes"):
            validate_inference_response({"confidence": 0.5, "bounding_boxes": ["not_a_dict"]})

    def test_extra_fields_tolerated(self):
        validate_inference_response({
            "confidence": 0.6,
            "damage_type": "crack",
            "bounding_boxes": [],
            "model_version": "v2.1",
            "inference_time_ms": 42,
        })

    def test_zero_confidence_is_valid(self):
        validate_inference_response({"confidence": 0.0})

    def test_one_confidence_is_valid(self):
        validate_inference_response({"confidence": 1.0})

    def test_multiple_bounding_boxes(self):
        validate_inference_response({
            "confidence": 0.9,
            "bounding_boxes": [
                {"x": 10, "y": 20, "w": 30, "h": 40},
                {"x": 50, "y": 60, "w": 70, "h": 80},
            ],
        })

    def test_empty_bounding_boxes(self):
        validate_inference_response({
            "confidence": 0.5,
            "bounding_boxes": [],
        })
