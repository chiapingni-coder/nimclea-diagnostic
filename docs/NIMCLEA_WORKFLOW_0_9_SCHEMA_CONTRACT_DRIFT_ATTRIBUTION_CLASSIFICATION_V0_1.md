# Nimclea Workflow 0.9 Schema-Contract Drift Attribution Classification

## Record ID

NIMCLEA_WORKFLOW_0_9_SCHEMA_CONTRACT_DRIFT_ATTRIBUTION_CLASSIFICATION_V0_1

## Date

2026-05-17

## Purpose

This record defines the v0.9 failure-attribution classification for schema-contract drift errors between backend payloads and the canonical Supabase authority schema.

The goal is not to patch runtime behavior immediately. The goal is to classify a recurring failure family so future work stops at the correct boundary before changing code, schema, permissions, or migrations.

## Scope

- Area: Nimclea Release Automation v0.9 failure attribution
- Files inspected: prior AAC failure records and backend/Supabase contract history
- Files changed: documentation only
- Runtime behavior affected: none
- Supabase migration affected: none
- RLS / permission behavior affected: none
- Frontend behavior affected: none

## Classification Name

schema-contract drift

## Trigger Pattern

This classification applies when a backend-controlled Supabase write or read/write smoke fails because the backend payload references a field that is not present in the canonical target table schema.

Typical sanitized error pattern:

``text
Could not find the '<field_name>' column of '<table_name>' in the schema cache
``

Known Nimclea examples from the AAC sequence include:

- missing authority_source on case_events
- missing authority_source on cases
- missing case_metadata on cases

## Likely Layer

Likely layer: schema-contract drift between backend adapter payload and canonical Supabase authority schema.

This should not be classified first as:

- frontend UI failure
- payment failure
- receipt export failure
- RLS permission failure
- Render deployment failure
- generic Supabase outage
- localStorage or browser state failure

## Smallest Proof Command

The smallest proof should inspect both sides of the contract:

``powershell
# 1. Inspect the backend payload field being written
Select-String -Path .\backend\utils\supabaseCoreAuthorityStore.js -Pattern '<field_name>|<table_name>' -Context 3,3

# 2. Inspect the canonical schema/migration definition for the target table
Select-String -Path .\supabase\migrations\*.sql -Pattern 'create table.*<table_name>|<field_name>' -Context 3,8
``

If the backend payload contains the field and the canonical schema does not, the failure should be treated as schema-contract drift.

## Stop Line

Do not patch runtime blindly.

Before changing backend adapter code or adding a Supabase column, the work must first record the contract direction:

- Option A: evolve the canonical schema with a controlled migration candidate
- Option B: align the backend adapter payload to the current canonical schema
- Option C: quarantine/map the field into an existing canonical metadata surface, only if such a surface exists and is already accepted

## Decision / Change Summary

- Add schema-contract drift as a named v0.9 failure-attribution classification.
- Treat Supabase missing-column schema-cache errors as contract drift by default when the backend payload contains a non-canonical field.
- Require smallest-proof inspection before runtime patching.
- Preserve the AAC-style sequence: classify blocker -> decide contract direction -> record candidate -> implement narrowly -> controlled write/read-back smoke.

## Acceptance Criteria

- Missing-column Supabase schema-cache errors have a named attribution class.
- The likely layer is explicit.
- The smallest proof command is explicit.
- The stop line prevents blind runtime patching.
- The classification does not claim any runtime, schema, RLS, payment, receipt, verification, storage, or frontend readiness change.

## Validation

Commands / checks run:

``powershell
# Pending after this record is protected:
.\scripts\gate-doc.ps1 "docs/NIMCLEA_WORKFLOW_0_9_SCHEMA_CONTRACT_DRIFT_ATTRIBUTION_CLASSIFICATION_V0_1.md"
.\scripts\release-check.ps1
``

Result:

- Pending

## Risk / Stop Line

This record is classification-only. It must not be used as evidence that the Supabase write path is broadly production-ready.

It only improves failure attribution discipline for a known recurring schema/backend contract drift pattern.

## Next Action

Protect this record with gate-doc.ps1, then run release-check.ps1.
