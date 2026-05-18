# Nimclea AAC34 Payment Backend Adapter Inspection Candidate Record v0.1

## Status

CANDIDATE RECORDED

## Purpose

This record defines the backend-only payment adapter candidate for the canonical `public.payments` target selected by AAC33.

## Scope

- Area: payment backend adapter inspection and candidate definition only
- Files inspected: `backend/utils/paymentPersistence.js`, `backend/routes/stripe.js`, `backend/routes/stripeWebhook.js`, `backend/utils/supabaseCoreAuthorityStore.js`, AAC33 decision record
- Files changed: this record only
- Runtime behavior affected: none

## Decision / Change Summary

Current payment writes are local JSON through `backend/utils/paymentPersistence.js`, called from:

- `backend/routes/stripe.js`
- `backend/routes/stripeWebhook.js`

No Supabase payments write path exists yet.

AAC33 selected `public.payments` as the canonical payment authority target.

Canonical `public.payments` fields:

- `payment_id`
- `customer_id`
- `case_id`
- `processor`
- `processor_payment_reference`
- `amount_cents`
- `currency`
- `payment_status`
- `source`
- `is_authority_record`
- `processor_metadata`
- `metadata`
- `settled_at`
- `created_at`
- `updated_at`

Non-canonical Stripe/local fields that should be quarantined into `processor_metadata` and/or `metadata` include:

- `stripeEventId`
- `stripeEventType`
- `stripeSessionId`
- `stripeCustomerId`
- `stripeSubscriptionId`
- `productType`
- `paymentType`
- `priceType`
- `paymentScope`
- `userId`
- `receiptId`
- `hash`
- `email`

## Acceptance Criteria

- The current payment write source is correctly identified as local JSON.
- The canonical `public.payments` target is explicitly identified.
- The canonical payment field set is recorded.
- The candidate direction is backend-only and does not change frontend behavior.

## Validation

Commands / checks run:

```powershell
```

Result:

- Candidate inspection recorded without runtime change.

## Risk / Stop Line

Non-claims:

- No frontend change.
- No Stripe behavior change.
- No webhook behavior change.
- No migration change.
- No RLS change.
- No receipt PDF change.
- No verification change.
- No Supabase Storage change.

## Next Action

AAC35 should define the smallest backend-only payment adapter candidate that maps local/Stripe evidence into canonical `public.payments` fields.
