# Nimclea Supabase Trial Status Disabled Flag Integration Record v0.1

## Purpose

This record captures that `trialStatusRoutes` now has clean `trial_lifecycle` read-side lookup behind a disabled backend flag, without changing default production behavior.

## Context

- Commit: `5f33a56 Add disabled clean trial lifecycle status lookup`
- Route: `backend/routes/trialStatusRoutes.js`
- Adapter: `backend/utils/supabaseTrialLifecycleStore.js`
- Flag: `NIMCLEA_USE_CLEAN_TRIAL_LIFECYCLE`
- Default behavior remains old path unless the flag is explicitly `true`.

## Recorded Checks

1. `trialStatusRoutes` imports `getTrialLifecycleByEmail`.
2. Clean lookup only runs when `NIMCLEA_USE_CLEAN_TRIAL_LIFECYCLE === "true"`.
3. Missing flag keeps current behavior.
4. Clean lookup errors fall back to current behavior.
5. Response shape remains `{ success: true, data }`.
6. No frontend change.
7. No `server.js` change.
8. No `trialRegisterRoutes` change.
9. No `trialStartRoutes` change.
10. No Supabase writes were added.
11. No old `trials` table usage was added.
12. `node --check backend/routes/trialStatusRoutes.js` passed.
13. Commit `5f33a56` is pushed to `origin/master`.

## Conclusion

Clean `trial_lifecycle` read-side status lookup is installed behind a disabled flag. Next phase should be controlled flag-on local route smoke, not write-side route switching.
