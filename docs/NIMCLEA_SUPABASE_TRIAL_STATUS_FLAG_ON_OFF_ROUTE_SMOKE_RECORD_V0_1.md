# Nimclea Supabase Trial Status Flag On/Off Route Smoke Record v0.1

## Purpose

This record captures the controlled local route smoke test for `trialStatusRoutes` clean `trial_lifecycle` lookup behind `NIMCLEA_USE_CLEAN_TRIAL_LIFECYCLE`.

## Context

- Route integration commit: `5f33a56 Add disabled clean trial lifecycle status lookup`
- Disabled flag record commit: `1f9c407 Add trial status disabled flag integration record`
- Endpoint tested: `GET /trial-status?email=smoke%2Btrial-status-route-001%40nimclea.test`
- Clean Supabase host: `zticvnrcvcjrbclldtll.supabase.co`
- Production default remains flag off.
- No frontend change.
- No write-side routes changed.

## Smoke Setup

1. Created smoke customer in Supabase:
   - email: `smoke+trial-status-route-001@nimclea.test`
   - `customer_id`: `8d8cfcc4-1f70-4c36-9e79-6e133128b8db`
2. Created active `trial_lifecycle` row:
   - `trial_status`: `active`
   - `started_at`: `2026-05-17T01:02:22.25509+00:00`
   - `ends_at`: `2026-05-24T01:02:22.25509+00:00`

## Flag-On Result

With `NIMCLEA_USE_CLEAN_TRIAL_LIFECYCLE=true`:

- `success = true`
- `data.trialActive = true`
- `data.trialDay = 1`
- `data.shouldShowTrialStatusBar = true`
- `data.trialStartedAt = 2026-05-17T01:02:22.255Z`
- `data.trialEndsAt = 2026-05-24T01:02:22.255Z`

Record note:

- `data.source` returned `backend_trial_record` because `buildTrialStatus` currently only labels `selectedTrial.source === "supabase_trial_record"` as Supabase; this is a display/source-label limitation, not a route smoke failure.

## Flag-Off Result

With `NIMCLEA_USE_CLEAN_TRIAL_LIFECYCLE` removed:

- `success = true`
- `data.trialActive = false`
- `data.trialStartedAt = null`
- `data.trialEndsAt = null`
- `data.trialDay = null`
- `data.shouldShowTrialStatusBar = false`
- `data.source = none`

## Record Cleanup

1. Deleted smoke customer by email.
2. Cascade cleanup removed `trial_lifecycle` row.
3. Post-cleanup counts confirmed:
   - `customers = 0`
   - `trial_lifecycle = 0`
4. Local accidental root `data/` folder was removed.
5. `git status` returned clean.

## Conclusion

Controlled flag-on/off route smoke passed. Clean `trial_lifecycle` status lookup is proven to work only when the flag is enabled, while flag-off default behavior remains unchanged. Next phase should be a small source-label decision or continued read-side hardening, not write-side route switching.
