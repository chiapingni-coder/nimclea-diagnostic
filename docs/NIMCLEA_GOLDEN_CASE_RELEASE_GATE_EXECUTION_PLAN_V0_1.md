# Nimclea Golden Case Release Gate Execution Plan v0.1

Status date: 2026-05-12

Scope: 14-D0 plan plus 14-D1 script status. This document defines how the Golden Case release gate should become runnable without changing application behavior.

References:

- `docs/NIMCLEA_RELEASE_GATE_ALIGNMENT_V0_1.md`
- `docs/NIMCLEA_GOLDEN_TEST_CASES_V0_1.md`
- `docs/NIMCLEA_GOLDEN_TEST_SMOKE_CHECK_V0_1.md`
- `docs/NIMCLEA_GOLDEN_TEST_EXECUTION_PLAN_V0_1.md`
- `docs/NIMCLEA_READINESS_SCORING_RULE_TABLE_V0_1.md`
- `docs/NIMCLEA_DEVELOPMENT_RELEASE_CHECKLIST_V0_1.md`

## 1. Purpose Of The Runnable Release Gate

The runnable release gate should collect the current Golden Case smoke checks and the 14-B release gate risk areas into one read-only command.

The first version should not change production code, application behavior, routes, scoring, payment behavior, UI behavior, data files, or runtime fixtures. It should only inspect existing helper-level smoke checks and report which release risks are passing, warning-only, failing, or still manual.

The release gate should make the current pre-release question explicit:

Are main lifecycle, backend `/cases` aggregation, receipt readiness, verification unlock, payment ledger smoke readiness, routing risks, and stale local case naming risk covered by runnable checks or consciously deferred?

## 2. PASS / WARN / FAIL Meaning

| Result | Meaning | Release effect |
| --- | --- | --- |
| PASS | The check is runnable and the expected behavior is confirmed by an existing helper, smoke check, or deterministic assertion. | Can count as release-gate evidence for that risk area. |
| WARN | The check is partially covered, manual-only, dry-run-only, or intentionally documents a known ambiguity. | Must be reviewed before release; may be accepted only with explicit deferral. |
| FAIL | A runnable check reports behavior outside the documented Golden Case or release gate expectation. | Blocks release until fixed or the documented contract is intentionally changed. |

WARN must not be treated as PASS. It is a visible hold point for risks that are known but not yet runnable, such as real Stripe smoke, browser hydration, visual UI behavior, or stale localStorage behavior.

## 3. Golden Cases To Include First

The first runnable release gate should include the Golden Cases already closest to deterministic or helper-level validation.

| Priority | Golden Case | Release risk covered | Initial gate result type |
| --- | --- | --- | --- |
| 1 | GTC-001 Diagnostic Only Case | Main lifecycle; routing/status interpretation baseline | WARN until list-state or manual route check is runnable |
| 2 | GTC-002 Event Captured But Not Receipt Ready | Receipt readiness; event capture does not equal readiness | PASS via existing readiness smoke |
| 3 | GTC-003 Insufficient Evidence Case | Receipt readiness hard gate | PASS via existing readiness smoke |
| 4 | GTC-004 Pending Review Case | Receipt readiness non-green state | PASS via existing readiness smoke |
| 5 | GTC-005 Receipt Ready Green Case | Main receipt-ready happy path | PASS via existing readiness smoke; WARN for UI hydration until manual/browser check exists |
| 6 | GTC-006 Broken Evidence Chain Case | Receipt readiness fail/blocker behavior | PASS via existing readiness smoke |
| 7 | GTC-007 Backend Receipt Ready Precedence Case | Backend-owned readiness precedence | PASS via existing lifecycle helper smoke |
| 8 | GTC-008 Fallback Snapshot Must Not Upgrade Case | Stale local/snapshot data risk | PASS via existing lifecycle helper smoke; WARN for browser localStorage coverage |
| 9 | GTC-009 Paid But Not Evidence-Ready Case | Payment does not create evidence readiness | PASS for scoring boundary; WARN for live payment state |
| 10 | GTC-010 Verification Ready Case | Verification status contract | PASS via existing verification contract smoke |
| 11 | GTC-011 Verification Warning Case | Verification warning does not become ready | PASS via existing verification contract smoke |
| 12 | GTC-012 Verification Failed Case | Verification failed dominates warning/ready | PASS via existing verification contract smoke |
| 13 | GTC-013 Access-Mode Verification Fallback Case | Verification unlock ambiguity | WARN because current behavior is a known mixed access/eligibility fallback |
| 14 | GTC-014 Threshold Mismatch Sentinel Case | Scoring threshold ambiguity | WARN unless explicitly asserted as known mismatch |
| 15 | GTC-015 Case Ordering / Record Selection Case | Backend `/cases` aggregation | PASS via existing backend aggregation smoke; WARN for live route/API coverage |

## 4. Existing Smoke Checks To Reuse

The future release gate should call or wrap existing checks first instead of duplicating logic.

| Existing check | Current command or document | Reuse in release gate |
| --- | --- | --- |
| Golden readiness smoke | `npm run check:golden` / `docs/NIMCLEA_GOLDEN_TEST_SMOKE_CHECK_V0_1.md` | Reuse for GTC-002 through GTC-014 helper-level readiness, verification, access-mode, and threshold checks. |
| Backend aggregation smoke | Included in `npm run check:golden` as the companion backend aggregation smoke | Reuse for GTC-015 helper-level aggregation and route-shaped in-memory aggregation sentinel. |
| Golden execution matrix | `docs/NIMCLEA_GOLDEN_TEST_EXECUTION_PLAN_V0_1.md` | Use as the mapping from Golden Case IDs to layers and future automation scope. |
| Readiness/scoring rule table | `docs/NIMCLEA_READINESS_SCORING_RULE_TABLE_V0_1.md` | Use as the baseline for PASS/FAIL expectations. |
| Development release checklist | `docs/NIMCLEA_DEVELOPMENT_RELEASE_CHECKLIST_V0_1.md` | Use as the operator workflow that consumes the release gate result. |
| Release gate alignment | `docs/NIMCLEA_RELEASE_GATE_ALIGNMENT_V0_1.md` | Use as the risk list that the release gate must report against. |

## 5. Checks Still Manual

These checks should appear in the future release gate output as WARN/manual until a runnable script or smoke harness exists.

| Manual check | Why it remains manual now | Expected release-gate display |
| --- | --- | --- |
| Browser receipt hydration / no false flash | Requires page rendering and hydration timing observation. | WARN manual: receipt hydration/no-flash not runnable yet. |
| `/cases` live route/API aggregation | Current aggregation smoke is in-memory and helper-level, not live API. | WARN manual: live `/cases` route/API coverage not included. |
| Real Stripe payment smoke | Requires controlled Stripe checkout, confirmation, webhook, and ledger verification. | WARN manual or FAIL if release requires live payment proof. |
| New user vs returning user routing | Requires browser/session state and user journey validation. | WARN manual: first-time and returning routing not runnable yet. |
| Stale local case naming/localStorage risk | Requires browser localStorage and route-state scenarios. | WARN manual: stale local case naming not runnable yet. |
| UI visual regression | Requires browser screenshots or manual visual check. | WARN manual: visual UI check not included. |

## 6. Proposed Future Script

Script name:

```text
scripts/check-release-gate.mjs
```

Command:

```powershell
node scripts/check-release-gate.mjs
```

14-D1 created the first read-only version of this script. It runs existing local Golden Case checks when available, verifies required release-gate documents exist, and reports manual-only release areas as WARN. It should not write fixture files, mutate localStorage, start servers, call live Stripe, change data files, or modify application state.

## 7. Minimum Gate Coverage

| Coverage area | First runnable target | Initial status expectation |
| --- | --- | --- |
| Main lifecycle | GTC-001 plus lifecycle portions of GTC-005, GTC-007, and GTC-015 | PASS for helper-covered pieces; WARN for list UI/manual routing |
| Backend `/cases` aggregation | GTC-015 backend aggregation smoke and route-shaped in-memory sentinel | PASS if existing backend aggregation smoke passes; WARN for live API |
| Receipt readiness | GTC-002 through GTC-008 plus GTC-014 threshold sentinel | PASS for deterministic/helper checks; WARN for hydration/no-flash |
| Verification unlock | GTC-010 through GTC-013 | PASS for contract labels; WARN for access-mode ambiguity and paid formal verification matrix |
| Payment ledger smoke readiness | GTC-009 plus existing payment audit docs | WARN until real Stripe smoke and ledger confirmation are runnable |
| Routing risks | GTC-001, GTC-005, GTC-007, GTC-015 and release gate routing rows | WARN until route/browser check exists |
| Stale local case naming risk | GTC-008 plus release gate case naming rows | WARN until stale localStorage/name-priority check exists |

The minimum release gate should report every area above even when the result is WARN/manual. Silent omission should count as a release-gate failure.

## 8. Proposed Output Shape

The future script should print a compact table:

```text
Nimclea release gate v0.1

PASS main lifecycle helper checks
PASS backend aggregation helper smoke
PASS receipt readiness deterministic checks
WARN receipt hydration/no-flash remains manual
PASS verification contract checks
WARN verification unlock payment matrix remains manual
WARN payment ledger / real Stripe smoke remains manual
WARN routing risks remain manual
WARN stale local case naming risk remains manual

Summary: PASS 4 / WARN 5 / FAIL 0
Exit: 0 only when there are no FAIL results
```

WARN results should keep exit code `0` in the first read-only version so the script can be introduced without changing the current release process. A later 14-E launch checklist can decide which WARN items become release blockers.

## 9. Recommended Next Step

14-D1 should create the first read-only release gate script:

```text
scripts/check-release-gate.mjs
```

The script should call or mirror the existing Golden Case smoke results, print the release risk table, mark non-runnable launch risks as WARN/manual, and avoid any application behavior changes.

## 10. No Application Code Changed

14-D0 was documentation only. 14-D1 adds `scripts/check-release-gate.mjs` as a read-only local gate wrapper.

No frontend code changed.
No backend code changed.
No routes changed.
No scoring changed.
No payment behavior changed.
No UI behavior changed.
No tests changed.
