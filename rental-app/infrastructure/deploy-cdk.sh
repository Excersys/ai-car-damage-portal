#!/bin/bash

# EZ Car Rental CDK Deployment Script
set -e

ENVIRONMENT=${1:-dev}
REGION=${2:-us-east-1}

echo "🚗 EZ Car Rental CDK Deployment"
echo "Environment: $ENVIRONMENT"
echo "Region: $REGION"

# Check if required environment variables are set
if [ -z "$CDK_DEFAULT_ACCOUNT" ]; then
    echo "❌ CDK_DEFAULT_ACCOUNT environment variable is not set"
    echo "Please set your AWS account ID: export CDK_DEFAULT_ACCOUNT=123456789012"
    exit 1
fi

if [ -z "$CDK_DEFAULT_REGION" ]; then
    echo "❌ CDK_DEFAULT_REGION environment variable is not set"
    echo "Please set your AWS region: export CDK_DEFAULT_REGION=$REGION"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Install Lambda layer dependencies
echo "📦 Installing Lambda layer dependencies..."
cd infrastructure/lambda-layers/common/nodejs
if [ ! -d "node_modules" ]; then
    npm install --production
fi
cd ../../../../

# Bootstrap CDK if needed
echo "🔧 Checking CDK bootstrap..."
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured or no valid credentials"
    exit 1
fi

# Check if CDK is bootstrapped
if ! aws cloudformation describe-stacks --stack-name CDKToolkit --region $REGION > /dev/null 2>&1; then
    echo "🔧 Bootstrapping CDK..."
    npx cdk bootstrap aws://$CDK_DEFAULT_ACCOUNT/$REGION
fi

# Synthesize the stack
echo "🔨 Synthesizing CDK stack..."
npx cdk synth --context environment=$ENVIRONMENT

# Deploy the stack
echo "🚀 Deploying infrastructure..."
npx cdk deploy --context environment=$ENVIRONMENT --require-approval never

echo "✅ Deployment completed successfully!"
echo ""
echo "📋 Stack Outputs:"
aws cloudformation describe-stacks --stack-name "EzCarRental-$ENVIRONMENT" --region $REGION --query 'Stacks[0].Outputs' --output table

echo ""
echo "🎉 EZ Car Rental infrastructure deployed to $ENVIRONMENT environment"
echo "🔗 Check the AWS Console for detailed resource information"