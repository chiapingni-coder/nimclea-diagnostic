# V0 9 4S DEPLOYED AUTHORITY PROBE IMPLEMENTATION RECORD

## Record ID

NIMCLEA_V0_9_4S_DEPLOYED_AUTHORITY_PROBE_IMPLEMENTATION_RECORD_V0_1

## Date

2026-05-18

## Purpose

Document the v0.9-4S implementation of a protected deployed authority
availability probe. The probe exists only to verify whether deployed runtime can
read canonical authority data through the existing clean authority helpers.

## Scope

- Area: Backend internal rehearsal probe.
- Inspection result:
  - `backend/index.js` already contains rehearsal mechanics gated by
    `NIMCLEA_ENABLE_REHEARSAL_ENDPOINTS`.
  - The deployed root response matches `backend/server.js`.
  - Existing rehearsal endpoint is write-oriented and does not provide a
    read-only authority availability probe.
- Files inspected:
  - `backend/server.js`
  - `docs/NIMCLEA_V0_9_4S_DEPLOYED_AUTHORITY_PROBE_IMPLEMENTATION_RECORD_V0_1.md`
- Files changed:
  - `backend/server.js`
  - `docs/NIMCLEA_V0_9_4S_DEPLOYED_AUTHORITY_PROBE_IMPLEMENTATION_RECORD_V0_1.md`
- Runtime behavior affected: Yes, protected internal rehearsal probe only.
- `/cases` behavior changed: No.
- `/case` behavior changed: No.

## Implementation Summary

- Added `GET /internal/rehearsal/authority-probe` in `backend/server.js`.
- Reused existing clean authority helpers:
  - `isSupabaseCoreAuthorityEnabled`
  - `getCaseRecordsByEmail`
  - `getCaseRecordByCaseId`
- Default probe email:
  `smoke+cases-existing-001@nimclea.test`.
- Default probe case ID:
  `00000000-0000-4000-8000-000000000024`.
- Allowed probe case IDs are explicitly restricted to:
  - `00000000-0000-4000-8000-000000000024`
  - `00000000-0000-4000-8000-000000009401`
- If Supabase clean authority is disabled, the route returns a sanitized enabled
  false response without attempting data reads.
- Email lookup returns only ok/disabled/reason/error/count/caseIds.
- Case lookup returns only ok/disabled/reason/error/found and the found case ID.
- Full customer and case records are never returned.

## Protection Rules

- Route returns 404 unless `NIMCLEA_ENABLE_REHEARSAL_ENDPOINTS` is exactly
  `true` after trim/lowercase normalization.
- Query email is optional, but accepted emails must end with `@nimclea.test`.
- Arbitrary customer emails are rejected with `fixture_email_required`.
- Query caseId is optional and defaults to the selected fixture case ID.
- Query caseId must be in the explicit fixture allowlist.
- Arbitrary case ID existence probing is rejected with
  `fixture_case_id_required`.
- No service role keys or raw environment values are returned.

## Sanitized Response Rules

- `emailLookup` includes only:
  - `email`
  - `ok`
  - `disabled`
  - `reason`
  - sanitized `error`
  - `count`
  - `caseIds`
- `caseLookup` includes only:
  - `requestedCaseId`
  - `ok`
  - `disabled`
  - `reason`
  - sanitized `error`
  - `found`
  - `caseId` only when found
- Error strings are truncated and known Supabase env values are redacted if
  present.

## Validation

Commands / checks run:

```powershell
node --check backend/server.js
npm run build
```

Result:

- Passed. `node --check backend/server.js` completed successfully.
- Passed. `npm run build` completed successfully; build script is the repository
  placeholder.

## Explicit Exclusions

- No schema, RLS, grants, or migration changes.
- No Supabase Storage changes.
- No frontend changes.
- No payment, receipt, verification, or trial behavior changes.
- No `/cases` or `/case` behavior changes.
- No full customer or case records exposed.
- No service role keys or environment values exposed.

## Stop Line

- Stop if deployed probe requires schema, RLS, grants, migrations, Supabase
  Storage, frontend, payment, receipt, verification, trial, `/cases`, or `/case`
  behavior changes.
- Stop if probe output would expose full records or secrets.

## Next Action

- Release, then call deployed probe only if rehearsal endpoints are enabled in
  Render env.
