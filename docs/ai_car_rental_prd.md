# Product Requirements Document (PRD)

**Project:** AI Car Rental Platform  
**Infrastructure:** AWS Cloud (Primary)  
**Owner:** [Your Name or Company]  
**Last Updated:** July 24, 2025

---

## 1. Overview

The AI Car Rental Platform will be a web-based solution designed to automate and streamline the rental process. It will leverage AI-powered identity verification, damage detection, and real-time analytics to minimize fraud, protect vehicle assets, and enhance user experience.

---

## 2. Objectives
- Enhance the user experience to rent in renting cars. 
- Provide seamless, secure identity verification for renters.
- Automate pre- and post-rental vehicle inspections via AI damage detection.
- Support real-time fleet management and reporting.
- Build a scalable cloud-native architecture using AWS.

---

## 3. Features & Requirements

### 3.1 Identity Verification (Web SDK)
- **SDK Integration:** Use a third-party service (e.g., Persona, Veriff, or Onfido).
- **Verification Steps:**
  - Upload or scan driver’s license
  - Face match (selfie comparison with ID)
  - Liveness check
- **Soft Credit Check:** Integrate with a provider (e.g., Experian or TransUnion) for additional verification:
  - Extract name, address, and public record verification
  - Does NOT impact credit score
- **Minimum Info Required:**
  - Full name
  - DOB
  - Address
  - Email + Phone
  - Driver’s license (scan + metadata)

### 3.2 Damage Detection
- **Camera System:** External 360 setup using IP cameras (PoE supported)
- **Flow:**
  - Car drives into inspection awning/station
  - AI model performs a 360 scan while car stops for 10 seconds
- **AI Model:**
  - Start with pretrained models (e.g., YOLOv8, Roboflow, or DINOv2)
  - Fine-tune with proprietary image dataset
- **Output:**
  - Highlight detected scratches, dents, cracks
  - Store timestamped images in S3
  - Compare before/after rentals

### 3.3 Rental Booking System
- **Reservation Flow:**
  - Search & filter cars by location/date/type
  - Checkout with verification step
  - Rental agreement e-sign
- **Optional Add-ons:**
  - Insurance, GPS, toll tag, etc.

### 3.4 Admin Dashboard
- **Roles:** Super Admin, Agent, Fleet Manager
- **Features:**
  - User/renter verification status
  - Damage reports per vehicle
  - Rental booking logs
  - Payment history & invoices

### 3.5 Notifications
- Email + SMS (via AWS SNS or Twilio)
- Use cases: booking confirmation, verification complete, payment failure, return reminders

### 3.6 Payment & Authorization
- Integrate with Stripe or Adyen
- Authorize payment at checkout (capture post-return)
- Ability to add charges post-inspection

---

## 4. AWS Architecture
- **Frontend:** React hosted via AWS Amplify or CloudFront (S3 origin)
- **Backend:** Node.js or Python (FastAPI) on AWS Lambda via API Gateway
- **Database:** Amazon RDS (PostgreSQL)
- **Storage:** Amazon S3 for image/video uploads
- **Authentication:** AWS Cognito (optional Persona/Onfido identity layer)
- **AI Model Hosting:** AWS SageMaker or ECS for containerized inference
- **Monitoring:** CloudWatch for logs, metrics, error tracking
- **CI/CD:** AWS CodePipeline

---

## 5. Security & Compliance
- GDPR & CCPA compliant data handling
- Encrypted data at rest and in transit
- Use AWS IAM roles and fine-grained policies
- Periodic pen testing and audit logging

---

## 6. Roadmap (Milestones)

| Phase | Deliverable | ETA |
|-------|-------------|-----|
| 1 | Identity verification MVP | Aug 2025 |
| 2 | Damage detection prototype | Sep 2025 |
| 3 | Booking + Payment flow | Oct 2025 |
| 4 | Admin dashboard & reporting | Nov 2025 |
| 5 | Full launch | Dec 2025 |

---

## 7. Future Considerations
- Mobile app version
- Driver behavior analytics (accelerometer data)
- Third-party insurance integration
- Loyalty/rewards system
