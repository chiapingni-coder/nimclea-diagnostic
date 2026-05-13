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
| Receipt readiness UI | 85%-90% | Main ready/not-ready display is mostly stable. |
| Event captured display | 85%-90% | Event state is visible but should be checked after Quick Capture refresh. |
| Score gating display | 80%-88% | Threshold-driven labels need manual confirmation across below/above-ready cases. |
| Hydration/loading protection | 75%-82% | Loading guards exist, but backend hydration flash risk remains. |
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
| `receiptEligible` true but Cases page status not aligned | Medium | Cases and ReceiptPage may disagree about readiness. |
| Yellow state CTA copy regression | Medium | A not-ready case can show confusing action copy. |
| Green state button/label regression | Medium | Ready cases can lose clear formal-ready messaging. |
| Legacy case with incomplete `receiptRecords` | High | Older records may miss fields current UI expects for stable readiness display. |
| Payment CTA appearing too early | High | Payment visibility can imply readiness or activation before the receipt is ready. |
| Deep link into ReceiptPage without full case context | Medium | Direct links can start from incomplete route state and rely on hydration correctness. |

## 5. Smoke Checklist

| ID | Manual smoke case | Expected focus | Status |
| --- | --- | --- | --- |
| 15A-RUI-001 | New case with no event | ReceiptPage shows not-ready state and explains event/evidence requirement. | NOT RUN |
| 15A-RUI-002 | New case after one Quick Capture event | Event captured state appears and readiness updates without full page confusion. | NOT RUN |
| 15A-RUI-003 | Case with score below readiness threshold | UI stays yellow/not-ready and does not show green/formal-ready state. | NOT RUN |
| 15A-RUI-004 | Case with score above readiness threshold | UI shows green/ready state and stable ready label. | NOT RUN |
| 15A-RUI-005 | Refresh ReceiptPage directly | Backend-owned receipt state survives refresh without red/failed flicker. | NOT RUN |
| 15A-RUI-006 | Enter ReceiptPage from Cases Detail | Detail opens the correct ReceiptPage and preserves the same case readiness state. | NOT RUN |
| 15A-RUI-007 | Return from ReceiptPage to Cases | Cases page status remains aligned with ReceiptPage status. | NOT RUN |
| 15A-RUI-008 | Old case with missing receipt record | UI avoids false green, false red, or broken display while using fallback context. | NOT RUN |
| 15A-RUI-009 | Paid/checkout-created case without real receipt activation | Payment CTA visibility does not imply real receipt activation or readiness. | NOT RUN |

## 6. Done Definition

15-A is done when this document exists and clearly separates:

- What is stable.
- What is risky.
- What is excluded.
- What should be tested in 15-B.

## 7. Recommended Next Step

15-B: run manual Receipt readiness UI smoke using this checklist.

15-C: patch only confirmed Receipt readiness UI regressions.

15-D: convert stable checks into golden regression coverage.

## 8. No Code Changed

This 15-A checkpoint is documentation only.

No frontend code changed.
No backend code changed.
No routes changed.
No scripts changed.
No tests changed.

