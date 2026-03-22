#!/bin/bash

set -e

ENVIRONMENT=${1:-dev}
AWS_REGION=${AWS_REGION:-us-east-1}
AWS_ACCOUNT_ID=${AWS_ACCOUNT_ID:-205930602913}

echo "🚀 Deploying EZ Car Rental to $ENVIRONMENT environment..."

# Deploy infrastructure
echo "📦 Deploying infrastructure..."
aws cloudformation deploy \
  --template-file infrastructure/basic-infrastructure.yaml \
  --stack-name ezcarrental-$ENVIRONMENT \
  --parameter-overrides Environment=$ENVIRONMENT \
  --region $AWS_REGION

# Get stack outputs
STATIC_BUCKET=$(aws cloudformation describe-stacks \
  --stack-name ezcarrental-$ENVIRONMENT \
  --query 'Stacks[0].Outputs[?OutputKey==`StaticAssetsBucket`].OutputValue' \
  --output text \
  --region $AWS_REGION)

# Build application if dist folder doesn't exist
if [ ! -d "dist" ]; then
  echo "🔨 Building application..."
  npm run build
fi

# Deploy to S3
echo "📤 Uploading files to S3..."
aws s3 sync dist/ s3://$STATIC_BUCKET/ --delete

# Update secrets if they exist
echo "🔐 Updating secrets..."
if aws secretsmanager describe-secret --secret-id "ezcarrental/$ENVIRONMENT/database" --region $AWS_REGION >/dev/null 2>&1; then
  echo "Database secrets already exist for $ENVIRONMENT"
else
  echo "Creating database secrets for $ENVIRONMENT"
  aws secretsmanager create-secret \
    --name "ezcarrental/$ENVIRONMENT/database" \
    --description "Database connection for $ENVIRONMENT" \
    --secret-string '{"host":"","port":"5432","database":"ezcarrental_'$ENVIRONMENT'","username":"","password":""}' \
    --region $AWS_REGION
fi

echo "✅ Deployment to $ENVIRONMENT completed successfully!"
echo "📋 Resources:"
echo "   Static Assets Bucket: $STATIC_BUCKET"
echo "   Region: $AWS_REGION"