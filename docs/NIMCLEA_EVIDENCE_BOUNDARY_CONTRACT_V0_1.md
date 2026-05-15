# Nimclea Evidence Boundary Contract v0.1

## Purpose

Define what counts as usable evidence inside Nimclea.

## What this boundary controls

This boundary controls which records can support readiness, receipt, verification, case history, and exported evidence claims.

## In scope

- Event capture records.
- Case records.
- Receipt records.
- Verification records.
- Hash ledger records.
- Evidence tied to `caseId`.
- Evidence tied to email or `userId` where available.

## Out of scope

- Placeholder data.
- Mock data.
- Stale local-only data.
- Unlinked records.
- Records attached to the wrong `caseId`.
- External files or claims that were not captured, linked, or preserved by Nimclea.

## Release acceptance rule

Authoritative evidence must be linked to the correct case and must come from evidence-bearing Nimclea surfaces. Placeholder, mock, stale local-only, or unlinked data must not drive readiness, receipt, verification, or export claims.

## Regression risk

The main risk is stale local state or placeholder data being treated as authoritative evidence before backend, receipt, or verification state has settled.

## Manual smoke check

Open a case through CasesPage, Pilot Result, Receipt, and Verification. Confirm event counts, receipt readiness, verification eligibility, and exports refer to the same `caseId` and do not expose unrelated or mock records.

## Stop line

Stop release if evidence is unlinked, stale, mock, placeholder-based, attached to the wrong case, or used before authoritative readiness inputs are settled.
