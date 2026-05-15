# Nimclea Access / Cases Entry Boundary Contract v0.1

## Purpose

Recent flicker regressions came from multiple entry surfaces handling new-user routing at the same time. This contract defines which page owns each entry decision so new-user onboarding, returning-user workspace access, and diagnostic rendering do not compete.

## Canonical Ownership

- `/access` owns new-user email resolution and zero-case onboarding.
- `/cases` owns returning-user workspace and existing case control.
- `/diagnostic` owns diagnostic rendering only and should not decide whether a user is new or returning.

## Canonical Paths

### A. New Email Canonical Path

`/access` -> backend case lookup -> zero cases -> `/diagnostic` with `autoStartDiagnostic=true` -> Question 1

### B. Existing Email Canonical Path

`/access` -> backend case lookup -> existing cases -> `/cases`

### C. Direct Diagnostic Path

`/diagnostic` -> normal landing card

### D. Cases Side-Entry Rule

`/cases` must not act as a new-user onboarding path.

## Forbidden Behavior

- `/cases` showing dashboard/control surface for a zero-case email before redirect
- `/cases` showing no-case modal for normal new-user onboarding
- `/cases` directly navigating zero-case users to `/diagnostic` unless explicitly routed through the canonical access boundary
- Diagnostic landing flashing before Question 1 for access-zero-case flow
- multiple components independently deciding new vs returning user status

## Required Future Fix Direction

Any future `/cases` zero-case handling should either:

- redirect to `/access` with email handoff before rendering workspace UI, or
- render a neutral checking state and then hand off to `/access`

It must not render the Cases dashboard first.

## Smoke Requirements

- `/access` + new email -> Question 1, no landing flash
- `/access` + existing email -> CasesPage
- direct `/diagnostic` -> landing card
- `/cases` + existing workspace -> CasesPage
- `/cases` + new email -> no dashboard flash, no diagnostic landing flash, must follow access boundary

## Current Status

- Access zero-case auto-start: implemented
- Cases side-entry boundary: contract only, not yet implemented
- Direct `/diagnostic` landing: preserved
- CasesPage new-email handling: unstable / deferred until boundary implementation
