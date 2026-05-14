# Nimclea Access Entry Flicker Root Map v0.1

## 1. Purpose

This report maps frontend locations that can route to `/diagnostic` or `/cases`, especially where routing depends on `nimclea_email`, `savedEmail`, backend `/cases?email=...`, local case registry state, or access/workspace state.

Regression rule:

> When an email exists and backend case lookup is unresolved, no diagnostic prompt, access prompt, or new-user panel may render.

## 2. Likely Root Cause

Likely flicker source: `/access` rendering `CasesPage` in access mode before the backend `/cases?email=...` lookup resolves.

The risky sequence is:

1. `nimclea_email` or a saved email exists.
2. The entry surface starts rendering before backend case lookup completes.
3. `CasesPage` initially has `cases.length === 0`, `archivedCases.length === 0`, and may not yet have backend-confirmed workspace identity.
4. The condition `!loadingCases && !hasWorkspaceIdentity` can render the access prompt / new-user access panel.
5. The backend lookup later returns existing cases and the UI switches to the cases surface.

The visible symptom is a brief diagnostic/access prompt flash before redirecting or resolving to `/cases`.

The root problem is not the prompt itself. The root problem is that access entry can render a new-user/access surface while backend case lookup is unresolved.

## 3. Route and Decision Map

| File | Routes or decisions | Condition used | Can render diagnostic/access UI before backend lookup completes? | Flicker risk |
| --- | --- | --- | --- | --- |
| `frontend/App.jsx` | Mounts `/access`, `/cases`, and `/diagnostic`. | Static route mapping. Historically `/access` mounted `CasesPage` with `entryMode="access"`; current local tree mounts `AccessEntryPage`. | If `/access` mounts `CasesPage`, yes. If it mounts a resolver that blocks UI while checking, no. | High when `/access` points directly to `CasesPage`; low with resolver. |
| `frontend/pages/AccessEntryPage.jsx` | Reads `nimclea_email`, calls `/cases?email=...`, navigates to `ROUTES.CASES` or `ROUTES.DIAGNOSTIC`. | Backend case count for normalized email. | Intended no: it should render only a minimal checking state while resolving. | Low if kept as the only `/access` entry resolver. |
| `frontend/pages/CasesPage.jsx` | Loads `/cases?email=...`; renders access prompt when no workspace identity; routes case Detail to Receipt, Verification, Pilot, Result, or Diagnostic. | `savedEmail`, `resolvedEmail`, backend `/cases`, local registry merge, archived/deleted filters, case state derivation. | Yes when used as access-entry surface because `!loadingCases && !hasWorkspaceIdentity` can render `Access your Nimclea workspace`. | High if used for `/access`; lower for direct `/cases` after user has chosen workspace entry. |
| `frontend/pages/CasesPage.jsx:getCaseDetailRoute` | Routes case detail to `/receipt`, `/verification`, `/pilot`, `/result`, or `/diagnostic`. | Case readiness, receipt signals, diagnostic data, event signals, caseId validity. | No access-entry prompt, but can route to `/diagnostic` for a specific case without diagnostic result data. | Medium for case-detail correctness, not likely access-entry flicker source. |
| `frontend/pages/ResultPage.jsx` | Saves case email and navigates to `/cases`; can navigate home/access through restart; Result first-run vs case-review logic. | Result state, caseId, explicit case-review signals, saved contact email. | Not the likely access-entry flicker source; it can show contact modal but not the initial `/access` prompt. | Medium for first-run vs returning-case classification, not this flicker root. |
| `frontend/pages/ReceiptPage.jsx` | Looks up `/cases?email=...` to restore/match a case; can navigate to `/cases`; routes to Verification. | Email, caseId, backend case list, receipt readiness. | No diagnostic/access prompt. | Low for access-entry flicker; relevant to receipt restore consistency. |
| `frontend/pages/VerificationPage.jsx` | Looks up `/cases?email=...`; can navigate to `/cases`. | Email, caseId, backend case list, verification state. | No diagnostic/access prompt. | Low for access-entry flicker; relevant to verification restore consistency. |
| `frontend/pages/PilotPage.jsx` | Can navigate to `/cases` for case review/view cases. | Case review state and explicit user action. | No access prompt before lookup. | Low. |
| `frontend/pages/PilotResultPage.jsx` | Can navigate to `/cases`, `/receipt`, or `/pilot`. | Pilot result state and explicit CTA/action. | No access prompt before lookup. | Low. |
| `frontend/components/TopRightCasesCapsule.jsx` | Navigates to `/cases`. | User click; hidden on `/cases`. | No. | Low. |
| `frontend/utils/caseIdResolver.js` | Fallback route defaults to `/cases` when caseId is missing. | Missing/invalid caseId fallback. | No UI by itself. | Low. |
| `frontend/routes.js` | Defines `/access`, `/cases`, `/diagnostic`, and related constants. | Static constants. | No UI by itself. | Low unless route constants are changed. |
| `frontend/pages/Questionnaire.jsx` | Diagnostic completion routes to ResultPage. | Diagnostic caseId/session result. | No access-entry prompt. | Low. |

## 4. Files That Can Route To `/diagnostic` Or `/cases`

Observed files:

- `frontend/App.jsx`
- `frontend/routes.js`
- `frontend/pages/AccessEntryPage.jsx`
- `frontend/pages/CasesPage.jsx`
- `frontend/pages/ResultPage.jsx`
- `frontend/pages/ReceiptPage.jsx`
- `frontend/pages/VerificationPage.jsx`
- `frontend/pages/PilotPage.jsx`
- `frontend/pages/PilotResultPage.jsx`
- `frontend/pages/Questionnaire.jsx`
- `frontend/components/TopRightCasesCapsule.jsx`
- `frontend/utils/caseIdResolver.js`

Only these are likely access-entry decision roots:

- `frontend/App.jsx`
- `frontend/pages/AccessEntryPage.jsx`
- `frontend/pages/CasesPage.jsx`

The other files route to `/cases` or `/diagnostic` as part of established page workflows and should not be treated as the access-entry flicker root unless a separate smoke test proves it.

## 5. Files That Should Not Be Touched

Do not touch for this flicker fix unless a targeted smoke proves they are the defect source:

- `frontend/pages/CasesPage.jsx`
- `frontend/pages/DiagnosticPage.jsx`
- `frontend/pages/ResultPage.jsx`
- `frontend/pages/ReceiptPage.jsx`
- `frontend/pages/VerificationPage.jsx`
- `frontend/pages/PilotPage.jsx`
- `frontend/pages/PilotResultPage.jsx`
- `frontend/pages/Questionnaire.jsx`
- `frontend/routes.js`
- backend files
- payment logic
- receipt logic
- pilot logic
- verification logic
- case creation / save logic

These areas have higher blast radius than the access-entry resolver.

## 6. Recommended Single-File Fix

Preferred fix if not already present:

- Use a dedicated `/access` entry resolver component.
- Keep it outside `CasesPage`.
- Let it read the candidate email from `nimclea_email` or user input.
- When an email exists, start in `resolving` state.
- While `resolving === true`, render only a minimal checking state or `null`.
- Call backend `/cases?email=...`.
- If backend returns one or more cases, navigate to `ROUTES.CASES`.
- If backend returns zero cases, navigate to `ROUTES.DIAGNOSTIC`.
- Show diagnostic/access/new-user UI only after zero-case backend result is known.

If the app route still mounts `CasesPage` for `/access`, the smallest safe route-level change is:

- change `/access` in `frontend/App.jsx` to mount the dedicated access resolver instead of `CasesPage`

Do not patch the visible prompt inside `CasesPage` as the primary fix. That risks changing real `/cases` behavior and does not address the entry-resolution race.

## 7. Proposed Regression Guard

Future guard should verify:

- `/access` does not mount `CasesPage` directly.
- The access-entry resolver has an explicit resolving/loading state.
- The resolver calls `/cases?email=...` before choosing `/cases` or `/diagnostic`.
- While backend lookup is unresolved, the resolver does not render:
  - diagnostic prompt
  - access prompt
  - new-user panel
  - `Access your Nimclea workspace`
  - `Start diagnostic`
  - `Continue to diagnostic`
- `CasesPage.jsx` and `DiagnosticPage.jsx` are not modified for this guard.

Exact regression rule:

> When an email exists and backend case lookup is unresolved, no diagnostic prompt, access prompt, or new-user panel may render.

## 8. Current Recommended Next Step

Add a lightweight regression guard script after this report.

The guard should be text-based and check:

- `/access` route uses an entry resolver, not `CasesPage`.
- the resolver contains `isResolving` or equivalent.
- the resolver calls `/cases?email=...`.
- the resolver navigates to `ROUTES.CASES` when backend cases exist.
- the resolver navigates to `ROUTES.DIAGNOSTIC` only after the backend zero-case result.

Do not broaden the fix into CasesPage or DiagnosticPage unless the guard or smoke test proves the resolver is not the actual source.
