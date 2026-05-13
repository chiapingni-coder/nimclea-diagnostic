# Nimclea Golden Test Execution Plan v0.1

Date: 2026-05-12  
Scope: Future executable smoke/check design for golden readiness cases  
Status: Drafted  
Code changes: none

---

## 1. Purpose

This document translates the 15 golden cases from `docs/NIMCLEA_GOLDEN_TEST_CASES_V0_1.md` into a future executable smoke/check design before automated tests are created.

It defines what each golden case should test, which layer it targets, the minimal fixture shape needed, expected assertions, and whether the case belongs in unit smoke, integration smoke, UI smoke, or manual smoke.

---

## 2. Scope

- This is a test design document only.
- No test runner is added.
- No production behavior is changed.
- No fixtures or runtime mock data files are created.
- No test dependencies are installed.
- Future 11-series steps may implement the tests gradually.

---

## 3. Test Layer Map

| Test Layer | Target Source | What It Can Validate | What It Should Not Validate | Notes |
| --- | --- | --- | --- | --- |
| Scoring unit check | `frontend/utils/deterministicScore.js` / `calculateDeterministicScore()` | Deterministic score dimensions, event count, threshold behavior, soft signal effects | Page labels, backend source precedence, payment access | Best first automation target. |
| Readiness contract check | `frontend/utils/deterministicScore.js` / `buildReadinessContract()` | Readiness level, hard blockers, receiptReady boolean, critical blocker behavior | `/cases` list labels, payment checkout, production hydration | Pure function style if fixtures stay small. |
| Backend lifecycle helper check | `frontend/utils/dataContractLifecycle.js` | Trusted backend receipt/verification readiness, fallback source filtering, paid/issued helpers | Scoring weights or UI rendering | Should isolate source trust and lifecycle rank behavior. |
| Access-mode check | `frontend/lib/accessMode.js` / `resolveAccessMode()` | Receipt/verification access booleans and mixed fallback behavior | Formal verification business quality | Mark mixed/refactor risks explicitly. |
| Cases list state check | `frontend/pages/CasesPage.jsx` / list status logic | `/cases` display status priority and receipt-not-ready narrowing | DOM rendering unless a UI harness is used | May require extracting or test-accessing list-state logic in a future step. |
| Receipt page state check | `frontend/pages/ReceiptPage.jsx` / derived receipt state | Checking/ready/yellow/unable state transitions and label contract | Full browser hydration unless a UI harness is used | Needs careful harness because page logic mixes hooks, local state, and backend hydration. |
| Verification contract check | `frontend/utils/sharedReceiptVerificationContract.js` | Verification Ready/Warning/Failed, resolvedVerificationEligible, consistency check | Payment activation or final verification issuance | Good pure-function automation target. |
| Backend aggregation / record selection check | `backend/server.js` merge and richness/order logic | Event merge, duplicate record precedence, richer/trusted record preservation | Frontend UI state directly | Better suited for integration smoke or extracted helper checks. |
| Manual production smoke | Deployed frontend/backend | End-to-end lifecycle, hydration, routing, labels, payment boundary visibility | Internal function-level diagnosis | Use after unit/helper checks pass. |

---

## 4. Golden Case Execution Matrix

| GTC ID | Case Name | Primary Test Layer | Secondary Test Layer | Target Function / File | Minimal Fixture Shape | Primary Assertions | Should Be Automated In | Manual Smoke Needed? | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| GTC-001 | Diagnostic Only Case | Cases list state check | Manual production smoke | `CasesPage.jsx` list status logic | Case with diagnostic/result status, no events, no receipt context, no paid state | `expectCasesLabel("Diagnostic completed")`; not yellow; not green | Phase 2 or 4, depending list-state access | Yes | Protects ordinary diagnostic shells. |
| GTC-002 | Event Captured But Not Receipt Ready | Scoring/readiness contract check | Cases list state check | `calculateDeterministicScore()`, `buildReadinessContract()` | Case with one vague event and no formable receipt | `expectReceiptReadyFalse`; event exists | Phase 1 | Optional | Ensures event count alone is not readiness. |
| GTC-003 | Insufficient Evidence Case | Readiness contract check | Receipt page state check | `buildReadinessContract()` | Pilot/result context but no valid readiness evidence event | `expectReadinessLevel("insufficient_record")`; `expectReceiptReadyFalse` | Phase 1 | Optional UI smoke | Soft cues must not pass evidence gate. |
| GTC-004 | Pending Review Case | Readiness contract check | Receipt page state check | `buildReadinessContract()` | Evidence and structure present; continuity or receipt record formability incomplete | `expectReadinessLevel("pending_review")`; `expectReceiptReadyFalse` | Phase 1 | Optional UI smoke | Needs carefully shaped fixture to avoid insufficient evidence. |
| GTC-005 | Receipt Ready Green Case | Readiness contract check | Receipt page state check | `buildReadinessContract()`, `ReceiptPage.jsx` derived state | Evidence, structure, consistency, continuity, receipt record formability pass | `expectReceiptReadyTrue`; green ready label | Phase 1 then Phase 4 | Yes | Primary green readiness sentinel. |
| GTC-006 | Broken Evidence Chain Case | Readiness contract check | Receipt page state check | `buildReadinessContract()` | Strong soft signals plus `evidenceLockBroken` or inconsistent lock status | `expectReadinessLevel("failed")`; red; `expectReceiptReadyFalse` | Phase 1 | Optional UI smoke | Broken lock must dominate. |
| GTC-007 | Backend Receipt Ready Precedence Case | Backend lifecycle helper check | Receipt page state check | `dataContractLifecycle.js`, `ReceiptPage.jsx` readiness precedence | Trusted backend record with receipt-ready signal; weak local score | `expectTrustedBackendPrecedence`; green ready | Phase 2 then Phase 4 | Yes | Source must not be fallback/cache/snapshot. |
| GTC-008 | Fallback Snapshot Must Not Upgrade Case | Backend lifecycle helper check | Receipt page state check | `dataContractLifecycle.js` source filtering | Fallback/cache/snapshot-like record with ready-looking signal | `expectFallbackDoesNotUpgrade`; not green from fallback alone | Phase 2 | Optional | Tests fallback source tokens. |
| GTC-009 | Paid But Not Evidence-Ready Case | Payment unlock boundary check | Cases list state check | `CasesPage.jsx`, `dataContractLifecycle.js`, `calculateDeterministicScore()` | Paid or checkout fields with weak/no evidence | `expectNoPaymentEvidenceBoost`; payment label may show | Phase 1 + Phase 2 | Yes for production payment boundary | Payment is access/activation, not evidence. |
| GTC-010 | Verification Ready Case | Verification contract check | Manual smoke | `sharedReceiptVerificationContract.js` | Checks all passed and consistency passes | `expectVerificationStatus("Verification Ready")` | Phase 1 | Optional | Pure contract check. |
| GTC-011 | Verification Warning Case | Verification contract check | Manual smoke | `sharedReceiptVerificationContract.js` | One warning or not-all-passed, no failed checks | `expectVerificationStatus("Verification Warning")` | Phase 1 | Optional | Warning must not become ready. |
| GTC-012 | Verification Failed Case | Verification contract check | Manual smoke | `sharedReceiptVerificationContract.js` | At least one failed verification check | `expectVerificationStatus("Verification Failed")` | Phase 1 | Optional | Failed dominates warning/ready. |
| GTC-013 | Access-Mode Verification Fallback Case | Access-mode check | Rule-layer classification review | `resolveAccessMode()` | `backendVerificationEligible: false`, `receiptEligible: true`, `eventCount > 0` | Verification view may be allowed; mark mixed/refactor risk | Phase 2 | No | Sentinel for blended access/eligibility. |
| GTC-014 | Threshold Mismatch Sentinel Case | Threshold sentinel check | Shared contract check | `deterministicScore.js`, `sharedReceiptVerificationContract.js` | Score between 3.0 and 3.5 | `expectThresholdMismatchReported`; no silent resolution | Phase 1 | No | Must preserve ambiguity until explicit cleanup. |
| GTC-015 | Case Ordering / Record Selection Case | Backend aggregation / record selection check | Manual production smoke | `backend/utils/caseAggregationHelpers.js` and `/cases` merge/richness/order logic | Duplicate case-shaped records with different timestamps/richness | `expectRecordSelectionDoesNotDowngrade`; backend aggregation smoke `PASS: 5/5` | Phase 3 smoke added in 11-B4 | Yes | Aggregation behavior, not scoring. |

---

## 5. Minimal Fixture Shape Examples

These are pseudo-fixtures only. They are not runtime mock files.

### Diagnostic only case

```json
{
  "caseId": "CASE-GTC-001",
  "status": "diagnostic_completed",
  "stage": "result",
  "currentStep": "result",
  "events": [],
  "receiptEligible": false
}
```

### Event but no evidence case

```json
{
  "caseId": "CASE-GTC-002",
  "events": [{ "type": "quick_capture", "text": "Team discussed next steps." }],
  "structureStatus": "",
  "receiptRecordFormable": false
}
```

### Receipt-ready case

```json
{
  "caseId": "CASE-GTC-005",
  "events": [{ "type": "evidence_capture", "text": "Invoice record and receipt hash confirmed." }],
  "structureStatus": "complete",
  "structureScore": 1,
  "continuityStatus": "confirmed",
  "receiptRecordFormable": true
}
```

### Broken evidence chain case

```json
{
  "caseId": "CASE-GTC-006",
  "events": [{ "type": "evidence_capture", "text": "Verified record and transaction support captured." }],
  "structureStatus": "complete",
  "structureScore": 1,
  "continuityStatus": "confirmed",
  "receiptRecordFormable": true,
  "evidenceLockBroken": true
}
```

### Backend-ready trusted case

```json
{
  "caseId": "CASE-GTC-007",
  "source": "backend_case",
  "receiptEligible": true,
  "receiptStatus": "ready",
  "stage": "receipt_ready"
}
```

### Fallback snapshot case

```json
{
  "caseId": "CASE-GTC-008",
  "source": "receipt_snapshot",
  "receiptEligible": true,
  "receiptStatus": "ready"
}
```

### Paid but not evidence-ready case

```json
{
  "caseId": "CASE-GTC-009",
  "paymentStatus": "checkout_created",
  "events": [{ "type": "quick_capture", "text": "Follow-up pending." }],
  "receiptRecordFormable": false
}
```

### Verification ready/warning/failed cases

```json
{
  "ready": { "verification": { "checks": [{ "label": "Evidence", "status": "passed" }] } },
  "warning": { "verification": { "checks": [{ "label": "Structure", "status": "warning" }] } },
  "failed": { "verification": { "checks": [{ "label": "Evidence", "status": "failed" }] } }
}
```

### Threshold mismatch case

```json
{
  "caseId": "CASE-GTC-014",
  "scoring": { "totalScore": 3.2, "receiptThreshold": 3.5 },
  "events": [{ "type": "evidence_capture", "text": "Evidence record confirmed." }]
}
```

### Duplicate record selection case

```json
{
  "records": [
    { "caseId": "CASE-GTC-015", "createdAt": "2026-05-01T00:00:00.000Z", "stage": "diagnostic_completed" },
    { "caseId": "CASE-GTC-015", "createdAt": "2026-05-02T00:00:00.000Z", "stage": "receipt_ready", "receiptEligible": true }
  ]
}
```

---

## 6. Assertion Vocabulary

| Assertion Name | Intended Meaning |
| --- | --- |
| `expectReceiptReadyTrue` | Receipt readiness returns true. |
| `expectReceiptReadyFalse` | Receipt readiness returns false. |
| `expectReadinessLevel(level)` | Readiness level equals `ready`, `pending_review`, `insufficient_record`, or `failed`. |
| `expectCasesLabel(label)` | `/cases` display status equals expected label. |
| `expectNoPaymentEvidenceBoost` | Payment fields do not improve evidence score or readiness evidence checks. |
| `expectTrustedBackendPrecedence` | Trusted backend lifecycle signal overrides weaker local scoring. |
| `expectFallbackDoesNotUpgrade` | Fallback/cache/snapshot source does not create backend-ready state. |
| `expectVerificationStatus(status)` | Verification status equals Ready, Warning, or Failed. |
| `expectThresholdMismatchReported` | 3.0 vs 3.5 threshold mismatch is surfaced, not silently resolved. |
| `expectRecordSelectionDoesNotDowngrade` | Aggregation/selection keeps richer or trusted lifecycle state. |

---

## 7. Implementation Priority

| Phase | Target | Included Cases | Rationale |
| --- | --- | --- | --- |
| Phase 1 | Pure function checks | GTC-002, GTC-003, GTC-004, GTC-005, GTC-006, GTC-010, GTC-011, GTC-012, GTC-014 | Lowest harness cost; validates scoring/readiness contract directly. |
| Phase 2 | Lifecycle/access helper checks | GTC-007, GTC-008, GTC-009, GTC-013 | Validates backend precedence, fallback filtering, payment boundary, and access-mode risk. |
| Phase 3 | Backend aggregation checks | GTC-015 | Requires backend merge/record-selection harness or extracted helpers. |
| Phase 4 | UI/manual smoke | GTC-001, GTC-005, GTC-007, GTC-009, GTC-015 | Confirms labels, hydration behavior, and route/page display. |
| Phase 5 | Production smoke checklist | Representative pass set from all phases | Final deployed validation after code changes. |

Recommendation: start with Phase 1 pure function checks only in a future step.

---

## 8. 11-A4 Known Findings

- Most golden cases can be turned into pure function or helper checks.
- UI state and backend aggregation cases require more careful harness design.
- Payment must remain a boundary/access assertion, not a scoring assertion.
- Threshold mismatch should become a sentinel test before any threshold cleanup.
- No behavior was changed in 11-A4.

---

## 9. 11-Series Progress

| Step | Status | Date | Scope | Code changes |
| --- | --- | --- | --- | --- |
| 11-A1: Readiness / Scoring Rule Table v0.1 | PASS / committed | 2026-05-12 | Documentation only | none |
| 11-A2: Rule-layer classification | PASS / committed | 2026-05-12 | Documentation only | none |
| 11-A3: Golden Test Cases v0.1 | PASS / committed | 2026-05-12 | Documentation only | none |
| 11-A4: Golden Test Execution Plan v0.1 | PASS / committed | 2026-05-12 | Documentation only | none |
| 11-A5: Golden Cases Runnable Smoke Check v0.1 | PASS / committed | 2026-05-12 | Smoke/check script only | no production code changes |
| 11-A6: Register Golden Readiness Smoke in Regression Checklist | PASS / committed | 2026-05-12 | Documentation only | none |
| 11-B1: Add GTC-013 Access-Mode Helper Smoke | PASS / committed | 2026-05-12 | Smoke/check script + documentation only | no production code changes |
| 11-B2: GTC-015 Backend Aggregation Test Design / Extraction Plan | Drafted | 2026-05-12 | Documentation only | none |
| 11-B3: Extract backend aggregation helpers | Drafted | 2026-05-12 | Backend no-behavior-change refactor | no production behavior changes |
| 11-B4: Add GTC-015 Backend Aggregation Smoke | Drafted | 2026-05-12 | Smoke/check script + documentation only | no production behavior changes |
| 12-A | Scope Lock v0.1 | Drafted | Documentation only | No code changes |
| 12-B3 | Golden smoke package entry | Completed | package.json only | npm run check:golden passed: 14/14 readiness + 5/5 backend aggregation |
| 12-B4 | Documentation progress update | Drafted | Documentation only | Updates progress tables after 12-B3 |
