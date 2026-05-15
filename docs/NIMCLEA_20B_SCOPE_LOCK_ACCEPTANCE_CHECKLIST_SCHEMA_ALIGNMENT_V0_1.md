# Nimclea 20-B Scope Lock / Acceptance Checklist Schema Alignment v0.1

## 1. Purpose

20-B is a planning-only alignment document. It connects the future Scope Lock and Acceptance Checklist layer to the v5 schema plan created in 20-A.

This document does not implement Scope Lock, does not implement Acceptance Checklist, and does not change current receipt readiness or verification gating.

## 2. Current Baseline

The current system has:

- Diagnostic / Result / Pilot / Receipt / Verification main flow mostly stable.
- CasesPage acting as the case cockpit.
- Receipt readiness and verification gating partially stabilized.
- Payment smoke partially confirmed only.
- v5 schema planning created in 20-A.
- Event review recovery not implemented yet.
- Structural `signalEngine` intentionally deferred.
- Scope Lock and Acceptance Checklist not yet implemented as formal schema fields.

## 3. Problem Being Solved

Nimclea currently can guide a case and evaluate readiness, but the system still needs a formal layer to define:

- What decision is being evaluated.
- What scope the case covers.
- What acceptance criteria must be met.
- What evidence is required.
- What is out of scope.
- When the record is ready to be packaged or exported.

## 4. Scope Lock Definition

Scope Lock is the future case-level record that freezes the evaluated decision boundary.

Candidate fields:

- `scopeLock.status`
- `scopeLock.lockedAt`
- `scopeLock.lockedBy`
- `scopeLock.decisionSubject`
- `scopeLock.decisionOwner`
- `scopeLock.scopeSummary`
- `scopeLock.inScopeItems`
- `scopeLock.outOfScopeItems`
- `scopeLock.assumptions`
- `scopeLock.constraints`
- `scopeLock.riskNotes`
- `scopeLock.sourceCaseId`
- `scopeLock.schemaVersion`

Suggested statuses:

- `not_started`
- `draft`
- `ready_for_lock`
- `locked`
- `needs_revision`
- `superseded`

## 5. Acceptance Checklist Definition

Acceptance Checklist is the future case-level checklist that determines whether the case has enough structure and evidence to move toward receipt, verification, or export.

Candidate fields:

- `acceptanceChecklist.status`
- `acceptanceChecklist.updatedAt`
- `acceptanceChecklist.items`
- `acceptanceChecklist.passCount`
- `acceptanceChecklist.failCount`
- `acceptanceChecklist.requiredItemCount`
- `acceptanceChecklist.optionalItemCount`
- `acceptanceChecklist.blockingFailures`
- `acceptanceChecklist.reviewNotes`
- `acceptanceChecklist.schemaVersion`

Candidate checklist item fields:

- `id`
- `label`
- `description`
- `required`
- `status`
- `evidenceRef`
- `failureReason`
- `repairAction`
- `reviewedAt`

Suggested item statuses:

- `not_checked`
- `passed`
- `weak`
- `failed`
- `not_applicable`
- `needs_recovery`

## 6. v5 Schema Alignment Table

| Mapping | Future v5 field | Purpose | Current status | Implementation risk |
| --- | --- | --- | --- | --- |
| `scopeLock.status` | `recoveryState` / `exportState` / `receiptReadiness` | Gate whether a case boundary is draft, locked, or needs revision before readiness/export decisions. | missing | Medium: must not disrupt current receipt readiness. |
| `scopeLock.decisionSubject` | `diagnosticBaseline` / `casePlan` | Preserve what decision is being evaluated across diagnostic and pilot planning. | partial | Medium: existing records may describe this inconsistently. |
| `scopeLock.decisionOwner` | customer identity / responsibility mapping | Identify who owns the decision and separate Nimclea responsibility from user-provided facts. | partial | Medium: owner identity may be missing in older cases. |
| `scopeLock.inScopeItems` | `evidenceItems` / `eventReview` | Connect included scope items to evidence and review status. | future | High: requires event review contract first. |
| `scopeLock.outOfScopeItems` | `auditTrail` / export notes | Preserve exclusions so exports do not imply unsupported coverage. | future | Medium: export copy must reflect exclusions clearly. |
| `acceptanceChecklist.items` | `eventReview` / `evidenceItems` | Link checklist items to reviewed evidence and event quality. | missing | High: depends on event review and evidence pack field map. |
| `acceptanceChecklist.blockingFailures` | `recoveryState` | Identify failures that require guided recovery before readiness/export. | missing | Medium: failure rules must avoid changing current readiness too early. |
| `acceptanceChecklist.repairAction` | event review recovery | Define guided repair action for weak or failed checklist items. | future | Medium: recovery must preserve original evidence trail. |
| `acceptanceChecklist.status` | `receiptReadiness` / `exportState` | Summarize whether checklist state supports receipt, verification, or export readiness. | missing | High: must not replace current readiness until migration is planned. |

## 7. Relationship to Receipt Readiness

Scope Lock and Acceptance Checklist should support receipt readiness in the future, but should not replace the current readiness logic yet.

Current receipt readiness should remain unchanged until:

- Schema contract is finalized.
- Event review contract exists.
- Evidence pack field map exists.
- Migration path is defined.
- Smoke tests are prepared.

## 8. Relationship to Verification

Verification should eventually read from locked scope and checklist results, but 20-B does not change verification gating.

Future Verification should be able to say:

- What decision was evaluated.
- What scope was locked.
- Which acceptance criteria passed.
- Which weaknesses remained.
- What evidence supports the determination.

## 9. Non-Goals

20-B does not:

- Change frontend UI.
- Change backend schema.
- Migrate existing cases.
- Change receipt readiness.
- Change verification gating.
- Change payment behavior.
- Add Scope Lock UI.
- Add Acceptance Checklist UI.
- Add AI classification.
- Modify `signalEngine`.
- Create export files.

## 10. Release Impact

- No release blocker.
- No production behavior change.
- Safe planning layer.
- Useful before implementing delivery-layer fields.
- Supports future audit-grade product packaging.

## 11. Recommended Next Steps

- 20-C: Minimal Event Review Contract.
- 20-D: Evidence Pack Field Map.
- 20-E: Responsibility Mapping Field Contract.
- Later: Scope Lock UI prototype only after schema contracts are stable.

## 12. Acceptance Criteria

- One documentation file created.
- No code changes.
- No route changes.
- No data migration.
- No payment changes.
- No receipt or verification behavior change.
- Clearly aligns Scope Lock and Acceptance Checklist to v5 schema planning.
- Clearly marks implementation as future work.
