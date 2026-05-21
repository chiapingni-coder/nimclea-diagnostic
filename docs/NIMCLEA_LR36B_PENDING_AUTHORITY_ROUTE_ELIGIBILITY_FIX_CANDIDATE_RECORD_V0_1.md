# LR36B PENDING AUTHORITY ROUTE ELIGIBILITY FIX CANDIDATE RECORD

## Record ID

NIMCLEA_LR36B_PENDING_AUTHORITY_ROUTE_ELIGIBILITY_FIX_CANDIDATE_RECORD_V0_1

## Date

2026-05-20

## Purpose

Create the LR36B pending-authority route eligibility fix candidate record for product mainline / route-intent authority gating.

This is documentation-only. It identifies the candidate direction for aligning Continue Case route eligibility with the same authority lifecycle signal already used by case card display.

## Scope

- Area: Product mainline / route-intent authority gating.
- Files inspected: `docs/NIMCLEA_LR36B_PENDING_AUTHORITY_ROUTE_ELIGIBILITY_FIX_CANDIDATE_RECORD_V0_1.md`.
- Files changed: `docs/NIMCLEA_LR36B_PENDING_AUTHORITY_ROUTE_ELIGIBILITY_FIX_CANDIDATE_RECORD_V0_1.md`.
- Runtime behavior affected: None in this record. No frontend code, backend runtime code, runtime code, Supabase migrations, or Supabase Storage changes.

## Decision / Change Summary

- Problem:
  - Deployed case card display now correctly fails closed with `case_plan_completed_pending_receipt_authority`.
  - Continue Case still routes to `/pilot?caseId=...&from=case`.
- Classification: Product mainline / route-intent authority gating.
- Candidate direction:
  - Route eligibility must consume the same authority lifecycle signal as display.
  - Pending receipt/payment authority must not route to Pilot continuation.
  - This must hold even if stale localStorage pilot-start flags or old case step signals exist.
- Investigation targets for LR36C:
  - Continue Case handler.
  - Pilot route target selection.
  - localStorage pilot started flags.
  - Lifecycle-to-route mapping.
- This record does not implement the runtime fix.

## Acceptance Criteria

- Candidate record identifies the LR36B route eligibility defect and classifies it as product mainline / route-intent authority gating.
- Candidate record states that display already fails closed on `case_plan_completed_pending_receipt_authority` while Continue Case can still route to Pilot.
- Candidate record states the required routing invariant: pending receipt/payment authority must not route to Pilot continuation.
- Candidate record calls out stale localStorage pilot-start flags and old case step signals as inputs that must not override pending authority gating.
- Candidate record names the implementation inspection targets for the LR36C narrow route eligibility implementation smoke.
- Documentation-only boundary is preserved.

## Validation

Commands / checks run:

```powershell
Get-Content -LiteralPath 'docs/NIMCLEA_LR36B_PENDING_AUTHORITY_ROUTE_ELIGIBILITY_FIX_CANDIDATE_RECORD_V0_1.md'
```

Result:

- Confirmed the target record existed before editing.
- Filled only the target docs record.
- No runtime files, frontend code, backend runtime code, Supabase migrations, or Supabase Storage were changed.

## Risk / Stop Line

- Stop line: do not implement route eligibility changes in this LR36B record.
- Stop line: do not modify frontend code, backend runtime code, runtime code, Supabase migrations, or add Supabase Storage.
- Risk to resolve in LR36C: route eligibility may currently trust stale localStorage pilot-start flags or old case step signals over the authoritative pending receipt/payment lifecycle state.

## Next Action

- LR36C narrow route eligibility implementation smoke.
