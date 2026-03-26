# AI Car Rental — Monorepo

**Canonical repository:** [github.com/Excersys/ai-car-damage-portal](https://github.com/Excersys/ai-car-damage-portal)

This is the **unified** Excersys codebase for car rental, tunnel vehicle capture, and damage inspection. The damage **portal** (Next.js), customer **rental app** (Vite), **camera / inference** pipeline, and **docs** all live in one tree so releases, CI, and Jira epics stay aligned.

**Related Jira:** [ACR](https://excersys.atlassian.net/jira/software/projects/ACR) (AI Car Rental). Repo consolidation is tracked as **ACR-102** (Done).

## Layout

| Path | Description |
|------|-------------|
| [`portal/frontend/`](portal/frontend/) | Next.js **inspection portal** — fleet, inspections, QC, auth. |
| [`portal/backend/db/`](portal/backend/db/) | SQL schema and seed scripts for the portal database. |
| [`rental-app/`](rental-app/) | Customer **React + Vite** experience (Veriff, booking); AWS Lambda + CDK in [`rental-app/infrastructure/`](rental-app/infrastructure/). |
| [`camera-system/`](camera-system/) | Tunnel **Pi capture**, detection services, CDK stacks, Lambdas. |
| [`docs/`](docs/) | PRDs, epics, tunnel/camera notes (mirrors/overlaps `camera-system/docs/` in places). |

**Superseded repos:** [Excersys/ai-car-rental](https://github.com/Excersys/ai-car-rental) and the pre-merge single-app layout (root-level `frontend/` / `backend/`) are obsolete for new work — use the paths above.

## Quick start

### Portal (Next.js)

```bash
cd portal/frontend
cp .env.example .env.local
# Set DATABASE_URL, AUTH_SECRET, and any OAuth vars
npm install
npm run dev
```

**Vercel:** set **Root Directory** to `portal/frontend`.

More detail: [`portal/README.md`](portal/README.md).

### Rental app (Vite + AWS)

```bash
cd rental-app
npm install
npm run dev
```

Deploy and infra: [`rental-app/infrastructure/README.md`](rental-app/infrastructure/README.md), [`rental-app/deploy/`](rental-app/deploy/).

### Camera / tunnel system

See [`camera-system/README.md`](camera-system/README.md) and [`docs/tunnel_car_detection_prd.md`](docs/tunnel_car_detection_prd.md).

## CI/CD

[`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml) builds and deploys **rental-app** (e.g. staging/production on `main`, dev on `develop` where configured). **Portal** and **camera-system** are not fully wired into that workflow yet; run their README steps locally or extend CI as needed.

## Security

- **Never commit** `.env`, `.env.local`, or real credentials.
- Rotate secrets if they ever appeared in git history.

## Contributing

Track work in **ACR**; branch from **`main`**, open PRs against **`main`**, and keep this README in sync when you add top-level packages or change deploy entrypoints.
