# v0.9-5U CASES EMAIL CLEAN AUTHORITY FINAL ASSEMBLY PROMOTION CANDIDATE RECORD

## Record ID

NIMCLEA_V0_9_5U_CASES_EMAIL_CLEAN_AUTHORITY_FINAL_ASSEMBLY_PROMOTION_CANDIDATE_RECORD_V0_1

## Date

2026-05-18

## Purpose

This record defines the smallest safe implementation candidate after v0.9-5T identified the public `/cases?email=` final assembly drop point.

Prior evidence:

- v0.9-5H protected authority probe PASS proved deployed clean authority access.
- v0.9-5O treated successful `getCaseRecordsByEmail(email)` helper rows as already email-scoped inside `loadSupabaseCaseSourcesForEmail(...)`.
- v0.9-5R confirmed deployed public `/cases?email=` raw response remained `[]`, while the protected probe still returned two expected fixture case IDs.
- v0.9-5T identified the final assembly drop point:
  - `supabaseSources.cases` is merged into `cases`
  - `supabaseSources.cases` is also included in `durableCandidates`
  - but both candidate creation and durable promotion still require `emailFromPersistedCase(item) === email`
  - clean authority helper-scoped rows may not carry direct row-level email, so they can still be dropped

## Scope

- Area: Public `/cases?email=` clean authority final assembly promotion candidate.
- Files inspected: backend/server.js, prior v0.9-5R evidence, prior v0.9-5T inspection record.
- Files changed: this candidate record only.
- Runtime behavior affected: none; documentation-only candidate record.
- Proposed future runtime target: backend/server.js only.
- Supabase Storage: not included.
- Payment / receipt / verification / frontend: not included.
- Runtime code change in this record: none.
- Schema change: none.
- RLS / permission change: none.
- Secret exposure: none.

## Decision / Change Summary

Candidate selected:

- Add a narrow internal marker for clean authority helper-scoped case rows.
- Allow only those marked helper-scoped rows to bypass direct row-level email matching in final assembly.
- Preserve direct email matching for local JSON rows and broad fallback rows.
- Preserve deleted-case / tombstone filtering.
- Preserve receipt snapshot / protected overlay safety rules.
- Strip or avoid exposing any internal marker from the public response.

Proposed future implementation direction:

1. In `loadSupabaseCaseSourcesForEmail(...)`, when `helperRowsAreEmailScoped` is true, return normalized clean authority case rows with a private internal flag such as:

```javascript
_emailScopedByCleanAuthority: true
```

2. Do not add that flag to fallback broad scan rows.

3. In public `/cases?email=` final assembly, treat a row as email-visible if either:

```javascript
emailFromPersistedCase(item) === email
```

or

```javascript
item?._emailScopedByCleanAuthority === true
```

4. Apply that rule only in the candidate creation and durable candidate promotion paths where v0.9-5T identified the drop point.

5. Keep all deleted-case / tombstone filtering before promotion.

6. Strip `_emailScopedByCleanAuthority` before returning public response, alongside other private internal fields.

Selected candidate shape:

- Add helper scoped marker only to successful clean authority helper rows.
- Introduce a tiny predicate, for example:

```javascript
const isEmailVisibleCase = (item = {}) =>
  emailFromPersistedCase(item) === email ||
  item?._emailScopedByCleanAuthority === true;
```

- Replace final assembly direct checks only where needed:
  - `canonicalCaseIds`
  - `cases.forEach(...)` candidate seeding
  - second `cases.forEach(...)` candidate pass
  - `durableCandidates.forEach(...)`
- Do not alter broad fallback filtering in `loadSupabaseCaseSourcesForEmail(...)`.

## Acceptance Criteria

This candidate is acceptable if it preserves:

- No runtime patch in v0.9-5U.
- No schema or RLS change.
- No service-role or env change.
- No frontend / payment / receipt / verification / storage change.
- Direct email matching remains required for local JSON and broad fallback rows.
- Only helper-scoped clean authority rows may bypass direct row-level email matching.
- Deleted-case / tombstone denylist remains active.
- Receipt snapshot / protected overlay rules remain active.
- Next implementation step is narrow and testable.

Actual candidate result:

- Candidate selected: PASS.
- Runtime patch included: no.
- Schema / RLS / env change included: no.
- Tombstone safety preserved in candidate: yes.
- Fallback broad scan safety preserved in candidate: yes.
- Next implementation target identified: yes.

## Validation

Commands / checks run:

```powershell
.\scripts\v09-work-item.ps1 `
  -Id "NIMCLEA_V0_9_5U_CASES_EMAIL_CLEAN_AUTHORITY_FINAL_ASSEMBLY_PROMOTION_CANDIDATE_RECORD_V0_1" `
  -Kind "candidate" `
  -Commit "Add v0.9-5U cases email clean authority final assembly promotion candidate"
```

Observed result:

- Record was created.
- Record required content before gate protection and release-check.
- No runtime code was changed.

Relevant prior finding from v0.9-5T:

- `supabaseSources.cases` enters `cases`.
- `supabaseSources.cases` enters `durableCandidates`.
- `candidateMap` creation still requires `emailFromPersistedCase(item) === email`.
- `durableCandidates` promotion still requires `emailFromPersistedCase(item) === email`.
- Therefore helper-scoped rows can still be dropped if they do not carry direct row-level email.

Result:

- Candidate prepared for the smallest safe final assembly promotion step.
- Public `/cases?email=` confidence blocker remains open until re-smoke passes.
- No implementation is included in this record.

## Risk / Stop Line

Stop line:

- Do not implement runtime alignment in this candidate record.
- Do not remove deleted-case / tombstone filtering.
- Do not trust broad fallback rows without direct email matching.
- Do not expose private helper-scope markers in public response.
- Do not alter Supabase schema, RLS, grants, service role keys, frontend, payment, receipt, verification, or storage behavior.
- Do not claim public `/cases?email=` confidence until deployed endpoint returns the expected fixture case IDs.
- Do not read or expose production customer data.

## Next Action

Next suitable work item:

- v0.9-5V public `/cases?email=` clean authority final assembly promotion implementation smoke record.

Suggested focus:

- Implement the smallest backend/server.js change.
- Mark successful helper-scoped clean authority case rows internally.
- Use the marker only in final assembly visibility checks.
- Preserve direct email matching for local JSON and fallback broad scan rows.
- Preserve deleted-case / tombstone filters.
- Strip internal marker before public response.
- Run syntax checks.
- After push/deploy, re-smoke deployed `/cases?email=` for:
  - `smoke+cases-existing-001@nimclea.test`
- Confirm expected fixture case IDs:
  - `00000000-0000-4000-8000-000000009401`
  - `00000000-0000-4000-8000-000000000024`

Not included:

- No runtime code change.
- No endpoint behavior change.
- No schema change.
- No RLS / permission change.
- No production customer data read.
- No payment / receipt / verification / storage change.