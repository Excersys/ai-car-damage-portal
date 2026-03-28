# Multi-Account CDK Infrastructure

This directory contains the shared configuration and tooling that both CDK
applications (`camera-system/infra` and `rental-app/infrastructure/cdk`) depend
on.

## Directory layout

```
infra/
  environments.json      # Account/region mapping (single source of truth)
  deploy_role_stack.py   # One-time deploy-role provisioning per account
  README.md              # This file
```

## environments.json

Maps logical environment names to AWS accounts and regions:

```json
{
  "dev":        { "account": "111111111111", "region": "us-east-1" },
  "staging":    { "account": "111111111111", "region": "us-east-1" },
  "production": { "account": "222222222222", "region": "us-east-1" }
}
```

Both CDK apps read this file at synth time. **Update account IDs before first
deploy.**

---

## First-time setup for a new AWS account

### 1. Update `environments.json`

Replace `REPLACE_WITH_DEV_ACCOUNT_ID` / `REPLACE_WITH_PROD_ACCOUNT_ID` with
real 12-digit AWS account IDs.

### 2. Bootstrap CDK in each account

CDK bootstrap creates a staging S3 bucket and ECR repo that CloudFormation uses
for asset uploads. Run once per account/region pair.

**Dev account (same account as CI runner):**

```bash
cdk bootstrap aws://DEV_ACCOUNT_ID/us-east-1
```

**Prod account (cross-account trust):**

Bootstrap in the prod account, trusting the dev account so CI can publish assets
from dev into prod:

```bash
# Run while authenticated to the PROD account
cdk bootstrap aws://PROD_ACCOUNT_ID/us-east-1 \
  --trust DEV_ACCOUNT_ID \
  --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess
```

The `--trust` flag adds the dev account to the bootstrap bucket policy and the
CloudFormation execution role's trust policy. Without it, cross-account deploys
will fail with `Access Denied` on asset uploads.

### 3. Create the deploy role in each account

The deploy role is what CI assumes to run `cdk deploy`. It lives in the target
account.

**Dev account:**

```bash
cd infra
pip install aws-cdk-lib constructs
cdk deploy --app "python deploy_role_stack.py" --context environment=dev
```

**Prod account** (authenticate to prod first):

```bash
cd infra
cdk deploy --app "python deploy_role_stack.py" --context environment=production
```

The prod role's trust policy automatically includes the dev account ID (read
from `environments.json`), so CI running in the dev account can assume it.

### 4. Seed the Secrets Manager secret

Each environment needs a secret for third-party API keys. The Lambda reads this
at runtime -- CDK never touches the plaintext.

```bash
aws secretsmanager create-secret \
  --name "acr/dev/third-party-keys" \
  --secret-string '{
    "STRIPE_SECRET_KEY": "sk_test_...",
    "STRIPE_PUBLISHABLE_KEY": "pk_test_...",
    "STRIPE_WEBHOOK_SECRET": "whsec_...",
    "EXPERIAN_API_KEY": "...",
    "EXPERIAN_API_SECRET": "..."
  }'
```

Repeat for `acr/staging/third-party-keys` and `acr/production/third-party-keys`
in their respective accounts.

---

## Deploying

### Local deploy

```bash
# Tunnel stacks (Python CDK)
cd camera-system/infra
cdk deploy --all --context environment=dev

# Rental stack (TypeScript CDK)
cd rental-app/infrastructure
cdk deploy --context environment=dev
```

### Cross-account deploy (prod)

```bash
# Assume the prod deploy role first
export ROLE_ARN="arn:aws:iam::PROD_ACCOUNT_ID:role/acr-cdk-deploy-production"

CREDS=$(aws sts assume-role --role-arn $ROLE_ARN --role-session-name cdk-deploy)
export AWS_ACCESS_KEY_ID=$(echo $CREDS | jq -r '.Credentials.AccessKeyId')
export AWS_SECRET_ACCESS_KEY=$(echo $CREDS | jq -r '.Credentials.SecretAccessKey')
export AWS_SESSION_TOKEN=$(echo $CREDS | jq -r '.Credentials.SessionToken')

# Then deploy as normal
cd camera-system/infra
cdk deploy --all --context environment=production

cd ../../rental-app/infrastructure
cdk deploy --context environment=production
```

### CI/CD

The GitHub Actions workflow (`.github/workflows/ci-cd.yml`) handles:

| Branch    | Environment | Tunnel Deploy | Rental Deploy |
|-----------|------------|---------------|---------------|
| `develop` | dev        | Yes           | Yes           |
| `main`    | staging    | Yes           | Yes           |
| `main`    | production | Yes (after staging passes) | Yes |

---

## SSM parameter convention

All CDK stacks write outputs to SSM under a consistent path:

```
/acr/{env}/tunnel/bucket-name
/acr/{env}/tunnel/table-name
/acr/{env}/tunnel/api-url
/acr/{env}/tunnel/api-key-id
/acr/{env}/tunnel/sagemaker-role-arn
/acr/{env}/rental/cognito-pool-id
/acr/{env}/rental/cognito-client-id
/acr/{env}/rental/api-endpoint
/acr/{env}/rental/images-bucket
/acr/{env}/rental/static-bucket
/acr/{env}/rental/frontend-url
```

Read any value:

```bash
aws ssm get-parameter --name /acr/dev/tunnel/bucket-name --query Parameter.Value --output text
```

---

## Migrating to GitHub OIDC (future)

When ready to stop using static IAM keys:

1. Create an OIDC provider in each account:
   ```bash
   aws iam create-open-id-connect-provider \
     --url https://token.actions.githubusercontent.com \
     --client-id-list sts.amazonaws.com \
     --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
   ```

2. Update the deploy role trust policy to trust the OIDC provider instead of
   (or in addition to) the dev account principal.

3. Switch the CI credential step from static keys to:
   ```yaml
   - uses: aws-actions/configure-aws-credentials@v4
     with:
       role-to-assume: arn:aws:iam::ACCOUNT:role/acr-cdk-deploy-{env}
       aws-region: us-east-1
   ```

4. Remove `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` secrets from GitHub.

The deploy role is already structured so this is a trust-policy change, not a
restructure.
