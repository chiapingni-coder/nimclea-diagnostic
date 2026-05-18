# Nimclea AAC39 Receipt Payment Linkage Adapter Candidate Record v0.1

## Status

CANDIDATE RECORDED

## Purpose

This record defines the smallest backend-only adapter candidate for linking an existing receipt to an existing payment under the AAC38 authority decision.

## Scope

- Area: receipt-payment linkage adapter candidate only
- Files inspected: `backend/utils/supabaseCoreAuthorityStore.js`, AAC38 decision record
- Files changed: this record only
- Runtime behavior affected: none

## Decision / Change Summary

The authoritative linkage rule from AAC38 is:

- `receipts.payment_id` is the primary direct authority link when a receipt is paid
- `payments.metadata.receipt_id` remains supporting provenance only

The smallest backend-only adapter candidate is to update the receipt authority record so that:

- the receipt row is written through `public.receipts`
- `receipts.payment_id` is set to the linked payment identifier
- `receipts.receipt_status` is updated according to the receipt authority contract
- the payment row remains owned by the payments authority path, with `payments.metadata.receipt_id` preserved as provenance

## Acceptance Criteria

- The candidate is backend-only.
- The candidate updates receipt linkage through `public.receipts`.
- The candidate does not make payments the owner of receipt readiness.
- The candidate preserves `payments.metadata.receipt_id` as provenance only.
- The candidate remains scoped to future implementation, not runtime change.

## Validation

Commands / checks run:

```powershell
```

Result:

- Candidate inspection recorded without runtime change.

## Risk / Stop Line

Non-claims:

- No runtime code change.
- No Stripe route change.
- No webhook change.
- No frontend change.
- No receipt PDF change.
- No verification unlock change.
- No migration change.
- No RLS change.
- No Supabase Storage change.

## Next Action

AAC40 should define the minimal backend-only linkage adapter implementation candidate before any runtime change.
