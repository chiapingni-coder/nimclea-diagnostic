# LR35M FOUNDER REAL CASE LIFECYCLE SIGNAL SOURCE FIX CANDIDATE RECORD

## Record ID

NIMCLEA_LR35M_FOUNDER_REAL_CASE_LIFECYCLE_SIGNAL_SOURCE_FIX_CANDIDATE_RECORD_V0_1

## Date

2026-05-20

## Purpose

This record documents LR35M as a founder real-case lifecycle signal source fix candidate after LR35K.

The purpose is to select the smallest source-file candidate and fix direction for correcting the lifecycle signal that feeds CasesPage green-card status. This is product-mainline signal-source fix candidate documentation only. It is not an implementation record, not a UI wording fix, and not a smoke record.

## Scope

- Area: Founder real-case lifecycle signal source candidate after LR35K root-cause classification.
- Files inspected: current target record, LR35K root-cause record, LR35 docs search context, current git status, and read-only runtime source candidates needed to select the smallest fix candidate.
  - `docs/NIMCLEA_LR35M_FOUNDER_REAL_CASE_LIFECYCLE_SIGNAL_SOURCE_FIX_CANDIDATE_RECORD_V0_1.md`
  - `docs/NIMCLEA_LR35K_FOUNDER_REAL_CASE_LIFECYCLE_STATUS_ROOT_CAUSE_CLASSIFICATION_RECORD_V0_1.md`
  - LR35 docs search results for lifecycle signal, green-card, CasesPage, and LR35I/LR35K context.
  - `backend/utils/caseAggregationHelpers.js` by read-only inspection as the smallest runtime source candidate.
  - `backend/server.js` by read-only inspection to confirm the aggregation path imports and uses `backend/utils/caseAggregationHelpers.js`.
  - `backend/routes/caseRoutes.js` by read-only inspection as a larger adjacent backend candidate.
  - `frontend/pages/CasesPage.jsx` by search only to preserve the LR35I display matrix boundary and avoid frontend changes.
- Files changed: docs/NIMCLEA_LR35M_FOUNDER_REAL_CASE_LIFECYCLE_SIGNAL_SOURCE_FIX_CANDIDATE_RECORD_V0_1.md.
  - `docs/NIMCLEA_LR35M_FOUNDER_REAL_CASE_LIFECYCLE_SIGNAL_SOURCE_FIX_CANDIDATE_RECORD_V0_1.md`
- Runtime behavior affected: None. This record selects a candidate and direction only.

## Decision / Change Summary

- LR35M is classified as a product-mainline signal-source fix candidate.
- LR35M is not classified as implementation, frontend UI wording, backend runtime change, Supabase migration, Supabase Storage, payment, schema, or smoke work.
- LR35K classified the founder real-case contradiction as primarily a signal source error: fallback/snapshot receipt-ready-like fields can carry over without backend-owned receipt authority.
- LR35I remains the display boundary: green `Receipt ready` on CasesPage requires strict backend-owned receipt authority. LR35M must not weaken that guard.
- Selected smallest runtime source file candidate: `backend/utils/caseAggregationHelpers.js`.
- Rationale:
  - It is smaller than the adjacent runtime candidates inspected: `backend/server.js`, `backend/routes/caseRoutes.js`, and `frontend/pages/CasesPage.jsx`.
  - `backend/server.js` imports `pickHigherStage`, `pickRicherCaseRecord`, and `pickStrongestReceiptStatus` from this helper.
  - The helper currently ranks `receiptEligible: true` and `stage: receipt_ready` as strong richness signals, which can favor a receipt-ready-shaped record during aggregation before CasesPage receives the case list.
  - A candidate fix can be scoped to source selection/normalization semantics without touching CasesPage display wording or the LR35I matrix.
- Candidate fix direction, not implemented here:
  - Add a narrow provenance-aware aggregation rule in `backend/utils/caseAggregationHelpers.js` so fallback/snapshot or non-backend-owned receipt-ready-like signals do not outrank canonical case records merely because they contain `receiptEligible: true`, `caseReceiptEligible: true`, `receiptStatus: ready`, or `stage/status: receipt_ready`.
  - Preserve those fields as continuity context when needed, but prevent them from becoming the selected authoritative lifecycle source unless backend-owned receipt authority is present.
  - Keep CasesPage display behavior unchanged; the source fix should reduce contradictory upstream shape, not broaden green-card authority.
- Non-selected runtime candidates:
  - `frontend/pages/CasesPage.jsx`: not selected because LR35I already guards the display matrix and this prompt preserves that boundary.
  - `backend/server.js`: not selected as first candidate because the helper it imports is the smaller source file for the aggregation/source-selection seam.
  - `backend/routes/caseRoutes.js`: not selected because it is larger and the observed CasesPage feed is more directly tied to aggregation/source selection.

## Acceptance Criteria

- LR35M is filled after LR35K as a founder real-case lifecycle signal source fix candidate.
- The task is classified as product-mainline signal-source fix candidate documentation only.
- The record selects the smallest inspected runtime source file and fix direction.
- The selected candidate preserves LR35I's display matrix guard boundary.
- The record does not claim implementation, smoke, or runtime validation.
- The record does not authorize UI wording changes.
- The record does not authorize frontend code, backend runtime code, general runtime code, Supabase migrations, Supabase Storage, payment behavior, or schema changes.
- The only changed file is this target documentation record.

## Validation

Commands / checks run:

```powershell
Get-Content -Raw docs/NIMCLEA_LR35M_FOUNDER_REAL_CASE_LIFECYCLE_SIGNAL_SOURCE_FIX_CANDIDATE_RECORD_V0_1.md
Get-ChildItem docs -Filter '*LR35*.md' | Select-Object -ExpandProperty Name
rg -n "LR35K|LR35I|lifecycle signal|green-card|CasesPage" docs src app -g "*.md" -g "*.ts" -g "*.tsx" -g "*.js" -g "*.jsx"
Get-Content -Raw docs/NIMCLEA_LR35K_FOUNDER_REAL_CASE_LIFECYCLE_STATUS_ROOT_CAUSE_CLASSIFICATION_RECORD_V0_1.md
Get-ChildItem backend/utils/caseAggregationHelpers.js,backend/server.js,backend/routes/caseRoutes.js,frontend/pages/CasesPage.jsx | Select-Object FullName,Length
Get-Content -Raw backend/utils/caseAggregationHelpers.js
rg -n "caseAggregationHelpers|pickHigherStage|pickRicherCaseRecord|pickStrongestReceiptStatus|receiptEligible|caseReceiptEligible|receiptStatus|receipt_ready" backend/server.js backend/routes/caseRoutes.js frontend/pages/CasesPage.jsx
git status --short -- docs/NIMCLEA_LR35M_FOUNDER_REAL_CASE_LIFECYCLE_SIGNAL_SOURCE_FIX_CANDIDATE_RECORD_V0_1.md
```

Result:

- Confirmed the target record existed before editing.
- Confirmed LR35K classifies the issue as signal source error, not display matrix error or helper synthesis error in the guarded path.
- Confirmed LR35I's green `Receipt ready` boundary remains strict backend-owned receipt authority.
- Confirmed `backend/server.js` imports aggregation helpers from `backend/utils/caseAggregationHelpers.js`.
- Confirmed `backend/utils/caseAggregationHelpers.js` is smaller than the adjacent inspected runtime candidates and participates in source selection/richness scoring.
- Filled this record only. No runtime files were changed.

## Risk / Stop Line

- Stop if this record is treated as permission to implement the fix.
- Stop if a future fix weakens LR35I by allowing legacy/fallback readiness hints to display green `Receipt ready`.
- Stop if a future fix changes CasesPage wording or display matrix semantics instead of correcting upstream signal-source selection.
- Stop if fallback/snapshot readiness fields are promoted to backend-owned receipt authority.
- Stop if the change expands into Supabase Storage, payment, schema, migration, receipt issuance, verification unlock, frontend runtime, backend runtime, or unrelated UI scope without an explicit implementation record.

## Next Action

- Create or use a separate implementation record only if explicitly authorized.
- If authorized later, apply the smallest source-selection fix in `backend/utils/caseAggregationHelpers.js`: demote non-backend-owned fallback/snapshot receipt-ready-like signals during aggregation while preserving them as continuity context and preserving LR35I's strict CasesPage display boundary.
