# Nimclea Readiness / Scoring Rule Table v0.1

Date: 2026-05-12  
Scope: Current implemented readiness and scoring baseline  
Status: v0.1 baseline; 11-A2 drafted
Code changes: none

---

## 1. Purpose

This document records the current implemented Nimclea readiness and scoring rules before future algorithm tuning.

It is a baseline, not a recommendation. The goal is to make future 11-series changes compare against the behavior that exists today.

---

## 2. Source of Truth

Inspected source files and functions:

| File | Functions / logic inspected | Notes |
| --- | --- | --- |
| `frontend/utils/deterministicScore.js` | `normalizeScoreInput()`, `normalizeEventText()`, `getEventScoreBoost()`, `calculateDeterministicScore()`, `buildReadinessContract()` | Primary scoring and receipt readiness implementation. |
| `frontend/utils/dataContractLifecycle.js` | `isBackendReceiptReady()`, `isBackendReceiptPaidOrActivated()`, `isBackendVerificationEligible()`, `isBackendVerificationReady()`, `buildBackendLifecycleSignals()` | Backend-owned lifecycle/readiness precedence. |
| `frontend/lib/accessMode.js` | `resolveAccessMode()` | Access-mode receipt and verification eligibility fallback rules. |
| `frontend/utils/sharedReceiptVerificationContract.js` | `resolveReceiptEligible()`, `buildChecksFromCaseSchema()`, `resolveVerificationStatusFromChecks()`, `resolveVerificationEligible()`, `createSharedReceiptVerificationContract()` | Shared receipt/verification contract and verification labels. |
| `frontend/pages/CasesPage.jsx` | `deriveCaseListState()` | `/cases` list display status contract. |
| `frontend/pages/ReceiptPage.jsx` | Readiness contract consumption, `receiptEligible`, `hasReadyReceipt`, `receiptDisplayState`, `decisionStatus`, `decisionTone` | Receipt UI state and label mapping. |
| `frontend/pages/VerificationPage.jsx` | Verification status labels, acceptance checklist, verdict theme | Verification UI label and color mapping. |
| `backend/server.js` | `/cases` merge readiness, event count, record richness scoring | Backend aggregation that marks merged cases receipt-ready. |

Rules below are direct code observations unless marked "inferred".

---

## 3. Readiness Gate Table

| Gate / State | Required Inputs | Rule | Pass Output | Fail Output | Source File / Function | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Diagnostic completed | Diagnostic/result case with no receipt-stage context, no evidence event, no paid/locked receipt or verification state | `/cases` treats diagnostic-only or diagnostic-continuation cases as diagnostic after higher-priority paid, checkout, receipt-ready, receipt-not-ready, and event branches are excluded | `Diagnostic completed` | Falls through to draft/status fallback | `frontend/pages/CasesPage.jsx` / `deriveCaseListState()`, `isDiagnosticOnlyCase()`, `isDiagnosticContinuationCase()` | Display contract only. Exact diagnostic-only helper details are outside primary scoring. |
| Case result ready | Result/preview/case result/pilot result context, or status/stage/currentStep indicating result/receipt context | Case result context contributes to receipt-not-ready display eligibility when receipt path and non-ready signals also exist | Enables receipt-stage yellow branch eligibility | Does not alone make receipt ready | `frontend/pages/CasesPage.jsx` / `hasPilotOrCaseResultContext`; `frontend/pages/ReceiptPage.jsx` / `hasPilotResultContext` | Inferred from display gates: result context is a floor for yellow, not a green readiness grant. |
| Event captured | Evidence events exist in `/cases`, or normalized event count is greater than zero in scoring | `/cases` displays `Event captured (n)` only after paid, checkout, ready, receipt-not-ready, and diagnostic conditions are evaluated | `Event captured (n)` | No event label; downstream scoring may remain insufficient | `frontend/pages/CasesPage.jsx` / `deriveCaseListState()`; `frontend/utils/deterministicScore.js` / `normalizeScoreInput()` | Event count alone can support continuity but does not guarantee receipt readiness. |
| Deterministic receipt score | Normalized events, workflow/scope data, event text/type signals | Four dimensions: evidence, structure, consistency, continuity. Each dimension maxes at 1. Total max 4. Receipt threshold is `3.0` and requires at least one real event | `receiptEligible: true` from deterministic score | `receiptEligible: false` | `frontend/utils/deterministicScore.js` / `calculateDeterministicScore()` | Explicit weights are documented in the scoring table below. |
| Receipt readiness contract | Deterministic score input plus evidence, structure, consistency, continuity, receipt-record formability | Five checks, each score 0 or 1. `receiptReady` requires `readinessScore >= 3.0` and no critical blockers. Critical blockers: evidence, consistency, receipt record | `receiptReady: true`, `readinessLevel: "ready"` | `failed`, `insufficient_record`, or `pending_review` | `frontend/utils/deterministicScore.js` / `buildReadinessContract()` | Readiness score is capped downward when evidence, structure, consistency, or continuity is missing. |
| Receipt eligible / green state | Backend receipt-ready signal or readiness contract ready | ReceiptPage sets `receiptEligible = backendReceiptReady || readinessContract.receiptReady`; `hasReadyReceipt` also accepts case/hydrated/local `receiptEligible`, `caseReceiptEligible`, or `receiptStatus === "ready"` | Green ready / `READY FOR FORMAL DETERMINATION` | Pending or yellow non-ready if unresolved/non-ready | `frontend/pages/ReceiptPage.jsx`; `frontend/utils/dataContractLifecycle.js` / `isBackendReceiptReady()` | Backend-owned readiness wins over local scoring. |
| Receipt not ready yellow | Not ready, receipt-stage/path context, pilot/case result or evidence context, and explicit non-ready signal | `/cases` uses `hasReceiptNotReadyDisplaySignal`; ReceiptPage uses pilot/result context plus false receipt eligibility signals and no ready signal | `Receipt not ready - Pending review`, `Receipt not ready - Insufficient record`, or receipt page yellow state | Not shown for plain diagnostic shells | `frontend/pages/CasesPage.jsx` / `deriveCaseListState()`; `frontend/pages/ReceiptPage.jsx` / `receiptDisplayState` | Inferred: yellow is a business state after meaningful receipt context, not a technical failure. |
| Verification readiness checks | Verification checks derived from parties, actions, evidence items or supplied checks | Failed check yields `Verification Failed`; warning or not-all-passed yields `Verification Warning`; all passed yields `Verification Ready` | `Verification Ready` | `Verification Warning` or `Verification Failed` | `frontend/utils/sharedReceiptVerificationContract.js` / `buildChecksFromCaseSchema()`, `resolveVerificationStatusFromChecks()` | No numeric verification weight is explicitly exposed in this shared contract. |
| Verification eligible | Verification status text includes ready/pass/verified and consistency check passes | `resolvedVerificationEligible = verificationEligibleFromChecks && consistencyCheck.passed` | `resolvedVerificationEligible: true` | `false` | `frontend/utils/sharedReceiptVerificationContract.js` / `resolveVerificationEligible()`, `createSharedReceiptVerificationContract()` | Backend verification eligibility can also override access gates through lifecycle helpers. |
| Access-mode verification eligible | Backend verification eligible signal, or receipt eligible plus event count > 0 | `verificationEligible = backendVerificationEligible || (receiptEligible && eventCount > 0)` | `canViewVerification: true` | `canViewVerification: false` | `frontend/lib/accessMode.js` / `resolveAccessMode()` | Access-mode rule is separate from formal verification payment/issuance. |
| Paid / checkout-related readiness | Payment status, receipt/payment objects, backend lifecycle statuses | `/cases` priority is Paid, Receipt checkout started, Receipt ready, Receipt not ready, Event captured, Diagnostic completed, fallback | `Paid` or `Receipt checkout started` labels before receipt readiness labels | Falls through to readiness/status labels | `frontend/pages/CasesPage.jsx` / `deriveCaseListState()`; `frontend/utils/dataContractLifecycle.js` | Payment does not by itself create scoring evidence in `buildReadinessContract()`. |
| Backend-owned readiness precedence | Backend case/receipt fields and lifecycle status/stage labels | Backend helpers ignore fallback/cache/snapshot sources and accept true flags or strong status/stage labels | Backend ready/paid/verification access booleans | False when only fallback source or no trusted signal exists | `frontend/utils/dataContractLifecycle.js` / backend lifecycle helpers | Source filtering protects against local/snapshot upgrades. |

---

## 4. Scoring Signal Table

| Signal | Detection Method | Score / Weight | Positive Effect | Missing / Negative Effect | Source File / Function | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Event count | Normalized from `events`, `capturedEvents`, `entries`, `pilot_entries`, `pilotEntries`, `pilot.entries`, or `pilot.pilot_entries` | Not a direct point value; `eventCount > 0` enables real-event paths | Enables `hasRealEvent`, supports structure/consistency/continuity base scores and receipt threshold requirement | No real event means deterministic `receiptEligible` cannot pass | `frontend/utils/deterministicScore.js` / `normalizeScoreInput()`, `calculateDeterministicScore()` | Events are sorted by timestamp then original index. |
| Evidence text cues | Regex over joined event text/type: evidence, record, reviewed, verified, support, invoice, txn, transaction, receipt, hash, case id | Base evidence `0.9`; boost `+0.2` for evidence signal, `+0.1` for reviewed/approved/executed/confirmed/captured/logged/verified, capped at 1 | Raises evidence dimension | Without evidence but with real event, base evidence is `0.55`; without event, `0` | `frontend/utils/deterministicScore.js` / `calculateDeterministicScore()`, `getEventScoreBoost()` | Readiness contract evidence is stricter than deterministic evidence. |
| Readiness evidence event | Event type not in non-evidence set, not `diagnostic_*`, and either explicit evidence type or evidence text pattern | Readiness check score `1` when any event matches | Passes critical evidence check | Critical blocker; readiness score capped to max `1.0`; readiness level becomes `insufficient_record` unless consistency failed | `frontend/utils/deterministicScore.js` / `isReadinessEvidenceEvent()`, `buildReadinessContract()` | Evidence types include `evidence_capture`, `evidence_event`, `receipt_evidence`, `receipt_evidence_capture`, `formal_evidence_capture`. |
| Workflow cues | `scopeLock.workflow`, `caseData.workflow`, or event text containing `workflow` | Base structure `1.0` when workflow or decision scope exists | Raises structure dimension | With real event only, base structure is `0.6`; with no event, `0` | `frontend/utils/deterministicScore.js` / `normalizeScoreInput()`, `calculateDeterministicScore()` | Workflow also appears in pilot/setup but scoring reads normalized case data. |
| Authority / ownership cues | Regex: authority, approved, approval, owner, ownership, manager, opsmgr, finance, role, responsibility, decision authority | Structure boost `+0.2`, capped with other structure boosts at `0.35` | Raises structure dimension | No boost | `frontend/utils/deterministicScore.js` / `getEventScoreBoost()` | Separate from verification authority guidance. |
| Decision scope cues | Event text includes request, decision, scope, clarified | Base structure `1.0`; base consistency `0.85` | Raises structure and consistency | With real event only, base consistency is `0.45`; with no event, `0` | `frontend/utils/deterministicScore.js` / `calculateDeterministicScore()` | Scope/boundary/responsibility/decision/path/workflow text also adds structure boost `+0.1`. |
| Conflict / consistency cues | Regex: inconsistent, inconsistency, conflict, conflicting, mismatch, duplicate, duplicated, discrepancy, ambiguous, different interpretations, unclear record(s) | Consistency boost `+0.2`; reconcile/reconciliation/manual/cross-check adds `+0.1`; cap `0.35` | Raises deterministic consistency score | Does not itself mark readiness consistency broken | `frontend/utils/deterministicScore.js` / `getEventScoreBoost()`, `calculateDeterministicScore()` | Readiness consistency fails only on explicit broken/mismatch/inconsistent status signals. |
| Evidence-chain broken signal | `evidenceLockBroken === true`, `isEvidenceLockedConsistent === false`, or status text broken/failed/fail/mismatch/inconsistent | Readiness consistency check score `0` | None | Critical blocker; readiness score capped to max `2.0`; readiness level `failed` | `frontend/utils/deterministicScore.js` / `buildReadinessContract()` | This is stronger than deterministic conflict cues. |
| Continuity cues | Regex: pending, validation pending, follow-up validation, no final confirmation, not confirmed, awaiting confirmation, no closure, unresolved, time pressure, still pending, etc. | Base continuity `0.85`; continuity boost `+0.2`; closed/closure/confirmed/completed/resolved adds `+0.1`; cap `0.3` | Raises continuity dimension | With repeated events, base continuity `0.65`; with one real event, `0.45`; with no event, `0` | `frontend/utils/deterministicScore.js` / `calculateDeterministicScore()`, `getEventScoreBoost()` | Continuity readiness also requires non-missing continuity/status/stage/currentStep and enough progression. |
| Repeated events | `eventCount >= 2` | Base continuity `0.65` if no stronger continuity cue | Raises continuity | Single event gets base continuity `0.45`; no event `0` | `frontend/utils/deterministicScore.js` / `calculateDeterministicScore()` | Does not create readiness evidence by itself after current calibration. |
| Synergy | Evidence, conflict, authority, and continuity signals all present | Evidence `+0.05`, structure `+0.05`, consistency `+0.05`, continuity `+0.1` | Small multi-signal boost | No synergy boost | `frontend/utils/deterministicScore.js` / `getEventScoreBoost()` | Boosts remain subject to per-dimension caps. |
| Structure readiness | Non-missing structure status and numeric structure score > 0 | Readiness check score `1` | Passes structure check | If missing, readiness score capped to max `2.4` | `frontend/utils/deterministicScore.js` / `buildReadinessContract()` | Structure status can come from structure/status fields, caseData, receipt, scope, or checklist. |
| Continuity readiness | Non-missing continuity status and enough progression from events, stage, status, or currentStep | Readiness check score `1` | Passes continuity check | If missing, readiness score capped to max `2.8` | `frontend/utils/deterministicScore.js` / `buildReadinessContract()` | Continuity is distinct from deterministic continuity score. |
| Receipt record formability | Explicit receipt ready, `receiptRecordFormable`, receipt id/hash/hash/caseSnapshotHash, receipt object id/hash, or caseId plus evidence plus structure plus continuity | Readiness check score `1` | Passes receipt-record check | Critical blocker if false | `frontend/utils/deterministicScore.js` / `buildReadinessContract()` | Backend-ready can satisfy this directly. |
| Backend case hydration | Backend case record or backend-confirmed hydrated receipt record supplies receipt-ready lifecycle signals | Not a numeric score; boolean precedence | Can make `backendReceiptReady` true and force green-ready behavior | Missing backend signals fall back to contract/local context | `frontend/pages/ReceiptPage.jsx`; `frontend/utils/dataContractLifecycle.js` | Page-level behavior; not part of deterministic scoring. |
| Receipt record hydration | Hydrated receipt record can supply `receiptEligible`, `caseReceiptEligible`, `receiptStatus`, event count, receipt id/hash | Not a numeric score unless passed into readiness input | Can support ready, receipt record formability, or case context | If unresolved, page may stay checking/pending | `frontend/pages/ReceiptPage.jsx`; `frontend/utils/deterministicScore.js` | Inferred from ReceiptPage merge and readiness input. |
| Backend `/cases` event merge | Event logs from base case, receipt case, and matched event logs are deduplicated | Merged `eventCount = max(base eventCount, receipt eventCount, mergedEvents.length)` | More accurate list state and event count | No event-derived stage when count is zero | `backend/server.js` / `/cases` merge logic | Backend aggregation, not scoring algorithm. |
| Record richness | `receiptEligible` +1000, `receipt_ready` stage +2000, receipt/verification currentStep +500, source-specific score, updated time, event count | Internal backend selection score | Helps pick richer record among duplicates | Lower-richness record may lose merge precedence | `backend/server.js` / `getRecordRichnessScore()` | Used for aggregation precedence; not user-facing score. |

---

## 5. Rule Layer Classification Table

| Rule / Signal / State | Current Source | Layer Type | Should Affect Score? | Should Block Readiness? | Should Control UI? | Notes / Future Refactor Risk |
| --- | --- | --- | --- | --- | --- | --- |
| Real event required for receipt eligibility | `calculateDeterministicScore()` | Hard Gate | Yes, indirectly through event-dependent base scores | Yes, deterministic receipt eligibility requires at least one real event | Indirectly | Current deterministic rule couples scoring and gating. |
| Readiness evidence event | `isReadinessEvidenceEvent()`, `buildReadinessContract()` | Hard Gate | No, except readiness check score | Yes, critical blocker when absent | Indirectly through readiness level | Good separation from softer evidence text boosts. |
| Evidence-chain consistency / broken lock | `buildReadinessContract()` | Hard Gate | No, except readiness check score | Yes, critical blocker; failed level | Yes, drives failed/red label | Text conflict boosts are separate and softer. |
| Receipt record formability | `buildReadinessContract()` | Hard Gate | No, except readiness check score | Yes, critical blocker when false | Indirectly through ready/non-ready labels | Mixes explicit backend-ready, receipt hashes, and derived formability. |
| Verification consistency check | `buildConsistencyCheckFromContract()` | Hard Gate | No | Yes, blocks `resolvedVerificationEligible` | Indirectly | Formal verification gate depends on consistency outcome. |
| Verification checks failed/warning/ready logic | `resolveVerificationStatusFromChecks()` | Hard Gate / UI State | No | Failed blocks ready status; warning prevents ready | Yes | Mixed because the same check result creates business verdict labels. |
| Evidence text cues | `calculateDeterministicScore()`, `getEventScoreBoost()` | Soft Signal | Yes | No | No direct control | Should remain a score-strength signal, not a standalone readiness pass. |
| Workflow cues | `normalizeScoreInput()`, `calculateDeterministicScore()` | Soft Signal | Yes | No | No direct control | Helps structure score. |
| Authority / ownership cues | `getEventScoreBoost()` | Soft Signal | Yes | No | No direct control | Verification guidance separately treats authority as a business weakness. |
| Decision scope cues | `calculateDeterministicScore()`, `getEventScoreBoost()` | Soft Signal | Yes | No | No direct control | Affects structure and consistency dimensions. |
| Conflict / consistency text cues used as boost | `calculateDeterministicScore()`, `getEventScoreBoost()` | Soft Signal | Yes | No | No direct control | Future cleanup should keep this distinct from broken-lock hard gate. |
| Continuity cues | `calculateDeterministicScore()`, `getEventScoreBoost()` | Soft Signal | Yes | No | No direct control | Helps continuity score but does not alone pass readiness. |
| Repeated events | `calculateDeterministicScore()` | Soft Signal | Yes | No | No direct control | Adds continuity strength only. |
| Synergy boost | `getEventScoreBoost()` | Soft Signal | Yes | No | No direct control | Small score-only effect. |
| Structure score | `calculateDeterministicScore()`, `buildReadinessContract()` | Mixed / Needs Refactor | Yes | Yes, when readiness structure check fails it caps readiness | Indirectly | Structure appears both as score dimension and readiness check. |
| Continuity score | `calculateDeterministicScore()`, `buildReadinessContract()` | Mixed / Needs Refactor | Yes | Yes, when readiness continuity check fails it caps readiness | Indirectly | Continuity appears both as score dimension and readiness check. |
| Checking receipt status | `ReceiptPage.jsx` / `decisionStatus`, `receiptDisplayState` | UI State | No | No | Yes | Should remain neutral while hydration is unresolved. |
| Receipt ready green label | `ReceiptPage.jsx`, `CasesPage.jsx` | UI State | No | No | Yes | Displays backend/contract output; should not create readiness. |
| Receipt pending review yellow label | `ReceiptPage.jsx`, `CasesPage.jsx` | UI State | No | No | Yes | Displays non-ready contract output. |
| Receipt insufficient yellow label | `ReceiptPage.jsx`, `CasesPage.jsx` | UI State | No | No | Yes | Displays insufficient evidence/non-ready state. |
| Receipt failed red label | `ReceiptPage.jsx`, `CasesPage.jsx`, `buildReadinessContract()` | UI State / Hard Gate | No | Yes, due consistency blocker | Yes | Mixed because failed label comes from hard consistency blocker. |
| Unable to confirm receipt status | `ReceiptPage.jsx` / `receiptHydrationFailed` | UI State | No | No | Yes | Technical failure display only. |
| Cases diagnostic label | `CasesPage.jsx` / `deriveCaseListState()` | UI State | No | No | Yes | Display state after higher-priority lifecycle states are excluded. |
| Cases event captured label | `CasesPage.jsx` / `deriveCaseListState()` | UI State | No | No | Yes | Activity display, not receipt readiness. |
| Verification Ready / Warning / Failed display labels | `sharedReceiptVerificationContract.js`, `VerificationPage.jsx` | UI State | No | Warning/failed can block verification readiness | Yes | Mixed with verification check logic. |
| Paid | `CasesPage.jsx`, `dataContractLifecycle.js` | Payment Unlock | No | No | Yes | Payment state should not add evidence quality. |
| Receipt checkout started | `CasesPage.jsx` | Payment Unlock | No | No | Yes | Payment progress display only. |
| `paymentStatus` | `CasesPage.jsx`, `dataContractLifecycle.js`, `accessMode.js` | Payment Unlock | No | No | Yes / access | Mixed risk if reused as readiness evidence. |
| Receipt activation | `ReceiptPage.jsx`, `dataContractLifecycle.js` | Payment Unlock | No | No | Yes / access | Controls formal receipt/payment state, not scoring. |
| Verification payment unlock | `VerificationPage.jsx`, `dataContractLifecycle.js`, `accessMode.js` | Payment Unlock | No | No | Yes / access | Controls formal verification access, not evidence strength. |
| `backendReceiptReady` | `ReceiptPage.jsx`, `dataContractLifecycle.js` | Backend Precedence | No | Can bypass local readiness gates as trusted ready source | Yes | Trusted source priority, not scoring. |
| `backendVerificationEligible` | `accessMode.js`, `dataContractLifecycle.js` | Backend Precedence | No | Can grant verification eligibility | Yes / access | Trusted backend lifecycle signal. |
| Backend lifecycle helpers | `dataContractLifecycle.js` | Backend Precedence | No | Yes when trusted lifecycle says ready/issued/paid | Yes / access | Source filtering excludes fallback/cache/snapshot sources. |
| Backend case hydration | `ReceiptPage.jsx`, `VerificationPage.jsx` | Backend Precedence | No | Can determine trusted lifecycle state | Yes | Hydration should settle source priority, not add score. |
| Receipt record hydration as trusted lifecycle signal | `ReceiptPage.jsx`, backend `/receipt-record` | Backend Precedence | No | Can support ready/non-ready display | Yes | Risk if stale receipt record overrides stronger case lifecycle. |
| Backend `/cases` event merge | `backend/server.js` | Aggregation / Record Selection | No direct score | No | Indirectly through list state | Produces merged event count and status inputs. |
| Record richness score | `backend/server.js` / `getRecordRichnessScore()` | Aggregation / Record Selection | No user-facing score | No | Indirectly | Internal duplicate precedence score only. |
| Duplicate record precedence | `backend/server.js` / `pickRicherCaseRecord()`, merge logic | Aggregation / Record Selection | No | No | Indirectly | Candidate for documentation if source precedence changes. |
| Case ordering timestamp preference | Nearby lifecycle progress docs / commit `eaf3708` | Aggregation / Record Selection | No | No | Yes, list order | Mentioned by 10-E docs; not inspected as scoring rule in 11-A1. |
| Shared contract `receiptThreshold: 3.5` vs deterministic/readiness `3.0` | `sharedReceiptVerificationContract.js`, `deterministicScore.js` | Mixed / Needs Refactor | Yes in legacy shared contract; yes in deterministic score | Yes in readiness contract via 3.0 threshold | Indirectly | Threshold mismatch is documented baseline, not changed. |
| Access-mode verification eligible fallback | `accessMode.js` / `resolveAccessMode()` | Mixed / Needs Refactor | No direct score | Can grant access eligibility | Yes / access | Blends backend eligibility, receipt eligibility, and event count. |
| ReceiptPage `receiptEligible = backendReceiptReady || readinessContract.receiptReady` | `ReceiptPage.jsx` | Mixed / Needs Refactor | No direct score | Yes for page readiness | Yes | Blends backend precedence and local readiness contract. |

---

## 6. Status Color / Label Table

| UI State | Label | Color / Visual Meaning | Trigger Condition | Source File / Function | Notes |
| --- | --- | --- | --- | --- | --- |
| Receipt checking | `Checking receipt status` | Neutral checking | Receipt page hydrating/loading/unresolved | `frontend/pages/ReceiptPage.jsx` / `data.decisionStatus`, `receiptDisplayState` | Prevents yellow/green assertion before readiness is known. |
| Receipt ready | `READY FOR FORMAL DETERMINATION`; `/cases`: `Receipt ready` | Green / ready | Backend receipt-ready or readiness contract ready | `frontend/pages/ReceiptPage.jsx`; `frontend/pages/CasesPage.jsx`; `frontend/utils/dataContractLifecycle.js` | ReceiptPage `decisionTone === "ready"` uses emerald colors. |
| Receipt pending review | `Receipt Pending Review`; `/cases`: `Receipt not ready - Pending review` | Yellow / warning | Readiness level `pending_review` or yellow receipt display signal | `frontend/utils/deterministicScore.js`; `frontend/pages/ReceiptPage.jsx`; `frontend/pages/CasesPage.jsx` | Business non-ready state, not technical failure. |
| Receipt insufficient | `Insufficient Record`; `/cases`: `Receipt not ready - Insufficient record` | Yellow / warning | Evidence missing or confirmed non-ready with receipt/result context | `frontend/utils/deterministicScore.js`; `frontend/pages/ReceiptPage.jsx`; `frontend/pages/CasesPage.jsx` | `readinessLevel: "insufficient_record"` maps from missing readiness evidence. |
| Receipt failed | `Receipt Failed`; `/cases`: `Receipt failed` | Red / failed | Readiness consistency check fails | `frontend/utils/deterministicScore.js`; `frontend/pages/ReceiptPage.jsx`; `frontend/pages/CasesPage.jsx` | Consistency failure is a critical blocker. |
| Receipt unable | `Unable to confirm receipt status` | Technical failure | Invalid/missing caseId, backend case fetch failure, missing case after lookup, fatal hydration/API error | `frontend/pages/ReceiptPage.jsx` / `receiptHydrationFailed`, `receiptDisplayState` | Must not be used for confirmed false receipt eligibility. |
| Cases paid | `Paid` | Completed/payment state | Backend receipt paid/activated or paid flags | `frontend/pages/CasesPage.jsx`; `frontend/utils/dataContractLifecycle.js` | Highest `/cases` display priority. |
| Cases checkout | `Receipt checkout started` | Payment in progress | `paymentStatus === "checkout_created"` | `frontend/pages/CasesPage.jsx` | Priority below paid, above ready. |
| Cases event captured | `Event captured (n)` | Activity present | Evidence event count > 0 after higher priority states excluded | `frontend/pages/CasesPage.jsx` | Activity is not equivalent to receipt-ready. |
| Cases diagnostic | `Diagnostic completed` | Diagnostic result state | Diagnostic continuation after higher priority states excluded | `frontend/pages/CasesPage.jsx` | Must not become yellow without receipt-stage context. |
| Verification passed check | Check chip `passed` | Emerald / passed | Individual verification check status `passed` | `frontend/pages/VerificationPage.jsx` / `getStatusStyles()` | Check-level style. |
| Verification warning check | Check chip `warning` | Amber / warning | Individual verification check status `warning` | `frontend/pages/VerificationPage.jsx` / `getStatusStyles()` | Check-level style. |
| Verification failed check | Check chip `failed` | Red / failed | Individual verification check status `failed` | `frontend/pages/VerificationPage.jsx` / `getStatusStyles()` | Check-level style. |
| Verification Ready | `Verification Ready` | Green / externally ready | All verification checks passed and final overall status ready | `frontend/utils/sharedReceiptVerificationContract.js`; `frontend/pages/VerificationPage.jsx` | Verdict theme uses emerald colors. |
| Verification Warning | `Verification Warning` | Yellow / internally reviewable, not externally stable | Any warning or not all passed without failed checks | `frontend/utils/sharedReceiptVerificationContract.js`; `frontend/pages/VerificationPage.jsx` | Verdict theme uses amber colors. |
| Verification Failed | `Verification Failed` | Red / formal negative or failed | Any verification check failed, or final failed state | `frontend/utils/sharedReceiptVerificationContract.js`; `frontend/pages/VerificationPage.jsx` | Verdict theme uses red colors. |

---

## 7. 11-A2 Interpretation

- Scoring should measure evidence strength.
- Hard gates should decide whether a case can pass a readiness boundary.
- UI states should display contract outputs, not create readiness themselves.
- Payment unlock should control access/activation, not evidence quality.
- Backend precedence should decide trusted source priority, not add score.
- Mixed rules should be candidates for later 11-series cleanup, not changed in 11-A2.

---

## 8. 11-A2 Known Findings

- The system already separates many scoring signals from readiness gates.
- Some legacy/mixed areas remain, especially receipt threshold mismatch and access-mode verification fallback.
- No behavior was changed in 11-A2.

---

## 9. Known Limits / Do Not Tune Yet

- This document is only a baseline.
- No scoring weights were changed in 11-A1.
- No readiness thresholds were changed in 11-A1.
- No frontend logic, backend logic, backend/data files, or package files were changed in 11-A1.
- No scoring weights, readiness thresholds, frontend logic, backend logic, backend/data files, or package files were changed in 11-A2.
- Future 11-series work can tune thresholds, weights, and signal quality after this table is reviewed.
- Some display behavior is page-level and marked as inferred where it is derived from UI branch logic rather than a single exported scoring function.
- The shared receipt/verification contract still exposes a legacy `receiptThreshold: 3.5`, while the deterministic receipt threshold and readiness contract threshold are `3.0`. This document records both as implemented; it does not resolve the difference.

---

## 10. 11-Series Progress

| Step | Status | Date | Scope | Code changes |
| --- | --- | --- | --- | --- |
| 11-A1: Readiness / Scoring Rule Table v0.1 | PASS / committed | 2026-05-12 | Documentation only | none |
| 11-A2: Rule-layer classification | Drafted | 2026-05-12 | Documentation only | none |
