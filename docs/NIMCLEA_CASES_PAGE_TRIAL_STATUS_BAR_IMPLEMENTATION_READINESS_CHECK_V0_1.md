# Nimclea CasesPage Trial Status Bar Implementation Readiness Check v0.1

## 1. Scope

This is a documentation-only readiness check for implementing the CasesPage 7-day trial status bar.

Inspected sources:

- `frontend/pages/CasesPage.jsx`
- `docs/NIMCLEA_7_DAY_TRIAL_LIFECYCLE_CONTRACT_V0_1.md`
- `docs/NIMCLEA_CASES_PAGE_TRIAL_STATUS_BAR_CONTRACT_V0_1.md`
- `scripts/check-cases-page-trial-status-bar-contract.mjs`
- `scripts/check-7-day-trial-lifecycle-contract.mjs`

No frontend, backend, route, payment, scoring, receipt, verification, script, or data behavior is changed by this check.

## 2. Intended UI Insertion Point

Recommended insertion point in `frontend/pages/CasesPage.jsx`:

- Inside the existing page shell:
  - outer page: `relative min-h-screen bg-slate-50 text-slate-900 px-6 py-10`
  - inner container: `max-w-3xl mx-auto space-y-6 pt-10`
- After the workspace header / dashboard control area that contains:
  - `Cases`
  - Manage Plan
  - Create new case
  - Switch email
- Before the case-view navigation and Active Cases list / case cards:
  - `Active Cases (...)`
  - `Baseline Records (...)`
  - `Historic Records (...)`

This keeps the status bar above the Active Cases list and case cards, inside the main container.

It must not be:

- outside the page shell
- floating independently
- inside any individual case card
- nested into Detail / foldout / case action controls

## 3. Required Display Contract

The first implementation should preserve the 16-A3 display contract:

- one lightweight green-tinted status bar during the active 7-day trial
- `Trial Day X of 7` and `Cases created: N` on the same line
- no two-row split between trial day and case count
- no large banner treatment
- no heavy explanation text
- calm progress-indicator tone, not a warning tone

Summary link/state:

- The summary link/state appears only on final day or after trial end, if applicable.
- It must not replace PilotResultPage.
- It must not become the pilot-level summary entry itself.

The status bar implementation must not alter:

- case cards
- Detail buttons
- foldout behavior
- routing
- payment
- scoring
- receipt logic
- verification logic

## 4. Data Readiness

| Data need | Current readiness | Evidence from `CasesPage.jsx` | Recommendation |
| --- | --- | --- | --- |
| Trial active or not | Partially available | `getTrialSession()` is available and `planSurfaceContract` derives `pilotWindowEnded` from local trial timestamps. Backend-confirmed pilot extension access also exists. | Do not treat this as canonical trial active state until a normalized source is chosen. |
| Current trial day | Partially available | `trialSession.startedAt`, `createdAt`, and `trialStartedAt` are read locally to calculate whether the 7-day window ended. | Can be derived locally for a static shell, but should be backend-backed before authoritative display. |
| Cases created count | Available | `workspaceCases`, `visibleActiveCases`, `activeCaseSectionGroups`, and `caseSectionCounts` already exist from CasesPage aggregation. | Use the same aggregation semantics as CasesPage; avoid counting archived/deleted cases unless product rules change. |
| Trial ended / summary available | Missing / should be deferred | `pilotWindowEnded` exists inside plan-surface logic, but there is no dedicated pilot-level summary entry source. | Defer final summary-entry behavior to the lifecycle / summary entry implementation. |
| Payment/paid state if already present | Partially available | `pilotExtensionAccess`, `paymentStatus`, `pilotExtensionPaymentStatus`, `subscriptionStatus`, and backend-confirmed pilot extension checks exist. | Do not use payment state to drive the status bar except to avoid conflicting with existing access UI. |

## 5. Safe Implementation Recommendation

Options:

- A) Static UI shell only: safest visually, but should not be shown dynamically without reliable trial source.
- B) Derived from existing local data: possible for local trial day and case count, but carries first-run / returning-user and stale local state risk.
- C) Backend-backed: preferred long-term direction because the contract says trial day should use trial start timestamp or backend-owned trial state when available.
- D) Deferred until a trial source is normalized: safest next engineering step.

Recommendation:

Use D for the next implementation step. Do not render the live bar until the trial source and visibility gate are normalized.

Recommended 16-A6:

Define or identify the canonical trial-status source for CasesPage, then implement a minimal read-only status-bar shell behind that source. The first runtime implementation should be backend-backed where possible and should avoid touching case card rendering, Detail routes, foldouts, payment, receipt, or verification logic.

## 6. Risk Map

Risks if implemented too early:

- Route regression from touching case-card Detail or action code.
- Duplicate bars if both local trial session and backend access state attempt to render the same UI.
- Wrong first-run vs returning-user state if local trial timestamps are stale.
- Confusing PilotResultPage with the pilot-level summary entry.
- Payment state overreach if `paymentStatus`, `paid`, or pilot extension data starts controlling lifecycle display.
- Touching stable case card logic while adding a workspace-level indicator.
- Showing trial status before the user starts the 7-day pilot.
- Showing the bar inside individual case cards.
- Counting evidence events, receipts, or paid verifications instead of workspace trial cases.
- Letting the status bar replace final pilot-level summary entry behavior.

## 7. Readiness Conclusion

Implementation is not ready for behavior changes yet.

CasesPage has enough structure for a safe visual insertion point and enough data for a case count. It does not yet have a normalized, authoritative trial lifecycle source that cleanly answers active trial day and summary availability without relying on local-only state.

The safest 16-A6 is to normalize the trial-status source first, then add a minimal CasesPage-level bar above the Active Cases list without changing case cards or downstream flows.
