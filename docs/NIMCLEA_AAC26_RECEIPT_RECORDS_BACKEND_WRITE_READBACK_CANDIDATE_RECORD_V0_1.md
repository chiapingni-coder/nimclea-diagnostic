# Nimclea AAC26 Receipt Records Backend Write-Readback Candidate Record

## Record ID

NIMCLEA_AAC26_RECEIPT_RECORDS_BACKEND_WRITE_READBACK_CANDIDATE_RECORD_V0_1

## Date

2026-05-17

## Purpose

This AAC26 record defines the candidate scope for the next backend-only Supabase authority write/read-back confidence step after AAC24/AAC25 closed the controlled cases write/read-back blocker scope.

The target is to prepare, not yet implement, a controlled backend write/read-back smoke for receipt authority records.

## Scope

- Area: Supabase clean authority backend-only write/read-back confidence
- Candidate authority table family: receipt_records / receipts
- Candidate backend adapter area: backend/utils/supabaseCoreAuthorityStore.js
- Candidate route/use area: receipt authority path only, if later selected
- Runtime behavior affected: none
- Frontend behavior affected: none
- Supabase migration affected: none
- RLS / permission behavior affected: none
- Payment behavior affected: none
- Receipt PDF export behavior affected: none
- Verification unlock behavior affected: none
- Supabase Storage affected: none

## Context

AAC17 proved controlled backend write/read-back confidence for case_events.

AAC18 through AAC25 exposed and resolved cases-table backend/schema contract drift in a controlled sequence:

- classify blocker
- decide contract direction
- record candidate
- implement narrowly
- run controlled write/read-back smoke
- record closure scope

AAC26 starts the same disciplined sequence for receipt authority records.

## Candidate Target

The candidate target is a backend-only controlled write/read-back smoke for receipt authority records.

Before implementation, the exact canonical table name and required fields must be confirmed from the current Supabase migration/schema contract.

Possible target names:

- receipt_records
- receipts

The next implementation step must not assume the table name from memory.

## Candidate Write Shape

The future smoke candidate should write only canonical receipt authority fields that are already present in the accepted schema.

Candidate fields may include, only if confirmed by schema:

- receipt_id
- case_id
- customer_id
- decision_status
- amount
- currency
- payment_status
- created_at
- updated_at
- receipt_metadata or equivalent accepted metadata surface

Any non-canonical field must be excluded, mapped, or quarantined only after a recorded contract-direction decision.

## Stop Line

Do not implement the receipt write smoke yet.

Do not add a Supabase migration in AAC26.

Do not change frontend receipt behavior.

Do not change payment behavior.

Do not change receipt PDF export behavior.

Do not change verification unlock behavior.

Do not claim production receipt readiness.

## Required Smallest Proof Before AAC27

Before AAC27 implementation, inspect both sides of the receipt authority contract:

``powershell
# 1. Inspect backend receipt authority adapter exports and write payload shape
Select-String -Path .\backend\utils\supabaseCoreAuthorityStore.js -Pattern 'receipt|upsertReceipt|receipt_records|receipts' -Context 4,8

# 2. Inspect canonical Supabase migration/schema for receipt authority table and columns
Select-String -Path .\supabase\migrations\*.sql -Pattern 'receipt_records|receipts|receipt_id|case_id|payment_status|decision_status' -Context 4,10
``

## Candidate Success Criteria

A future AAC27 or later controlled smoke may be considered successful only if:

- the backend writes a receipt authority record using only canonical fields
- the smoke reads back the same record from Supabase
- the returned receipt_id or equivalent canonical identifier matches the written target
- no frontend/browser/localStorage path is used as authority
- no anon client write is used
- no payment/Stripe success is claimed unless separately tested
- no receipt PDF export readiness is claimed unless separately tested

## Decision / Change Summary

- AAC26 records the receipt authority backend write/read-back candidate.
- The selected direction is preparation only.
- The next step should inspect the canonical receipt schema and backend adapter before implementation.
- The AAC sequence remains narrow and auditable.

## Acceptance Criteria

- Candidate scope is recorded.
- Runtime behavior remains unchanged.
- Supabase schema remains unchanged.
- Receipt/payment/verification/frontend behavior remains unchanged.
- The next smallest-proof commands are explicit.
- The record is suitable to protect in the release gate.

## Validation

Commands / checks run:

``powershell
# Pending after this record is protected:
.\scripts\gate-doc.ps1 "docs/NIMCLEA_AAC26_RECEIPT_RECORDS_BACKEND_WRITE_READBACK_CANDIDATE_RECORD_V0_1.md"
.\scripts\release-check.ps1
``

Result:

- Pending

## Risk / Stop Line

This is a candidate record only. It must not be treated as evidence that receipt writes, payment ledger behavior, PDF export, verification unlock, or Supabase Storage are production-ready.

## Next Action

Protect this record with gate-doc.ps1, then run release-check.ps1.
