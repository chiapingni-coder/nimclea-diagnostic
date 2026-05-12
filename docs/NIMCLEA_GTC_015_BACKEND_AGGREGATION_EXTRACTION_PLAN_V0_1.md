# Nimclea GTC-015 Backend Aggregation / Record Selection Extraction Plan v0.1

Date: 2026-05-12  
Scope: Documentation / extraction plan only  
Status: Drafted  
Code changes: none

---

## 1. Purpose

This document designs how to convert GTC-015 into a runnable backend aggregation / record selection smoke without changing production behavior yet.

GTC-015 should protect the `/cases` backend aggregation contract: duplicate case-shaped records, event records, receipt records, payment overlays, lifecycle status, title/name, and ordering must combine without downgrading the visible case state.

---

## 2. Why GTC-015 Is Different

GTC-015 is not a scoring/readiness pure function case.

It depends on backend record aggregation, duplicate case-shaped records, record richness, event count merge, trusted lifecycle source, payment/status precedence, title/name preservation, and case ordering. Those behaviors currently live inside the `/cases` route path in `backend/server.js`, not in a small exported helper.

It should not be forced into `scripts/check-golden-readiness.mjs` until the backend selection logic is safely extractable or testable. That smoke script currently focuses on deterministic frontend/helper contracts, while GTC-015 needs a backend aggregation harness.

---

## 3. Current Source Mapping

| Behavior | Current Source | Function / Logic Name | Inputs Used | Output / Effect | Extraction Risk |
| --- | --- | --- | --- | --- | --- |
| `/cases` source loading and merge entry point | `backend/server.js` | `app.get("/cases", ...)` | `cases.json`, `receiptRecords.json`, `eventLogs.json`, `emailLogs.json`, Supabase cases, Supabase receipt records, Supabase event logs, deleted-case denylist | Builds candidate records, merged matches, final deduped case list, and response ordering | High: route mixes I/O, filtering, aggregation, subscription overlay, and response shaping. |
| Supabase source normalization | `backend/server.js` | `loadSupabaseCaseSourcesForEmail()`, `normalizeSupabaseCaseRow()` | Supabase `cases`, `receipt_records`, `event_logs`; raw records; row timestamps | Converts Supabase rows into local case-shaped records | Medium: source trust flags and raw record fallbacks must remain identical. |
| Receipt record flattening | `backend/server.js` | `normalizeCaseRecord()` | `caseSnapshot`, nested `caseRecord`, nested `caseData`, receipt events, event logs, receipt eligibility fields | Produces a flat case-shaped record with events, eventCount, eligibility, status, stage, timestamps | Medium: existing behavior includes fallback eligibility from merged events; extraction must preserve that exactly. |
| Candidate seeding and source trust | `backend/server.js` | `canSeedWorkspaceCase()`, `hasRealCanonicalCaseSource()`, `isReceiptSnapshotSource()`, `isProtectedFormalOverlayRecord()`, candidate map logic | Source tokens, canonical case sources, receipt snapshot source, protected formal states, deleted-case set, matching email | Decides which records can seed workspace cases and which overlays can stand alone | High: mistakes can rebuild deleted cases or let fallback snapshots create workspace cases. |
| Event log merge / dedupe | `backend/server.js` | Inline `eventMap` merge inside `/cases` | Base case events/eventLogs, receipt case events/eventLogs, matched backend event logs, event ids, timestamps, notes | Produces deduped `mergedEvents` | Medium: dedupe key is ad hoc but business-visible through eventCount. |
| Event count calculation | `backend/server.js` | Inline `mergedEventCount` inside `/cases` | `baseCase.eventCount`, `receiptCase.eventCount`, deduped merged events length | Uses max of known event counts and deduped merged events | Low to medium: simple rule, but incorrect extraction can downgrade activity context. |
| Lifecycle status precedence | `backend/server.js` | `normalizeStageValue()`, `stageRank()`, `pickHigherStage()`, `isReceiptReady` calculation | `stage`, `status`, receipt eligibility, receipt status, event-derived stage | Produces final stage/status and ready state hints | Medium: `receipt_ready` must outrank diagnostic/event states, while payment/verified states have higher ranks. |
| Payment / checkout status precedence | `backend/server.js` | `normalizePaymentStatus()`, `getPaymentStatusRank()`, `getEffectivePaymentStatus()`, `pickStrongestPaymentStatus()` | `paymentStatus`, nested receipt input payment status, payment flags | Produces strongest payment status and paid flag | Medium: payment should not erase receipt readiness or create evidence quality. |
| Receipt status precedence | `backend/server.js` | `normalizeReceiptStatus()`, `getReceiptStatusRank()`, `pickStrongestReceiptStatus()` | Receipt status fields from matching records plus computed ready signal | Produces strongest receipt status | Low to medium: status ranking is small but affects list display and route behavior. |
| Record richness scoring | `backend/server.js` | `getRecordRichnessScore()` | `eventCount`, `stage`, `status`, `currentStep`, `source`, `receiptEligible`, `updatedAt`, `savedAt`, `createdAt` | Scores duplicate records for final selection | Medium: weights are implementation details and must be preserved during extraction. |
| Richer record selection | `backend/server.js` | `pickRicherCaseRecord()` | Existing final case record and incoming candidate | Keeps record with higher richness score | Medium: tie behavior keeps existing record; changing that can reorder or downgrade duplicates. |
| Durable candidate overlay | `backend/server.js` | `durableCandidates.forEach(...)` in `/cases` | Local and Supabase cases, normalized records, canonical source flag | Ensures durable case records can replace weaker merged candidates | Medium: can restore canonical case data but may overwrite fields if shape changes. |
| Case ordering timestamp preference | `backend/server.js` | `getCaseSortTime()` | Case ID timestamp, `createdAt`, `savedAt`, `updatedAt`, receipt timestamps, meta timestamps | Sorts final cases newest first, preferring timestamp embedded in `CASE-...` id | Medium: this protects case creation order from later repair/update churn. |
| Case title/name preservation | `backend/routes/caseRoutes.js`; surfaced by `/cases` merge in `backend/server.js` | `resolvePreservedCaseTitle()` in lifecycle saves; `/cases` title selection from receipt/base/item records | Existing title/name/caseName, incoming title/name/caseName, placeholder title detection | Prevents lifecycle saves from downgrading meaningful title; `/cases` should surface preserved title | Medium: title preservation happens before aggregation, but aggregation can still surface stale duplicates if selection regresses. |

---

## 4. GTC-015 Expected Behavior

Golden case:

- Multiple records or duplicate case-shaped records exist.
- Created timestamp and record richness/order matter.
- Richer/trusted record selection should not downgrade case state.
- Latest/trusted case state should remain visible.
- Access should follow selected trusted lifecycle state.
- Aggregation behavior must not downgrade readiness or title/status.

Expected assertion vocabulary:

- `expectRecordSelectionDoesNotDowngrade`
- `expectMergedEventCountPreserved`
- `expectTrustedLifecycleStatusPreserved`
- `expectCaseOrderingUsesCreationTimestamp`
- `expectTitleNotDowngradedByDuplicate`

---

## 5. Proposed Extraction Strategy

The safest future path is to extract pure backend helper functions from `backend/server.js` while preserving current behavior exactly.

Candidate helpers:

- `normalizeCaseRecordForMerge()` from current `normalizeCaseRecord()`.
- `getRecordRichnessScore()` as an exported helper with unchanged weights.
- `pickRicherCaseRecord()` as an exported helper with unchanged tie behavior.
- `mergeCaseEvents()` from the inline `eventMap` merge and dedupe key.
- `deriveMergedCaseEventCount()` from the current `Math.max(baseCase.eventCount, receiptCase.eventCount, mergedEvents.length)` rule.
- `pickStrongestCaseLifecycleStatus()` from `normalizeStageValue()`, `stageRank()`, `pickHigherStage()`, and receipt-ready derivation.
- `pickStrongestPaymentStatusForCase()` from the current payment rank helpers.
- `pickStrongestReceiptStatusForCase()` from the current receipt rank helpers.
- `sortCasesForList()` from `getCaseSortTime()` and final descending sort.
- `buildCasesListRecord()` from the current per-candidate map function that merges item, base case, receipt case, events, payment, receipt status, title, subscription, and eligibility.

Do not implement these helpers in 11-B2. This plan only identifies which existing logic could be extracted later.

When extraction happens, preserve:

- source trust and receipt snapshot filtering;
- deleted-case denylist filtering;
- title/name preservation behavior;
- lifecycle rank values;
- record richness weights;
- event dedupe keys;
- eventCount max rule;
- `CASE-<timestamp>-...` sort preference;
- payment and receipt status rank behavior;
- existing response shape.

---

## 6. Proposed Runnable Smoke Design

| Smoke Case | Fixture Shape | Target Future Helper | Expected Assertion | Risk Covered |
| --- | --- | --- | --- | --- |
| GTC-015A Duplicate Records: Richer Receipt-ready Record Wins | Two records with the same `caseId`: one diagnostic-only, one `stage: "receipt_ready"` with `receiptEligible: true` | `pickRicherCaseRecord()`, `buildCasesListRecord()` | Selected or final merged record remains `receipt_ready`, `receiptEligible: true`, `caseReceiptEligible: true` | Prevents stale diagnostic records from downgrading trusted ready state. |
| GTC-015B Duplicate Records: Newer Created Case Does Not Get Hidden by Older Updated Copy | Two case-like records with different `CASE-<timestamp>-...` ids or created timestamps and later repair `updatedAt` on older record | `sortCasesForList()` / `getCaseSortTime()` | Ordering follows intended case creation timestamp preference, not stale repair/update churn | Protects `/cases` ordering after lifecycle repair writes. |
| GTC-015C Event Merge Preserves Highest Event Count | Base case has lower event count; event logs or receipt record has additional dedupable and unique events | `mergeCaseEvents()`, `deriveMergedCaseEventCount()` | Merged `eventCount` is max of explicit counts and deduped merged event count | Prevents activity context from being lost during aggregation. |
| GTC-015D Payment State Does Not Downgrade Receipt-ready State | Paid/checkout record and receipt-ready record exist for the same case | `pickStrongestPaymentStatusForCase()`, `pickStrongestCaseLifecycleStatus()`, `buildCasesListRecord()` | Payment/checkout state is preserved according to rank, while receipt-ready lifecycle and eligibility remain intact | Prevents payment overlays from erasing readiness or readiness from erasing paid/checkout state. |
| GTC-015E Title / Case Name Preservation | Trusted backend/local case has canonical title/name; stale duplicate has old or placeholder title | `buildCasesListRecord()`, `pickRicherCaseRecord()` plus existing `resolvePreservedCaseTitle()` lifecycle contract | Visible `title`, `caseName`, and `name` are not downgraded by stale duplicate | Protects user-owned title metadata from duplicate aggregation regressions. |

Pseudo-fixtures should remain in-memory objects inside a future smoke script. Do not create runtime fixture files.

---

## 7. Why Not Add to check-golden-readiness.mjs Yet

`scripts/check-golden-readiness.mjs` imports frontend/helper logic and validates deterministic readiness, lifecycle helper, access-mode, and verification helper behavior.

GTC-015 needs a backend aggregation harness. Pulling route internals from `backend/server.js` into the current frontend-oriented smoke would be brittle because the route currently mixes file I/O, Supabase reads, deleted-case filtering, subscription overlay, candidate maps, event merge, record scoring, and response sorting.

Better future options:

1. Extract pure backend aggregation helpers and import them into a new backend smoke script.
2. Create a separate `scripts/check-golden-backend-aggregation.mjs` that calls those helpers with in-memory pseudo-fixtures.

The GTC-015 smoke should assert backend aggregation behavior, not scoring behavior.

---

## 8. Recommended Future Step

Recommended next step:

11-B3: Extract backend aggregation helpers with no behavior change.

Alternative only if helpers are already cleanly exportable after inspection:

11-B3: Add a backend aggregation smoke.

The safer path is extraction first, smoke second. Extraction should be reviewed as a no-behavior-change refactor before the runnable GTC-015 smoke is added.

---

## 9. 11-B4 Smoke Implementation

11-B4 adds `scripts/check-golden-backend-aggregation.mjs`.

Run from the repository root:

```powershell
node scripts/check-golden-backend-aggregation.mjs
```

Expected success:

```text
PASS: 5/5 golden backend aggregation smoke checks passed.
```

The smoke uses in-memory pseudo fixtures only. It does not call `/cases`, read or write backend/data files, call Supabase, call network APIs, render frontend pages, or change production behavior.

Covered GTC-015 sub-cases:

- GTC-015A Duplicate records keep receipt-ready lifecycle.
- GTC-015B Event merge preserves explicit max event count.
- GTC-015C Payment overlay does not erase receipt-ready eligibility.
- GTC-015D Case ordering prefers `CASE-<timestamp>-...` over `updatedAt` churn.
- GTC-015E Meaningful title is not downgraded by stale placeholder duplicate.

---

## 10. 11-Series Progress

| Step | Status | Date | Scope | Code changes |
| --- | --- | --- | --- | --- |
| 11-A1: Readiness / Scoring Rule Table v0.1 | PASS / committed | 2026-05-12 | Documentation only | none |
| 11-A2: Rule-layer classification | PASS / committed | 2026-05-12 | Documentation only | none |
| 11-A3: Golden Test Cases v0.1 | PASS / committed | 2026-05-12 | Documentation only | none |
| 11-A4: Golden Test Execution Plan v0.1 | PASS / committed | 2026-05-12 | Documentation only | none |
| 11-A5: Golden Cases Runnable Smoke Check v0.1 | PASS / committed | 2026-05-12 | Smoke/check script only | no production code changes |
| 11-A6: Register Golden Readiness Smoke in Regression Checklist | PASS / committed | 2026-05-12 | Documentation only | none |
| 11-B1: Add GTC-013 Access-Mode Helper Smoke | PASS / committed | 2026-05-12 | Smoke/check script + documentation only | no production code changes |
| 11-B2: GTC-015 Backend Aggregation Test Design / Extraction Plan | Drafted | 2026-05-12 | Documentation only | none |
| 11-B3: Extract backend aggregation helpers | Drafted | 2026-05-12 | Backend no-behavior-change refactor | no production behavior changes |
| 11-B4: Add GTC-015 Backend Aggregation Smoke | Drafted | 2026-05-12 | Smoke/check script + documentation only | no production behavior changes |
