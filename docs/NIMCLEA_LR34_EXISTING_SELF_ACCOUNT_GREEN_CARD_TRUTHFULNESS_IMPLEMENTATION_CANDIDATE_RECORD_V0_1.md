# LR34 EXISTING SELF ACCOUNT GREEN CARD TRUTHFULNESS IMPLEMENTATION CANDIDATE RECORD

## Record ID

NIMCLEA_LR34_EXISTING_SELF_ACCOUNT_GREEN_CARD_TRUTHFULNESS_IMPLEMENTATION_CANDIDATE_RECORD_V0_1

## Date

2026-05-20

## Purpose

This record documents the LR34 implementation candidate for the existing self-account workspace green-card truthfulness blocker classified in LR33.

The candidate is documentation-only. It defines the narrow boundary for a later LR35 implementation that should prevent frontend workspace cards from displaying green, paid, or receipt-ready truthfulness based on frontend-local, legacy, or broad receipt hints when the case is an existing self-account case.

## Scope

- Area: Existing self-account workspace card truthfulness display.
- Files inspected: AUTO2 prompt/context, current target record, current git status, and release gate protection state; no runtime files were changed when AUTO2B small-fix filled this deterministic field.
  - `docs/NIMCLEA_LR34_EXISTING_SELF_ACCOUNT_GREEN_CARD_TRUTHFULNESS_IMPLEMENTATION_CANDIDATE_RECORD_V0_1.md`
- Files changed: docs/NIMCLEA_LR34_EXISTING_SELF_ACCOUNT_GREEN_CARD_TRUTHFULNESS_IMPLEMENTATION_CANDIDATE_RECORD_V0_1.md.
  - `docs/NIMCLEA_LR34_EXISTING_SELF_ACCOUNT_GREEN_CARD_TRUTHFULNESS_IMPLEMENTATION_CANDIDATE_RECORD_V0_1.md`
- Runtime behavior affected: None. This is a documentation-only candidate record.

## Decision / Change Summary

- LR34 selects `frontend/pages/CasesPage.jsx` workspace card derivation as the current implementation suspect for LR35.
- The candidate direction is to constrain workspace card green, paid, and receipt-ready display to backend-owned receipt authority only.
- Current important evidence from LR33 context: `CasesPage` derives `directBackendReceiptReady` from `hasCanonicalBackendReceiptReadySignal(normalized)` plus legacy or broad hints including:
  - `receiptEligible === true`
  - `caseReceiptEligible === true`
  - `receiptStatus === "ready"`
  - `status === "receipt_ready"`
  - `stage === "receipt_ready"`
- Selected boundary:
  - Legacy `receiptEligible`, `caseReceiptEligible`, `receiptStatus: ready`, `status: receipt_ready`, `stage: receipt_ready`, local paid state, and `paymentStatus: paid` may remain compatibility or route hints.
  - Those hints must not independently produce green card truthfulness or formal receipt-readiness display for existing self-account cases.
- No frontend patch is made in this record.
- No backend change is made in this record.
- No Supabase schema, migration, Storage, payment, receipt export, verification, storage, or auth behavior change is made in this record.

## Acceptance Criteria

- The LR34 record exists and is filled as a candidate record.
- The record identifies the suspected frontend workspace-card derivation location without modifying it.
- The record preserves the selected implementation boundary: only backend-owned receipt authority may light green, paid, or receipt-ready workspace card truthfulness for existing self-account cases.
- The record explicitly leaves legacy and broad receipt hints available as compatibility or route hints while excluding them from independent truthfulness display authority.
- The record stays documentation-only.

## Validation

Commands / checks run:

```powershell
Get-Content -Raw -LiteralPath 'docs/NIMCLEA_LR34_EXISTING_SELF_ACCOUNT_GREEN_CARD_TRUTHFULNESS_IMPLEMENTATION_CANDIDATE_RECORD_V0_1.md'
```

Result:

- Confirmed the target record existed before editing.
- Filled only the target docs record.
- No runtime code, frontend code, backend code, Supabase migration, or Storage file was modified.

## Risk / Stop Line

- Stop if LR35 requires changing payment, receipt export, verification, storage, auth behavior, backend runtime behavior, or Supabase schema. LR34 only authorizes the narrow workspace-card truthfulness candidate.
- Stop if the implementation tries to remove compatibility or route hints entirely instead of only preventing those hints from independently producing formal green-card truthfulness for existing self-account cases.
- Stop if the patch cannot distinguish backend-owned receipt authority from legacy or broad frontend-normalized hints.

## Next Action

- LR35 implementation plus controlled smoke should patch the narrow workspace-card truthfulness logic and add or update a guard that prevents non-backend-owned receipt hints from lighting the green card for existing self-account cases.
