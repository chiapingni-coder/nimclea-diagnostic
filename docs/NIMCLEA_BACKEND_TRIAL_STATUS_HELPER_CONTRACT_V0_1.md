# Nimclea Backend Trial Status Helper Contract v0.1

## 1. Purpose

This contract defines the exact shape and behavior for a future read-only backend helper that builds the normalized trial status object for CasesPage.

The helper should prepare data for CasesPage without mutating records, creating state, or changing existing routes. It is intended to sit before any endpoint or UI implementation.

## 2. Proposed Helper Name and Signature

Proposed helper:

```js
buildTrialStatus({
  email,
  userId,
  trialRecords,
  caseRecords,
  paymentRecords,
  subscriptionRecords,
  now
})
```

Inputs:

| Input | Required | Meaning | Safe behavior when missing |
| --- | --- | --- | --- |
| `email` | Optional but recommended | Normalized workspace/customer email used for relationship matching. | If missing, helper may match by `userId` only; otherwise return safe hidden defaults. |
| `userId` | Optional but recommended | Backend user id used to select trial records. | If missing, helper may match by normalized email only. |
| `trialRecords` | Required | Array of trial lifecycle records, ideally from `trials.json` or future canonical store. | If missing or not an array, treat as empty and return safe hidden defaults. |
| `caseRecords` | Optional | Array of case records for counting cases created during the trial/workspace context. | If missing or not an array, use count `0`. |
| `paymentRecords` | Optional | Array of payment records scoped by payment type/scope. | If missing or ambiguous, do not mark summary paid. |
| `subscriptionRecords` | Optional | Array of subscription/workspace continuation records. | If missing or ambiguous, do not mark summary paid. |
| `now` | Optional | Date, timestamp, or ISO string used for deterministic calculations. | If missing or invalid, use current backend time. |

The helper must normalize `email` to lowercase trimmed form before comparisons.

## 3. Canonical Output Shape

The helper returns:

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

| Field | Definition |
| --- | --- |
| `trialActive` | True only when the selected trusted trial record is active and backend time is within the active trial window. |
| `trialStartedAt` | ISO trial start timestamp from the selected trial record, or null. |
| `trialEndsAt` | ISO trial end timestamp from the selected trial record or allowed calculation, or null. |
| `trialDay` | Integer 1-7 during active trial display; null outside active display. |
| `trialEnded` | True when the selected trusted trial has ended by timestamp or explicit ended/expired status. |
| `casesCreatedDuringTrial` | Count of related cases created during the selected trial/workspace context. |
| `pilotSummaryAvailable` | True only from a normalized summary-ready signal. |
| `pilotSummaryPaid` | True only from reliable continuation/payment records with correct scope. |
| `shouldShowTrialStatusBar` | True only when the active status bar should render. |
| `shouldShowPilotSummaryEntry` | True only when the pilot-level summary entry should render. |
| `source` | Provenance string, for example `backend_trial_record`, `backend_trial_record_with_cases`, `backend_trial_record_with_payment`, or `unavailable`. |

## 4. Trial Record Selection Rules

The helper should select one trusted relevant trial record.

Selection rules:

1. Match by `userId` when available.
2. Match by normalized email when trial records include email or can be associated through future normalized records.
3. Prefer records with explicit lifecycle state over incomplete records:
   - active started records first
   - then ended/expired started records
   - then registered-only records
4. Prefer the most recent relevant lifecycle record when multiple trusted records match.
   - Use `startedAt` first.
   - Fall back to `createdAt`.
5. Treat duplicate or stale records conservatively.
   - Do not merge multiple trial records into one lifecycle truth unless a later contract defines merge rules.
   - Do not use a registered-only stale record to hide a newer active started record.
6. Safe default when no trusted trial record exists:
   - `trialActive: false`
   - `trialStartedAt: null`
   - `trialEndsAt: null`
   - `trialDay: null`
   - `trialEnded: false`
   - `shouldShowTrialStatusBar: false`
   - `shouldShowPilotSummaryEntry: false`
   - `source: "unavailable"`

## 5. Timestamp Handling

Accepted trial timestamp fields:

- `startedAt`
- `trialStartedAt`
- `createdAt` only as a fallback for record ordering, not as authoritative active trial start unless explicitly allowed later
- `expiresAt`
- `trialEndsAt`
- `endedAt` or `expiredAt` if future records add them

`trialStartedAt` selection:

- Prefer valid `startedAt`.
- Fall back to valid `trialStartedAt`.
- Do not use `createdAt` as trial start for active display unless a future migration contract authorizes it.

`trialEndsAt` selection:

- Prefer valid `expiresAt`.
- Fall back to valid `trialEndsAt`.
- If `trialStartedAt` is valid and no end timestamp exists, the helper may calculate `trialStartedAt + 7 days` only after implementation explicitly documents this compatibility fallback.

`trialDay` calculation:

- Use backend time from `now`.
- Calculate day as floor of elapsed full days since `trialStartedAt` plus 1.
- Bound active display day from 1 to 7.
- Do not return a value below 1 or above 7 while active.
- Return null for missing/invalid timestamps or non-displayable trial state.

Timezone assumption:

- All stored timestamps should be treated as ISO UTC timestamps.
- Date-only or locale-specific strings are not trusted for lifecycle authority.

Invalid/missing timestamp behavior:

- Hide trial lifecycle UI rather than infer.
- Return null for timestamp fields that cannot be trusted.
- Do not repair or rewrite records.

## 6. Case Counting Rules

`casesCreatedDuringTrial` should be calculated without mutating or reordering cases.

Rules:

- Count only cases tied to the same user/email/trial relationship.
- Prefer cases with matching `trialId`, `userId`, or normalized email.
- Prefer cases created between `trialStartedAt` and `trialEndsAt` when timestamps are available.
- Fall back to related case count only if timestamp filtering is unavailable and the relationship is still trusted.
- Exclude archived/deleted cases unless product rules later define them as part of trial usage.
- Do not count evidence events.
- Do not count receipts.
- Do not count paid verifications.
- Do not alter `/cases` aggregation behavior.

Safe default:

- `casesCreatedDuringTrial: 0`

## 7. Pilot Summary Availability Rules

`pilotSummaryAvailable` should remain false unless there is a normalized summary-ready signal.

Rules:

- PilotResultPage existence must not be used as authority.
- Final day / trial ended may be a prerequisite, but not the only proof if summary generation is not normalized.
- Case-level pilot results must not be treated as the global 7-day pilot summary.
- Summary data is not created or deleted by this helper.

Safe default:

- `pilotSummaryAvailable: false`

## 8. Payment / Dismissed / Converted Boundary

`pilotSummaryPaid` should only become true from reliable payment/subscription records with the correct scope.

The helper must not confuse:

- `$9` workspace renewal
- `$29` receipt activation
- formal verification payment
- pilot-level summary payment prompt

Allowed payment authority:

- Records with explicit workspace/trial continuation scope, such as `paymentType: "pilot_extension"` or a future canonical workspace renewal type.
- Records with paid/active status only when payment type and scope match the pilot summary / workspace continuation purpose.

Forbidden payment authority:

- generic `paid: true` without scope
- generic `paymentStatus: "paid"` without scope
- receipt activation payment
- formal verification payment
- route query params
- frontend localStorage

If payment scope is ambiguous:

- Default `pilotSummaryPaid` to false.
- Hide payment-dependent prompt only when safe.
- Do not mark payment as paid.

## 9. Display Flags

`shouldShowTrialStatusBar`

- True only when a trusted trial record exists.
- True only when the trial is active or in an explicitly allowed active display state.
- Requires `trialDay` to be a bounded 1-7 value.
- False when the source is missing, weak, expired without summary rules, or ambiguous.

`shouldShowPilotSummaryEntry`

- True only when `pilotSummaryAvailable=true`.
- True only when the summary is unpaid/applicable.
- False when `pilotSummaryPaid=true`.
- False when summary state is missing or ambiguous.

Required direction:

- Missing or weak state should hide UI, not invent UI.
- The helper should prefer under-display over false confidence.

## 10. Read-Only Safety Boundaries

The future helper must not:

- write files
- mutate trial records
- create cases
- create summary data
- mark payment as paid
- change receipt behavior
- change verification behavior
- change scoring behavior
- change routing behavior
- change payment behavior
- change `/cases` behavior
- depend on frontend localStorage
- infer lifecycle from button text, route, visual labels, or PilotResultPage presence

The helper must be deterministic for the same inputs and `now`.

## 11. Recommended 16-A9

Recommended next step: B) create helper smoke guard first.

Why:

- A smoke guard can lock this helper contract before code exists.
- It can prevent the future helper from depending on localStorage, route text, generic payment fields, or PilotResultPage presence.
- It can require the canonical output shape and safe defaults before implementation.
- It keeps the next implementation step small and reviewable.
- It avoids adding a backend endpoint or UI before the read-only helper boundary is protected.

After the guard exists, the safest implementation step is a backend read-only helper only, with no route or UI changes.
