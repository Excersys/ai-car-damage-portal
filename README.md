# AI Car — Monorepo

Unified repository for Excersys car rental, tunnel vehicle detection, and damage inspection tooling.

Branches **main** (and **develop** where used) are the source of truth; clone with `git pull` before work.

## Layout

| Path | Description |
|------|-------------|
| [`portal/frontend/`](portal/frontend/) | Next.js **damage inspection portal** (fleet, inspections, QC, NextAuth). |
| [`portal/backend/db/`](portal/backend/db/) | Supabase SQL schema and seed scripts. |
| [`rental-app/`](rental-app/) | Customer-facing **React + Vite** rental site (Veriff, booking, AWS Lambda + CDK). |
| [`camera-system/`](camera-system/) | Tunnel **Pi capture**, YOLO vehicle detection, CDK stacks, Lambdas. |
| [`docs/`](docs/) | PRDs, epics, tunnel detection docs (see also `docs/camera-system/`). |

## Quick start

### Damage portal (Next.js)

```bash
cd portal/frontend
cp .env.example .env.local
# Fill DATABASE_URL and AUTH_SECRET
npm install
npm run dev
```

**Vercel:** set **Root Directory** to `portal/frontend` (paths moved under `portal/`).

### Rental app (Vite + AWS)

```bash
cd rental-app
npm install
npm run dev
```

Infrastructure and deploy: see [`rental-app/infrastructure/README.md`](rental-app/infrastructure/README.md) and [`rental-app/deploy/`](rental-app/deploy/).

### Camera / tunnel detection

Python on Pi and model host — see [`camera-system/README.md`](camera-system/README.md) and [`docs/tunnel_car_detection_prd.md`](docs/tunnel_car_detection_prd.md).

## Environment variables

All optional — each app degrades gracefully to mock/offline data when vars are absent.

### Rental app (`rental-app/.env`)

| Variable | Purpose |
|----------|---------|
| `VITE_API_BASE_URL` | Rental-app API Gateway base URL (e.g. `https://abc.execute-api.us-east-1.amazonaws.com/prod`) |
| `VITE_TUNNEL_REVIEW_API_BASE_URL` | Tunnel Review API base URL (camera-system ApiStack) |
| `VITE_TUNNEL_REVIEW_API_KEY` | API Gateway x-api-key for the tunnel Review API |
| `VITE_PI_HEALTH_URL` | Pi trigger server URL (e.g. `http://192.168.1.50:8000`) |
| `VITE_USER_POOL_ID` | AWS Cognito User Pool ID |
| `VITE_USER_POOL_CLIENT_ID` | AWS Cognito App Client ID |
| `VITE_AWS_REGION` | AWS region (default `us-east-1`) |

### Portal (`portal/frontend/.env.local`)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL / Supabase connection string |
| `AUTH_SECRET` | NextAuth secret (`openssl rand -base64 32`) |
| `TUNNEL_REVIEW_API_BASE_URL` | Tunnel Review API base URL (same as rental-app but server-side) |
| `TUNNEL_REVIEW_API_KEY` | API Gateway x-api-key for the tunnel Review API |

### Camera system CDK (`camera-system/infra/`)

Configured via CDK context (`--context environment=dev|staging|production`). Account and region are read from `infra/environments.json`.

| Context Key | Purpose |
|-------------|---------|
| `environment` | `dev`, `staging`, or `production` |
| `grant_sagemaker_invoke` | `true`/`false` — attach SageMaker invoke policy to Lambda |
| `onnx_layer_arn` | ARN of a Lambda layer containing ONNX Runtime + model weights |

## CI/CD

GitHub Actions ([`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml)):

- **On push/PR:** runs rental-app TypeScript check, portal build + typecheck, camera-system Python tests.
- **develop branch:** deploys to dev environment.
- **main branch:** deploys to staging, then production (with automatic rollback on failure).
- Camera-system CDK stacks are deployed alongside rental-app stacks in each environment.

## Local development

### Prerequisites

- **Node.js 18+** and **npm** (for portal and rental-app)
- **Python 3.11+** and **pip** (for camera-system)
- **AWS CLI v2** configured with appropriate credentials (for deployment)
- **AWS CDK** (`npm install -g aws-cdk`) for infrastructure changes

### Portal frontend

```bash
cd portal/frontend
cp .env.example .env.local    # then fill DATABASE_URL + AUTH_SECRET
npm install
npm run dev                    # http://localhost:3000
npm run build                  # production build
npm run lint                   # ESLint
```

Requires a PostgreSQL database (Supabase or local). Schema is in `portal/backend/db/`.

### Rental app

```bash
cd rental-app
cp .env.example .env           # optional — works without env vars (mock data)
npm install
npm run dev                    # http://localhost:5173
npm run build                  # Vite production build
npm run test                   # Jest tests
npm run lint                   # ESLint
npm run type-check             # TypeScript check
```

### Camera system

```bash
cd camera-system
pip install -r pi/requirements.txt        # Pi capture deps
pip install -r model/requirements.txt     # Model/inference deps
pip install pytest                        # Test runner

python -m pytest pi/tests/ -q             # Pi unit tests
python -m pytest lambdas/review_api/ -q   # Review API tests
python -m pytest lambdas/damage_detection/ -q  # Damage detection tests
python -m pytest model/tests/ -q          # Model tests
```

## Secrets management

| Secret | Where it lives | Notes |
|--------|---------------|-------|
| `DATABASE_URL` | Supabase dashboard / Vercel env vars | PostgreSQL connection string |
| `AUTH_SECRET` | Vercel env vars | Generate with `openssl rand -base64 32` |
| `TUNNEL_REVIEW_API_KEY` | AWS API Gateway console / `.env.local` | x-api-key for camera Review API |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | GitHub Actions secrets | For CI/CD deployments |
| `VITE_API_BASE_URL` | Vercel env vars / `.env` | API Gateway endpoint per environment |
| Cognito credentials | AWS Console > Cognito | User Pool ID + Client ID |

**Never commit secrets.** All `.env*` files are gitignored. For CI/CD, secrets are stored in GitHub Actions secrets and AWS Secrets Manager.

## Deployment

### Portal (Vercel)

1. Connect the repo to Vercel
2. Set **Root Directory** to `portal/frontend`
3. Add environment variables (`DATABASE_URL`, `AUTH_SECRET`, `TUNNEL_REVIEW_API_*`)
4. Vercel auto-deploys on push to main

### Rental app + Camera system (AWS)

Deployments run via GitHub Actions CI/CD:

| Branch | Environment | Approval |
|--------|-------------|----------|
| `develop` | dev | Automatic |
| `main` | staging | Automatic |
| `main` | production | Requires GitHub environment approval |

**Manual deployment:**

```bash
# Rental app infrastructure
cd rental-app/infrastructure
cdk deploy --context environment=dev --require-approval never

# Camera system infrastructure
cd camera-system/infra
npx aws-cdk@2 deploy --all --context environment=dev --require-approval never
```

### Rollback

Production frontend rollback is automatic on CI failure. For manual rollback, the CI creates S3 backups with `backup-TIMESTAMP/` prefixes — sync the latest backup back to the root.

## Security

- **Never commit** `.env`, `.env.local`, or real credentials.
- If you previously had secrets in git history, **rotate** database passwords and `AUTH_SECRET` in Supabase / Vercel / hosting.

## Retired repository

[`Excersys/ai-car-rental`](https://github.com/Excersys/ai-car-rental) is superseded by this repo; use this monorepo for new work.
