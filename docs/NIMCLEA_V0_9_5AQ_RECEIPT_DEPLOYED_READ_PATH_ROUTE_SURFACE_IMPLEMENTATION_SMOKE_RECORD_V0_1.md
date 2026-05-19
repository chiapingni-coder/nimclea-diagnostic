# V0 9 5AQ RECEIPT DEPLOYED READ PATH ROUTE SURFACE IMPLEMENTATION SMOKE RECORD

## Record ID

NIMCLEA_V0_9_5AQ_RECEIPT_DEPLOYED_READ_PATH_ROUTE_SURFACE_IMPLEMENTATION_SMOKE_RECORD_V0_1

## Date

2026-05-18

## Purpose

Document v0.9-5AQ: the smallest deployed read route surface for canonical
receipt reads by `receipt_id`.

## Scope

- Area: Backend read-only receipt route surface.
- Files inspected: backend/server.js, backend/routes/*.js, and backend/utils/supabaseCoreAuthorityStore.js.
  - `backend/server.js`
  - `backend/routes/analyticsRoutes.js`
  - `backend/routes/caseRoutes.js`
  - `backend/routes/emailRoutes.js`
  - `backend/routes/eventRoutes.js`
  - `backend/routes/hashLedgerRoutes.js`
  - `backend/routes/stripe.js`
  - `backend/routes/stripeWebhook.js`
  - `backend/routes/trialRegisterRoutes.js`
  - `backend/routes/trialStartRoutes.js`
  - `backend/routes/trialStatusRoutes.js`
  - `backend/utils/supabaseCoreAuthorityStore.js`
- Files changed: backend/server.js; docs/NIMCLEA_V0_9_5AQ_RECEIPT_DEPLOYED_READ_PATH_ROUTE_SURFACE_IMPLEMENTATION_SMOKE_RECORD_V0_1.md; scripts/check-release-gate.mjs through gate-doc.ps1.
  - `backend/server.js`
  - `docs/NIMCLEA_V0_9_5AQ_RECEIPT_DEPLOYED_READ_PATH_ROUTE_SURFACE_IMPLEMENTATION_SMOKE_RECORD_V0_1.md`
  - `scripts/check-release-gate.mjs` through `gate-doc.ps1`
- Runtime behavior affected: Yes, adds read-only `GET /receipt/:receiptId`.

## Implementation Summary

- Added `GET /receipt/:receiptId` in `backend/server.js`.
- The route uses the existing clean authority helper
  `getReceiptRecordByReceiptId(receiptId)` from
  `backend/utils/supabaseCoreAuthorityStore.js`.
- The route does not create a second Supabase client path.
- The route returns the canonical receipt row from `public.receipts` when found.
- The route returns `404` when Supabase authority is disabled or no receipt is
  found.
- Helper errors return a generic `500` response without raw Supabase diagnostics.
- Existing `/receipt-record?caseId=` behavior was left unchanged.

## Acceptance Criteria

- `GET /receipt/:receiptId` exists in `backend/server.js`.
- Draft fixture receipt smoke target:
  `00000000-0000-4000-8000-000000000031`.
- Paid fixture receipt smoke target:
  `00000000-0000-4000-8000-000000000040`.
- Fixture case ID reference:
  `00000000-0000-4000-8000-000000000024`.
- Route reads through `getReceiptRecordByReceiptId(...)`.
- Route returns `404` for missing receipt IDs.
- No receipt writes are added.
- No service-role secrets or raw internal Supabase diagnostics are exposed.

## Validation

Commands / checks run:

```powershell
node --check backend\server.js
.\scripts\gate-doc.ps1 "docs\NIMCLEA_V0_9_5AQ_RECEIPT_DEPLOYED_READ_PATH_ROUTE_SURFACE_IMPLEMENTATION_SMOKE_RECORD_V0_1.md"
.\scripts\release-check.ps1
```

Result:

- `node --check backend\server.js`: PASS with no output.
- `gate-doc.ps1`: PASS. Added the 5AQ smoke record to the release gate.
- `release-check.ps1`: FAIL during frontend build with Vite `spawn EPERM`.
  The script then raised a PowerShell parameter validation error because it
  called `Write-FailureAttributionForStep` with an empty `FailureDetail`.

Local smoke result:

- Route implementation added locally.
- Live receipt lookup smoke was not run because the backend server was not
  restarted in this patch step. Syntax validation passed.

Deployed smoke placeholder:

- Pending deployment. After release, smoke:
  - `GET /receipt/00000000-0000-4000-8000-000000000031`
  - `GET /receipt/00000000-0000-4000-8000-000000000040`

## Explicit Non-Claims

- No Supabase schema changes.
- No migrations.
- No RLS, grants, or policy changes.
- No receipt writes.
- No payment, verification, PDF export, frontend, trial, or Supabase Storage
  changes.
- No second Supabase client path.
- No service-role secret exposure.
- No raw internal Supabase diagnostics exposure.

## Risk / Stop Line

- Stop if receipt reads require schema, migration, RLS, grant, or policy changes.
- Stop if the read route would add writes or alter payment, verification, PDF
  export, frontend, trial, or storage behavior.
- Stop if the route would expose service-role secrets or raw internal Supabase
  diagnostics.

## Next Action

- Run the requested gate and release checks.
- Stop before push.
- After deployment, run the draft and paid fixture deployed receipt smokes.

