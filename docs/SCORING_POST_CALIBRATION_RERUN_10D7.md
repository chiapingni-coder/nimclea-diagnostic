# Nimclea 10-D7 Post-Calibration Full Matrix Rerun Record

Date: 2026-05-12
Scope: Full M1-M10 scoring matrix rerun after 10-D6 calibration
Status: Generated rerun record
Code change: None in this checkpoint

---

## 1. Purpose

This record captures the post-calibration behavior of the current readiness algorithm after 10-D6.

10-D6 tightened readiness evidence detection so vague quick_capture activity does not make a case receipt-ready.

---

## 2. Summary

| Metric | Result |
|---|---:|
| Total matrix cases | 10 |
| PASS | 10 |
| REVIEW | 0 |

---

## 3. Full Matrix Results

| Matrix ID | Scenario | Expected | Actual Ready | Actual Level | Readiness Score | Deterministic Total | Critical Blockers | Result |
|---|---|---|---:|---|---:|---:|---|---|
| M1 | Empty new case | insufficient_record | false | insufficient_record | 1 | 0 | evidence, receiptRecord | PASS |
| M2 | Diagnostic completed but no real event | insufficient_record | false | insufficient_record | 1 | 0 | evidence, receiptRecord | PASS |
| M3 | One vague event, weak structure | not ready, pending_review or insufficient_record acceptable | false | insufficient_record | 1 | 2.05 | evidence, receiptRecord | PASS |
| M4 | One evidence event with caseId and structure | ready | true | ready | 5 | 3.3 | none | PASS |
| M5 | Multiple vague events, no evidence wording | not ready after calibration | false | insufficient_record | 1 | 2.25 | evidence, receiptRecord | PASS |
| M6 | Evidence exists but consistency broken | failed | false | failed | 2 | 2.7 | consistency | PASS |
| M7 | Evidence and continuity exist but structure missing | pending_review | false | pending_review | 2.4 | 2.5 | receiptRecord | PASS |
| M8 | Receipt hash or receiptId already exists | ready | true | ready | 5 | 2.5 | none | PASS |
| M9 | Paid / checkout started but weak evidence | insufficient_record | false | insufficient_record | 1 | 0 | evidence, receiptRecord | PASS |
| M10 | Strong case with repeated evidence events | ready | true | ready | 5 | 3.85 | none | PASS |

---

## 4. Calibration Finding

The key calibration target was M5.

Before 10-D6, M5 incorrectly became ready because multiple vague quick_capture events were treated as readiness evidence.

After 10-D6, M5 no longer becomes receipt-ready.

This confirms the main calibration target was achieved.

---

## 5. Safety Note

M5 may resolve to insufficient_record rather than pending_review.

This is acceptable for 10-D7 because the safety requirement is:

- vague activity must not become receipt-ready

A future refinement may add a separate weak-activity state if needed.

---

## 6. Result

10-D7 passes if:

- M4 remains ready
- M5 is not ready
- M8 remains ready
- M10 remains ready
- consistency-broken cases still fail
- payment status does not create readiness

