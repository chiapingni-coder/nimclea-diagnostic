# Nimclea Frontend Trial Status Adapter Contract v0.1

## 1. Purpose

This contract defines the future frontend adapter for reading normalized trial status from the backend.

The adapter should allow CasesPage to display the 7-day trial status without deriving lifecycle state from scattered local UI state, route state, button labels, case cards, payment fields, or PilotResultPage presence.

This contract does not implement the trial status bar, connect CasesPage to `/trial-status`, or change frontend behavior.

## 2. Proposed Adapter Name and Responsibility

Recommended adapter:

```js
getTrialStatusDisplayModel({ email })
```

The adapter should:

- receive the currently resolved email from CasesPage
- call `GET /trial-status?email=...`
- validate the backend response shape
- normalize failures into a safe hidden display model
- pass only display-safe fields back to CasesPage

Recommended location:

- `frontend/lib/trialStatusApi.js`

Reason:

- `frontend/lib/trialApi.js` already exports the project API base pattern through `API_BASE`.
- A sibling `trialStatusApi.js` can import `API_BASE` from `./trialApi` and avoid duplicating inconsistent API base logic.
- Keeping the display-model adapter separate from existing trial mutation helpers reduces risk of accidentally changing `registerTrialUser`, `startTrial`, `saveCaseSnapshot`, or event logging behavior.

Alternate acceptable future implementation:

- add `getTrialStatusDisplayModel({ email })` to `frontend/lib/trialApi.js` if the project prefers one shared trial API module.

Do not create a CasesPage-local fetch helper unless there is a later explicit reason.

## 3. Backend Endpoint Contract

The adapter should call:

```http
GET /trial-status?email=...
```

It must expect:

```js
{
  success: boolean,
  error?: string,
  data: {
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
}
```

The adapter must treat the backend `data` object as the only authority for trial lifecycle display.

## 4. Email Source Boundary

CasesPage should pass the currently resolved email into the adapter.

The adapter may normalize email client-side for request hygiene:

- trim whitespace
- lowercase
- URL encode the query value

The backend remains the authority for validation, identity matching, and lifecycle state.

The adapter must not:

- invent identity
- infer trial state from localStorage
- read localStorage to decide trial active, trial day, or summary availability
- infer identity from route text, button text, visual labels, case titles, display names, or PilotResultPage presence

If email is missing, blank, or unusable, the adapter should return a safe hidden display model and avoid noisy UI.

## 5. API Base Handling

The adapter should follow the existing frontend API base pattern.

Current shared pattern:

```js
export const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
```

The adapter should reuse this pattern, preferably by importing `API_BASE` from `frontend/lib/trialApi.js`.

The adapter must not:

- hardcode the production Render URL directly
- introduce a second incompatible environment variable
- duplicate inconsistent API base logic in CasesPage
- bypass the existing Vite environment convention

## 6. Safe Frontend Display Model

Recommended frontend-safe model:

```js
{
  loading: boolean,
  error: string | null,
  trialActive: boolean,
  trialDay: number | null,
  trialEnded: boolean,
  casesCreatedDuringTrial: number,
  shouldShowTrialStatusBar: boolean,
  shouldShowPilotSummaryEntry: boolean,
  pilotSummaryAvailable: boolean,
  pilotSummaryPaid: boolean,
  source: string
}
```

Safe hidden model:

```js
{
  loading: false,
  error: null,
  trialActive: false,
  trialDay: null,
  trialEnded: false,
  casesCreatedDuringTrial: 0,
  shouldShowTrialStatusBar: false,
  shouldShowPilotSummaryEntry: false,
  pilotSummaryAvailable: false,
  pilotSummaryPaid: false,
  source: "none"
}
```

Result handling:

| Situation | Adapter result |
| --- | --- |
| Missing email | Return safe hidden model without calling the endpoint, unless later implementation chooses to call and consume the backend safe failure response. |
| Network failure | Return safe hidden model with `error` set to a non-user-facing diagnostic string. |
| Backend `success=false` | Return safe hidden model; preserve `source: "none"` when provided. |
| Malformed response | Return safe hidden model with `error` set. |
| Backend `success=true` | Return validated normalized display fields from `data`. |

Required direction:

- failure states hide trial UI
- adapter must never fabricate `trialDay`
- adapter must never fabricate `casesCreatedDuringTrial`
- adapter should prefer hidden UI over guessed lifecycle state
- adapter should not expose raw backend errors to user-facing UI

## 7. Loading and Error Behavior

CasesPage should not flash incorrect trial UI while loading.

Allowed loading behavior:

- hide the bar while loading
- or use a tiny neutral placeholder only after a later UI step approves that behavior

Loading must not:

- show `Trial Day X of 7`
- show `Cases created: N`
- show the pilot summary entry
- change case card routing

Error behavior:

- error must not block CasesPage rendering
- error must not alter case card Detail buttons
- error must not alter foldout behavior
- error must not show the trial summary entry
- error must not change receipt, verification, scoring, payment, or `/cases` behavior

## 8. CasesPage Boundary

CasesPage may later consume the adapter output to display:

- `Trial Day X of 7`
- `Cases created: N`
- pilot-level summary entry only when `shouldShowPilotSummaryEntry` is true

CasesPage must not:

- calculate trial lifecycle itself
- mutate trial status
- alter case cards
- alter Detail buttons
- alter foldout behavior
- alter routes
- alter payment state
- alter receipt behavior
- alter verification behavior
- alter scoring behavior
- alter `/cases` behavior
- replace PilotResultPage

CasesPage should remain a consumer of the normalized display model, not the owner of trial lifecycle truth.

## 9. Pilot Summary Entry Boundary

`shouldShowPilotSummaryEntry` is controlled by the backend response.

The frontend should not decide summary availability from:

- PilotResultPage existence
- localStorage trial session
- route state
- case card labels
- payment button labels
- generic paid fields

The summary entry is a pilot-level entry on CasesPage. It is not a replacement for PilotResultPage.

Payment prompt disappearance must be driven by backend normalized paid / converted state later, not by UI deletion, local dismiss state, or hidden frontend-only flags.

## 10. Security and Privacy

The adapter should ignore unexpected raw records if the backend ever returns them.

The adapter should not store raw records in localStorage, including:

- raw trial records
- raw payment records
- raw subscription records
- raw case records
- raw email logs
- provider payloads

The adapter should not expose backend errors directly to user-facing UI.

The adapter should only pass normalized display fields to CasesPage.

## 11. Recommended 16-A17

Recommended next step: A) frontend adapter contract smoke guard.

Why:

- The backend endpoint is implemented and guarded, but the frontend adapter contract should be locked before any UI connection.
- A smoke guard can protect the email boundary, API base boundary, safe hidden model, and CasesPage non-ownership rules.
- It keeps CasesPage unchanged until the adapter contract is stable.
- It reduces the risk of reintroducing localStorage-derived trial lifecycle state.
- It preserves the current separation between `/trial-status` and `/cases`.
- It keeps the trial status bar implementation deferred to a later explicit UI step.

Do not implement the adapter or CasesPage UI until the frontend adapter contract smoke guard exists and passes.
