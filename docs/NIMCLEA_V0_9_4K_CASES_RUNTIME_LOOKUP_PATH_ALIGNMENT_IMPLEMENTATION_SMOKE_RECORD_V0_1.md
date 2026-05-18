# V0 9 4K CASES RUNTIME LOOKUP PATH ALIGNMENT IMPLEMENTATION SMOKE RECORD

## Record ID

NIMCLEA_V0_9_4K_CASES_RUNTIME_LOOKUP_PATH_ALIGNMENT_IMPLEMENTATION_SMOKE_RECORD_V0_1

## Date

2026-05-18

## Purpose

Document the v0.9-4K runtime lookup path alignment for `/cases?email=`.
The change makes the runtime prefer a narrow clean-authority helper for canonical
case lookup while preserving the legacy Supabase fallback, local JSON fallback,
and receipt/event overlay behavior.

## Scope

- Area: Backend `/cases?email=` read path only.
- Files inspected:
  - `backend/utils/supabaseCoreAuthorityStore.js`
  - `backend/server.js`
  - `docs/NIMCLEA_V0_9_4K_CASES_RUNTIME_LOOKUP_PATH_ALIGNMENT_IMPLEMENTATION_SMOKE_RECORD_V0_1.md`
- Files changed:
  - `backend/utils/supabaseCoreAuthorityStore.js`
  - `backend/server.js`
  - `docs/NIMCLEA_V0_9_4K_CASES_RUNTIME_LOOKUP_PATH_ALIGNMENT_IMPLEMENTATION_SMOKE_RECORD_V0_1.md`
- Runtime behavior affected: Yes, narrow `/cases?email=` read path only.
- Supabase Storage included: No.
- Schema/RLS/grants/migrations included: No.
- Payment/receipt/verification/trial behavior included: No.
- Frontend behavior included: No.

## Implementation Summary

- Added `getCaseRecordsByEmail(email)` in `supabaseCoreAuthorityStore.js`.
- The helper uses the existing Supabase enablement guard and text normalization,
  lowercases trimmed email input, returns `email_required` for blank input, and
  reads canonical `cases` rows ordered by `created_at` descending.
- Updated `loadSupabaseCaseSourcesForEmail(email, deletedCaseIds)` to call the
  helper first for canonical case rows.
- Preserved the existing direct Supabase `cases` reader as fallback when the
  helper does not return `ok: true`.
- Left the existing `receipt_records` and `event_logs` overlay logic unchanged.
- Left the existing JSON fallback behavior unchanged.

## Acceptance Criteria

- `/cases?email=` prefers `getCaseRecordsByEmail(email)` for canonical Supabase
  `cases` lookup.
- If helper lookup fails or is unavailable, the existing broad Supabase `cases`
  fallback remains available.
- Response shape is unchanged.
- Legacy JSON fallback remains available.
- No schema, RLS, grant, migration, payment, receipt, verification, trial, or
  frontend behavior changes are included.

## Validation

Commands / checks run:

```powershell
npm run build
node --check backend\server.js
node --check backend\utils\supabaseCoreAuthorityStore.js
```

Result:

- Passed. Build script is the repository placeholder and completed successfully.
- Passed. Node syntax checks completed successfully for touched backend files.

## Stop Lines

- Stop if `/cases?email=` response shape changes.
- Stop if legacy JSON fallback is removed or bypassed.
- Stop if receipt_records or event_logs overlays change behavior.
- Stop if this work requires Supabase Storage.
- Stop if this work requires schema, RLS, grant, or migration changes.
- Stop if payment, receipt, verification, trial, or frontend behavior changes
  are needed.

## Next Action

- Runtime smoke `/cases?email=` against an environment with Supabase enabled and
  the canonical `cases.email` column available.
