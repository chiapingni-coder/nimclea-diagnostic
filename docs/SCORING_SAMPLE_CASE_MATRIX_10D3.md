# Nimclea 10-D3 Scoring Sample Case Matrix

Date: 2026-05-12
Scope: Sample case matrix for scoring / readiness calibration
Status: Test matrix only
Code change: None

---

## 1. Purpose

This matrix is used to test whether the current scoring and readiness rules behave correctly across common case states.

This step does not change the algorithm.

The goal is to compare:

- expected human judgment
- current deterministic scoring behavior
- current readiness contract behavior
- whether calibration is needed

---

## 2. Current Rule Summary

Current receipt readiness depends on two layers:

1. Deterministic score
2. Readiness contract

A case should become receipt-ready only when:

- readinessScore >= 3.0
- no critical blockers exist

Current critical blockers:

- no evidence event
- broken consistency
- receipt record cannot be formed

---

## 3. Sample Case Matrix

| ID | Scenario | Event State | Structure State | Consistency State | Receipt Record State | Expected Readiness | Expected Level | Calibration Note |
|---|---|---|---|---|---|---|---|---|
| S1 | Empty new case | No event | Missing | No break | Not formable | Not ready | insufficient_record | Correct to block |
| S2 | Diagnostic completed but no real event | No event | Present | No break | Not formable | Not ready | insufficient_record | Prevents fake receipt readiness |
| S3 | One vague event, weak structure | Event exists but unclear evidence | Weak or missing | No break | Not clearly formable | Not ready | pending_review or insufficient_record | Boundary needs testing |
| S4 | One evidence event with caseId and structure | Evidence event exists | Present | No break | Formable | Ready | ready | Should pass |
| S5 | Multiple events but no evidence wording | Events exist | Present | No break | Maybe formable | Possibly pending_review | pending_review | Tests event vs evidence distinction |
| S6 | Evidence exists but consistency broken | Evidence event exists | Present | Broken | Formable | Not ready | failed | Critical blocker should dominate |
| S7 | Evidence and continuity exist but structure missing | Evidence event exists | Missing | No break | Not formable | Not ready | pending_review | Should request structure repair |
| S8 | Receipt hash or receiptId already exists | Evidence likely exists | Present | No break | Formable | Ready | ready | Backend receipt record should win |
| S9 | Paid / checkout started but weak evidence | Weak or missing evidence | Present | No break | Payment signal exists | Not automatically ready | insufficient_record or pending_review | Payment must not override readiness |
| S10 | Strong case with repeated evidence events | Multiple evidence events | Present | No break | Formable | Ready | ready | Should pass cleanly |

---

## 4. Human Judgment Targets

The algorithm should follow these product principles:

| Principle | Meaning |
|---|---|
| No event, no receipt | A receipt cannot be issued from only diagnostic text |
| Evidence beats verbosity | A short real event can be stronger than long vague text |
| Broken consistency blocks readiness | Contradictory evidence should not become receipt-ready |
| Payment does not create readiness | Checkout state should not override proof quality |
| Receipt record must be formable | A green state must represent a lockable record |
| Pending review is repairable | Missing structure or weak formability should guide repair, not fail harshly |
| Insufficient record means no usable evidence yet | This should be used when the record has not started |

---

## 5. Calibration Questions

Use this matrix to answer:

1. Does one real Quick Capture event turn the case from insufficient_record to pending_review?
2. Does one strong evidence event correctly make a structured case receipt-ready?
3. Does a broken consistency signal always block readiness?
4. Does payment status accidentally affect readiness?
5. Is pending_review too broad?
6. Is insufficient_record too harsh?
7. Is receiptRecordFormable too strict or too loose?

---

## 6. Pass Criteria for 10-D3

10-D3 passes when:

- The sample matrix is documented.
- Each sample has a clear expected readiness state.
- No code is changed.
- The next calibration step can test real or mock records against this matrix.

---

## 7. Next Checkpoint

Next checkpoint:

- 10-D4: run current algorithm against sample cases
- 10-D5: decide calibration targets
- 10-D6: apply minimal scoring calibration only if needed

