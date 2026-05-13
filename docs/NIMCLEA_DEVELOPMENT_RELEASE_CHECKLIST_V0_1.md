# Nimclea Development and Release Checklist v0.1

Date: 2026-05-12  
Status: Drafted  
Type: Documentation only  
Code changes: No

---

## 1. Purpose

This checklist turns the final golden regression gate into a daily development and release habit.

It makes `npm run check:golden` the standard local validation command before merging or deploying risky changes in the current Nimclea golden smoke phase. It does not add CI integration, automated deployment blocking, live API testing, Stripe/payment testing, UI visual regression testing, or AI testing.

For the minimal manual push/deploy procedure, see `docs/NIMCLEA_MANUAL_RELEASE_PROCEDURE_V0_1.md`.

For release notes after validation, see `docs/NIMCLEA_RELEASE_NOTES_TEMPLATE_V0_1.md`.

For the first completed record, see `docs/NIMCLEA_RELEASE_NOTES_GOLDEN_GATE_PROCEDURE_HARDENING_V0_1.md`.

For the central release notes index, see `docs/NIMCLEA_RELEASE_NOTES_INDEX_V0_1.md`.

---

## 2. When This Checklist Applies

Use this checklist before committing, merging, or deploying changes touching:

- case lifecycle;
- readiness logic;
- receipt behavior;
- verification behavior;
- backend case aggregation;
- case routing/status interpretation;
- golden smoke scripts;
- readiness rule table;
- lifecycle contract documents.

---

## 3. Daily Development Checklist

- Check `git status --short` before editing.
- Keep each change small and scoped.
- Avoid mixing docs, frontend, backend, Stripe, and scoring changes in one commit unless necessary.
- Run targeted check first when applicable.
- Run `npm run check:golden` before marking lifecycle-related work complete.
- Confirm `git status --short` only shows expected files.
- Use conservative commit messages that describe the actual scope.

---

## 4. Pre-release Checklist

- Review `docs/NIMCLEA_PROGRESS_AND_RISK_MAP_V0_1.md`, then `docs/NIMCLEA_RELEASE_GATE_ALIGNMENT_V0_1.md`.
- Confirm Golden Cases, receipt readiness, verification gating, payment ledger, and routing risks are covered by existing smoke checks or explicitly deferred.
- `npm run check:golden` must pass.
- Expected pass standard:
  - `PASS: 14/14 golden readiness smoke checks passed.`
  - `PASS: 6/6 golden backend aggregation smoke checks passed.`
- Confirm no unintended frontend/backend/package/script/data files changed.
- Confirm docs do not claim coverage that was not tested.
- Confirm no real Stripe/live API/Supabase/UI/AI coverage is implied unless separately tested.
- Push only after the gate passes.

---

## 5. Failure Rule

If `npm run check:golden` fails:

- Do not deploy.
- Do not push completion claims.
- Identify the failing GTC case.
- Fix the underlying regression or intentionally update the golden contract only if the product contract changed.
- Re-run `npm run check:golden`.
- Document the reason if a golden expectation is intentionally changed.

---

## 6. Scope Separation Rule

- Documentation-only changes should remain docs-only.
- Package/script changes should not include product logic changes.
- Backend aggregation changes should be tested through the golden gate.
- Stripe/payment changes are outside the current golden gate and need separate payment smoke.
- UI visual changes are outside the current golden gate and need separate UI smoke.
- Live API integration is outside the current golden gate and needs separate route/API smoke.

---

## 7. Recommended Command Block

```powershell
git status --short
npm run check:golden
git diff --check -- docs README.md package.json scripts frontend backend
```

---

## 8. Current Gate Standard

- Golden readiness: 14/14.
- Backend aggregation: 6/6.
- Includes GTC-015F route-shaped in-memory backend aggregation smoke.
- Does not imply live route/API integration.

---

## 9. Status

| Step | Title | Status | Type | Notes |
| --- | --- | --- | --- | --- |
| 13-A1 | Development and release checklist | Drafted | Documentation only | Converts `npm run check:golden` into daily development and pre-release checklist |
| 13-B1 | Minimal manual release procedure | Drafted | Documentation only | Adds 5-step manual release procedure around `npm run check:golden` |
| 13-C1 | Release notes template | Drafted | Documentation only | Adds release notes / changelog template for golden-gate-validated changes |
| 13-D1 | First real release notes record | Drafted | Documentation only | Adds first real release notes record for golden gate procedure hardening |
| 13-E1 | Release notes index | Drafted | Documentation only | Adds lightweight index for release notes records |
| 14-C1 | Release gate docs linkage | Drafted | Documentation only | Adds 14-A/14-B review reminder; no code changed |
