# AAB-25 Controlled Existing-Case Fixture Insert Review Record

## Status

PASS / READY FOR CONTROLLED FIXTURE CREATION

## Purpose

This record reviews the AAB-24 SQL candidate for creating one controlled existing-case smoke fixture for future read-only validation of `GET /case/:caseId` and `GET /cases?email=...`.

AAB-25 is a review record only. It does not execute SQL, write Supabase data, create or edit migrations, modify runtime code, modify frontend code, include secrets, use real customer data, or migrate Render/local JSON data.

## Relationship To AAB-21 / AAB-22 / AAB-23 / AAB-24

AAB-21 defined the fixture creation plan, including deterministic fixture identity, backend-only write boundary, and rollback requirements.

AAB-22 selected the first target environment as an `isolated / rehearsal Supabase project`.

AAB-23 preflighted the target project and payload requirements needed by the backend read path.

AAB-24 proposed the controlled SQL candidate and rollback SQL for review.

AAB-25 reviews and approves the AAB-24 SQL candidate for controlled fixture creation under AAB-26, provided the target project schema matches the reviewed clean-authority columns before execution.

## Review Scope

Reviewed scope:

- target environment confirmed by AAB-22
- fixture payload confirmed by AAB-23
- SQL candidate and rollback SQL proposed by AAB-24
- backend read path compatibility reviewed
- current clean authority schema/migrations under `supabase/migrations`
- `backend/routes/caseRoutes.js`
- `backend/utils/supabaseCoreAuthorityStore.js`

Out of scope:

- SQL execution
- Supabase writes
- migration creation or edits
- runtime route changes
- frontend changes
- production fixture creation
- customer data use

## SQL Candidate Review

The AAB-24 SQL candidate is approved for controlled fixture creation review because:

- it uses the `public.customers` and `public.cases` tables defined by the current clean-authority migration draft `20260516000100_create_nimclea_clean_authority_tables.sql`
- it uses existing columns from that migration: `customer_id`, `auth_user_id`, `email`, `display_name`, `organization_name`, `customer_status`, `source`, `is_authority_record`, `metadata`, `created_at`, `updated_at`, `case_id`, `case_status`, `case_type`, `lifecycle_stage`, `case_schema`, `archived_at`, and `deleted_at`
- required fixture fields are present through deterministic UUIDs, smoke email, status/stage, source marker, metadata, case schema, and timestamps
- deterministic fixture identity is used for both customer and case rows
- timestamps use `now()` and are safe for a controlled insert
- no schema mutation is required
- no payment, receipt, verification, PDF, or trial lifecycle rows are inserted
- no Render/local JSON data is imported

Schema note:

- The older base migration `001_nimclea_clean_authority_base.sql` has a smaller table shape and does not include all AAB-24 columns.
- AAB-26 must confirm the selected isolated/rehearsal project uses the AAB-24 reviewed clean-authority shape before any insert.
- If the selected project uses the older base shape, AAB-24 SQL must not be executed without a revised review record.

## Rollback Review

The AAB-24 rollback SQL is approved for controlled review because:

- it targets only the deterministic fixture case id `00000000-0000-4000-8000-000000000024`
- it targets only the deterministic fixture customer id `00000000-0000-4000-8000-000000000023`
- it also constrains deletion by source, fixture metadata, and smoke email
- it avoids broad deletes
- it deletes the case row before the customer row
- it can be safely executed after fixture smoke if the fixture was created exactly as reviewed

Rollback execution must remain narrow. Any future rollback change that removes deterministic `case_id`, `customer_id`, email, source, or fixture metadata filters requires re-review.

## Read-Path Review

Expected `GET /case/:caseId` behavior after controlled fixture creation:

- the route should return `success: true` for the selected backend-readable deterministic case identity
- the returned case should preserve stable identity
- status/stage should represent `diagnostic_completed` or an equivalent existing-case state
- event count should remain `0`
- no payment, receipt, PDF, verification, or trial lifecycle authority should appear

Expected `GET /cases?email=...` behavior after controlled fixture creation:

- `GET /cases?email=smoke%2Bcases-existing-001%40nimclea.test` should include the fixture case
- response count should be greater than `0`
- the fixture should not duplicate
- deleted or tombstoned records should remain hidden
- read behavior should not mutate data
- response shape should remain compatible with CasesPage expectations

Expected failure mode if the fixture is missing:

- `GET /case/:caseId` should fail closed with not found behavior for the missing fixture identity
- `GET /cases?email=...` should return an empty/no-case result for the smoke email
- no case should be fabricated from receipt, event, trial, local-only, or unrelated artifacts

Compatibility note:

- `backend/routes/caseRoutes.js` currently reads single-case Supabase rows by `case_id` and also has mirror-row normalization assumptions.
- `backend/utils/supabaseCoreAuthorityStore.js` reads clean authority rows by `case_id`.
- AAB-26 must confirm the target project schema and the selected read path can consume the proposed payload before committing fixture creation.

## Safety Review

Safety findings:

- no production customer data is used
- no payment data is used
- no receipt data is used
- no verification data is used
- no trial lifecycle data is used
- no secrets are included
- no frontend behavior change is proposed
- no runtime behavior change is proposed
- no Render/local JSON migration is proposed
- no uncontrolled database mutation is proposed
- fixture identity and rollback are deterministic

## Approval Decision

AAB-24 SQL candidate is approved for controlled fixture creation under AAB-26.

Required conditions before execution:

- target environment must be the AAB-22 isolated/rehearsal Supabase project
- selected project schema must match the AAB-24 reviewed clean-authority columns
- rollback SQL must remain narrowly targeted
- no real customer or payment data may be touched
- execution must be recorded in AAB-26

No SQL is executed by AAB-25.

## Stop Line Conditions

Stop before fixture creation if:

- target environment is uncertain
- SQL candidate no longer matches schema
- selected project uses the older base schema without a revised review
- rollback is not narrowly targeted
- backend read path cannot consume the payload
- any real customer data would be touched
- any payment data would be touched
- any receipt, PDF, verification, or trial lifecycle authority would be created
- any secret must be included in documentation
- Render/local JSON migration is proposed
- runtime or frontend behavior changes are required

## Next Action

Next action:

`AAB-26 controlled existing-case fixture creation execution record`

Smoke 3 is not next until the fixture exists and rollback path is confirmed.
