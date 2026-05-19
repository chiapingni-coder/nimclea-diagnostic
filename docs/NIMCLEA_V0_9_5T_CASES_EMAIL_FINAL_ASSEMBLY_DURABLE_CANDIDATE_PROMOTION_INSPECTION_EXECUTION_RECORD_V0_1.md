# v0.9-5T CASES EMAIL FINAL ASSEMBLY DURABLE CANDIDATE PROMOTION INSPECTION EXECUTION RECORD

## Record ID

NIMCLEA_V0_9_5T_CASES_EMAIL_FINAL_ASSEMBLY_DURABLE_CANDIDATE_PROMOTION_INSPECTION_EXECUTION_RECORD_V0_1

## Date

2026-05-18

## Purpose

This record documents the read-only final assembly / durable candidate promotion inspection after v0.9-5S selected the next inspection layer for the public `/cases?email=` empty response blocker.

Prior evidence:

- v0.9-5H protected authority probe PASS proved deployed clean authority access.
- v0.9-5O implemented helper success rows as already email-scoped inside `loadSupabaseCaseSourcesForEmail(...)`.
- v0.9-5R confirmed deployed public `/cases?email=` raw response is `[]`, while protected authority probe still returns two expected fixture case IDs.
- v0.9-5S selected final assembly / durable candidate promotion inspection as the next smallest scope.

The goal of this record is to identify where clean authority rows can still be dropped after helper lookup.

## Scope

- Area: Public `/cases?email=` final assembly / durable candidate promotion inspection.
- Files inspected: backend/server.js, prior v0.9-5R evidence, prior v0.9-5S candidate scope, and public /cases?email final assembly code paths.
  - `backend/server.js`
  - prior v0.9-5R evidence
  - prior v0.9-5S candidate scope
- Files changed: this inspection record only.
- Runtime behavior affected: none; documentation-only inspection record.
- Runtime code change in this record: none.
- Schema change: none.
- RLS / permission change: none.
- Supabase Storage: not included.
- Payment / receipt / verification / frontend: not included.
- Secret exposure: none.

## Inspection Summary

Inspection result:

- DROP POINT IDENTIFIED.

The public `/cases?email=` route merges `supabaseSources.cases` into the local `cases` list:

```javascript
const cases = filterDeletedCases([...localCases, ...supabaseSources.cases]);
```

However, downstream candidate creation still requires direct row-level email matching:

```javascript
if (emailFromPersistedCase(item) !== email) return;
```

This appears in the canonical candidate path:

```javascript
cases.forEach((item) => {
  const caseId = caseIdOf(item);
  if (!caseId) return;
  if (emailFromPersistedCase(item) !== email) return;
  if (isReceiptSnapshotSource(item)) return;

  addCandidate(item, { hasCanonicalCaseSource: true });
});
```

It also appears again in the durable candidate promotion path:

```javascript
const durableCandidates = [...localCases, ...supabaseSources.cases];

durableCandidates.forEach((item) => {
  const caseId = caseIdOf(item);
  if (!caseId) return;
  if (emailFromPersistedCase(item) !== email) return;
  if (isReceiptSnapshotSource(item)) return;
  if (isDeletedOrDiscardedCaseRecord(item)) return;

  const normalizedItem = normalizeCaseRecord(item);
  const sanitizedItem = sanitizeCaseIdentity(normalizedItem, caseId, email);
  finalCaseMap.set(...);
});
```

Therefore, even after v0.9-5O, clean authority helper-scoped rows can still be dropped if they do not carry a direct email field.

This matches the deployed behavior:

- protected authority probe returns two fixture case IDs
- public `/cases?email=` raw response remains `[]`

## Evidence

Commands / checks run:

```powershell
$Lines = Get-Content backend\server.js

function Show-Range {
  param(
    [int]$Start,
    [int]$End,
    [string]$Title
  )

  Write-Host "`n=== $Title ==="
  for ($i = $Start - 1; $i -le $End - 1; $i++) {
    "{0,5}: {1}" -f ($i + 1), $Lines[$i]
  }
}

Show-Range 843 875 "A) /cases route: localDeletedCaseIds + supabaseSources"
Show-Range 920 1000 "B) candidateMap + addCandidate entry points"
Show-Range 998 1165 "C) matches assembly and filters"
Show-Range 1178 1245 "D) finalCaseMap + durableCandidates + finalCases return"

Select-String -Path backend\server.js `
  -Pattern "supabaseSources\.cases|candidateMap|addCandidate|matches|finalCaseMap|durableCandidates|finalCases|_hasCanonicalCaseSource|hasCanonicalCaseSource|sanitizeCaseIdentity|isReceiptSnapshotSource|isProtectedFormalOverlayRecord|isUnpaidReceiptSnapshotArtifact" `
  -Context 2,5
```

Observed findings:

- `supabaseSources.cases` is merged into `cases`.
- `cases.forEach(...)` requires `emailFromPersistedCase(item) === email` before `addCandidate(...)`.
- `canonicalCaseIds` also depends on `emailFromPersistedCase(item) === email`.
- `durableCandidates` includes `supabaseSources.cases`.
- `durableCandidates.forEach(...)` again requires `emailFromPersistedCase(item) === email` before promotion into `finalCaseMap`.
- `finalCases` is produced from `finalCaseMap`.
- Therefore if clean authority helper rows do not carry direct email fields, they can be dropped before reaching `candidateMap` and again before durable promotion.

Relevant prior deployed evidence from v0.9-5R:

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

## Acceptance Criteria

This inspection passes if it identifies the exact public route drop point without changing runtime behavior.

Actual result:

- `supabaseSources.cases` merge point inspected: PASS.
- `candidateMap` / `addCandidate(...)` inspected: PASS.
- `matches` and downstream filters inspected: PASS.
- `finalCaseMap` inspected: PASS.
- `durableCandidates` inspected: PASS.
- Exact likely drop point identified: PASS.
- Runtime patch included: no.
- Schema / RLS / env change included: no.
- Payment / receipt / verification / frontend / storage change included: no.

## Risk / Stop Line

Stop line:

- Do not patch runtime inside this inspection record.
- Do not remove deleted-case / tombstone filters.
- Do not trust broad fallback rows without direct email matching.
- Do not alter Supabase schema, RLS, grants, service role keys, frontend, payment, receipt, verification, or storage behavior.
- Do not claim public `/cases?email=` confidence while deployed raw response remains `[]`.
- Do not read or expose production customer data.

## Next Action

Next suitable work item:

- v0.9-5U public `/cases?email=` clean authority final assembly promotion candidate.

Suggested focus:

- Preserve direct email matching for local JSON and broad fallback rows.
- Treat `supabaseSources.cases` rows from the successful clean authority helper path as already email-scoped.
- Promote clean authority helper-scoped rows into candidate / durable final assembly without requiring direct row-level email.
- Preserve deleted-case / tombstone filtering.
- Preserve receipt snapshot / protected overlay safety rules.
- Select the smallest safe implementation candidate before another runtime patch.

Not included:

- No runtime code change.
- No endpoint behavior change.
- No schema change.
- No RLS / permission change.
- No production customer data read.
- No payment / receipt / verification / storage change.