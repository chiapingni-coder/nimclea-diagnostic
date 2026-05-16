# Nimclea Supabase Existing Backend Mismatch Audit v0.1

## Purpose

This record captures the Phase A reconnaissance finding that the backend already contains Supabase integration, but it targets an older schema and must not be pointed directly at the new clean Supabase project yet.

## Context

- Clean Supabase project: `nimclea-clean-authority`
- Clean base tables:
  - `customers`
  - `cases`
  - `case_events`
  - `receipt_records`
  - `trial_lifecycle`
- Existing backend Supabase files discovered:
  - `backend/utils/supabaseClient.js`
  - `backend/utils/supabaseTrialStore.js`
  - `backend/utils/supabaseMirrorWrites.js`
  - `backend/routes/trialRegisterRoutes.js`
  - `backend/routes/trialStartRoutes.js`
  - `backend/routes/trialStatusRoutes.js`

## Key Findings

1. `backend/utils/supabaseClient.js` already uses:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
2. `backend/utils/supabaseTrialStore.js` currently targets table `trials`, not `trial_lifecycle`.
3. `backend/utils/supabaseMirrorWrites.js` targets several older mirror tables that are not part of clean base v0.1, including:
   - `diagnostic_records`
   - `case_result_records`
   - `case_plan_records`
   - `event_logs`
   - `verification_records`
   - `deleted_cases`
4. `trialRegisterRoutes` writes JSON first, then calls `upsertSupabaseTrial`.
5. `trialStartRoutes` reads and writes JSON and also uses Supabase trial lookup and upsert.
6. `trialStatusRoutes` prefers Supabase trial records when available, otherwise falls back to JSON.
7. Therefore, pointing existing backend env directly to the new clean Supabase project could cause schema mismatch failures.
8. Do not change Render env yet.
9. Do not connect frontend yet.
10. Do not expand clean schema to match old mirror tables yet.

## Recommended Next Move

Create a new clean adapter for `trial_lifecycle` rather than reusing the old `supabaseTrialStore.js` blindly.
