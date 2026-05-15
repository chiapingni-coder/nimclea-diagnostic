# Nimclea Acceptance Boundary Contract v0.1

## Purpose

Define what counts as release-ready Nimclea behavior without adding new product scope.

## What this boundary controls

This boundary controls whether a release can continue based on existing release gates, manual production behavior, and documented stop lines.

## In scope

- Existing automated smoke checks.
- Manual production smoke observations.
- Documented release stop-line triggers.
- Core path stability from access through verification.
- Case continuity, readiness accuracy, and non-contradictory UI states.

## Out of scope

- New features.
- Relaxing or bypassing existing release gates.
- Reclassifying blocker regressions as polish.
- Changing payment, routing, scoring, evidence, or verification behavior.

## Release acceptance rule

A release is acceptable only when required automated checks pass, manual smoke does not reproduce a stop-line issue, and the protected path does not show contradictory or misleading states.

## Regression risk

The main risk is treating a transient but meaningful wrong state as harmless flicker. Any flicker that communicates the wrong product meaning must block release.

## Manual smoke check

Run the current production smoke path through Access, CasesPage, Diagnostic Result, Case Plan / Pilot Plan, Pilot Result, Receipt, and Verification eligibility. Confirm that each step shows one coherent state and preserves the same case identity.

## Stop line

Stop release if acceptance depends on ignoring a failed gate, a reproduced production blocker, broken case continuity, or a readiness state that briefly displays the wrong decision before correcting itself.
