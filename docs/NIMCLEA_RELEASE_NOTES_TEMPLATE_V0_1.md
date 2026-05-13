# Nimclea Release Notes Template v0.1

Date: 2026-05-12
Status: Drafted
Type: Documentation only
Code changes: No

---

## 1. Purpose

This template records completed Nimclea change sets in a consistent format, especially after running the manual release procedure and `npm run check:golden`.

It does not provide CI integration, automatic changelog generation, production deployment verification, live API testing, Stripe/payment testing, UI visual regression testing, or AI testing.

---

## 2. When To Use This Template

Use after completing a scoped change set, especially when it touches:

- case lifecycle;
- readiness logic;
- receipt behavior;
- verification behavior;
- backend aggregation;
- golden smoke scripts;
- release/checklist/gate documentation.

---

## 3. Minimal Release Notes Template

```markdown
# Release Notes: <Change Set Name>

Date:
Commit:
Branch:
Type:
- Documentation only / Script only / Backend only / Frontend only / Mixed

## Summary
Briefly describe what changed in 2 to 4 bullets.

## Files Changed
List files changed by category:
- Docs:
- Scripts:
- Frontend:
- Backend:
- Package/config:
- Data/migration:

## Validation Run
Document commands run:
- npm run check:golden
- git diff --check -- docs README.md package.json scripts frontend backend
- git status --short

## Golden Gate Result
Record:
- Golden readiness: 14/14 passed
- Backend aggregation: 6/6 passed
- Includes GTC-015F route-shaped in-memory backend aggregation smoke

## Scope Boundary
Confirm what was not covered:
- No real Stripe payment execution unless separately tested
- No live /cases or /case/:caseId API integration unless separately tested
- No Supabase/live database validation unless separately tested
- No frontend visual regression unless separately tested
- No AI/LLM scanning validation unless separately tested
- No production deployment guarantee unless separately verified

## Risk Notes
List known risks, limitations, or follow-up checks.

## Release Decision
Choose one:
- Ready to push
- Ready to deploy
- Hold
- Documentation only, no deploy needed

## Follow-up
List next recommended step.
```

---

## 4. Example Entry

```markdown
# Release Notes: Golden Gate Procedure Hardening

Type:
- Documentation only

Summary:
- Added final regression gate documentation.
- Added development/release checklist.
- Added minimal manual release procedure.
- Kept package, scripts, frontend, backend, scoring, and Stripe logic unchanged.

Validation Run:
- npm run check:golden passed.
- Golden readiness: 14/14 passed.
- Backend aggregation: 6/6 passed.

Scope Boundary:
- No CI integration claimed.
- No live API integration claimed.
- No Stripe/payment validation claimed.
- No UI visual regression claimed.

Release Decision:
- Documentation only, no deploy needed.
```

---

## 5. Status

| Step | Title | Status | Type | Notes |
| --- | --- | --- | --- | --- |
| 13-C1 | Release notes template | Drafted | Documentation only | Adds minimal template for documenting completed change sets after golden gate validation |
