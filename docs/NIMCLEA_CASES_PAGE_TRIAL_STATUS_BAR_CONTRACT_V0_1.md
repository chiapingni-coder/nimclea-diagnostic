# Nimclea CasesPage Trial Status Bar Contract v0.1

## 1. Purpose

The CasesPage trial status bar is a lightweight workspace-level indicator shown during the 7-day trial period.

It helps users keep context about the trial lifecycle without turning any single case card into the trial owner.

## 2. Ownership

- The trial status bar belongs to CasesPage.
- It is pilot/workspace-level UI.
- It is not part of a single case card.
- It does not replace PilotResultPage.
- It does not replace the future pilot-level summary entry.
- It does not control receipt readiness, verification eligibility, or payment activation.

## 3. Required Display Format

The status bar should display both trial progress and case count on one line:

Trial Day X of 7 · Cases created: N

Rules:

- "Trial Day X of 7" and "Cases created: N" must stay on the same line.
- Do not split them into two rows.
- Do not turn the status bar into a large banner.
- Do not add heavy explanation text.
- Keep it lightweight and calm.
- It should feel like a progress indicator, not a warning.

## 4. Visibility Rules

Intended visibility:

- Show during the active 7-day trial.
- Show after the first trial has started.
- Do not show before the user starts the 7-day pilot.
- Do not show as a special ResultPage state.
- Do not show inside individual case cards.
- Do not show as a replacement for case status labels.
- At the end of the trial, the status bar may transition into or sit near the pilot-level summary entry, but it must not become the summary itself.

## 5. Trial Day Calculation Principles

- Trial day should be derived from trial start timestamp or backend-owned trial state when available.
- It should not be guessed from local-only UI state if backend state exists.
- Day values should be bounded from 1 to 7 during active trial display.
- Expired trial behavior should be handled by the trial lifecycle / summary entry contract, not by this status bar alone.

## 6. Case Count Principles

- "Cases created: N" refers to cases created within the trial/workspace context.
- It should be counted consistently with CasesPage case aggregation.
- It should not count archived/deleted cases unless the product intentionally defines them as part of trial usage later.
- It should not be confused with evidence event count.
- It should not be confused with receipt count or paid verification count.

## 7. Non-Goals

This contract does not implement:

- the shallow green 7-day pilot summary entry
- the $9 / $29 payment rules
- receipt readiness
- verification unlock
- Stripe checkout
- backend trial expiration enforcement
- runtime fixture tests

## 8. Risk Cases This Contract Prevents

- trial progress shown inside each case card
- Trial Day and Cases created split into two rows
- oversized banner that overwhelms CasesPage
- status bar mistaken for a payment warning
- status bar mistaken for a single case status
- case count confused with evidence/event count
- trial status shown before the user starts the 7-day pilot
- status bar replacing the final pilot-level summary entry

## 9. Future Smoke Guard Recommendation

A future 16-A4 smoke guard should validate this contract text and check for required phrases:

- Trial Day X of 7
- Cases created: N
- same line
- workspace-level
- not inside individual case cards
- not a payment warning
- not the pilot-level summary entry
