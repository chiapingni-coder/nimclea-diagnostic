# STEP 5.16 Database Read/Write Matrix Audit

Date: 2026-05-08

Scope: current Nimclea case system read/write behavior across frontend pages/utilities, backend JSON stores, and Supabase/Postgres mirror writes. This is an audit only; no application logic was changed.

## Executive Summary

The case system currently uses multiple persistence layers at the same time:

- Frontend `localStorage` stores active case registry data, current case identity, email identity, diagnostic result snapshots, receipt/verification page payloads, and event payloads.
- Backend JSON files are the primary server-side local store for cases, email logs, event logs, receipt records, hash ledger entries, verification records, users, and trials.
- Supabase/Postgres mirror writes are present for `cases`, `diagnostic_records`, `case_result_records`, `case_plan_records`, `event_logs`, `receipt_records`, `verification_records`, `public.users`, and `public.email_logs`.
- Backend read routes merge JSON data and Supabase mirrors in several places, especially `GET /cases?email=`, `GET /case/:caseId`, and `GET /receipt-record`.

Primary risks are consistency and precedence risks. The same case can be mutated by `localStorage`, `cases.json`, `receiptRecords.json`, `hashLedger.json`, `verificationRecords.json`, Stripe confirmation, and Supabase mirror tables with different merge rules and different keys. Several routes intentionally ignore Supabase mirror failures, which protects UX but can create silent divergence.

## Data Flow Matrix

| Flow | Frontend caller | Backend route | Write/read | Storage target | Key(s) |
|---|---|---|---|---|---|
| Create case from Cases page | `frontend/pages/CasesPage.jsx` | `POST /case/save`, `POST /email/log` | Write | `localStorage`, `cases.json`, `emailLogs.json`, Supabase `cases`, possible `public.users`, `public.email_logs` | `caseId`, `email`, `userId`, `trialId` |
| Load cases by email | `frontend/pages/CasesPage.jsx` | `GET /cases?email=` | Read/merge | `emailLogs.json`, `cases.json`, `receiptRecords.json`, `eventLogs.json`, Supabase `cases`, `receipt_records`, `event_logs` | `email`, `caseId` |
| Hydrate single case details | `frontend/pages/CasesPage.jsx`, `frontend/pages/VerificationPage.jsx` | `GET /case/:caseId` | Read/merge | `cases.json`, `eventLogs.json` | `caseId` |
| Diagnostic completion | `frontend/pages/Questionnaire.jsx` | `POST /case/save`, `POST /event/log` | Write | `localStorage`, `cases.json`, `eventLogs.json`, Supabase case/result/diagnostic/event mirrors | `caseId`, `userId`, `trialId`, `email` |
| Result contact save | `frontend/pages/ResultPage.jsx` | `POST /case/save`, `POST /email/log`, `POST /event/log` | Write | `localStorage`, `cases.json`, `emailLogs.json`, `eventLogs.json`, Supabase mirrors/Postgres email tables | `caseId`, `email`, `userId`, `trialId` |
| Pilot setup/register/start | `frontend/PilotSetupPage.jsx`, `frontend/pages/PilotPage.jsx` | `POST /trial/register`, `POST /trial/start`, `POST /case/save`, `POST /email/log`, `POST /event/log` | Write | `localStorage`, `users.json`, `trials.json`, `cases.json`, `emailLogs.json`, `eventLogs.json`, `public.users`, `public.email_logs`, Supabase mirrors | `email`, `userId`, `trialId`, `caseId` |
| Local event capture | `frontend/components/EventCaptureBox.jsx`, `frontend/utils/caseRegistry.js` | none | Write | `localStorage` only | `caseId`, event id |
| Trial event logging | `frontend/lib/trialApi.js` | `POST /event/log` | Write | `eventLogs.json`, Supabase `event_logs` | `caseId`, `userId`, `trialId` |
| Generic event logger | `frontend/utils/eventLogger.js` | `POST /api/events/log` | Write-like call, no persistence | none in current backend route | `caseId`, `userId`, `sessionId` |
| Receipt hash lock | `frontend/pages/ReceiptPage.jsx` | `GET/POST /hash-ledger/receipt` | Read/write | `hashLedger.json`, `receiptRecords.json`, Supabase `receipt_records` | `caseId`, `receiptId`, receipt hash |
| Receipt ready patch | `frontend/pages/ReceiptPage.jsx` | `PATCH /case/:caseId/receipt-status` | Write | `cases.json`, Supabase `cases` | `caseId`, `email` |
| Receipt record hydrate | `frontend/pages/ReceiptPage.jsx` | `GET /receipt-record?caseId=` | Read/merge | `receiptRecords.json`, `cases.json` | `caseId` |
| Receipt checkout created | `frontend/pages/ReceiptPage.jsx`, `frontend/pages/CasesPage.jsx` | `POST /api/create-checkout-session` or `POST /create-checkout-session` | Write for formal receipt; external Stripe | `receiptRecords.json`, Supabase `receipt_records`; pilot extension does not write JSON | `caseId`, `receiptId`, email for pilot extension |
| Payment confirmation | `frontend/pages/PaymentSuccessPage.jsx` | `POST /api/confirm-checkout-session` | Write | `localStorage`, `cases.json` | `caseId`, Stripe `sessionId` |
| Verification hash lock | `frontend/pages/VerificationPage.jsx` | `POST /hash-ledger/verification` | Write | `verificationRecords.json`, Supabase `verification_records` | `caseId`, receipt hash, verification hash |
| Verification receipt lookup | `frontend/pages/VerificationPage.jsx` | `GET /hash-ledger/receipt?caseId=` | Read | `hashLedger.json` | `caseId` |
| Verification record lookup | current backend route available | `GET /hash-ledger/verification?caseId=` | Read | `verificationRecords.json` | `caseId`, `verificationId` equivalent is verification hash |
| Analytics event read | `frontend/pages/VerificationPage.jsx`, `frontend/pages/AnalyticsPage.jsx` | `GET /analytics/events` | Read | `eventLogs.json` | event id, `caseId` in payload |

## Write Matrix

| Writer | Operation | Storage target | Key(s) | Notes |
|---|---|---|---|---|
| `frontend/utils/caseRegistry.js` | `upsertCase`, `saveCaseRegistry`, `setCurrentCaseId` | `localStorage`: `nimclea_case_registry`, `nimclea_current_case_id` | `caseId` | Registry merge is client-side and can diverge from backend. |
| `frontend/utils/caseRegistry.js` | `addCaseEvent` | `localStorage`: `nimclea_case_${caseId}`, registry | `caseId`, event id | Local event append does not automatically write `eventLogs.json`. |
| `frontend/utils/caseRegistry.js` | `saveStandaloneRoutedEvent` | `localStorage`: `nimclea_standalone_events` | event id only | Standalone events may lack `caseId`. |
| `frontend/lib/trialApi.js` | `registerTrialUser` | via `POST /trial/register` | `email`, returned `userId`, `trialId` | Also enriches payload with current `caseId` when available. |
| `frontend/lib/trialApi.js` | `saveCaseSnapshot` | via `POST /case/save` | `caseId`, `userId`, `trialId` | Main frontend API wrapper for case JSON writes. |
| `frontend/lib/trialApi.js` | `logTrialEvent` | via `POST /event/log`; `localStorage` once marker | `caseId`, `userId`, `trialId`, `sessionId` | Once marker key is `nimclea_event_once_${sessionId}_${eventType}`. |
| `frontend/lib/trialApi.js` | `sendTrialEmail` | via `POST /email/send` | `email`, `userId`, `trialId` | Writes mock email log and Postgres email tables. |
| `frontend/utils/eventLogger.js` | `getStableUserId`, `logEvent` | `localStorage`: `nimclea_user_id_v1`; calls `/api/events/log` | `userId`, `caseId`, `sessionId` | `/api/events/log` only echoes today; it does not persist. |
| `frontend/pages/CasesPage.jsx` | Create new case | `localStorage`, `POST /case/save`, `POST /email/log` | `caseId`, `email`, `userId`, `trialId` | Creates local registry first, then server snapshot/email log. |
| `frontend/pages/CasesPage.jsx` | Archive/restore/saved email/current case | `localStorage`: `nimclea_archived_case_ids`, `nimclea_email`, `nimclea_current_case_id`, `nimclea_pilot_extension_paid` | `caseId`, `email` | Archive is local-only. |
| `frontend/pages/Questionnaire.jsx` | Diagnostic completed | `localStorage`: result/preview/session keys; `POST /case/save`; `POST /event/log` | `caseId`, `userId`, `trialId`, `email` | Stores both global and session-scoped diagnostic payloads. |
| `frontend/pages/ResultPage.jsx` | Save contact/result case | `localStorage`, `upsertCase`, `updateCaseLead`, `POST /case/save`, `POST /email/log`, `POST /event/log` | `caseId`, `email`, `userId`, `trialId` | Writes result schema to both client and server case record. |
| `frontend/PilotSetupPage.jsx` | Lead/session/workspace setup | `localStorage`, trial routes, event log, email log, case save, case registry updates | `email`, `userId`, `trialId`, `caseId` | Also writes scope lock and acceptance checklist locally. |
| `frontend/pages/PilotPage.jsx` | Pilot case/session persistence | `localStorage`, `upsertCase`, `POST /case/save`, `POST /email/log`, `POST /event/log` | `caseId`, `email`, `userId`, `trialId` | Has both direct fetch to `/case/save` and `saveCaseSnapshot`. |
| `frontend/pages/PilotResultPage.jsx` | Receipt/verification handoff | `localStorage`, `upsertCase`, `logTrialEvent` | `caseId`, `receiptId`, receipt hash | Persists `receiptPageData`, `receiptRouteDecision`, `receiptSource`, `sharedReceiptVerificationContract`, `verificationPageData`. |
| `frontend/pages/ReceiptPage.jsx` | Receipt hash persistence | `localStorage`, `upsertCase`, `POST /hash-ledger/receipt` | `caseId`, `receiptId`, receipt hash | Server write also creates/updates `receiptRecords.json`. |
| `frontend/pages/ReceiptPage.jsx` | Receipt ready patch | `PATCH /case/:caseId/receipt-status` | `cases.json`, Supabase `cases` | `caseId`, `email` | Fire-and-forget; failure only logs warning. |
| `frontend/pages/ReceiptPage.jsx` | Receipt local case edits | `upsertCase`, `updateCaseLead`, `updateCaseStatus`, `logTrialEvent` | `localStorage`, `eventLogs.json` through API | `caseId`, `userId`, `trialId` | Quick captures update local case and may log server event. |
| `frontend/pages/ReceiptPage.jsx` | Checkout start | `POST /api/create-checkout-session` | `receiptRecords.json`, Stripe | `caseId`, `receiptId`, hash | Formal receipt route writes checkout-created record. |
| `frontend/pages/PaymentSuccessPage.jsx` | Confirm checkout | `POST /api/confirm-checkout-session`, `upsertCase` | `cases.json`, `localStorage` | `caseId`, Stripe `sessionId` | Server does not update `receiptRecords.json` on confirm. |
| `frontend/pages/VerificationPage.jsx` | Verification hash persistence | `localStorage`, `upsertCase`, `POST /hash-ledger/verification` | `caseId`, receipt hash, verification hash | Server writes `verificationRecords.json`; local writes `verificationPageData`. |
| `frontend/pages/VerificationPage.jsx` | Verification local case edits/events | `upsertCase`, `logTrialEvent` | `localStorage`, `eventLogs.json` through API | `caseId`, `userId`, `trialId` | Some verification state is local-only unless hash ledger route is called. |
| `frontend/components/EventCaptureBox.jsx` | Manual event capture | `localStorage` through `addCaseEvent` | `caseId`, event id | No backend persistence. |
| `backend/routes/caseRoutes.js` | `POST /case/save` | `cases.json`, Supabase `cases`, conditional `case_result_records`, `diagnostic_records`, `case_plan_records` | `caseId`, `userId`, `trialId`, `email` | Creates or updates by valid `caseId`; increments `version`. |
| `backend/routes/caseRoutes.js` | `PATCH /case/:caseId/receipt-status` | `cases.json`, Supabase `cases` | `caseId` | Upserts if no existing case is found. |
| `backend/server.js` | `POST /email/log` | `emailLogs.json`, `public.users`, `public.email_logs` | `email`, `caseId` | Deduplicates by email+caseId in JSON only. |
| `backend/routes/emailRoutes.js` | `POST /email/send` | `emailLogs.json`, `public.users`, `public.email_logs` | `email/to`, `userId`, `trialId`, optional `caseId` | Mock send plus durable log. |
| `backend/routes/eventRoutes.js` | `POST /event/log` | `eventLogs.json`, Supabase `event_logs` | `caseId`, `userId`, `trialId`, `eventId` | `eventId` generated server-side. |
| `backend/server.js` | `POST /api/events/log` | none | `caseId`, `userId`, `sessionId` | Route currently acknowledges only. |
| `backend/routes/hashLedgerRoutes.js` | `POST /hash-ledger/receipt` | `hashLedger.json`, `receiptRecords.json`, Supabase `receipt_records` | `caseId`, `receiptId`, receipt hash | Refuses conflicting receipt hash for same case. |
| `backend/routes/hashLedgerRoutes.js` | `POST /hash-ledger/verification` | `verificationRecords.json`, Supabase `verification_records` | `caseId`, receipt hash, verification hash | Upserts by `caseId`. |
| `backend/routes/stripe.js` | `POST /create-checkout-session` | `receiptRecords.json`, Supabase `receipt_records` for formal receipt checkout | `caseId`, `receiptId`, hash | Pilot extension checkout does not write local JSON. |
| `backend/routes/stripe.js` | `POST /confirm-checkout-session` | `cases.json` | `caseId`, Stripe `sessionId` | Marks case payment fields paid after Stripe retrieval. |
| `backend/routes/trialRegisterRoutes.js` | `POST /trial/register` | `users.json`, `trials.json`, `public.users`, `public.email_logs` | `email`, `userId`, `trialId` | Existing JSON user found by email; always appends a trial. |
| `backend/routes/trialStartRoutes.js` | `POST /trial/start` | `trials.json` | `userId`, `trialId` | Updates matching trial session fields. |

## Read Matrix

| Reader | Operation | Storage target | Key(s) | Notes |
|---|---|---|---|---|
| `frontend/pages/CasesPage.jsx` | Load cases | `GET /cases?email=` | `email` | Main case list source. |
| `frontend/pages/CasesPage.jsx` | Hydrate detail cache | `GET /case/:caseId` | `caseId` | Adds backend event hydration per case. |
| `frontend/pages/CasesPage.jsx` | Read local archive/current/email | `localStorage` | `caseId`, `email` | Local archive filters server results. |
| `frontend/pages/ReceiptPage.jsx` | Read route/local receipt payload | `localStorage`: `receiptPageData`, `receiptRouteDecision`, `receiptSource`, `sharedReceiptVerificationContract` | `caseId`, `receiptId` | Falls back to navigation state and registry. |
| `frontend/pages/ReceiptPage.jsx` | Read receipt hash ledger | `GET /hash-ledger/receipt?caseId=` | `caseId` | Reads `hashLedger.json`. |
| `frontend/pages/ReceiptPage.jsx` | Read receipt record | `GET /receipt-record?caseId=` | `caseId` | Merges latest receipt record and latest case. |
| `frontend/pages/VerificationPage.jsx` | Read verification payload | `localStorage`: `verificationPageData`, `receiptCaseData`, `sharedReceiptVerificationContract` | `caseId`, `receiptId`, verification hash | Route state has precedence in parts of page setup. |
| `frontend/pages/VerificationPage.jsx` | Restore case | `GET /case/:caseId` | `caseId` | Reads merged case/events. |
| `frontend/pages/VerificationPage.jsx` | Read receipt ledger | `GET /hash-ledger/receipt?caseId=` | `caseId` | Used to validate receipt hash. |
| `frontend/pages/VerificationPage.jsx` | Read analytics events | `GET /analytics/events` | event id, `caseId` in payload | Reads latest event log slice. |
| `frontend/utils/caseRegistry.js` | Read local registry/case | `localStorage`: registry and `nimclea_case_${caseId}` | `caseId` | Per-case local record overrides registry fields. |
| `frontend/lib/trialApi.js` | Resolve current case id | `localStorage`: `nimclea_current_case_id`, `currentCaseId`, `caseId` | `caseId` | Used to enrich API payloads. |
| `frontend/utils/eventLogger.js` | Resolve stable user/current case | `localStorage`: `nimclea_user_id_v1`, current case keys | `userId`, `caseId` | API target is `/api/events/log`. |
| `backend/server.js` | `GET /cases?email=` | `emailLogs.json`, `cases.json`, `receiptRecords.json`, `eventLogs.json`, Supabase `cases`, `receipt_records`, `event_logs` | `email`, `caseId` | Largest merge/precedence route. |
| `backend/routes/caseRoutes.js` | `GET /case/:caseId` | `cases.json`, `eventLogs.json` | `caseId` | Merges target case events with matching event logs. |
| `backend/routes/caseRoutes.js` | `GET /case/by-trial/:trialId` | `cases.json` | `trialId` | Simple filter by trial. |
| `backend/routes/eventRoutes.js` | `GET /event/by-trial/:trialId` | `eventLogs.json` | `trialId` | Simple filter by trial. |
| `backend/routes/eventRoutes.js` | `GET /event/logs` | `eventLogs.json` | none | Returns array from `events` or top-level array. |
| `backend/routes/analyticsRoutes.js` | `GET /analytics/events` | `eventLogs.json` | event id, timestamp | Sorts and returns newest 200. |
| `backend/routes/hashLedgerRoutes.js` | `GET /hash-ledger/receipt`, `/receipt/:caseId` | `hashLedger.json` | `caseId` | Two receipt read shapes exist. |
| `backend/routes/hashLedgerRoutes.js` | `GET /hash-ledger/verification?caseId=` | `verificationRecords.json` | `caseId` | Normalizes verification hash. |
| `backend/server.js` | `GET /receipt-record?caseId=` | `receiptRecords.json`, `cases.json` | `caseId` | Merges receipt record with latest case. |
| `backend/routes/stripe.js` | Build receipt snapshot | `cases.json`, `eventLogs.json` | `caseId` | Internal read before writing receipt records. |
| `backend/routes/hashLedgerRoutes.js` | Build receipt snapshot | `cases.json`, `eventLogs.json` | `caseId` | Internal read before writing receipt records. |
| `backend/routes/trialRegisterRoutes.js` | Existing user lookup | `users.json` | `email` | Reads before appending user/trial. |
| `backend/routes/trialStartRoutes.js` | Trial lookup | `trials.json` | `userId`, `trialId` | Reads before update. |

## Merge/Precedence Rules

- `POST /case/save` merges existing case record first, then request body. Existing `id`, `caseId`, and `createdAt` win over incoming values; `updatedAt`, `savedAt`, and `version` are refreshed.
- `PATCH /case/:caseId/receipt-status` reads the existing case, merges existing fields with request body, then forces receipt fields such as `receiptEligible`, `caseReceiptEligible`, `receiptStatus`, `receiptReadyAt`, `stage`, and `status`.
- `GET /case/:caseId` starts from the case in `cases.json`, then merges events from `target.events`, `target.eventLogs`, and matching `eventLogs.json`. Event de-dupe key precedence is `eventId`, `id`, `meta.quickCaptureId`, then a composite of case/type/time/note.
- `GET /cases?email=` reads JSON first, loads Supabase `cases`, then Supabase `receipt_records` and `event_logs` only for case ids found in Supabase case rows. Candidate records are built from email logs, persisted cases, and receipt records. For each case, the final object spreads `item`, then `baseCase`, then `receiptCase`; receipt records can override base case fields. Stage is chosen by rank, where `verified` outranks `verification_ready`, `paid`, `receipt_issued`, `receipt_ready`, `event_captured`, `result_ready`, `diagnostic_completed`, and `draft`.
- `GET /receipt-record?caseId=` searches `receiptRecords.json` from newest to oldest and merges the matching receipt with the latest case from `cases.json`. The returned payload spreads receipt first and latest case second, so latest case fields can override receipt fields. Receipt readiness is recomputed from merged receipt and latest case.
- `localStorage` case reads in `caseRegistry.getCaseById` merge registry case first, then `nimclea_case_${caseId}`. Per-case localStorage fields override the registry, and per-case events override registry events when non-empty.
- `receiptRecords.json` updates in hash ledger and Stripe routes match by `receiptId`, `caseId`, or hash. If an existing record has `snapshotStatus: "frozen"`, the code appends a new active version instead of overwriting.
- `hashLedger.json` receipt writes are stricter than receipt records. An existing ledger record for the same `caseId` with a different receipt hash returns `409` and is not overwritten.
- Supabase mirror writes are best-effort. Most mirror failures are logged and ignored, leaving JSON/localStorage as the effective source of truth for the current request.

## Risk List

1. Multiple sources of truth for the same case: `localStorage`, `cases.json`, `receiptRecords.json`, `hashLedger.json`, `verificationRecords.json`, and Supabase can all describe case status, receipt state, payment state, events, hashes, and lead email.
2. `GET /cases?email=` only queries Supabase receipt/event rows for case ids returned by Supabase `cases`. If a receipt/event mirror exists without a mirrored `cases` row for that email, it will not be included from Supabase.
3. Supabase mirror failures are mostly ignored. JSON writes can succeed while Supabase tables silently diverge.
4. `/api/events/log` sounds like a persistence route but only echoes the event. `frontend/utils/eventLogger.js` callers may assume durable logging where none exists.
5. Event capture can be local-only. `EventCaptureBox` and `caseRegistry.addCaseEvent` write `localStorage` without writing `eventLogs.json`, so backend reads may miss those events until another flow embeds them into a case snapshot.
6. `receiptRecords.json` can match updates by `receiptId`, `caseId`, or hash. This broad matching can update the wrong record if a reused hash or missing id collides.
7. `PATCH /case/:caseId/receipt-status` upserts a case even when no case exists, using patch data. That can create a sparse case record with receipt-ready state.
8. `POST /case/save` accepts broad request bodies and mirrors to several Supabase tables based on shape. A payload containing result, diagnostic, or workflow-like fields can trigger multiple mirror writes.
9. Payment confirmation updates `cases.json` but does not update `receiptRecords.json` payment status to paid. Case payment and receipt payment can diverge.
10. Client-side archive/restore is local-only. A case archived in one browser can still appear on another browser or after localStorage reset.
11. Current case id resolution checks multiple localStorage keys: `nimclea_current_case_id`, `currentCaseId`, and `caseId`. Stale legacy keys can enrich new API payloads with an unintended `caseId`.
12. `GET /receipt-record?caseId=` lets latest case fields override receipt fields after spreading. That can mask receipt-record values when the case has stale or partial receipt fields.
13. `GET /case/:caseId` does not validate `caseId` format while write routes often do. Reads may accept ids that writes reject.
14. JSON file writes are whole-file writes without visible locking. Concurrent requests can lose writes in `cases.json`, `emailLogs.json`, `eventLogs.json`, `receiptRecords.json`, and `verificationRecords.json`.
15. `emailLogs.json` has at least two shapes: `/email/log` writes `{ email, caseId, source }`, while `/email/send` writes `{ emailLogId, to, emailType, variables }`. `/cases?email=` looks for `email` but not `to`, so send logs do not naturally participate in case lookup.
16. `users.json` and Postgres `public.users` can diverge. Trial registration writes both, but failures in Postgres are logged and ignored after JSON writes.
17. Verification data introduces `verificationRecords.json`, which is outside the storage target list but is actively used by hash-ledger verification routes.

## Suggested Future Fixes

- Define a single canonical case read model and make frontend pages consume that model instead of independently merging route state, localStorage, JSON, and receipt snapshots.
- Treat `cases.json` or Supabase as the explicit source of truth for case status, and demote localStorage to a cache with clear invalidation.
- Make event logging route names consistent: either persist `/api/events/log` or remove/rename it so callers do not confuse it with `/event/log`.
- Add a durable server route for local quick captures so `addCaseEvent` can sync to `eventLogs.json`.
- Move receipt payment confirmation into the receipt record as well as the case record.
- Replace broad receipt-record matching by `receiptId || caseId || hash` with explicit precedence and conflict handling.
- Make Supabase mirror failures observable through structured health/audit logs or retry queues.
- Add file-write serialization or migrate JSON stores to a transactional database table for concurrent writes.
- Normalize email log shape so all email-related writes expose the same `email`, `caseId`, `source`, and timestamp fields.
- Document and enforce one set of allowed keys: `caseId`, `email`, `userId`, `trialId`, `receiptId`, and `verificationId`/verification hash.
