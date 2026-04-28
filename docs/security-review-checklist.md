# ACR-141: Security Review Checklist

> Last updated: 2026-04-28
> Status: **Draft — requires team review before go-live**

---

## 1. Secrets Management

### 1.1 Secret Inventory

| Secret | Used By | Storage Location |
|--------|---------|------------------|
| `DATABASE_URL` | Portal (Next.js), Rental-app Lambda | Vercel env vars (portal), GitHub Actions secrets → CDK (rental-app) |
| `AUTH_SECRET` | Portal NextAuth | Vercel env vars |
| `TUNNEL_REVIEW_API_KEY` | Portal → Tunnel Review API | Vercel env vars (portal), API Gateway usage plan (camera-system CDK) |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | CI/CD deployments | GitHub Actions secrets |
| `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` | Rental-app payment processing | GitHub Actions secrets → Lambda env vars via CDK |
| `STRIPE_WEBHOOK_SECRET` | Rental-app webhook verification | GitHub Actions secrets → Lambda env vars via CDK |
| `COGNITO_USER_POOL_ID` / `COGNITO_CLIENT_ID` | Rental-app authentication | CDK outputs, Lambda env vars |
| `EXPERIAN_API_KEY` / `EXPERIAN_API_SECRET` | Rental-app credit checks | GitHub Actions secrets → Lambda env vars via CDK |
| `VERIFF_API_KEY` / `VERIFF_API_SECRET` | Rental-app identity verification | GitHub Actions secrets → Lambda env vars via CDK |
| SageMaker endpoint name | Camera-system inference Lambda | CDK parameter / env var |

### 1.2 Source Code Protection

All `.env*` files are blocked from version control via `.gitignore`:

```
# .gitignore (lines 23-26)
# Environment / secrets (never commit)
*.env
.env*
!.env.example
```

`.env.example` files are allowed as templates (they contain placeholder values only).

### 1.3 Recommendations

- [ ] Rotate all secrets on a defined schedule (quarterly recommended)
- [ ] Migrate long-lived AWS IAM credentials to OIDC federation for GitHub Actions
- [ ] Audit Vercel env var access — restrict to production team members

---

## 2. IAM & Encryption

### 2.1 Encryption at Rest

| Resource | Encryption | Source |
|----------|-----------|--------|
| S3 — tunnel image bucket | `S3_MANAGED` (SSE-S3) | `camera-system/infra/stacks/storage_stack.py` |
| S3 — rental images bucket | `S3_MANAGED` (SSE-S3) | `rental-app/infrastructure/cdk/stacks/infrastructure-stack.ts` |
| S3 — rental static assets | `S3_MANAGED` (SSE-S3) | `rental-app/infrastructure/cdk/stacks/infrastructure-stack.ts` |
| RDS PostgreSQL (production) | `storageEncrypted: true` | `rental-app/infrastructure/cdk/stacks/infrastructure-stack.ts` |
| DynamoDB — tunnel events | Point-in-Time Recovery enabled | `camera-system/infra/stacks/storage_stack.py` |

### 2.2 Encryption in Transit

- All S3 access is over HTTPS (AWS SDK default).
- RDS connections use SSL (enforced by default in CDK-provisioned instances).
- API Gateway endpoints are HTTPS-only.
- Portal and rental-app frontends served over HTTPS (Vercel / CloudFront).

### 2.3 Lambda IAM Scoping

| Lambda | Permissions | Source |
|--------|------------|--------|
| Damage detection (inference) | `s3:GetObject` on image bucket, `dynamodb:PutItem/UpdateItem` on events table, optional `sagemaker:InvokeEndpoint` scoped to specific endpoint ARN | `camera-system/infra/stacks/inference_stack.py` |
| Review API | Read access to events table, read access to image bucket | `camera-system/infra/stacks/api_stack.py` |
| Rental-app API | `AWSLambdaBasicExecutionRole` only (minimal managed policy) | `rental-app/infrastructure/cdk/stacks/infrastructure-stack.ts` |

### 2.4 API Authentication

| API | Auth Mechanism | Source |
|-----|---------------|--------|
| Tunnel Review API (API Gateway) | `x-api-key` required on all event endpoints; usage plan with API key | `camera-system/infra/stacks/api_stack.py` |
| Rental-app API (API Gateway) | Cognito-based auth handled inside Lambda (no gateway authorizer) | `rental-app/infrastructure/cdk/stacks/infrastructure-stack.ts` |
| Portal | NextAuth session-based authentication | `portal/frontend/` |

### 2.5 Cognito Password Policy

Defined in `rental-app/infrastructure/cdk/stacks/infrastructure-stack.ts`:

- Minimum length: **8 characters**
- Requires: lowercase, uppercase, digits
- Account recovery: **email only**
- Self sign-up: enabled

---

## 3. PII Handling

### 3.1 Data Collected

| Data Type | Where Collected | Where Stored |
|-----------|----------------|--------------|
| Full name | Rental booking form | RDS (rental-app) |
| Email address | Rental booking / Cognito sign-up | Cognito, RDS (rental-app) |
| Phone number | Rental booking form | RDS (rental-app) |
| Mailing address | Rental booking form | RDS (rental-app) |
| Date of birth | Rental booking form | RDS (rental-app) |
| Driver's license | Veriff identity verification | **Veriff (external)** — not stored in our DB |
| Biometric / selfie data | Veriff identity verification | **Veriff (external)** — not stored in our DB |
| Payment card details | Stripe checkout | **Stripe (external)** — only Stripe token/ID stored |
| License plate numbers | Tunnel camera capture | DynamoDB (tunnel events), Portal DB |

### 3.2 Third-Party Data Processors

| Provider | Data Handled | Notes |
|----------|-------------|-------|
| **Veriff** | ID documents, selfie/biometric | Veriff is the data controller for biometric data; we receive only a verification score |
| **Stripe** | Payment card details | PCI DSS compliant; we never handle raw card numbers |
| **Experian** | Credit check data | API-based; response data may be cached in Lambda logs |

### 3.3 Recommendations

- [ ] Ensure Experian API responses are not logged in CloudWatch (redact PII)
- [ ] Confirm Veriff DPA (Data Processing Agreement) is signed
- [ ] Confirm Stripe DPA is in place

---

## 4. GDPR / CCPA Compliance Checklist

| # | Requirement | Status | Notes |
|---|------------|--------|-------|
| 1 | Data Subject Access Request (DSAR) mechanism | TODO | Need API endpoint or admin tool to export user data |
| 2 | Right to deletion workflow | TODO | Must delete from RDS, Cognito, and notify Veriff/Stripe |
| 3 | Consent collection and records | TODO | Booking form needs explicit consent checkbox with audit trail |
| 4 | Data retention policy defined | TODO | Define retention periods for bookings, tunnel events, images |
| 5 | Privacy policy published | TODO | Must cover Veriff, Stripe, Experian data sharing |
| 6 | Encryption at rest (S3, RDS, DynamoDB) | **Done** | S3_MANAGED, RDS storageEncrypted, DynamoDB PITR |
| 7 | Encryption in transit (HTTPS, SSL) | **Done** | All endpoints HTTPS; RDS SSL |
| 8 | Secrets not in source code | **Done** | `.gitignore` blocks `.env*`; secrets in Vercel/GitHub/AWS |

### 4.1 Priority Actions

1. **DSAR mechanism** — Build an admin endpoint that exports all data for a given user (email lookup across RDS, Cognito, DynamoDB).
2. **Deletion workflow** — Implement cascading delete across all stores; verify Veriff and Stripe data deletion APIs.
3. **Data retention** — Define and enforce retention periods; add TTL to DynamoDB tunnel events if applicable.
4. **Privacy policy** — Draft and publish; link from rental-app footer and portal login page.

---

## 5. Network Security

### 5.1 Current Architecture

- Portal frontend: Vercel edge network (automatic DDoS protection, WAF)
- Rental-app frontend: S3 + CloudFront (or direct S3 static hosting)
- APIs: AWS API Gateway (throttling, WAF-eligible)
- Database: RDS in VPC (production) or SQLite (dev)

### 5.2 Recommendations

- [ ] Enable AWS WAF on API Gateway endpoints
- [ ] Restrict RDS security group to Lambda-only ingress
- [ ] Enable VPC Flow Logs for production VPC
- [ ] Review CloudFront distribution settings for rental-app

---

## 6. Audit & Logging

### 6.1 Current State

- CloudWatch Logs: All Lambda functions log to CloudWatch
- CloudWatch Dashboard: `TunnelDamageDetection-{env}` with inference metrics
- CloudWatch Alarms: Lambda errors, high latency (p99 > 30s), SageMaker 5xx errors
- SNS alerting: `TunnelAlarms-{env}` topic

### 6.2 Recommendations

- [ ] Enable AWS CloudTrail for all API calls in production account
- [ ] Enable S3 access logging on image buckets
- [ ] Set up log retention policies (avoid indefinite CloudWatch log storage)
- [ ] Add structured logging with correlation IDs across services
