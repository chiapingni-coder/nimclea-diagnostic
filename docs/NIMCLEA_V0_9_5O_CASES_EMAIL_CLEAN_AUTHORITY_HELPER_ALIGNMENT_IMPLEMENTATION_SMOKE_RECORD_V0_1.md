# v0.9-5O CASES EMAIL CLEAN AUTHORITY HELPER ALIGNMENT IMPLEMENTATION SMOKE RECORD

## Record ID

NIMCLEA_V0_9_5O_CASES_EMAIL_CLEAN_AUTHORITY_HELPER_ALIGNMENT_IMPLEMENTATION_SMOKE_RECORD_V0_1

## Date

2026-05-18

## Purpose

This record documents the narrow runtime implementation for the public `/cases?email=` clean authority helper alignment selected in v0.9-5N.

Prior evidence:

- v0.9-5H protected authority probe PASS proved deployed clean authority helper access.
- v0.9-5K public `/cases?email=` smoke returned HTTP 200 but `Count 0` / empty result.
- v0.9-5M inspection identified the likely blocker: public route called `getCaseRecordsByEmail(email)` but then applied extra post-helper direct email filtering.
- v0.9-5N selected the candidate direction: treat successful helper rows as already email-scoped, preserve tombstone filtering, and keep strict direct email filtering only for legacy fallback broad scan rows.

## Scope

- Area: Public `/cases?email=` clean authority helper alignment.
- Files inspected: backend/server.js, backend/utils/supabaseCoreAuthorityStore.js, plus prior v0.9-5H, v0.9-5K, v0.9-5M, and v0.9-5N evidence.
  - `backend/server.js`
  - `backend/utils/supabaseCoreAuthorityStore.js`
  - prior v0.9-5H / 5K / 5M / 5N evidence
- Files changed: backend/server.js and this v0.9-5O implementation smoke record.
  - `backend/server.js`
  - this implementation smoke record
- Runtime behavior affected: public /cases?email clean authority helper success rows are now treated as email-scoped while preserving deleted-case filtering; legacy fallback rows still require direct email matching.
  - `loadSupabaseCaseSourcesForEmail(email, deletedCaseIds)` now distinguishes clean authority helper success rows from legacy fallback broad scan rows.
- Supabase Storage: not included.
- Payment / receipt / verification / frontend: not included.
- Schema change: none.
- RLS / permission change: none.
- Secret exposure: none.

## Decision / Change Summary

Runtime change implemented:

- Added `helperRowsAreEmailScoped = caseRecordsResult.ok === true`.
- When `getCaseRecordsByEmail(email)` succeeds:
  - treat returned rows as already scoped by the helper contract
  - use `Array.isArray(caseRecordsResult.data) ? caseRecordsResult.data : []`
  - apply deleted-case / tombstone filtering
  - do not require a direct row-level email field
- When helper fails and fallback broad Supabase cases scan is used:
  - preserve strict `rowEmail === email` filtering
  - preserve deleted-case / tombstone filtering

This keeps the clean authority path aligned with the canonical contract:

- `customers.email -> customers.customer_id -> cases.customer_id`

It also keeps the fallback path conservative.

## Acceptance Criteria

This implementation is acceptable if:

- Runtime patch is limited to `backend/server.js`.
- Patch is limited to `loadSupabaseCaseSourcesForEmail(...)`.
- Helper success rows are treated as email-scoped.
- Helper success rows still respect deleted-case / tombstone filtering.
- Legacy fallback broad scan rows still require `rowEmail === email`.
- No schema / RLS / env / payment / receipt / verification / frontend / storage change is included.
- Node syntax checks pass.
- Release gate passes with FAIL 0 before push.

Actual result before release gate:

- Runtime patch limited to `backend/server.js`: PASS.
- Helper success path alignment implemented: PASS.
- Tombstone filtering preserved: PASS.
- Legacy fallback direct email filtering preserved: PASS.
- Syntax check for `backend/server.js`: PASS.
- Syntax check for `backend/utils/supabaseCoreAuthorityStore.js`: PASS.

## Validation

Commands / checks run:

```powershell
git diff -- backend\server.js

node --check backend\server.js
node --check backend\utils\supabaseCoreAuthorityStore.js
```

Observed diff summary:

- Added `helperRowsAreEmailScoped`.
- Helper success path now accepts helper rows as already email-scoped.
- Deleted-case / tombstone filtering remains before helper success return.
- Fallback broad scan path still derives `rowEmail` and requires `rowEmail === email`.

Relevant implemented logic:

```javascript
const caseRecordsResult = await getCaseRecordsByEmail(email);
const helperRowsAreEmailScoped = caseRecordsResult.ok === true;
let caseRows = [];

if (helperRowsAreEmailScoped) {
  caseRows = Array.isArray(caseRecordsResult.data) ? caseRecordsResult.data : [];
} else {
  const { data: fallbackCaseRows = [], error: casesError } = await supabase
    .from("cases")
    .select("*");

  if (casesError) throw casesError;
  caseRows = fallbackCaseRows;
}

const filteredCaseRows = (Array.isArray(caseRows) ? caseRows : []).filter((row) => {
  const normalizedRow = normalizeSupabaseCaseRow(row);
  const caseId = String(row?.case_id || normalizedRow?.caseId || "").trim();

  if (caseId && deletedCaseIds.has(caseId)) {
    return false;
  }

  if (helperRowsAreEmailScoped) {
    return true;
  }

  const rowEmail = getEmailFromCaseRecord(normalizedRow);
  return rowEmail === email;
});
```

Syntax check result:

- `node --check backend\server.js`: PASS.
- `node --check backend\utils\supabaseCoreAuthorityStore.js`: PASS.

## Risk / Stop Line

Stop line:

- Do not remove deleted-case / tombstone filtering.
- Do not trust fallback broad scan rows without direct email matching.
- Do not alter Supabase schema, RLS, grants, service role keys, frontend, payment, receipt, verification, or storage behavior.
- Do not claim deployed public `/cases?email=` confidence until a deployed fixture-only smoke confirms expected case IDs.
- Do not read or expose production customer data.

## Next Action

Next suitable work item after this implementation is pushed:

- v0.9-5P deployed `/cases?email=` fixture confidence re-smoke.

Suggested focus:

- After Render deploy picks up v0.9-5O, run fixture-only deployed smoke for:
  - `smoke+cases-existing-001@nimclea.test`
- Confirm expected fixture case IDs:
  - `00000000-0000-4000-8000-000000009401`
  - `00000000-0000-4000-8000-000000000024`
- If both are present, record public endpoint confidence PASS / closure candidate.
- If still missing, classify the next blocker without broadening scope.

Not included:

- No schema change.
- No RLS / permission change.
- No Supabase Storage change.
- No payment / receipt / verification / frontend change.
- No production customer data read.