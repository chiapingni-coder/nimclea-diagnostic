# Nimclea AAC37 Payments Backend Authority Closure Scope Record v0.1

## Status

PASS

## Purpose

This record closes the narrow backend payments authority scope established by AAC33 through AAC36.

## Scope

- Area: backend payments adapter + controlled payments write/read-back confidence only
- Files inspected: `backend/utils/paymentPersistence.js`, `backend/routes/stripe.js`, `backend/routes/stripeWebhook.js`, `backend/utils/supabaseCoreAuthorityStore.js`, AAC33-AAC36 records
- Files changed: this record only
- Runtime behavior affected: none

## Decision / Change Summary

AAC33 selected `public.payments` as the canonical payment authority.

AAC34 inspected the current Stripe/local payment persistence paths.

AAC35 implemented backend-only `upsertPaymentRecord()` in `backend/utils/supabaseCoreAuthorityStore.js` targeting `public.payments`.

AAC36 passed controlled backend write/read-back with:

- `payment_id`: `00000000-0000-4000-8000-000000000036`
- `customer_id`: `00000000-0000-4000-8000-000000000023`
- `case_id`: `00000000-0000-4000-8000-000000000024`
- `status`: `paid`
- `source`: `aac36_payment_smoke`
- `readAac`: `AAC36`

## Acceptance Criteria

- Backend payments adapter alignment is closed for the controlled payments write/read-back scope.
- Controlled backend payments write/read-back confidence is closed for the AAC36 smoke target.
- This closure does not imply production payment readiness.

## Validation

Commands / checks run:

```powershell
$env:DOTENV_CONFIG_PATH='backend\.env'; node -r dotenv/config scripts/aac36-payment-smoke.mjs
```

Result:

- `writeOk: true`
- `writtenPaymentId: 00000000-0000-4000-8000-000000000036`
- `readError: null`
- `readCount: 1`
- `readPaymentId: 00000000-0000-4000-8000-000000000036`
- `readCaseId: 00000000-0000-4000-8000-000000000024`
- `readCustomerId: 00000000-0000-4000-8000-000000000023`
- `readStatus: paid`
- `readSource: aac36_payment_smoke`
- `readAac: AAC36`

## Risk / Stop Line

Non-claims:

- No Stripe live checkout readiness claim.
- No webhook production path readiness claim.
- No real payment readiness claim.
- No receipt activation readiness claim.
- No PDF export readiness claim.
- No verification unlock readiness claim.
- No frontend readiness claim.
- No RLS readiness claim.
- No migration readiness claim.
- No Supabase Storage readiness claim.

## Next Action

Continue to the next isolated authority scope only if needed.
