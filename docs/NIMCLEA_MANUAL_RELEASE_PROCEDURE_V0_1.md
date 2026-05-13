# Nimclea Manual Release Procedure v0.1

Date: 2026-05-12  
Status: Drafted  
Type: Documentation only  
Code changes: No

---

## 1. Purpose

This is a minimal manual release procedure for changes touching case lifecycle, readiness, receipt, verification, or backend aggregation behavior.

It turns the golden gate checklist into a concrete local procedure to follow before pushing or deploying lifecycle-related changes. It does not add CI integration, automatic deployment blocking, live API testing, Stripe/payment testing, UI visual regression testing, AI testing, or production deployment validation.

After this procedure passes, use `docs/NIMCLEA_RELEASE_NOTES_TEMPLATE_V0_1.md` to document the completed change set.

For the first completed record, see `docs/NIMCLEA_RELEASE_NOTES_GOLDEN_GATE_PROCEDURE_HARDENING_V0_1.md`.

For the central release notes index, see `docs/NIMCLEA_RELEASE_NOTES_INDEX_V0_1.md`.

---

## 2. When To Use This Procedure

Use before pushing or deploying changes related to:

- case lifecycle;
- readiness logic;
- receipt behavior;
- verification behavior;
- backend aggregation;
- route-level case aggregation;
- golden smoke scripts;
- lifecycle/readiness contract docs.

---

## 3. Minimal Manual Release Steps

### Step 1: Confirm working tree scope

Command:

```powershell
git status --short
```

Rule:

Only expected files should be modified.

Also review `docs/NIMCLEA_PROGRESS_AND_RISK_MAP_V0_1.md`, then `docs/NIMCLEA_RELEASE_GATE_ALIGNMENT_V0_1.md`. Confirm Golden Cases, receipt readiness, verification gating, payment ledger, and routing risks are covered by existing smoke checks or explicitly deferred.

### Step 2: Run final golden regression gate

Command:

```powershell
npm run check:golden
```

Required pass standard:

- `PASS: 14/14 golden readiness smoke checks passed.`
- `PASS: 6/6 golden backend aggregation smoke checks passed.`

### Step 3: Check diff hygiene

Command:

```powershell
git diff --check -- docs README.md package.json scripts frontend backend
```

Rule:

Whitespace check should pass, except harmless CRLF normalization warnings on Windows.

### Step 4: Commit with scoped message

Commands:

```powershell
git add <expected files>
git commit -m "<scoped message>"
```

Rule:

Commit message must describe the actual scope. Do not mix unrelated frontend, backend, Stripe, scoring, and docs changes unless the task explicitly requires it.

### Step 5: Final status and push

Commands:

```powershell
git status --short
git push origin master
```

Rule:

Only push after the golden gate has passed and the working tree is clean.

---

## 4. Stop Rules

If `npm run check:golden` fails:

- Stop the release.
- Do not push completion claims.
- Identify the failing GTC case.
- Fix the regression or update the golden contract only if the intended product contract changed.
- Re-run `npm run check:golden`.

If unexpected files appear in `git status`:

- Stop.
- Inspect the diff.
- Remove or separate unrelated changes.

If the change touches Stripe/payment, live API integration, UI visual behavior, Supabase/live database behavior, or AI/LLM behavior:

- Do not claim this procedure fully validates that area.
- Create or run a separate smoke procedure for that area.

---

## 5. Coverage Boundary

This manual release procedure currently covers:

- golden readiness smoke;
- backend aggregation helper smoke;
- route-shaped in-memory backend aggregation sentinel GTC-015F.

It does not cover:

- CI automation;
- live `/cases` or `/case/:caseId` API integration;
- real Stripe payment execution;
- Supabase/live database behavior;
- frontend visual regression;
- email magic link/auth behavior;
- AI/LLM scanning behavior;
- corporate website behavior.

---

## 6. Current Release Gate Standard

- Golden readiness: 14/14.
- Backend aggregation: 6/6.
- Command: `npm run check:golden`.
- GTC-015F is route-shaped in-memory smoke, not live route/API integration.

---

## 7. Status

| Step | Title | Status | Type | Notes |
| --- | --- | --- | --- | --- |
| 13-B1 | Minimal manual release procedure | Drafted | Documentation only | Converts checklist into 5-step manual release procedure |
| 13-C1 | Release notes template | Drafted | Documentation only | Adds release notes / changelog template for golden-gate-validated changes |
| 13-D1 | First real release notes record | Drafted | Documentation only | Adds first real release notes record for golden gate procedure hardening |
| 13-E1 | Release notes index | Drafted | Documentation only | Adds lightweight index for release notes records |
| 14-C1 | Release gate docs linkage | Drafted | Documentation only | Adds 14-A/14-B pre-release reminder; no code changed |
