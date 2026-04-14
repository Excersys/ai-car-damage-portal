# ACR-118: Lambda IAM, CDK Deploy Path, Staging vs Prod Parity Audit

**Date:** 2026-04-13
**Scope:** rental-app CDK stack, camera-system CDK stacks, CI/CD pipeline

---

## 1. Lambda IAM Permissions Summary

### rental-app: `ezcarrental-{env}-api` Lambda

| Permission Source | Actions Granted |
|---|---|
| `AWSLambdaBasicExecutionRole` (managed policy) | `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents` |
| **Inline policies** | **None** |

**What the Lambda CANNOT do (but likely needs):**

- Read/write S3 (`IMAGES_BUCKET_NAME`, `STATIC_BUCKET_NAME` are passed as env vars but no S3 permissions are granted)
- Read Secrets Manager (production `DATABASE_SECRET_ARN` is passed but no `secretsmanager:GetSecretValue` permission)
- Invoke Cognito APIs (User Pool IDs passed but no Cognito permissions)
- Connect to RDS (VPC placement was removed; even if re-added, no VPC execution role permissions)

The inline comment in the code states: "ZERO inline policies -- all removed to stay under 20KB limit. Lambda will handle permission errors gracefully for non-critical features." This means the Lambda is **deployed with no data-plane permissions at all** -- it can only write logs.

### camera-system: `TunnelDamageDetection-{env}` Lambda (inference_stack.py)

| Permission Source | Actions Granted |
|---|---|
| Auto-generated execution role | Basic Lambda execution (implicit) |
| `image_bucket.grant_read()` | `s3:GetObject`, `s3:GetBucket*`, `s3:List*` on tunnel images bucket |
| `events_table.grant_write_data()` | `dynamodb:PutItem`, `dynamodb:UpdateItem`, `dynamodb:DeleteItem`, `dynamodb:BatchWriteItem` on events table |
| Inline policy (conditional) | `sagemaker:InvokeEndpoint` on the configured SageMaker endpoint (only when `grantSageMakerInvoke=true`, which is the default) |

### camera-system: `TunnelReviewApi-{env}` Lambda (api_stack.py)

| Permission Source | Actions Granted |
|---|---|
| Auto-generated execution role | Basic Lambda execution (implicit) |
| `events_table.grant_read_write_data()` | Full DynamoDB read/write on events table |
| `image_bucket.grant_read()` | S3 read on tunnel images bucket |

### camera-system: SageMaker Execution Role (sagemaker_role_stack.py)

| Permission Source | Actions Granted |
|---|---|
| `AmazonSageMakerFullAccess` (managed policy) | Full SageMaker access -- **overly broad for production** |
| `image_bucket.grant_read()` | S3 read on tunnel images bucket |
| Inline policy | `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents` on `arn:aws:logs:*:*:*` |

---

## 2. Environment Variables Passed to Lambda

### rental-app API Lambda

| Variable | Value | Notes |
|---|---|---|
| `USER_POOL_ID` | Cognito User Pool ID | From CDK resource |
| `USER_POOL_CLIENT_ID` | Cognito Client ID | From CDK resource |
| `DATABASE_SECRET_ARN` | RDS secret ARN or `""` | Empty string for dev/staging (no RDS) |
| `IMAGES_BUCKET_NAME` | S3 bucket name | From CDK resource |
| `STATIC_BUCKET_NAME` | S3 bucket name | From CDK resource |
| `ENVIRONMENT` | `dev` / `staging` / `production` | From CDK context |
| `EXPERIAN_API_KEY` | From `process.env` or `""` | **Baked at synth time from CI runner env** |
| `EXPERIAN_API_SECRET` | From `process.env` or `""` | **Baked at synth time from CI runner env** |
| `EXPERIAN_BASE_URL` | Sandbox URL (dev) or production URL | Hardcoded per environment |
| `STRIPE_SECRET_KEY` | From `process.env` or `""` | **Baked at synth time from CI runner env** |
| `STRIPE_PUBLISHABLE_KEY` | From `process.env` or `""` | **Baked at synth time from CI runner env** |
| `STRIPE_WEBHOOK_SECRET` | From `process.env` or `""` | **Baked at synth time from CI runner env** |
| `STRIPE_API_VERSION` | `2023-10-16` | Hardcoded |

### camera-system DamageDetection Lambda

| Variable | Value |
|---|---|
| `INFERENCE_MODE` | CfnParameter (default: `sagemaker`) |
| `SAGEMAKER_ENDPOINT` | CfnParameter (default: `tunnel-damage-detection`) |
| `ONNX_MODEL_PATH` | CfnParameter (default: `/opt/models/model.onnx`) |
| `DYNAMODB_TABLE` | From CDK resource |
| `CONFIDENCE_THRESHOLD` | CfnParameter (default: `0.6`) |

### camera-system ReviewApi Lambda

| Variable | Value |
|---|---|
| `DYNAMODB_TABLE` | From CDK resource |
| `S3_BUCKET` | From CDK resource |
| `PRESIGNED_URL_EXPIRY` | `3600` (hardcoded) |

---

## 3. Staging vs Production Parity

### rental-app: Structural Differences by Environment

| Resource | dev | staging | production |
|---|---|---|---|
| VPC | Not created | Not created | Created (2 AZ, NAT gateway) |
| RDS PostgreSQL | Not created | Not created | Created (t3.micro, encrypted, 7-day backup) |
| Lambda VPC placement | No | No | **No** (comment says removed to avoid IAM policy size) |
| S3 images versioning | No | Yes | Yes |
| S3 removal policy | DESTROY | DESTROY | RETAIN |
| Cognito removal policy | DESTROY | DESTROY | RETAIN |
| Log retention | 1 week | 1 week | 1 month |
| API Gateway logging | ERROR only | INFO | INFO |
| Security groups | Not created | Not created | Created but **not attached to Lambda** |
| `DATABASE_SECRET_ARN` | `""` | `""` | RDS secret ARN |
| Experian URL | sandbox | **production** | **production** |

**Key parity issue:** Staging uses the **production** Experian URL (`https://api.experian.com`) because the conditional only checks for `dev`. Staging should arguably use the sandbox URL or a staging-specific configuration.

### camera-system: Structural Differences by Environment

| Resource | dev / staging | prod |
|---|---|---|
| S3 removal policy | DESTROY | RETAIN |
| DynamoDB removal policy | DESTROY | RETAIN |
| All other resources | Identical shape | Identical shape |

Camera-system has better staging/prod parity than rental-app. The environment name for production is `prod` (not `production`), which differs from the rental-app convention.

---

## 4. Deploy Path: CDK Commands vs Actual CI

### CI/CD Pipeline Structure (`.github/workflows/ci-cd.yml`)

| Stage | Trigger | Depends On |
|---|---|---|
| `test` (rental-app) | All pushes + PRs | -- |
| `test-portal` | All pushes + PRs | -- |
| `test-camera-system` | All pushes + PRs | -- |
| `deploy-dev` | Push to `develop` | All 3 test jobs |
| `deploy-staging` | Push to `main` | All 3 test jobs |
| `deploy-production` | Push to `main` | `deploy-staging` |
| `rollback` | On `deploy-production` failure | `deploy-production` |

### CDK Deploy Commands in CI

All three environments run from `rental-app/infrastructure/`:

```
cd infrastructure
cdk deploy --context environment={env} --require-approval never
```

Followed by camera-system:

```
cd ../camera-system/infra
pip install -r requirements.txt 2>/dev/null || true
npx aws-cdk@2 deploy --all --context environment={env} --require-approval never
```

**Observations:**

- rental-app deploys a single stack; camera-system deploys multiple stacks (`--all`).
- camera-system `pip install` failures are silently ignored (`|| true`).
- All environments use the **same AWS credentials** (`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` from GitHub Secrets). There is no per-environment AWS account separation visible in CI.
- Production deploy uses `--require-approval never`, bypassing CDK's manual approval safeguard.
- The CI uses static access keys rather than OIDC, despite `oidc-setup.yaml` existing in the infrastructure directory.

### Production-Specific CI Steps

- Frontend backup to `s3://...bucket.../backup-{timestamp}/` before deploy
- Smoke tests (`/` and `/cars` endpoints) with `exit 1` on failure (staging does the same)
- Automatic rollback job on production failure (frontend-only rollback via S3 sync)

---

## 5. Gaps Blocking Production

### CRITICAL

1. **rental-app Lambda has zero data-plane permissions.** The Lambda role only has `AWSLambdaBasicExecutionRole`. It cannot read S3, query DynamoDB/RDS, read Secrets Manager, or do anything beyond writing CloudWatch logs. Every API call that touches AWS resources will fail with `AccessDenied`.

2. **Secrets baked into Lambda environment variables at synth time.** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `EXPERIAN_API_KEY`, and `EXPERIAN_API_SECRET` are read from `process.env` during `cdk synth` and stored as plaintext Lambda environment variables. These appear in CloudFormation templates, the AWS console, and CloudTrail. They should be stored in Secrets Manager or SSM Parameter Store (SecureString) and read at runtime.

3. **Production Lambda is not in the VPC.** The VPC and security groups are created for production, but the Lambda is explicitly not placed in the VPC (comment: "VPC removed to avoid IAM policy size limit"). This means the Lambda cannot reach the RDS instance in private subnets, even though `DATABASE_SECRET_ARN` is set.

4. **No Secrets Manager read permission.** Even if the Lambda were in the VPC, it has no `secretsmanager:GetSecretValue` permission to retrieve database credentials.

### HIGH

5. **Staging uses production Experian URL.** The `EXPERIAN_BASE_URL` conditional only checks `environment === 'dev'`, so staging hits the live Experian API. This is a potential billing/compliance risk.

6. **SageMaker role uses `AmazonSageMakerFullAccess`.** This grants far more access than needed for inference. Should be scoped to specific actions.

7. **Static assets bucket is publicly readable.** `publicReadAccess: true` with `AnyPrincipal` on `s3:GetObject`. While this is intentional for website hosting, there is no CloudFront distribution in front of it, so there is no edge caching, no HTTPS with custom domain, and no WAF protection.

8. **Single AWS account for all environments.** CI config shows the same `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` secrets across dev/staging/prod. No account-level isolation.

9. **No OIDC federation in CI.** An `oidc-setup.yaml` template exists but is not used. The pipeline authenticates with long-lived static access keys.

### MEDIUM

10. **`continue-on-error: true` on lint and test in CI.** Test failures do not block deploys. Only type-check is enforced.

11. **Rollback is frontend-only.** The rollback job only restores S3 static assets. It does not roll back CloudFormation/CDK infrastructure changes or Lambda code.

12. **camera-system environment name convention mismatch.** camera-system uses `prod` while rental-app uses `production`. The CI passes `--context environment=production` to camera-system, which means it would create stacks named `TunnelStorage-production` etc., but the storage stack checks `env_name == "prod"` for RETAIN policies.

13. **No Cognito authorizer on API Gateway.** Comment says "authentication now handled inside Lambda function," but the Lambda has no Cognito permissions to validate tokens server-side.

14. **API Gateway CORS allows all origins.** Both rental-app and camera-system use `ALL_ORIGINS`. Should be restricted in staging/production.

---

## 6. Recommendations

### Immediate (pre-production blockers)

1. **Fix Lambda IAM permissions.** Add scoped inline policies or use CDK grants (`bucket.grantReadWrite(lambda)`, `table.grantReadWriteData(lambda)`, `database.secret.grantRead(lambda)`) instead of zero permissions. If the 20KB policy limit is a concern, split into multiple Lambdas or use a customer-managed policy.

2. **Move secrets to Secrets Manager / SSM SecureString.** Replace `process.env.STRIPE_*` and `process.env.EXPERIAN_*` with runtime lookups. Grant the Lambda `secretsmanager:GetSecretValue` or `ssm:GetParameter` for the specific ARNs.

3. **Place production Lambda in VPC** or use RDS Proxy with IAM auth to allow connectivity from a non-VPC Lambda. Without this, the RDS instance is unreachable.

4. **Fix the staging Experian URL** to use sandbox or a staging-specific endpoint.

5. **Fix environment name mismatch.** Standardize on either `prod` or `production` across all stacks and CI. Currently the CI passes `production` to camera-system but the storage stack checks for `prod`.

### Short-term

6. **Adopt OIDC federation** for GitHub Actions (the template already exists at `infrastructure/oidc-setup.yaml`). Remove long-lived access keys.

7. **Add CloudFront** in front of the static assets bucket for HTTPS, caching, and WAF.

8. **Scope SageMaker role** down from `AmazonSageMakerFullAccess` to only the actions needed for endpoint inference.

9. **Enforce test results in CI.** Remove `continue-on-error: true` from test and lint steps, or at minimum from the test step.

10. **Restrict CORS origins** to known frontend domains in staging and production.

### Medium-term

11. **Separate AWS accounts** per environment (dev/staging/prod) using AWS Organizations.

12. **Add infrastructure rollback** to the CI rollback job (e.g., `cdk deploy` with the previous commit's code, or CloudFormation stack rollback).

13. **Add API Gateway authentication** via Cognito authorizer or Lambda authorizer rather than relying on in-Lambda validation.

14. **Add `--require-approval broadening`** for production CDK deploys instead of `--require-approval never`, combined with a manual approval gate in the GitHub Actions environment.
