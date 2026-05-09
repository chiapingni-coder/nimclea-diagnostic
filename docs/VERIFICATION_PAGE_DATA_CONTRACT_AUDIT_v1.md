# VerificationPage Data Contract Audit v1

Scope: `frontend/pages/VerificationPage.jsx` audited against `docs/DATA_CONSISTENCY_CONTRACT_v1.md`.

No frontend, backend, or route code was modified during this audit. This report only documents current behavior.

## Findings

| Status | Location | Contract rule affected | Risk | Suggested fix |
| --- | --- | --- | --- | --- |
| PASS | Backend case, ledger, and event hydration in `VerificationPage()`, approx. lines 1551-1731 and 2270-2299 | Truth Source Priority; Routing and caseId propagation | The page attempts backend reads for `/case/:caseId`, `/cases?email`, receipt ledger, verification ledger, and case-scoped workflow events. Reads carry `caseId` where applicable. | Keep backend reads case-scoped and prefer direct `/case/:caseId` for canonical lifecycle fields. |
| FAIL | `effectiveCaseRecord`, `accessMode`, `deterministicScoreSource`, and `access`, approx. lines 1744-1876 | Truth Source Priority; Derived Fields Contract | Backend data is not consistently final authority. Route/shared receipt data, `receiptContext`, `verificationFlat`, `currentCase`, local billing override, and local computed score can influence payment, event count, receipt eligibility, and verification eligibility. | Build a backend-owned verification gate from canonical case, backend receipt/payment state, and backend verification fields; use route/local data only as display fallback. |
| FAIL | `receiptAllowsVerification` and `cameFromIssuedReceipt`, approx. lines 1955-1972 | Verification unlock boundary; Page Consumption Contract | Verification can be allowed by deterministic score, page-computed `access.verificationEligible`, any receipt ledger hash, local `effectiveCaseRecord.receipt.eligible`, route `receiptDecisionStatus`, or `caseId` alone. This can unlock verification without backend-owned paid/activated/issued or `verificationEligible` state. | Require backend-owned receipt-ready plus backend/payment-owned paid/activated/issued state, or backend `verificationEligible === true`, before allowing formal verification. |
| FAIL | `finalOverallStatus`, `data.overallStatus`, `shouldPromoteVerificationReady`, approx. lines 1992-2006 and 2095-2202 | No Downgrade Rule; Derived Fields Contract | Verification Ready can be promoted from route/shared `resolvedVerificationEligible`, local receipt decision text, evaluated structure, or computed access. Backend `verification_ready`/`verification_issued` are not modeled as monotonic canonical signals, and fallback data can create a stronger display state than backend truth. | Add explicit backend verification-ready/issued helpers and make display readiness `backendVerificationReady || backendVerificationIssued || backendEligible`, with fallback-derived values clearly marked preview only. |
| FAIL | Payment and activation signals in `accessMode`, `verificationActivated`, and `handleActivateVerificationForCase()`, approx. lines 1772-1780 and 2311-2329 | Payment trust boundary; Verification unlock boundary | `isPaid` can come from route/shared case data before backend case data. `verificationActivated` can come from local `caseBillingOverride`, local `effectiveCaseRecord.isPaid`, or a local `source: "local_test"` activation write. This can affect paid/activated UI and formal verification controls. | Trust paid/activated only from backend/payment-owned fields or backend-confirmed checkout state; remove or isolate local test activation so it cannot affect production gates. |
| FAIL | Receipt/hash dependency in `resolveVerificationPayload()`, `liveReceiptHash`, `proofReceiptHash`, and `verificationHash`, approx. lines 360-536, 2020-2040, and 2251-2362 | Hash ledger consistency; Page Consumption Contract | Receipt hashes can come from shared route contract, route envelope, receipt context, stored verification data, or local generated verification hash. `getStableHashValue()` accepts any non-empty string, so stale or short local hashes can participate in readiness and display. | Accept hash values for formal verification only from backend ledger or backend receipt record, and validate format before use in readiness or ledger writes. |
| WARNING | `workflowEventLogs` and `effectiveCaseEvents`, approx. lines 1681-1731 and 1789-1920 | Event Trust Boundary | Backend analytics events are filtered by caseId, but local `effectiveCaseRecord.events`, `eventLogs`, `entries`, `latestEvent`, and route/shared timelines can feed score and baseline checks without per-event case scoping. | Treat local/route event arrays as progress context unless each event is case-scoped or comes from a backend source already scoped to the case. |
| FAIL | `hasEventBackedBaseline`, approx. lines 1907-1920 | Event Trust Boundary; Verification unlock boundary | Any local event count, local event array, latest event, or route-derived current-case event can satisfy the event-backed baseline. This can bypass the requirement for trusted case-scoped evidence. | Require backend-scoped event evidence or trusted receipt evidence before events can support formal verification readiness. |
| FAIL | `syncVerificationHashToLedger()` and ledger sync effects, approx. lines 184-227 and 2369-2428 | Verification write boundary; Persistence boundary | The page POSTs `/hash-ledger/verification` with `verificationStatus: "verification_ready"` from a frontend-generated hash and page-derived payload. The write is not gated by backend-owned verification eligibility/payment/activation and has no monotonic backend lifecycle comparison. | Only POST verification ledger records from backend-confirmed receipt/payment/verification state, or delegate verification-ready ledger creation to the backend. |
| FAIL | `saveStoredVerificationHash()` and local verification persistence, approx. lines 149-181 and 2407-2444 | Page Consumption Contract; Persistence boundary | The page writes `verificationHash` and `verification.eligible` into localStorage/caseRegistry from fallback-derived conditions. Future fallback reads can treat this local state as context for readiness. | Store local verification data as preview/cache only, with source metadata that prevents it from affecting gates or canonical display. |
| WARNING | `logTrialEvent()` verification result writes, approx. lines 2632-2749 | Derived Fields Contract; Event Trust Boundary | The page logs `verification_passed` or `verification_failed` from page-computed `finalOverallStatus`. If analytics events are later consumed as evidence, computed preview states may contaminate backend event history. | Mark these as UI telemetry only or avoid using them as evidence events for readiness. |
| WARNING | Receipt ledger dependency, approx. lines 1645-1679, 1932-1953, and 2490-2564 | Receipt and hash dependency | `hasLedgerReceipt` is treated as strong evidence when any ledger hash exists, but the code does not validate that the ledger record represents paid/activated/issued receipt state. | Distinguish ledger existence from backend receipt paid/activated/issued eligibility. |
| PASS | Direct backend and ledger reads use inferred `caseId`, approx. lines 1532-1568, 1645-1679, and 2270-2299 | Routing and caseId propagation | `/case/:caseId`, receipt ledger, and verification ledger requests are scoped to the resolved case id. | Keep backend read paths requiring case id. |
| WARNING | `View all cases` and `receiptPath` navigation, approx. lines 1767-1769, 2777-2805, 3023-3032, and 4120 | Routing and caseId propagation | Back-to-receipt keeps `caseId` in the URL when `activeCaseId` resolves, but View all cases navigates without passing case context. If `activeCaseId` is missing, Receipt fallback goes to `/cases`. | Preserve `caseId` and email in navigation state where the destination needs continuity. |
| FAIL | Header, issuance status, next-step labels, and action CTA, approx. lines 2965-2970, 3095-3105, 3567-3611, and 3614-3630 | UI status labels; Verification unlock boundary | UI can show "Verification Ready", "FORMAL VERIFICATION ISSUABLE", "Record eligible for formal issuance", or "Verify Record" from fallback-derived payment/access/status. Conversely, missing local events can still block a backend-ready/issued case because no monotonic backend verification guard exists. | Drive ready/paid/issued labels from backend-owned verification and payment state; show fallback-derived states as preview or checking only. |
| FAIL | Cross-page consistency with corrected ReceiptPage assumptions, approx. lines 1772-1972 and 2311-2444 | Cross-page contract consistency | ReceiptPage now requires backend-owned receipt/payment state for Verification unlock, but VerificationPage can still reconstruct unlock/readiness from route/local snapshots, deterministic score, local activation, and generated hash writes. | Mirror ReceiptPage's backend-owned Verification entry contract inside VerificationPage before rendering or persisting formal verification state. |

## Specific Area Results

| Area | Status | Notes |
| --- | --- | --- |
| Backend truth precedence | FAIL | Backend reads exist, but route/shared/local/currentCase data and page-computed values can still drive canonical-looking fields. |
| No-downgrade rule | FAIL | There is no monotonic backend verification-ready/issued guard; missing local events can block, while stale fallback data can promote. |
| Verification unlock boundary | FAIL | Unlock can be derived from score, receipt decision text, ledger hash existence, local receipt eligibility, or `caseId`. |
| Payment / activation trust boundary | FAIL | Local test activation and route/shared access data can affect activated/paid controls. |
| Receipt and hash dependency | FAIL | Route/local/stored hashes can participate in proof display and verification hash generation. |
| Event trust boundary | FAIL | Raw local event arrays and counts can satisfy baseline checks; backend analytics events are case-scoped. |
| Verification write boundary | FAIL | The page POSTs verification ledger state and writes local verification state from frontend-derived conditions. |
| Routing and caseId propagation | WARNING | Backend reads and receipt back link mostly preserve `caseId`; View all cases drops route context. |
| UI status labels | FAIL | Formal labels can reflect computed/fallback states rather than backend-owned state. |
| Cross-page contract consistency | FAIL | Current VerificationPage behavior is weaker than the corrected ReceiptPage unlock/payment/event boundaries. |

## Overall Compliance

| Metric | Result |
| --- | --- |
| Compliance score | 42 / 100 |
| Remaining FAIL items | Backend truth precedence, no-downgrade verification readiness, verification unlock, payment/activation trust, hash dependency, event trust, verification write boundary, UI labels, cross-page consistency. |
| Safe enough to proceed to next layer? | No. VerificationPage can still create and display formal verification-ready state from frontend-derived or fallback-derived data. |

## Remaining FAIL Items

| Area | Failure |
| --- | --- |
| Backend truth precedence | Route/shared/local/currentCase data can influence backend-owned fields and derived eligibility. |
| No-downgrade | Backend verification-ready/issued states are not explicitly monotonic, and local missing events can still block readiness. |
| Verification unlock | Formal verification can unlock without backend-owned paid/activated/issued or `verificationEligible` truth. |
| Payment / activation | Local activation with `source: "local_test"` can affect activated UI and controls. |
| Hash dependency | Route/local/stored hashes and generated hashes can enter formal display/write paths. |
| Event trust | Raw local event counts and arrays can satisfy event-backed baseline. |
| Write boundary | Frontend-generated verification hashes are POSTed as `verification_ready` ledger records. |
| UI labels | Formal readiness labels can be computed from fallback state. |
| Cross-page consistency | VerificationPage does not enforce the stricter boundaries now documented for ReceiptPage. |

## Remaining WARNING Items

| Area | Warning |
| --- | --- |
| Event source quality | Backend analytics events are case-scoped, but local events need stronger source metadata. |
| Verification telemetry | `verification_passed` / `verification_failed` analytics are page-computed and should not become readiness evidence. |
| Receipt ledger meaning | Ledger hash existence is treated as strong evidence even without explicit paid/activated/issued semantics. |
| Routing continuity | View all cases drops case context; receipt back link depends on `activeCaseId` resolution. |

## Top 3 Risks

| Rank | Risk | Why it matters |
| --- | --- | --- |
| 1 | VerificationPage can POST `verification_ready` ledger records from page-generated hashes. | This crosses from derived frontend display into permanent-looking backend proof state. |
| 2 | Formal verification unlock can come from fallback route/local state, deterministic score, or local activation. | It violates backend truth priority and payment/activation source ownership. |
| 3 | No monotonic backend verification guard exists. | Backend-ready or issued verification state can be obscured by missing local evidence, while stale snapshots can still promote readiness. |
