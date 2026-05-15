# Nimclea Export Boundary Contract v0.1

## Purpose

Define what can safely leave the workspace as an exported or external-facing Nimclea record.

## What this boundary controls

This boundary controls receipt exports, verification exports, external-facing summaries, and evidence package behavior.

## In scope

- Receipt exports.
- Verification exports.
- Stable case summaries.
- Stable receipt or verification context.
- Preserved `caseId`.
- Exported records tied to the correct case and evidence chain.

## Out of scope

- App routing changes.
- Payment logic changes.
- Scoring rule changes.
- Exporting mock data.
- Exporting unstable local-only state.
- Exporting unrelated case data.
- Creating new receipt or verification eligibility rules.

## Release acceptance rule

An exported or external-facing record must preserve `caseId`, display stable summary and context, and exclude mock, unrelated, or unstable local-only data.

## Regression risk

The main risk is an export using stale local state, the wrong case context, or placeholder evidence while the visible app state appears correct.

## Manual smoke check

From a receipt-ready or verification-eligible case, review the exported record or external-facing package. Confirm the `caseId`, summary, context, receipt or verification status, and evidence references match the selected case.

## Stop line

Stop release if an export exposes mock data, unstable local-only state, unrelated case data, missing `caseId`, or a summary that conflicts with the selected case.
