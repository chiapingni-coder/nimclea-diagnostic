# Nimclea CasesPage Trial Status Bar UI Implementation Contract v0.1

## 1. Purpose

This contract defines the UI implementation rules for a lightweight CasesPage trial status bar.

The bar should later consume the already implemented frontend adapter output from `getTrialStatusDisplayModel({ email })`.

This contract exists to prevent the status bar from accidentally changing case cards, Detail routing, foldouts, payment, receipt, verification, scoring, routes, or `/cases` behavior.

This contract does not implement UI, connect CasesPage to the adapter, or add a pilot summary entry.

## 2. Intended Insertion Point

Later implementation should insert the trial status bar in `frontend/pages/CasesPage.jsx`:

- inside the main CasesPage container
- inside the existing page shell
- after the workspace header / dashboard control area that contains `Cases`, Manage Plan, Create new case, and Switch email
- above the Active Cases list / case cards
- before `Active Cases (...)`, `Baseline Records (...)`, and `Historic Records (...)`

The bar must not be:

- outside the page shell
- floating independently
- inside an individual case card
- inside foldout content
- inside case action controls
- a replacement for any existing heading, button, or case list content

The insertion should be one isolated block in the page content flow.

## 3. Data Source

The UI must use `getTrialStatusDisplayModel({ email })` later.

CasesPage must pass the resolved email into the adapter.

CasesPage must not:

- call `/trial-status` directly if the adapter exists
- call `/cases` for trial lifecycle state
- derive trial lifecycle from localStorage
- derive trial lifecycle from route text
- derive trial lifecycle from button text
- derive trial lifecycle from visual labels
- derive trial lifecycle from PilotResultPage existence
- infer payment, receipt, verification, or score state from the trial bar

The adapter output is the only allowed source for trial status bar visibility, trial day, case count, and pilot summary entry flags.

## 4. Display Condition

Show the trial status bar only when adapter output has:

```js
shouldShowTrialStatusBar === true
```

Hide the bar when:

- email is missing
- adapter is in a loading hidden state
- network failure occurs
- backend returns `success: false`
- backend data is malformed
- `source === "none"`
- `trialDay === null` during active trial display

Failure states must not:

- block CasesPage rendering
- show the pilot summary entry
- alter case cards
- alter page access
- alter routing
- alter payment, receipt, verification, scoring, or `/cases` behavior

## 5. Required Bar Content

During active trial, the bar must display one lightweight line with:

- `Trial Day X of 7`
- `Cases created: N`

Active trial example:

```text
Trial Day X of 7 · Cases created: N
```

Required semantic direction:

- `Trial Day X of 7` and `Cases created: N` must be on the same visual line.
- Do not split them into two stacked rows.
- Keep the bar lightweight and green-tinted.
- Do not make it a large hero banner.
- Do not use scary warning styling.
- Do not introduce payment copy during active trial.
- Do not attach the bar to a specific case card.

## 6. Trial Day Display Rules

Use `trialDay` from adapter output only.

CasesPage must not:

- calculate `trialDay`
- clamp `trialDay`
- fabricate `trialDay`
- use client time to correct backend result
- use local trial session timestamps to override adapter output

If `trialDay` is `null`, hide the active trial bar.

## 7. Case Count Display Rules

Use `casesCreatedDuringTrial` from adapter output.

CasesPage must not:

- recalculate trial case count from visible case cards
- use total case count unless backend / adapter says so
- mutate cases to compute the display
- count evidence events as cases
- count receipts as cases
- count paid verifications as cases

The displayed case count is a trial/workspace lifecycle count, not a case-card aggregation shortcut.

## 8. Loading and Error Behavior

Initial implementation should avoid flashing incorrect trial UI.

Loading behavior:

- hide the bar by default
- do not show `Trial Day X of 7`
- do not show `Cases created: N`
- do not show the pilot summary entry
- defer any neutral placeholder unless separately approved

Error behavior:

- do not surface raw backend error text to the user
- do not block CasesPage rendering
- do not alter case card routing
- do not alter Detail buttons
- do not alter page access
- do not show the pilot summary entry
- do not change payment, receipt, verification, scoring, routes, or `/cases` behavior

## 9. Pilot Summary Entry Behavior

Show a pilot-level summary entry only when adapter output has:

```js
shouldShowPilotSummaryEntry === true
```

The summary entry should:

- appear as part of the trial status area or directly associated with it
- remain CasesPage-level UI
- not appear inside individual case cards
- not replace PilotResultPage
- not create summary data
- not delete summary data
- not mutate summary data
- not decide summary availability from PilotResultPage existence
- not treat UI dismissal as payment
- not show a payment prompt entry when `pilotSummaryPaid === true`

The summary entry is a pilot-level lifecycle entry, not a case-level row.

## 10. Copy Boundaries

Safe minimal copy:

Active trial:

```text
Trial Day X of 7 · Cases created: N
```

Summary available and unpaid:

```text
7-day pilot summary available · Review summary
```

Copy must not imply:

- receipt issuance
- formal verification
- payment success
- case approval
- certification
- score improvement
- readiness promotion

Copy must not replace or blur ResultPage, PilotResultPage, Receipt, or Verification terminology.

## 11. Styling Boundary

The status bar should be:

- lightweight
- green-tinted
- calm in tone
- compact in vertical height
- inside the page content container
- responsive enough not to break mobile layout
- visually distinct from individual case cards
- visually distinct from payment warnings

`Trial Day X of 7` and `Cases created: N` should remain on the same line where space permits.

If wrapping is unavoidable on narrow screens:

- keep both pieces visually grouped
- avoid stacked-card treatment
- avoid large banner height
- avoid warning styling

## 12. CasesPage No-Touch Boundaries

CasesPage implementation must not:

- alter case cards
- alter Active Cases heading logic
- alter Detail button behavior
- alter Continue Case behavior
- alter foldout behavior
- alter Redo Diagnostic placement
- alter Archive case placement
- alter View all cases capsule
- alter case sorting
- alter case status labels
- alter `/cases` fetch behavior
- alter routing
- alter payment state
- alter receipt behavior
- alter verification behavior
- alter scoring behavior
- alter PilotResultPage

The first UI implementation must be an additive workspace-level surface only.

## 13. Implementation Sequencing

Recommended later implementation should be minimal:

- import `getTrialStatusDisplayModel`
- add isolated state for `trialStatusDisplayModel`
- call the adapter only when resolved email exists
- render one isolated `TrialStatusBar` block above the Active Cases list
- avoid changing existing case card JSX except for the insertion point
- avoid changing Detail routing
- avoid changing foldout logic
- avoid changing case list grouping or sorting
- avoid payment actions in the first UI implementation
- avoid a modal in the first UI implementation unless separately contracted

The first implementation should connect display only. It should not create new lifecycle transitions.

## 14. Recommended 16-A21

Recommended next step: A) CasesPage trial status bar UI contract smoke guard.

Why:

- The adapter and backend endpoint are implemented and guarded, but CasesPage UI remains disconnected.
- A contract smoke guard can lock insertion point, data-source, copy, styling, and no-touch boundaries before JSX changes.
- It prevents the next UI step from accidentally editing case cards, Detail routing, foldouts, payment, receipt, verification, scoring, or `/cases`.
- It protects the single-line `Trial Day X of 7 · Cases created: N` requirement before implementation.
- It keeps pilot summary entry behavior bounded before any summary UI is added.
- It preserves a clean sequence: contract, guard, then minimal UI implementation.

Do not implement the CasesPage trial status bar UI until the 16-A21 smoke guard exists and passes.

## 15. Recommended 16-A22

Recommended next step after the 16-A21 smoke guard passes: minimal CasesPage UI implementation.

16-A22 should:

- import adapter `getTrialStatusDisplayModel`
- add isolated state for `trialStatusDisplayModel`
- call the adapter only when resolved email exists
- render one isolated `TrialStatusBar` block above the Active Cases list
- preserve the same-line `Trial Day X of 7 · Cases created: N` copy
- keep the implementation additive and workspace-level

16-A22 must not:

- add payment actions
- add a modal
- alter case cards
- alter Detail button behavior
- alter Continue Case behavior
- alter foldout behavior
- alter routing
- alter `/cases` behavior
- alter payment, receipt, verification, scoring, or PilotResultPage behavior

In short: no payment actions and no modal in 16-A22.
