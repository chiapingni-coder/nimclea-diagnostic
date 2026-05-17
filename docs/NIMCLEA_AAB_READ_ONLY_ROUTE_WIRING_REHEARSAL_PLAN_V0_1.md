# Nimclea AAB Read-Only Route Wiring Rehearsal Plan v0.1

## Boundary Statement

This plan does not wire adapters into runtime routes.

This plan does not migrate Render JSON data into Supabase.

Render JSON remains legacy behavior reference only.

Supabase clean authority rehearsal data must be isolated and controlled.

No frontend direct Supabase writes are allowed.

No localStorage authority is allowed for payment, receipt, PDF export, or verification.

## Purpose

This plan prepares future read-only backend route wiring.

It exists to:

- preserve current frontend API contracts
- test backend adapter boundaries without changing user-facing behavior
- protect trust-loop authority for case, receipt, payment, PDF, and verification

## First Candidate Route

First candidate: `GET /case/:caseId` in `backend/routes/caseRoutes.js`.

Reason:

- already central to backend case authority
- supports backend-missing fail-closed behavior
- safer than starting with payment or verification writes
- can remain read-only

## Non-Candidates For First Wiring

The first wiring rehearsal must not include:

- payment confirmation write paths
- PDF unlock write paths
- verification unlock write paths
- frontend pages
- migrations
- Render JSON import scripts

## Route Wiring Rehearsal Rules

- route response shape must remain compatible with existing frontend expectations
- adapter must be backend-only
- no `service_role` exposure to frontend
- no production Supabase writes
- no Render JSON imports
- no localStorage-derived trust-loop authority
- rollback must be possible by removing route import/use only

## Acceptance Checklist

- first route candidate identified
- non-candidates listed
- authority source rules documented
- rollback rule documented
- no runtime behavior changed
- release gate requires this document

## Stop Line

If any implementation modifies frontend files, imports Render JSON into Supabase, writes production Supabase data, or makes payment/PDF/verification unlock depend on localStorage, AAB route wiring must stop.
