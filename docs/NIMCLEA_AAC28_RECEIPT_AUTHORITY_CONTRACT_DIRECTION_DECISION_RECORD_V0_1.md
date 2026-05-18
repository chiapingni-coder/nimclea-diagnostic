# Nimclea AAC28 Receipt Authority Contract Direction Decision Record

## Record ID

NIMCLEA_AAC28_RECEIPT_AUTHORITY_CONTRACT_DIRECTION_DECISION_RECORD_V0_1

## Date

2026-05-17

## Purpose

This AAC28 record decides the contract direction for receipt authority after AAC27 found schema/backend adapter drift between the current backend receipt adapter and the newer Supabase clean authority receipt schema.

The goal is to choose the next safe implementation direction before any runtime patch, write/read-back smoke, Supabase migration, receipt UI change, payment change, PDF export change, verification unlock change, or storage change.

## Scope

- Area: Supabase clean authority receipt contract direction
- Based on: AAC26 receipt write/read-back candidate and AAC27 receipt schema/backend adapter inspection
- Runtime behavior affected: none
- Frontend behavior affected: none
- Supabase migration affected: none
- RLS / permission behavior affected: none
- Payment behavior affected: none
- Receipt PDF export behavior affected: none
- Verification unlock behavior affected: none
- Supabase Storage affected: none

## AAC27 Inspection Summary

AAC27 found that the current backend receipt adapter writes and reads receipt authority records through:

``text
client.from("receipt_records")
``

The newer clean authority migration defines the canonical receipt authority table as:

``text
public.receipts
``

AAC27 also found that the backend receipt payload currently includes non-canonical top-level fields for the clean authority receipts table:

- payment_status
- readiness_payload
- payment_payload
- export_payload
- authority_source

The canonical receipts table provides accepted fields such as:

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

## Decision

Selected direction: Option B.

Align the backend receipt adapter to the newer canonical public.receipts table instead of preserving the older receipt_records write target.

## Rejected Direction A

Rejected for now: evolve receipt_records or add columns to receipt_records to satisfy the current backend payload.

Reason:

- receipt_records appears to be part of the older baseline shape.
- the newer clean authority schema has already introduced public.receipts as the broader canonical receipt authority surface.
- adding columns to receipt_records would preserve drift instead of reducing it.
- this would risk creating two competing receipt authority tables.

## Rejected Direct Top-Level Field Expansion

Rejected for now: add payment_status, readiness_payload, payment_payload, export_payload, or authority_source as top-level columns on receipts only to satisfy the current adapter.

Reason:

- payment_status belongs more naturally to the payments authority table.
- readiness/export/payment details should not be promoted into receipts top-level columns without a separate contract decision.
- the clean receipts table already includes receipt_payload and metadata as accepted JSONB surfaces.
- authority_source should align with the canonical source field rather than remain a separate non-canonical adapter field.

## Supporting Mapping Rule

Future implementation may map or quarantine non-canonical receipt context only into accepted canonical surfaces, if needed:

- source may replace authority_source where the meaning is canonical source ownership.
- receipt_payload may hold receipt-specific render/export context.
- metadata may hold adapter traceability or non-authoritative auxiliary context.
- payment_status and payment_payload should not be treated as receipt authority success unless separately handled through the payments authority path.

## Required Implementation Boundary for AAC29

The next implementation candidate must not patch runtime immediately.

AAC29 should first record the backend adapter alignment candidate for receipts.

That candidate should define a narrow future payload shape for public.receipts, likely requiring:

- receipt_id
- customer_id
- case_id
- receipt_status
- source
- is_authority_record
- receipt_payload
- metadata
- issued_at
- updated_at

The future controlled write/read-back smoke must fail closed if customer_id is missing, because the canonical receipts table requires customer_id.

## Stop Line

Do not implement the adapter change in AAC28.

Do not add or alter Supabase tables in AAC28.

Do not write to receipt_records as the long-term canonical target without a separate reversal decision.

Do not claim payment readiness, receipt PDF export readiness, verification unlock readiness, or Supabase Storage readiness.

Do not treat payment_status as receipt authority without a separate payments authority contract.

## Classification

Classification: schema-contract drift direction decision.

Likely layer: backend receipt adapter contract versus canonical Supabase clean authority receipts schema.

## Decision / Change Summary

- AAC28 selects Option B: align backend receipt adapter to public.receipts.
- receipt_records is not selected as the forward canonical write target.
- non-canonical adapter fields must not be added blindly as top-level receipt columns.
- payment-related fields remain outside receipt authority unless separately decided.
- the next safe step is AAC29 backend receipt adapter alignment candidate.

## Acceptance Criteria

- Contract direction is selected.
- Runtime behavior remains unchanged.
- Supabase schema remains unchanged.
- Receipt UI, payment, PDF export, verification unlock, and storage behavior remain unchanged.
- Future implementation is narrowed to a candidate record before code changes.
- The decision follows the v0.9-3 schema-contract drift workflow.

## Validation

Commands / checks run:

``powershell
# Pending after this record is protected:
.\scripts\gate-doc.ps1 "docs/NIMCLEA_AAC28_RECEIPT_AUTHORITY_CONTRACT_DIRECTION_DECISION_RECORD_V0_1.md"
.\scripts\release-check.ps1
``

Result:

- Pending

## Risk / Stop Line

This decision record is not evidence that receipt authority writes are production-ready.

It only selects the next contract direction after AAC27 inspection. A future controlled write/read-back smoke is still required before claiming receipt write confidence.

## Next Action

Protect this record with gate-doc.ps1, then run release-check.ps1.

After AAC28 is protected and pushed, proceed to AAC29 receipt backend adapter alignment candidate.
