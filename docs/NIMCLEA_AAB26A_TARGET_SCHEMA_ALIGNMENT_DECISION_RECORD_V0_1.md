# AAB-26A Target Schema Alignment Decision Record

## Status

PASS / TARGET ALIGNMENT DECISION RECORDED

## Relationship To AAB-26

AAB-26 recorded the manual pre-execution stop line for the controlled existing-case fixture creation execution record.

AAB-26A records the target schema alignment decision after the manual pre-execution check found that the selected target project is not the clean-authority schema expected by AAB-24/AAB-25/AAB-26.

## Manual Pre-Execution Finding

- `public.customers` is missing in the selected Supabase target project.
- `public.cases` is present, but it matches the legacy/current runtime schema rather than the AAB-24 clean-authority schema.
- observed `public.cases` columns include `case_id`, `user_id`, `email`, `title`, `status`, `stage`, `receipt_eligible`, `case_receipt_eligible`, `verification_eligible`, `event_count`, `source`, `created_at`, `updated_at`, `raw_payload`, `result`, `case_data`, `raw_record`, `company`, and `name`.
- AAB-24 SQL candidate is not compatible with the selected target project.

## Decision

- Do not execute AAB-24/AAB-26 fixture SQL in the current legacy/runtime-shaped project.
- Do not modify the fixture SQL to fit the legacy cases table.
- Do not proceed to AAB-27.
- Preferred path: use a true isolated clean-authority Supabase target project whose schema matches the reviewed clean-authority migration.
- The current legacy/runtime-shaped project is not approved as the AAB existing-case fixture target.

## Rationale

- Avoid mixing clean-authority fixture validation with legacy/runtime tables.
- Avoid corrupting current runtime-shaped data.
- Preserve AAB-24/AAB-25 review validity.
- Keep fixture smoke focused on the clean-authority read path.

## Rejected Options

- forcing AAB-24 SQL into the legacy cases table
- changing runtime schema inside AAB-26
- running Smoke 3 without fixture creation
- using production or Render data migration as a shortcut

## Required Next Target Condition

- target must contain the clean-authority tables and columns expected by AAB-24/AAB-26
- target must be isolated/rehearsal unless separately approved
- no customer or payment data may be involved

## Stop Line Conditions

Stop if:

- target schema does not expose `public.customers`
- `public.cases` does not contain the clean-authority columns expected by AAB-24
- target identity is uncertain
- any schema migration is proposed without a separate approved plan
- fixture SQL must be rewritten to match legacy tables

## Next Action

Next action:

`AAB-26B: clean-authority isolated target confirmation or creation plan`

Not next:

- AAB-27
- fixture insert yet
