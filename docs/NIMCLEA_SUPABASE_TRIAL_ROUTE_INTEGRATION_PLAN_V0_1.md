# Nimclea Supabase Trial Route Integration Plan v0.1

## Purpose

This document plans how to integrate the clean Supabase `trial_lifecycle` adapter into trial routes safely, without switching production behavior yet.

## Context

- Clean adapter commit: `b7fa955 Add clean Supabase trial lifecycle adapter`
- Service role grants commit: `8dceae9 Add clean authority service role grants`
- Live pass record commit: `a833173 Add Supabase trial lifecycle adapter live pass record`
- Adapter file: `backend/utils/supabaseTrialLifecycleStore.js`
- Smoke script: `scripts/smoke-supabase-trial-lifecycle.mjs`
- Existing old file `backend/utils/supabaseTrialStore.js` still targets old table `trials`
- Existing routes still use JSON fallback
- Production routes are not switched yet
- Frontend is not changed

## 1. Current Verified State

- Clean `trial_lifecycle` adapter is live-smoke verified.
- Smoke data was cleaned.
- `customers = 0` and `trial_lifecycle = 0` after cleanup.
- No production route was switched.

## 2. Integration Principle

- Integrate one route at a time.
- Keep JSON fallback available.
- Do not remove old `supabaseTrialStore.js` yet.
- Do not point old mirror writes at the clean project.
- Do not change the frontend-facing response shape.

## 3. Recommended Route Order

- `trialStatusRoutes` first as read-side integration behind safe fallback.
- `trialRegisterRoutes` second only after customer creation and binding are planned.
- `trialStartRoutes` third because it mutates state.
- Do not touch payment, receipt, scoring, PDF, case routes, or frontend.

## 4. Safe Flag Proposal

- Add a backend env flag later, such as `NIMCLEA_USE_CLEAN_TRIAL_LIFECYCLE=true`.
- Default behavior must remain existing JSON or old-path behavior unless the flag is enabled.
- Missing or failed Supabase clean read must fall back to JSON.

## 5. Data Binding Gap

- Clean `trial_lifecycle` requires `customer_id`.
- Current frontend and route flows may still pass `email`, `userId`, or `trialId`.
- A safe customer lookup and create strategy must be designed before write-side route switching.

## 6. First Code Boundary

- First code change should only add a route-level helper or adapter import behind a disabled flag.
- Do not change live behavior by default.
- Do not create new schema.
- Do not migrate Render JSON data.

## 7. Required Tests Before Route Switch

- Local dry skip smoke
- Live read smoke
- Route response shape comparison
- Fallback test with Supabase env missing
- Fallback test with clean adapter error
- `git diff` check
- No frontend build unless frontend was touched

## 8. Conclusion

Next implementation should start with read-side trial status integration planning behind a disabled flag, not write-side route switching.
