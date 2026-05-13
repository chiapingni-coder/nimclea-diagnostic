# Nimclea Release Gate Alignment v0.1

Status date: 2026-05-12

Source snapshot: `docs/NIMCLEA_PROGRESS_AND_RISK_MAP_V0_1.md`

Scope: documentation-only release gate alignment. This document maps the current progress and risk snapshot into checks that already exist or still need to be created before launch readiness signoff.

## 1. Release Gate Purpose

The release gate exists to turn the current Nimclea progress/risk state into a concrete checklist. It does not redefine product behavior, routing, payment truth, scoring, or UI logic. It aligns each known risk area to:

1. existing documentation or manual checks that already reduce the risk;
2. missing checks that still need to be added or completed;
3. the recommended 14-C, 14-D, and 14-E sequence needed to move from near-stable main flow to launch-ready release evidence.

Per `docs/NIMCLEA_PROGRESS_AND_RISK_MAP_V0_1.md`, the main user flow is near 90%+ stable, while overall launch readiness is closer to 78%-83%. The gate should therefore protect both the happy path and the remaining cross-cutting risks.

## 2. Current Gate Status

| Gate area | Current status | Launch implication |
| --- | --- | --- |
| Main user flow | Mostly covered by existing trial, lifecycle, regression, and release procedure docs. | Can be treated as near-stable but still needs final launch pass evidence. |
| Regression evidence | Partially covered by golden cases, final regression gate, and smoke check docs. | Needs broader golden coverage before the gate is considered complete. |
| Backend aggregation | Identified as a high-risk area, with regression triggers documented. | Needs 14-C extraction/alignment before launch signoff. |
| Receipt readiness | Documented and partially guarded by lifecycle and receipt readiness checks. | Needs explicit hydration/flash and event capture validation in the final gate. |
| Verification unlock | Contractually documented as backend/payment-owned. | Needs final validation across paid, unpaid, activated, and issued case states. |
| Payment and Stripe | Dry-run and audit documentation exist, but real Stripe smoke is not complete. | Cannot be treated as launch-complete until real payment smoke evidence exists. |
| Routing for new/returning users | Trial and workspace docs cover the main path. | Needs explicit final gate coverage for resume, new trial, stale local state, and case detail routing. |
| Documentation linkage | Release notes, manual procedure, checklist, and index docs exist. | Needs final operator-facing checklist that links only the required launch evidence. |

## 3. Risk-to-Check Mapping

| Major risk area | Risk from source snapshot | Existing checks already covering the risk | Missing checks still needed | Gate status |
| --- | --- | --- | --- | --- |
| Main case lifecycle | Legacy case technical debt; detail routing regression; UI regression risk. | `NIMCLEA_CASE_LIFECYCLE_REGRESSION_GATE_V1.md`, `REGRESSION_SMOKE_CHECKLIST_8A.md`, `CASE_LIFECYCLE_AND_WORKSPACE_LIMIT_CONTRACT.md`, `CASE_LIFECYCLE_TABS_UI_SMOKE_CHECKPOINT.md`. | Add final pass/fail evidence for old diagnostic shells, receipt-ready cases, verification-stage cases, deleted/discarded cases, and detail routing from `/cases`. | Partial |
| Golden case readiness checks | Insufficient golden regression coverage. | `NIMCLEA_GOLDEN_TEST_CASES_V0_1.md`, `NIMCLEA_GOLDEN_TEST_EXECUTION_PLAN_V0_1.md`, `NIMCLEA_GOLDEN_TEST_SMOKE_CHECK_V0_1.md`, `NIMCLEA_FINAL_REGRESSION_GATE_V0_1.md`. | Expand golden cases for legacy compatibility fields, payment variants, backend aggregation overlays, title/name conflicts, and hydration timing. | Partial |
| Backend `/cases` aggregation | Backend `/cases` aggregation complexity. | `DATA_CONTRACT_v1.md`, `DATA_CONSISTENCY_CONTRACT_v1.md`, `CASES_PAGE_DATA_CONTRACT_AUDIT_v1.md`, `STEP_5_20_CASES_EMAIL_EVENT_MERGE_TEST.md`, regression triggers in `NIMCLEA_CASE_LIFECYCLE_REGRESSION_GATE_V1.md`. | Complete 14-C extraction/alignment for aggregation rules, duplicate selection, event merge, receipt overlay, payment overlay, and title/name preservation. | Needs 14-C |
| Receipt readiness and event capture | Receipt readiness hydration/flash risk; UI regression risk. | `RECEIPT_PAGE_DATA_CONTRACT_AUDIT_v1.md`, `SCORING_SAMPLE_CASE_MATRIX_10D3.md`, `STEP_5_21_RECEIPT_STATUS_PERSISTENCE_TEST.md`, `TRIAL_7_DAY_FINAL_SMOKE_CHECKLIST_10C.md`. | Add explicit final gate checks for backend case hydration, local fallback behavior, event capture persistence, no ready-case downgrade, and no false not-ready flash. | Partial |
| Verification unlock gating | Payment state fragmentation; UI regression risk around verification buttons and labels. | `VERIFICATION_ACCESS_CONTRACT_v1.md`, `VERIFICATION_PAGE_DATA_CONTRACT_AUDIT_v1.md`, `RECEIPT_PAGE_DATA_CONTRACT_AUDIT_v1.md`, `CUSTOMER_CASE_BOUNDARY_CONTRACT_5_6_B4.md`. | Validate unpaid, receipt-paid, verification-paid, activated, issued, and stale route-state cases against backend/payment-owned unlock rules. | Partial |
| Payment ledger and Stripe smoke readiness | Payment state fragmentation; real Stripe payment smoke not yet completed. | `PAYMENT_LEDGER_SMOKE_AUDIT_3_D4.md`, `PAYMENT_SUBSCRIPTION_PERSISTENCE_AUDIT_5_6_A.md`, `PAYMENT_CUSTOMER_CASE_BOUNDARY_AUDIT_5_6_C.md`, `FULL_PAYMENT_SMOKE_TEST_5_6_D.md`, `FULL_PAYMENT_SMOKE_TEST_5_6_D0_DRY_RUN.md`, `STRIPE_WEBHOOK_CONFIG_CHECK_3_D5.md`. | Complete payment truth mapping, then run controlled real Stripe smoke covering checkout, confirmation, webhook, ledger record, and case/subscription display state. | High-risk gap |
| New user vs returning user routing | Legacy case technical debt; stale local data; routing regression. | `TRIAL_7_DAY_FINAL_SMOKE_CHECKLIST_10C.md`, `TRIAL_WORKSPACE_ACCESS_CONTRACT.md`, `CASE_LIFECYCLE_AND_WORKSPACE_LIMIT_CONTRACT.md`, `NIMCLEA_DEVELOPMENT_RELEASE_CHECKLIST_V0_1.md`. | Add final release gate rows for first-time trial, returning user resume, expired/used trial, workspace limit, and stale local case registry behavior. | Partial |
| Case naming and stale local data risk | Case name source conflict; legacy case technical debt; documentation sprawl around ownership. | `DATA_CONTRACT_v1.md`, `DATA_CONSISTENCY_CONTRACT_v1.md`, `NIMCLEA_CASE_LIFECYCLE_REGRESSION_GATE_V1.md`, `NIMCLEA_GOLDEN_TEST_CASES_V0_1.md`. | Define final pass/fail cases for backend title priority, untitled receipt-ready cases, renamed cases, route-state names, receipt snapshot names, and local registry stale names. | Missing |
| Release notes / checklist / daily checklist linkage | Documentation sprawl. | `NIMCLEA_RELEASE_NOTES_INDEX_V0_1.md`, `NIMCLEA_RELEASE_NOTES_TEMPLATE_V0_1.md`, `NIMCLEA_RELEASE_NOTES_GOLDEN_GATE_PROCEDURE_HARDENING_V0_1.md`, `NIMCLEA_MANUAL_RELEASE_PROCEDURE_V0_1.md`, `NIMCLEA_DEVELOPMENT_RELEASE_CHECKLIST_V0_1.md`. | Create one final launch readiness checklist that links source docs, required evidence, owners, dates, and pass/fail results without requiring operators to inspect every checkpoint doc. | Needs 14-E |

## 4. Existing Checks Already Covering Risk

The current release gate can already reference these documents as partial coverage:

| Existing check document | Primary coverage |
| --- | --- |
| `NIMCLEA_PROGRESS_AND_RISK_MAP_V0_1.md` | Source progress/risk snapshot for this gate alignment. |
| `NIMCLEA_CASE_LIFECYCLE_REGRESSION_GATE_V1.md` | Main lifecycle, receipt-ready regression, detail routing, and known lifecycle gates. |
| `NIMCLEA_GOLDEN_TEST_CASES_V0_1.md` | Current golden case set and expected case behavior. |
| `NIMCLEA_GOLDEN_TEST_EXECUTION_PLAN_V0_1.md` | How to execute golden case validation. |
| `NIMCLEA_GOLDEN_TEST_SMOKE_CHECK_V0_1.md` | Smoke-level golden case evidence. |
| `NIMCLEA_FINAL_REGRESSION_GATE_V0_1.md` | Final regression gate structure. |
| `TRIAL_7_DAY_FINAL_SMOKE_CHECKLIST_10C.md` | 7-day trial happy path and trial smoke coverage. |
| `RECEIPT_PAGE_DATA_CONTRACT_AUDIT_v1.md` | Receipt readiness, hydration, ledger, and verification handoff risks. |
| `VERIFICATION_ACCESS_CONTRACT_v1.md` | Verification access ownership and unlock boundary. |
| `VERIFICATION_PAGE_DATA_CONTRACT_AUDIT_v1.md` | Verification page data contract and gating behavior. |
| `PAYMENT_LEDGER_SMOKE_AUDIT_3_D4.md` | Payment ledger smoke audit coverage. |
| `FULL_PAYMENT_SMOKE_TEST_5_6_D0_DRY_RUN.md` | Dry-run payment smoke baseline. |
| `NIMCLEA_RELEASE_NOTES_INDEX_V0_1.md` | Release notes entry point. |
| `NIMCLEA_MANUAL_RELEASE_PROCEDURE_V0_1.md` | Manual release procedure. |
| `NIMCLEA_DEVELOPMENT_RELEASE_CHECKLIST_V0_1.md` | Development release checklist. |

## 5. Missing Checks Still Needed

The gate is not launch-complete until these checks have explicit pass/fail evidence:

1. Backend `/cases` aggregation rule check
   - Confirms event merge, receipt overlay, payment overlay, duplicate handling, lifecycle priority, and case naming priority.
2. Expanded golden regression check
   - Covers legacy cases, current happy-path cases, stale local data, payment variants, receipt readiness, and verification gating.
3. Real Stripe smoke check
   - Confirms checkout success, backend confirmation, webhook handling, ledger entry, case display state, and subscription/case boundary behavior.
4. New vs returning user routing check
   - Confirms first-time trial, returning user resume, existing workspace, and detail routing from `/cases`.
5. Case naming and stale local data check
   - Confirms backend case name/title wins over stale route/local/receipt snapshot names where required.
6. Receipt hydration and no-flash check
   - Confirms ready cases do not display false locked/not-ready states while backend case and receipt record hydration complete.
7. Verification unlock matrix check
   - Confirms verification cannot unlock from local, route, or subscription-only state and does unlock when backend/payment-owned state permits it.
8. Final operator checklist
   - Links only the required launch evidence and makes daily release readiness review practical.

## 6. Recommended 14-C / 14-D / 14-E Sequence

1. 14-C Backend Aggregation Extraction
   - Convert the high-risk `/cases` aggregation surface into a documented or extracted set of rules that can be checked independently.
   - Output should clarify lifecycle priority, event merge behavior, receipt overlay behavior, payment overlay behavior, duplicate record selection, and case naming priority.

2. 14-D Golden Case Regression Expansion
   - Expand golden cases to cover the missing launch-risk matrix.
   - Output should include legacy cases, stale local data, payment fragmentation states, backend aggregation overlays, receipt hydration, verification unlock, and routing cases.

3. 14-E Launch Readiness Checklist
   - Convert this alignment map into the final operator-facing checklist.
   - Output should include required docs, required checks, pass/fail fields, evidence links, real Stripe smoke status, release notes linkage, and daily checklist linkage.

## 7. No Code Changed

This 14-B checkpoint is documentation only.

No frontend code changed.
No backend code changed.
No routes changed.
No scoring changed.
No payment behavior changed.
No UI behavior changed.
No tests or scripts changed.

