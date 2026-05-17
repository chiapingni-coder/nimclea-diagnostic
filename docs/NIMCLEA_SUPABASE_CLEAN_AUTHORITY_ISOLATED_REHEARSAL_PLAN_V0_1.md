# Nimclea Supabase Clean Authority Isolated Rehearsal Plan v0.1

## Purpose

This is a rehearsal plan only.

It does not execute SQL.

It does not connect to production Supabase.

It does not modify backend or frontend code.

It does not edit the release gate.

It uses the identity mapping decision, the backend-only write boundary decision, and the clean authority migration candidate as authority records.

## 1. Rehearsal Environment Options

### Option A: Local Supabase

Run the candidate in a local Supabase environment that is isolated from production data.

### Option B: Separate Throwaway Supabase Project

Run the candidate in a separate throwaway Supabase project that is not used for production traffic.

## 2. Preferred Option for the First Rehearsal

The preferred first rehearsal is a separate throwaway Supabase project.

Reason:

- it is closer to the real hosted environment
- it validates the candidate against the Supabase service behavior directly
- it reduces the chance that local-only differences hide a deployment issue
- it keeps production and live project data untouched

Local Supabase can be used later for faster repeatable checks, but it is not the first choice for the initial rehearsal.

## 3. Exact Rehearsal Sequence

1. Create the isolated rehearsal environment.
2. Apply the draft SQL from the migration candidate.
3. Verify that the expected core tables exist.
4. Verify explicit grants on each table.
5. Verify row level security is enabled.
6. Verify the expected policies exist.
7. Insert minimal synthetic test records.
8. Test backend-only write assumptions through the backend path.
9. Confirm no frontend direct write path is required.

The rehearsal must remain isolated from production data and production auth flows.

## 4. Minimal Seed Data

Use only synthetic test data.

- one test user identity
- one test case
- one event or `case_event`
- one receipt, payment, or verification status sample

The seed data should be sufficient to prove identity mapping, case creation, event capture, and receipt/status handling without using production records.

## 5. Pass / Fail Criteria

### Pass

- tables are created successfully in the isolated environment
- explicit grants exist and match the candidate intent
- row level security is enabled
- policies are present and conservative
- minimal synthetic records can be inserted through the backend-authorized path
- read paths return the expected rows
- no frontend direct Supabase write is required
- no production data is touched

### Fail

- any table collides with existing production schema unexpectedly
- grants are broader than intended
- row level security is disabled or missing
- policies are missing or permissive beyond the candidate intent
- backend-only write assumptions cannot be validated
- rehearsal requires production data or frontend direct writes

## 6. Rollback / Disposal Rule

If the rehearsal fails, dispose of the isolated environment or reset it completely before another attempt.

Do not keep a partially trusted rehearsal environment.

Do not reuse a failed rehearsal project for production validation.

## 7. Stop Line

Do not apply this migration to production until the isolated rehearsal passes and a pass record is committed.

Do not use production data for the rehearsal.

Do not promote the candidate into a live migration path until identity mapping and backend-only write boundaries remain aligned with the rehearsal result.
