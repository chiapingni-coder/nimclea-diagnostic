# Nimclea 21-B Schema-First Guided Pilot Launch Master Plan v0.1

## Purpose

This document defines the schema-first launch plan for Nimclea Guided Pilot Early Access. It synthesizes the event review recovery plan, current system stage review, v0.5 completion review, and maturity-based stage plan into one launch sequence.

This is a planning document only. It does not modify frontend, backend, scripts, routes, payment, scoring, data files, or release gate behavior.

## Planning Inputs

### 1. 004 Event Review Recovery Plan

The interrupted v5 Schema / Event-Driven path should be restored safely through minimal `caseSchema`, `schemaMapper`, `eventReviewEngine`, `eventHistory`, and guarded recovery. Recovery means reattaching the schema/event foundation without destabilizing the current Result -> Pilot -> PilotResult -> Receipt -> Verification flow.

### 2. Current System Stage Review

Nimclea is at Stage 3.05: guided pilot stable period, before full audit-grade delivery. The product can support guided pilot usage, but it is not yet a complete audit-grade verification product.

### 3. v0.5 Completion Review

The frontend loop is mostly complete. The main user path is visible and usable, but the v5 Schema and Event Review foundation are not fully landed.

### 4. 009 Maturity-Based Stage Plan

The next maturity sequence should prioritize object unification and status contract first, then readiness/receipt/payment lock, then process understanding, then customer-level routing and memory.

## Central Conclusion

- Schema is urgent as a product contract.
- Guided Pilot Early Access can move toward launch.
- Event Review skeleton should be safely reattached before or during launch closeout.
- Full schema migration and full Event Review wiring are deferred to 22-A.
- This is not a full audit-grade verification product launch.

## Optimized Sequence

- 21-B: Schema-First Guided Pilot Launch Master Plan.
- 21-B1: Minimal Schema Spine Contract.
- 21-B2: Event Review Recovery Skeleton Guard.
- 21-C: Status Contract Closeout.
- 21-D: Readiness Reason + Repair Action Contract.
- 21-E: Guided Pilot Delivery Layer Closeout.
- 21-F: Payment / Receipt Controlled Final Smoke.
- 21-G: Early Access Launch Gate.
- 22-A: Schema + Event Review Mainline Migration.

## Minimal Schema Spine

The launch path should stabilize a minimal schema spine before expanding product surfaces. The spine should describe the case and its lifecycle without forcing full migration.

| Field | Purpose |
| --- | --- |
| `caseId` | Stable case identity across Result, Pilot, Receipt, and Verification. |
| `customerId` / `email` | Customer or workspace identity for routing and ownership. |
| `caseName` | Stable human-readable case label. |
| `stage` | Coarse lifecycle stage. |
| `status` | Current case status within the stage. |
| `diagnosticResult` | Diagnostic baseline and result context. |
| `pilotPlan` | Guided pilot or case plan state. |
| `eventHistory` | Captured events and lifecycle event trail. |
| `reviewResults` | Future event review outputs, initially optional. |
| `readiness` | Readiness state and explanatory status. |
| `receiptStatus` | Receipt readiness, issued, paid, or locked status. |
| `verificationStatus` | Verification eligibility and outcome status. |
| `paymentStatus` | Checkout, paid, canceled, failed, or unverified payment state. |
| `ledger` | Hash, receipt, and proof ledger references where available. |
| `createdAt` | Case creation timestamp. |
| `updatedAt` | Latest meaningful update timestamp. |
| `sourceOfTruth` | Indicates whether current state is backend-owned, route-derived, local fallback, or mixed. |

## Emergence Standard

### Schema Spine Emergence

The product should expose and preserve one coherent case object shape before deeper feature expansion.

### Case Spine Emergence

`caseId`, customer identity, case name, stage, and status should remain stable across every major page.

### Stage Awareness Emergence

Pages should understand whether the user is in diagnostic, pilot, receipt, verification, payment, or post-payment state.

### Guided Action Emergence

Primary actions should reflect the next valid lifecycle step, not a generic or stale CTA.

### Readiness Explanation Emergence

Readiness should include a reason and a repair action where possible, without changing receipt readiness rules prematurely.

### Gate Discipline Emergence

Receipt, verification, payment, and schema/event review gates should remain guarded and independently smoke-tested.

### Launch Discipline Emergence

Early Access launch should be scoped to guided pilot delivery and must not claim full audit-grade verification maturity.

## Immediate Launch Scope

- Guided Pilot Early Access.
- Schema spine contract planning.
- Minimal status contract closeout.
- Readiness reason and repair-action visibility.
- Controlled payment/receipt smoke.
- Event Review skeleton guard, not full Event Review product behavior.

## Out of Scope for Immediate Launch

- Full schema migration.
- Full Event Review wiring.
- AI-ready mapping.
- Full Evidence Pack.
- Audit-ready Export.
- Subscription redesign.
- CasesPage UI expansion.
- ReceiptPage rewrite.
- Verification rewrite.
- Customer memory.
- RUN / PATTERN gating.

## Launch Risk Posture

The highest near-term risk is not that Nimclea lacks every future schema field. The risk is launching without a clear product contract for case identity, status, readiness, receipt, verification, and payment state.

21-B therefore prioritizes a minimal schema spine and status contract before deeper Event Review or audit-grade export work.

## Acceptance Criteria

- The 21-B master plan exists.
- The optimized sequence is documented.
- The minimal schema spine is named.
- The emergence standard is defined.
- Immediate launch scope and out-of-scope items are explicit.
- Full schema migration and full Event Review wiring are deferred to 22-A.
- No runtime files are modified by this planning step.
