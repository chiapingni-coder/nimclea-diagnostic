# Nimclea AAB Backend Adapter Rehearsal / Trust-Loop Integration Contract v0.1

## Purpose

AAB defines the scope for a backend adapter rehearsal before any implementation.

AAB exists to:

- rehearse backend adapter connection to Supabase
- preserve the existing frontend API contract
- connect trust-loop authority for Receipt / Payment / PDF / Verification

This contract does not create adapter code, Supabase migrations, frontend changes, or runtime behavior changes.

## Authority Boundary

AAB does not migrate Render JSON data into Supabase.

Render JSON is only a legacy behavior reference. It is not a migration source.

Supabase clean authority starts from:

- empty schema
- controlled rehearsal data
- isolated project

The rehearsal must prove the backend adapter boundary without importing legacy JSON records.

## Hard Exclusions

AAB excludes:

- no Render JSON bulk migration
- no production customer data migration
- no frontend direct writes to Supabase core authority tables
- no localStorage-based paid/receipt-ready/verification unlock authority
- no broad UI refactor

## Minimum Acceptance

AAB is not acceptable until:

- backend-only write boundary is respected
- adapter behavior is documented before implementation
- trust-loop authority source is clarified
- isolated rehearsal comes before production use

## Stop Line

If any implementation tries to import Render JSON into Supabase, expose `service_role` to frontend, or use `localStorage` as payment/verification authority, AAB must stop.
