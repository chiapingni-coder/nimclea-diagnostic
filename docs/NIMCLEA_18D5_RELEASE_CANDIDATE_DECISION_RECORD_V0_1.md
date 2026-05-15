# Nimclea 18-D5 Release Candidate Decision Record v0.1

## Purpose

Record the release candidate decision after 12-A / 12-B and 18-D4.

## Inputs

- 12-A Scope Lock: docs/NIMCLEA_SCOPE_LOCK_V0_1.md
- 12-B Acceptance Checklist: docs/NIMCLEA_ACCEPTANCE_CHECKLIST_V0_1.md
- 18-D4 Manual Production Smoke Execution Record: docs/NIMCLEA_18D4_MANUAL_PRODUCTION_SMOKE_EXECUTION_RECORD_V0_1.md
- Latest release gate result: PASS 27 / WARN 5 / FAIL 0, Final result: WARN
- Working tree clean

## Gate result

| Area | Result | Notes |
| --- | --- | --- |
| Automated release gate | PASS 27 / WARN 5 / FAIL 0 | Final result is WARN because 5 areas are manual-only release areas. |
| Automated guards | Passed | All automated guards passed. |
| Automated FAIL count | 0 FAIL | No automated release gate failure is present. |
| Manual WARN areas | 5 WARN | Covered by 18-D4 manual observations and stop lines. |
| Working tree | Clean | Recorded as clean at decision time. |

## Manual WARN disposition

| WARN area | 18-D4 disposition | RC impact |
| --- | --- | --- |
| receipt readiness UI smoke | Manual accepted; no yellow flash reproduced. | Does not block RC unless a receipt readiness stop-line failure is reproduced. |
| verification unlock UI smoke | Manual accepted; Verification is reachable only from Receipt authority. | Does not block RC unless Verification opens without Receipt authority or stays locked after eligibility. |
| payment ledger / Stripe dry-run smoke | Implemented / live settlement not executed. | Does not block RC if payment is documented as implementation-ready but live-settlement-unverified. |
| new vs returning user routing smoke | Manual accepted; new user routes to Diagnostic and returning customer remains on CasesPage. | Does not block RC unless entry routing regresses. |
| stale local case naming smoke | Manual accepted; no current case-name confusion reproduced. | Does not block RC unless stale naming creates case identity ambiguity. |

## Payment status

Payment implementation exists.
Live settlement has not been executed.
This does not block RC, but blocks any claim of full live payment production validation.

## Release candidate decision

Decision: RC ELIGIBLE

Nimclea is eligible for Release Candidate status.
RC status is allowed with payment documented as implementation-ready but live-settlement-unverified.
Nimclea is not eligible to claim full live payment production validation until a real production payment or approved production-equivalent payment test is completed.

## Stop lines after RC

- Any reproduced receipt readiness yellow flash before authoritative readiness.
- Verification reachable without Receipt authority.
- Payment state crossing cases or unlocking unrelated records.
- New/returning user routing regression.
- Stale local case name overriding backend case identity.
- Any automated release gate FAIL.

## Validation

Required validation:

```powershell
git diff --check -- docs/NIMCLEA_18D5_RELEASE_CANDIDATE_DECISION_RECORD_V0_1.md
git status --short
```
