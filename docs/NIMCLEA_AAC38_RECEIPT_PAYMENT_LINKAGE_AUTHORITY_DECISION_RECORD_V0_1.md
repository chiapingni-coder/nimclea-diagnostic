# Nimclea AAC38 Receipt Payment Linkage Authority Decision Record v0.1

## Status

DECISION RECORDED

## Purpose

This record selects the authoritative linkage rule between receipts and payments after AAC30-AAC32 closed receipts authority and AAC33-AAC37 closed payments authority.

## Scope

- Area: receipt-payment linkage authority decision only
- Files inspected: `docs/NIMCLEA_AAC32_RECEIPTS_BACKEND_AUTHORITY_CLOSURE_SCOPE_RECORD_V0_1.md`, `docs/NIMCLEA_AAC37_PAYMENTS_BACKEND_AUTHORITY_CLOSURE_SCOPE_RECORD_V0_1.md`
- Files changed: this record only
- Runtime behavior affected: none

## Decision / Change Summary

Receipt-payment linkage should be represented by `receipts.payment_id` as the primary direct authority link when a receipt is paid.

`payments.metadata.receipt_id` may remain supporting provenance and evidence.

Payments should not be treated as the owner of receipt readiness by itself.

Future receipt activation or unlock should require an explicit backend authority update that:

- links the receipt to the payment
- sets receipt status according to the receipt authority contract

## Acceptance Criteria

- The primary direct authority link is explicitly selected as `receipts.payment_id`.
- `payments.metadata.receipt_id` remains supporting provenance only.
- The decision remains scope-limited to authority direction only.
- No runtime implementation is performed here.

## Validation

Commands / checks run:

```powershell
```

Result:

- Decision recorded without runtime change.

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

AAC39 should inspect the linkage adapter candidate before any implementation.
