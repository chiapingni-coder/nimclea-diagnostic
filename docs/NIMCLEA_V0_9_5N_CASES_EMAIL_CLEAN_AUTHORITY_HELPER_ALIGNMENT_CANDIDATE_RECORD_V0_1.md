# v0.9-5N CASES EMAIL CLEAN AUTHORITY HELPER ALIGNMENT CANDIDATE RECORD

## Record ID

NIMCLEA_V0_9_5N_CASES_EMAIL_CLEAN_AUTHORITY_HELPER_ALIGNMENT_CANDIDATE_RECORD_V0_1

## Date

2026-05-18

## Purpose

This record defines the smallest safe runtime alignment candidate after v0.9-5M identified the likely public `/cases?email=` empty-response blocker path.

Prior evidence:

- v0.9-5H protected authority probe PASS proved deployed clean authority helper access.
- v0.9-5K public `/cases?email=` smoke returned HTTP 200 but `Count 0` / empty result.
- v0.9-5M inspection showed the public route calls `getCaseRecordsByEmail(email)` through `loadSupabaseCaseSourcesForEmail(...)`, but then applies extra post-helper email filtering with `getEmailFromCaseRecord(normalizedRow)` and `rowEmail === email`.
- Clean authority rows returned by `getCaseRecordsByEmail(email)` are already email-scoped through `customers.email -> cases.customer_id`, so requiring a direct email field on the normalized case row can discard valid clean authority rows.

## Scope

- Area: Public `/cases?email=` clean authority helper alignment candidate.
- Files inspected: backend/server.js, backend/utils/supabaseCoreAuthorityStore.js, prior v0.9-5H / 5K / 5M evidence.
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

- Align public `/cases?email=` with clean authority helper semantics.
- Treat rows returned by successful `getCaseRecordsByEmail(email)` as already email-scoped.
- Do not require those helper-returned clean authority rows to carry a direct email field after lookup.
- Preserve deleted-case / tombstone filtering.
- Preserve legacy fallback behavior only when the clean authority helper fails or is unavailable.
- Keep response assembly and normalization otherwise narrow.

Proposed narrow implementation direction for the next work item:

- In `loadSupabaseCaseSourcesForEmail(email, deletedCaseIds)`, distinguish between:
  - clean authority helper success path
  - legacy fallback broad Supabase cases scan path
- For helper success path:
  - accept helper-returned rows as email-scoped
  - filter by deleted/tombstoned case IDs only
- For fallback path:
  - continue requiring `rowEmail === email`, because fallback may be broad/unscoped
- Do not remove tombstone safety.
- Do not change schema, RLS, env, payment, receipt, verification, frontend, or storage behavior.

## Acceptance Criteria

This candidate is acceptable if it preserves:

- No runtime patch in v0.9-5N.
- No schema or RLS change.
- No service-role or env change.
- No frontend / payment / receipt / verification / storage change.
- Clean authority helper success path remains trusted as email-scoped.
- Deleted-case / tombstone denylist remains active.
- Legacy fallback path remains conservative.
- Next implementation step is narrow and testable.

Actual candidate result:

- Candidate selected: PASS.
- Runtime patch included: no.
- Schema / RLS / env change included: no.
- Tombstone safety preserved in candidate: yes.
- Next implementation target identified: yes.

## Validation

Commands / checks run:

```powershell
.\scripts\v09-work-item.ps1 `
  -Id "NIMCLEA_V0_9_5N_CASES_EMAIL_CLEAN_AUTHORITY_HELPER_ALIGNMENT_CANDIDATE_RECORD_V0_1" `
  -Kind "candidate" `
  -Commit "Add v0.9-5N cases email clean authority helper alignment candidate"
```

Observed result:

- Record was created.
- Record required content before gate protection and release-check.
- No runtime code was changed.

Relevant prior finding from v0.9-5M:

- Public `/cases?email=` route reaches the clean authority helper path.
- The likely blocker is extra post-helper email filtering after a successful helper lookup.
- Protected probe path uses helper results directly enough to prove fixture case IDs.
- Public endpoint can still produce an empty response if valid helper rows lack direct row-level email fields after normalization.

Result:

- Candidate prepared for the smallest safe runtime alignment step.
- v0.9-5K public endpoint confidence blocker remains open until re-smoke passes.
- No implementation is included in this record.

## Risk / Stop Line

Stop line:

- Do not implement the runtime alignment in this candidate record.
- Do not remove deleted-case / tombstone filtering.
- Do not make broad fallback rows trusted without direct email matching.
- Do not alter Supabase schema, RLS, grants, service role keys, frontend, payment, receipt, verification, or storage behavior.
- Do not claim public `/cases?email=` confidence until deployed endpoint returns the expected fixture case IDs.
- Do not read or expose production customer data.

## Next Action

Next suitable work item:

- v0.9-5O public `/cases?email=` clean authority helper alignment implementation smoke record.

Suggested focus:

- Implement the smallest backend/server.js change in `loadSupabaseCaseSourcesForEmail(...)`.
- Preserve helper-returned rows when `getCaseRecordsByEmail(email)` succeeds.
- Apply only deleted-case / tombstone filtering to helper-scoped rows.
- Keep strict `rowEmail === email` filtering for legacy fallback broad scan rows.
- Run local syntax/build checks.
- Run deployed fixture-only `/cases?email=` smoke after push/deploy.
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