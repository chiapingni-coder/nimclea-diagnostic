# Nimclea 004 Clean Database Event Review Embed Plan v0.1

## Why this document exists

This document combines the 004 Event Review Recovery Plan with the Clean Database Authority Reset plan.

The goal is to define how Nimclea should move from current test JSON and Render-held runtime data toward a clean database authority, while embedding the 004 Event Review structure into the future case schema. This is a planning document only. It does not change production behavior.

## Current system authority state

Nimclea currently has multiple state sources across frontend localStorage, backend JSON files, Render runtime filesystem writes, Supabase-backed trial lifecycle records, and payment/receipt/verification records.

Some records in backend JSON and Render-held data were created during test, recovery, and launch-readiness work. These records are useful for debugging and smoke testing, but they should not be treated as the permanent production authority for the next clean database phase.

Payment, receipt, verification, and trial lifecycle authority boundaries must remain explicit during the transition. No authority source should be silently mixed into another source without a defined contract.

## Clean database reset principle

The future clean database should become the source of truth for customer, case, diagnostic, pilot, event review, receipt, verification, payment, trial lifecycle, and audit trail records.

The reset principle is:

- Treat current Render JSON data as test/dev data only.
- Do not migrate old test data into the future clean authority database.
- Define Supabase or another clean database as the future source of truth.
- Keep current production behavior unchanged until a controlled cutover.
- Prepare schema-first design before code changes.
- Do not repair data authority by copying all old runtime files into the new authority store.

## What old Render/test data means

Old Render and JSON records are evidence of product behavior during development, not canonical customer history for the clean database.

They may be used for:

- Debugging current issues.
- Designing schema fields.
- Writing migration tests.
- Building sample fixtures.
- Confirming edge cases.

They should not be used for:

- Bulk import into the future production authority database.
- Customer-facing historical claims.
- Receipt, verification, payment, or trial lifecycle authority after cutover.
- Schema decisions that preserve accidental test-data shape instead of intentional product contracts.

## 004 Event Review Recovery Plan Summary

004 Event Review should be embedded as a structured case-level review layer. It should help recover, explain, and defend how a case moved from diagnostic input into pilot events, receipt readiness, and verification review.

Event Review is not a separate product flow. It is a recovery, review, and defensibility layer inside the case record.

Its purpose is to answer:

- What event or decision pressure was reviewed?
- What structural signals were captured?
- What review result was produced?
- What weaknesses or boundaries were identified?
- What evidence supports the result?
- What changed after the review?
- How does the review connect to receipt and verification readiness?

## How Event Review Should Embed Into Case Schema

Event Review should live inside the case schema as structured data, not as free-floating UI state.

The case should be able to contain one or more event review records. Each review should preserve:

- The reviewed event input.
- The event type.
- External pressure.
- Boundary or authority signal.
- Evidence state.
- Weakest dimension.
- Review result.
- Case schema snapshot at the time of review.
- Receipt readiness impact.
- Verification relevance.
- Audit metadata.

The review layer should support recovery when a case has incomplete route state, local-only state, or missing display context. It should not override payment, receipt, verification, or trial lifecycle authority.

## Proposed Future Schema Areas

### customer

- customerId
- organizationName
- contactEmail
- contactName
- workspaceId
- createdAt
- updatedAt

### case

- caseId
- customerId
- caseName
- status
- stage
- currentStep
- createdAt
- updatedAt
- deletedAt
- source
- schemaVersion

### diagnostic

- diagnosticId
- caseId
- answers
- primaryPressure
- dominantScenario
- scoreSummary
- resultSummary
- createdAt

### pilot / case plan

- pilotPlanId
- caseId
- planStatus
- startedAt
- completedAt
- scopeLock
- acceptanceChecklist
- nextAction

### eventReview

- eventReviewId
- caseId
- eventId
- eventType
- externalPressure
- boundaryState
- evidenceState
- weakestDimension
- reviewResult
- caseSchemaSnapshot
- receiptReadinessImpact
- verificationRelevance
- reviewedAt
- reviewedBy

### receipt

- receiptId
- caseId
- receiptStatus
- receiptEligible
- readinessState
- issuedAt
- receiptHash
- ledgerReference
- pdfGeneratedAt

### verification

- verificationId
- caseId
- verificationStatus
- verificationEligible
- verificationHash
- ledgerReference
- issuedAt
- reviewedAt

### payment

- paymentId
- caseId
- customerId
- paymentType
- paymentStatus
- stripeSessionId
- stripeCustomerId
- paidAt
- authoritySource

### trialLifecycle

- trialId
- customerId
- userId
- email
- status
- startedAt
- expiresAt
- trialSessionId
- authoritySource

### auditTrail

- auditId
- entityType
- entityId
- action
- actor
- source
- previousValue
- nextValue
- createdAt

## Do-Now Checklist

- Treat current Render JSON data as test/dev data only.
- Do not migrate old test data into the future clean authority database.
- Define Supabase or a clean database as the future source of truth.
- Keep current production behavior unchanged until a controlled cutover.
- Prepare schema-first design before code changes.
- Embed 004 Event Review as a structured case-level review layer.
- Define `eventReview` as a recovery, review, and defensibility layer, not a separate product flow.
- Make `caseSchema.js` the first implementation target after this document.
- Keep payment, receipt, verification, and trial authority boundaries explicit.

## Later-Integration Checklist

- Create actual database tables.
- Migrate selected authority paths to the database.
- Rewire backend endpoints to the clean authority source.
- Link Stripe payment authority to case and customer records.
- Add AI scan or LLM interpretation only after deterministic schema authority exists.
- Import historical data only if explicitly required and reviewed.
- Add Event Review UI changes after schema and backend contracts are stable.
- Redesign Receipt PDF only after receipt authority is stable.
- Upgrade verification certificate output only after verification authority is stable.

## First Code Target After This Document: caseSchema.js

The first implementation target should be `caseSchema.js`.

That work should define the durable case shape before endpoint rewiring or UI changes. The initial schema pass should include:

- A stable top-level case identity.
- Diagnostic result fields.
- Pilot / case plan fields.
- An embedded `eventReview` section or array.
- Receipt readiness fields.
- Verification boundary fields.
- Payment authority references.
- Trial lifecycle references.
- Audit metadata.

No production behavior should change until the schema contract is reviewed and a cutover plan exists.

## Explicit Non-Goals

- Actual database table creation or migration.
- Backend endpoint rewiring.
- Stripe payment authority linkage.
- AI scan or LLM interpretation layer.
- Historical data import unless explicitly needed.
- Event Review UI changes.
- Receipt PDF redesign.
- Verification certificate upgrades.
- Changes to current production behavior.
- Changes to current payment, receipt, verification, or trial authority logic.

## Acceptance Criteria

- The plan clearly separates do-now planning from later integration work.
- Current Render JSON data is explicitly treated as test/dev data.
- Old test data is not proposed for migration into the clean authority database.
- The future database authority principle is clear.
- 004 Event Review is defined as an embedded case-level review layer.
- `eventReview` is not described as a separate product flow.
- `caseSchema.js` is identified as the first code target after this document.
- Payment, receipt, verification, and trial lifecycle authority boundaries remain explicit.
- The document does not require or imply immediate production behavior changes.
