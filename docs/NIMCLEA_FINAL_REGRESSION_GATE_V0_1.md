# Nimclea Final Regression Gate v0.1

Date: 2026-05-12  
Status: Drafted  
Type: Documentation only  
Code changes: No

---

## 1. Purpose

This gate is the required pre-release / pre-merge check for changes touching case lifecycle, readiness, receipt, verification, or backend aggregation behavior in the current Nimclea golden smoke phase.

It solidifies the existing local golden smoke checks as the final regression gate for this phase. It does not add CI integration, live API integration, production deployment protection, Stripe/payment testing, UI visual regression testing, or AI behavior testing.

For daily usage, see `docs/NIMCLEA_DEVELOPMENT_RELEASE_CHECKLIST_V0_1.md`.

For the minimal manual release procedure, see `docs/NIMCLEA_MANUAL_RELEASE_PROCEDURE_V0_1.md`.

For release notes after validation, see `docs/NIMCLEA_RELEASE_NOTES_TEMPLATE_V0_1.md`.

---

## 2. Required Command

Run from the repository root:

```powershell
npm run check:golden
```

---

## 3. Current Pass Standard

The command must pass with:

- `PASS: 14/14 golden readiness smoke checks passed.`
- `PASS: 6/6 golden backend aggregation smoke checks passed.`

---

## 4. What This Gate Covers

- Deterministic readiness behavior.
- Receipt readiness interpretation.
- Backend trusted receipt-ready precedence.
- Verification contract readiness/warning/failure behavior.
- Access-mode verification fallback boundary.
- Threshold mismatch sentinel.
- Backend aggregation helper behavior.
- Route-shaped in-memory backend aggregation smoke via GTC-015F.

---

## 5. What This Gate Does Not Cover

- Real Stripe payment execution.
- Live `/cases` or `/case/:caseId` API integration.
- Supabase/live database behavior.
- Frontend visual/UI regression.
- Email magic link/auth behavior.
- AI/LLM scanning layer.
- Corporate website behavior.
- Production data migration.

---

## 6. When To Run

Run this gate before:

- Deploying changes related to case lifecycle.
- Editing readiness/scoring contracts.
- Editing receipt or verification contract utilities.
- Editing backend aggregation helpers.
- Editing route-level case aggregation logic.
- Updating golden cases or smoke checks.

---

## 7. Failure Rule

If `npm run check:golden` fails:

- Do not deploy.
- Do not mark the phase complete.
- Inspect the failing GTC case.
- Fix the underlying behavior or update the golden case only if the intended contract changed.
- Re-run `npm run check:golden` before committing completion.

---

## 8. Status

| Step | Title | Status | Type | Notes |
| --- | --- | --- | --- | --- |
| 12-D1 | Final regression gate documentation | Drafted | Documentation only | Solidifies `npm run check:golden` as required gate |
| 13-A1 | Development and release checklist | Drafted | Documentation only | Adds daily/pre-release checklist for golden regression gate usage |
| 13-B1 | Minimal manual release procedure | Drafted | Documentation only | Adds 5-step manual release procedure around `npm run check:golden` |
| 13-C1 | Release notes template | Drafted | Documentation only | Adds release notes / changelog template for golden-gate-validated changes |
