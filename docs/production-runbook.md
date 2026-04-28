# ACR-144: Production Go-Live Runbook

> Last updated: 2026-04-28
> Status: **Draft — complete all checklist items before launch**

---

## 1. Pre-Launch Checklist

Complete every item before deploying to production.

### Infrastructure

- [ ] `infra/environments.json` — replace `REPLACE_WITH_PROD_ACCOUNT_ID` with the real production AWS account ID
- [ ] Production AWS account bootstrapped for CDK (`cdk bootstrap aws://<PROD_ACCOUNT>/us-east-1`)
- [ ] VPC, subnets, and security groups reviewed for production RDS
- [ ] S3 bucket names confirmed (no conflicts with existing buckets)

### Environment Variables

- [ ] **Vercel (portal):** `DATABASE_URL`, `AUTH_SECRET`, `TUNNEL_REVIEW_API_KEY`, `NEXTAUTH_URL` set for production
- [ ] **GitHub Actions secrets:** `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` for production account
- [ ] **Rental-app Lambda (via CDK):** `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `VERIFF_API_KEY`, `VERIFF_API_SECRET`, `EXPERIAN_API_KEY`, `EXPERIAN_API_SECRET`, `DATABASE_URL`, `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`
- [ ] **Camera-system Lambda (via CDK):** `INFERENCE_MODE`, `SAGEMAKER_ENDPOINT_NAME` (if applicable), S3 bucket name, DynamoDB table name

### DNS & Domains

- [ ] Custom domain configured for portal (Vercel dashboard)
- [ ] Custom domain configured for rental-app (CloudFront or S3 + Route 53)
- [ ] SSL certificates provisioned and validated
- [ ] API Gateway custom domain configured (if applicable)

### Authentication & Access

- [ ] Cognito user pool provisioned with production settings
- [ ] Admin users pre-created in Cognito for initial access
- [ ] Portal NextAuth configuration pointing to production database
- [ ] Stripe webhook endpoint URL updated to production API Gateway URL

### AI / Inference

- [ ] SageMaker endpoint deployed **or** `INFERENCE_MODE=onnx` with model artifact in S3
- [ ] For MVP without SageMaker: `INFERENCE_MODE=stub` is acceptable (produces placeholder results)
- [ ] ONNX model file uploaded to the tunnel image S3 bucket if using ONNX mode

---

## 2. Deployment Procedures

### 2.1 How Each Component Deploys

Deployments are driven by the CI/CD pipeline in `.github/workflows/ci-cd.yml`:

| Component | Trigger | Deployment Method |
|-----------|---------|-------------------|
| **Rental-app (infra + API)** | Push to `main` | CDK deploy (`EzCarRental-production`), S3 sync for static assets |
| **Rental-app (frontend)** | Push to `main` | S3 sync `dist/` → static assets bucket |
| **Camera-system (infra)** | Push to `main` | CDK deploy all stacks (`--context environment=production`) |
| **Portal (frontend)** | Push to `main` | Vercel auto-deploy (connected to repo) |

### 2.2 CI/CD Pipeline Flow

```
push to main
  ├── test (rental-app: type-check, lint, unit tests)
  ├── test-portal (tsc, lint, next build)
  └── test-camera-system (pytest suites)
        │
        ▼
  deploy-staging
    ├── CDK deploy EzCarRental-staging
    ├── Camera-system CDK deploy --context environment=staging
    ├── S3 sync rental-app static assets
    └── Smoke tests (curl / and /cars)
        │
        ▼
  deploy-production (only after staging succeeds)
    ├── Backup: S3 sync current static assets → backup-{timestamp}/
    ├── Clean up stuck stacks (ROLLBACK_COMPLETE, CREATE_FAILED, etc.)
    ├── CDK deploy EzCarRental-production
    ├── Camera-system CDK deploy --context environment=production
    ├── S3 sync rental-app static assets (excludes backup-*)
    └── Health checks (curl / and /cars)
        │
        ▼ (on failure)
  rollback
    ├── Find latest backup-* prefix in S3
    ├── S3 sync backup → bucket root (excludes backup-*)
    └── Verify API health
```

### 2.3 Manual Deployment Commands

If CI/CD is unavailable, deploy manually:

**Rental-app infrastructure:**

```bash
cd rental-app/infrastructure/cdk
npm ci
npx cdk deploy EzCarRental-production --context environment=production --require-approval broadening
```

**Rental-app frontend:**

```bash
cd rental-app
npm ci && npm run build
aws s3 sync dist/ s3://<STATIC_ASSETS_BUCKET>/ --exclude "backup-*"
```

**Camera-system infrastructure:**

```bash
cd camera-system
pip install -r requirements.txt
cd infra
npx aws-cdk@2 deploy --all --context environment=production --require-approval broadening
```

**Portal frontend:**

```bash
cd portal/frontend
npm ci
npx next build
# Deploy via Vercel CLI:
npx vercel --prod
```

### 2.4 Environment Promotion

```
dev  ──(merge to develop)──►  staging  ──(merge to main)──►  production
```

- **dev:** Deployed on push to `develop`. Shared AWS account `205930602913`.
- **staging:** Deployed on push to `main`, before production. Same AWS account (separate stack name suffix).
- **production:** Deployed after staging succeeds. Dedicated AWS account (see `infra/environments.json`).

---

## 3. Rollback Procedures

### 3.1 Frontend Rollback (Rental-app)

The CI pipeline automatically creates a timestamped backup before each production deploy:

```
s3://<bucket>/backup-20260428-143000/   ← auto-created by CI
```

**Automatic rollback:** If `deploy-production` fails, the `rollback` job runs automatically — it finds the latest `backup-*` prefix and syncs it back to the bucket root.

**Manual rollback:**

```bash
# List available backups
aws s3 ls s3://<STATIC_ASSETS_BUCKET>/ --delimiter / | grep backup-

# Restore the latest backup
aws s3 sync s3://<STATIC_ASSETS_BUCKET>/backup-<TIMESTAMP>/ s3://<STATIC_ASSETS_BUCKET>/ --exclude "backup-*"
```

### 3.2 Frontend Rollback (Portal)

Use Vercel's instant rollback feature:

```bash
# List recent deployments
vercel ls --scope <team>

# Promote a previous deployment to production
vercel promote <deployment-url>
```

Or use the Vercel dashboard: Deployments → select previous deployment → "Promote to Production."

### 3.3 CDK / Infrastructure Rollback

**Option A — Redeploy previous version:**

```bash
# Check out the previous known-good commit
git checkout <previous-commit>

# Redeploy
cd rental-app/infrastructure/cdk
npx cdk deploy EzCarRental-production --context environment=production
```

**Option B — Destroy and redeploy (last resort):**

```bash
npx cdk destroy EzCarRental-production --context environment=production
# WARNING: This deletes all stack resources. Only use if stack is in an unrecoverable state.
# Then redeploy from a known-good commit.
```

### 3.4 Database Rollback

**RDS (rental-app):**
- Production RDS has 7-day backup retention with automated snapshots.
- Use AWS Console or CLI for Point-in-Time Recovery:

```bash
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier <prod-instance-id> \
  --target-db-instance-identifier <prod-instance-restored> \
  --restore-time "2026-04-28T12:00:00Z"
```

- After restoration, update `DATABASE_URL` to point to the new instance.

**DynamoDB (tunnel events):**
- PITR is enabled (`point_in_time_recovery_enabled=True`).
- Restore via AWS Console: DynamoDB → Tables → Backups → "Restore to point in time."
- Creates a new table; update Lambda environment to use the restored table name.

### 3.5 SageMaker / Inference Rollback

| Scenario | Action |
|----------|--------|
| Bad model deployment | Switch `INFERENCE_MODE=stub` in Lambda env vars for immediate mitigation |
| SageMaker endpoint errors | Update endpoint to previous model version, or delete and redeploy |
| ONNX model issues | Replace model artifact in S3 with previous version |

```bash
# Quick mitigation: switch to stub mode
aws lambda update-function-configuration \
  --function-name <inference-function-name> \
  --environment "Variables={INFERENCE_MODE=stub,...}"
```

---

## 4. Monitoring & Incident Response

### 4.1 CloudWatch Dashboard

**Dashboard name:** `TunnelDamageDetection-{env}` (e.g., `TunnelDamageDetection-production`)

Defined in `camera-system/infra/stacks/monitoring_stack.py`. Displays:
- Lambda invocation count and error rate
- Lambda duration (p50, p90, p99)
- SageMaker endpoint metrics (if configured)
- DynamoDB read/write capacity

### 4.2 CloudWatch Alarms

| Alarm | Condition | SNS Topic |
|-------|-----------|-----------|
| `TunnelInference-Errors-{env}` | Lambda errors ≥ threshold | `TunnelAlarms-{env}` |
| `TunnelInference-HighLatency-{env}` | p99 duration > 30 seconds | `TunnelAlarms-{env}` |
| `TunnelReviewApi-Errors-{env}` | Errors ≥ 3 | `TunnelAlarms-{env}` |
| `TunnelSageMaker-5xxErrors-{env}` | SageMaker 5xx errors (if SageMaker configured) | `TunnelAlarms-{env}` |

### 4.3 Escalation Path

| Severity | Definition | Response Time | Action |
|----------|-----------|---------------|--------|
| **P1 — Critical** | Production down, no vehicles can be rented or scanned | 15 minutes | Page on-call engineer; begin rollback immediately |
| **P2 — High** | Partial outage (e.g., tunnel not processing, payments failing) | 1 hour | Investigate; rollback affected component if no fix in 30 min |
| **P3 — Medium** | Degraded performance, non-blocking errors | 4 hours | Investigate during business hours |
| **P4 — Low** | Cosmetic issues, minor bugs | Next sprint | Log ticket, prioritize in backlog |

### 4.4 Key Health Check URLs

| Service | Health Check | Expected |
|---------|-------------|----------|
| Rental-app frontend | `GET https://<rental-domain>/` | HTTP 200 |
| Rental-app API | `GET https://<api-domain>/cars` | HTTP 200 + JSON |
| Portal | `GET https://<portal-domain>/` | HTTP 200 |
| Tunnel Review API | `GET https://<api-gw-url>/events` (with `x-api-key`) | HTTP 200 + JSON |

---

## 5. Operational Notes

### 5.1 Pi Disk Space Management

The Pi has limited SD card storage. Disk space is managed by `camera-system/pi/cleanup.py`:

- **Auto-cleanup:** Runs periodically; deletes uploaded image directories after 1-hour grace period
- **Age-based cleanup:** Removes event directories older than `CLEANUP_MAX_AGE_H` (default: 24 hours)
- **Emergency cleanup:** When disk usage exceeds `CLEANUP_MAX_DISK_MB` (default: 2000 MB), removes oldest directories under `/data/tunnel` until usage drops to ~70% of the limit
- **Configuration:** Environment variables `LOCAL_STORAGE_PATH`, `EVENTS_PATH`, `CLEANUP_MAX_AGE_H`, `CLEANUP_MAX_DISK_MB`, `CLEANUP_DRY_RUN`

### 5.2 Upload Queue Backpressure

Defined in `camera-system/pi/config.py`:

```python
MAX_UPLOAD_QUEUE_PENDING = int(os.environ.get("MAX_UPLOAD_QUEUE_PENDING", "5000"))
```

- The upload queue (`camera-system/pi/upload_queue.py`) refuses new items when pending rows exceed this limit.
- This protects the SD card and memory from unbounded growth during network outages.
- Monitor via the Pi health API — the rental-app admin UI (`AdminInspectionStationPage`) surfaces `queue_pending` count.

### 5.3 RTSP Camera Reconnection

- The Pi capture service handles RTSP stream disconnections automatically.
- On connection loss, the service retries with backoff.
- If cameras are unreachable for extended periods, check network connectivity and camera power at the tunnel site.

### 5.4 CloudFormation Stuck Stacks

The CI pipeline includes automatic stuck-stack cleanup. If a stack enters `ROLLBACK_COMPLETE`, `CREATE_FAILED`, or `UPDATE_ROLLBACK_COMPLETE` state, the pipeline deletes it before redeploying. This can also be done manually:

```bash
aws cloudformation delete-stack --stack-name EzCarRental-production
aws cloudformation wait stack-delete-complete --stack-name EzCarRental-production
```

### 5.5 Cost Optimization

- **SageMaker:** Most expensive component. Use `INFERENCE_MODE=onnx` for Lambda-native inference if real-time SageMaker is not required. Use `INFERENCE_MODE=stub` for dev/staging.
- **RDS:** Production uses a provisioned instance. Consider Aurora Serverless v2 for variable workloads.
- **Lambda:** Monitor invocation counts and duration. Set appropriate memory/timeout values.
- **S3:** Enable lifecycle rules to transition old tunnel images to S3 Glacier after retention period.

---

## 6. Contacts & Resources

| Role | Contact | Notes |
|------|---------|-------|
| On-call engineer | TBD | Set up PagerDuty / Opsgenie rotation |
| AWS account owner | TBD | Has root access to production account |
| Vercel admin | TBD | Portal deployment management |
| Stripe dashboard | TBD | Payment monitoring and disputes |

| Resource | URL |
|----------|-----|
| AWS Console (production) | `https://<PROD_ACCOUNT>.signin.aws.amazon.com/console` |
| Vercel Dashboard | `https://vercel.com/<team>` |
| GitHub Repository | `https://github.com/<org>/ai-car-damage-portal-monorepo` |
| CloudWatch Dashboard | `https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=TunnelDamageDetection-production` |
