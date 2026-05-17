# Nimclea Supabase Core Authority Store Export Guard Pass Record v0.1

## Purpose

Supabase core authority store was added as the clean database access layer for core records.

The store covers `case_records`, `case_events`, and `receipt_records` access helpers.

## Protected Exports

- `getCaseEventsByCaseId`
- `getCaseRecordByCaseId`
- `getReceiptRecordByReceiptId`
- `insertCaseEvent`
- `isSupabaseCoreAuthorityEnabled`
- `upsertCaseRecord`
- `upsertReceiptRecord`

## Validation Performed

- `git diff --check -- backend/utils/supabaseCoreAuthorityStore.js` passed.
- Dynamic import/export smoke check passed.
- Missing Supabase env is acceptable and logs `"[supabase] skipped, env missing"`.
- Release gate passed on approved rerun with `PASS 52 / WARN 5 / FAIL 0`, `Final result: WARN`.

## Commit References

- `7b2e171 Add Supabase core authority store`
- `0aea6f1 Guard Supabase core authority store exports`

## Decision

This store is now protected as a release-gate dependency.

Future route integration may use this store, but route wiring is not part of this record.
