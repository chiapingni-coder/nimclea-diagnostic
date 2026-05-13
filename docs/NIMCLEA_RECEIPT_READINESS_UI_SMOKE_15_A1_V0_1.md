# Nimclea Receipt Readiness UI Smoke 15-A1 v0.1

Status: PARTIAL PASS

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
| RUI-001 | Receipt opens while backend state is hydrating | Existing case with ReceiptPage route available; throttle network if useful. | Open ReceiptPage directly with `caseId`; observe initial load before backend response completes. | Show checking/loading state; no transient red failure state. | No red/green readiness flicker observed during this not-ready test. | PASS | Watch for early fallback/local state rendering. |
| RUI-002 | Case has no captured real event | Not-ready case with no trusted captured event. | Open ReceiptPage; review readiness explanation and state. | Receipt not ready; UI should explain event/evidence requirement. | No captured evidence event kept Receipt not ready. | PASS | Event count alone must not be invented by local state. |
| RUI-003 | Case has captured event but readiness score is below threshold | Case with at least one event but incomplete evidence/structure/continuity/formability. | Open ReceiptPage; confirm score/readiness state. | Receipt not ready; UI should not show formal ready/green state. |  | NOT RUN | Use a case expected to remain below readiness threshold. |
| RUI-004 | Case has captured event and readiness score >= 3.0 | Ready case with trusted evidence event and passing readiness inputs. | Open ReceiptPage; confirm readiness display. | Receipt ready/green state is shown. |  | NOT RUN | Compare against backend-owned ready fields when present. |
| RUI-005 | Receipt ready state persists after refresh | Same ready case as RUI-004. | Refresh ReceiptPage; wait for hydration to complete. | Refreshed ReceiptPage reads backend-owned state and remains consistent. |  | NOT RUN | Confirm no downgrade after reload. |
| RUI-006 | Cases page Detail routes to Receipt | Eligible or in-progress receipt case visible on `/cases`. | Open `/cases`; click Detail for the case. | Detail opens ReceiptPage for eligible or in-progress receipt cases. |  | NOT RUN | Confirm resulting URL includes the same `caseId`. |
| RUI-007 | Verification remains locked before receipt is issued/eligible | Case without backend-owned receipt eligible/issued/payment state. | Attempt to navigate from ReceiptPage to Verification; open VerificationPage if reachable. | VerificationPage does not unlock from frontend-only assumptions. | Yellow Receipt can open locked Verification page after FIX1. | PASS after FIX1 | Subscription-only or route-state-only data must not unlock verification. |
| RUI-008 | Receipt ready case does not regress to insufficient state during hydration | Backend-ready receipt case; throttle network if useful. | Open ReceiptPage from a cold browser state and observe until hydration completes. | No red-to-green flash after backend response arrives. | Ready-case persistence/flicker still pending. | NOT RUN | Specifically watch for insufficient/failed flicker before backend case loads. |

## 5. 15-A1 PASS Criteria

PASS only if:

- Receipt readiness depends on backend-owned case state.
- Event requirement is visible and stable.
- Score threshold behavior is visible and stable.
- Ready state persists after page refresh.
- No loading-time red/failed flicker is observed.
- Verification is not unlocked prematurely.
- Cases -> Detail -> Receipt path shows the same readiness state.

## 6. 15-A2 Actual Result

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

Risks / observations:

- Legacy inconsistent cases were found and should not be used as clean ready samples:
  - `receiptEligible` true / `receipt_ready`
  - but `eventCount` 0 and no real events
- These are legacy-risk samples, not valid ready-case smoke samples.

## 7. Current Expected Status

Status: PARTIAL PASS

15-A2 not-ready branch is complete.

15-A2 ready branch remains pending.

Next recommended step: create or identify a clean ready case with real evidence event, then run ready Receipt UI smoke.
