# ACR-143: End-to-End Test Plan

> Last updated: 2026-04-28
> Status: **Draft**

---

## Overview

This document defines end-to-end test scenarios for the three core user journeys in the ACR platform. Each journey includes preconditions, step-by-step instructions, expected results, and automation recommendations.

---

## Journey 1: Rental Checkout

### Description

A customer searches for a vehicle, completes the booking process including identity verification and payment, and receives a confirmed reservation.

### Preconditions

- Rental-app frontend is deployed and accessible
- API Lambda is running with valid Cognito, Stripe, and Veriff configuration
- At least one vehicle exists in the database with availability
- Stripe test keys are configured (use `sk_test_*` / `pk_test_*`)
- Veriff test environment is configured

### Test Steps

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to rental-app home page | Vehicle search form is displayed |
| 2 | Search for a vehicle (select dates, location) | Available vehicles are listed with pricing |
| 3 | Click "View Details" on a vehicle | Vehicle detail page shows specs, photos, pricing |
| 4 | Click "Book Now" / "Start Booking" | Booking form page loads (`BookingFormPage`) |
| 5 | Fill in personal information (name, email, phone, address, DOB) | Form validates required fields; no errors |
| 6 | Complete Veriff identity verification | Veriff modal opens via `@veriff/incontext-sdk`; on test env, simulation completes; verification score returned |
| 7 | Select insurance option | Insurance options displayed with pricing; selection updates total |
| 8 | Review and accept rental agreement | Agreement text displayed; checkbox enables "Continue" |
| 9 | Enter payment details (Stripe test card `4242 4242 4242 4242`) | Stripe Elements form accepts card; `PaymentForm` component processes payment intent |
| 10 | Submit booking | Confirmation page displayed with booking reference; booking record exists in database |

### Edge Cases

- Invalid card number → Stripe error displayed, booking not created
- Veriff verification fails → User blocked from proceeding to payment
- Vehicle becomes unavailable during checkout → Appropriate error message
- Network timeout during payment → Idempotency key prevents duplicate charges

### Data Assertions

- Booking record created in RDS with correct customer details and insurance selection
- Stripe payment intent status is `succeeded`
- Confirmation email sent (if email service is configured)

---

## Journey 2: Tunnel Event Processing

### Description

A vehicle passes through the inspection tunnel, triggering the camera system to capture images, upload them to S3, run damage detection inference, and store results.

### Preconditions

- Camera-system infrastructure deployed (S3 bucket, DynamoDB table, Lambda functions)
- Pi capture service is running (or simulated via test script)
- `INFERENCE_MODE` is set (`onnx`, `sagemaker`, or `stub`)
- S3 bucket name and DynamoDB table name are known

### Test Steps

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Motion sensor triggers (or simulate via test script) | Pi capture service activates |
| 2 | Pi captures frames from 4 RTSP cameras | JPEG frames saved to local storage under `scans/{plate}/{event_id}/{camera_id}/` |
| 3 | Pi uploads images to S3 | Objects appear in S3 under `scans/{plate}/{event_id}/{camera_id}/frame_*.jpg` |
| 4 | S3 event triggers damage detection Lambda | Lambda invocation visible in CloudWatch Logs |
| 5 | Lambda runs inference (ONNX / SageMaker / stub) | Inference results (bounding boxes, confidence scores) generated |
| 6 | Lambda writes results to DynamoDB | `tunnel_damage_events` table contains new item with `event_id`, `plate`, `damages`, `timestamp` |
| 7 | Query Review API: `GET /events?plate={plate}` | API returns event with damage results and image URLs |

### Existing Test Script

Use `camera-system/scripts/test_pipeline_e2e.py` for automated pipeline validation:

```bash
# Required environment variables
export S3_BUCKET="tunnel-images-dev"
export AWS_REGION="us-east-1"
export DYNAMODB_TABLE="tunnel_damage_events"  # optional, uses default

# Run the E2E test
python camera-system/scripts/test_pipeline_e2e.py
```

The script:
1. Uploads a test JPEG to S3 under `scans/{plate}/{event_id}/{camera_id}/frame_*.jpg`
2. Polls DynamoDB for the processed event (with timeout)
3. Validates the event record contains expected fields
4. Cleans up: deletes the S3 object and DynamoDB row

### Edge Cases

- S3 upload fails (network issue) → Upload queue retries; pending count stays below `MAX_UPLOAD_QUEUE_PENDING` (5000)
- Lambda timeout → CloudWatch alarm fires (`TunnelInference-Errors-{env}`)
- SageMaker endpoint unavailable → Falls back to stub/ONNX if configured; alarm fires (`TunnelSageMaker-5xxErrors-{env}`)
- Duplicate event ID → DynamoDB conditional write prevents overwrites (verify)

---

## Journey 3: Portal QC Review

### Description

A QC reviewer logs into the portal, views the inspection queue, reviews a tunnel event with damage overlay, and approves or rejects the result.

### Preconditions

- Portal frontend deployed (Vercel or local dev)
- Portal backend database has inspection records (or tunnel events available via Review API)
- `TUNNEL_REVIEW_API_KEY` configured in portal environment
- QC reviewer has a valid portal account (NextAuth)

### Test Steps

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to portal login page | Login form displayed |
| 2 | Authenticate with valid credentials | Redirected to portal home / dashboard |
| 3 | Navigate to QC queue (`/qc`) | List of pending inspections with `qcStatus === "Pending"` |
| 4 | Click on a tunnel event inspection | QC review page loads (`TunnelQCReviewClient` or `QCReviewClient`) |
| 5 | Review damage detection results | Images displayed with bounding box overlays; damage descriptions listed |
| 6 | Approve the inspection | Status updates to "Approved"; item removed from pending queue |
| 7 | Navigate back to QC queue | Approved item no longer in pending list |
| 8 | (Alternate) Reject the inspection at step 6 | Status updates to "Rejected"; item removed from pending queue |

### Portal Routes Reference

| Route | Component | Purpose |
|-------|-----------|---------|
| `/inspections` | `inspections/page.tsx` | Full inspection list (merged DB + tunnel) |
| `/inspections/[id]` | `inspections/[id]/page.tsx` → `InspectionDetailClient.tsx` | Inspection detail with overlay viewer |
| `/qc` | `qc/page.tsx` | Pending QC queue |
| `/qc/[id]` | `qc/[id]/page.tsx` | QC review (tunnel or standard) |

### Data Assertions

- After approval: inspection `qcStatus` changes from `"Pending"` to `"Approved"` in portal DB
- After rejection: inspection `qcStatus` changes to `"Rejected"`
- Tunnel QC submission calls `submitTunnelQc` action (`portal/frontend/lib/actions/tunnel.ts`)
- Review API receives the QC decision with correct event ID

### Edge Cases

- Tunnel API unreachable → Portal displays error, does not crash
- Image URLs expired / inaccessible → Placeholder shown, review still possible
- Concurrent reviewers on same item → Optimistic locking or last-write-wins behavior (document which)

---

## Automation Strategy

### Browser E2E: Playwright

**Scope:** Rental-app checkout flow (Journey 1) and Portal QC review flow (Journey 3).

```
rental-app/e2e/
  checkout.spec.ts        # Journey 1
portal/frontend/e2e/
  qc-review.spec.ts       # Journey 3
```

**Setup:**
- Use Playwright Test runner with Chromium, Firefox, WebKit
- Test against local dev servers or dedicated test environment
- Mock external services (Stripe, Veriff) with Playwright route interception or test mode APIs

**Key patterns:**
- Page Object Model for maintainability
- Fixtures for authenticated sessions (avoid login in every test)
- Visual regression snapshots for damage overlay rendering

### Pipeline E2E: Existing Python Script

**Scope:** Tunnel event processing (Journey 2).

- Use existing `camera-system/scripts/test_pipeline_e2e.py`
- Extend with additional assertions as needed (damage field validation, image count)
- Wrap in pytest for better reporting and CI integration

### CI Integration

**Recommendation:** Run E2E tests nightly, not on every push.

```yaml
# .github/workflows/e2e-nightly.yml (proposed)
name: E2E Tests (Nightly)
on:
  schedule:
    - cron: '0 6 * * *'  # 6 AM UTC daily
  workflow_dispatch: {}   # Allow manual trigger

jobs:
  e2e-rental:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npx playwright install --with-deps chromium
      - run: npm ci
        working-directory: rental-app
      - run: npx playwright test
        working-directory: rental-app
        env:
          BASE_URL: ${{ vars.E2E_RENTAL_URL }}
          STRIPE_TEST_KEY: ${{ secrets.STRIPE_TEST_KEY }}

  e2e-portal:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npx playwright install --with-deps chromium
      - run: npm ci
        working-directory: portal/frontend
      - run: npx playwright test
        working-directory: portal/frontend
        env:
          BASE_URL: ${{ vars.E2E_PORTAL_URL }}

  e2e-tunnel:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install boto3 pytest
      - run: pytest camera-system/scripts/test_pipeline_e2e.py -v
        env:
          S3_BUCKET: ${{ vars.E2E_S3_BUCKET }}
          AWS_REGION: us-east-1
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

**Rationale for nightly-only:**
- E2E tests are slower and more flaky than unit/integration tests
- They hit real (or near-real) infrastructure, incurring cost
- Nightly cadence catches regressions within 24 hours while keeping CI fast for PRs
- `workflow_dispatch` allows on-demand runs before releases

---

## Test Environment Requirements

| Dependency | Dev/Test Setup | Notes |
|------------|---------------|-------|
| Stripe | Test mode keys (`sk_test_*`) | Use Stripe test card numbers |
| Veriff | Sandbox/test environment | Mock or use Veriff test sessions |
| AWS (S3, DynamoDB, Lambda) | Dev environment (`EzCarRental-dev`) | Shared dev account `205930602913` |
| SageMaker | `INFERENCE_MODE=stub` for testing | Avoids SageMaker cost in test runs |
| Portal DB | Local SQLite or dev Postgres | Seed with test inspection data |
| Cognito | Dev user pool | Pre-provision test user accounts |
