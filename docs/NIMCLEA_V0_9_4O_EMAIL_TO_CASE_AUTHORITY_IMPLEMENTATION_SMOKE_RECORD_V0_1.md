# V0 9 4O EMAIL TO CASE AUTHORITY IMPLEMENTATION SMOKE RECORD

## Record ID

NIMCLEA_V0_9_4O_EMAIL_TO_CASE_AUTHORITY_IMPLEMENTATION_SMOKE_RECORD_V0_1

## Date

2026-05-18

## Purpose

Document the v0.9-4O implementation smoke for email-to-case authority lookup.
The runtime helper now follows the v0.9-4M selected contract:
`customers.email -> customers.customer_id -> cases.customer_id`.

## Scope

- Area: Backend authority helper used by `/cases?email=`.
- Files inspected:
  - `backend/utils/supabaseCoreAuthorityStore.js`
  - `docs/NIMCLEA_V0_9_4O_EMAIL_TO_CASE_AUTHORITY_IMPLEMENTATION_SMOKE_RECORD_V0_1.md`
- Files changed:
  - `backend/utils/supabaseCoreAuthorityStore.js`
  - `docs/NIMCLEA_V0_9_4O_EMAIL_TO_CASE_AUTHORITY_IMPLEMENTATION_SMOKE_RECORD_V0_1.md`
- Runtime behavior affected: Yes, narrow canonical Supabase case lookup helper only.
- Fallback removal included: No.
- Schema/RLS/grants/migration included: No.
- Supabase Storage included: No.
- Frontend included: No.
- Payment/receipt/verification/trial behavior included: No.

## Implementation Summary

- Updated `getCaseRecordsByEmail(email)` to keep the existing Supabase guard.
- Preserved blank email behavior: `{ ok: false, error: "email_required" }`.
- Preserved email normalization with trim and lowercase.
- Replaced the invalid `cases.email` lookup with a `customers` lookup by email.
- Collects non-empty `customers.customer_id` values.
- Returns `{ ok: true, data: [] }` when no matching customer IDs exist.
- Queries `cases` by `.in("customer_id", customerIds)` and orders by
  `created_at` descending.
- Preserved Supabase error and catch return shapes.
- No `/cases` fallback behavior was removed.

## Acceptance Criteria

- `getCaseRecordsByEmail("smoke+cases-existing-001@nimclea.test")` uses
  `customers.email` to identify customer
  `00000000-0000-4000-8000-000000000023`.
- Matching cases are read through `cases.customer_id`.
- Expected live smoke case IDs after deployment/runtime smoke:
  - `00000000-0000-4000-8000-000000000024`
  - `00000000-0000-4000-8000-000000009401`
- Existing `/cases?email=` fallback behavior remains available if helper lookup
  returns `ok: false`.

## Validation

Commands / checks run:

```powershell
node --check backend\utils\supabaseCoreAuthorityStore.js
node -r dotenv/config --input-type=module -e "import { getCaseRecordsByEmail } from './backend/utils/supabaseCoreAuthorityStore.js'; const result = await getCaseRecordsByEmail('smoke+cases-existing-001@nimclea.test'); console.log(JSON.stringify({ ok: result.ok, disabled: result.disabled === true, reason: result.reason, error: result.error, count: Array.isArray(result.data) ? result.data.length : null, caseIds: Array.isArray(result.data) ? result.data.map((row) => row?.case_id).filter(Boolean) : [] }, null, 2));"
```

Result:

- Passed. `node --check` completed successfully.

Local helper smoke:

- Ran locally. Result was guarded by missing Supabase env:

```json
{
  "ok": false,
  "disabled": true,
  "reason": "supabase_disabled",
  "count": null,
  "caseIds": []
}
```

- Live customer/case ID confirmation remains a deployed deterministic smoke item.

## Explicit Exclusions

- No schema, RLS, grants, or migration changes.
- No Supabase Storage changes.
- No frontend changes.
- No payment, receipt, verification, or trial behavior changes.
- No fallback removal.

## Stop Line

- Stop if the implementation requires `cases.email`.
- Stop if `/cases?email=` fallback behavior would be removed.
- Stop if schema, RLS, grants, migrations, Supabase Storage, frontend, payment,
  receipt, verification, or trial behavior changes are required.

## Next Action

- Deployed deterministic `/cases?email=` smoke after release.

## Local Helper Smoke Update

After rerunning with backend\.env loaded through DOTENV_CONFIG_PATH, the local helper smoke passed.

Observed result:

- ok: true
- disabled: false
- error: null
- count: 2
- caseIds:
  - 00000000-0000-4000-8000-000000009401
  - 00000000-0000-4000-8000-000000000024

Interpretation:

getCaseRecordsByEmail(email) now correctly resolves customers.email -> customers.customer_id -> cases.customer_id against the local Supabase authority environment.

4O local helper smoke result: PASS.
