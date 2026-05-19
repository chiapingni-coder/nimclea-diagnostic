# LR10 STORAGE AND PDF RETENTION DECISION RECORD

## Record ID

NIMCLEA_LR10_STORAGE_AND_PDF_RETENTION_DECISION_RECORD_V0_1

## Date

2026-05-19

## Purpose

This record documents the LR10 decision for Storage-backed PDF retention before the first controlled outreach launch. It corresponds to the Controlled Outreach checklist LR6 and determines whether the first controlled batch requires Supabase Storage-backed PDF retention or can proceed as a no-storage controlled launch.

## Scope

- Area: Controlled Outreach launch readiness, PDF delivery fallback, payment/receipt authority, and storage retention policy.
- Files inspected: `docs/NIMCLEA_LR10_STORAGE_AND_PDF_RETENTION_DECISION_RECORD_V0_1.md`
- Files changed: `docs/NIMCLEA_LR10_STORAGE_AND_PDF_RETENTION_DECISION_RECORD_V0_1.md`
- Runtime behavior affected: None. This is a documentation-only decision record.

## Decision / Change Summary

- Decision: Option B - proceed with a no-storage controlled launch for the first small batch.
- First controlled launch does not require Supabase Storage-backed PDF retention before starting the golden customer smoke.
- PDF handling for the first controlled batch remains immediate PDF generation at the paid/export moment, with manual resend fallback if a customer needs a replacement copy.
- Receipt/payment authority remains the source of truth for payment confirmation and customer entitlement.
- Supabase Storage-backed PDF retention is explicitly deferred until there is evidence that controlled-launch volume, support burden, compliance needs, or customer expectations require retained generated PDFs.
- This decision does not add Supabase Storage.
- This decision does not change payment provider integration.
- This decision does not change PDF export paid gate behavior.
- This decision does not claim full launch readiness.
- This decision does not implement AUTO3.

## Acceptance Criteria

- A clear storage/PDF retention decision is recorded for LR10.
- The decision is aligned with a small first controlled batch.
- Supabase Storage-backed PDF retention is explicitly deferred, not implemented.
- Manual resend fallback is named as the operational fallback for the first controlled batch.
- Receipt/payment authority is recorded as the controlling entitlement evidence.
- The record states there are no runtime, frontend, backend, migration, payment provider, paid gate, or AUTO3 changes.
- The next action moves to controlled end-to-end golden customer smoke after this decision is closed.

## Validation

Commands / checks run:

```powershell
Get-Content -Raw docs/NIMCLEA_LR10_STORAGE_AND_PDF_RETENTION_DECISION_RECORD_V0_1.md
```

Result:

- Existing record template was inspected.
- Record was filled as documentation-only.
- No runtime code, frontend code, backend runtime code, Supabase migrations, or Supabase Storage changes were made.

## Risk / Stop Line

- Risk accepted for first controlled batch: without retained PDFs in Supabase Storage, replacement delivery depends on payment/receipt authority plus manual resend fallback.
- Stop line: do not expand beyond the first controlled batch or claim full launch readiness if manual resend burden, entitlement ambiguity, customer support volume, compliance retention needs, or failed PDF delivery rates exceed what can be handled manually.
- Stop line: do not add Supabase Storage, alter payment integration, alter the paid export gate, or implement AUTO3 under this LR10 decision record.

## Next Action

- Close this decision and move to controlled end-to-end golden customer smoke.
