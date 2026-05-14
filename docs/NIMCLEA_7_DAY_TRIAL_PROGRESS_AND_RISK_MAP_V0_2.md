# Nimclea 7-Day Trial Progress and Risk Map v0.2

## 1. Executive Summary

The 7-day trial core lifecycle is substantially complete.

The backend trial status source model, read-only helper, read-only endpoint, frontend adapter, and regression guards are implemented and guarded through 16-A21.

The actual CasesPage visual trial status bar has not been implemented yet.

That visual bar is now an optional UI follow-up, not a blocker for core 7-day trial readiness. The safer release posture is to pause here unless there is a strong product need to show the visual bar immediately.

## 2. Completion Table

| Step | Purpose | Status | Behavior changed? | Guarded? | Remaining risk |
| --- | --- | --- | --- | --- | --- |
| 16-A1 lifecycle contract | Define finalized 7-day trial lifecycle and workspace access contracts. | Complete | No | Contract doc | Contract text only; no runtime behavior. |
| 16-A2 lifecycle guard | Lock the 7-day trial lifecycle contract and ResultPage misclassification rules. | Complete | No | Yes | Text/static guard, not full UI runtime. |
| 16-A3 CasesPage status bar contract | Define CasesPage trial status bar behavior. | Complete | No | Contract doc | UI not implemented. |
| 16-A4 status bar contract smoke guard | Guard the CasesPage status bar contract text. | Complete | No | Yes | Contract guard only. |
| 16-A5 implementation readiness check | Identify safe CasesPage insertion point and data readiness. | Complete | No | Documentation | Found trial lifecycle source gaps before UI implementation. |
| 16-A6 trial status source normalization contract | Define one normalized trial status object for CasesPage. | Complete | No | Documentation | Source quality still depends on backend records. |
| 16-A7 backend normalization plan | Plan backend read-only status normalization architecture. | Complete | No | Documentation | Planning only. |
| 16-A8 backend helper contract | Define `buildTrialStatus` helper contract. | Complete | No | Documentation | Needed guard before implementation. |
| 16-A9 backend helper contract smoke guard | Guard the helper contract before implementation. | Complete | No | Yes | Text guard only. |
| 16-A10 backend read-only helper implementation | Implement pure `buildTrialStatus` helper. | Complete | Yes, isolated utility only | Guarded by later runtime smoke | Not connected to routes at this step. |
| 16-A11 backend helper runtime smoke | Validate real helper behavior with deterministic cases. | Complete | No | Yes | Fixture-like inline smoke, not full production data audit. |
| 16-A12 endpoint contract | Define future `GET /trial-status?email=...` endpoint. | Complete | No | Documentation | Endpoint not implemented at this step. |
| 16-A13 endpoint contract smoke guard | Guard endpoint contract before implementation. | Complete | No | Yes | Text guard only. |
| 16-A14 endpoint implementation | Add read-only `/trial-status` endpoint using helper output. | Complete | Yes, new read-only endpoint only | Guarded by later runtime smoke | Depends on existing JSON source consistency. |
| 16-A15 endpoint runtime smoke | Validate real `/trial-status` endpoint behavior and privacy. | Complete | No | Yes | Local runtime smoke; not a full auth/privacy model. |
| 16-A16 frontend adapter contract | Define frontend adapter contract for CasesPage consumption. | Complete | No | Documentation | Adapter not implemented at this step. |
| 16-A17 frontend adapter contract smoke guard | Guard adapter contract before implementation. | Complete | No | Yes | Text guard only. |
| 16-A18 frontend adapter implementation | Add `getTrialStatusDisplayModel({ email })`. | Complete | Yes, isolated adapter only | Guarded by later runtime smoke | Not connected to CasesPage. |
| 16-A19 frontend adapter runtime smoke | Validate real adapter behavior with mocked fetch. | Complete | No | Yes | Uses mocked backend responses, not live UI. |
| 16-A20 CasesPage UI implementation contract | Define future minimal CasesPage UI bar implementation rules. | Complete | No | Documentation | UI intentionally not implemented. |
| 16-A21 CasesPage UI contract smoke guard | Guard UI contract and confirm CasesPage/routes are still disconnected. | Complete | No | Yes | Contract guard only; visual bar remains pending. |

## 3. Readiness Score

| Layer | Readiness | Notes |
| --- | --- | --- |
| Core trial lifecycle | Mostly ready / substantially complete | Lifecycle contract and guards are in place. |
| Backend status model | Complete for read-only helper | `buildTrialStatus` exists and runtime smoke passes. |
| Backend endpoint | Complete for read-only access | `GET /trial-status?email=...` exists and runtime smoke passes. |
| Frontend adapter | Complete as isolated adapter | `getTrialStatusDisplayModel({ email })` exists and runtime smoke passes. |
| CasesPage UI status bar | Contract only | Visual bar is not implemented and is not connected. |
| Pilot summary entry | Contract only / deferred | Summary entry display rules are defined, but UI is not implemented. |
| Payment prompt / paid disappearance logic | Deferred | Payment-scope rules need careful separation before UI/payment prompt work. |

Overall readiness conclusion: the non-visual trial status pipeline is ready and guarded. The visual CasesPage bar is a later UI polish task.

## 4. Risk Map

### High Risk

- Implementing CasesPage UI too soon and accidentally altering case cards or Detail routing.
- Confusing the pilot-level summary entry with PilotResultPage.
- Mixing $9 workspace renewal, $29 receipt activation, and formal verification payment scope.

### Medium Risk

- Trial status source quality depends on `trials.json` consistency and real trial lifecycle records.
- `userId` and email relationship is not fully unified across every historical record path.
- Summary availability is not yet normalized for all real users.
- UI could flash incorrect state if loading behavior is rushed or if CasesPage tries to calculate lifecycle locally.

### Low Risk

- Existing helper, endpoint, and adapter are isolated and guarded.
- Current CasesPage has not been modified.
- `/cases` behavior remains untouched.
- Runtime smoke guards verify safe defaults, canonical shapes, and no raw-record leakage for the endpoint and adapter.

## 5. Deferred Work

Deferred / optional work:

- 16-A22 minimal CasesPage visual status bar implementation.
- Pilot-level summary entry UI.
- Pilot summary modal.
- Payment prompt disappearance behavior.
- Deeper paid / dismissed / converted lifecycle handling.
- Merging trial status into `/cases`, if ever needed.

These are not required for the current core 7-day trial readiness thread.

## 6. Recommended Stop Point

It is safe to stop after 16-A21.

16-A22 should be treated as a later UI polish task, not a core blocker.

Before doing 16-A22:

- run the release gate
- confirm FAIL 0
- confirm current CasesPage behavior is stable
- keep the implementation minimal and additive

## 7. Recommended Next Options

Option A: pause 7-day trial work and return to broader release readiness.

Option B: do 16-A22 later as a minimal UI-only task.

Option C: work on summary/payment prompt only after payment-scope contract is clarified.

Recommended option: Option A.

Option A is safest now because the backend source, endpoint, frontend adapter, and contract guards are complete, while the remaining work is mostly visual and payment-summary polish. Avoiding a new CasesPage UI change reduces release risk.

## 8. Release Gate Status

The release gate currently includes:

- 7-day trial lifecycle guard
- CasesPage trial status bar contract guard
- backend trial status helper contract guard
- backend trial status helper runtime guard
- backend trial status endpoint contract guard
- backend trial status endpoint runtime guard
- frontend trial status adapter contract guard
- frontend trial status adapter runtime guard
- CasesPage trial status bar UI contract guard

The expected release-gate posture is WARN with FAIL 0 because several UI smoke areas remain manual-only.

When `spawnSync node EPERM` appears under the sandbox, that is an environment execution limitation. An approved rerun with FAIL 0 is acceptable as an environment warning, not a product failure.

## 9. No-Touch Boundary

This progress map adds no new behavior.

This step does not:

- add UI
- connect CasesPage to the adapter
- change backend behavior
- change `/cases`
- change payment
- change receipt
- change verification
- change scoring
- mutate data
- add mock data
- add placeholder UI

No product behavior changes are introduced by this document.
