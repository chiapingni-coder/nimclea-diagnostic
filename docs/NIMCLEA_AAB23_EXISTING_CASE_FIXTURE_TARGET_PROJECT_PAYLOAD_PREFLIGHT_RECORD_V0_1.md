# AAB-23 Existing-Case Fixture Target Project + Payload Preflight Record

## Status

PASS / READY FOR CONTROLLED FIXTURE CREATION

## Purpose

This record preflights the selected target project and minimum fixture payload for a future long-lived existing-case smoke fixture for `GET /cases?email=...`.

AAB-23 is a planning and preflight record only. It does not create a fixture, write database data, modify runtime code, modify frontend code, create migrations, or include secrets.

## Relationship To AAB-22

AAB-22 selected an `isolated / rehearsal Supabase project` as the first target environment for future existing-case fixture creation.

AAB-23 accepts that environment selection and narrows the next decision to the fixture payload shape needed by the backend read path.

This record references AAB-22 for target-environment selection. It intentionally does not duplicate project URLs, keys, service-role values, or any other secret material.

## Selected Target Project / Environment

Selected target:

`isolated / rehearsal Supabase project`

Environment requirements:

- non-customer project
- controlled test data only
- backend/service-role write boundary only during the future creation step
- no Render production fixture creation in AAB-23
- no frontend write path
- no customer data dependency

## Fixture Purpose

Create one controlled existing-case record later so `GET /cases?email=...` can be smoke-validated against a known non-customer email.

The future fixture should prove only the existing-case list scenario:

- a known smoke email has one backend-authoritative case
- the case list response returns `Count > 0`
- the case identifier is stable
- deleted or tombstoned cases are not resurrected
- no receipt, payment, PDF, verification, or trial lifecycle authority is required

## Proposed Fixture Identity

Preferred smoke email:

`smoke+cases-existing-001@nimclea.test`

Preferred deterministic caseId naming pattern:

`CASE-AAB-EXISTING-001`

If the selected authority store requires UUID primary keys, the human-readable case identifier must be carried in a compatible public/list field or metadata field while the database `case_id` uses the required UUID format.

Fixture label:

`AAB existing-case non-customer smoke fixture`

The fixture must be clearly marked as non-customer test data.

## Backend Read-Path Observations

Files inspected:

- `docs/NIMCLEA_AAB22_EXISTING_CASE_FIXTURE_TARGET_ENVIRONMENT_SELECTION_RECORD_V0_1.md`
- `backend/routes/caseRoutes.js`
- `backend/server.js`
- `backend/utils/supabaseCoreAuthorityStore.js`
- `supabase/migrations/001_nimclea_clean_authority_base.sql`
- `supabase/migrations/002_nimclea_clean_authority_service_role_grants.sql`
- `supabase/migrations/20260516000100_create_nimclea_clean_authority_tables.sql`

Observed read path:

- `GET /cases?email=...` is implemented in `backend/server.js`.
- It reads local JSON sources and Supabase sources, then merges candidate cases.
- Supabase case rows are normalized from `public.cases`.
- The current Supabase list reader expects enough row data to derive `caseId`, email, status/stage, source, case data, and timestamps.
- Deleted/tombstoned case IDs are denylisted before final response construction.
- `backend/routes/caseRoutes.js` contains the `GET /case/:caseId` single-case path and AAB read-only wiring, but it is not the primary `GET /cases?email=...` route implementation.

Clean-authority observations:

- `backend/utils/supabaseCoreAuthorityStore.js` normalizes core case records into fields such as `case_id`, `user_email`, `customer_id`, `case_title`, `status`, `stage`, `diagnostic_payload`, `result_payload`, `case_metadata`, `authority_source`, `created_at`, and `updated_at`.
- The current clean-authority migration draft defines a normalized customer/case model with `customers` and `cases` tables, UUID identifiers, authority markers, metadata, and no payment/receipt/verification dependency for a basic case fixture.
- The fixture creation step must reconcile the exact target project schema before execution because the live rehearsal schema may follow either the current mirror-row read shape or the newer clean-authority draft shape.

## Proposed Minimum Payload Fields

Minimum fields needed by the current backend read path:

- `case_id` or equivalent stable database case key
- public/list `caseId` value if the database `case_id` must be UUID-only
- email or user email equal to `smoke+cases-existing-001@nimclea.test`
- status suitable for case-list display, such as `diagnostic_completed` or `draft`
- stage suitable for case-list display, if supported
- source or authority marker, such as `aab_existing_case_fixture`
- created timestamp
- updated timestamp
- raw/list payload or metadata that preserves the public `caseId`, email, title/label, status, and non-customer fixture marker when required by the target schema

Minimum fields likely needed by clean-authority shape:

- customer record with the smoke email
- case record linked to the smoke customer
- case status
- source or authority marker
- `is_authority_record` when present
- metadata containing the fixture label and AAB reference
- created and updated timestamps

Recommended payload markers:

- `fixtureType: "aab_existing_case_smoke"`
- `fixtureOwner: "AAB-23/AAB-24"`
- `customerData: false`
- `nonCustomerTestData: true`

## Fields Intentionally Excluded From AAB-23

AAB-23 intentionally excludes:

- payment records
- receipt records
- PDF export unlock data
- verification unlock data
- trial lifecycle records
- Stripe identifiers
- customer production identifiers
- Render JSON data
- local JSON fixture rows
- frontend localStorage state
- secrets, URLs, service-role keys, or tokens

## Safety Boundaries

AAB-23 enforces these boundaries:

- no production customer data
- no payment data
- no secrets
- no schema mutation
- no frontend behavior change
- no runtime behavior change
- no Supabase migration creation
- no Render data migration
- no local JSON writes
- no database writes
- no fixture creation

## Rollback / Removal Plan

The future creation record must define a rollback/removal method before any fixture is written.

Rollback must identify:

- exact target project
- exact table or authority store
- exact fixture email
- exact database case key
- exact public/list case identifier
- whether rollback deletes, tombstones, or disables the fixture
- verification request proving `GET /cases?email=smoke%2Bcases-existing-001%40nimclea.test` no longer returns the fixture after rollback

Rollback must not rely on frontend behavior, payment flows, receipt flows, verification flows, trial lifecycle flows, or Render JSON imports.

## Stop Line Conditions

AAB fixture creation must stop if any future step:

- targets Render production without a separate production fixture approval record
- uses production customer data
- includes service-role secrets in documentation
- creates or modifies a Supabase migration
- writes through frontend code
- writes through a customer route accidentally
- imports Render JSON data
- creates payment, receipt, PDF, verification, or trial lifecycle authority
- cannot define an exact rollback/removal method
- cannot identify whether the target schema expects mirror-row fields or clean-authority fields

## Next Action

Next action:

`AAB-24 controlled fixture creation or dry-run SQL candidate`

Smoke 3 is not next. Existing-case response-shape smoke should wait until a controlled fixture creation or dry-run SQL candidate has been reviewed and accepted.
