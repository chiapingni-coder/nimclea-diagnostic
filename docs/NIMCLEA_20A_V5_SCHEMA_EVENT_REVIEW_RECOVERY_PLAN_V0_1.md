# Nimclea 20-A v5 Schema + Event Review Recovery Plan v0.1

## 1. Purpose

20-A is a planning-only recovery document. Its goal is to prepare the next schema and event review layer without disturbing the current guided pilot, receipt readiness, verification gating, or payment boundary.

This document does not implement schema changes. It defines a future planning boundary for v5 case data, event review, and guided event recovery.

## 2. Current System Baseline

The current system has:

- Stable case spine for guided pilot use.
- Diagnostic / Result / Pilot / Receipt / Verification main flow mostly working.
- CasesPage acting as the case cockpit.
- Receipt readiness and verification gating already partially stabilized.
- Payment smoke still only partially confirmed.
- Structural `signalEngine` not implemented and intentionally deferred.
- Event review / recovery not yet formalized.

## 3. Problem Being Solved

The current event layer is useful but not yet a formal review system. Events may exist as logs, captures, payment traces, email logs, receipt records, and case status updates, but there is not yet a unified review layer that can:

- Classify event quality.
- Explain weak events.
- Recover incomplete events.
- Preserve a review trail.
- Support audit-grade evidence export.

## 4. v5 Schema Planning Boundary

The future v5 schema should eventually support:

- Case identity.
- Customer identity.
- Diagnostic baseline.
- Pilot / case plan state.
- Event records.
- Event review status.
- Evidence items.
- Receipt readiness.
- Verification eligibility.
- Payment state.
- Review recovery state.
- Export readiness.
- Schema version.

This document does not implement the v5 schema.

## 5. Candidate v5 Case Fields

| Field | Purpose | Current status |
| --- | --- | --- |
| `schemaVersion` | Identify the case schema version and migration boundary. | future |
| `caseId` | Preserve stable case identity across lifecycle steps. | existing |
| `customerId` | Connect case records to a stable customer identity where available. | partial |
| `email` | Preserve user/customer routing and ownership context. | existing |
| `caseTitle` | Display stable human-readable case identity. | partial |
| `createdAt` | Record initial case creation time. | partial |
| `updatedAt` | Record latest meaningful case update time. | partial |
| `diagnosticBaseline` | Store the initial diagnostic result context. | partial |
| `casePlan` | Store guided pilot or case plan state. | partial |
| `eventRecords` | Store captured events and lifecycle evidence events. | partial |
| `eventReview` | Store review status, quality assessment, and repair recommendations. | missing |
| `evidenceItems` | Store normalized evidence items linked to events and case context. | future |
| `receiptReadiness` | Store receipt readiness state and readiness inputs. | partial |
| `verificationState` | Store verification eligibility and unlock authority. | partial |
| `paymentState` | Store payment, checkout, paid, and settlement state. | partial |
| `recoveryState` | Store guided event recovery progress and outcomes. | missing |
| `exportState` | Store export readiness and external-facing record status. | future |
| `auditTrail` | Preserve review, repair, readiness, payment, and export history. | future |

## 6. Event Review Layer

`eventReview` is a future layer that should assess:

- Event completeness.
- Evidence strength.
- Decision relevance.
- Timestamp reliability.
- Source reliability.
- Review status.
- Repair recommendation.

Future event review statuses:

- `not_reviewed`
- `review_pending`
- `review_passed`
- `review_weak`
- `review_failed`
- `recovery_needed`
- `recovery_completed`

## 7. Event Review Recovery Logic

Recovery should be a guided repair process, not an automatic rewrite. The system should preserve the original event and record any recovery action as an explicit review/recovery step.

Possible recovery actions:

- Request missing evidence.
- Clarify decision owner.
- Add timestamp.
- Attach supporting record.
- Confirm event source.
- Explain why event is relevant.
- Retry receipt readiness after recovery.

## 8. Non-Goals

20-A does not:

- Migrate data.
- Change production schema.
- Change receipt readiness.
- Change verification gating.
- Add `signalEngine` structural logic.
- Add AI classification.
- Change payment behavior.
- Modify CasesPage UI.
- Create export files.

## 9. Release Impact

- No release blocker.
- No production behavior change.
- Safe documentation-only planning layer.
- Useful before future schema migration or evidence pack work.

## 10. Recommended Next Steps

- 20-B: Scope Lock / Acceptance Checklist schema alignment.
- 20-C: Minimal Event Review Contract.
- 20-D: Evidence Pack field map.
- v5 implementation only after contracts are stable.

## 11. Acceptance Criteria

- Documentation-only.
- No code changes.
- No route changes.
- No data migration.
- Clearly separates current v4/live behavior from future v5 planning.
- Names event review recovery as future controlled layer.
