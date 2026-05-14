# Nimclea Receipt Readiness Transition Contract v0.1

## 1. Purpose

This contract defines the intended Receipt readiness transition model.

It prevents Receipt readiness from being downgraded, overwritten, or misrepresented by payment, checkout, hydration, aggregation, or display-state logic.

Receipt readiness is an evidence and scoring state. Payment and checkout are commercial lifecycle states. UI rendering must preserve that separation.

## 2. Canonical Transition Chain

The canonical transition chain is:

no_event
-> event_captured
-> receipt_ready
-> receipt_checkout_started
-> receipt_paid_or_activated
-> verification_eligible

Each step may add new state, but later commercial or display states must not erase earlier evidence or readiness state.

## 3. State Ownership

`eventCaptured` / `eventCount`

Owned by event logs and case aggregation.

These fields indicate whether real evidence or workflow activity has been captured for the case.

`receiptEligible`

Owned by readiness scoring and evidence/event gating.

This field answers whether the case is eligible for Receipt issuance based on the readiness contract. It is not owned by payment or checkout.

`receiptStatus` / `stage`

Display and lifecycle status, derived from eligibility and persisted records.

These fields may describe where the case is in the Receipt lifecycle, but they must not contradict backend-owned readiness.

`paymentStatus`

Commercial checkout/payment lifecycle only.

This field describes checkout or payment state. It must not overwrite `receiptEligible`.

`paid`

Commercial activation flag only.

This field can show that a paid activation occurred. It must not be interpreted as the source of readiness scoring.

`verificationEligible`

Downstream unlock flag derived from valid receipt state and payment/activation requirements.

This field belongs after a valid Receipt state and required commercial activation have been satisfied.

## 4. Non-Downgrade Rules

- `checkout_created` must not downgrade `receipt_ready`.
- `paymentStatus` must not overwrite `receiptEligible`.
- `paid=false` must not mean `receiptEligible=false`.
- Missing payment must not erase readiness.
- Hydration loading must not briefly display insufficient state when backend readiness exists.
- `/cases` aggregation must preserve receipt readiness when `receiptRecords` or case records indicate readiness.
- ReceiptPage should not infer failure before hydration completes.

## 5. Display Precedence

Intended UI precedence:

- If `receiptEligible=true`: show ready/green readiness.
- If `eventCount > 0` but score below threshold: show evidence captured but not ready.
- If `checkout_created` and `receiptEligible=true`: show receipt ready with checkout started / activation pending, not downgrade.
- If `paid=true` or `paymentStatus` indicates paid/activated: show activated/paid receipt state.
- If `verificationEligible=true`: allow verification path.

## 6. Backend Aggregation Expectations

`/cases` and `/case/:caseId` should converge on the same readiness interpretation.

Relevant persisted and aggregation sources include:

- `backend/data/cases.json`
- `backend/data/eventLogs.json`
- `backend/data/receiptRecords.json`
- `backend/data/paymentRecords.json` if present
- `backend/server.js` aggregation behavior
- shared receipt/verification contract if already used by frontend

This document does not change those sources. It defines the expected interpretation that future backend aggregation, frontend hydration, and display logic should preserve.

## 7. Known Risk Cases

- Ready case becomes yellow after `checkout_created`.
- Paid receipt appears not ready.
- Event count exists but receipt card says insufficient.
- Frontend localStorage stale status conflicts with backend.
- Deep link loads ReceiptPage before backend hydration finishes.
- `/cases` card and ReceiptPage disagree.

## 8. Future Regression Guard Recommendation

A future 15-A4 or later smoke script should check:

- ready is not downgraded by `checkout_created`
- paid does not erase readiness
- `eventCaptured` and `receiptEligible` remain distinct
- `/cases` and `/case/:caseId` agree on receipt readiness
