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

## CI/CD

GitHub Actions ([`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml)) builds and deploys the **rental-app** (staging/production on `main`, dev on `develop`). Portal and camera-system are not part of that pipeline yet.

## Security

- **Never commit** `.env`, `.env.local`, or real credentials.
- If you previously had secrets in git history, **rotate** database passwords and `AUTH_SECRET` in Supabase / Vercel / hosting.

## Retired repository

[`Excersys/ai-car-rental`](https://github.com/Excersys/ai-car-rental) is superseded by this repo; use this monorepo for new work.
