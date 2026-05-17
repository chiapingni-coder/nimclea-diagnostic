# Nimclea AAC-01 Backend-Only Write Boundary Rehearsal Plan v0.1

## Purpose

AAC-01 defines the rehearsal plan for proving Nimclea clean authority writes are backend-only.

The goals are to prove:

- no frontend Supabase write path is introduced
- controlled writes go through backend adapter or store utilities only
- frontend behavior remains read-only with respect to authority writes

This document is a plan only. It does not change runtime behavior and it does not apply any migration.

## Boundary Rules

The allowed boundary is narrow:

- frontend may call backend HTTP endpoints only
- frontend must not import Supabase client
- backend routes must not inline Supabase writes directly
- backend writes must go through `backend/utils/supabaseCoreAuthorityStore.js` or a clearly named backend authority adapter
- `SUPABASE_SERVICE_ROLE_KEY` must remain backend-only
- no anonymous write path is allowed

Any write authority outside that boundary is out of scope for AAC-01.

## First Controlled Write Candidate

The first rehearsal target is `case_events`.

Reason:

- append-only
- low-risk compared with mutating cases or receipts
- audit-friendly
- easier to verify than user-facing records

AAC-01 does not use receipts, payments, or customer-facing production records as the first write rehearsal.

## Rehearsal Mode

AAC-01 must use fixture or test case ids only.

AAC-01 must use smoke or test emails only, such as `nimclea.test`.

The rehearsal should be reversible or harmless.

AAC-01 does not include customer data migration.

## Acceptance Criteria

AAC-01 is acceptable when a reviewer can identify:

- the only allowed write boundary
- the forbidden write paths
- the selected first write target as `case_events`

This document must not change runtime behavior.

This document must not apply any migration.

## Stop Line

Stop if any of the following is proposed:

- a frontend Supabase write
- a backend route writing directly to Supabase without adapter or store boundary
- use of real customer data
- a combined step that mixes migration, write path, and production smoke

## Next Step After AAC-01

AAC-02 may add a guarded backend-only controlled write rehearsal candidate.

AAC-02 should still avoid broad migration or production customer data movement.
