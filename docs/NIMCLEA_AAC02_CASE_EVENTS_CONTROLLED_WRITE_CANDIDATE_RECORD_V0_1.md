# Nimclea AAC-02 Case Events Controlled Write Candidate Record v0.1

## Purpose

AAC-02 selects the first controlled clean authority write candidate.

The goals are to:

- keep the write boundary backend-only
- avoid production data migration
- avoid customer-facing receipt or payment write paths

This document is a candidate record only. It does not change runtime behavior.

## Selected Candidate

`case_events` is selected as the first controlled write target.

Reason:

- append-only
- audit-friendly
- low mutation risk
- suitable for rehearsal

## Allowed Write Boundary

The allowed boundary is narrow:

- frontend may only call a backend HTTP endpoint
- backend route may validate request and pass data to a backend authority store or adapter
- actual Supabase write must go through `backend/utils/supabaseCoreAuthorityStore.js` or a clearly named backend authority adapter
- no frontend Supabase client write is allowed
- no direct inline Supabase write inside frontend or scattered route logic is allowed

## Candidate Event Shape

A minimal rehearsal event shape should include:

- `caseId`
- `eventType`
- `eventSource`
- `eventPayload`
- `createdAt`
- `createdBy` or `actor`
- `rehearsal` flag, if needed

## Rehearsal Constraints

AAC-02 must use only fixture or test case ids.

AAC-02 must use only smoke or test emails such as `nimclea.test`.

AAC-02 must not migrate Render or local JSON data.

AAC-02 must not write customer production records.

AAC-02 must not touch receipts, payments, or verification records.

## Acceptance Criteria

AAC-02 is acceptable when a reviewer can identify:

- the selected write target
- the only allowed write boundary
- the forbidden write paths

The candidate must remain compatible with future backend-only implementation.

This document must not change runtime behavior.

## Stop Line

Stop if any of the following occurs:

- frontend writes directly
- route code writes directly to Supabase without a store or adapter boundary
- cases, receipts, or payments are introduced into this rehearsal
- production customer data is required
- migration, endpoint, and production smoke are bundled into one step

## Next Step After AAC-02

AAC-03 may add or verify the minimal backend store or adapter function for inserting `case_events`.

AAC-03 must remain backend-only and fixture-only.
