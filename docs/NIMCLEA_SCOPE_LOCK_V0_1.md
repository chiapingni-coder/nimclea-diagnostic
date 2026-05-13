# Nimclea Scope Lock v0.1

Date: 2026-05-12  
Status: Drafted  
Type: Documentation only  
Code changes: No

---

## 1. Purpose

This document freezes the current testing and regression boundary before converting golden cases into runnable smoke/check scripts.

The scope lock is intended to keep the next Nimclea regression/golden-smoke phase focused on validating existing behavior. It separates documentation/testing work from product, payment, UI, data-model, and AI work so future tasks can be classified before implementation starts.

---

## 2. In Scope

- Case lifecycle consistency.
- Case aggregation behavior from backend `/cases` and `/case/:caseId`.
- Readiness scoring interpretation based on `docs/NIMCLEA_READINESS_SCORING_RULE_TABLE_V0_1.md`.
- Golden test cases from `docs/NIMCLEA_GOLDEN_TEST_CASES_V0_1.md`.
- Golden execution plan from `docs/NIMCLEA_GOLDEN_TEST_EXECUTION_PLAN_V0_1.md`.
- Backend aggregation extraction plan from `docs/NIMCLEA_GTC_015_BACKEND_AGGREGATION_EXTRACTION_PLAN_V0_1.md`.
- Smoke/check scripts that verify existing behavior without changing production behavior.

---

## 3. Out of Scope

- Real Stripe payment execution.
- Subscription pricing changes.
- New paid verification product logic.
- AI/LLM scanning layer.
- New UI design changes.
- New customer-facing copy changes.
- New data model migration.
- New scoring algorithm.
- Corporate website changes.
- Email magic link/auth rebuild.

---

## 4. Completion Boundary

12-A is complete when:

- The scope lock file exists.
- It references the current rule table and golden case documents.
- It clearly separates documentation/testing work from product/payment/AI work.
- It can be used as the authority for deciding whether a future task belongs in the current regression phase.

---

## 5. Downstream Usage

- 12-B should convert selected golden cases into runnable smoke/check scripts.
- 12-C should validate backend aggregation behavior against the locked scope.
- 12-D should update progress tables only after runnable checks pass.
- 12-D1 defines `npm run check:golden` as the required final regression gate for this golden smoke phase.
- 13-A1 defines the daily development and release checklist for using the final regression gate.
- 13-B1 defines the minimal 5-step manual release procedure around the final regression gate.
- Any new request outside this scope should become a separate later phase, not be mixed into the golden smoke phase.

---

## 6. Status

| Item | Status | Date | Type | Code changes |
| --- | --- | --- | --- | --- |
| Scope Lock v0.1 | Drafted | 2026-05-12 | Documentation only | No |
| 12-D1 Final regression gate documentation | Drafted | 2026-05-12 | Documentation only | No |
| 13-A1 Development and release checklist | Drafted | 2026-05-12 | Documentation only | No |
| 13-B1 Minimal manual release procedure | Drafted | 2026-05-12 | Documentation only | No |
