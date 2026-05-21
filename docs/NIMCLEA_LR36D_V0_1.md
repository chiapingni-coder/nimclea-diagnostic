# LR36D

## Record ID

NIMCLEA_LR36D_V0_1

## Date

2026-05-21

## Purpose

Document the narrow implementation smoke for getCaseDetailRoute pending authority route restoration.

## Scope

- Area: Product mainline / getCaseDetailRoute route authority gating.
- Files inspected: frontend/pages/CasesPage.jsx; docs/NIMCLEA_LR36C_V0_1.md.
- Files changed: frontend/pages/CasesPage.jsx; docs/NIMCLEA_LR36D_V0_1.md.
- Runtime behavior affected: CasesPage Detail route resolution now sends case_plan_completed_pending_receipt_authority cases to Receipt before diagnostic continuation can fall back to Pilot.

## Decision / Change Summary

- Added a pending authority guard inside getCaseDetailRoute.
- If derived.lifecycleState is case_plan_completed_pending_receipt_authority, getCaseDetailRoute returns /receipt?caseId=... .
- This guard is evaluated before the diagnostic continuation branch that returns /pilot?caseId=...&from=case.
- This fixes the LR36C residual route defect where Detail displayed correctly but click navigation still fell through to Pilot.
- No lifecycle derivation, receipt readiness, payment, verification, backend, Supabase migration, or storage behavior was changed.

## Acceptance Criteria

- Detail click for a pending authority case must not route to Pilot.
- Pending authority case detail route must resolve to Receipt.
- Diagnostic continuation cases without pending authority remain eligible for Pilot under existing logic.
- Frontend build must pass.

## Validation

Commands / checks run:

git diff -- frontend/pages/CasesPage.jsx
npm --prefix frontend run build

Result:

- PASS pending build confirmation if not already rerun after LR36D patch.
- frontend/pages/CasesPage.jsx now checks derived.lifecycleState before the diagnostic continuation Pilot branch in getCaseDetailRoute.
- Existing Vite warnings are non-blocking and unrelated to LR36D.

## Risk / Stop Line

- Stop if route restoration changes expand beyond getCaseDetailRoute pending authority gating.
- Stop if lifecycle derivation, receipt readiness, payment, verification, backend, Supabase migrations, or Supabase Storage behavior changes are introduced.
- Stop if release-check returns FAIL.

## Next Action

- Run frontend build after LR36D patch if not already done.
- Protect this record with gate-doc.
- Run release-check.
- Push only if final git status contains intended LR36D changes.
