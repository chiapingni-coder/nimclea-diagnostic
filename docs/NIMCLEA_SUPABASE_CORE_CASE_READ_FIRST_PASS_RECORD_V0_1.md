# Nimclea Supabase Core Case Read First Pass Record v0.1

## Purpose

Record that `GET /case/:caseId` now reads from Supabase core authority store first, while preserving JSON fallback and existing event log merge behavior.

## Changed Route

- `backend/routes/caseRoutes.js` owns `GET /case/:caseId`.
- `backend/server.js` mounts it through `app.use("/case", caseRoutes)`.

## New Read Order

1. `getCaseRecordByCaseId(caseId)` from `backend/utils/supabaseCoreAuthorityStore.js`
2. existing local `cases.json` lookup
3. existing legacy Supabase fallback via `findSupabaseCaseRecord(caseId)`
4. existing `eventLogs.json` merge behavior

## Scope Boundary

- Read-only integration.
- No write-path changes.
- No `receipt_records` integration.
- No `case_events` integration.
- Response shape preserved.

## Validation

- `git diff --check -- backend/routes/caseRoutes.js` passed.
- caseRoutes dynamic import passed.
- Release gate passed on approved rerun with `PASS 52 / WARN 5 / FAIL 0`, `Final result: WARN`.
- First sandbox run had `spawnSync node EPERM`, treated as a sandbox permission issue after approved rerun passed.

## Commit Reference

- `c60ffad Read case records from Supabase core authority first`

## Decision

Supabase core authority is now the first read source for `/case/:caseId`.

JSON remains fallback during transition.

Further core table integration should be handled separately.
