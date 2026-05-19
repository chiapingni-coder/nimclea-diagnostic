# LR14 FIRST CUSTOMER OUTREACH MESSAGE CONTROLLED INTAKE PACKAGE RECORD

## Record ID

NIMCLEA_LR14_FIRST_CUSTOMER_OUTREACH_MESSAGE_CONTROLLED_INTAKE_PACKAGE_RECORD_V0_1

## Date

2026-05-19

## Purpose

This record documents the LR14 documentation-only first-customer outreach message and controlled customer intake package after LR13.

LR14 converts the LR13 first-customer launch runbook / outreach readiness state into an actual safe outreach package. It does not send customer outreach, change runtime behavior, expand payment provider support, add Supabase Storage, or make an unrestricted public launch claim.

## Scope

- Area: First-customer outreach message and controlled customer intake package.
- Files inspected: LR11 smoke evidence, LR12 launch-readiness closure, LR13 first-customer runbook, release-check output, git status/log evidence.
- Files changed: this LR14 record only.
- Runtime behavior affected: none.

## Decision / Change Summary

- Nimclea may prepare a controlled first-customer outreach package.
- The message frames Nimclea as a controlled diagnostic / guided pilot-ready product, not a broad public launch.
- The outreach should be personal, narrow, and honest about controlled scope.
- The customer intake should be manually monitored.
- Any unexpected behavior must become a new LR blocker/candidate before expansion.
- Supabase Storage remains excluded.

Known prior state:

- LR11 completed controlled end-to-end golden customer smoke.
- LR11 commit: `432e993` "Add LR11 controlled end-to-end golden customer smoke".
- LR12 completed controlled launch readiness closure / claim boundary.
- LR12 commit: `9012a69` "Add LR12 controlled launch readiness closure".
- LR13 completed first-customer launch runbook / outreach readiness.
- LR13 commit: `0f58672` "Add LR13 first customer launch runbook outreach readiness".
- LR13 release-check result: PASS 231 / WARN 5 / FAIL 0.
- Final result: WARN.
- GitHub master aligned at `0f58672`.
- Render alive PASS.
- Supabase Storage is not included.

## Controlled Outreach Message Draft

Subject:

A small controlled Nimclea diagnostic pilot

Body:

Hi [Name],

I'm opening a very small controlled first-customer pilot for Nimclea, a diagnostic workflow that helps turn a customer situation into a structured case, receipt, and verification path.

This is not a broad public launch yet. I'm keeping the first run intentionally narrow so I can monitor the experience closely, catch any issue quickly, and make sure the result is understandable and useful.

For this first pilot, the goal is simple:

- complete the diagnostic flow,
- create or review the customer case,
- confirm the receipt / verification readiness path where applicable,
- and gather feedback on whether the output feels clear, trustworthy, and useful.

If anything looks off, I'll pause expansion and fix it before inviting more users.

Would you be open to being one of the first controlled users?

Thank you,
Pingni

## Controlled Intake Package

1. Confirm the recipient is a good fit for the current supported diagnostic use case.
2. Confirm this is a guided controlled pilot, not a public self-serve launch.
3. Share only the current supported access path.
4. Monitor the user's first journey manually.
5. Check whether case access works as expected.
6. Check whether receipt and verification status remain within the supported authority boundaries.
7. Record feedback, friction, or unexpected behavior.
8. Stop expansion if any issue appears.
9. Convert any issue into a new LR blocker/candidate record.
10. If no issue appears, proceed to first-customer observation / evidence record.

## Supported Claims

- Nimclea has completed controlled golden-customer smoke evidence.
- Nimclea has a controlled launch-readiness boundary.
- Nimclea is ready for a guided first-customer pilot.
- The first-customer path should be manually monitored.

## Non-Claims

- Not a broad public launch.
- Not unrestricted customer onboarding.
- Not automated scale readiness.
- Not Supabase Storage readiness.
- Not storage-backed PDF delivery readiness.
- Not a guarantee of all payment-provider production behavior.
- Not a claim that every customer situation is supported.

## Acceptance Criteria

- LR11, LR12, and LR13 commits referenced.
- Controlled outreach message included.
- Controlled intake package included.
- Supported claims included.
- Non-claims included.
- Manual monitoring requirement stated.
- Stop lines stated.
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

- `git status --short`: target LR14 record is untracked.
- `git log --oneline --decorate -5`: HEAD is `0f58672` on `master` / `origin/master`; LR13, LR12, and LR11 commits are visible in the last five commits.
- `.\scripts\release-check.ps1`: did not complete; safe-to-commit portion passed 3 / warned 0 / failed 0, then frontend build failed with Vite `spawn EPERM`. The PowerShell failure attribution helper then errored because it received an empty `FailureDetail`.

## Risk / Stop Line

- Do not send the outreach before reviewing the message and intended recipient.
- Do not describe Nimclea as broadly launched.
- Do not claim unrestricted public readiness.
- Do not claim Supabase Storage readiness.
- Do not claim receipt PDF storage/delivery readiness unless separately proven.
- Any customer-facing issue must become a new LR blocker/candidate before further outreach.

## Next Action

- Proceed to LR15 first-customer manual launch observation / evidence record after the first controlled outreach is reviewed and, if approved, used with one real recipient.
