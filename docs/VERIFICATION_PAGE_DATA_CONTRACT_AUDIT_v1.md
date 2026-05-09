# VerificationPage Data Contract Audit v1

Scope: `frontend/pages/VerificationPage.jsx` re-audited against `docs/DATA_CONSISTENCY_CONTRACT_v1.md`.

No frontend, backend, or route code was modified during this re-audit. This report was updated only to reflect the current state of `VerificationPage.jsx`.

## Findings

| Status | Location | Contract rule affected | Risk | Suggested fix |
| --- | --- | --- | --- | --- |
| PASS | Backend case, ledger, and event hydration in `VerificationPage()`, approx. lines 1717-1890 and 2438-2479 | Truth Source Priority; Routing and caseId propagation | The page reads `/case/:caseId`, `/cases?email`, receipt ledger, verification ledger, and case-scoped workflow events. Backend reads and ledger reads are keyed by resolved `caseId`. | Keep backend reads case-scoped. |
| WARNING | `backendCanonicalCase`, approx. lines 1909-1913 | Truth Source Priority | Canonical gating now uses backend records only, but `backendCaseRecord` from `/cases?email` is preferred over `restoredCaseRecord` from `/case/:caseId` without comparing freshness or backend source authority. Both are backend sources, so this is no longer a fallback override risk. | Prefer direct `/case/:caseId` for canonical lifecycle fields, or compare backend timestamps when both backend records exist. |
| PASS | `backendVerificationEligible`, `backendVerificationReady`, `backendVerificationIssued`, and `backendFormalVerificationGate`, approx. lines 1915-1929 | No Downgrade Rule; Verification unlock boundary | Resolved. Formal verification readiness is now gated by backend-owned verification signals or backend receipt-ready plus backend/payment-owned paid/activated/issued state. Route/shared/local/currentCase data no longer creates the formal gate. | Preserve the backend-only formal gate. |
| PASS | Monotonic helper functions, approx. lines 155-301 | No Downgrade Rule | Resolved. The page recognizes canonical backend signals including `verificationEligible`, `verificationStatus` ready/issued/completed, `stage` verification_ready/verification_issued, and `status` verification_ready/verification_issued. Backend verification-ready or issued state is not downgraded by local events, score, route state, or hash absence. | Keep verification lifecycle checks centralized in these helpers. |
| PASS | `receiptAllowsVerification` and `cameFromIssuedReceipt`, approx. lines 2151-2155 | Verification unlock boundary; Page Consumption Contract | Resolved. These gates now use `backendFormalVerificationGate` only. Deterministic score, receipt decision text, ledger existence, local receipt eligibility, `caseId`, route state, local events, and local activation no longer unlock formal verification. | Keep these aliases tied only to backend-owned gate state. |
| PASS | `accessMode`, `isPaid`, `activeCaseBilling`, and `verificationActivated`, approx. lines 1955-1965 | Payment trust boundary | Resolved for formal controls. Paid/activated state now comes from `backendCanonicalCase`, backend receipt/payment state, or backend verification state. Route/shared/local `isPaid` and the former local billing override no longer drive paid/activated UI. | Keep payment and activation derived from backend/payment-confirmed fields. |
| PASS | Local test activation removal, approx. lines 2486-2493 removed from previous implementation | Payment trust boundary; Verification unlock boundary | Resolved. The prior `handleActivateVerificationForCase()` local `source: "local_test"` mutation is gone, so local activation can no longer affect access mode, activation UI, formal controls, or unlock. | Keep local test activation out of production readiness paths. |
| PASS | `backendOwnedReceiptHash`, `proofReceiptHash`, `hasReceiptHash`, approx. lines 2116-2123, 2432-2434, and 2616-2618 | Receipt and hash dependency | Resolved for formal readiness. Formal receipt hash now comes only from valid backend receipt ledger hash or valid backend case receipt hash. Route/shared/stored/local hashes may still support preview payload display, but not formal readiness. | Keep valid backend hash as the only formal readiness hash. |
| WARNING | `receiptBackedContext`, `liveReceiptHash`, and display payload assembly, approx. lines 2124-2208 | Receipt and hash dependency; Page Consumption Contract | Preview/display payloads can still include receipt context, shared contract, and route/stored receipt hash values when building the visible verification payload. Formal readiness does not use those hashes, but display provenance can be hard to distinguish. | Mark preview/fallback hash display separately from backend-owned hash display. |
| PASS | `hasEventBackedBaseline`, approx. lines 2084-2109 | Event Trust Boundary | Resolved. Formal baseline now requires backend event counts/arrays/latestEvent, backend analytics events filtered by caseId, or trusted backend receipt/verification evidence. Raw local event counts, route-derived current-case events, and stale local arrays no longer satisfy the formal baseline. | Keep local/route events as progress context only. |
| WARNING | `effectiveCaseEvents`, `deterministicScoreSource`, and `access`, approx. lines 1966-2060 | Derived Fields Contract; Event Trust Boundary | The page still computes deterministic score and preview access from merged backend/fallback/display data. Current formal gates do not rely on this output, but it remains page-local derived UI logic. | Keep these values out of canonical-looking labels and future writes, or move preview scoring into a shared adapter. |
| PASS | `backendCanWriteVerificationLedger` and ledger sync effects, approx. lines 2504-2579 | Verification write boundary; Persistence boundary | Resolved. `/hash-ledger/verification` POSTs are now gated by backend-owned formal eligibility, trusted baseline, valid backend-owned receipt hash, and valid verification hash. Page-derived readiness alone cannot write `verification_ready`. | Keep ledger writes behind backend-owned gate, and prefer backend-owned ledger creation long term. |
| WARNING | `syncVerificationHashToLedger()` effects, approx. lines 2512-2579 | Verification write boundary | The POST is safer but still frontend-originated and can use a frontend-generated verification hash when no backend verification ledger hash exists, provided the backend gate passes. | Move verification ledger creation to a backend endpoint that independently verifies eligibility and hash payload. |
| PASS | `saveStoredVerificationHash()` and local verification persistence, approx. lines 309-344 and 2555-2593 | Page Consumption Contract; Persistence boundary | Resolved. Local verification persistence is now stored under `verificationPreview` or marked `source: "verification_page_preview_cache"` and `fallbackOnly: true`. It no longer writes canonical `verification.eligible` or a top-level authoritative verification hash. | Keep local verification data preview/cache only. |
| WARNING | `verificationPageData`, `sharedReceiptVerificationContract`, and `receiptCaseData` localStorage writes, approx. lines 2745-2766 | Page Consumption Contract | Stored data is marked preview/cache for `verificationPageData`, but shared contract and receipt case data are still cached for UX continuity. Current gates do not treat them as formal authority. | Continue excluding these stored values from backend-owned gates. |
| PASS | Header, issuance status, next-step labels, and action CTA, approx. lines 3120-3124, 3254-3265, 3725-3768, and 3771-3803 | UI status labels; Verification unlock boundary | Resolved. Canonical-looking labels such as `"Verification Ready"`, `"FORMAL VERIFICATION ISSUABLE"`, `"Record eligible for formal issuance"`, and `"Verify Record"` now require backend-owned formal verification gate and backend activation/verification state. | Keep formal labels backend-first. |
| WARNING | `Verification Hash` display, approx. lines 3307-3334 | UI status labels; Hash ledger consistency | The UI displays `verificationHash`, which may be backend ledger hash or frontend-generated preview hash. The copy does not distinguish backend-issued hash from preview-generated hash. | Label generated hashes as preview until backend ledger confirms them. |
| PASS | Cross-page consistency with ReceiptPage, approx. lines 1915-2155 and 2504-2593 | Cross-page contract consistency | Resolved. VerificationPage now mirrors ReceiptPage's stricter entry contract by requiring backend-owned receipt/payment/verification state before rendering or persisting formal verification state. | Keep VerificationPage aligned with ReceiptPage's backend-owned unlock assumptions. |
| WARNING | `handleOpenSubscriptionModal()` local `updateCase()` write, approx. lines 3028-3040 | Page Consumption Contract | Opening the subscription modal writes an `acceptanceChecklist` snapshot to local case registry. This is not a canonical verification field and does not affect gates, but it is still local persistence from VerificationPage. | Keep this snapshot display-only and do not reuse it as readiness evidence. |
| WARNING | Verification telemetry writes, approx. lines 2785-2906 | Derived Fields Contract; Event Trust Boundary | `verification_viewed`, `verification_passed`, and `verification_failed` analytics are still page-computed events. They are gated by backend formal state now, but should not become readiness evidence in future consumers. | Mark these events as telemetry, not evidence, in downstream consumers. |
| PASS | Direct backend and ledger reads use inferred `caseId`, approx. lines 1717-1890 and 2438-2479 | Routing and caseId propagation | `/case/:caseId`, receipt ledger, verification ledger, and analytics event filtering preserve the resolved case id. | Keep case id required for backend reads. |
| WARNING | View all cases and back-to-receipt navigation, approx. lines 1940-1953, 2922-2956, and 3177-3194 | Routing and caseId propagation | Back-to-receipt keeps `caseId` when `activeCaseId` resolves, but View all cases still navigates without passing explicit case/email context. This was a prior warning and remains outside the FAIL scope. | Preserve case/email context when navigation continuity matters. |

## Specific Area Results

| Area | Status | Notes |
| --- | --- | --- |
| Backend truth precedence | PASS | Formal verification gate now uses backend canonical case data only. Fallback data remains display/preview context. |
| No-downgrade verification readiness | PASS | Backend verification eligible/ready/issued helpers are monotonic and backend-first. |
| Verification unlock boundary | PASS | Unlock requires backend verification state or backend receipt-ready plus backend/payment-owned paid/activated/issued state. |
| Payment / activation trust boundary | PASS | Paid/activated state is backend-owned; local test activation no longer exists. |
| Receipt and hash dependency | PASS | Formal readiness uses valid backend-owned receipt hash only. |
| Event trust boundary | PASS | Formal baseline excludes raw local events and accepts backend-scoped events or trusted receipt/verification evidence. |
| Verification write boundary | PASS | Verification ledger sync is gated by backend-owned formal gate and valid backend-owned receipt hash. |
| Local verification persistence | PASS | Local verification persistence is preview/cache only and does not write canonical verification truth. |
| Routing and caseId propagation | WARNING | Backend reads preserve caseId; View all cases still drops explicit context. |
| UI status labels | PASS | Formal-ready/issuable labels are backend-first. |
| Cross-page contract consistency | PASS | VerificationPage now follows the corrected ReceiptPage backend-owned entry contract. |

## Overall Compliance

| Metric | Result |
| --- | --- |
| Compliance score | 84 / 100 |
| Remaining FAIL items | None identified in this re-audit. |
| Safe enough to proceed to next layer? | Yes, for the next consistency layer. Remaining issues are warnings around preview payload provenance, frontend-originated ledger creation, page-local scoring, and navigation/local cache clarity. |

## Remaining FAIL Items

| Area | Failure |
| --- | --- |
| None | No FAIL items remain from the prior audit after the current VerificationPage changes. |

## Remaining WARNING Items

| Area | Warning |
| --- | --- |
| Backend source precedence | `/cases?email` and `/case/:caseId` are both backend sources, but freshness/authority is not compared when both return data. |
| Preview payload provenance | Route/shared/local receipt context can still populate display payloads and hashes, though not formal readiness. |
| Page-local scoring | Deterministic score and preview access are still computed in-page from merged data. |
| Frontend ledger creation | Verification ledger POST is now gated, but still originates from the frontend and can use a generated verification hash. |
| Local cache clarity | Shared receipt/verification contract and receipt case data are cached in localStorage for continuity. |
| Verification hash label | UI does not distinguish backend ledger hash from generated preview hash. |
| Local checklist snapshot | Opening the subscription modal writes a local acceptance checklist snapshot. |
| Telemetry events | Page-computed verification analytics should remain telemetry, not evidence. |
| Routing continuity | View all cases still drops explicit case/email context. |

## Top 3 Remaining Risks

| Rank | Risk | Why it matters |
| --- | --- | --- |
| 1 | Verification ledger creation is still frontend-originated, although now gated by backend-owned state. | Backend should ideally own permanent proof issuance and independently verify payloads. |
| 2 | Preview payloads can still blend route/shared/local context with backend state for display. | Users may see fallback-derived details beside backend-owned formal labels unless provenance is clearer. |
| 3 | Page-local scoring and access calculations remain in the component. | They are no longer formal authority, but future edits could accidentally reuse them as canonical signals. |
