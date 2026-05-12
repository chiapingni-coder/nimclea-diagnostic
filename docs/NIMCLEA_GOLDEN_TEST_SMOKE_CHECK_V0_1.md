# Nimclea Golden Test Smoke Check v0.1

Date: 2026-05-12
Scope: Local deterministic smoke/check only
Current result: PASS / committed
Code changes: smoke/check script only

---

## Purpose

This document records the first runnable local smoke/check harness for Nimclea golden readiness cases.

The script turns a subset of the documented golden cases into deterministic Node checks without changing production scoring behavior.

---

## Command

Run from the repository root:

```powershell
node scripts/check-golden-readiness.mjs
```

Run this command:

- before changing readiness/scoring logic;
- after changing `frontend/utils/deterministicScore.js`;
- after changing `frontend/utils/dataContractLifecycle.js`;
- after changing `frontend/utils/sharedReceiptVerificationContract.js`;
- after changing receipt/verification readiness behavior;
- before committing future 11-series scoring/readiness changes.

Expected success behavior:

- Prints a compact PASS/FAIL table.
- Exits with code `0` when all checks pass.
- Reports `PASS: 14/14 golden readiness smoke checks passed.`
- Confirms the current v0.1 covered golden readiness checks still pass.
- Does not mean all 15 golden cases are automated.

Expected failure behavior:

- Prints failed case details.
- Exits with code `1`.

---

## What It Checks

The v0.1 smoke check validates deterministic readiness outcomes for representative golden cases:

- no real event captured does not become receipt-ready;
- weak event/context remains non-ready;
- insufficient evidence maps to `insufficient_record`;
- pending review maps to `pending_review`;
- strong evidence plus structure/continuity/formability becomes receipt-ready;
- broken evidence chain maps to `failed` and blocks readiness;
- trusted backend receipt-ready signals pass backend lifecycle helper checks;
- fallback snapshot ready signals do not upgrade to backend-ready;
- payment/checkout fields do not increase evidence score or deterministic receipt eligibility;
- verification Ready/Warning/Failed contract labels behave as expected;
- access-mode verification fallback can allow verification view access without proving formal verification quality;
- the `3.0` deterministic threshold and legacy `3.5` shared threshold remain detectable as a sentinel.

---

## What It Does Not Check

- It does not render React pages.
- It does not test routing.
- It does not start the backend server.
- It does not call network APIs.
- It does not use browser localStorage.
- It does not test Stripe or payment webhooks.
- It does not test backend/data files.
- It does not create runtime fixture files.
- It does not validate full production hydration behavior.
- GTC-015 Case Ordering / Record Selection is deferred to backend aggregation / record-selection smoke.

---

## Source Files Used

The script imports existing pure/helper logic:

- `frontend/utils/deterministicScore.js`
- `frontend/utils/dataContractLifecycle.js`
- `frontend/utils/sharedReceiptVerificationContract.js`

No production behavior is changed.

---

## Current Smoke Result

Latest local run:

```text
PASS: 14/14 golden readiness smoke checks passed.
```

Command run:

```powershell
node scripts/check-golden-readiness.mjs
```

---

## Coverage Notes

- The v0.1 runnable smoke currently runs 14 checks.
- Covered: GTC-001 through GTC-014.
- GTC-013 Access-Mode Verification Fallback Case is covered as an access-mode helper smoke, not as a formal verification quality check.
- Deferred from runnable smoke v0.1/v0.2:
  - GTC-015 Case Ordering / Record Selection Case, because it requires backend aggregation / record-selection harness design.
- This means 14/14 is expected for v0.1/v0.2 and does not mean all 15 golden cases are automated yet.

This smoke check is now the first local regression command for readiness/scoring work. Future automation should expand coverage rather than weaken or bypass this check.

---

## 11-Series Progress

| Step | Status | Date | Scope | Code changes |
| --- | --- | --- | --- | --- |
| 11-A1: Readiness / Scoring Rule Table v0.1 | PASS / committed | 2026-05-12 | Documentation only | none |
| 11-A2: Rule-layer classification | PASS / committed | 2026-05-12 | Documentation only | none |
| 11-A3: Golden Test Cases v0.1 | PASS / committed | 2026-05-12 | Documentation only | none |
| 11-A4: Golden Test Execution Plan v0.1 | PASS / committed | 2026-05-12 | Documentation only | none |
| 11-A5: Golden Cases Runnable Smoke Check v0.1 | PASS / committed | 2026-05-12 | Smoke/check script only | no production code changes |
| 11-A6: Register Golden Readiness Smoke in Regression Checklist | PASS / committed | 2026-05-12 | Documentation only | none |
| 11-B1: Add GTC-013 Access-Mode Helper Smoke | PASS / committed | 2026-05-12 | Smoke/check script + documentation only | no production code changes |
