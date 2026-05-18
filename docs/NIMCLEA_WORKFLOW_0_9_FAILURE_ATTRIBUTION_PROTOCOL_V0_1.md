# Nimclea Workflow 0.9 Failure Attribution Protocol v0.1

## Status

PROTOCOL RECORDED.

## Purpose

Define Release Automation v0.9 step 1 as a failure attribution protocol.

This document is documentation only.

It does not change runtime code, frontend code, backend routes, Supabase migrations, database writes, Stripe/payment behavior, receipt unlock behavior, or add any production read-only smoke script.

## Required Failure Attribution Block

Use this block when a failure appears:

1. What failed:
2. Likely layer:
3. Smallest proof command:
4. Stop line:

## Layer Categories

Classify failures into one of these initial layers:

- frontend/build
- backend/runtime
- backend/env
- Supabase/schema-contract drift
- Supabase/connectivity
- release-gate/docs
- production-readonly-smoke
- payment/Stripe
- receipt/verification
- unknown/manual-only

## Schema-Contract Drift Example

Example failure:

`Could not find the 'case_metadata' column of 'cases' in the schema cache`

Classify it as:

- Likely layer: backend / Supabase schema-contract drift

Interpretation:

- the backend adapter payload and the canonical Supabase schema are out of contract
- do not assume a broader runtime failure before checking the adapter payload allowlist / mapper

General pattern:

`Could not find the '<column>' column of '<table>' in the schema cache`

Use the same backend / Supabase schema-contract drift attribution for this pattern.

Smallest proof command:

- Run the smallest controlled write/read-back smoke for the affected table, or inspect the backend adapter payload against the canonical Supabase table schema.

## Stop Line

Do not keep chasing single missing fields.

Review the backend adapter payload allowlist / mapper before continuing.

## Closing Checkpoint Format

Use this checkpoint shape after triage:

- Current node:
- Last PASS:
- Open blocker:
- Next smallest step:
- Do not do next:

## Decision

Release Automation v0.9 step 1 uses this protocol to keep failures narrowly attributed before any code or schema change is considered.

No runtime behavior changes are authorized by this document.
