# Nimclea Supabase Trial Lifecycle Adapter Contract v0.1

## Purpose

This document defines the contract for a new clean Supabase adapter that writes to `trial_lifecycle` without reusing the old `supabaseTrialStore.js` blindly.

## 1. Why a New Adapter Is Needed

- The existing Supabase trial store targets `trials`.
- The clean schema uses `trial_lifecycle`.
- A direct environment switch would create mismatch risk.

## 2. Clean Adapter File Name Proposal

- `backend/utils/supabaseTrialLifecycleStore.js`

## 3. Required Adapter Functions

- `createTrialLifecycle(record)`
- `startTrialLifecycle(record)`
- `getTrialLifecycleByCustomer(customerId)`
- `getTrialLifecycleByEmail(email)` only if customer lookup is handled safely
- `normalizeTrialLifecycleRow(row)`

## 4. Table Mapping

The adapter must map clean Supabase fields to the existing trial lifecycle model:

- `customer_id`
- `trial_status`
- `started_at`
- `ends_at`
- `created_at`
- `updated_at`

## 5. Compatibility Rule

Route responses must keep existing frontend-facing field names:

- `trialActive`
- `trialStartedAt`
- `trialEndsAt`
- `trialDay`
- `trialEnded`
- `shouldShowTrialStatusBar`

The adapter may map clean database fields to old response fields, but frontend behavior must not change in this phase.

## 6. Safety Rules

- `service_role` key stays backend-only.
- No frontend env changes.
- JSON fallback remains available.
- Do not delete old `supabaseTrialStore.js` yet.
- Do not point old mirror writes at the clean project.
- Do not expand schema.

## 7. First Implementation Boundary

- Only create the adapter and a local smoke script first.
- Do not switch production routes until smoke passes.
- Do not touch payment, receipt, scoring, PDF, or case routes.

## 8. Conclusion

Next code change should be a minimal adapter plus local backend smoke, not a route switch.
