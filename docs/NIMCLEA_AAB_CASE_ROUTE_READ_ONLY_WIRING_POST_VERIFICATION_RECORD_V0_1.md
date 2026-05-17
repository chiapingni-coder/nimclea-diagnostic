# Nimclea AAB GET /case/:caseId Read-Only Wiring Post-Verification Record v0.1

## Boundary Statement

AAB read-only route wiring was implemented for `GET /case/:caseId`.

Commit verified: `13424c0 Wire AAB case route read-only adapter rehearsal`

This wiring does not migrate Render JSON data into Supabase.

Render JSON remains legacy behavior reference only.

No frontend files were modified.

No Supabase migrations were created.

No Supabase writes were introduced.

No JSON writes were introduced.

No payment/PDF/verification unlock behavior was changed.

External API response shape was not changed.

## Wiring Locations

- Import added at `backend/routes/caseRoutes.js:15`
- Read-only rehearsal block added inside `router.get("/:caseId")` at `backend/routes/caseRoutes.js:1021`

## Guard Evidence

`node scripts/check-aab-case-route-read-only-wiring-boundary.mjs`

Result: Passed, Mode B controlled read-only wiring detected.

`node scripts/check-aab-case-route-read-only-wiring-preflight.mjs`

Result: Passed, Mode B controlled read-only wiring detected.

`node scripts/check-release-gate.mjs`

Result: WARN

Summary: PASS 73 / WARN 5 / FAIL 0

Warnings: existing manual-only release areas.

## Acceptance Checklist

- controlled read-only wiring detected
- response shape unchanged
- no data migration
- no write path introduced
- no frontend authority introduced
- no `service_role` exposure
- release gate requires this record

## Stop Line

If future changes add Render JSON import, Supabase production writes, JSON writes, frontend service role access, or localStorage authority for payment/PDF/verification, AAB route wiring must stop and be reverted or re-reviewed.
