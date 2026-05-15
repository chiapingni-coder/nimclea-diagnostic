# Nimclea 18-D3 Manual WARN Disposition Record v0.1

## Purpose

The automated release gate currently reports:

```text
PASS 25 / WARN 5 / FAIL 0
```

WARN means manual-only release areas requiring recorded human review, not automatic failure.

## Source gate output

- receipt readiness UI smoke
- verification unlock UI smoke
- payment ledger / Stripe dry-run smoke
- new vs returning user routing smoke
- stale local case naming smoke

## Manual WARN disposition table

| WARN item | Existing reference docs | Manual disposition | Release risk | Stop line |
| --- | --- | --- | --- | --- |
| receipt readiness UI smoke | docs/NIMCLEA_RECEIPT_READINESS_UI_SMOKE_15A_V0_1.md<br>docs/NIMCLEA_RECEIPT_READINESS_UI_SMOKE_15_A1_V0_1.md<br>docs/NIMCLEA_RECEIPT_READINESS_TRANSITION_CONTRACT_V0_1.md | MANUAL ACCEPTED WITH STOP LINE | Receipt readiness can damage trust if pending hydration renders an incorrect readiness decision. | STOP if Receipt flashes yellow, amber, insufficient, or misleading gray before confirmed ready. |
| verification unlock UI smoke | docs/VERIFICATION_ACCESS_CONTRACT_v1.md<br>docs/VERIFICATION_PAGE_DATA_CONTRACT_AUDIT_v1.md | MANUAL ACCEPTED WITH STOP LINE | Verification access can become misleading if unlock state is detached from receipt authority. | STOP if Verification opens without receipt authority or remains locked after confirmed eligibility. |
| payment ledger / Stripe dry-run smoke | docs/FULL_PAYMENT_SMOKE_TEST_5_6_D.md<br>docs/FULL_PAYMENT_SMOKE_TEST_5_6_D0_DRY_RUN.md<br>docs/PAYMENT_LEDGER_SMOKE_AUDIT_3_D4.md<br>docs/PAYMENT_CUSTOMER_CASE_BOUNDARY_AUDIT_5_6_C.md<br>docs/PAYMENT_SUBSCRIPTION_PERSISTENCE_AUDIT_5_6_A.md | MANUAL ACCEPTED WITH STOP LINE | Payment and ledger state can create cross-case trust failures if ownership or paid state is unstable. | STOP if paid, checkout, receipt-issued, or verification state crosses cases, disappears, or unlocks unrelated records. |
| new vs returning user routing smoke | docs/NIMCLEA_17G5J_RELEASE_STABILITY_MANUAL_SMOKE_RECORD_V0_1.md<br>docs/NIMCLEA_BROADER_RELEASE_SMOKE_CHECKLIST_V0_1.md<br>docs/NIMCLEA_MANUAL_RELEASE_PROCEDURE_V0_1.md | MANUAL ACCEPTED WITH STOP LINE | Entry routing can break trust if new and returning users see contradictory onboarding or workspace states. | STOP if a known returning user is sent to Diagnostic before case lookup settles, or a new user is sent to workspace incorrectly. |
| stale local case naming smoke | docs/NIMCLEA_17G5J_RELEASE_STABILITY_MANUAL_SMOKE_RECORD_V0_1.md<br>docs/NIMCLEA_ACCEPTANCE_CHECKLIST_V0_1.md | MANUAL ACCEPTED WITH STOP LINE | Stale naming can make the active case, payment target, receipt, verification, or export ambiguous. | STOP if stale local naming creates ambiguity about which case is active, payable, receipted, verified, or exported. |

## Final release interpretation

The manual WARN items are not ignored.
They are accepted only as manual-only release areas with explicit stop lines.
Any reproduced stop-line violation converts the release posture from WARN to HOLD or STOP.
This record does not override automated release gate scripts.
This record does not loosen 12-A2 boundary contracts or 18-D2 readiness note.
