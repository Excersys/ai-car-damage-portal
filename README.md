# AI Car Rental Platform — Monorepo

**Repository:** [github.com/Excersys/ai-car-damage-portal](https://github.com/Excersys/ai-car-damage-portal)
**Jira Project:** [ACR — AI Car Rental](https://excersys.atlassian.net/jira/software/c/projects/ACR/boards/324)
**Status:** Active development

---

## What This Project Is

The AI Car Rental Platform is a full-stack system for car rental operations. It combines a customer-facing rental website, an operator inspection portal, and an AI-powered tunnel camera system that automatically detects vehicle damage at check-in and check-out.

The platform covers the entire rental lifecycle:

1. **Customer books a vehicle** through the rental website (identity verification, agreement signing, payment).
2. **Vehicle drives through the inspection tunnel** where cameras capture images from all angles.
3. **AI model analyzes the images** and flags scratches, dents, and other damage automatically.
4. **Operators review results** in the inspection portal, approve or reject findings, and generate customer reports.
5. **Fleet managers track vehicles**, reservations, and inspection history through the admin dashboard.

---

## Repository Layout

This is a monorepo containing four main packages plus shared documentation and CI/CD configuration.

```
ai-car-damage-portal/
├── portal/                  Operator inspection portal (Next.js + Postgres)
│   ├── frontend/            Web application
│   └── backend/             Database schema and seed data
├── rental-app/              Customer-facing rental website (React + Vite + AWS)
│   ├── src/                 Frontend application
│   └── infrastructure/      AWS CDK stacks and Lambda functions
├── camera-system/           Tunnel detection and damage inference (Python)
│   ├── pi/                  Raspberry Pi capture software
│   ├── model/               Detection daemon and ML models
│   ├── lambdas/             AWS Lambda handlers for cloud inference
│   ├── infra/               CDK stacks for camera-system AWS resources
│   └── scripts/             Utility and testing scripts
├── docs/                    PRDs, epics, and project documentation
├── .github/workflows/       CI/CD pipelines
├── README.md                This file
└── .gitignore               Monorepo-wide ignore rules
```

---

## Package Details

### 1. Portal — Operator Inspection Dashboard

**Location:** `portal/`
**Technology:** Next.js 16, React 19, NextAuth v5, Tailwind CSS 4, PostgreSQL (Supabase)
**Deployment:** Vercel (root directory set to `portal/frontend`)

The portal is the internal tool used by fleet operators and QC reviewers. It is a server-rendered Next.js application connected to a Supabase PostgreSQL database.

#### Portal Frontend (`portal/frontend/`)

| Area | Path | Purpose |
|------|------|---------|
| **Home / Dashboard** | `app/page.tsx` | Landing page with fleet overview |
| **Fleet Management** | `app/fleet/` | Vehicle listing, individual vehicle detail pages with timeline of reservations and scans |
| **Fleet — Add Vehicle** | `app/fleet/add/` | Form to register a new vehicle in the system |
| **Inspections** | `app/inspections/` | Browse all scan events; drill into an individual scan to see AI-detected damage overlaid on the vehicle image |
| **QC Review** | `app/qc/` | Quality control queue where reviewers approve or reject AI damage findings; per-scan review with bounding box overlays |
| **Customer Reports** | `app/customers/` | Customer-facing damage report view; report detail page per scan |
| **Search** | `app/search/` | Cross-entity search |
| **Settings** | `app/settings/` | Application settings |
| **Authentication** | `auth.ts`, `auth.config.ts`, `middleware.ts` | NextAuth v5 with GitHub OAuth provider; middleware protects routes |
| **Database Layer** | `lib/db.ts` | PostgreSQL connection pool (pg); SSL-enabled for Supabase |
| **Server Actions** | `lib/actions/index.ts` | Server-side data fetching functions (get cars, scans, reservations, damage records) |
| **Shared Components** | `components/Sidebar.tsx` | Navigation sidebar used across all pages |
| **Type Definitions** | `types/index.ts` | TypeScript interfaces for Car, Reservation, ScanEvent, BoundingBox, and related enums |
| **Mock Data** | `mocks/` | Static mock datasets for cars, reservations, and scans (used during early development) |
| **Environment Template** | `.env.example` | Template showing required environment variables (DATABASE_URL, AUTH_SECRET, OAuth credentials) |
| **Unused / Archived** | `app_unused/` | Parked API route handler from an earlier auth approach |
| **Archived Docs** | `docs_moved/PRD.md` | Early PRD that lived with the frontend before being moved to `docs/` |

#### Portal Backend (`portal/backend/`)

| File | Purpose |
|------|---------|
| `db/schema.sql` | Full database schema: `cars`, `reservations`, `scans`, `detected_damage` tables with indexes, foreign keys, and cascade rules. Safe to re-run (includes DROP TABLE guards). |
| `db/seed.sql` | Portable SQL seed data with sample vehicles, reservations, scans, and damage records for local development. |
| `db/seed.ts` | TypeScript seeding script that reads from the frontend mock data and inserts into the database programmatically. |

#### Portal Data Model

- **Cars** — fleet vehicles with make, model, year, VIN, license plate, status, mileage, and inspection date.
- **Reservations** — rental bookings linking a car to a user with date range and status.
- **Scans** — inspection events (check-in or check-out) with four directional image URLs (front, rear, left, right), AI status, and QC status.
- **Detected Damage** — individual damage findings per scan with label (Scratch, Dent, etc.), confidence score, and bounding box coordinates (x, y, width, height).

---

### 2. Rental App — Customer-Facing Website

**Location:** `rental-app/`
**Technology:** React 18, Vite, TypeScript, Stripe, Veriff, AWS CDK
**Deployment:** AWS (S3 + CloudFront via CDK)

The rental app is what customers interact with to browse, book, and pay for vehicles. It includes identity verification, booking, and payment flows.

#### Frontend (`rental-app/src/`)

| Area | Path | Purpose |
|------|------|---------|
| **Home** | `pages/HomePage.tsx` | Landing page with search and featured vehicles |
| **Vehicle Browsing** | `pages/CarsPage.tsx`, `pages/CarDetailsPage.tsx` | Browse available cars; individual vehicle detail with specs and images |
| **Booking Flow** | `pages/BookingFormPage.tsx`, `pages/BookingConfirmationPage.tsx` | Multi-step booking form and confirmation screen |
| **My Bookings** | `pages/BookingsPage.tsx` | Customer's active and past reservations |
| **Login** | `pages/LoginPage.tsx` | Authentication page |
| **Damage Detection** | `pages/DamageDetectionPage.tsx` | Customer-visible damage scan results |
| **Identity Verification** | `components/VeriffVerification.tsx` | Veriff SDK integration for ID + selfie + liveness check |
| **Payment** | `components/PaymentForm.tsx` | Stripe Elements integration for card authorization and capture |
| **Vehicle Display** | `components/VehicleSearch.tsx`, `components/VehicleDetails.tsx` | Search filters and vehicle detail display |
| **Admin — Dashboard** | `pages/admin/AdminDashboardPage.tsx` | Operator dashboard with fleet/reservation overview |
| **Admin — Fleet** | `pages/admin/AdminFleetPage.tsx` | Fleet management for operators |
| **Admin — Reservations** | `pages/admin/AdminReservationsPage.tsx` | Booking management for operators |
| **Admin — Inspections** | `pages/admin/AdminInspectionStationPage.tsx` | Inspection station interface |
| **Admin — Damage** | `pages/admin/AdminDamageDetectionPage.tsx` | AI damage detection review |
| **Admin Header** | `components/AdminDashboard.tsx`, `components/AdminHeader.tsx` | Admin layout and navigation |
| **API Config** | `config/api.ts` | Backend API endpoint configuration |
| **Vehicle Images** | `images/` | Static vehicle listing thumbnails (committed PNG assets) |

#### Infrastructure (`rental-app/infrastructure/`)

| Area | Path | Purpose |
|------|------|---------|
| **CDK App** | `cdk/app.ts`, `cdk/app.js` | AWS CDK entry point |
| **Infrastructure Stack** | `cdk/stacks/infrastructure-stack.ts` | Full AWS stack: S3, CloudFront, API Gateway, Lambda, Cognito, DynamoDB |
| **Lambda — API** | `lambda/api/index.js` | Main API Lambda handling all REST endpoints |
| **Lambda — Auth** | `lambda/auth/index.js` | Cognito-based authentication handler |
| **Lambda — Bookings** | `lambda/bookings/index.js` | Booking CRUD operations |
| **Lambda — Cars** | `lambda/cars/index.js` | Vehicle catalog operations |
| **Lambda Layers** | `lambda-layers/common/nodejs/` | Shared database utilities and dependencies for all Lambdas |
| **CloudFormation** | `basic-infrastructure.yaml`, `environment-template.yaml` | Alternative CloudFormation templates |
| **OIDC / GitHub** | `oidc-setup.yaml`, `github-actions-*.json` | GitHub Actions OIDC federation for keyless AWS deployments |
| **Deploy Script** | `../deploy/deploy.sh` | Shell script for environment-specific deployments |
| **Validation** | `../scripts/validate-admin-dashboard.sh` | Post-deploy admin dashboard validation |
| **Monitoring** | `../scripts/monitor-deployment.sh` | Deployment health monitoring script |

---

### 3. Camera System — Tunnel Detection and Damage Inference

**Location:** `camera-system/`
**Technology:** Python 3.10+, OpenCV, Ultralytics YOLO, AWS CDK (Python), AWS Lambda, SageMaker
**Deployment:** Raspberry Pi (edge detection), AWS (cloud inference and storage)

The camera system handles the physical tunnel inspection station. Cameras at the tunnel entrance detect approaching vehicles, capture high-resolution images, upload them to S3, and trigger cloud-based damage inference.

#### Raspberry Pi Software (`camera-system/pi/`)

| File | Purpose |
|------|---------|
| `config.py` | Runtime configuration: RTSP URLs, S3 bucket, detection thresholds, cooldown timers |
| `camera_discover.py` | Discovers Reolink cameras on the local network via RTSP probing |
| `capture_frame.py` | Captures individual JPEG frames from an RTSP stream |
| `capture_service.py` | Orchestrates burst capture when a vehicle is detected (multiple frames over configurable duration) |
| `trigger_server.py` | HTTP server that receives trigger signals and initiates a capture sequence |
| `s3_uploader.py` | Uploads captured images to the S3 scans bucket |
| `upload_queue.py` | Persistent on-disk queue for images awaiting upload (survives restarts and network outages) |
| `upload_worker.py` | Background worker that drains the upload queue and retries on failure |
| `setup_pi.sh` | Raspberry Pi provisioning script (apt packages, Python venv, systemd service registration) |
| `requirements.txt` | Python dependencies for the Pi edge software |
| `tests/` | Unit tests for camera discovery, capture service, S3 upload, trigger server, upload queue, and upload worker |

#### Detection Model and Daemon (`camera-system/model/`)

| File | Purpose |
|------|---------|
| `detect_daemon.py` | Long-running daemon that watches RTSP sub-streams, runs YOLO inference to detect vehicles, and triggers capture when a vehicle enters the region of interest |
| `detect_car.py` | Core vehicle detection logic using YOLO (confidence thresholds, ROI filtering, multi-frame confirmation) |
| `plate_reader.py` | License plate recognition from captured frames |
| `scan_results.py` | Structures scan results (detected objects, timestamps, confidence scores) for downstream consumption |
| `scan_uploader.py` | Uploads structured scan results and metadata to S3 / DynamoDB |
| `reconstruct_3d.py` | Experimental 3D reconstruction from multi-angle captures |
| `viewer_360.py` | 360-degree image viewer for inspection review |
| `deploy_endpoint.py` | SageMaker endpoint deployment script for the damage detection model |
| `config.py` | Model configuration: class names, confidence thresholds, inference size, device selection |
| `tunnel-detect.service` | systemd unit file for running the detection daemon as a persistent service on the Pi |
| `requirements.txt` | Python dependencies for the model and daemon |
| `tests/` | Unit tests for car detection, daemon lifecycle, plate reader, and scan results |

#### Cloud Lambdas (`camera-system/lambdas/`)

| Lambda | Purpose |
|--------|---------|
| `damage_detection/handler.py` | Triggered by S3 uploads; invokes the SageMaker damage model endpoint and writes results to DynamoDB |
| `review_api/handler.py` | REST API for the portal to fetch scan results, damage findings, and submit QC decisions |

#### AWS Infrastructure (`camera-system/infra/`)

| File | Purpose |
|------|---------|
| `app.py` | CDK app entry point for camera-system stacks |
| `stacks/storage_stack.py` | S3 buckets for scan images, DynamoDB tables for scan metadata |
| `stacks/inference_stack.py` | SageMaker endpoint, Lambda trigger for damage inference |
| `stacks/api_stack.py` | API Gateway + Lambda for the review API |
| `stacks/monitoring_stack.py` | CloudWatch dashboards, alarms, and metrics for the camera pipeline |

#### Utility Scripts (`camera-system/scripts/`)

| Script | Purpose |
|--------|---------|
| `simulate_trigger.sh` | Simulates a vehicle detection trigger for local testing |
| `test_pipeline_e2e.py` | End-to-end pipeline test: trigger → capture → upload → inference |
| `list-sd-cards.sh` | Lists SD cards for Pi imaging |

---

### 4. Documentation

**Location:** `docs/`

#### Product Requirements

| File | Content |
|------|---------|
| `ai_car_rental_prd.md` | Master PRD for the entire platform: identity verification, damage detection, booking system, admin dashboard, payment, notifications, AWS architecture, security, and roadmap |
| `ai_car_rental_proposal.md` | Original project proposal |
| `tunnel_car_detection_prd.md` | Dedicated PRD for the tunnel detection system: hardware requirements, YOLO-based detection logic, watch mode, capture mode, multi-camera strategy, performance targets, and deployment instructions |

#### Epic Breakdowns

Detailed acceptance criteria, task lists, and time estimates for each development phase.

| File | Epic |
|------|------|
| `epics/01-aws-infrastructure-setup.md` | AWS foundation: Lambda, RDS, S3, Cognito, CI/CD (Jira epic ACR-85) |
| `epics/02-identity-verification-module.md` | Veriff/Persona SDK, license scan, liveness, soft credit check (ACR-86) |
| `epics/03-ai-damage-detection.md` | Camera integration, YOLO pipeline, SageMaker deployment (ACR-87) |
| `epics/04-rental-booking-system.md` | Search, booking flow, Stripe payments, agreements (ACR-88) |
| `epics/05-admin-dashboard.md` | Role-based admin: fleet, reservations, damage reports (ACR-89) |

#### Camera System Docs

Mirrored under both `docs/camera-system/` and `camera-system/docs/`.

| File | Content |
|------|---------|
| `NETWORK_CAMERAS.md` | Reolink camera configuration, RTSP URL formats, PoE setup |
| `RASPBERRY_PI_SD_SETUP.md` | SD card imaging and initial Pi configuration |
| `VEHICLE_DETECTION.md` | YOLO model selection, training data, inference optimization, ROI setup |
| `Tunnel_Damage_Detection_PRD.md` | Tunnel-specific detection requirements and architecture |

#### Jira Integration

| File | Content |
|------|---------|
| `jira-agent-context.md` | Jira project details (project key ACR, board 324), CLI command formats for creating epics/tasks, project structure with epic-to-task mapping, estimation guidelines |
| `jira_tasks_ai_car_rental_estimates.csv` | Task time estimates spreadsheet |

#### Version 2 Planning

| File | Content |
|------|---------|
| `v2/ai_car_rental_proposa v2l.md` | Updated proposal for v2 features |
| `v2/jira_tasks_ai_car_rental.csv` | V2 task breakdown |
| `v2/jira_tasks_ai_car_rental_updated.csv` | Revised v2 estimates |

---

## CI/CD

**Location:** `.github/workflows/`

### Main Pipeline (`ci-cd.yml`)

Triggers on pushes to `main` and `develop`, and on pull requests to `main`.

| Job | Trigger | What It Does |
|-----|---------|--------------|
| **test** | All triggers | Installs rental-app dependencies and runs quality checks (linting, tests, and type-check are temporarily disabled) |
| **deploy-dev** | Push to `develop` | Builds the rental app, deploys Lambda layers and functions, deploys frontend to S3/CloudFront for the dev environment |
| **deploy-staging** | Push to `main` | Same as dev but targets the staging environment |
| **deploy-production** | Push to `main` (requires approval) | Production deployment with manual gate |

All deployments use GitHub Actions OIDC federation for keyless AWS authentication (no stored access keys).

**Note:** The portal (Next.js) and camera-system (Python) are not part of this pipeline yet. The portal deploys via Vercel; the camera system is deployed manually to the Pi.

### Slack Notifications (`notify-slack.yml`)

Sends deployment status notifications to a Slack channel after CI/CD runs.

---

## AWS Architecture

The platform spans multiple AWS services across the rental app and camera system stacks:

| Service | Used By | Purpose |
|---------|---------|---------|
| **S3** | Rental app, Camera system | Static frontend hosting; scan image storage |
| **CloudFront** | Rental app | CDN for the customer website |
| **API Gateway** | Rental app, Camera system | REST API endpoints |
| **Lambda** | Rental app, Camera system | Serverless backend: auth, bookings, cars, damage detection, review API |
| **Cognito** | Rental app | Customer authentication and user pool |
| **DynamoDB** | Camera system | Scan metadata and damage detection results |
| **SageMaker** | Camera system | Hosted damage detection model endpoint |
| **CloudWatch** | Camera system | Monitoring dashboards, alarms, and metrics |
| **SNS** | Platform-wide | Email and SMS notifications |

---

## Jira Project Structure

All work is tracked in the **ACR** project on Atlassian Jira.

### Completed Epics and Tasks (v1)

Items confirmed as genuinely complete after a full code audit (March 2026).

| Key | Name | Status |
|-----|------|--------|
| ACR-85 | AWS Infrastructure Setup | Done |
| ACR-86 | Identity Verification Module | Done (v1 scaffold; production work under ACR-105) |
| ACR-90 | Core AWS Infrastructure Setup | Done |
| ACR-91 | CI/CD Pipeline Setup | Done (quality gates are a v2 concern under ACR-103) |
| ACR-94 | Camera System Integration & Image Processing Pipeline | Done |
| ACR-95 | AI Model Integration & Damage Analysis Engine | Done |
| ACR-100 | Software Interface Design & Coding | Done |
| ACR-101 | Design version 1 of website | Done |
| ACR-102 | Combine and Organize GitHub Repositories | Done |

### Reopened v1 Items (scaffold only, not production-ready)

These were previously marked Done but contain only mock/hardcoded data. Reopened to To Do with explanatory comments.

| Key | Name | Reason Reopened |
|-----|------|-----------------|
| ACR-87 | AI-Based Damage Detection System | Missing model artifacts, SageMaker endpoint not in CDK, no QC write endpoint |
| ACR-88 | Rental Booking System | Vehicle search, booking, and confirmation all use mock data |
| ACR-89 | Admin Dashboard | All admin pages use hardcoded mock data; RBAC broken |
| ACR-92 | Third-Party SDK Integration & License Verification | Veriff is timers + random; no real SDK |
| ACR-93 | Biometric Verification & Credit Check Integration | Entirely mock/demo |
| ACR-96 | Vehicle Search, Availability & Booking Flow | CarsPage uses hardcoded mockCars; confirmation page broken |
| ACR-97 | Payment Integration & Digital Agreement System | Agreements not implemented; frontend mocks in dev |
| ACR-98 | Admin Dashboard with Role-Based Access Control | Mock data; Cognito custom:role not in CDK |

### Active Delivery Epics (v2)

| Key | Name | Priority |
|-----|------|----------|
| ACR-103 | Platform foundations and environment parity | Highest |
| ACR-104 | Rental commerce core | High |
| ACR-105 | Identity verification, authentication, and agreement flow | High |
| ACR-106 | Payments, charges, and booking finalization | High |
| ACR-107 | Tunnel detection and capture reliability | High |
| ACR-108 | Damage model inference and inspection event pipeline | High |
| ACR-109 | Portal review, QC, and vehicle inspection operations | High |
| ACR-110 | Unified data model and cross-system linking | High |
| ACR-111 | Security, compliance, monitoring, and launch readiness | Highest |
| ACR-145 | Admin | Medium |

---

## Environment and Secrets

### Portal (Next.js)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Supabase PostgreSQL connection string |
| `AUTH_SECRET` | NextAuth session encryption key |
| `AUTH_GITHUB_ID` | GitHub OAuth app client ID (optional) |
| `AUTH_GITHUB_SECRET` | GitHub OAuth app client secret (optional) |

Template: `portal/frontend/.env.example`

### Rental App (AWS)

AWS credentials are provided via GitHub Actions OIDC federation in CI. Locally, use standard AWS CLI profiles. Stripe and Veriff keys are configured per environment.

### Camera System (Pi)

Environment loaded from `/etc/tunnel-detect/tunnel-detect.env` by the systemd service. Contains RTSP credentials, S3 bucket name, AWS region, and detection thresholds.

**Never commit `.env`, `.env.local`, or real credentials to this repository.**

---

## Quick Start

### Portal

```bash
cd portal/frontend
cp .env.example .env.local   # fill in DATABASE_URL and AUTH_SECRET
npm install
npm run dev                   # http://localhost:3000
```

### Rental App

```bash
cd rental-app
npm install
npm run dev                   # http://localhost:5173
```

### Camera System (local testing)

```bash
cd camera-system/pi
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
pytest                        # run unit tests
```

```bash
cd camera-system/model
pip install -r requirements.txt
pytest                        # run model tests
```

---

## Superseded Repositories

- [Excersys/ai-car-rental](https://github.com/Excersys/ai-car-rental) — the original single-app repository; all code has been migrated here.
- The root-level `frontend/` and `backend/` directories from the pre-monorepo layout are obsolete. The canonical paths are `portal/frontend/` and `portal/backend/`.
