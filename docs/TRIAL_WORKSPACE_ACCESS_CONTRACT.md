# Trial Workspace Access Contract

## Purpose

This contract defines the product boundary for Nimclea Free 7-Day Trial and Pilot Extension workspace access. It separates temporary workspace access from formal proof issuance, receipt activation, and formal verification.

## Free 7-Day Trial

Free 7-Day Trial is a 7-day workspace access right, not a reduced-function product tier.

Free 7-Day Trial includes:

- 3 active cases.
- Diagnostic access.
- Pilot / Case Plan access.
- Event Capture access.
- Receipt readiness preview.

Formal Receipt and Formal Verification are not included as free trial rights.

## Pilot Extension

Pilot Extension is a $9/month workspace access extension.

Pilot Extension extends the same workspace access model to 1 month and includes:

- 3 active cases.
- Diagnostic access.
- Pilot / Case Plan access.
- Event Capture access.
- Receipt readiness preview.

The only product difference between Free 7-Day Trial and Pilot Extension is the time window.

## Formal Path Boundary

When a case becomes eligible for Formal Receipt or Formal Verification, the system must guide the user into the formal path.

Eligibility, payment, issuance, and verification standards must not be lowered during Free 7-Day Trial or Pilot Extension.

This contract separates workspace access from formal proof issuance.

## Implementation Implications

- Trial access controls workspace time window.
- Case limit remains 3 for both Free 7-Day Trial and Pilot Extension.
- Payment extension should not create different case capabilities.
- Receipt / Verification gating must remain backend-owned and standard-based.
- Future UI copy should avoid saying "limited" for trial functionality except for time duration.
