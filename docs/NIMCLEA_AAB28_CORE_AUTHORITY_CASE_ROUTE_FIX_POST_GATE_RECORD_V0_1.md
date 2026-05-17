# Nimclea AAB28 Core Authority Case Route Fix Post-Gate Record v0.1

## Status

PASS

## Purpose

This record closes the AAB existing-case read-only route fix after runtime verification and Golden Case release-gate execution.

The purpose is to preserve the exact reason, fix, evidence, and boundary of the case route correction so future Supabase core-authority read-first work does not regress into a false 404 path.

## Scope

In scope:

- `/case/:caseId` existing-case read-only route behavior.
- Supabase clean core authority case read path.
- False `Case not found` condition when a `coreTarget` record exists.
- Runtime smoke confirmation for fixture case:
  - `00000000-0000-4000-8000-000000000024`
- Post-fix Golden Case release gate confirmation.

Out of scope:

- Frontend behavior changes.
- New Supabase writes.
- Customer data migration.
- Payment, receipt, verification, or Stripe logic.
- Any `.env` secret or config commit.

## Trigger

During AAB existing-case read-only smoke verification, the route:

    GET /case/00000000-0000-4000-8000-000000000024

initially returned:

    {
      "success": false,
      "message": "Case not found"
    }

The fixture was expected to exist in the Supabase clean core authority table.

## Investigation Finding

Direct backend utility inspection showed that `getCaseRecordByCaseId()` was being called, but returned an error wrapper.

The Supabase URL inspection revealed:

    pathname: /rest/v1/

This was incorrect for `@supabase/supabase-js`.

Correct expected form:

    SUPABASE_URL=https://<project-ref>.supabase.co

without `/rest/v1/`.

After correcting the local backend `.env` value and restarting the backend, the direct route smoke was repeated.

## Code Fix

File changed:

    backend/routes/caseRoutes.js

Exact route condition changed from:

    if ((!localTarget && !supabaseTarget) || deletedCaseIds.has(caseId)) {

to:

    if ((!coreTarget && !localTarget && !supabaseTarget) || deletedCaseIds.has(caseId)) {

## Fix Rationale

The route had already gained a `coreTarget` read-first path, but the not-found condition still only considered the older local and legacy Supabase targets.

That meant a valid clean core authority record could be fetched and then incorrectly discarded by the old 404 condition.

The corrected condition now treats `coreTarget`, `localTarget`, and `supabaseTarget` as valid read sources before returning `Case not found`.

## Runtime Evidence

After `.env` correction, backend restart, and route fix, the route returned:

    {
      "success": true,
      "message": "Case fetched",
      "data": {
        "case_id": "00000000-0000-4000-8000-000000000024",
        "customer_id": "00000000-0000-4000-8000-000000000023",
        "case_status": "diagnostic_completed",
        "case_type": "aab_existing_case_smoke",
        "lifecycle_stage": "diagnostic_completed",
        "source": "aab_existing_case_fixture",
        "is_authority_record": true,
        "caseId": "00000000-0000-4000-8000-000000000024",
        "id": "00000000-0000-4000-8000-000000000024",
        "eventCount": 0
      }
    }

## Commit Evidence

The route fix was committed and pushed:

    7709e33 Fix core authority case route not found condition

Current branch state after push:

    7709e33 (HEAD -> master, origin/master, origin/HEAD) Fix core authority case route not found condition
    531f936 Add AAB27 existing case read-only smoke execution record
    abb8ec7 Add AAB26G controlled fixture creation execution update record

## Release Gate Evidence

Golden Case release gate was executed after the route fix.

Result:

    Summary: PASS 93 / WARN 5 / FAIL 0
    Final result: WARN

The five WARN items remain known manual-only release areas:

- receipt readiness UI smoke
- verification unlock UI smoke
- payment ledger / Stripe dry-run smoke
- new vs returning user routing smoke
- stale local case naming smoke

No FAIL was introduced by the AAB28 route fix.

## Boundary Confirmation

Confirmed clean boundaries:

- `backend/.env` was corrected locally only.
- `.env` was not added to Git.
- `git status --short` was clean after commit and push.
- Only the intended route logic was changed.
- No customer data was used.
- The fixture remains non-customer smoke data.

## Decision

AAB28 is accepted as a post-gate closure record for the core authority case route false-404 fix.

The corrected route behavior is now considered verified for the controlled existing-case fixture.

## Next Action

Add this AAB28 record to the release gate required document list in a separate protection commit.
