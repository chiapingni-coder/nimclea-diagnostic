# Nimclea Acceptance Checklist v0.1

## Purpose

This checklist defines the current release stabilization acceptance path for Nimclea.

Use:

- PASS: release may continue for this item.
- HOLD: investigate before release continues.
- STOP: block release until fixed and re-smoked.

## Acceptance Checklist

### 1. Access entry correctness

- PASS: `/access` accepts a valid email, shows a resolving state during lookup, and routes based on backend case ownership.
- HOLD: access copy or loading timing is unclear but final route is correct.
- STOP: `/access` sends a known returning user to the wrong lifecycle path or exposes contradictory entry prompts.

### 2. New vs returning user routing

- PASS: a zero-case email reaches Diagnostic Question 1 through the access boundary; an existing-case email reaches CasesPage.
- HOLD: harmless visual timing issue with correct final route.
- STOP: a new user sees a workspace dashboard first, or a returning user sees diagnostic onboarding before case lookup settles.

### 3. CasesPage case continuity

- PASS: CasesPage displays the correct cases for the resolved email and preserves `caseId` through Detail, Continue, Receipt, and Verification paths.
- HOLD: case counts or labels need polish but the selected case remains correct.
- STOP: CasesPage attaches a CTA to the wrong case, drops `caseId`, or mixes records between users.

### 4. Diagnostic Result to Case Plan flow

- PASS: first-run ResultPage shows the 7-day pilot entry, starts Case Plan / Pilot flow, and preserves the resolved case.
- HOLD: non-blocking copy or spacing issue.
- STOP: ResultPage review shows first-run pilot CTA, shows Continue Case in review mode, or routes a review case into the wrong step.

### 5. Pilot Result to Receipt flow

- PASS: Pilot Result persists a compact result snapshot, preserves event count, and routes eligible cases to Receipt without losing case identity.
- HOLD: summary language needs polish while data continuity is correct.
- STOP: full event payloads cause storage failure, receipt eligibility is lost, or Receipt opens against the wrong case.

### 6. Receipt readiness stability

- PASS: Receipt shows neutral checking while readiness is pending, then stable green ready or authoritative insufficient after hydration settles.
- HOLD: neutral loading duration feels long but no wrong state appears.
- STOP: Receipt flashes yellow, amber, insufficient, or misleading gray before a ready state.

### 7. Verification unlock behavior

- PASS: Verification is reachable only from an eligible, issued, paid, or otherwise authorized receipt state.
- HOLD: unlock copy needs polish but eligibility remains correct.
- STOP: Verification opens without receipt authority or remains locked after confirmed eligibility.

### 8. Payment / paid-state continuity

- PASS: paid, checkout-created, receipt-issued, and verification states remain tied to the same case and do not regress after navigation.
- HOLD: payment management copy is unclear but state remains correct.
- STOP: paid state disappears, crosses cases, unlocks unrelated records, or changes routing incorrectly.

### 9. Case naming consistency

- PASS: renamed cases retain the stable name across CasesPage, Receipt, Verification, and return navigation.
- HOLD: stale display name appears in a non-primary location but case identity is correct.
- STOP: stale naming creates ambiguity about which case is active or exported.

### 10. No trust-breaking flicker

- PASS: temporary loading states are neutral and do not imply a wrong product decision.
- HOLD: minor visual flicker that does not communicate a lifecycle, readiness, or routing decision.
- STOP: any flicker briefly shows the wrong account state, wrong CTA, wrong readiness decision, or wrong case continuity.

### 11. Build and release gate checks

- PASS: production build succeeds and release gate has no FAIL results.
- HOLD: release gate WARN items are manual-only and have documented smoke status.
- STOP: build fails, release gate has FAIL results, or required stability documentation is missing.

## Final release decision

- PASS: all checklist items are PASS, with only documented manual WARN/HOLD items that do not violate a stop line.
- HOLD: one or more items need investigation but no stop-line issue is reproduced.
- STOP: any protected path item reproduces a trust-breaking regression.
