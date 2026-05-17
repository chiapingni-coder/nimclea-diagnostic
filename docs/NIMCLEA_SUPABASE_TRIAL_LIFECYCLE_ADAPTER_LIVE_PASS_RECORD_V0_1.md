# Nimclea Supabase Trial Lifecycle Adapter Live Pass Record v0.1

## Purpose

This record captures the successful live smoke test of the clean Supabase `trial_lifecycle` adapter.

## Context

- Clean Supabase project: `nimclea-clean-authority`
- Correct Project URL host: `zticvnrcvcjrbclldtll.supabase.co`
- Adapter commit: `b7fa955 Add clean Supabase trial lifecycle adapter`
- Service role grants commit: `8dceae9 Add clean authority service role grants`
- Production routes are not switched.
- Frontend is not changed.
- Old `supabaseTrialStore.js` is not changed.
- Old `trials` table is not used.

## Passed Checks

1. DNS/API connectivity check passed after correcting the Supabase URL host.
2. REST connectivity returned 401 Unauthorized without key, confirming network access.
3. Initial live smoke failed with permission denied for `trial_lifecycle`.
4. `002` service_role grants migration was created and executed live.
5. Live adapter smoke then passed:
   - `createResult.ok = true`
   - `startResult.ok = true`
   - `readResult.trialStatus = active`
   - `readResult.trialActive = true`
   - `readResult.source = supabase_trial_lifecycle`
6. Smoke customer was deleted after test.
7. Cascade cleanup removed `trial_lifecycle` row.
8. Post-cleanup counts confirmed:
   - `customers = 0`
   - `trial_lifecycle = 0`
9. No production route was switched.
10. No frontend change was made.
11. No Render JSON data was migrated.
12. No old `trials` table was touched.

## Conclusion

Clean `trial_lifecycle` adapter is live-smoke verified, but not yet connected to production routes. Next phase should be route integration planning behind a safe flag or explicit fallback boundary.
