# Nimclea Responsibility Boundary Contract v0.1

## Purpose

Define what Nimclea is responsible for and what remains the responsibility of the user or client.

## What this boundary controls

This boundary controls product claims, UI language, receipt and verification meaning, and support interpretation of Nimclea records.

## In scope

- Nimclea records user-provided decision facts and events.
- Nimclea structures case context and lifecycle state.
- Nimclea scores decision readiness using its configured rules.
- Nimclea preserves decision evidence, receipt records, verification records, and linked hashes where available.
- Nimclea keeps records tied to case identity.

## Out of scope

- Guaranteeing the real-world truth of user-provided facts.
- Replacing legal, audit, compliance, regulatory, or professional judgment.
- Certifying facts that were not captured or linked inside Nimclea.
- Taking responsibility for external records that users alter outside the workspace.

## Release acceptance rule

Release behavior must present Nimclea as a system of record, structure, scoring, and preservation, not as an external truth guarantor or professional-services replacement.

## Regression risk

The main risk is UI or export copy implying Nimclea verified real-world truth when it only preserved and structured submitted evidence.

## Manual smoke check

Review Result, Pilot Result, Receipt, and Verification surfaces. Confirm the product frames readiness, records, and verification around captured evidence and does not claim external legal, audit, or regulatory certainty.

## Stop line

Stop release if Nimclea appears to guarantee user-provided facts, replace professional review, or certify unsupported external truth.
