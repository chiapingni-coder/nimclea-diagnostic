# v0.9-5S CASES EMAIL FINAL ASSEMBLY DURABLE CANDIDATE PROMOTION INSPECTION CANDIDATE RECORD

## Record ID

NIMCLEA_V0_9_5S_CASES_EMAIL_FINAL_ASSEMBLY_DURABLE_CANDIDATE_PROMOTION_INSPECTION_CANDIDATE_RECORD_V0_1

## Date

2026-05-18

## Purpose

This record defines the next smallest safe inspection candidate after v0.9-5R clarified that the deployed public `/cases?email=` raw backend response is `[]`, while the deployed protected authority probe still returns the expected fixture cases.

Prior evidence:

- v0.9-5H protected authority probe PASS proved deployed clean authority access.
- v0.9-5O implemented the public `/cases?email=` clean authority helper alignment.
- v0.9-5P deployed re-smoke still returned empty public endpoint evidence.
- v0.9-5R proved deployed `/cases?email=` raw response is the array `[]`, not a `{ value, Count }` wrapper.
- v0.9-5R also confirmed the protected authority probe still returns:
  - `emailLookup.count: 2`
  - `00000000-0000-4000-8000-000000009401`
  - `00000000-0000-4000-8000-000000000024`

Therefore the next step should inspect the public route final assembly path after `loadSupabaseCaseSourcesForEmail(...)`.

## Scope

- Area: Public `/cases?email=` final assembly / durable candidate promotion inspection candidate.
- Files inspected: prior v0.9-5H through v0.9-5R evidence only.
- Files changed: this candidate record only.
- Runtime behavior affected: none; documentation-only candidate record.
- Proposed inspection targets:
  - `backend/server.js`
  - `loadSupabaseCaseSourcesForEmail(...)`
  - `supabaseSources.cases`
  - `addCandidate(...)`
  - `candidateMap`
  - `matches`
  - `finalCaseMap`
  - `durableCandidates`
  - `sanitizeCaseIdentity(...)`
  - deleted-case / tombstone filters
- Supabase Storage: not included.
- Payment / receipt / verification / frontend: not included.
- Runtime code change in this record: none.
- Schema change: none.
- RLS / permission change: none.
- Secret exposure: none.

## Decision / Change Summary

Candidate selected:

- Inspect the final public `/cases?email=` assembly path before any further runtime patch.

Primary question:

- Are helper-scoped rows reaching `supabaseSources.cases` but failing to enter `finalCaseMap` or `finalCases`?

Secondary questions:

- Does `candidateMap` receive clean authority case rows?
- Are clean authority rows only used as durable candidates but not promoted into final output?
- Does `matches` require local logs, receipt rows, event logs, or workspace artifacts before a case becomes visible?
- Does `durableCandidates` include `supabaseSources.cases`, and if so, are those rows promoted correctly?
- Does deleted-case / tombstone filtering accidentally remove the fixture case IDs?
- Does `sanitizeCaseIdentity(...)` preserve case identity for clean authority rows?
- Is the public route final output empty because final assembly is still optimized for legacy local JSON / receipt snapshot sources rather than canonical clean authority cases?

Selected candidate direction:

- v0.9-5T should be an inspection execution record.
- It should inspect the final assembly path only.
- It should avoid any runtime patch until the precise drop point is identified.
- It should preserve deleted-case / tombstone filtering.

## Acceptance Criteria

This candidate is acceptable if it preserves all of the following:

- No runtime patch in v0.9-5S.
- No schema or RLS change.
- No service-role or env change.
- No payment / receipt / verification / frontend / storage change.
- No downgrade of v0.9-5P or v0.9-5R findings.
- A clear next inspection target is selected.
- The next step is focused on final assembly / durable candidate promotion, not broad backend changes.

Actual candidate result:

- Candidate selected: PASS.
- Runtime patch included: no.
- Inspection target selected: yes.
- Next work item defined: yes.
- Fixture-only boundary preserved: yes.

## Validation

Commands / checks run:

```powershell
.\scripts\v09-work-item.ps1 `
  -Id "NIMCLEA_V0_9_5S_CASES_EMAIL_FINAL_ASSEMBLY_DURABLE_CANDIDATE_PROMOTION_INSPECTION_CANDIDATE_RECORD_V0_1" `
  -Kind "candidate" `
  -Commit "Add v0.9-5S cases email final assembly candidate promotion inspection candidate"
```

Observed result:

- Record was created.
- Record required content before gate protection and release-check.
- No runtime code was changed.

Relevant prior v0.9-5R evidence:

```json
{
  "publicCasesEmailRawResponse": {
    "status": 200,
    "contentType": "application/json; charset=utf-8",
    "rawContentLength": 2,
    "rawContent": "[]"
  },
  "protectedAuthorityProbe": {
    "status": 200,
    "success": true,
    "supabaseCoreAuthorityEnabled": true,
    "emailLookup": {
      "ok": true,
      "count": 2,
      "caseIds": [
        "00000000-0000-4000-8000-000000009401",
        "00000000-0000-4000-8000-000000000024"
      ]
    },
    "caseLookup": {
      "ok": true,
      "found": true,
      "caseId": "00000000-0000-4000-8000-000000000024"
    }
  }
}
```

Result:

- v0.9-5R narrowed the blocker beyond wrapper shape.
- v0.9-5S selects the next inspection layer.
- No fix has been selected yet.

## Risk / Stop Line

Stop line:

- Do not patch runtime inside this candidate record.
- Do not alter Supabase schema, RLS, grants, service role keys, frontend, payment, receipt, verification, or storage behavior.
- Do not remove deleted-case / tombstone filtering.
- Do not treat protected authority probe PASS as public `/cases?email=` confidence.
- Do not claim public endpoint confidence while deployed raw `/cases?email=` returns `[]`.
- Do not read or expose production customer data.

## Next Action

Next suitable work item:

- v0.9-5T public `/cases?email=` final assembly / durable candidate promotion inspection execution record.

Suggested focus:

- Inspect `backend/server.js` after `loadSupabaseCaseSourcesForEmail(...)`.
- Trace whether `supabaseSources.cases` reaches:
  - `candidateMap`
  - `matches`
  - `finalCaseMap`
  - `durableCandidates`
  - `finalCases`
- Identify the exact drop point for clean authority case rows.
- Preserve deleted-case / tombstone filters.
- Select the smallest safe implementation candidate only after the drop point is documented.

Not included:

- No runtime code change.
- No endpoint behavior change.
- No schema change.
- No RLS / permission change.
- No production customer data read.
- No payment / receipt / verification / storage change.