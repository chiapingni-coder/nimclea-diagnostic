# Nimclea CasesPage 7-Day Trial Status Bar Contract v0.1

## Purpose

This contract defines the UI and semantic boundaries for a future 7-day trial status bar on `CasesPage`. It is documentation-only and does not implement runtime UI, payment behavior, routing, or data changes.

## 1. Placement

The trial status bar belongs on `CasesPage`.

It should appear below the top Cases header/action area and above the `Active Cases` / `Baseline Records` / `Historic Records` tabs.

It must not appear inside individual case cards.

It must not replace `PilotResultPage` or `ResultPage`.

## 2. Core Display During Active Trial

During an active 7-day trial, the UI should be a lightweight shallow green / soft status bar.

The primary text must keep `Trial Day X of 7` and `Cases created: N` on the same line where displayed.

Recommended compact text:

```text
Trial Day X of 7 · Cases created: N
```

The bar should include a secondary button:

```text
7-day pilot details
```

## 3. Details Button Behavior

Clicking `7-day pilot details` should open a lightweight modal or expandable panel.

During days 1-6, the details surface should explain:

- what the 7-day pilot means
- what users can do during the trial
- what counts as progress
- that `ResultPage` is only the first entry point, not the ongoing trial surface

The details surface should not show payment pressure during days 1-6.

## 4. Day 7 / Trial-Ended Behavior

On day 7 or after the trial ends, the bar may shift from details-oriented to summary-oriented.

The button may become:

```text
View 7-day pilot summary
```

The summary entry belongs to `CasesPage` as a pilot-level lifecycle surface.

It must not replace `PilotResultPage`.

It must not delete `PilotResultPage` or case history.

## 5. Payment Boundaries

Payment behavior is deferred.

This contract reserves future logic for `$9` / `$29` or summary/payment prompts, but it must not implement or decide payment logic.

This contract must not mix verification payment, receipt payment, workspace renewal, and summary prompt behavior.

## 6. Visibility Rules

Show the status bar only when a trial session exists or can be inferred safely.

Do not show it for normal returning users without an active or recently ended 7-day trial.

Do not show it for zero-case users who are being redirected to Diagnostic.

Do not depend on `ResultPage` review state.

## 7. Non-Goals

This contract does not:

- change `ResultPage` CTA behavior
- change Receipt readiness
- change Verification gating
- change payment logic
- implement summary generation
- alter case routing

## 8. Implementation Notes For Future 17-E2

Preferred future data inputs:

- `getTrialSession()`
- `savedEmail` / `resolvedEmail`
- visible active cases count
- `trialStartedAt` / `createdAt` / `trialStartedAt` fallback

The UI should be guarded and non-blocking.

If dates are missing, do not guess aggressively.

If trial day cannot be computed safely, hide the day count rather than showing misleading data.
