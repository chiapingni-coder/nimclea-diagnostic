# Nimclea Acceptance Checklist v0.1

## Purpose

This checklist defines the minimal release acceptance path for the current Nimclea stabilization phase. It aligns with existing release gate, stop-line, smoke, and boundary documents and does not introduce new product requirements.

## 1. Release acceptance boundary

Release acceptance is limited to the existing protected Nimclea path:

1. Access entry
2. CasesPage workspace continuity
3. Diagnostic Result
4. Case Plan / Pilot Plan
5. Pilot Result
6. Receipt
7. Verification eligibility

Acceptance is based on existing automated release checks, documented manual smoke behavior, and release stop lines.

## 2. What must pass before release

- Required release documentation exists.
- `npm --prefix frontend run build` completes successfully.
- `node scripts/check-release-gate.mjs` reports no FAIL items.
- Access routes new and returning users correctly.
- CasesPage preserves `caseId`, email context, case names, and lifecycle actions.
- ResultPage first-run and review CTAs match the case context.
- Pilot Result preserves case continuity into Receipt.
- Receipt does not show a trust-breaking pending, insufficient, or ready-state flicker.
- Verification remains gated by receipt authority.
- Payment, paid, receipt-issued, and verification states do not cross cases or disappear.

## 3. What is explicitly not required for this release

- New product features.
- New payment pricing or checkout behavior.
- New trial-ended summary behavior.
- New export formats.
- New scoring rules.
- New backend lifecycle APIs.
- Broad routing refactors.
- UI redesign beyond release-stability fixes.

Deferred work may remain only if it does not violate the release stop line or create a trust-breaking state.

## 4. Manual smoke acceptance items

- Access entry: new email reaches Diagnostic Question 1; existing email reaches CasesPage.
- CasesPage: returning accounts do not flash diagnostic onboarding before lookup settles.
- Diagnostic Result: first-run shows pilot entry; review mode does not show pilot or Continue Case CTAs.
- Pilot Result: eligible result routes to Receipt for the same case.
- Receipt: pending hydration is neutral; final ready state is stable green when ready.
- Verification: unlock behavior follows receipt authority.
- Payment continuity: paid or checkout state remains tied to the same case.
- Case naming: renamed cases do not create ambiguity in downstream pages.
- Flicker: any temporary state must be neutral and must not communicate a wrong decision.

## 5. Blocker vs non-blocker classification

Blocker:

- Wrong account route.
- Lost or mismatched `caseId`.
- Wrong lifecycle CTA.
- Receipt yellow, amber, insufficient, or misleading gray flash before confirmed ready.
- Verification opens without receipt authority.
- Paid state crosses cases, disappears, or unlocks unrelated records.
- Mock, placeholder, stale local-only, or unlinked data is treated as authoritative.

Non-blocker:

- Minor copy polish.
- Minor layout polish.
- Neutral loading state that does not imply a decision.
- Manual-only release gate WARN item with recorded stop-line disposition.
- Deferred feature explicitly listed as out of scope.

## 6. Final release decision states

- PASS: all required checks pass, manual smoke has no stop-line violation, and no protected-path blocker is reproduced.
- PASS WITH DEFERRED ITEMS: required checks pass, manual-only WARN items are documented, and deferred items do not violate a stop line.
- BLOCKED: any automated FAIL, failed build, missing required release document, or reproduced stop-line violation.

## 7. Execution record

| Area | Check | Expected Result | Actual Result | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| Access entry | New email and returning email routing | New email enters Diagnostic Question 1; returning email reaches CasesPage | TBD | TBD | Manual smoke |
| CasesPage continuity | Existing workspace load | Case list loads without diagnostic onboarding flash and preserves case identity | TBD | TBD | Manual smoke |
| ResultPage | First-run and review CTA behavior | First-run shows pilot entry; review hides pilot and Continue Case CTAs | TBD | TBD | Manual smoke |
| Pilot Result | Receipt handoff | Same `caseId` reaches Receipt with compact persisted result context | TBD | TBD | Manual smoke |
| Receipt | Readiness hydration | Neutral pending state, then stable authoritative ready or insufficient state | TBD | TBD | Manual smoke |
| Verification | Unlock gating | Verification follows receipt authority only | TBD | TBD | Manual smoke |
| Payment continuity | Paid and checkout state | Payment state remains tied to the selected case | TBD | TBD | Manual smoke |
| Case naming | Downstream display consistency | No stale name creates active, paid, receipted, verified, or exported ambiguity | TBD | TBD | Manual smoke |
| Build | `npm --prefix frontend run build` | Build completes successfully | TBD | TBD | Automated |
| Release gate | `node scripts/check-release-gate.mjs` | No FAIL results | TBD | TBD | Automated |
