# Nimclea Backend Trial Status Normalization Plan v0.1

## 1. Purpose

This plan defines how the backend should eventually produce one normalized, read-only trial status object for CasesPage.

The object should support the CasesPage trial status bar and pilot-level summary entry without letting frontend code infer lifecycle state from scattered fields, localStorage, visual labels, route state, button text, or PilotResultPage presence.

This is a planning document only. It does not implement backend behavior.

## 2. Proposed Backend Output Shape

The backend should produce the canonical shape from `docs/NIMCLEA_TRIAL_STATUS_SOURCE_NORMALIZATION_CONTRACT_V0_1.md`:

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

Backend field definitions:

| Field | Backend meaning |
| --- | --- |
| `trialActive` | Backend-normalized active trial state, preferably from a trial lifecycle record with `status: "active"` and valid timestamps. |
| `trialStartedAt` | ISO start timestamp from the selected trial record, or null when unavailable. |
| `trialEndsAt` | ISO end timestamp from the selected trial record, or null when unavailable. |
| `trialDay` | Integer 1-7 while the trial is active; null when no active displayable trial exists. |
| `trialEnded` | True when backend-normalized time/status says the 7-day trial window has ended. |
| `casesCreatedDuringTrial` | Count of cases tied to the same trial/user/email context and created during the trial window, excluding archived/deleted cases unless product rules change. |
| `pilotSummaryAvailable` | True when backend has or can safely expose a pilot-level trial summary entry. |
| `pilotSummaryPaid` | True when backend payment/continuation state says the summary upsell or renewal mission is completed. |
| `shouldShowTrialStatusBar` | True when active trial display should appear on CasesPage. |
| `shouldShowPilotSummaryEntry` | True when the active bar should give way to the pilot-level summary entry. |
| `source` | Backend provenance such as `backend_trial_record`, `backend_trial_record_with_cases`, `backend_trial_record_with_payment`, or `unavailable`. |

## 3. Recommended Backend Architecture

Safest option: C) both helper first, endpoint later.

Recommended sequence:

1. Build a read-only backend utility helper first.
   - It can be tested without changing route behavior.
   - It can consume existing JSON records and return the canonical object.
   - It avoids coupling the first pass to `/cases` response shape or a new public endpoint.
2. Add a dedicated read-only endpoint later, such as `GET /trial-status?email=...`.
   - This should happen only after helper behavior is stable.
   - The endpoint should return the helper output without side effects.
3. Decide later whether `/cases` should include the normalized object.
   - Do not change existing `/cases` behavior until the read model is proven and guarded.

This is safer than endpoint-first because `/cases` is already a complex aggregation surface and should not absorb new lifecycle authority before the normalization rules are isolated.

## 4. Source Inputs and Precedence

Planned source precedence:

1. `trials.json` or trial lifecycle record as primary source.
   - Existing registration creates `status: "registered"`, `createdAt`, `startedAt: null`, `expiresAt: null`, and `trialSessionId: null`.
   - Existing trial start writes `status: "active"`, `startedAt`, and `expiresAt`.
   - This should own trial start/end/day/active/ended fields.
2. `cases.json` and `/cases` aggregation only for case count and relationship.
   - Use for user/email/trial association and `casesCreatedDuringTrial`.
   - Do not use case card status labels as trial lifecycle truth.
3. `paymentRecords.json` or `subscriptionRecords.json` only for paid/converted/prompt disappearance state if reliable.
   - Stripe code distinguishes `pilot_extension`, `receipt_activation`, and `formal_verification`.
   - The helper must only trust records scoped to workspace/trial continuation for `pilotSummaryPaid`.
4. `emailLogs.json` only for relationship support.
   - It may help associate email and case history.
   - It must not own trial lifecycle truth.
5. localStorage must not be backend authority.

Forbidden backend derivation sources:

- frontend route state
- button labels
- visual card status text
- PilotResultPage existence
- receipt readiness
- verification eligibility
- generic payment status without payment type/scope

## 5. Field Derivation Rules

`trialStartedAt`

- Use selected trial record `startedAt` when it is a valid timestamp.
- Safe default: null.

`trialEndsAt`

- Use selected trial record `expiresAt` when it is a valid timestamp.
- If a future migration permits missing `expiresAt` but valid `startedAt`, a helper may derive `startedAt + 7 days` only if the contract explicitly allows that fallback.
- Safe default: null.

`trialDay`

- If `trialActive=true` and `trialStartedAt` is valid, calculate current day from backend time and bound it from 1 to 7.
- If trial is ended or timestamps are missing, return null.
- Safe default: null.

`trialActive`

- True when selected trial record is active and current backend time is before or equal to `trialEndsAt`.
- False when no selected active trial record exists.
- Safe default: false.

`trialEnded`

- True when selected trial record has ended by backend time or future explicit ended/expired status.
- False when no selected started trial record exists.
- Safe default: false.

`casesCreatedDuringTrial`

- Count cases associated with the selected trial/user/email context and created within the trial window.
- Exclude archived/deleted cases unless later product rules intentionally include them.
- Do not count evidence events, receipts, or paid verifications.
- Safe default: 0.

`pilotSummaryAvailable`

- True only when a backend-readable pilot-level summary source exists.
- Do not infer this from PilotResultPage existence alone.
- Safe default: false.

`pilotSummaryPaid`

- True only from a reliable workspace/trial continuation payment source.
- Payment source must distinguish trial/workspace continuation from `$29` receipt activation and formal verification.
- Safe default: false.

`shouldShowTrialStatusBar`

- True when `trialActive=true`, `trialDay` is 1-7, and `pilotSummaryAvailable=false`.
- False when trial source is missing or summary entry should take over.
- Safe default: false.

`shouldShowPilotSummaryEntry`

- True when `trialEnded=true`, `pilotSummaryAvailable=true`, and `pilotSummaryPaid=false`.
- False after paid/dismissed/converted state or when summary availability is unknown.
- Safe default: false.

## 6. Safety Boundaries

The future backend helper / endpoint must be read-only.

It must not:

- mutate trial records
- create cases
- create summary data
- mark payment as paid
- change receipt behavior
- change verification behavior
- change scoring behavior
- change routing behavior
- change payment behavior
- change existing `/cases` behavior unless explicitly planned later

The helper may read and normalize. It may not repair, backfill, migrate, or promote state.

## 7. Data Gaps and Blockers

Current gaps:

- Whether `trials.json` is authoritative enough for all workspaces and returning users.
- Whether trial start/end timestamps are stable across old records, local trial sessions, and backend registration/start flow.
- How pilot summary availability is represented.
- How pilot summary paid/dismissed state is represented.
- Whether payment records can safely distinguish `$9` workspace renewal / pilot extension from `$29` receipt activation and formal verification in every path.
- Whether userId/email relationship is stable enough across `trials.json`, `cases.json`, and `emailLogs.json`.
- Whether archived/deleted case counting rules should exclude all hidden cases or preserve some trial-usage count.
- Whether `/cases` should eventually include the normalized object or remain separate from trial status.

## 8. Recommended 16-A8

Recommended next step: A) backend helper contract document.

Why:

- The helper should be specified before implementation because it will sit near complex `/cases`, trial, and payment records.
- A helper contract can define exact input files, selection rules, timestamp handling, and safe defaults without changing runtime behavior.
- It keeps `/cases` stable while the normalized read model is clarified.
- It lets payment-scope ambiguity be handled explicitly before `pilotSummaryPaid` is trusted.
- It creates a clean target for a later read-only helper implementation and regression guard.

Do not implement UI or endpoint behavior until the helper contract is stable.
