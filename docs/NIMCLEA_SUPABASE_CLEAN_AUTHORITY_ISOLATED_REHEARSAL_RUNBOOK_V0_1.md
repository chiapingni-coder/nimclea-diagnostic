# Nimclea Supabase Clean Authority Isolated Rehearsal Runbook v0.1

## 1. Rehearsal Target Requirement

The rehearsal must run only in a named isolated Supabase project or a local isolated Supabase target.

Production Supabase must not be touched.

The rehearsal target name or project ref must be recorded before execution.

## 2. SQL Source

Use SQL from `docs/NIMCLEA_SUPABASE_CORE_TABLES_MIGRATION_CANDIDATE_V0_1.md`.

Do not create a real migration file yet.

Do not edit `supabase/migrations` yet.

## 3. Execution Checklist

1. Confirm the isolated target.
2. Confirm no production env is loaded.
3. Confirm SQL is copied from the candidate doc.
4. Apply candidate SQL only in the isolated target.
5. Verify tables exist: `case_records`, `case_events`, `receipt_records`.
6. Verify explicit grants exist.
7. Verify RLS is enabled.
8. Verify policies exist.

## 4. Identity-to-Customer Binding Checks

Insert or simulate one test email.

Confirm email maps to `userId` according to the identity mapping decision.

Confirm `userId` maps to `customer_id` if `customer_id` is used.

Confirm `caseId` maps to `case_records`.

Confirm `case_events` attach to the same `caseId` boundary.

Confirm `receipt_records` attach to the same `caseId` / customer boundary.

## 5. Backend-only Write Boundary Checks

Confirm `anon` and frontend cannot insert, update, or delete core tables.

Confirm authenticated access is limited according to policy.

Confirm backend and `service_role` can write as intended.

Confirm no broad `anon` write grants exist.

## 6. Pass Criteria

- All SQL shape checks pass.
- All grants, RLS, and policy checks pass.
- Identity, customer, and case binding checks pass.
- Backend-only write boundary checks pass.
- No production project is touched.
- No migration file is created.

## 7. Fail / Stop Criteria

- Any uncertainty about the target project.
- Any `anon` write path works.
- Any identity, customer, or case binding is ambiguous.
- Any table grants are broader than intended.
- Any production credential appears in the rehearsal environment.

## 8. After Rehearsal

If the rehearsal passes, create a pass record doc.

Only after the pass record is committed may a real migration file be considered.

JSON fallback must remain.

No route rewiring yet.
