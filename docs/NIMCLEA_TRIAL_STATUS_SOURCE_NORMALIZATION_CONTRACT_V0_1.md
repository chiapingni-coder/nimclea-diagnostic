# Nimclea Trial Status Source Normalization Contract v0.1

## 1. Purpose

CasesPage needs one normalized trial status object before the CasesPage trial status bar can be implemented safely.

The status bar should not infer trial lifecycle from scattered UI state, button labels, page routes, visual status labels, or whether PilotResultPage exists.

This contract defines the read-only status shape and source precedence that should sit between backend trial lifecycle data and the CasesPage UI.

## 2. Canonical Normalized Shape

Recommended read-only shape:

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

Field definitions:

| Field | Meaning |
| --- | --- |
| `trialActive` | True only when the normalized source says the 7-day trial is currently active. |
| `trialStartedAt` | ISO timestamp for when the 7-day trial started, or null when no started trial is known. |
| `trialEndsAt` | ISO timestamp for when the 7-day trial ends, or null when no active/started trial end is known. |
| `trialDay` | Integer day number for active display, bounded from 1 to 7; null when the trial is not displayable. |
| `trialEnded` | True when the normalized source says the 7-day trial window has ended. |
| `casesCreatedDuringTrial` | Count of non-archived, non-deleted cases created inside the trial/workspace context. |
| `pilotSummaryAvailable` | True when a pilot-level summary entry exists or can be opened. |
| `pilotSummaryPaid` | True when the continuation/renewal/payment state has completed the summary entry's upsell mission. |
| `shouldShowTrialStatusBar` | True when CasesPage should show the lightweight one-line trial status bar. |
| `shouldShowPilotSummaryEntry` | True when CasesPage should show the pilot-level summary entry rather than the active trial status bar. |
| `source` | Human-readable provenance such as `backend_trial_record`, `backend_cases_aggregation`, `local_trial_session_fallback`, or `unavailable`. |

## 3. Source Precedence

Safe precedence for deriving the normalized object:

1. Primary: backend-derived trial lifecycle record.
   - Preferred source is `backend/data/trials.json` or a future normalized read endpoint.
   - Existing trial start behavior writes `status`, `startedAt`, and `expiresAt`.
   - This should own `trialActive`, `trialStartedAt`, `trialEndsAt`, `trialDay`, and `trialEnded`.
2. Secondary: backend `/cases` aggregation.
   - Use only for case relationship and `casesCreatedDuringTrial`.
   - It may also help associate cases with user/workspace/trial context.
   - It should not be the sole authority for trial active/ended status.
3. Tertiary: localStorage / `getTrialSession()`.
   - Temporary fallback only.
   - Useful for continuity while the backend source is missing or unreachable.
   - Not authoritative when backend trial state exists.

Forbidden sources:

- button text
- page route
- visual status labels
- PilotResultPage presence
- case card labels
- receipt, verification, payment, or score status alone

## 4. CasesPage Responsibility Boundary

CasesPage may display:

- `Trial Day X of 7`
- `Cases created: N`
- pilot-level summary entry only when available and unpaid / applicable

CasesPage must not:

- mutate trial state
- calculate payment truth
- replace PilotResultPage
- alter case card Detail routing
- alter receipt, verification, scoring, or payment behavior
- create or delete summary data

CasesPage should consume a normalized read-only object and render only the workspace-level status surface described by the CasesPage trial status bar contract.

## 5. Lifecycle Rules

- During day 1 to day 7: show the lightweight trial status bar.
- Keep `Trial Day X of 7` and `Cases created: N` on the same line.
- Summary entry should not appear before final day / trial end.
- After paid/dismissed/converted state, the pilot-level payment prompt entry should disappear.
- Summary data itself is not deleted.

Visibility mapping:

| Normalized state | CasesPage display |
| --- | --- |
| `trialActive=true`, `trialDay` 1-7, `shouldShowTrialStatusBar=true` | Show one-line status bar. |
| `trialEnded=true`, `pilotSummaryAvailable=true`, `pilotSummaryPaid=false` | Show pilot-level summary entry / continuation prompt. |
| `pilotSummaryPaid=true` | Hide the pilot-level payment prompt entry; preserve summary data elsewhere. |
| No reliable trial source | Do not show trial lifecycle UI. |

## 6. Current Data Gaps

| Data need | Current status | Notes |
| --- | --- | --- |
| Trial start timestamp | Partially available | `backend/data/trials.json` and `/trial/start` have `startedAt`; CasesPage currently also reads local `getTrialSession()` timestamps. No normalized CasesPage read source exists yet. |
| Trial end timestamp | Partially available | `/trial/start` writes `expiresAt`; CasesPage currently derives `pilotWindowEnded` from local start time rather than a normalized backend read. |
| Trial day calculation | Partially available | Can be calculated from `startedAt`/`expiresAt`, but no shared normalized helper currently owns the bounded 1-7 day value for CasesPage. |
| Trial active/ended state | Partially available | Trial records have `status` and timestamps; CasesPage uses local timing plus pilot extension access state. A canonical read object is missing. |
| Cases created during trial | Available / partially available | CasesPage has `workspaceCases`, visible groups, and case counts. Counting specifically within the trial/workspace context still needs a normalized definition for archived/deleted cases and trial association. |
| Pilot summary availability | Missing | No inspected source exposes a dedicated pilot-level summary availability flag for CasesPage. |
| Pilot summary paid/dismissed state | Missing / partially available | Pilot extension payment fields exist, but there is no normalized `pilotSummaryPaid` or dismissed/converted lifecycle field for the summary entry. |

## 7. Recommended 16-A7

Safest recommendation: A) backend read-only normalization helper / endpoint planning.

16-A7 should define a read-only backend normalization plan that maps existing trial records, case aggregation, and payment/continuation state into the canonical object from this contract.

Do not implement the CasesPage UI shell until this source is available or intentionally stubbed by a documented read-only adapter. Frontend adapter planning can follow, but a purely local adapter would preserve the current stale-state risk.

Implementation remains deferred until the trial source exists.
