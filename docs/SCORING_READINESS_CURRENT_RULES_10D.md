# Nimclea 10-D Current Scoring / Readiness Rules

Date: 2026-05-12
Scope: Current scoring and receipt readiness algorithm audit
Status: Current-rule documentation only
Code change: None

---

## 1. Current Algorithm Layers

Nimclea currently uses two related but different layers:

1. Deterministic score layer
2. Readiness contract layer

The deterministic score gives a four-part score.

The readiness contract decides whether the case is actually receipt-ready.

---

## 2. Deterministic Score Layer

Source file:

- frontend/utils/deterministicScore.js

Function:

- calculateDeterministicScore(caseData)

The deterministic score has four dimensions:

| Dimension | Max Score | Main Signals |
|---|---:|---|
| Evidence | 1.0 | evidence, record, reviewed, verified, support, invoice, txn, transaction, receipt, hash, case id |
| Structure | 1.0 | workflow, request, decision, scope, clarified |
| Consistency | 1.0 | decision scope or real event support |
| Continuity | 1.0 | pending, unresolved, awaiting confirmation, repeated events, time pressure |

Maximum total score:

- 4.0

Receipt threshold:

- 3.0

Deterministic receipt eligibility requires:

- totalScore >= 3.0
- at least one real event

---

## 3. Readiness Contract Layer

Source file:

- frontend/utils/deterministicScore.js

Function:

- buildReadinessContract(input)

This is the stronger receipt-readiness gate.

It evaluates five checks:

| Check | Score | Meaning |
|---|---:|---|
| Evidence | 1 | At least one real evidence event exists |
| Structure | 1 | Case structure is present |
| Consistency | 1 | No evidence-chain break detected |
| Continuity | 1 | Case continuity is present |
| Receipt record | 1 | Receipt record can be formed |

Maximum readiness score:

- 5.0

Receipt-ready threshold:

- 3.0

Receipt-ready requires:

- readinessScore >= 3.0
- no critical blockers

---

## 4. Critical Blockers

The current critical blockers are:

| Critical Blocker | Meaning |
|---|---|
| Evidence | No real evidence event exists |
| Consistency | Evidence chain appears broken |
| Receipt record | Receipt record cannot be formed |

If any critical blocker exists, the case should not become receipt-ready.

---

## 5. Readiness Level Mapping

| Condition | readinessLevel |
|---|---|
| receiptReady is true | ready |
| consistency check fails | failed |
| evidence check fails | insufficient_record |
| otherwise | pending_review |

---

## 6. Calibration Notes

Current design direction is sound:

- Receipt readiness is not only a score.
- Receipt readiness depends on whether a defensible record can be formed.
- Evidence, consistency, and receipt record formability are the core gates.

Future calibration should focus on:

1. Evidence event definition
2. Structure sufficiency
3. Receipt record formability
4. Insufficient vs pending review boundary
5. Whether scoring thresholds should remain at 3.0

---

## 7. Current Recommendation

Do not rewrite the algorithm yet.

First freeze the current rules, then run sample cases against the rules.

Next checkpoint:

- 10-D3: scoring sample case matrix

