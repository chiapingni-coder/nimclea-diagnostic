# Nimclea 18-D6 RC Release Note and Tag Decision v0.1

## Purpose

Record the release note and tag decision after 18-D5 confirmed RC eligibility.

## Current RC status

- Decision: RC ELIGIBLE
- Automated release gate has 0 FAIL
- Latest gate result: PASS 27 / WARN 5 / FAIL 0
- Final result: WARN
- Working tree clean
- Manual WARN areas are documented by 18-D4
- Payment implementation exists
- Live payment settlement remains unverified

## Release scope

- Diagnostic flow
- CasesPage routing
- Case identity preservation
- Receipt readiness guards
- Receipt to Verification authority boundary
- 7-day trial lifecycle contracts and guards
- Backend case aggregation smoke
- Release acceptance checklist and scope lock

## Explicitly not claimed

- Full live-money payment production validation
- Full Stripe settlement validation
- Any guarantee that future UI changes cannot reintroduce regressions
- Any feature outside current Scope Lock and Acceptance Checklist

## Known RC warnings

| Warning area | Status | RC impact | Stop line reference |
| --- | --- | --- | --- |
| Receipt readiness UI smoke | Manual WARN documented by 18-D4 | Does not block RC unless reproduced. | STOP if Receipt flashes yellow, amber, insufficient, or misleading gray before confirmed ready. |
| Verification unlock UI smoke | Manual WARN documented by 18-D4 | Does not block RC unless reproduced. | STOP if Verification opens without Receipt authority or remains locked after confirmed eligibility. |
| Payment ledger / Stripe dry-run smoke | Implemented; live settlement not executed | Does not block RC, but blocks full live payment validation claim. | STOP if paid, checkout, receipt-issued, or verification state crosses cases, disappears, or unlocks unrelated records. |
| New vs returning user routing smoke | Manual WARN documented by 18-D4 | Does not block RC unless reproduced. | STOP if a known returning user is sent to Diagnostic before case lookup settles, or a new user is sent to workspace incorrectly. |
| Stale local case naming smoke | Manual WARN documented by 18-D4 | Does not block RC unless reproduced. | STOP if stale local naming creates ambiguity about which case is active, payable, receipted, verified, or exported. |

## Tag decision

- Git tag is not created in this step.
- Recommended next tag, if chosen after final review: `rc-0.1.0`
- Tag should only be created after this document is committed and one final clean gate run is recorded.

## Recommended release note summary

Nimclea is eligible for Release Candidate status with automated release gate result PASS 27 / WARN 5 / FAIL 0 and no automated FAIL items. This RC covers the protected diagnostic-to-cases-to-receipt-to-verification path, including case identity preservation, receipt readiness visual gating, trial lifecycle guards, backend case aggregation smoke, and release acceptance documentation. Payment implementation exists, but full live-money payment and Stripe settlement validation are not claimed until a real production payment or approved production-equivalent payment test is completed.

## Validation

Required validation:

```powershell
git diff --check -- docs/NIMCLEA_18D6_RC_RELEASE_NOTE_AND_TAG_DECISION_V0_1.md
git status --short
```
