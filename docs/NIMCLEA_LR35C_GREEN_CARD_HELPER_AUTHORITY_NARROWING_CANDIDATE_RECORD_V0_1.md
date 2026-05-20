# LR35C GREEN CARD HELPER AUTHORITY NARROWING CANDIDATE RECORD

## Record ID

NIMCLEA_LR35C_GREEN_CARD_HELPER_AUTHORITY_NARROWING_CANDIDATE_RECORD_V0_1

## Date

2026-05-20

## Purpose

Create and fill the LR35C candidate record for narrowing green-card helper authority semantics after LR35B found that legacy/local receipt readiness hints can currently satisfy helper names that imply backend-owned/canonical authority.

This is a documentation-only candidate. It does not implement runtime behavior.

## Scope

- Area: Self-account workspace green-card helper authority semantics.
- Files inspected: AUTO2 prompt/context, current target record, current git status, and release gate protection state; no runtime files were changed when AUTO2B small-fix filled this deterministic field.
  - `docs/NIMCLEA_LR35C_GREEN_CARD_HELPER_AUTHORITY_NARROWING_CANDIDATE_RECORD_V0_1.md`
  - Prior LR35B inspection context identified `frontend/utils/dataContractLifecycle.js` as the current helper source.
- Files changed: docs/NIMCLEA_LR35C_GREEN_CARD_HELPER_AUTHORITY_NARROWING_CANDIDATE_RECORD_V0_1.md.
  - `docs/NIMCLEA_LR35C_GREEN_CARD_HELPER_AUTHORITY_NARROWING_CANDIDATE_RECORD_V0_1.md`
- Runtime behavior affected: none.

## Decision / Change Summary

- LR35B green-card source tracking probe found an existing self-account green-card source of `backend_owned_ready`.
- Probe output showed:
  - `isBackendReceiptReady: true`
  - `hasBackendOwnedReceiptAccess: true`
  - `isBackendReceiptPaidOrActivated: false`
  - `paymentStatus: unpaid`
  - `paid: false`
  - `receiptEligible: true`
  - `caseReceiptEligible: true`
  - `receiptStatus: ready`
  - `stage: receipt_ready`
- Follow-up inspection found `frontend/utils/dataContractLifecycle.js` is the current source:
  - `isBackendReceiptReady(record)` currently returns true from broad legacy/local hints, including `receiptEligible true`, `caseReceiptEligible true`, `receipt_ready true`, `receipt.eligible true`, `receiptStatus ready`, `receiptStatus receipt_ready`, `stage receipt_ready`, and `status receipt_ready`.
  - `hasBackendOwnedReceiptAccess(record)` then returns true because it includes `isBackendReceiptReady(record)`.
- Problem: the helper names imply backend-owned/canonical authority, but their current conditions accept legacy/local readiness hints as sufficient proof.
- Candidate direction: split legacy readiness hints from backend-owned receipt authority.
- Selected candidate: create or narrow backend-owned receipt authority semantics so formal workspace green-card truthfulness only relies on explicit backend/canonical authority markers, not legacy/local readiness hints.
- Candidate options evaluated:
  - Option A: Narrow `isBackendReceiptReady(record)` itself to require explicit backend-owned/canonical authority markers.
  - Option B: Add a new strict helper such as `isBackendOwnedReceiptReady(record)`, and migrate green-card display paths to the strict helper while preserving old `isBackendReceiptReady(record)` for compatibility.
  - Option C: Keep helpers but require source/authority markers before accepting readiness fields.
- Selected direction: Option B.
- Rationale: Option B is likely safest because it avoids breaking older compatibility paths while giving workspace green-card truthfulness a strict authority boundary.

## Acceptance Criteria

- Documentation-only record is filled.
- No frontend code is modified.
- No backend runtime code is modified.
- No runtime code is modified.
- No Supabase migrations are modified.
- No Supabase Storage is added.
- Runtime behavior remains unchanged.
- LR35D has enough implementation guidance to define a strict helper authority boundary and prove legacy hints alone cannot produce backend-owned green-card truthfulness.

## Validation

Commands / checks run:

```powershell
Get-Content -LiteralPath 'docs/NIMCLEA_LR35C_GREEN_CARD_HELPER_AUTHORITY_NARROWING_CANDIDATE_RECORD_V0_1.md'
```

Result:

- Existing record scaffold was present and filled in place.
- No implementation commands were run.

## Risk / Stop Line

- Risk: changing existing helper semantics directly could break compatibility paths that depend on broad legacy/local receipt readiness interpretation.
- Stop line: do not patch `CasesPage` until the strict helper authority boundary is defined.
- Stop line: do not let legacy/local readiness hints alone create formal backend-owned green-card truthfulness.
- Stop line: no payment, receipt export, verification, storage, auth, Supabase schema, or runtime behavior changes are in scope for LR35C.

## Next Action

- LR35D should implement the selected strict helper boundary, likely by adding a strict helper such as `isBackendOwnedReceiptReady(record)`, migrating green-card display paths to that strict helper, and adding a guard proving legacy hints alone cannot produce backend-owned green-card truthfulness.
