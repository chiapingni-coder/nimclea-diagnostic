# Trial Workspace Access Contract

## Purpose

This file defines the trial and pilot extension workspace access window. It separates temporary workspace access from formal proof issuance, receipt activation, and formal verification.

The system-wide case lifecycle, Active / Baseline / Historic sections, payment-pending delete rules, and active case limits are defined in `docs/CASE_LIFECYCLE_AND_WORKSPACE_LIMIT_CONTRACT.md`.

## Free 7-Day Trial

Free 7-Day Trial is a 7-day workspace access right, not a reduced-function product tier.

Free 7-Day Trial uses the standard workspace capability model during the active trial window, including:

- Diagnostic access.
- Pilot / Case Plan access.
- Event Capture access.
- Receipt readiness preview.

Formal Receipt and Formal Verification are not included as free trial rights.

## Pilot Extension

Pilot Extension is a $9/month workspace access extension.

Pilot Extension extends the same workspace access model to 1 month, including:

- Diagnostic access.
- Pilot / Case Plan access.
- Event Capture access.
- Receipt readiness preview.

Free trial and pilot extension use the same workspace capability model. The main difference between Free Trial and Pilot Extension is access duration.

## Relationship to System-Wide Case Lifecycle Contract

- Trial and pilot extension plans must use the system-wide Active / Baseline / Historic lifecycle model.
- Active case limits are plan-dependent and defined in the lifecycle contract.
- Baseline Records and Historic Records do not count toward active case limits under the system-wide contract.

## Formal Path Boundary

When a case becomes eligible for Formal Receipt or Formal Verification, the system must guide the user into the formal path.

Eligibility, payment, issuance, and verification standards must not be lowered during Free 7-Day Trial or Pilot Extension.

This contract separates workspace access from formal proof issuance.

## Implementation Implications

- Trial access controls workspace time window.
- Active case limits and archive rules are governed by `docs/CASE_LIFECYCLE_AND_WORKSPACE_LIMIT_CONTRACT.md`.
- Payment extension should not create different case capabilities.
- Receipt / Verification gating must remain backend-owned and standard-based.
- Future UI copy should avoid saying "limited" for trial functionality except for time duration.
