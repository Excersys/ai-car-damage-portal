# Spike: System of Record for Bookings, Scans, and Damage Events

**Ticket:** ACR-113 | **Status:** Decision made

## Decision Summary

**Dual-store architecture:** PostgreSQL (Supabase) as the primary system of record for business entities, DynamoDB for real-time tunnel/scan event ingestion. Sync via Lambda event bridge.

## Entity Ownership

| Entity | Owner Service | Primary Store | Secondary Store | Notes |
|--------|--------------|---------------|-----------------|-------|
| **Vehicles/Fleet** | Portal | PostgreSQL (Supabase) | - | Fleet management, availability, pricing |
| **Reservations/Bookings** | Rental App API | PostgreSQL (Supabase) | - | Created via Lambda API, queried by portal |
| **Customers** | Rental App API | PostgreSQL (Supabase) | Cognito (auth) | Profile in Postgres, auth in Cognito |
| **Tunnel Scan Events** | Camera System | DynamoDB | PostgreSQL (sync) | Real-time ingestion from Pi, synced to portal |
| **Damage Detection Results** | Camera System | DynamoDB | PostgreSQL (sync) | AI inference results per scan |
| **QC Review Decisions** | Portal | PostgreSQL (Supabase) | DynamoDB (writeback) | Human QC stored in Postgres, written back to DynamoDB via Review API |
| **Rental Agreements** | Rental App API | S3 (PDFs) + PostgreSQL (metadata) | - | Signed docs in S3, references in Postgres |

## Architecture Diagram

```
                    ┌─────────────────────┐
                    │   Rental App (Vite)  │
                    │   Customer-facing    │
                    └──────────┬──────────┘
                               │ REST API
                    ┌──────────▼──────────┐
                    │  Rental API Lambda   │
                    │  /cars, /bookings    │
                    └──────────┬──────────┘
                               │
              ┌────────────────▼────────────────┐
              │     PostgreSQL (Supabase)        │
              │  vehicles, bookings, customers,  │
              │  damage_reports, qc_reviews      │
              └────────────────▲────────────────┘
                               │ sync
              ┌────────────────┴────────────────┐
              │     Sync Lambda (event bridge)   │
              └────────────────▲────────────────┘
                               │
              ┌────────────────┴────────────────┐
              │        DynamoDB                  │
              │  scan_events, damage_results     │
              └────────────────▲────────────────┘
                               │
              ┌────────────────┴────────────────┐
              │     Camera System Lambdas        │
              │  S3 trigger → inference → store  │
              └────────────────▲────────────────┘
                               │
              ┌────────────────┴────────────────┐
              │     Raspberry Pi (Tunnel)        │
              │  Capture → S3 upload             │
              └─────────────────────────────────┘

              ┌─────────────────────────────────┐
              │     Portal (Next.js)             │
              │  Reads Postgres + DynamoDB       │
              │  Writes QC decisions → both      │
              └─────────────────────────────────┘
```

## Sync Strategy

1. **Tunnel → Portal:** DynamoDB Streams trigger a Lambda that writes scan summaries to PostgreSQL
2. **Portal → Tunnel:** QC review decisions are written to PostgreSQL first, then posted to DynamoDB via the Review API (`POST /qc-submit`)
3. **Conflict resolution:** PostgreSQL is authoritative for business data. DynamoDB is authoritative for real-time scan data. Last-write-wins for QC status with timestamp.

## Rationale

- **PostgreSQL for business data:** Relational integrity for bookings, fleet, customers. Supabase provides managed hosting, auth, and admin UI.
- **DynamoDB for scan events:** High write throughput from Pi uploads, natural fit for event-sourced scan data. Already deployed via camera-system CDK stacks.
- **Dual-write for QC:** Portal users need low-latency reads from Postgres. Camera system Lambdas need DynamoDB for inference pipeline. QC decisions bridge both.

## Action Items

- [ ] Create DynamoDB Streams → PostgreSQL sync Lambda
- [ ] Define PostgreSQL schema for `scan_events` and `damage_results` tables (mirror DynamoDB shape)
- [ ] Add `sync_status` and `last_synced_at` columns for tracking
- [ ] Document the sync Lambda in camera-system/infra
