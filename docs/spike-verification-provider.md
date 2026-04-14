# Spike: Verification Provider + Rental Agreement Signing

**Ticket:** ACR-114 | **Status:** Decision made

## Decision Summary

### Identity Verification: Veriff (confirmed)

Veriff is already integrated in the rental-app via `VeriffVerification.tsx`. The component supports:
- Session creation and management
- ID document verification
- Credit check integration (Experian)
- Status tracking (created, started, submitted, approved, declined, resubmission_requested)

**Provider accounts/credentials plan:**

| Provider | Purpose | Credentials needed |
|----------|---------|-------------------|
| Veriff | ID verification + liveness check | `VITE_VERIFF_API_KEY`, `VITE_VERIFF_API_SECRET` |
| Experian | Credit check (optional, via Veriff) | Integrated through Veriff session |

**No change needed** - Veriff is the selected provider. The existing `VeriffVerification.tsx` component handles the full flow.

### E-Signature: Interim Manual Flow (Phase 1), then HelloSign (Phase 2)

**Phase 1 (MVP):** Checkbox consent + PDF receipt
- Renter checks "I agree to rental terms" during booking
- System generates a PDF rental agreement with timestamp and IP address
- Stored in S3 alongside the booking record
- No third-party e-sign provider needed

**Phase 2 (Post-MVP):** HelloSign/Dropbox Sign
- HelloSign API for legally binding e-signatures
- Template-based agreements auto-populated from booking data
- Signed documents stored and linked to reservation

**Rationale:** HelloSign has lower per-document cost than DocuSign and a simpler API. Checkbox consent is sufficient for MVP and avoids vendor dependency.

## UX Steps Mapped to Rental Checkout

```
1. Browse & Select Vehicle     → CarsPage / CarDetailsPage
2. Enter Booking Details       → BookingFormPage (dates, contact info)
3. Identity Verification       → VeriffVerification component
   - Upload ID document
   - Liveness check
   - Credit check (optional)
4. Review & Accept Agreement   → Checkbox consent (Phase 1) / HelloSign (Phase 2)
5. Payment                     → PaymentForm (Stripe)
6. Confirmation                → BookingConfirmationPage
```

## Action Items

- [ ] Add Veriff API credentials to environment config
- [ ] Wire VeriffVerification into the booking flow (currently component exists but flow may not be end-to-end)
- [ ] Implement checkbox consent + PDF generation for MVP
- [ ] Evaluate HelloSign for Phase 2 post-launch
