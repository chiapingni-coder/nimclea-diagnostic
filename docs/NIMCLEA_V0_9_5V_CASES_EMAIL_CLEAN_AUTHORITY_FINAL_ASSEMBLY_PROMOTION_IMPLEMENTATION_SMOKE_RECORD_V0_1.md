# v0.9-5V CASES EMAIL CLEAN AUTHORITY FINAL ASSEMBLY PROMOTION IMPLEMENTATION SMOKE RECORD

## Record ID

NIMCLEA_V0_9_5V_CASES_EMAIL_CLEAN_AUTHORITY_FINAL_ASSEMBLY_PROMOTION_IMPLEMENTATION_SMOKE_RECORD_V0_1

## Date

2026-05-18

## Purpose

This record documents the narrow runtime implementation for the public `/cases?email=` clean authority final assembly promotion selected in v0.9-5U.

Prior evidence:

- v0.9-5H protected authority probe PASS proved deployed clean authority access.
- v0.9-5O treated successful `getCaseRecordsByEmail(email)` helper rows as already email-scoped inside `loadSupabaseCaseSourcesForEmail(...)`.
- v0.9-5R confirmed deployed public `/cases?email=` raw response remained `[]`, while the protected authority probe still returned two expected fixture case IDs.
- v0.9-5T identified the final assembly drop point: `supabaseSources.cases` enters `cases` and `durableCandidates`, but candidate creation and durable promotion still required `emailFromPersistedCase(item) === email`.
- v0.9-5U selected the narrow implementation candidate: mark helper-scoped clean authority rows internally, allow only those rows to bypass direct row-level email matching in final assembly, preserve safety filters, and strip the marker before public response.

## Scope

- Area: Public `/cases?email=` clean authority final assembly promotion.
- Files inspected: backend/server.js, prior v0.9-5R evidence, prior v0.9-5T inspection, prior v0.9-5U candidate, and the v0.9-5V runtime diff.
  - `backend/server.js`
  - prior v0.9-5R evidence
  - prior v0.9-5T inspection
  - prior v0.9-5U candidate
- Files changed: backend/server.js and this v0.9-5V implementation smoke record.
  - `backend/server.js`
  - this v0.9-5V implementation smoke record
- Runtime behavior affected: public /cases?email final assembly can promote successful clean authority helper-scoped rows using a private marker while preserving deleted-case filtering and stripping the marker from public output.
  - public `/cases?email=` final assembly can now promote successful clean authority helper-scoped case rows even when those rows do not carry direct row-level email.
- Supabase Storage: not included.
- Payment / receipt / verification / frontend: not included.
- Schema change: none.
- RLS / permission change: none.
- Secret exposure: none.

## Decision / Change Summary

Runtime change implemented in `backend/server.js`:

1. Successful helper-scoped case rows are marked internally:

```javascript
_emailScopedByCleanAuthority: true
```

2. Public route final assembly now uses a narrow visibility predicate:

```javascript
const isEmailVisibleCase = (item = {}) =>
  emailFromPersistedCase(item) === email ||
  item?._emailScopedByCleanAuthority === true;
```

3. Candidate creation and durable promotion now use:

```javascript
if (!isEmailVisibleCase(item)) return;
```

instead of requiring direct row-level email matching in all cases.

4. The private marker is stripped from public response objects anywhere private internal fields are stripped:

```javascript
_emailScopedByCleanAuthority,
```

5. Deleted-case / tombstone filters remain unchanged.

6. Local JSON and broad fallback rows remain protected because only successful helper-scoped rows receive `_emailScopedByCleanAuthority`.

## Acceptance Criteria

This implementation is acceptable if:

- Runtime patch is limited to `backend/server.js`.
- Helper-scoped clean authority rows receive an internal marker.
- Final assembly visibility allows direct email match OR helper-scoped marker.
- Direct email matching remains effectively required for local JSON and broad fallback rows because they do not receive the helper-scoped marker.
- Deleted-case / tombstone filtering remains active.
- Receipt snapshot / protected overlay logic remains active.
- Private marker is stripped before public response.
- No schema / RLS / env / payment / receipt / verification / frontend / storage change is included.
- Node syntax check passes.
- Release gate passes with FAIL 0 before push.

Actual result before release gate:

- Runtime patch limited to `backend/server.js`: PASS.
- Helper-scoped marker implemented: PASS.
- Final assembly visibility predicate implemented: PASS.
- Direct email checks narrowed safely: PASS.
- Private marker stripping implemented: PASS.
- Tombstone / deleted filtering preserved: PASS.
- Syntax check for `backend/server.js`: PASS.

## Validation

Commands / checks run:

```powershell
git diff -- backend\server.js
node --check backend\server.js
```

Observed diff summary:

- `filteredCaseRows.map(normalizeSupabaseCaseRow)` replaced with marker-aware mapping.
- `isEmailVisibleCase(...)` added before `canonicalCaseIds`.
- Three direct `emailFromPersistedCase(item) !== email` checks replaced with `!isEmailVisibleCase(item)`.
- `_emailScopedByCleanAuthority` added to the two public response stripping blocks.
- Mojibake / unrelated encoding pollution was cleaned before this record.
- Final diff contains only the target 5V changes.

Syntax check result:

- `node --check backend\server.js`: PASS.

## Risk / Stop Line

Stop line:

- Do not remove deleted-case / tombstone filtering.
- Do not trust broad fallback rows without direct email matching.
- Do not expose `_emailScopedByCleanAuthority` in public response.
- Do not alter Supabase schema, RLS, grants, service role keys, frontend, payment, receipt, verification, or storage behavior.
- Do not claim deployed public `/cases?email=` confidence until a deployed fixture-only re-smoke returns expected fixture case IDs.
- Do not read or expose production customer data.

## Next Action

Next suitable work item after this implementation is pushed:

- v0.9-5W deployed `/cases?email=` fixture confidence re-smoke after Render reflects v0.9-5V.

Suggested focus:

- Run fixture-only deployed smoke for:
  - `smoke+cases-existing-001@nimclea.test`
- Confirm expected fixture case IDs:
  - `00000000-0000-4000-8000-000000009401`
  - `00000000-0000-4000-8000-000000000024`
- If both are present, record public endpoint confidence PASS / closure candidate.
- If still missing, classify the next blocker without broadening scope.

Not included:

- No schema change.
- No RLS / permission change.
- No Supabase Storage change.
- No payment / receipt / verification / frontend change.
- No production customer data read.