# Nimclea AAC-03 Case Events Backend Store Boundary Inspection Record v0.1

## Purpose

AAC-03 inspects whether the backend already has a controlled store or adapter function for inserting `case_events`.

The goal is to confirm that any future `case_events` write remains backend-only and that AAC-03 does not open a public endpoint yet.

This document is inspection only. It does not change runtime behavior.

## Files Inspected

- `backend/utils/supabaseCoreAuthorityStore.js`
- `backend/routes/caseRoutes.js`
- `frontend/App.jsx`
- `frontend/pages/CasesPage.jsx`
- `frontend/pages/ResultPage.jsx`
- `frontend/pages/PilotPage.jsx`
- `frontend/pages/PilotResultPage.jsx`
- `frontend/pages/ReceiptPage.jsx`
- `frontend/pages/VerificationPage.jsx`

## Store / Adapter Finding

`backend/utils/supabaseCoreAuthorityStore.js` does contain `insertCaseEvent`.

It is exported.

It writes through the centralized Supabase authority store using the shared Supabase client and `case_events` table access.

It does not appear to be exposed to the frontend directly.

If `insertCaseEvent` did not exist, AAC-04 would need to add the smallest backend-only function first. In the current codebase, that follow-up is not needed because the function already exists.

## Route Finding

`backend/routes/caseRoutes.js` does not show a public controlled write endpoint for the AAC case-events rehearsal.

The inspected route file does not directly define a `case_events` write endpoint.

The inspected route file does contain other case read and case mutation paths, but the first controlled `case_events` write path is not opened here.

The `case_events` write capability currently lives in the backend store utility, not as a public rehearsal endpoint.

## Frontend Boundary Finding

None of the inspected frontend files import Supabase directly.

None of the inspected frontend files directly write `case_events`.

The inspected frontend files remain limited to backend HTTP calls and local client-side case state behavior for this boundary.

## Acceptance Criteria

AAC-03 can be reviewed for:

- whether `insertCaseEvent` exists
- whether the backend-only boundary is currently preserved
- whether any forbidden frontend write path exists

This document does not open an endpoint.

This document does not change runtime behavior.

## Stop Line

Stop if any of the following is found:

- frontend Supabase writes
- route-level inline Supabase writes bypassing the store or adapter
- a need to create or change runtime code in this task
- endpoint creation, migration, and smoke testing bundled into one step

## Next Step

If `insertCaseEvent` exists and the boundary is clean, AAC-04 may define a minimal fixture-only backend rehearsal endpoint candidate.

If `insertCaseEvent` is missing, AAC-04 should add the smallest backend-only store or adapter function first.

In either case, AAC-04 must remain fixture-only and must not touch receipts, payments, verification, or production customer data.
