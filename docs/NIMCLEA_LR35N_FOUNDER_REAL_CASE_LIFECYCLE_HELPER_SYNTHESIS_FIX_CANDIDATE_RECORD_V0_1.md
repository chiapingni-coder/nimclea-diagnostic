# LR35N FOUNDER REAL CASE LIFECYCLE HELPER SYNTHESIS FIX CANDIDATE RECORD

## Record ID

NIMCLEA_LR35N_FOUNDER_REAL_CASE_LIFECYCLE_HELPER_SYNTHESIS_FIX_CANDIDATE_RECORD_V0_1

## Date

2026-05-20

## Purpose

This record documents LR35N as a founder real-case lifecycle helper synthesis fix candidate after LR35M.

LR35N is selected only if the upstream signal source inputs are present and correctly shaped, but the synthesized lifecycle status consumed by the CasesPage green card remains wrong. In that case, the defect is no longer classified as LR35M signal-source selection; it is classified as helper synthesis logic that fails to convert available backend-owned receipt authority signals into the correct lifecycle status.

This is documentation-only candidate selection. It does not implement a fix, does not claim smoke validation, does not change UI wording, and does not authorize Supabase Storage, payment, schema, migration, frontend runtime, backend runtime, or unrelated runtime scope.

## Scope

- Area: Founder real-case lifecycle helper synthesis candidate after LR35M signal-source candidate selection.
- Files inspected: AUTO2 prompt/context, current target record, current git status, and release gate protection state; no runtime files were changed when AUTO2B small-fix filled this deterministic field.
  - `docs/NIMCLEA_LR35N_FOUNDER_REAL_CASE_LIFECYCLE_HELPER_SYNTHESIS_FIX_CANDIDATE_RECORD_V0_1.md`
  - `docs/NIMCLEA_LR35M_FOUNDER_REAL_CASE_LIFECYCLE_SIGNAL_SOURCE_FIX_CANDIDATE_RECORD_V0_1.md`
  - `docs/NIMCLEA_LR35I_CASES_PAGE_LIFECYCLE_STATUS_DISPLAY_MATRIX_GUARD_IMPLEMENTATION_SMOKE_RECORD_V0_1.md`
  - `frontend/utils/dataContractLifecycle.js` by read-only inspection as the smallest shared helper synthesis candidate.
  - `frontend/pages/CasesPage.jsx` by read-only inspection to confirm the green-card display boundary and synthesis call path.
  - `backend/utils/caseAggregationHelpers.js` by read-only inspection as the previously selected LR35M source-selection candidate, not the LR35N helper-synthesis candidate.
- Files changed: docs/NIMCLEA_LR35N_FOUNDER_REAL_CASE_LIFECYCLE_HELPER_SYNTHESIS_FIX_CANDIDATE_RECORD_V0_1.md.
  - `docs/NIMCLEA_LR35N_FOUNDER_REAL_CASE_LIFECYCLE_HELPER_SYNTHESIS_FIX_CANDIDATE_RECORD_V0_1.md`
- Runtime behavior affected: None. This record selects a candidate layer and exact synthesis rule only.

## Decision / Change Summary

- LR35N is classified as a product-mainline helper synthesis fix candidate after LR35M.
- LR35N applies only when the signal source inputs are already present. If the record reaching CasesPage contains backend-owned receipt authority and receipt-ready lifecycle evidence, but the green-card lifecycle synthesis still displays a weaker or wrong state, the selected fix layer is helper synthesis.
- LR35N does not replace LR35M:
  - LR35M remains the source-selection candidate when fallback/snapshot or non-authoritative receipt-ready-like fields are being promoted upstream.
  - LR35N is the next candidate when upstream selection is not the failure and the helper synthesis rule is too narrow or inconsistent.
- LR35I remains the display matrix guard boundary:
  - Green `Receipt ready` on CasesPage must remain gated by strict backend-owned receipt authority.
  - LR35N must not broaden green-card authority to legacy hints, local snapshots, fallback records, status text parsing, or UI wording changes.
- Selected smallest helper/source file candidate: `frontend/utils/dataContractLifecycle.js`.
- Rationale:
  - It is much smaller than `frontend/pages/CasesPage.jsx` and already centralizes backend-owned lifecycle, receipt, payment, verification, fallback-source, and no-downgrade checks.
  - CasesPage already imports lifecycle helpers from this file and uses helper-derived backend-owned receipt access to decide whether green `Receipt ready` is allowed.
  - A synthesis defect should be fixed where receipt authority and lifecycle booleans are derived, not by adding page-local display exceptions in CasesPage.
- Exact candidate synthesis rule, not implemented here:
  - In `frontend/utils/dataContractLifecycle.js`, align backend-owned receipt-ready synthesis so `hasBackendOwnedReceiptAccess(record)` returns true only when both conditions are satisfied:
    1. `hasBackendOwnedReceiptAuthority(record)` is true, including canonical/backend/confirmed/Supabase/Stripe-backed source or authority flags and no fallback source.
    2. `isBackendOwnedReceiptReady(record)` is true, including canonical receipt-ready or stronger receipt/verification lifecycle values such as `receipt_ready`, `receipt_paid`, `receipt_activated`, `receipt_issued`, `verification_ready`, or `verification_issued`.
  - Then keep CasesPage green-card synthesis using the existing `directBackendReceiptReady = strictBackendOwnedReceiptAuthority` path, with `strictBackendOwnedReceiptAuthority` coming from the corrected helper result.
  - Do not treat `receiptEligible: true`, `caseReceiptEligible: true`, `receiptStatus: ready`, `stage/status: receipt_ready`, status text, local cache, preview, or receipt snapshots as sufficient unless the same normalized record also carries backend-owned receipt authority.
- Non-selected candidates:
  - `frontend/pages/CasesPage.jsx`: not selected because LR35I owns the display matrix and this candidate should preserve that boundary rather than adding page-local display wording or state exceptions.
  - `backend/utils/caseAggregationHelpers.js`: not selected for LR35N because LR35M already selected it for source selection; LR35N is only for the later helper synthesis layer.
  - Supabase migrations, Supabase Storage, payment, schema, receipt issuance, and verification unlock code: explicitly out of scope.

## Acceptance Criteria

- LR35N is filled after LR35M as a founder real-case lifecycle helper synthesis fix candidate.
- The selected fix layer is helper synthesis only if signal source inputs are present but the synthesized lifecycle status remains wrong.
- The record selects the smallest inspected helper/source file for the synthesis correction: `frontend/utils/dataContractLifecycle.js`.
- The record names the exact synthesis rule: backend-owned receipt access must require both backend-owned receipt authority and backend-owned receipt-ready-or-stronger lifecycle evidence.
- LR35I's display matrix guard boundary is preserved: green `Receipt ready` remains strict backend-owned receipt authority only.
- No UI wording change is authorized.
- No implementation, smoke, or runtime validation is claimed.
- No Supabase Storage, payment, schema, migration, frontend runtime, backend runtime, or unrelated runtime scope is authorized.
- The only changed file is this target documentation record.

## Validation

Commands / checks run:

```powershell
Get-Content -LiteralPath 'docs/NIMCLEA_LR35N_FOUNDER_REAL_CASE_LIFECYCLE_HELPER_SYNTHESIS_FIX_CANDIDATE_RECORD_V0_1.md'
Get-Content -LiteralPath 'docs/NIMCLEA_LR35M_FOUNDER_REAL_CASE_LIFECYCLE_SIGNAL_SOURCE_FIX_CANDIDATE_RECORD_V0_1.md'
Get-Content -LiteralPath 'docs/NIMCLEA_LR35I_CASES_PAGE_LIFECYCLE_STATUS_DISPLAY_MATRIX_GUARD_IMPLEMENTATION_SMOKE_RECORD_V0_1.md'
Get-ChildItem frontend/utils/dataContractLifecycle.js,frontend/pages/CasesPage.jsx,backend/utils/caseAggregationHelpers.js | Select-Object FullName,Length
rg -n "deriveCaseListState|case_plan_completed_pending_receipt_authority|directBackendReceiptReady|Receipt ready|receipt ready|green-card|green card|lifecycle" frontend/pages/CasesPage.jsx frontend/utils/dataContractLifecycle.js backend/utils/caseAggregationHelpers.js
```

Result:

- Confirmed the target record existed before editing.
- Confirmed LR35M selected `backend/utils/caseAggregationHelpers.js` for source selection, not helper synthesis.
- Confirmed LR35I keeps green `Receipt ready` gated by strict backend-owned receipt authority and must remain the display matrix boundary.
- Confirmed `frontend/utils/dataContractLifecycle.js` is the smaller shared helper synthesis candidate compared with `frontend/pages/CasesPage.jsx`.
- Filled this record only. No runtime files were changed.

## Risk / Stop Line

- Stop if this record is treated as permission to implement the helper fix.
- Stop if signal source inputs are not actually present; that remains LR35M source-selection territory, not LR35N helper synthesis.
- Stop if a future fix weakens LR35I by allowing legacy/fallback readiness hints, status text, local cache, preview, or receipt snapshots to display green `Receipt ready`.
- Stop if a future fix changes CasesPage wording or display matrix semantics instead of correcting helper synthesis.
- Stop if the change expands into Supabase Storage, payment, schema, migration, receipt issuance, verification unlock, frontend runtime, backend runtime, or unrelated UI scope without an explicit implementation record.

## Next Action

- Create or use a separate implementation record only if explicitly authorized.
- If authorized later and the LR35N condition is confirmed, apply the smallest helper synthesis fix in `frontend/utils/dataContractLifecycle.js`: make backend-owned receipt access require both backend-owned receipt authority and backend-owned receipt-ready-or-stronger lifecycle evidence, while preserving LR35I's strict CasesPage display boundary and making no UI wording change.
