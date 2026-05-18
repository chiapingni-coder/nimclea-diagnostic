# Nimclea AAC33 Payment Authority Contract Direction Decision Record v0.1

## Status

DECISION RECORDED

## Purpose

This record selects the canonical payment authority target for future backend payment adapter work.

## Scope

- Area: payment authority contract direction only
- Files inspected: `docs/NIMCLEA_AAC30_RECEIPTS_BACKEND_ADAPTER_ALIGNMENT_RECORD_V0_1.md`, `docs/NIMCLEA_AAC31_RECEIPTS_BACKEND_WRITE_READBACK_CONFIDENCE_SMOKE_RECORD_V0_1.md`, `docs/NIMCLEA_AAC32_RECEIPTS_BACKEND_AUTHORITY_CLOSURE_SCOPE_RECORD_V0_1.md`
- Files changed: this record only
- Runtime behavior affected: none

## Decision / Change Summary

AAC30-AAC32 closed backend receipts authority alignment and write/read-back only.

Selected canonical payment authority target:

- `public.payments`

Stripe and local payment persistence may remain input or event sources, but they should not be treated as the final clean authority store.

## Acceptance Criteria

- The payment authority target is explicitly selected as `public.payments`.
- The decision remains scope-limited to contract direction only.
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

AAC34 should inspect the payment backend adapter and define the smallest candidate before any implementation or write smoke.
