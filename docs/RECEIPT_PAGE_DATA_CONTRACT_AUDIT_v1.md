# ReceiptPage Data Contract Audit v1

Scope: `frontend/pages/ReceiptPage.jsx` re-audited against `docs/DATA_CONSISTENCY_CONTRACT_v1.md`.

No frontend or backend code was modified during this re-audit. This report was updated only to reflect the current state of `ReceiptPage.jsx`.

## Findings

| Status | Location | Contract rule affected | Risk | Suggested fix |
| --- | --- | --- | --- | --- |
| WARNING | `ReceiptPage()` backend hydration, approx. lines 1431-1497 | Truth Source Priority | Backend case data is still loaded from `/cases?email` and matched by `caseId`; there is no direct `/case/:caseId` canonical read. If email is missing or stale, backend case truth can be unavailable. | Hydrate the canonical case directly by `caseId` before using email-scoped discovery as a secondary source. |
| PASS | `activeCurrentCase` selection, approx. lines 1499-1516 | Truth Source Priority | When `backendCaseRecord` exists, it is selected before local `currentCase` and `hydratedReceiptRecord`. Backend case precedence is preserved in that path. | Keep backend record first in the active source chain. |
| PASS | `hydrateReceiptRecord()`, approx. lines 1378-1429 | Truth Source Priority; Page Consumption Contract | Resolved. Same-case `localStorage` receipt data is now marked `_fallbackOnly` and no longer skips backend `/receipt-record?caseId=` hydration. Backend receipt records replace fallback data and are marked `_backendConfirmed`. | Keep stored receipt data as temporary fallback only. |
| WARNING | `resolveReceiptPayload()` and `resolvedPayload`, approx. lines 529-638 and 939-943 | Truth Source Priority | Receipt payload fields are still resolved primarily from `location.state`, route data, and hydrated receipt record. Backend case data is not directly merged into this payload at higher priority. | Merge backend case/receipt fields into the resolved payload at higher priority than route or stored data. |
| PASS | Hash ledger read priority, approx. lines 977-1038 and 1197-1208 | Hash ledger consistency | Displayed receipt hash still prioritizes ledger record hash and ledger state. Fallback route/stored hashes are only considered when a backend-confirmed receipt source exists. | Keep ledger hash first and keep rejecting invalid hash formats. |
| PASS | Hash creation and ledger POST, approx. lines 1017-1183 | Hash ledger consistency; Page Consumption Contract | Resolved. New hash computation and `postLedgerReceiptHash()` are gated by `hasBackendConfirmedReceiptSource`. Fallback-only route/local/localStorage payloads do not create or POST ledger entries. | Prefer backend-created ledger records long term; keep frontend POST gated to backend-confirmed sources. |
| WARNING | Hash creation payload, approx. lines 1017-1183 | Hash ledger consistency | The POST gate requires a backend-confirmed source, but the hash payload can still be assembled from the existing normalized/resolved receipt data. If backend case exists while route data is stale, the hash input may still include route-derived fields. | Build the hash payload directly from the backend-confirmed case/receipt record where possible. |
| PASS | `receiptEligible`, approx. lines 2114-2128 | No Downgrade Rule; Derived Fields Contract | Resolved. `receiptEligible` is now `backendReceiptReady || readinessContract.receiptReady`, so canonical backend receipt-ready signals are monotonic and cannot be downgraded by missing local events or score recalculation failure. | Preserve the monotonic backend-ready guard. |
| PASS | Readiness display model, approx. lines 1975-1993, 2114-2128, 3177-3194, and 3994-4006 | No Downgrade Rule; UI status labels | Resolved for receipt-ready. Backend receipt-ready now forces `"READY FOR FORMAL DETERMINATION"` and prevents insufficient/locked/not-ready labels driven only by missing events or score recalculation. | Continue deriving not-ready labels only after canonical backend-ready checks. |
| PASS | Loading guard, approx. lines 1514-1516 and 2602-2621 | Receipt readiness contract usage | The page shows `"Checking receipt status..."` while receipt-record hydration is incomplete, reducing temporary red/green flashes during receipt-record loading. | Extend the guard to canonical backend case hydration as well. |
| WARNING | Backend case loading guard, approx. lines 1431-1497 and 2602-2621 | Receipt readiness contract usage | The loading UI waits on receipt-record hydration but not `backendCaseLoading`. If `/cases?email` is still loading, the page can render from local/fallback state before backend case truth arrives. | Include backend case loading in the readiness/hydration guard when a `caseId` is present. |
| WARNING | Readiness contract inputs, approx. lines 1716-1824 | Receipt readiness contract usage | ReceiptPage still builds a custom `deterministicScoreSource` with page-level interpretations for event capture, structure score/status, and receipt record formability. | Move this adapter logic into a shared contract adapter or align it with the CasesPage receipt-ready adapter. |
| PASS | `realCapturedEvents` filtering, approx. lines 1533-1694 | Event Trust Boundary | Resolved. Backend event arrays are treated as case-scoped through the matched backend case record, while local/route/shared fallback events must carry a matching `caseId` before they affect readiness. | Keep case-scoped evidence checks for readiness events. |
| WARNING | `effectiveEventCaptured`, approx. lines 1716-1717 | Event Trust Boundary | `activeCurrentCase.eventCaptured === true` can still mark event capture without checking trusted event records. If sourced from local registry or stale fallback, it can inflate readiness inputs. | Treat `eventCaptured` as a progress hint unless backed by trusted case-scoped events or backend-owned readiness. |
| PASS | Quick capture write, approx. lines 2401-2459 | Routing and caseId propagation; Event Trust Boundary | Capture Event writes include `caseId: inferredCaseId` on the local event and in `logTrialEvent` metadata. | Keep requiring `inferredCaseId`; block submit if it is missing. |
| WARNING | Quick capture persistence, approx. lines 2418-2421 | Event Trust Boundary; Page Consumption Contract | Quick capture writes only to `caseRegistry` via `upsertCase()`. Until backend accepts the event, it is local fallback data; the new case-scoped filter reduces cross-case risk but does not make the event backend-owned. | Mark local quick captures as pending or exclude them from receipt readiness until backend event persistence confirms them. |
| PASS | Receipt-ready backend write, approx. lines 2159-2205 | Receipt write boundary; No Downgrade Rule | Resolved. The PATCH no longer writes `status: "workspace_active"` and skips the write when current canonical stage/status/receipt status ranks beyond `receipt_ready`. | Keep monotonic stage comparison before receipt-status writes. |
| WARNING | Receipt-ready backend write, approx. lines 2159-2205 | Receipt write boundary | The write still depends on page-computed `receiptEligible`, now protected by backend-ready monotonic logic but still capable of being true from the readiness contract. | Prefer a backend-owned eligibility endpoint for permanent receipt-ready writes. |
| PASS | Stripe return confirmation, approx. lines 1325-1376 | Payment Trust Boundary | `paid=success` and `session_id` still go through `/api/confirm-checkout-session`; returned `caseRecord.caseBilling` is marked `_backendConfirmed`. | Keep payment confirmation backend-mediated. |
| PASS | `accessMode`, `isPaid`, and `receiptActivated`, approx. lines 1838-1896 | Payment Trust Boundary | Resolved for local activation/payment trust. Paid/activated UI now relies on backend case payment/receipt status or `_backendConfirmed` checkout override, not arbitrary local `activeCurrentCase.isPaid`. | Keep paid/activated state backend/payment-owned. |
| PASS | `handleActivateReceiptForCase()`, approx. lines 2396-2399 | Payment Trust Boundary; Receipt write boundary | Resolved. The local `source: "local_test"` activation write was removed; the handler now refuses local activation and does not mutate case billing. | Remove the handler entirely later if no longer needed. |
| PASS | Verification unlock, approx. lines 2341-2381, 3248-3278, and 4051-4170 | Verification unlock boundary | Resolved. `canEnterVerification` now requires backend-owned receipt-ready plus paid/activated/issued state, or backend `verificationEligible`. Verification navigations include `caseId`, and fallback branches return instead of navigating when locked. | Keep Verification unlock tied to backend-owned receipt/payment/verification state. |
| WARNING | CTA label while locked, approx. lines 2392-2394 and 4049-4055 | UI status labels; Verification unlock boundary | When receipt is ready but not backend-paid/activated/verification eligible, the label can still say `"Open Verification"` while the click starts checkout instead. This no longer unlocks Verification incorrectly, but the label can be misleading. | Adjust the label in a warning-focused pass to distinguish ready-to-pay from ready-to-enter Verification. |
| WARNING | Evidence lock selection, approx. lines 2318-2339 | Hash ledger / receipt record consistency | `finalEvidenceLock` is always truthy, so fallback `location.state.evidenceLock` and shared-contract locks are never used. Consistency is checked against page-built receipt hash and metadata. | Build the evidence lock from backend/ledger receipt record first, then compare route/local locks as fallback context. |
| PASS | Hash display and copy, approx. lines 2852-2944 | Hash ledger / receipt record consistency | Ledger/hash display is read-only in the UI, and copy action does not mutate readiness or backend state. | Keep hash display read-only. |
| WARNING | View all cases action, approx. lines 2710-2726 | Routing and caseId propagation | The action derives `currentCaseId` for logging, but navigates to Cases without passing `caseId` or email state. Cases may recover context from storage, but route context is dropped. | Pass `caseId`/email in navigation state if the destination depends on current case context. |
| PASS | Checkout action, approx. lines 1856-1880 | Routing and caseId propagation | Payment checkout sends `caseId` to `/api/create-checkout-session` and aborts if no case id exists. | Keep case id required for payment creation. |
| WARNING | Back to Pilot actions, approx. lines 2640-2649 and 4178-4187 | Routing and caseId propagation | The URL includes `caseId`, but the state object is raw `location.state` and may carry stale fields. | Strip stale receipt/verification state and pass only case context needed by Pilot Result. |
| WARNING | Local case registry receipt snapshot, approx. lines 1996-2024 | Page Consumption Contract; No Downgrade Rule | The page still writes a local `upsertCase()` snapshot with `status: "result_ready"` and `stage: data.stageLabel`. This is local registry state, not backend state, but it can influence fallback reads if backend hydration is unavailable. | Store this as display-only receipt snapshot data or avoid writing lifecycle-like fields into local case registry. |

## Specific Area Results

| Area | Status | Notes |
| --- | --- | --- |
| Stored receipt precedence | PASS | Same-case stored receipt data no longer skips backend hydration and is explicitly marked fallback-only. |
| Ledger creation safety | PASS | New ledger hash creation/POST is gated to backend-confirmed receipt sources. |
| No-downgrade receipt readiness | PASS | Backend receipt-ready signals are monotonic through `receiptEligible = backendReceiptReady || readinessContract.receiptReady`. |
| Not-ready UI labels | PASS | Backend-ready cases no longer fall through to insufficient/locked/not-ready labels caused by missing events or score recalculation. |
| Event trust boundary | PASS | Readiness events are now case-scoped unless sourced from the matched backend case record. |
| Receipt-ready backend write boundary | PASS | The receipt-status PATCH preserves stronger lifecycle state and no longer writes `workspace_active`. |
| Local activation safety | PASS | Local test activation no longer writes or affects paid/activated state. |
| Verification unlock boundary | PASS | Verification unlock requires backend-owned receipt/payment/verification state, and Verification navigation includes `caseId`. |
| Backend truth precedence | WARNING | Backend case precedence exists when hydrated, but there is still no direct `/case/:caseId` canonical read. |
| Receipt readiness contract usage | WARNING | Shared contract is used, but ReceiptPage still prepares several readiness inputs locally. |
| Payment trust boundary | PASS | Prior local activation/payment trust FAIL is resolved; remaining payment concerns are label/state clarity warnings. |
| Hash ledger / receipt record consistency | WARNING | Ledger writes are safer, but hash payload construction should eventually use backend-confirmed payload fields directly. |
| Routing and caseId propagation | WARNING | Verification/payment/capture routes carry `caseId`; View all cases and Back to Pilot still pass broad or missing route state. |
| UI status labels | WARNING | False not-ready labels are fixed for backend-ready receipts; CTA wording can still be misleading when payment/activation is required. |

## Overall Compliance

| Metric | Result |
| --- | --- |
| Compliance score | 82 / 100 |
| Remaining FAIL items | None identified in this re-audit. |
| Safe enough to proceed to next layer? | Yes, for the next consistency layer. Remaining issues are warnings around direct backend case hydration, local readiness adapters, fallback snapshots, and UI clarity. |

## Remaining WARNING Items

| Area | Warning |
| --- | --- |
| Backend case hydration | ReceiptPage still depends on `/cases?email` instead of direct `/case/:caseId` canonical hydration. |
| Resolved payload precedence | Backend case fields are not directly merged into `resolvedPayload` at highest priority. |
| Hash payload source | Ledger POST is gated, but hash input can still include route/resolved payload fields when a backend source exists. |
| Backend loading guard | Receipt record hydration is guarded, but backend case loading can still race with fallback render. |
| Readiness adapter boundary | Page-local readiness source assembly remains outside a shared adapter. |
| Event captured hint | `eventCaptured` can still act as a progress hint independent of trusted event records. |
| Quick capture persistence | Local quick captures are case-scoped but not backend-confirmed before influencing local state. |
| Receipt-ready PATCH authority | Permanent receipt-ready writes should ideally come from backend-owned eligibility. |
| Verification CTA label | Label can imply Verification entry when the click will start checkout because backend activation/payment is missing. |
| Evidence lock source | Evidence lock is page-built rather than ledger/backend-first. |
| View all cases routing | Does not pass case context to Cases. |
| Back to Pilot state | Carries broad `location.state`, which may include stale receipt/verification fields. |
| Local registry snapshot | Local `upsertCase()` still writes lifecycle-like display fields that can affect fallback reads. |

## Top 3 Remaining Risks

| Rank | Risk | Why it matters |
| --- | --- | --- |
| 1 | Lack of direct `/case/:caseId` canonical hydration can leave the page dependent on fallback/local data when email lookup is unavailable. | Backend consolidated case is the highest truth source. |
| 2 | Local readiness/hash adapters still assemble truth-like data in the page rather than from one backend-confirmed contract payload. | This keeps source ownership harder to reason about. |
| 3 | Local case registry snapshots still carry lifecycle-like fields. | They can influence future fallback reads even though they are not canonical backend truth. |
