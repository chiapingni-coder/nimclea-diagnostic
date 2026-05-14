# Nimclea Backend Trial Status Endpoint Contract v0.1

## 1. Purpose

This contract defines a future read-only backend endpoint that exposes the normalized trial status object to CasesPage.

The endpoint should use `buildTrialStatus` later, after the endpoint contract is guarded and implementation is explicitly approved.

The endpoint must not mutate trial, case, payment, receipt, verification, scoring, route, or `/cases` records or behavior.

## 2. Proposed Endpoint

Future endpoint:

```http
GET /trial-status?email=...
```

Required current input:

- `email`

Optional future input:

- `userId`, only when backend identity is stable enough.

Input rules:

- `email` must be normalized server-side with trim + lowercase.
- Missing email should return a safe failure response, not inferred identity.
- Malformed email should return a safe failure response, not inferred identity.
- The endpoint must not depend on frontend localStorage.
- The endpoint must not infer identity from case titles, display names, route text, button text, visual labels, or PilotResultPage presence.

## 3. Proposed Response Shape

Success response:

```json
{
  "success": true,
  "data": {
    "trialActive": false,
    "trialStartedAt": null,
    "trialEndsAt": null,
    "trialDay": null,
    "trialEnded": false,
    "casesCreatedDuringTrial": 0,
    "pilotSummaryAvailable": false,
    "pilotSummaryPaid": false,
    "shouldShowTrialStatusBar": false,
    "shouldShowPilotSummaryEntry": false,
    "source": "none"
  }
}
```

The success `data` object must always use the canonical `buildTrialStatus` output shape:

```js
{
  trialActive: boolean,
  trialStartedAt: string | null,
  trialEndsAt: string | null,
  trialDay: number | null,
  trialEnded: boolean,
  casesCreatedDuringTrial: number,
  pilotSummaryAvailable: boolean,
  pilotSummaryPaid: boolean,
  shouldShowTrialStatusBar: boolean,
  shouldShowPilotSummaryEntry: boolean,
  source: string
}
```

Safe failure response for missing/invalid email:

```json
{
  "success": false,
  "error": "email_required",
  "data": {
    "trialActive": false,
    "trialStartedAt": null,
    "trialEndsAt": null,
    "trialDay": null,
    "trialEnded": false,
    "casesCreatedDuringTrial": 0,
    "pilotSummaryAvailable": false,
    "pilotSummaryPaid": false,
    "shouldShowTrialStatusBar": false,
    "shouldShowPilotSummaryEntry": false,
    "source": "none"
  }
}
```

## 4. Data Sources

Future source inputs:

- `trials.json` / trial lifecycle records as primary lifecycle source.
- `cases.json` as case count and relationship support.
- `emailLogs.json` as relationship support only, not lifecycle truth.
- `paymentRecords.json` and `subscriptionRecords.json` only for explicitly scoped workspace/trial continuation or pilot-summary payment state.
- No frontend localStorage.
- No route text, button text, visual labels, or PilotResultPage presence.

The endpoint should not expose raw source records.

## 5. Endpoint Behavior

The future endpoint should:

- load existing data read-only
- pass data into `buildTrialStatus`
- return the helper output under `data`
- use backend time for `now`
- return safe hidden UI defaults when data is missing or weak
- never create, update, delete, reorder, repair, backfill, or promote records

The endpoint should prefer hiding trial UI over guessing lifecycle state.

## 6. Safety Boundaries

The endpoint must not:

- write files
- mutate trial records
- create cases
- create summary data
- mark payment as paid
- change receipt behavior
- change verification behavior
- change scoring behavior
- change payment behavior
- change routing behavior
- change `/cases` aggregation behavior
- connect to frontend UI in the same step
- use generic paid fields as `pilotSummaryPaid`
- treat receipt activation payment as pilot summary payment
- treat formal verification payment as pilot summary payment
- infer lifecycle from PilotResultPage existence

The endpoint is a read-only adapter over `buildTrialStatus`, not a lifecycle transition route.

## 7. Relationship With `/cases`

- `/cases` remains unchanged for now.
- `/trial-status` is a separate read-only status source.
- CasesPage may later call `/trial-status` in a frontend adapter step.
- Do not merge trial status into `/cases` until endpoint behavior is proven.
- Do not let `/trial-status` alter `/cases` aggregation, case card routing, Detail behavior, receipt readiness, verification eligibility, scoring, or payment state.

## 8. Error Handling

- Missing email returns `success: false` with the safe default object.
- Malformed email returns `success: false` with the safe default object.
- Missing data files should not crash the endpoint.
- Corrupt or invalid records should be ignored.
- Internal read errors should be logged server-side if needed, but raw internal file errors should not be exposed to the frontend.
- The endpoint should avoid exposing internal file paths.
- The endpoint should prefer hiding UI over guessing lifecycle state.

## 9. Security and Privacy Boundary

The endpoint should only return normalized status fields.

It should not return:

- raw trial records
- raw payment records
- raw subscription records
- raw case contents
- raw email logs
- internal file paths
- payment provider payloads
- Stripe session, customer, subscription, or webhook payload details

## 10. Recommended 16-A13

Recommended next step: A) endpoint contract smoke guard.

Why:

- The endpoint contract should be locked before any route is added.
- The guard can require safe failure response shape, read-only boundaries, and `/cases` separation.
- It can prevent accidental endpoint implementation that exposes raw records or trusts generic paid fields.
- It preserves the helper-first, endpoint-later architecture.
- It keeps frontend adapter work deferred until the backend contract is guarded.

Do not implement the endpoint until the endpoint contract guard exists and passes.
