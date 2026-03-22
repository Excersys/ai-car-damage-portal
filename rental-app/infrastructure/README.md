# EZ Car Rental Infrastructure

Cost-optimized, scalable AWS infrastructure for the AI-powered car rental platform.

## 🏗️ Architecture Overview

### Simple, Scalable Design
- **Single-AZ deployment** for cost optimization (easily scalable to multi-AZ)
- **Unified Lambda function** for API (easily splittable as needed)
- **Cost-effective resource sizing** with auto-scaling capabilities
- **Environment-based configuration** (dev/staging/production)

### AWS Services Used
- **VPC**: Single-AZ with public/private subnets
- **RDS PostgreSQL**: t3.micro with auto-scaling storage
- **S3**: Images and static assets with lifecycle policies
- **Lambda**: Single unified API function (Node.js 18)
- **API Gateway**: RESTful API with Cognito authorization
- **Cognito**: User authentication and management
- **CloudWatch**: Logging and monitoring

## 🚀 GitHub Actions Deployment

### Required GitHub Secrets

Add these secrets to your GitHub repository (`Settings > Secrets and variables > Actions`):

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `AWS_ACCESS_KEY_ID` | AWS Access Key for deployment | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | AWS Secret Key for deployment | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |

### AWS IAM Permissions

Your AWS user/role needs these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudformation:*",
        "lambda:*",
        "apigateway:*",
        "cognito-idp:*",
        "rds:*",
        "s3:*",
        "ec2:*",
        "iam:*",
        "logs:*",
        "secretsmanager:*",
        "sts:GetCallerIdentity"
      ],
      "Resource": "*"
    }
  ]
}
```

### Deployment Environments

| Environment | Branch | Trigger | Description |
|-------------|--------|---------|-------------|
| **Development** | `develop` | Auto-deploy on push | Cost-optimized with public DB |
| **Staging** | `main` | Auto-deploy on push | Production-like with smoke tests |
| **Production** | `main` | Manual approval after staging | Full security, backups, monitoring |

### Deployment Process

1. **Push to `develop`** → Deploys to **dev** environment
2. **Push to `main`** → Deploys to **staging** → Manual approval → **production**
3. **Failed production deploy** → Automatic rollback

## 💰 Cost Optimization Features

### Development Environment
- **No NAT Gateway**: Lambdas run outside VPC
- **Public RDS**: Database in public subnet (dev only)
- **No versioning**: S3 buckets without versioning
- **Minimal logging**: 1-week log retention

### Staging/Production
- **Single NAT Gateway**: One per environment
- **Private RDS**: Database in private subnets
- **S3 versioning**: With 30-day cleanup
- **Extended logging**: 1-month retention

### Resource Sizing
- **RDS**: t3.micro with 20GB storage (auto-scales to 100GB)
- **Lambda**: 256MB memory (adjustable)
- **Logs**: Short retention periods

## 🛠️ Local Development

### Prerequisites
```bash
npm install -g aws-cdk@latest
npm install
```

### Deploy to Development
```bash
cd infrastructure
export CDK_DEFAULT_ACCOUNT="your-account-id"
export CDK_DEFAULT_REGION="us-east-1"

# Bootstrap CDK (first time only)
cdk bootstrap

# Deploy
cdk deploy --context environment=dev
```

### Useful Commands
```bash
# Synthesize CloudFormation
cdk synth --context environment=dev

# Show differences
cdk diff --context environment=dev

# Destroy stack
cdk destroy --context environment=dev
```

## 📊 Infrastructure Components

### API Lambda Function (`/infrastructure/lambda/api/`)
- **Unified router**: Handles all API endpoints
- **Environment-aware**: Different behavior per environment
- **Mock data ready**: Includes sample data for testing
- **Easily splittable**: Can be broken into microservices later

### Lambda Layer (`/infrastructure/lambda-layers/common/`)
- **AWS SDK**: Pre-installed for all functions
- **Database helpers**: PostgreSQL connection utilities
- **Common utilities**: JWT, bcrypt, UUID libraries

### CDK Stack (`/infrastructure/cdk/stacks/`)
- **Environment-specific**: Different configs per environment
- **Cost-optimized**: Resource sizing based on environment
- **Scalable**: Easy to upgrade resources as needed

## 🔒 Security Features

### Development
- ✅ Encrypted RDS storage
- ✅ IAM roles with least privilege
- ✅ S3 bucket access controls
- ⚠️ Public RDS (for cost savings)

### Staging/Production
- ✅ All dev security features
- ✅ Private RDS in isolated subnets
- ✅ VPC with proper security groups
- ✅ Deletion protection on critical resources

## 📈 Scaling Path

### Immediate (Current)
- Single-AZ, single Lambda, t3.micro RDS

### Phase 1 (Growth)
- Multi-AZ deployment: Change `maxAzs: 1` to `maxAzs: 2`
- Larger RDS instance: Update `InstanceClass` and `InstanceSize`
- More Lambda memory: Increase `memorySize`

### Phase 2 (Scale)
- Split Lambda functions: Create separate functions for auth, cars, bookings
- Add caching: ElastiCache for frequently accessed data
- CDN: CloudFront for static assets

### Phase 3 (Enterprise)
- Container deployment: ECS/Fargate for more complex services
- Database sharding: Multiple RDS instances
- Multi-region: Deploy to multiple AWS regions

## 🚨 Troubleshooting

### Common Issues

1. **CDK Bootstrap Error**
   ```bash
   cdk bootstrap aws://ACCOUNT-ID/REGION
   ```

2. **Permission Denied**
   - Check AWS credentials are set correctly
   - Verify IAM permissions include all required services

3. **Stack Already Exists**
   ```bash
   cdk destroy --context environment=dev
   ```

4. **Lambda Package Too Large**
   - Lambda layer dependencies are pre-installed
   - Check `node_modules` isn't included in function code

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `CDK_DEFAULT_ACCOUNT` | AWS Account ID | `123456789012` |
| `CDK_DEFAULT_REGION` | AWS Region | `us-east-1` |
| `AWS_ACCESS_KEY_ID` | AWS Access Key | (from GitHub secrets) |
| `AWS_SECRET_ACCESS_KEY` | AWS Secret Key | (from GitHub secrets) |

## 📋 Stack Outputs

After deployment, these outputs are available:

- **VpcId**: VPC identifier for additional resources
- **DatabaseEndpoint**: RDS PostgreSQL connection endpoint
- **DatabaseSecretArn**: Credentials stored in Secrets Manager
- **ImagesBucketName**: S3 bucket for car images
- **StaticAssetsBucketName**: S3 bucket for frontend assets
- **UserPoolId**: Cognito User Pool for authentication
- **UserPoolClientId**: Cognito Client for frontend integration
- **ApiEndpoint**: API Gateway URL for frontend requests

## 🎯 Next Steps

1. **Set up GitHub secrets** with your AWS credentials
2. **Push to develop branch** to trigger first deployment
3. **Verify API endpoints** are working correctly
4. **Configure frontend** to use the deployed API endpoint
5. **Test authentication flow** with Cognito integration
6. **Add database schemas** and real data persistence

---

**Total estimated monthly cost**: 
- **Development**: ~$15-25/month
- **Staging**: ~$30-50/month  
- **Production**: ~$50-100/month (scales with usage)