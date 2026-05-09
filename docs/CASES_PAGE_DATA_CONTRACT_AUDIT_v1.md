# CasesPage Data Contract Audit v1

Scope: `frontend/pages/CasesPage.jsx` re-audited against `docs/DATA_CONSISTENCY_CONTRACT_v1.md`.

No frontend or backend code was modified during this re-audit. This report was updated only to reflect the current state of `CasesPage.jsx`.

## Findings

| Status | Location | Contract rule affected | Risk | Suggested fix |
| --- | --- | --- | --- | --- |
| PASS | `loadCasesForEmail()`, approx. lines 905-987 | Truth Source Priority | `/cases?email` records are loaded first, keyed by case id, and same-id local registry records are merged underneath backend records. `hydrateCaseDetails()` then overlays `/case/:caseId` detail data over the merged record. Backend precedence is preserved for same-named fields. | Keep this merge direction. Add a helper or test later if this merge becomes shared logic. |
| WARNING | `loadCasesForEmail()`, approx. lines 929-983 | Truth Source Priority; Page Consumption Contract | `caseRegistry` records are included when their id is absent from `/cases?email`, so purely local cases can appear as active workspace cases. This may be acceptable for drafts, but local snapshots can still become visible records without backend consolidation. | Gate local-only records to draft/new-case display, or label them explicitly as local fallback until backend accepts them. |
| PASS | `loadCasesForEmail()` hydration mapper, approx. lines 1000-1043 | No Downgrade Rule; Derived Fields Contract | Resolved. The mapper no longer rewrites canonical `status` to `"active"` and no longer coerces canonical `receiptEligible`, `paymentStatus`, or `paid`. The active marker is now stored in display-only `listDisplayStatus`. | Keep canonical fields immutable in this mapper: `status`, `stage`, `receiptStatus`, `receiptEligible`, `caseReceiptEligible`, `paymentStatus`, and `verificationEligible` should remain backend-owned. |
| PASS | `hasCanonicalBackendReceiptReadySignal()` and `deriveCaseListState()`, approx. lines 387-521 | No Downgrade Rule; UI status labels | Resolved. Backend receipt readiness signals are centralized in `hasCanonicalBackendReceiptReadySignal()`, then used by `explicitBackendReady`, `legacyReceiptReadySignal`, `hasReceiptStageSignal`, and `receiptReady`. A backend-ready case now displays `"Receipt ready"` before draft, diagnostic, or not-ready fallbacks. | Preserve this monotonic guard for list display and routing. Extend the same pattern later for verification readiness. |
| WARNING | `deriveCaseListState()`, approx. lines 421-445 and 484-490 | Readiness Contract Usage | CasesPage still precomputes `effectiveStructureStatus`, `effectiveStructureScore`, and concrete progress before calling `buildReadinessContract()`. This means the page partially interprets readiness inputs outside the contract. | Move these interpretations into the readiness contract or a shared adapter so CasesPage mainly consumes the contract result. |
| WARNING | `isDiagnosticContinuationCase()`, approx. lines 341-384 | Stage ordering | The function itself still does not directly exclude receipt-ready backend signals. Current routing/display is protected because callers also check `derived.hasReceiptStageSignal` and `derived.receiptReady`, but the helper remains risky if reused without those guards. | Add explicit receipt-ready and verification-ready guards before returning diagnostic continuation if this helper is reused elsewhere. |
| PASS | `hasReceiptDetailRouteSignal()`, approx. lines 595-627 | Event Trust Boundary; Routing consistency | Resolved. Raw `eventCount`, `eventCaptured`, `eventLogs`, `events`, `supportingEvents`, and `structuredEvents` are no longer direct Receipt route signals. Receipt routing now relies on canonical backend readiness/status signals, `verificationEligible`, trusted `getEvidenceEvents()`, or `buildReadinessContract().receiptReady`. | Keep raw arrays/counts as progress hints only. If routing expands, require trusted evidence or backend-owned state. |
| WARNING | `hasReceiptDetailRouteSignal()`, approx. lines 598-627 | Truth Source Priority; Payment trust boundary | The function still uses broad `statusText.includes("receipt ready")`, `checkout_created`, and `paid` checks across normalized and `caseData` status fields. This preserves existing behavior, but broad text matching can trust weak or stale status strings. | Replace broad text matching later with explicit backend-owned status/field checks. |
| WARNING | `hasRealEventSignal()`, approx. lines 668-678 | Event Trust Boundary | Text fields such as `rawEventText`, `eventText`, `captureText`, and `userEventText` count as real event signals without the same case-id and event-type validation used by `getEvidenceEvents()`. They affect post-diagnostic routing and continuation decisions. | Treat raw text as progress context only unless attached to a trusted case-scoped event record. |
| WARNING | `deriveCaseListState()`, approx. lines 446-466 and 497-502 | Payment Trust Boundary | `snapshotOnly` blocks checkout/paid text from counting as trusted payment progress, but `paid` display still uses `normalized.paymentStatus === "paid"` directly. A snapshot marked `source: "receipt_snapshot"` with `paymentStatus: "paid"` can display `"Paid"`. | Apply the same `!snapshotOnly` guard to the `paid` display calculation unless a real payment/receipt object exists. |
| WARNING | `hasActivatedReceipt()`, approx. lines 730-758 | Payment Trust Boundary | Activated receipt detection trusts top-level `paid`, `isPaid`, `receiptStatus: paid/activated`, and payment-status-derived receipt status without checking `snapshotOnly` or payment object provenance. This can route to Verification from a stale snapshot. | Require backend-owned payment/receipt evidence or exclude snapshot-only records from activation checks. |
| PASS | `deriveCaseListState()`, approx. lines 467-475 | Payment Trust Boundary | Receipt object status values `issued`, `activated`, and `paid` are ignored when `source === "receipt_snapshot"`, preventing snapshot-only receipt statuses from creating receipt progress. | Preserve this guard and extend the same pattern to all paid/activated checks. |
| WARNING | `hasActivatedVerification()`, approx. lines 761-784 | No Downgrade Rule; Payment/verification trust boundary | Verification activation is detected from status values including `ready`, `pass`, `passed`, and `final`, but `verificationEligible` is not surfaced as a canonical display state elsewhere. Verification-ready backend state can be under-displayed, while broad status strings can over-route. | Add a backend-owned verification readiness adapter that distinguishes eligible, ready, paid, and issued, and excludes snapshot-only signals. |
| PASS | `getCaseDetailRoute()`, approx. lines 630-665 | Routing consistency | Existing receipt-ready or trusted-evidence cases route to Receipt with `caseId`, activated receipt routes to Verification, missing diagnostic result routes to Diagnostic, and diagnostic result without event signal routes to Pilot/Case Plan. Case id propagation remains unchanged. | Keep route construction case-id first. Tighten broad status/payment checks in a later warning-focused pass. |
| PASS | Active list primary action, approx. lines 1619-1626 and 1756-1798 | Routing consistency; No Downgrade Rule | Resolved for backend receipt readiness. `shouldContinueDiagnostic` now sees `derived.hasReceiptStageSignal` and `derived.receiptReady` as true when canonical backend receipt-ready signals exist, preventing backend-ready cases from being sent to Pilot/Case Plan by the continuation guard. | Preserve the derived monotonic receipt-ready guard before diagnostic continuation routing. |
| PASS | UI status rendering, approx. lines 514-535 and 1684-1699 | UI status labels | Resolved for backend receipt readiness. A case with `receiptEligible`, `caseReceiptEligible`, `receiptStatus: ready`, `stage: receipt_ready`, or `status: receipt_ready` displays `"Receipt ready"` before draft/diagnostic/not-ready fallback labels. | Extend the same canonical-first label approach to verification readiness in a later pass. |
| WARNING | Archived list rendering, approx. lines 1848-1887 | UI status labels; Page Consumption Contract | Archived cases reuse the same derived status logic. Receipt-ready downgrade is fixed there too, but remaining payment and verification warnings still apply to archived cards. | Share a corrected canonical display adapter between active and archived lists as warnings are resolved. |

## Specific Area Results

| Area | Status | Notes |
| --- | --- | --- |
| Canonical backend status/stage preservation | PASS | The hydration mapper no longer overwrites canonical `status` with `"active"` and no longer coerces canonical readiness/payment fields in that block. |
| No-downgrade backend receipt readiness | PASS | Backend receipt-ready signals are monotonic for list display and continuation routing through `hasCanonicalBackendReceiptReadySignal()`, `receiptReady`, and `hasReceiptStageSignal`. |
| Receipt routing event trust boundary | PASS | Raw event arrays/counts are no longer direct Receipt route triggers. Trusted `getEvidenceEvents()` and readiness-contract output are used instead. |
| Backend truth precedence | WARNING | Same-id backend precedence is strong, but local-only registry records can still appear before backend consolidation. |
| Readiness contract usage | WARNING | `buildReadinessContract()` remains central for computed readiness, but CasesPage still prepares several readiness inputs locally. |
| Event trust boundary | WARNING | Main Receipt routing issue is fixed; raw text event signals still influence other progress/routing helpers. |
| Payment trust boundary | WARNING | Some snapshot-only payment signals are blocked, but paid/activated paths still need stronger provenance checks. |
| Routing consistency | PASS | Receipt-ready, trusted-evidence, diagnostic, and result routes preserve case id and no longer downgrade backend receipt-ready cases into continuation. |
| UI status labels | WARNING | Receipt-ready labels are fixed; payment and verification labels still have trust-boundary warnings. |

## Overall Compliance

| Metric | Result |
| --- | --- |
| Compliance score | 84 / 100 |
| Remaining FAIL items | None identified in this re-audit. |
| Safe enough to proceed to next layer? | Yes, for the next frontend/backend consistency layer. Remaining issues are warnings around local-only records, broad payment/status trust, and verification display semantics. |

## Remaining WARNING Items

| Area | Warning |
| --- | --- |
| Local-only case registry | Local cases absent from `/cases?email` can appear as workspace records. |
| Readiness adapter boundary | CasesPage still prepares some readiness inputs outside `buildReadinessContract()`. |
| Diagnostic continuation helper | `isDiagnosticContinuationCase()` relies on caller guards for receipt-ready protection. |
| Broad status text routing | `hasReceiptDetailRouteSignal()` still uses broad status text matching for paid/checkout/receipt-ready strings. |
| Raw text event signals | `hasRealEventSignal()` trusts raw text fields as event progress outside `getEvidenceEvents()` validation. |
| Payment provenance | `paid` display and activated receipt checks can still trust weak or snapshot-like payment signals. |
| Verification semantics | `verificationEligible` and verification status labels need a canonical backend-owned display contract. |
| Archived cards | Archived list shares remaining payment and verification display warnings. |

## Top 3 Remaining Risks

| Rank | Risk | Why it matters |
| --- | --- | --- |
| 1 | Weak payment/status provenance can still display paid or route to Verification from stale snapshot-like signals. | Payment state is backend-owned and should not be invented by frontend snapshots. |
| 2 | Local-only registry records can appear as cases before backend consolidation. | This can blur fallback context with canonical case truth. |
| 3 | Verification readiness/issued state is not yet handled with the same monotonic adapter as receipt readiness. | Verification flags are part of the no-downgrade contract and need equal protection. |
