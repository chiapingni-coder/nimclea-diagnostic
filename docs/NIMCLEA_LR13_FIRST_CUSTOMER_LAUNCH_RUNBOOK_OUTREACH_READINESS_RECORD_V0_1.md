# LR13 FIRST CUSTOMER LAUNCH RUNBOOK OUTREACH READINESS RECORD

## Record ID

NIMCLEA_LR13_FIRST_CUSTOMER_LAUNCH_RUNBOOK_OUTREACH_READINESS_RECORD_V0_1

## Date

2026-05-19

## Purpose

This record documents LR13 as a documentation-only first-customer launch runbook and outreach readiness boundary after LR12.

LR13 converts the controlled launch confidence from LR11 and LR12 into a safe, narrow operating procedure for the first real customer. It does not change runtime behavior, frontend behavior, backend behavior, payment-provider scope, Supabase migrations, or Supabase Storage.

## Scope

- Area: First-customer launch runbook and outreach readiness.
- Files inspected: LR11 smoke record evidence, LR12 launch-readiness closure record, release-check output, git status/log evidence.
- Files changed: This LR13 record only.
- Runtime behavior affected: None.

## Decision / Change Summary

- Nimclea may proceed from controlled launch-readiness closure into first-customer outreach readiness.
- The launch mode is controlled, manual, and narrow.
- The first customer should be treated as a guided pilot / controlled customer, not a broad self-serve public launch.
- LR11 completed controlled end-to-end golden customer smoke in commit `432e993` (`Add LR11 controlled end-to-end golden customer smoke`).
- LR12 completed controlled launch readiness closure in commit `9012a69` (`Add LR12 controlled launch readiness closure`).
- LR12 release-check result was PASS 230 / WARN 5 / FAIL 0, with final result WARN.
- GitHub `master` was aligned at `9012a69`.
- Render alive was PASS.
- Supabase Storage is not included.

Outreach may only claim the currently supported scope:

- Controlled diagnostic flow.
- Controlled case access.
- Controlled receipt / verification readiness boundaries.
- Known WARN posture.
- Supabase Storage not included.

Outreach must not claim:

- Unrestricted scale.
- Automated public onboarding.
- Guaranteed payment-provider production coverage.
- Storage-backed PDF delivery.
- Broad customer readiness beyond the tested scope.

## First-Customer Runbook

1. Select one first customer or one tightly controlled outreach recipient.
2. Confirm the customer fits the supported use case.
3. Send a narrow outreach message that frames Nimclea as a controlled diagnostic / pilot-ready product.
4. Use a controlled intake path.
5. Monitor the customer journey manually.
6. Confirm case creation / case access.
7. Confirm receipt / verification status only within the supported authority boundaries.
8. Record any deviation as a new LR blocker or candidate.
9. Stop expansion if a runtime, payment, receipt, verification, or trust issue appears.
10. After the first-customer run, create a follow-up customer evidence / launch observation record.

## Acceptance Criteria

- LR11 and LR12 commits referenced.
- Controlled launch mode stated.
- First-customer outreach boundary stated.
- Manual monitoring requirement stated.
- Stop lines stated.
- Non-claims stated.
- Supabase Storage exclusion stated.
- Next action selected.

## Validation

Commands / checks run:

```powershell
git status --short
git log --oneline --decorate -5
.\scripts\release-check.ps1
```

Result:

- `git status --short`: showed only this untracked LR13 record.
- `git log --oneline --decorate -5`: confirmed `HEAD -> master, origin/master, origin/HEAD` at `9012a69` and included LR11 commit `432e993`.
- `.\scripts\release-check.ps1`: stopped during frontend build with Vite `spawn EPERM`; safe-to-commit portion passed 3 / warn 0 / fail 0 before the frontend build failure. The script then emitted a PowerShell attribution error because `Write-FailureAttributionForStep` received an empty `FailureDetail`.
- Final LR13 validation result: BLOCKED by environment/tooling execution failure during release-check frontend build, not by an LR13 runtime code change.

## Risk / Stop Line

- Do not convert controlled first-customer readiness into public launch readiness.
- Do not claim unrestricted customer onboarding.
- Do not claim Supabase Storage readiness.
- Do not claim payment provider production coverage beyond the current verified boundary.
- Do not claim receipt PDF delivery / storage readiness unless separately proven.
- Any first-customer failure or unexpected behavior must become a new LR blocker / candidate record before expansion.

## Next Action

- Proceed to LR14 first-customer outreach message / controlled customer intake package, or run the first controlled outreach manually and record the result.
