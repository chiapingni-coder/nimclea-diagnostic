# Nimclea Release Blocker Triage v0.1

## 1. True Release Blockers

A true blocker must meet at least one condition:

- breaks the core new-user path
- breaks the returning-user `/cases` path
- breaks `caseId` continuity
- corrupts or loses case/customer identity
- causes incorrect receipt or verification eligibility
- creates a payment state contradiction
- prevents confident production smoke testing

Current true blockers are validation blockers, not known implementation defects:

| Blocker | Why it qualifies | Required resolution |
| --- | --- | --- |
| Production smoke not yet recorded | Prevents confident production smoke testing. | Run and record production smoke for frontend, backend, `/cases`, `/trial-status`, receipt, verification, and payment dry-run path. |
| New-user diagnostic to ResultPage to Case Plan not yet smoke-confirmed | Could break the core new-user path. | Run clean first-run smoke with caseId continuity checks. |
| Returning-user `/cases` to Detail / Continue Case not yet smoke-confirmed | Could break returning-user case access. | Run returning-user CasesPage smoke and verify routing remains stable. |
| Receipt ready / not-ready behavior not fully smoke-confirmed on clean samples | Could cause incorrect receipt eligibility. | Run clean ready and clean not-ready receipt UI smoke. |
| Verification unlock from eligible receipt not yet smoke-confirmed | Could cause incorrect verification eligibility or premature unlock. | Run eligible receipt to VerificationPage unlock smoke and locked ineligible smoke. |
| Identity/email/case binding not yet smoke-confirmed across first-run and returning-user paths | Could break caseId continuity or lose customer identity. | Run identity smoke for first-run, returning user, switched email, and restored case paths. |
| Payment scope boundaries not yet smoke-confirmed | Could create payment state contradictions. | Confirm $9 workspace renewal, $29 receipt activation, and formal verification payment cannot cross-unlock each other. |

The CasesPage green trial bar / trial status bar is not a true release blocker.

## 2. Pre-Release Smoke Required

These are not necessarily bugs, but they must be tested before broader release:

- New user diagnostic -> result -> case plan.
- Returning user -> CasesPage.
- Case detail -> receipt.
- Receipt ready state.
- Receipt not-ready state remains locked / not prematurely issuable.
- Verification unlock from eligible receipt.
- Verification locked state from ineligible receipt.
- Backend `/cases` aggregation consistency.
- Backend `/case/:caseId` and `/cases` readiness consistency.
- Identity/email/case binding consistency.
- Email switch and restored case access.
- Production `/trial-status?email=...` safe response.
- Payment dry-run or controlled test path for $9, $29, and verification payment scope separation.

Smoke should record:

- caseId continuity
- email used
- route entered
- expected UI state
- backend status where relevant
- whether any receipt or verification eligibility changed

## 3. Guarded But Deferred

These items are documented or protected by guards, but are not required for this release:

- CasesPage green trial bar / trial status bar.
  - Contract defined.
  - Smoke guard present.
  - UI implementation deferred.
  - Not a release blocker.
- Pilot-level summary entry UI.
- Pilot summary modal.
- Trial payment prompt disappearance UI.
- Deeper paid / dismissed / converted lifecycle handling.
- Merging trial status into `/cases`, if ever needed.
- Expanded production-style runtime fixture coverage for trial summary states.

These should remain deferred unless a blocker smoke proves they are required for the main product path.

## 4. Deferred Polish

Deferred polish includes:

- UI refinement.
- Copy tuning.
- Dashboard polish.
- CasesPage green bar visual styling.
- Payment prompt polish.
- Summary presentation polish.
- Future monetization expansion.
- Optional animations.
- Layout polish that does not affect core routing or eligibility.

Do not start polish until release blocker smoke is complete.

## 5. Do-Not-Touch List

Do not modify these in the next phase unless a smoke test proves a blocker:

- CasesPage trial green bar.
- Pilot summary paid disappearance logic.
- $9 / $29 payment scope redesign.
- Non-essential UI animation or layout polish.
- Broad refactor of case routing.
- Receipt gating rewrite.
- Verification gating rewrite.
- Receipt eligibility rules.
- Verification eligibility rules.
- `/cases` aggregation behavior.
- Scoring thresholds.
- Backend data files.
- Route constants.

Any rewrite of receipt or verification gating must be driven by a reproduced blocker, not by speculative cleanup.

## 6. Recommended Next Action

Next practical step: create and run a broader release smoke checklist.

This is preferred over new feature implementation because the current release risk is confidence in main product paths, not missing UI.

The checklist should cover:

- new-user diagnostic -> result -> case plan
- returning-user -> CasesPage -> Detail / Continue Case
- case detail -> receipt
- ready and not-ready receipt states
- verification unlock from eligible receipt
- backend `/cases` aggregation consistency
- identity/email/case binding
- production `/trial-status` safe response
- payment scope separation smoke

Do not implement the CasesPage green trial bar before this smoke checklist is complete.
