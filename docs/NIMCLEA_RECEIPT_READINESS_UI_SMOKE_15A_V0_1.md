# Nimclea Receipt Readiness UI Smoke 15-A v0.1

## 1. Purpose

15-A is a scoped smoke checkpoint for Receipt readiness UI after the broader 14-A progress and risk map.

This document focuses only on the Receipt readiness UI surface: what looks stable, what remains risky, what is excluded, and what should be manually tested next.

## 2. Scope

Covered:

- ReceiptPage readiness display.
- Event captured state.
- Score/readiness gating.
- `receiptEligible` display.
- Yellow / warning states.
- Green / ready states.
- Quick Capture refresh behavior.
- Detail -> ReceiptPage flow.
- Payment CTA visibility only as a non-real-payment smoke item.

Explicitly excluded:

- Real Stripe payment.
- Backend aggregation extraction.
- Verification full payment flow.
- Broad launch readiness.

## 3. Current Progress Snapshot

| Area | Approx. completion | Notes |
| --- | ---: | --- |
| Receipt readiness UI | 86%-91% | Main not-ready display passed 15-A2 after FIX1; 15-A3/15-A4 completed contract and guard coverage for readiness transition rules. |
| Event captured display | 85%-90% | Event state is visible but should be checked after Quick Capture refresh. |
| Score gating display | 80%-88% | Threshold-driven labels need manual confirmation across below/above-ready cases. |
| Hydration/loading protection | 78%-84% | Contract-level guard now records that hydration must not show insufficient/failure before backend readiness is known; runtime smoke remains pending. |
| Quick Capture refresh behavior | 75%-85% | Needs manual check that new event state appears without stale display. |
| Detail -> Receipt routing | 90%-95% | Routing is documented as repaired but should remain in smoke coverage. |
| Payment CTA smoke visibility | 65%-75% | Only visibility is in scope; real payment is excluded. |
| Legacy case compatibility | 60%-70% | Older cases with incomplete receipt records remain the highest compatibility risk. |

## 4. Risk Map

| Risk | Severity | Why it matters |
| --- | --- | --- |
| Hydration flash before backend receipt status loads | High | Ready cases may briefly show failed/insufficient state before backend truth arrives. |
| Stale localStorage case data overriding backend state | High | Local fallback state can misclassify a backend-ready or backend-not-ready receipt. |
| Event captured but UI not refreshing immediately | Medium | Quick Capture may succeed while ReceiptPage still displays old readiness state. |
| `receiptEligible` true but Cases page status not aligned | Medium-Low | 15-A3 locks that `/cases` and `/case/:caseId` should converge on receipt readiness; runtime validation remains pending. |
| Yellow state CTA copy regression | Medium | A not-ready case can show confusing action copy. |
| Green state button/label regression | Medium | Ready cases can lose clear formal-ready messaging. |
| Legacy case with incomplete `receiptRecords` | High | Older records may miss fields current UI expects for stable readiness display. |
| Legacy case marked ready without real events | High | Inconsistent legacy records with `receiptEligible` true / `receipt_ready` but `eventCount` 0 and no real events are legacy-risk samples, not valid ready-case smoke samples. |
| Payment CTA appearing too early | High | Payment visibility can imply readiness or activation before the receipt is ready. |
| Deep link into ReceiptPage without full case context | Medium | Direct links can start from incomplete route state and rely on hydration correctness. |
| Readiness downgrade after `checkout_created` | Medium-Low | 15-A3 states `checkout_created` must not downgrade `receipt_ready`; 15-A4 guards the contract text, but live fixture behavior still needs later smoke coverage. |
| `paymentStatus` or `paid=false` misread as readiness | Medium-Low | 15-A3 separates `receiptEligible`, `paymentStatus`, and `paid`; paid-flow runtime validation remains outside 15-A. |

## 5. Smoke Checklist

| ID | Manual smoke case | Expected focus | Status |
| --- | --- | --- | --- |
| 15A-RUI-001 | New case with no event | ReceiptPage shows not-ready state and explains event/evidence requirement. | PASS in 15-A2 |
| 15A-RUI-002 | No captured evidence event | No captured evidence event keeps Receipt not ready. | PASS in 15-A2 |
| 15A-RUI-003 | Case with score below readiness threshold | UI stays yellow/not-ready and does not show green/formal-ready state. | NOT RUN |
| 15A-RUI-004 | Case with score above readiness threshold | UI shows green/ready state and stable ready label. | NOT RUN |
| 15A-RUI-005 | Refresh ReceiptPage directly | Backend-owned receipt state survives refresh without red/failed flicker. | NOT RUN |
| 15A-RUI-006 | Enter ReceiptPage from Cases Detail | Detail opens the correct ReceiptPage and preserves the same case readiness state. | NOT RUN |
| 15A-RUI-007 | Yellow Receipt opens locked Verification | Not-ready Receipt can navigate to VerificationPage without issuing or unlocking verification. | PASS after FIX1 |
| 15A-RUI-008 | Ready case persistence/flicker | Ready-case state persists and avoids insufficient-state flicker during hydration. | NOT RUN / pending |
| 15A-RUI-009 | Paid/checkout-created case without real receipt activation | Payment CTA visibility does not imply real receipt activation or readiness. | NOT RUN |

## 6. Done Definition

15-A is done when this document exists and clearly separates:

- What is stable.
- What is risky.
- What is excluded.
- What should be tested in 15-B.

## 7. Recommended Next Step

15-A2 ready branch remains pending.

Next possible step: 15-A6 or later can add a runtime smoke for receipt readiness behavior using fixture/mock case records, but only after the contract-level guard remains stable.

A manual ready-case Receipt UI smoke is still useful when a clean ready case with real evidence event is available.

15-B: continue manual Receipt readiness UI smoke using this checklist.

15-C: patch only confirmed Receipt readiness UI regressions.

15-D: convert stable checks into golden regression coverage.

## 8. No Implementation Changed By This Documentation Update

This result update is documentation only.

No frontend code changed.
No backend code changed.
No routes changed.
No scripts changed by this documentation update.
No tests changed.

## 9. 15-A2 Actual Result

Result: 15-A2-NOTREADY: PASS after FIX1

Tested sample:

- Case ID: `CASE-1778651779384-STDNBU`
- Email: `chiapingni+15a2notready@gmail.com`
- Sample type: clean not-ready Receipt sample.
- No Quick Capture evidence event was used for readiness.

Backend state before UI smoke:

- `status`: `diagnostic_completed`
- `stage`: `result`
- `currentStep`: `result`
- `receiptEligible`: `false`
- `verificationEligible`: `false`

Actual UI result:

- Receipt page displayed yellow / insufficient record state.
- Receipt did not show green ready state.
- Receipt did not prematurely issue or unlock verification.
- Receipt CTA label after FIX1: `Verification`.
- Clicking `Verification` opened the Verification page with the same `caseId`.
- Verification page showed locked / not issuable state:
  - `FORMAL VERIFICATION NOT YET ISSUABLE`
  - `Formal verification is not active yet`
- Verification page did not show issued, passed, verified, or active verification state.

Smoke checklist mapping:

- RUI-001: PASS, no red/green readiness flicker observed during this not-ready test.
- RUI-002: PASS, no captured evidence event kept Receipt not ready.
- RUI-007: PASS after FIX1, yellow Receipt can open locked Verification page.
- RUI-008: NOT RUN in this sample, ready-case persistence/flicker still pending.
- Ready-case branch: NOT RUN / pending.

Regression guards added:

- `scripts/check-receipt-verification-contract.mjs`
  Purpose: prevents yellow Receipt CTA from regressing back to Pilot Result or long/confusing labels.
- `scripts/check-verification-locked-contract.mjs`
  Purpose: prevents Verification page from treating access as issued/passed/verified status.
- `scripts/check-release-gate.mjs` now includes both:
  - `receipt verification access contract`
  - `verification locked page contract`

Release gate status:

- Latest guard validation passed.
- Release gate has FAIL 0.
- Final result may remain WARN because some UI smoke areas are still manual-only.

Final current status:

- 15-A2 not-ready branch is complete.
- 15-A2 ready branch remains pending.

## 10. 15-A3 and 15-A4 Progress Update

### 15-A3: Receipt readiness transition contract

Status: Completed

Nature: Documentation-only contract

Artifact:

- `docs/NIMCLEA_RECEIPT_READINESS_TRANSITION_CONTRACT_V0_1.md`

What it locked:

- Receipt readiness should not be downgraded by checkout/payment states.
- `receiptEligible` and `paymentStatus` are separate concepts.
- `checkout_created` must not overwrite `receipt_ready`.
- `paid=false` must not imply `receiptEligible=false`.
- Hydration/loading should not briefly display failure before backend readiness is known.
- `/cases` and `/case/:caseId` should converge on the same readiness interpretation.

### 15-A4: Receipt readiness transition smoke guard

Status: Completed

Nature: Regression smoke guard

What it added:

- `scripts/check-receipt-readiness-transition-contract.mjs`
- Release gate integration in `scripts/check-release-gate.mjs`

Validation:

- Contract smoke passed 28/28.
- Release gate final result WARN, FAIL 0 after known sandbox `spawnSync node EPERM`.
- `git diff --check` passed.

Remaining risks:

- The guard currently validates the contract text, not live backend behavior.
- A future runtime smoke may still be needed to create or simulate actual case records.
- Receipt readiness, payment activation, and verification unlock still need end-to-end paid-flow validation later.
- Stripe real-payment behavior is still outside the current 15-A scope.
