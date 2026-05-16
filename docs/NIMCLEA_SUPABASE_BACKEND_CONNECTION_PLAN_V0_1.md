# Nimclea Supabase Backend Connection Plan v0.1

## Purpose

This document plans the backend connection from Render JSON authority to Supabase clean authority base v0.1 without implementing code yet.

## Context

- Supabase project: `nimclea-clean-authority`
- Live base migration: `supabase/migrations/001_nimclea_clean_authority_base.sql`
- Migration commit: `99d2df8`
- Live pass record commit: `c5a08de`
- Backend is not connected yet.
- Frontend is not changed.
- Render JSON data should not be migrated.

## 1. Current Authority State

- Supabase is live for clean base tables only.
- Render JSON remains current runtime authority until backend connection is intentionally changed.
- No customer data migration is planned.

## 2. Backend Connection Principle

- Connect one backend route family at a time.
- Do not rewrite all backend data logic at once.
- Prefer an adapter layer over scattered direct Supabase calls.
- Keep a rollback path to existing JSON behavior during transition.

## 3. Recommended First Route Family

- `trial_lifecycle` should be first, because it is already isolated and recently tested.
- `customers` and `cases` should come after trial authority is stable.
- `receipt_records` should come later because payment and receipt logic is more sensitive.
- `case_events` should be planned carefully because event logs affect scoring and receipt readiness.

## 4. Do-Not-Touch Boundaries

- Do not change frontend.
- Do not change payment flow.
- Do not change receipt PDF.
- Do not change scoring logic.
- Do not migrate Render JSON data.
- Do not expand schema in this phase.

## 5. Proposed Implementation Sequence

Phase A: backend Supabase client setup only

Phase B: `trial_lifecycle` adapter

Phase C: backend smoke endpoint or script for trial read/write

Phase D: trial route switch behind safe flag

Phase E: live smoke test

Phase F: commit + live pass record

## 6. Required Safety Checks

- Env variables must not be committed.
- `service_role` key must remain backend-only.
- `anon` key must not be used for privileged writes.
- RLS and policies must remain enabled.
- JSON fallback must remain available until live pass.

## 7. Conclusion

Next implementation should start with backend Supabase client setup and `trial_lifecycle` adapter planning, not full backend migration.
