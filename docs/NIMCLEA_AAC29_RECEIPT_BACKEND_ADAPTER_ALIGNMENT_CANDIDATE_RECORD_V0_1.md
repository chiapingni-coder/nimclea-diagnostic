# Nimclea AAC29 Receipt Backend Adapter Alignment Candidate Record

## Record ID

NIMCLEA_AAC29_RECEIPT_BACKEND_ADAPTER_ALIGNMENT_CANDIDATE_RECORD_V0_1

## Date

2026-05-17

## Purpose

This AAC29 record defines the backend receipt adapter alignment candidate after AAC28 selected Option B: align the backend receipt adapter to the canonical public.receipts table.

This is a candidate record only. It does not implement runtime code changes, Supabase migrations, receipt UI changes, payment changes, PDF export changes, verification unlock changes, or storage changes.

## Scope

- Area: Supabase clean authority receipt backend adapter alignment candidate
- Based on: AAC26, AAC27, and AAC28
- Candidate backend file: backend/utils/supabaseCoreAuthorityStore.js
- Candidate canonical table: public.receipts
- Runtime behavior affected: none
- Frontend behavior affected: none
- Supabase migration affected: none
- RLS / permission behavior affected: none
- Payment behavior affected: none
- Receipt PDF export behavior affected: none
- Verification unlock behavior affected: none
- Supabase Storage affected: none

## Prior Findings

AAC27 found that the current backend receipt adapter writes and reads through:

``text
client.from("receipt_records")
``

AAC27 also found that the newer clean authority schema defines the canonical receipt authority table as:

``text
public.receipts
``

AAC28 selected Option B:

``text
Align backend receipt adapter to canonical public.receipts table.
``

## Candidate Direction

The future implementation candidate should align upsertReceiptRecord(...) and getReceiptRecordByReceiptId(...) to public.receipts.

The candidate should preserve backend-only authority boundaries and should not introduce frontend direct writes.

## Candidate Table Target

Selected candidate table target:

``text
public.receipts
``

Rejected target for forward canonical receipt authority writes:

``text
public.receipt_records
``

receipt_records may remain as an older baseline / legacy table reference, but it should not be expanded as the forward canonical receipt authority target without a separate reversal decision.

## Candidate Canonical Payload Shape

A future implementation should write only fields accepted by the canonical public.receipts table.

Candidate top-level payload fields:

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

Required narrow minimum for a controlled write/read-back smoke should likely include:

- receipt_id
- customer_id
- case_id
- receipt_status
- source
- is_authority_record
- receipt_payload
- metadata

The future implementation must fail closed if customer_id is missing, because public.receipts requires customer_id.

## Candidate Field Mapping

Recommended mapping candidate:

- authority_source -> source
- receiptStatus / receipt_status -> receipt_status
- receiptPayload / receipt_payload -> receipt_payload
- adapter traceability -> metadata.adapter_context
- readinessPayload / readiness_payload -> metadata.readiness_context only if explicitly non-authoritative
- exportPayload / export_payload -> metadata.export_context only if explicitly non-authoritative
- paymentPayload / payment_payload -> metadata.payment_context only if explicitly non-authoritative

Payment-related context must not be used to claim payment authority or Stripe/payment readiness.

payment_status should not become a top-level receipts field. Payment status belongs to the payments authority path unless separately decided.

## Candidate Backend Changes For Future AAC30

A future implementation record may consider these narrow changes:

1. Update normalizeReceiptRecordInput(...) to emit a canonical receipts payload.
2. Change upsertReceiptRecord(...) from client.from("receipt_records") to client.from("receipts").
3. Change getReceiptRecordByReceiptId(...) from client.from("receipt_records") to client.from("receipts").
4. Keep existing exported function names if needed for compatibility, unless a separate API rename decision is recorded.
5. Add or update controlled write/read-back smoke using a known customer_id and case_id fixture.

## Stop Line

Do not implement the adapter change in AAC29.

Do not run a write/read-back smoke in AAC29.

Do not add or alter Supabase tables in AAC29.

Do not promote payment_status, readiness_payload, payment_payload, export_payload, or authority_source as new top-level receipts columns.

Do not claim receipt write confidence, payment readiness, receipt PDF export readiness, verification unlock readiness, or Supabase Storage readiness.

## Classification

Classification: schema-contract drift backend adapter alignment candidate.

Likely layer: backend receipt adapter contract versus canonical Supabase clean authority receipts schema.

## Decision / Change Summary

- AAC29 records the candidate to align backend receipt authority adapter behavior to public.receipts.
- The future implementation should use canonical receipts fields only.
- Non-canonical adapter fields must be mapped, quarantined, or deferred rather than promoted blindly.
- customer_id is a required future smoke boundary.
- No runtime code is changed in AAC29.

## Acceptance Criteria

- Candidate table target is explicit.
- Candidate payload shape is explicit.
- Non-canonical field handling is explicit.
- Runtime behavior remains unchanged.
- Supabase schema remains unchanged.
- Payment, receipt PDF, verification unlock, frontend, and storage behavior remain unchanged.
- The next safe step is a narrow implementation record plus controlled write/read-back smoke.

## Validation

Commands / checks run:

``powershell
# Pending after this record is protected:
.\scripts\gate-doc.ps1 "docs/NIMCLEA_AAC29_RECEIPT_BACKEND_ADAPTER_ALIGNMENT_CANDIDATE_RECORD_V0_1.md"
.\scripts\release-check.ps1
``

Result:

- Pending

## Risk / Stop Line

This record is not evidence that receipt authority writes are production-ready.

It only records the candidate adapter alignment direction. A future implementation and controlled write/read-back smoke are still required.

## Next Action

Protect this record with gate-doc.ps1, then run release-check.ps1.

After AAC29 is protected and pushed, proceed to AAC30 receipt backend adapter alignment implementation plus controlled write/read-back smoke.
