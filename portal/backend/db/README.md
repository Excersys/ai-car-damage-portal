# Database — ACR AI Car Damage Portal

## Prerequisites

- PostgreSQL 14+ with `gen_random_uuid()` support
- `DATABASE_URL` environment variable set (e.g. `postgres://user:pass@localhost:5432/acr`)

## Apply schema

```bash
psql $DATABASE_URL < schema.sql
```

This creates all tables idempotently (`CREATE TABLE IF NOT EXISTS` where possible).

## Seed sample data

```bash
psql $DATABASE_URL < seed.sql
```

The seed script runs inside a transaction and uses `ON CONFLICT DO NOTHING`, so it is safe to re-run.

## Tables

| Table | Purpose |
|---|---|
| `cars` | Fleet inventory — make, model, VIN, status |
| `reservations` | Rental bookings linked to cars and users |
| `scans` | Check-in / check-out scan events with AI + QC status |
| `detected_damage` | Bounding-box damage detections per scan |
| `payments` | Stripe payment intents linked to reservations |
| `damage_charges` | Post-inspection damage charges created after QC approval |

## Migrations

Incremental changes are tracked as commented `ALTER TABLE` statements at the bottom of `schema.sql`. Apply them manually or integrate into a migration tool (e.g. `node-pg-migrate`, Prisma).
