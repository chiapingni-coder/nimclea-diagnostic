# Nimclea 7-Day Trial Lifecycle Contract v0.1

## 1. Scope

This contract governs the 7-day trial lifecycle:

- how the trial starts
- how the trial status is shown during the 7 days
- how the trial exit summary entry appears
- how the trial exit entry disappears after workspace renewal

It does not govern workspace access. Workspace access is governed by the Workspace Access Contract.

## 2. First ResultPage Definition

The first Diagnostic ResultPage remains a normal diagnostic result page.

It is not a completely separate page state.

The first-run trial opening is only reflected through:

- primary CTA label: Start 7-day pilot
- an additional lightweight 7-day trial / pilot explanation

All normal diagnostic result content remains unchanged:

- diagnosis summary
- weakest area
- what to do next
- signals
- Save Case
- Case Plan preview

## 3. First Case vs Later Case CTA Labels

First case:

Start 7-day pilot
-> enters the first Case Plan

Second and later cases:

Start a case
-> enters that case's Case Plan

Case Plan = the execution plan for one individual case.

Pilot Plan should not be used as the main user-facing concept for the whole 7-day trial.

## 4. ResultPage Misclassification Rule

A generated caseId alone must not turn the first ResultPage into returning / regular case review.

Forbidden logic:

has caseId
-> treat as existing case review
-> hide trial explanation
-> show Continue Case

Correct logic:

first Diagnostic completed + generated caseId
-> normal ResultPage
-> CTA is Start 7-day pilot
-> 7-day trial explanation remains visible

Only explicit workspace / case-review signals may trigger regular case review, such as:

- from=case
- mode=caseReview
- location.state.from === "case"
- location.state.mode === "caseReview"
- location.state.caseItem exists
- explicitly opened from CasesPage

## 5. First ResultPage Review Rule

After 7 days, if the customer renews / workspace becomes active:

- when reviewing the first case ResultPage, the 7-day trial explanation disappears
- the page becomes normal Result / case review

After 7 days, if the customer does not renew:

- the first ResultPage keeps the original 7-day trial explanation
- no extra trial-ended ResultPage state is required
- no extra renewal prompt is required on ResultPage

Simplified rule:

Unrenewed: keep original trial explanation.

Renewed: remove trial explanation and show normal review state.

## 6. CasesPage 7-Day Trial Status Bar

After the 7-day trial starts, CasesPage shows a pilot-level status bar under the dashboard/control area.

It is:

- pilot-level
- not case-level
- not attached under a specific case card
- part of the 7-day trial lifecycle

Day 1 to Day 6 should show one lightweight single-line status:

7-day pilot: Day X of 7 · N cases created

Important UI rule:

Do not split this into two rows.

Keep it single-line, light, breathable, and non-alarming.

The v0.1 progress variable is only case count.

## 7. Trial Exit Summary Entry

After the 7-day trial ends, the pilot-level status bar becomes a light-green exit entry:

7-day pilot summary

This entry is:

- pilot-level
- trial-level
- the 7-day trial lifecycle exit

It is not:

- a specific case summary
- a case-level row
- a replacement for PilotResultPage
- a user-deletable notification

Clicking it opens the 7-day trial global summary and guides the customer to renew / continue.

## 8. Exit Entry Disappearance Rule

After the customer completes workspace renewal / continuation payment:

- the pilot-level light-green 7-day pilot summary upsell entry automatically disappears

It must be:

- automatic disappearance
- not conversion
- not Continue to Receipt
- not Open case
- not Receipt ready
- not user deletion
- not Dismiss

After the entry disappears:

- the customer no longer sees the summary through that entry
- the entry's lifecycle mission is complete

## 9. PilotResultPage Definition

PilotResultPage is the result summary page for one individual case.

It:

- does not mix other cases
- is not the global 7-day pilot summary
- does not own the CasesPage pilot-level exit entry logic
- does not change because the pilot-level summary entry appears or disappears

## 10. One-Sentence Contract

The first ResultPage remains a normal diagnostic result page, with only the Start 7-day pilot CTA and a lightweight 7-day trial explanation added; during the 7 days, CasesPage shows a single-line pilot-level status bar, “7-day pilot: Day X of 7 · N cases created”; after the 7 days, that status becomes a light-green pilot-level 7-day pilot summary exit entry; after renewal, that entry automatically disappears.
