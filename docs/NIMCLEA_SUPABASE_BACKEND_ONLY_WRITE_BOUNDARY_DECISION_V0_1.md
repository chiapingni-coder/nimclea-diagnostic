# Nimclea Supabase Backend-Only Write Boundary Decision v0.1

## Purpose

Define which Supabase writes must remain backend-only as Nimclea moves toward Supabase as the main authority.

## 1. Which Data Writes Must Be Backend-Only

The following writes must be backend-only:

- customer identity writes
- case creation writes
- case event writes
- receipt record writes
- payment status writes
- verification status writes
- trial lifecycle state writes
- any authority-boundary write that affects canonical case ownership or lifecycle status

These writes must be performed by backend code only and not by frontend direct Supabase calls.

## 2. Which Frontend Actions May Request Writes But Must Not Directly Write to Supabase

Frontend actions may request backend writes for:

- creating a case
- capturing an event
- updating receipt readiness or status
- initiating or confirming payment-related state
- initiating or confirming verification-related state
- starting or updating a trial lifecycle

The frontend may request these operations, but it must not write directly to Supabase for them.

## 3. Which Tables or Record Types Are Considered Core Authority Records

Core authority records include:

- `cases`
- `case_events`
- `receipt_records`
- `trial_lifecycle`
- any canonical customer identity record used to bind those tables

These records define authoritative state and must be protected from direct frontend writes.

## 4. Which Data Can Remain Frontend-Local or Temporary

Frontend-local or temporary data may include:

- UI draft state
- in-progress form inputs
- transient validation state
- optimistic display state that has not yet been confirmed by the backend
- temporary route state used for navigation or rendering

Temporary data must not be treated as authoritative Supabase state.

## 5. How Case Creation, Event Capture, Receipt Status, Payment Status, and Verification Status Should Cross the Backend Boundary

- Case creation should be requested by the frontend and executed by the backend.
- Event capture should be requested by the frontend and persisted by the backend.
- Receipt status should be computed or updated by the backend and returned to the frontend.
- Payment status should be owned by backend logic and payment processors, not by the frontend.
- Verification status should be owned by backend logic and verification workflows, not by the frontend.

The backend is the authority boundary where these state changes are validated and persisted.

## 6. Why `service_role` Access Must Stay Backend-Only

`service_role` access must stay backend-only because it bypasses row-level access rules and can mutate clean authority data with elevated privileges.

If exposed to the frontend, it could bypass intended authority boundaries, create inconsistent records, and make rollback or auditing unreliable.

## 7. Risks If Frontend Direct Writes Are Allowed

- authority rows may be written with incomplete or unvalidated data
- identity mapping can diverge between frontend and backend
- receipt, payment, and verification status can become inconsistent
- clean authority records can be overwritten by UI state
- debugging and auditability become unreliable

## 8. Explicit Stop Line

Do not proceed to a migration candidate until this backend-only write boundary decision is accepted.
