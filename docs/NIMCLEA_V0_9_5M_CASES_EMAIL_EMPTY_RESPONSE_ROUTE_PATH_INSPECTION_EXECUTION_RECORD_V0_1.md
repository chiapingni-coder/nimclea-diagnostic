# v0.9-5M CASES EMAIL EMPTY RESPONSE ROUTE PATH INSPECTION EXECUTION RECORD

## Record ID

NIMCLEA_V0_9_5M_CASES_EMAIL_EMPTY_RESPONSE_ROUTE_PATH_INSPECTION_EXECUTION_RECORD_V0_1

## Date

2026-05-18

## Purpose

This record documents the read-only route-path inspection after v0.9-5K classified the deployed public `/cases?email=` endpoint confidence smoke as FAIL / BLOCKER CLASSIFIED.

The purpose is to inspect why:

- protected authority probe can read fixture cases for `smoke+cases-existing-001@nimclea.test`
- but deployed public `/cases?email=smoke%2Bcases-existing-001%40nimclea.test` returns HTTP 200 with `Count 0` / empty `value`

## Scope

- Area: `/cases?email=` public endpoint route-path inspection.
- Files inspected: backend/server.js, backend/routes/caseRoutes.js, backend/utils/supabaseCoreAuthorityStore.js, plus prior v0.9-5H and v0.9-5K evidence.
  - `backend/server.js`
  - `backend/routes/caseRoutes.js`
  - `backend/utils/supabaseCoreAuthorityStore.js`
- Files changed: this inspection record only.
- Runtime behavior affected: none; documentation-only inspection record.
- Runtime code change: none.
- Schema change: none.
- RLS / permission change: none.
- Supabase Storage: not included.
- Payment / receipt / verification / frontend: not included.
- Secret exposure: none.

## Inspection Summary

Inspection result:

- BLOCKER PATH IDENTIFIED.
- The public `/cases?email=` endpoint does call the clean authority helper path indirectly.
- However, the public endpoint does not use the helper result the same way as the protected authority probe.
- The protected authority probe calls `getCaseRecordsByEmail(email)` and maps returned rows directly to `case_id` values.
- The public `/cases?email=` route calls `loadSupabaseCaseSourcesForEmail(email, deletedCaseIds)`.
- Inside `loadSupabaseCaseSourcesForEmail(...)`, the route calls `getCaseRecordsByEmail(email)`, then applies an additional filter:
  - normalize row
  - derive `rowEmail` through `getEmailFromCaseRecord(normalizedRow)`
  - require `rowEmail === email`
  - require the case not be deleted
- This means clean authority rows that are already scoped by `customers.email -> cases.customer_id` can still be discarded if the normalized case row does not carry a directly extractable email field.

Therefore the likely mismatch is not helper availability. The likely mismatch is post-helper public route filtering / response assembly.

## Evidence

Observed route evidence:

- `backend/server.js` imports `getCaseRecordsByEmail`.
- The protected authority probe uses `getCaseRecordsByEmail(email)` directly and maps rows to `case_id`.
- `loadSupabaseCaseSourcesForEmail(email, deletedCaseIds)` also calls `getCaseRecordsByEmail(email)`.
- When `caseRecordsResult.ok` is true, it assigns `caseRows = caseRecordsResult.data`.
- It then filters those rows using `getEmailFromCaseRecord(normalizedRow)`.
- The filter requires `rowEmail === email`.
- The public `/cases` route later merges local cases and `supabaseSources.cases`, then builds the final response.

Prior deployed smoke evidence from v0.9-5K:

```json
{
  "ok": true,
  "status": 200,
  "fixtureEmail": "smoke+cases-existing-001@nimclea.test",
  "expectedCaseIds": [
    "00000000-0000-4000-8000-000000009401",
    "00000000-0000-4000-8000-000000000024"
  ],
  "foundCaseIds": [],
  "missingCaseIds": [
    "00000000-0000-4000-8000-000000009401",
    "00000000-0000-4000-8000-000000000024"
  ],
  "rawSanitizedBody": {
    "value": [],
    "Count": 0
  }
}
```

Prior protected probe evidence from v0.9-5H:

- Deployed protected authority probe returned success.
- `emailLookup.ok` was true.
- `emailLookup.count` was 2.
- Fixture case IDs were present:
  - `00000000-0000-4000-8000-000000009401`
  - `00000000-0000-4000-8000-000000000024`

## Acceptance Criteria

This inspection passes if it identifies the smallest likely public route-path mismatch without patching runtime behavior.

Actual result:

- Public route path inspected: PASS.
- Helper usage inspected: PASS.
- Protected probe path compared: PASS.
- Likely mismatch classified: PASS.
- Runtime patch included: no.
- Schema / RLS / env change included: no.
- Payment / receipt / verification / storage change included: no.

## Validation

Commands / checks run:

```powershell
Select-String -Path backend\routes\caseRoutes.js,backend\server.js `
  -Pattern "cases\?email|/cases|loadSupabaseCaseSourcesForEmail|getCaseRecordsByEmail|findSupabaseCaseRecord|cases.json|deletedCaseIds|tombstone|Count|value" `
  -Context 4,8

Select-String -Path backend\utils\supabaseCoreAuthorityStore.js `
  -Pattern "getCaseRecordsByEmail|customers|customer_id|cases|email" `
  -Context 4,10
```

Observed findings:

- `/cases` route is defined in `backend/server.js`.
- `/cases` route calls `loadSupabaseCaseSourcesForEmail(email, localDeletedCaseIds)`.
- `loadSupabaseCaseSourcesForEmail(...)` calls `getCaseRecordsByEmail(email)`.
- Public route applies additional email filtering after helper lookup.
- Protected authority probe uses the helper result more directly.
- No runtime code was changed during this inspection.

Result:

- v0.9-5K blocker remains open.
- Inspection result supports a focused next candidate.
- The likely fix should align the public `/cases?email=` path with the already-proven clean authority helper semantics.

## Risk / Stop Line

Stop line:

- Do not patch runtime inside this inspection record.
- Do not change Supabase schema, RLS, grants, service role keys, frontend, payment, receipt, verification, or storage behavior.
- Do not claim deployed `/cases?email=` endpoint confidence until public endpoint returns the expected fixture case IDs.
- Do not classify this as Supabase env parity failure, because v0.9-5H already closed that protected probe scope.
- Do not classify this as route availability failure, because v0.9-5K returned HTTP 200.
- Do not remove tombstone / deleted-case safety filters without a separate explicit candidate.

## Next Action

Next suitable work item:

- v0.9-5N public `/cases?email=` clean authority helper alignment candidate.

Suggested focus:

- Keep the clean authority helper as the trusted email-scoped source.
- Avoid requiring clean authority case rows to carry direct email fields after `getCaseRecordsByEmail(email)` already resolved `customers.email -> cases.customer_id`.
- Preserve deleted-case / tombstone filtering.
- Preserve legacy fallback behavior only as fallback.
- Select the smallest runtime change before implementation.

Not included:

- No runtime code change.
- No endpoint behavior change.
- No schema change.
- No RLS / permission change.
- No production customer data read.
- No payment / receipt / verification / storage change.