# Nimclea Supabase Clean Authority Migration Blocker Record v0.1

## Purpose

This record explains why `docs/NIMCLEA_SUPABASE_CLEAN_AUTHORITY_SQL_DRAFT_V0_1.md` is review-passed as a draft but is not yet executable as a migration candidate.

## Current Conclusion

The clean authority SQL draft has been reviewed and accepted as a draft artifact, but it is not executable yet.

No production migration or database push is allowed from the current draft.

## Blocking Issues

- Identity mapping is not finalized.
- Backend-only write boundaries are not finalized.
- `event_reviews` and `case_events` execution details still need a final migration decision.
- `service_role` safety boundaries still need final confirmation for the migration path.

## Identity Mapping Blocker

The clean authority schema still needs a final decision for how backend and route flows will bind `customer_id`, `email`, and existing frontend-facing identifiers before any migration candidate is executed.

## Backend-Only Write Boundary Blocker

The draft still requires a final decision on which authority tables, if any, will remain backend-only versus read-write accessible during the first controlled phase.

## `event_reviews` / `case_events` Execution Blocker

The `event_reviews` and `case_events` authority link is review-aligned, but the execution path still needs a separate migration candidate decision before it can be applied safely.

## `service_role` Safety Blocker

The draft still needs a final migration decision for `service_role` privileges, write boundaries, and isolated-environment verification before any live execution.

## Required Decisions Before Migration Candidate

- Final identity mapping for customer and route binding.
- Final backend-only write boundary decisions.
- Final `event_reviews` / `case_events` migration execution decision.
- Final `service_role` safety and privilege decision.
- Final isolated-environment rollout order.

## Allowed Next Step

Revise the SQL draft into a separate migration candidate after identity mapping and backend-only write boundaries are decided.

The first run must happen only in an isolated Supabase environment.

## Explicitly Forbidden Next Step

- Do not run the current SQL draft as a production migration.
- Do not perform a direct `db push` from the draft.
- Do not bypass the isolated-environment requirement.
- Do not treat the draft as an executable cutover artifact yet.
