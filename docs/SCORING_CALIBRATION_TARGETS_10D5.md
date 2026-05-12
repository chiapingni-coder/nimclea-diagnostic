# Nimclea 10-D5 Scoring Calibration Targets

Date: 2026-05-12
Scope: Decide minimal calibration targets after running the scoring sample matrix
Status: Calibration target decision only
Code change: None

---

## 1. Purpose

This document defines the minimal calibration targets for the scoring / readiness algorithm.

This step does not change code.

The goal is to decide what should be calibrated before any implementation begins.

---

## 2. Input From 10-D4

10-D4 ran the current buildReadinessContract() logic against the sample matrix.

Result summary:

| Matrix ID | Scenario | Expected | Actual | Decision |
|---|---|---|---|---|
| M1 | Empty new case | insufficient_record | insufficient_record | Correct |
| M2 | Diagnostic completed but no event | insufficient_record | insufficient_record | Correct |
| M3 | One vague event, weak structure | pending_review or insufficient_record | pending_review | Acceptable |
| M4 | One evidence event with caseId and structure | ready | ready | Correct |
| M5 | Multiple vague events, no evidence wording | pending_review | ready | Needs calibration |
| M6 | Evidence exists but consistency broken | failed | failed | Correct |
| M7 | Evidence exists but structure missing | pending_review | pending_review | Correct |
| M8 | Existing receipt hash or receiptId | ready | ready | Correct |
| M9 | Checkout started but weak evidence | not automatically ready | insufficient_record | Correct |
| M10 | Strong repeated evidence case | ready | ready | Correct |

---

## 3. Primary Calibration Target

### Target T1: Tighten readiness evidence definition

Current issue:

- Multiple vague quick_capture events can satisfy readiness evidence too easily.
- This allows a case to become receipt-ready even when the text does not contain clear evidence content.

Required behavior:

- quick_capture alone should not automatically count as readiness evidence.
- Vague event text should support continuity or progression, but not evidence.
- Evidence should require at least one of the following:
  - evidence-specific event type
  - evidence-specific text signal
  - receipt/hash/record/invoice/transaction/support/verified/reviewed/case id style content
  - explicit backend receipt-ready or receipt record signal

Expected effect:

- M5 should move from ready to pending_review.
- M4, M8, and M10 should remain ready.
- M1, M2, M6, M7, and M9 should remain unchanged.

---

## 4. Non-Targets

The following should not be changed in this calibration round:

| Non-Target | Reason |
|---|---|
| Receipt threshold 3.0 | Current threshold behaves reasonably |
| Consistency broken behavior | M6 correctly fails |
| Payment readiness boundary | M9 correctly does not become ready |
| Existing receiptId / receiptHash behavior | M8 correctly becomes ready |
| Structure repair behavior | M7 correctly stays pending_review |
| Overall two-layer design | Deterministic score + readiness contract is directionally correct |

---

## 5. Product Principle

The key product rule is:

**Multiple records are not the same as evidence.**

A case may have activity without being receipt-ready.

Readiness should mean:

- there is at least one usable evidence event,
- the record is not broken,
- the receipt record can be formed,
- and the case can be locked without pretending that vague notes are proof.

---

## 6. Expected Post-Calibration Matrix

After minimal calibration, the expected matrix should be:

| Matrix ID | Expected After Calibration |
|---|---|
| M1 | insufficient_record |
| M2 | insufficient_record |
| M3 | pending_review or insufficient_record |
| M4 | ready |
| M5 | pending_review |
| M6 | failed |
| M7 | pending_review |
| M8 | ready |
| M9 | insufficient_record |
| M10 | ready |

---

## 7. Implementation Boundary for 10-D6

10-D6 should be a minimal code change.

Preferred change area:

- frontend/utils/deterministicScore.js

Preferred target function:

- isReadinessEvidenceEvent(event)

Do not rewrite:

- calculateDeterministicScore()
- buildReadinessContract()
- CasesPage routing
- ReceiptPage hydration
- payment logic
- backend storage

---

## 8. Pass Criteria for 10-D5

10-D5 passes when:

- The calibration target is documented.
- The only required behavioral change is clearly identified.
- Non-targets are explicitly protected.
- No code is changed.
- 10-D6 can safely implement one narrow calibration.

---

## 9. Final Decision

Proceed to 10-D6 only with this target:

**Tighten readiness evidence detection so vague quick_capture activity does not make a case receipt-ready.**

