# Nimclea AAB GET /case/:caseId Read-Only Wiring Design Record v0.1

## Boundary Statement

This document does not wire the adapter into `backend/routes/caseRoutes.js`.

This document does not migrate Render JSON data into Supabase.

Render JSON remains legacy behavior reference only.

Supabase clean authority rehearsal data must be isolated and controlled.

No frontend files are modified.

No runtime behavior is changed.

## Target Route

- Route: `GET /case/:caseId`
- File: `backend/routes/caseRoutes.js`
- First rehearsal mode: read-only
- First adapter candidate: `backend/utils/aabCaseAuthorityReadAdapterRehearsal.js`

## Design Intent

- preserve existing frontend API response shape
- keep backend-missing fail-closed behavior
- prefer Supabase clean authority when available in future
- allow legacy JSON only as reference/fallback behavior, not migration source
- avoid payment/PDF/verification writes in this step

## Non-Goals

- no payment confirmation wiring
- no PDF export unlock wiring
- no verification unlock wiring
- no frontend localStorage authority
- no production Supabase write
- no Render JSON import
- no schema migration

## Future Wiring Rule

- route import/use must be minimal and removable
- rollback must be possible by removing the adapter import/use only
- route response shape must remain compatible with current frontend expectations
- adapter must never expose `service_role` to frontend
- adapter must not perform writes during read-only rehearsal

## Acceptance Checklist

- target route identified
- adapter candidate identified
- response compatibility rule documented
- rollback rule documented
- non-goals documented
- no runtime behavior changed
- release gate requires this document
