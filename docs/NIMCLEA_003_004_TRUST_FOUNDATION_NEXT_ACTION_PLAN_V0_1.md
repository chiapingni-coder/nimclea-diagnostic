# Nimclea 003 / 004 Trust Foundation Next Action Plan v0.1

## 1. Title and Version

Document: Nimclea 003 / 004 Trust Foundation Next Action Plan

Version: v0.1

Status: Documentation-only alignment record. This document does not authorize SQL execution, Supabase connection, database table creation, backend endpoint changes, frontend behavior changes, production cutover, customer outreach, payment integration, PDF integration, or commit activity.

## 2. Why This Document Exists

This document aligns the current implementation direction implied by two priority planning documents:

- `AAA 需要和Schema一起做的.docx`
- `003 AAA信任底盘.docx`

The purpose is to define the next controlled trust-foundation implementation direction after the Supabase clean authority preparation line, while keeping production behavior protected.

The next implementation target after this document should be `schemaMapper.js` / `eventReviewEngine.js` passive skeleton verification, not SQL execution and not UI rewiring.

## 3. What the Two Priority Docs Agree On

The two priority tracks agree that trust foundation work should be built around a durable case schema and structured review layer before customer-facing rewiring.

Shared direction:

- Result and Pilot inputs need a controlled mapping path into `caseSchema`.
- Event review needs a minimal structured object that can later support history, review status, and receipt / verification trust evidence.
- Event history and event review should eventually bind to `caseId`.
- Pilot results should eventually prefer durable `eventHistory` / `reviewResult` data over transient route state or `localStorage`.
- Receipt and Verification should eventually consume `schemaSnapshot`, without changing their current three-state behavior yet.
- Database execution and UI rewiring should remain separate later steps.

## 4. Current Completed State

- Clean Database Authority Reset planning is complete.
- Supabase clean authority schema planning is protected.
- Supabase clean authority SQL draft is protected.
- Supabase clean authority migration draft is protected.
- Supabase clean authority review records are protected.
- Supabase clean authority guards are protected, including the release gate guard for the migration draft.
- `caseSchema.js` has passive schema placeholders.
- SQL has not been executed.
- Supabase has not been connected.
- Tables have not been created.
- Backend has not been rewired.
- Old Render JSON data remains test/dev data and has not been migrated.

## 5. Remaining Trust-Foundation Gaps

- `schemaMapper.js` must become the mapping bridge from Result / Pilot inputs into `caseSchema`.
- `eventReviewEngine.js` must produce a minimal structured `eventReview` object.
- `eventHistory` / `eventReview` must eventually bind to `caseId`.
- `PilotResult` should eventually prefer `eventHistory` / `reviewResult` over route state / `localStorage`.
- Receipt / Verification should eventually consume `schemaSnapshot`, without changing their current three-state behavior yet.
- Guard coverage should protect these boundaries before behavior rewiring begins.

## 6. Next Safest Implementation Target

Do next:

- Create this documentation alignment record.
- Inspect existing `frontend/utils/schemaMapper.js`.
- Inspect existing `frontend/utils/eventReviewEngine.js`.
- Add or strengthen passive skeletons only.
- Add or strengthen guard coverage for passive schema mapping and event review structure.
- Preserve existing UI, routing, payment, Receipt, and Verification behavior.

Do later:

- New database execution.
- Backend write-path rewiring.
- `PilotResult` eventHistory-first read.
- Receipt / Verification `schemaSnapshot`-first read.
- Real customer outreach.
- PDF/payment download integration.

## 7. Explicit Non-Goals

This document does not authorize:

- SQL execution.
- Supabase connection.
- Database table creation.
- Supabase production execution.
- Backend endpoint rewiring.
- Frontend routing changes.
- Payment behavior changes.
- Receipt behavior changes.
- Verification behavior changes.
- PilotResult read-path rewiring.
- Customer outreach.
- PDF or payment download integration.
- Migration of old Render JSON data.

## 8. Pre-Email Trust Gate Preview

Before real customer email outreach or any trust-facing external flow, the trust foundation should be able to show:

- Result / Pilot inputs can be mapped into a passive schema object.
- A minimal `eventReview` object can be produced deterministically.
- The event review shape is stable enough to bind to `caseId` later.
- Receipt and Verification can remain behaviorally unchanged while future `schemaSnapshot` consumption is prepared.
- Guards prevent accidental payment, receipt, verification, routing, or database rewiring during skeleton work.
- Supabase clean authority remains prepared but unexecuted.

## 9. Acceptance Criteria

- This document aligns the two current priority documents at the planning level.
- This document records the completed Supabase clean authority preparation state.
- This document states that SQL has not been executed.
- This document states that Supabase has not been connected.
- This document states that tables have not been created.
- This document states that backend has not been rewired.
- This document identifies `schemaMapper.js` as the Result / Pilot to `caseSchema` bridge target.
- This document identifies `eventReviewEngine.js` as the minimal structured `eventReview` target.
- This document separates do-next passive skeleton and guard work from later database, backend, UI, customer, PDF, and payment work.
- This document recommends passive skeleton verification, not SQL execution and not UI rewiring, as the next implementation target.

## 10. Recommended Next Step After This Document

Inspect `frontend/utils/schemaMapper.js` and `frontend/utils/eventReviewEngine.js`, then perform a passive skeleton verification pass. Any changes should stay limited to mapping / review skeleton structure and guard coverage, with no SQL execution, no Supabase connection, no backend rewiring, and no UI routing changes.
