# Nimclea Receipt Readiness UI Smoke 15-A1 v0.1

Status: NOT RUN

## 1. Purpose

Define a manual smoke test for Receipt readiness UI behavior after golden case and release gate alignment.

This checklist verifies that ReceiptPage readiness display remains stable when driven by backend-owned case state, readiness scoring, event capture evidence, hydration/loading behavior, Cases detail routing, and Verification unlock dependencies.

## 2. Scope

This smoke covers:

- ReceiptPage readiness display.
- Backend-fed `receiptEligible` state.
- Event capture dependency.
- Score dependency.
- Hydration/loading behavior.
- Cases -> Detail -> Receipt routing consistency.
- Verification unlock dependency.

## 3. Non-scope

- No code change.
- No scoring rule change.
- No payment change.
- No Stripe smoke.
- No webhook test.
- No Playwright or automated browser test.
- No new backend endpoint.

## 4. Smoke Scenarios

| ID | Scenario | Test data / setup | Steps | Expected result | Actual result | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| RUI-001 | Receipt opens while backend state is hydrating | Existing case with ReceiptPage route available; throttle network if useful. | Open ReceiptPage directly with `caseId`; observe initial load before backend response completes. | Show checking/loading state; no transient red failure state. |  | NOT RUN | Watch for early fallback/local state rendering. |
| RUI-002 | Case has no captured real event | Not-ready case with no trusted captured event. | Open ReceiptPage; review readiness explanation and state. | Receipt not ready; UI should explain event/evidence requirement. |  | NOT RUN | Event count alone must not be invented by local state. |
| RUI-003 | Case has captured event but readiness score is below threshold | Case with at least one event but incomplete evidence/structure/continuity/formability. | Open ReceiptPage; confirm score/readiness state. | Receipt not ready; UI should not show formal ready/green state. |  | NOT RUN | Use a case expected to remain below readiness threshold. |
| RUI-004 | Case has captured event and readiness score >= 3.0 | Ready case with trusted evidence event and passing readiness inputs. | Open ReceiptPage; confirm readiness display. | Receipt ready/green state is shown. |  | NOT RUN | Compare against backend-owned ready fields when present. |
| RUI-005 | Receipt ready state persists after refresh | Same ready case as RUI-004. | Refresh ReceiptPage; wait for hydration to complete. | Refreshed ReceiptPage reads backend-owned state and remains consistent. |  | NOT RUN | Confirm no downgrade after reload. |
| RUI-006 | Cases page Detail routes to Receipt | Eligible or in-progress receipt case visible on `/cases`. | Open `/cases`; click Detail for the case. | Detail opens ReceiptPage for eligible or in-progress receipt cases. |  | NOT RUN | Confirm resulting URL includes the same `caseId`. |
| RUI-007 | Verification remains locked before receipt is issued/eligible | Case without backend-owned receipt eligible/issued/payment state. | Attempt to navigate from ReceiptPage to Verification; open VerificationPage if reachable. | VerificationPage does not unlock from frontend-only assumptions. |  | NOT RUN | Subscription-only or route-state-only data must not unlock verification. |
| RUI-008 | Receipt ready case does not regress to insufficient state during hydration | Backend-ready receipt case; throttle network if useful. | Open ReceiptPage from a cold browser state and observe until hydration completes. | No red-to-green flash after backend response arrives. |  | NOT RUN | Specifically watch for insufficient/failed flicker before backend case loads. |

## 5. 15-A1 PASS Criteria

PASS only if:

- Receipt readiness depends on backend-owned case state.
- Event requirement is visible and stable.
- Score threshold behavior is visible and stable.
- Ready state persists after page refresh.
- No loading-time red/failed flicker is observed.
- Verification is not unlocked prematurely.
- Cases -> Detail -> Receipt path shows the same readiness state.

## 6. Current Expected Status

Status: NOT RUN

This document defines the smoke checkpoint. Actual browser execution should be recorded after testing with one not-ready case and one ready case.

