# Nimclea AAB Backend Adapter Rehearsal Map v0.1

## Boundary Statement

This map does not authorize Render JSON data migration into Supabase.

Render JSON remains legacy behavior reference only.

Supabase rehearsal data must be controlled, minimal, and isolated.

No runtime behavior changes are made by this document.

## AAB Adapter Rehearsal Purpose

AAB adapter rehearsal exists to:

- preserve existing frontend API contracts
- introduce backend-side adapter boundaries
- prepare Supabase clean authority integration
- support trust-loop authority for Receipt / Payment / PDF / Verification

## Route Candidate Map

| Area | Current Route / File | Current Authority Source | Future Adapter Boundary | AAB Rehearsal Priority | Notes |
| --- | --- | --- | --- | --- | --- |
| Single case read | `GET /case/:caseId` via `backend/routes/caseRoutes.js` | `cases.json`, Supabase mirror/core reads where enabled, `eventLogs.json` hydration | backend case authority read adapter returning the same response shape | P0 | First read-only adapter rehearsal candidate because the frontend already depends on this API shape. |
| Case list by email | `GET /cases?email=...` via `backend/server.js` | `emailLogs.json`, `cases.json`, `receiptRecords.json`, `eventLogs.json`, `trials.json`, `subscriptionRecords.json`, `users.json`, Supabase mirror reads where enabled | backend aggregation adapter for case authority and trust-loop overlays | P0 | Must preserve current list response contract and deleted-case filtering behavior. |
| Trial status | `GET /trial-status?email=...` via `backend/routes/trialStatusRoutes.js`; `POST /trial/register` via `backend/routes/trialRegisterRoutes.js`; `POST /trial/start` via `backend/routes/trialStartRoutes.js` | `trials.json`, `cases.json`, `paymentRecords.json`, Supabase trial lifecycle helpers where enabled | backend trial lifecycle adapter | P0 | Rehearsal should map source precedence only; no production writes. |
| Receipt readiness | `PATCH /case/:caseId/receipt-status` via `backend/routes/caseRoutes.js`; `GET /receipt-record` via `backend/server.js`; `GET /hash-ledger/receipt-record` via `backend/routes/hashLedgerRoutes.js` | `cases.json`, `receiptRecords.json`, `hashLedger.json` | backend receipt readiness and receipt record adapter | P1 | Must not allow localStorage to become receipt-ready or PDF unlock authority. |
| Receipt hash / PDF trust | `GET /hash-ledger/receipt`, `POST /hash-ledger/receipt`, `GET /hash-ledger/receipt/:caseId` via `backend/routes/hashLedgerRoutes.js` | `hashLedger.json`, `receiptRecords.json`, case snapshot from `cases.json` and `eventLogs.json` | backend receipt/PDF trust record adapter | P1 | Candidate for mapping receipt hash and PDF deliverable authority. |
| Verification unlock | `POST /hash-ledger/verification`, `GET /hash-ledger/verification` via `backend/routes/hashLedgerRoutes.js` | `verificationRecords.json`, receipt hash input | backend verification authority adapter | P1 | Verification unlock must remain backend-authoritative and not localStorage-authoritative. |
| Payment checkout and confirmation | `POST /create-checkout-session`, `POST /confirm-checkout-session`, `POST /api/create-checkout-session`, `POST /api/confirm-checkout-session` via `backend/routes/stripe.js`; `POST /stripe/webhook` via `backend/routes/stripeWebhook.js` | Stripe session/webhook state, `paymentRecords.json`, `receiptRecords.json`, `subscriptionRecords.json`, `users.json`, `cases.json` | backend payment status adapter bound to Stripe-confirmed state | P1 | Payment status and paid unlocks must be confirmed through backend/Stripe paths only. |
| Event capture / review | `POST /event/log`, `GET /event/by-trial/:trialId`, `GET /event/logs` via `backend/routes/eventRoutes.js`; case event hydration in `GET /case/:caseId` and `GET /cases?email=...` | `eventLogs.json`, case-embedded event arrays where present | backend case event adapter | P0 | Read-only event mapping supports case authority rehearsal; controlled writes are P2 only. |
| Case save / controlled write candidate | `POST /case/save` via `backend/routes/caseRoutes.js` | `cases.json`, Supabase mirror writes where enabled | backend case write adapter against isolated Supabase test records only | P2 | Not part of initial read-only rehearsal; any write rehearsal must use isolated synthetic data. |

## Priority Order

### P0

- read-only adapter rehearsal for case authority
- trust-loop state source mapping

### P1

- receipt/payment/PDF/verification authority mapping

### P2

- controlled write rehearsal using isolated Supabase test records only

## Hard Stop Lines

- no Render JSON import
- no `service_role` exposure to frontend
- no `localStorage` authority for paid, receipt-ready, PDF unlock, or verification unlock
- no broad frontend refactor
- no production Supabase write until isolated rehearsal is recorded

## Acceptance Checklist

- route candidates mapped
- authority sources identified
- trust-loop state ownership clarified
- no runtime behavior changed
- release gate requires this document
