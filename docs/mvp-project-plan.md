# AI Car Rental — Lean MVP project plan

**Jira project:** [ACR](https://excersys.atlassian.net/jira/software/c/projects/ACR/boards/324)  
**Planning basis:** Tunnel/scan first, then rental commerce + test payments, then booking persistence + portal QC.  
**Story points** use Jira field `customfield_10028` (Story points).

---

## MVP in three phases

| Phase | Focus | Sprint goal |
|-------|--------|-------------|
| **1** | Tunnel & scan | Coherent capture/pipeline; correct S3 keys; E2E test hygiene |
| **2** | Rental commerce | Real inventory + Cognito auth + booking + Stripe test checkout |
| **3** | Payments + portal QC | Webhooks/finalization; NextAuth; inspections list; QC write API; portal ↔ tunnel API |

**Post-MVP:** Identity production (Veriff), full e-sign, ML training/SageMaker hardening, camera architecture follow-ups, admin breadth, RBAC polish — see backlog section.

---

## Epics (high level)

| Epic | Name | Functionality (high level) |
|------|------|----------------------------|
| **ACR-103** | Platform foundations and environment parity | Shared env, CI quality, parity across apps — umbrella for cross-cutting work |
| **ACR-104** | Rental commerce core | Vehicle search, availability, booking flow, routing between customer-facing pages |
| **ACR-105** | Identity, authentication, and agreement flow | Cognito, Veriff/KYC, rental agreements and signatures |
| **ACR-106** | Payments, charges, booking finalization | Stripe intents, webhooks, booking state vs payment events |
| **ACR-107** | Tunnel detection and capture reliability | Pi capture services, trigger vs detection alignment, upload path, plate metadata |
| **ACR-108** | Damage model inference and inspection pipeline | Model artifacts, SageMaker/endpoint, E2E around scan events |
| **ACR-109** | Portal review, QC, and inspection operations | Next.js portal: inspections, QC workflow, bounding boxes, customer views |
| **ACR-110** | Unified data model and cross-system linking | Portal and camera-system APIs sharing real tunnel/scan data |
| **ACR-111** | Security, compliance, monitoring, launch readiness | Cognito custom attributes/RBAC, observability, dev ergonomics (.env, tests) |
| **ACR-145** | Admin | Rental-app admin pages, routes, mock → real API |

---

## All gap tasks (ACR-146 — ACR-169)

| Ticket | Epic | SP | MVP phase | Summary |
|--------|------|---:|-----------|---------|
| ACR-146 | ACR-104 | 2 | **2** | Fix `BookingConfirmationPage` / `BookingFormPage` state contract so confirmation works |
| ACR-147 | ACR-104 | 3 | **2** | Wire `CarsPage` to `GET /vehicles/search` (remove mock array) |
| ACR-148 | ACR-104 | 5 | **2** | Replace mock vehicle data in API Lambda with real DB queries |
| ACR-149 | ACR-104 | 3 | **2** | Wire `VehicleSearch` / `VehicleDetails` / `DamageDetectionPage` into routing |
| ACR-150 | ACR-105 | 5 | *Post-MVP* | Real Veriff SDK + session + webhooks (replace simulated verification) |
| ACR-151 | ACR-105 | 5 | **2** | Wire `LoginPage` to Cognito (`/auth`); token storage aligned with dashboard |
| ACR-152 | ACR-105 | 5 | *Post-MVP* | Digital rental agreement PDF + e-signature + S3 + audit |
| ACR-153 | ACR-106 | 2 | **2** | PaymentForm: real Stripe test flow in dev (no fake `clientSecret` bypass) |
| ACR-154 | ACR-106 | 3 | **3** | Stripe webhooks → booking confirm, disputes, capture/refund orchestration |
| ACR-155 | ACR-107 | 5 | **1** | Unify `trigger_server.py` and `detect_daemon.py` into one coherent pipeline |
| ACR-156 | ACR-107 | 3 | **1** | Use real plate (or consistent id) in S3 keys from `plate_reader` / uploader |
| ACR-157 | ACR-108 | 5 | *Post-MVP* | Damage model training pipeline or documented acquisition |
| ACR-158 | ACR-108 | 8 | *Post-MVP* | SageMaker inference container + CDK endpoint + Lambda DLQ patterns |
| ACR-159 | ACR-108 | 1 | **1** | Fix E2E cleanup: correct DynamoDB sort key (`camera_frame` vs `camera_id`) |
| ACR-160 | ACR-109 | 3 | **3** | Add `app/inspections/page.tsx` list + Sidebar link |
| ACR-161 | ACR-109 | 5 | **3** | NextAuth: move handler to `app/api/auth`, fix middleware, session in Sidebar/QC |
| ACR-162 | ACR-109 | 3 | *Post-MVP* | Customers page: DB-backed data, real report actions |
| ACR-163 | ACR-109 | 5 | **3** | Review API Lambda: POST/PATCH for QC decisions → DynamoDB |
| ACR-164 | ACR-109 | 3 | *Post-MVP* | Bounding-box overlay: real image dimensions (remove 800×600 mock scaling) |
| ACR-165 | ACR-110 | 8 | **3** | Portal calls Review/tunnel APIs; dashboard feed uses real scan events |
| ACR-166 | ACR-111 | 3 | *Post-MVP* | Cognito `custom:role` in CDK + admin/fleet role assignment |
| ACR-167 | ACR-111 | 2 | **2** | `.env.example` + Jest config fixes (`setupTests`, `moduleNameMapper`, ts-jest) |
| ACR-168 | ACR-145 | 8 | *Post-MVP* | Replace mock data on all five rental-app admin pages with real API |
| ACR-169 | ACR-145 | 2 | *Post-MVP* | Missing admin routes (`/admin/customers`, `/admin/reports`) + wire `DamageDetectionPage` |

---

## MVP scope totals

| Phase | Tickets | Story points |
|-------|---------|-------------|
| 1 — Tunnel & scan | ACR-155, ACR-156, ACR-159 | **9** |
| 2 — Commerce + test pay | ACR-146 — ACR-149, ACR-151, ACR-153, ACR-167 | **22** |
| 3 — Pay sticks + portal QC | ACR-154, ACR-160 — ACR-161, ACR-163, ACR-165 | **24** |
| **MVP subtotal** | | **55** |
| Post-MVP (same epic set, deferred) | ACR-150, ACR-152, ACR-157 — ACR-158, ACR-162, ACR-164, ACR-166, ACR-168 — ACR-169 | **37** |
| **All gap tasks** | ACR-146 — ACR-169 | **92** |

---

## Post-MVP backlog (by epic theme)

| Epic | Tickets | Theme |
|------|---------|--------|
| ACR-105 | 150, 152 | Production identity + legal/signature |
| ACR-108 | 157, 158 | Model training + managed inference |
| ACR-109 | 162, 164 | Portal customer views + QC UX polish |
| ACR-111 | 166 | RBAC / admin roles in Cognito |
| ACR-145 | 168, 169 | Admin surface completion |

---

## Dependencies (short)

1. **Phase 1** should stabilize tunnel keys and capture path before **ACR-165** (portal consuming tunnel data).
2. **ACR-148** underpins **ACR-147** / **ACR-149** for truly “real” listings.
3. **ACR-163** + **ACR-165** together deliver “QC skeleton + cross-system truth.”

---

## Document control

| Version | Notes |
|---------|--------|
| 2026-03 | Lean MVP phasing: tunnel first; Story points on `customfield_10028` |
