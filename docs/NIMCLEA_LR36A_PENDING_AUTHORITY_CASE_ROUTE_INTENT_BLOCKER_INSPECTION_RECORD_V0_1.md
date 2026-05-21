# LR36A PENDING AUTHORITY CASE ROUTE INTENT BLOCKER INSPECTION RECORD

## Record ID

NIMCLEA_LR36A_PENDING_AUTHORITY_CASE_ROUTE_INTENT_BLOCKER_INSPECTION_RECORD_V0_1

## Date

2026-05-20

## Purpose

This record documents the LR36A inspection of why a pending-authority case can display the correct fail-closed lifecycle status on the deployed Cases page while the primary route intent still sends the user to Pilot.

Classification: product mainline / route-intent gating problem.

## Scope

- Area: Cases page lifecycle display, primary case route intent, pilot eligibility / continuation routing, and local browser state influence.
- Files inspected: AUTO2 prompt/context, current target record, current git status, and release gate protection state; no runtime files were changed when AUTO2B small-fix filled this deterministic field.
  - `frontend/pages/CasesPage.jsx`
  - `frontend/utils/pilotRouting.js`
  - `frontend/pages/PilotPage.jsx`
  - `frontend/PilotSetupPage.jsx`
  - `frontend/pages/ResultPage.jsx`
- Files changed: docs/NIMCLEA_LR36A_PENDING_AUTHORITY_CASE_ROUTE_INTENT_BLOCKER_INSPECTION_RECORD_V0_1.md.
  - `docs/NIMCLEA_LR36A_PENDING_AUTHORITY_CASE_ROUTE_INTENT_BLOCKER_INSPECTION_RECORD_V0_1.md`
- Runtime behavior affected: None. Documentation-only inspection record.

## Decision / Change Summary

- Deployed observation: the Cases page now shows `Status: case_plan_completed_pending_receipt_authority`, which proves the lifecycle display can fail closed when case-plan completion exists but backend-owned receipt authority is missing.
- Blocker: clicking `Continue Case` still routes to `/pilot?caseId=...&from=case`.
- Inspection found this is not a one-case data repair target. It is a route-intent gating mismatch in the product mainline.
- `frontend/pages/CasesPage.jsx` defines `CASE_PLAN_COMPLETED_PENDING_RECEIPT_AUTHORITY_STATE` as `case_plan_completed_pending_receipt_authority`.
- `deriveCaseListState(...)` can set `displayStatus` and `lifecycleState` to `case_plan_completed_pending_receipt_authority` when `pendingReceiptAuthority` is true.
- The primary CTA branch separately computes `shouldContinueDiagnostic` from:
  - no backend authority issue;
  - `derived.diagnosticOnly || isDiagnosticContinuation`;
  - no `derived.hasReceiptStageSignal`;
  - no `derived.receiptReady`.
- That CTA branch does not exclude `derived.lifecycleState === case_plan_completed_pending_receipt_authority` or `derived.displayStatus === case_plan_completed_pending_receipt_authority`.
- Because `hasReceiptStageSignal` is currently limited to backend receipt ready or receipt-not-ready display signal, a pending-authority case can still satisfy the diagnostic-continuation route predicate.
- When `shouldContinueDiagnostic` is true, `primaryActionPath` is built as `${ROUTES.PILOT || "/pilot"}?caseId=${encodeURIComponent(primaryResolvedCaseId)}&from=case` and the label becomes `Continue Case`.
- The click handler then preserves that target when `shouldContinueDiagnostic` is true, so the observed deployed route to `/pilot?caseId=...&from=case` follows the inspected code path.
- `frontend/utils/pilotRouting.js` contains broader Pilot / Result / Receipt route resolution helpers, but CasesPage does not use `resolvePilotRoute(...)` or `buildPilotNavigationState(...)` for this primary card CTA. The observed route is therefore selected directly inside CasesPage, before pilot route eligibility helpers can classify the pending-authority case.
- No inspected localStorage key appears to select this CTA target. CasesPage reads/writes local email, archive/delete, and current-case identity state, but the inspected `/pilot?caseId=...&from=case` target is computed from the normalized case item and derived lifecycle state in render-time route logic.
- Backend case state is not the immediate blocker by inspection because the deployed UI already receives enough case state to display `case_plan_completed_pending_receipt_authority`. The missing piece is that route intent does not consume that pending-authority lifecycle result.
- CTA label/target mismatch is present: the card can display a pending-authority lifecycle status while the primary CTA remains `Continue Case` and targets Pilot.

## Acceptance Criteria

- Inspection classifies the issue as product mainline / route-intent gating, not a one-case fix.
- Inspection distinguishes lifecycle display success from route intent failure.
- Inspection covers CasesPage route decision logic, Continue Case handler, pilot route eligibility, and localStorage/stored pilot-start influence.
- No frontend runtime code, backend runtime code, Supabase migration, storage, or AUTO/process code is changed.
- Next action is a narrow candidate, not a broad repair or data mutation.

## Validation

Commands / checks run:

```powershell
Get-Content -Path docs/NIMCLEA_LR36A_PENDING_AUTHORITY_CASE_ROUTE_INTENT_BLOCKER_INSPECTION_RECORD_V0_1.md
git status --short
rg -n "Continue Case|case_plan_completed_pending_receipt_authority|pilot\?|from=case|localStorage|pilot" -S .
rg -n "Continue Case|handle.*Continue|navigate\(|ROUTES\.PILOT|/pilot|case_plan_completed_pending_receipt_authority|pending_receipt|receipt_authority|localStorage|getItem\(" frontend/pages/CasesPage.jsx
rg -n "buildPilotNavigationState|PILOT|pilot/start|pilot_setup|from=case|caseId" frontend/utils frontend/lib frontend/pages frontend -g "*.js" -g "*.jsx"
rg -n "case_plan_completed_pending_receipt_authority|pending_receipt_authority|pending authority|receipt authority|route intent|Continue Case" docs frontend backend -S
rg -n "function deriveCaseListState|PENDING_AUTHORITY|pendingReceiptAuthority|case_plan_completed_pending_receipt_authority|diagnosticOnly|hasReceiptStageSignal|displayStatus" frontend/pages/CasesPage.jsx
rg -n "function isDiagnosticOnlyCase|function isDiagnosticContinuationCase|function hasPostDiagnosticProgress|function hasPilotOrCaseResultContext|casePlanCompletedEvidence|hasReceiptPathContext" frontend/pages/CasesPage.jsx
rg -n "buildPilotNavigationState|resolvePilotRoute|getPilotRoutePath|pilotRouting" frontend/pages/CasesPage.jsx frontend/PilotPage.jsx frontend/PilotSetupPage.jsx frontend/pages/ResultPage.jsx
```

Result:

- PASS for documentation-only inspection.
- Target record existed before fill and was the only file changed.
- `git status --short` showed the target record as untracked before fill; no runtime file was modified.
- Evidence supports a narrow route-intent gating blocker in CasesPage:
  - lifecycle state derivation can land `case_plan_completed_pending_receipt_authority`;
  - primary CTA selection can still treat the same item as diagnostic continuation;
  - CTA path is computed directly as `/pilot?caseId=...&from=case`;
  - pilot route helpers are not used by this CasesPage primary CTA path;
  - localStorage was not found as the direct selector for this observed target.

## Risk / Stop Line

- Do not fix the individual deployed case record to make this symptom disappear.
- Do not broaden receipt-ready, paid, or green-card authority to local, legacy, URL, snapshot, or display-only evidence.
- Do not route pending-authority cases to Receipt unless backend-owned receipt authority or an explicitly accepted pending-authority receipt route contract supports it.
- Do not change frontend runtime code, backend runtime code, Supabase migrations, Supabase Storage, payment behavior, or AUTO/process behavior in this record.
- Stop if a future patch cannot keep lifecycle display fail-closed while also preventing Pilot route intent for pending-authority cases.

## Next Action

- Narrow candidate: update the CasesPage primary route-intent predicate so `derived.lifecycleState === "case_plan_completed_pending_receipt_authority"` is treated as a non-Pilot pending-authority state before `shouldContinueDiagnostic` can select `/pilot?caseId=...&from=case`.
- The candidate should align CTA label and target for this state. It should either block/hold the primary action as pending authority or route to a separately accepted pending-authority review surface, but it must not reopen Pilot and must not claim receipt readiness without backend-owned receipt authority.
