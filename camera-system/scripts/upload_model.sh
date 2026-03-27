#!/usr/bin/env bash
#
# Package a local model directory as model.tar.gz and upload it to S3.
#
# Usage:
#   ./scripts/upload_model.sh <path-to-model-dir-or-tarball>
#
# Examples:
#   ./scripts/upload_model.sh ./my_damage_model/       # directory → tar.gz → S3
#   ./scripts/upload_model.sh ./model.tar.gz           # already packaged → S3
#
# Requires: AWS CLI configured, S3_BUCKET env var set.

set -euo pipefail

MODEL_INPUT="${1:?Usage: upload_model.sh <path-to-model-dir-or-tarball>}"
S3_BUCKET="${S3_BUCKET:?Set S3_BUCKET to the tunnel-images bucket name}"
AWS_REGION="${AWS_REGION:-us-east-1}"
S3_KEY="models/tunnel-damage/model.tar.gz"

if [[ -d "$MODEL_INPUT" ]]; then
    echo "Packaging directory $MODEL_INPUT into model.tar.gz..."
    TARBALL="$(mktemp -d)/model.tar.gz"
    tar -czf "$TARBALL" -C "$MODEL_INPUT" .
elif [[ -f "$MODEL_INPUT" ]]; then
    TARBALL="$MODEL_INPUT"
else
    echo "ERROR: $MODEL_INPUT is not a file or directory" >&2
    exit 1
fi

echo "Uploading to s3://${S3_BUCKET}/${S3_KEY} ..."
aws s3 cp "$TARBALL" "s3://${S3_BUCKET}/${S3_KEY}" --region "$AWS_REGION"

S3_URI="s3://${S3_BUCKET}/${S3_KEY}"
echo ""
echo "Upload complete."
echo "Set this env var before running deploy_endpoint.py:"
echo ""
echo "  export MODEL_ARTIFACT_S3_URI=${S3_URI}"
echo ""
