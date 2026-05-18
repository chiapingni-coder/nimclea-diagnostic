# Nimclea AAC27 Receipt Records Schema and Backend Adapter Inspection Record

## Record ID

NIMCLEA_AAC27_RECEIPT_RECORDS_SCHEMA_AND_BACKEND_ADAPTER_INSPECTION_RECORD_V0_1

## Date

2026-05-17

## Purpose

This AAC27 record documents the inspection of the receipt authority schema and backend adapter shape before any runtime implementation of a receipt write/read-back smoke.

The goal is to confirm the canonical table name and field contract before changing backend code, Supabase schema, payment behavior, receipt PDF export, verification unlock, or storage behavior.

## Scope

- Area: Supabase clean authority backend-only receipt authority inspection
- Backend file inspected: backend/utils/supabaseCoreAuthorityStore.js
- Schema files inspected: supabase/migrations/*.sql
- Runtime behavior affected: none
- Frontend behavior affected: none
- Supabase migration affected: none
- RLS / permission behavior affected: none
- Payment behavior affected: none
- Receipt PDF export behavior affected: none
- Verification unlock behavior affected: none
- Supabase Storage affected: none

## Inspection Commands

``powershell
Select-String -Path .\backend\utils\supabaseCoreAuthorityStore.js -Pattern 'receipt|upsertReceipt|receipt_records|receipts' -Context 4,10

Select-String -Path .\supabase\migrations\*.sql -Pattern 'receipt_records|receipts|receipt_id|case_id|payment_status|decision_status|amount|currency|metadata' -Context 4,12
``

## Backend Adapter Findings

The current backend receipt adapter normalizes receipt authority payloads through normalizeReceiptRecordInput(...).

The current backend write path uses:

``text
upsertReceiptRecord(...) -> client.from("receipt_records").upsert(payload, { onConflict: "receipt_id" })
``

The current backend read path uses:

``text
getReceiptRecordByReceiptId(...) -> client.from("receipt_records").select("*").eq("receipt_id", safeReceiptId)
``

The current backend payload shape includes:

- case_id
- receipt_id
- receipt_status
- payment_status
- receipt_payload
- readiness_payload
- payment_payload
- export_payload
- authority_source
- issued_at
- created_at
- updated_at

## Schema Findings

The older baseline migration defines public.receipt_records with a narrower legacy shape:

- id
- case_id
- receipt_status
- receipt_payload
- issued_at
- created_at
- updated_at

The newer clean authority migration defines public.receipts as the broader canonical receipt authority table:

- receipt_id
- customer_id
- case_id
- payment_id
- receipt_number
- receipt_status
- source
- is_authority_record
- receipt_payload
- metadata
- issued_at
- voided_at
- created_at
- updated_at

## Inspection Result

Result: SCHEMA / BACKEND ADAPTER DRIFT FOUND.

The backend adapter currently points to receipt_records, while the newer clean authority schema defines the authority receipt table as receipts.

The backend adapter also includes fields that are not present in the clean authority receipts table as top-level columns:

- payment_status
- readiness_payload
- payment_payload
- export_payload
- authority_source

The clean authority receipts table instead provides metadata as the general JSONB metadata surface, while payment-specific state appears to belong to the payments table rather than receipts.

## Classification

Classification: schema-contract drift.

Likely layer: backend receipt adapter payload/table contract versus canonical Supabase clean authority receipt schema.

This should not be classified as:

- frontend receipt UI failure
- receipt PDF export failure
- payment/Stripe failure
- verification unlock failure
- Render deployment failure
- Supabase Storage failure
- generic Supabase outage

## Stop Line

Do not implement a receipt write/read-back smoke yet.

Do not patch the backend adapter directly in AAC27.

Do not add receipt_records columns just to satisfy the current backend payload.

Do not rename or migrate tables in AAC27.

Do not change receipt UI, PDF export, payment, verification unlock, or storage behavior.

## Candidate Contract Direction for Next Step

The next AAC step should record a receipt authority contract direction decision before implementation.

Possible directions:

- Option A: keep receipt_records as the write target and evolve schema intentionally
- Option B: align backend receipt adapter to the newer canonical receipts table
- Option C: split receipt/payment/readiness/export details across canonical receipts, payments, and metadata surfaces

AAC27 does not select a final direction. It only records that a direction decision is required before implementation.

## Acceptance Criteria

- Backend receipt adapter table target is identified.
- Backend receipt payload fields are identified.
- Canonical receipt authority schema candidates are identified.
- Drift between receipt_records and receipts is explicitly recorded.
- No runtime code is changed.
- No Supabase migration is changed.
- No frontend, payment, receipt PDF, verification, or storage behavior is changed.
- Next step is narrowed to a contract direction decision.

## Validation

Commands / checks run:

``powershell
Select-String -Path .\backend\utils\supabaseCoreAuthorityStore.js -Pattern 'receipt|upsertReceipt|receipt_records|receipts' -Context 4,10
Select-String -Path .\supabase\migrations\*.sql -Pattern 'receipt_records|receipts|receipt_id|case_id|payment_status|decision_status|amount|currency|metadata' -Context 4,12
``

Result:

- Inspection completed.
- Schema/backend adapter drift found.
- Runtime implementation intentionally deferred.

## Risk / Stop Line

This record must not be treated as evidence that receipt authority writes are production-ready.

It is an inspection record only. The next safe step is a contract direction decision record, not a runtime patch.

## Next Action

Protect this record with gate-doc.ps1, then run release-check.ps1.

After AAC27 is protected and pushed, proceed to AAC28 receipt authority contract direction decision.
