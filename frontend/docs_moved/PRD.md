# AI Car Rental Damage Detection Portal - Product Requirements Document (PRD)

## 1. Executive Summary
**Product Name:** AI Car Rental Guard
**Objective:** Automate damage detection for rental fleets using drive-through camera stations, minimizing manual labor, reducing disputes, and ensuring vehicle health transparency.

The system leverages **License Plate Recognition (LPR)** to identify vehicles and **AI Vision** to compare entry/exit states. It includes a **Manual QC** loop for verification and a **Customer Portal** for transparency and billing.

---

## 2. User Personas
1.  **Fleet Manager:** Oversees car status, maintenance, and utilization. Needs high-level dashboards.
2.  **QC Staff:** Reviews AI-flagged damages to approve or reject claims. Needs a fast "Tinder-like" interface.
3.  **Customer:** Rents the car. Needs fair, transparent proof of damage if charged.

---

## 3. Core Workflow
1.  **Vehicle Entry/Exit:** Car passes through the camera station.
2.  **Identification:** LPR system identifies the car (License Plate -> VIN).
3.  **Capture & Analysis:** High-res images taken. AI compares current state vs. last known state (or "Gold Master").
4.  **Detection:**
    *   **No Change:** Log event, auto-clear reservation.
    *   **Change Detected:** AI flags "New Damage" (Scratch, Dent) with confidence score.
5.  **Validation (QC Loop):**
    *   Staff reviews flagged images.
    *   Action: **Confirm** (Create Damage Record) or **Reject** (False Positive/Dirt).
6.  **Resolution:**
    *   **Confirmed:** System generates a Damage Report.
    *   **Notification:** Customer receives an email with a link to the **Customer Portal** to view evidence.
    *   **Billing:** Cost estimated and processed.

---

## 4. Functional Requirements

### 4.1. Hardware & Ingestion (Mocked in Phase 1)
-   **Trigger:** Inductive loop or motion sensor triggers camera.
-   **Input:** 4-angle high-res photos (Front, Rear, Left, Right).
-   **LPR:** Extract text from plate.

### 4.2. Fleet Registry & Reservation System
-   **Car Database:** VIN, Make, Model, Color, Current Status (Available, Rented, Maintenance).
-   **Reservation Log:** Link bookings to cars (User ID, Start Time, End Time).
-   **State Tracking:** Maintain "Last Good State" images for every car.

### 4.3. AI & Manual QC
-   **Anomaly Detection:** Bounding box generation around new artifacts.
-   **QC Interface:** Side-by-side view of "Pre-Rental" vs "Post-Rental". One-click Approve/Reject.

### 4.4. Customer Portal
-   **Access:** Unique secure link sent via email/SMS.
-   **View:** Before/After slider, zoomed-in damage crops.
-   **Action:** "Accept Charge" or "Dispute" (opens support ticket).

---

## 5. Screen Specifications (Phase 1 Scope)

### 5.1. Dashboard (Control Center)
-   **Live Feed:** Mock video/image feed of the camera station.
-   **Activity Stream:** List of recent scans (Time, Plate, Event Type: In/Out, AI Status).
-   **KPIs:** Cars Out, Cars In, Pending QC Reviews.

### 5.2. Fleet Registry
-   **Table View:** List of all cars.
-   **Filters:** Status (On Lot, Rented), Maintenance Needed.
-   **Search:** By Plate or VIN.

### 5.3. Car Detail View (History)
-   **Header:** Car info, current status, large thumbnail.
-   **Timeline:** Vertical timeline of all events (Rentals, Scans, Maintenance).
-   **Reservation Links:** Clickable Reservation IDs to jump to specific rental details.
-   **Damage Log:** History of all confirmed damages for this specific car.

### 5.4. QC Station
-   **Queue:** Stack of pending AI flags.
-   **Interface:** Large "Diff" view.
    -   Left: Check-out Image.
    -   Right: Check-in Image.
    -   Overlay: AI Bounding Box.
-   **Controls:** "Mark as Dirt" (Reject), "Confirm Damage" (Accept).

### 5.5. Inspection Detail
-   **Deep Dive:** Full-screen view of a specific scan event.
-   **Metadata:** Timestamp, Reservation ID, Confidence Score.
-   **Tools:** Zoom, Pan, Toggle AI overlay.

### 5.6. Customer Report (Public View)
-   **Header:** "Damage Report for Reservation #123".
-   **Evidence:** "Before" and "After" slider widget.
-   **Details:** Description of damage, Estimated Cost.
-   **CTA:** "Acknowledge" or "Contact Support".

---

## 6. Technical Architecture (Target)
-   **Frontend:** Next.js 14 (App Router), Tailwind CSS, Shadcn UI.
-   **Backend:** Python (FastAPI) for AI processing / Node.js for API.
-   **Database:** PostgreSQL (Supabase or Neon).
-   **Auth:** Clerk.
-   **Storage:** AWS S3 (Image storage).

## 7. Phase 1 Scope (Mock Implementation)
-   **No Backend:** All data served from local JSON mock files.
-   **No Real AI:** Bounding boxes hardcoded in mock data.
-   **No Auth:** Open access to all admin screens.
-   **Focus:** UI/UX flow validation.

