# Unified Entity Model: Reservation, Vehicle, Tunnel Event, Scan

**Ticket:** ACR-138 | **Status:** Decision made

## Entity Relationship Diagram

```
┌──────────────┐      ┌──────────────────┐      ┌──────────────────┐
│   customers  │      │      cars        │      │   reservations   │
│──────────────│      │──────────────────│      │──────────────────│
│ id (PK)      │      │ id (PK)          │      │ id (PK)          │
│ name         │◄────►│ make, model, year│◄────►│ car_id (FK→cars) │
│ email        │      │ license_plate (U)│      │ user_id          │
│ phone        │      │ vin (U)          │      │ start_date       │
│ cognito_sub  │      │ status           │      │ end_date         │
│ verified     │      │ mileage          │      │ status           │
└──────────────┘      └────────┬─────────┘      │ payment_id       │
                               │                └──────────┬───────┘
                               │                           │
                    ┌──────────▼──────────┐     ┌──────────▼───────┐
                    │   tunnel_events     │     │     payments     │
                    │  (DynamoDB + sync)  │     │──────────────────│
                    │─────────────────────│     │ id (PK)          │
                    │ event_id (PK)       │     │ reservation_id   │
                    │ license_plate       │     │ stripe_intent_id │
                    │ timestamp           │     │ amount, currency │
                    │ camera_count        │     │ status           │
                    │ s3_prefix           │     └──────────────────┘
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │      scans         │
                    │─────────────────────│
                    │ id (PK)            │
                    │ car_id (FK→cars)   │
                    │ reservation_id (FK)│
                    │ tunnel_event_id    │◄── bridges DynamoDB event_id
                    │ type               │
                    │ ai_status          │
                    │ image_url_*        │
                    │ qc_status          │
                    │ qc_by              │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  detected_damage   │
                    │─────────────────────│
                    │ id (PK, UUID)      │
                    │ scan_id (FK→scans) │
                    │ label              │
                    │ confidence         │
                    │ x, y, width, height│
                    └─────────────────────┘
```

## ID Bridge: PostgreSQL ↔ DynamoDB

| Entity | Postgres ID | DynamoDB Key | Bridge Field |
|--------|------------|-------------|--------------|
| Tunnel events | N/A (synced) | `event_id` (partition key) | `scans.tunnel_event_id` |
| Damage results | `detected_damage.id` | Part of event document | Synced via Lambda |
| QC decisions | `scans.qc_status` | Written back via Review API | `event_id` in both |

**ID format:** UUIDs for Postgres-native entities. DynamoDB `event_id` is a timestamp-based string (`scan_YYYYMMDD_HHmmss_PLATE`).

## Plate/VIN Matching Rules

1. **License plate normalization:** `common/s3_paths.py::normalize_plate_segment()` strips non-alphanumeric, uppercases, truncates to 32 chars
2. **Plate → Vehicle lookup:** `scans.car_id` is set by matching `tunnel_events.license_plate` against `cars.license_plate`
3. **VIN matching:** Used for authoritative fleet identification. Plates can change; VIN is immutable.
4. **Unknown plates:** Events with `license_plate = "unknown"` are orphaned until manually linked or plate is read from images via `plate_reader.py`

## Migration Plan

The existing `schema.sql` already defines `cars`, `reservations`, `scans`, and `detected_damage`. To complete the unified model:

### New tables needed
```sql
-- Customers (currently implicit via user_id string)
CREATE TABLE customers (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50),
    cognito_sub VARCHAR(255) UNIQUE,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Payments (link Stripe to reservations)
CREATE TABLE payments (
    id VARCHAR(255) PRIMARY KEY,
    reservation_id VARCHAR(255) REFERENCES reservations(id),
    stripe_payment_intent_id VARCHAR(255) UNIQUE,
    amount INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'usd',
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Schema changes to existing tables
```sql
-- Add tunnel_event_id to scans for DynamoDB bridge
ALTER TABLE scans ADD COLUMN tunnel_event_id VARCHAR(255);

-- Add payment reference to reservations
ALTER TABLE reservations ADD COLUMN payment_id VARCHAR(255);

-- Add foreign key from reservations.user_id to customers
ALTER TABLE reservations ADD CONSTRAINT fk_customer
    FOREIGN KEY (user_id) REFERENCES customers(id);
```
