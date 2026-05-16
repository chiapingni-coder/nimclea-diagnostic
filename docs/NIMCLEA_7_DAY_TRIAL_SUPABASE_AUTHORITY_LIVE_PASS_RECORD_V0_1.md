# Nimclea 7-Day Trial Supabase Authority Live Pass Record v0.1

## 1. Final Conclusion

- Supabase as trial lifecycle authority: LIVE PASS + REGRESSION GUARDED.
- The 7-day pilot green bar appears only after Case Plan / PilotSetup is completed and trial start succeeds.
- Diagnostic completed alone does not start the 7-day pilot.

## 2. Final Verified Behavior

- Diagnostic completed: no 7-day pilot bar yet.
- Continue Case -> PilotSetup / Case Plan completion:
  - `registerTrialUser` succeeds.
  - `startTrial` succeeds.
  - Supabase `trials` record is created/updated.
  - `/trial-status` reads from Supabase.
  - CasesPage shows `7-Day Pilot · Day 1 of 7`.

## 3. Live Evidence

Email:

`trialflowtest6@gmail.com`

`/trial-status` result:

- `trialActive: true`
- `trialDay: 1`
- `casesCreatedDuringTrial: 1`
- `shouldShowTrialStatusBar: true`
- `source: supabase_trial_record_with_cases`

Direct Supabase authority check:

Email:

`trialsupabasecheck1@gmail.com`

`/trial-status` result:

- `trialActive: true`
- `trialDay: 1`
- `shouldShowTrialStatusBar: true`
- `source: supabase_trial_record`

## 4. Fixes Completed

Commits:

- `92d6ac3` Start trial for first case flow
- `30cba45` Register trial before starting first case flow
- `7b76620` Add trial start grace window
- `12c7de3` Add trial Supabase authority regression guard

Summary:

- Removed unconditional skip of `startTrial` for first case flow.
- Removed fake local trialId pattern `case_${resolvedCaseId}`.
- First case flow now registers a real trial before `startTrial`.
- `buildTrialStatus` now includes a 60-second start grace window.
- Regression guard added and wired into `check-release-gate.mjs`.

## 5. Supabase Permission Fix

The blocker was:

`permission denied for table trials`

SQL applied:

```sql
grant usage on schema public to service_role;

grant select, insert, update, delete
on table public.trials
to service_role;
```

## 6. Regression Protection

The new guard prevents:

- Fake trialId: `case_${resolvedCaseId}`.
- Unconditional skip `startTrial` for `isCaseFlowSubmission`.
- Missing `hasStartedTrialSession`.
- Deletion of `TRIAL_START_GRACE_MS`.
- CasesPage falling back to local `getTrialSession` inference for the trial bar.

## 7. Release Gate Result

- `node scripts/check-trial-supabase-authority-contract.mjs` passed 8/8.
- `node scripts/check-frontend-trial-status-adapter-runtime.mjs` passed 30/30.
- `node scripts/check-cases-page-trial-status-bar-guard.mjs` passed 23/23.
- `node scripts/check-release-gate.mjs` passed with PASS 30 / WARN 5 / FAIL 0.

## 8. Final Status

Supabase trial lifecycle: LIVE PASS + REGRESSION GUARDED
