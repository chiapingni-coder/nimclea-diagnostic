# v0.9-5B DEPLOYED AUTHORITY READ PATH CONFIDENCE INSPECTION SMOKE RECORD

## Record ID

NIMCLEA_V0_9_5B_DEPLOYED_AUTHORITY_READ_PATH_CONFIDENCE_INSPECTION_SMOKE_RECORD_V0_1

## Date

2026-05-18

## Purpose

This record documents the deployed authority read-path confidence inspection / smoke after v0.9-5A.

v0.9-5A selected the next scope as deployed authority read-path confidence using the now-reachable protected authority probe as a fixture-only / allowlisted-case-only observability anchor.

This smoke re-runs the protected deployed authority probe and captures whether fixture email and allowlisted case ID read evidence is present.

## Scope

Area:

- v0.9 runtime authority observability
- deployed authority read-path confidence
- protected fixture probe
- fixture-only / allowlisted-case-only read evidence

Runtime behavior changed by this record:

- None.
- This is a smoke / inspection record only.
- No backend helper logic was changed.
- No frontend behavior was changed.
- No Supabase schema, RLS, grants, storage, payment, receipt, or verification behavior was changed.

## Smoke Target

Protected fixture authority probe:

https://nimclea-api.onrender.com/internal/rehearsal/authority-probe?email=smoke%2Bcases-existing-001%40nimclea.test&caseId=00000000-0000-4000-8000-000000000024

Requested fixture email:

- smoke+cases-existing-001@nimclea.test

Requested allowlisted case ID:

- 00000000-0000-4000-8000-000000000024

## Observed Result

HTTP status:

- 200

Top-level response:

- success: true
- probe: deployed_authority_availability
- rehearsal: true
- supabaseCoreAuthorityEnabled: true

Email lookup result:

- email: smoke+cases-existing-001@nimclea.test
- ok: false
- disabled: false
- error: Could not find the table 'public.customers' in the schema cache
- count: 0
- caseIds: empty array

Case lookup result:

- requestedCaseId: 00000000-0000-4000-8000-000000000024
- ok: true
- disabled: false
- found: false

## Full JSON Evidence

Observed deployed JSON:

{
  "success": true,
  "probe": "deployed_authority_availability",
  "rehearsal": true,
  "supabaseCoreAuthorityEnabled": true,
  "emailLookup": {
    "email": "smoke+cases-existing-001@nimclea.test",
    "ok": false,
    "disabled": false,
    "error": "Could not find the table 'public.customers' in the schema cache",
    "count": 0,
    "caseIds": []
  },
  "caseLookup": {
    "requestedCaseId": "00000000-0000-4000-8000-000000000024",
    "ok": true,
    "disabled": false,
    "found": false
  }
}

## Classification

Result:

- FAIL

Failure type:

- deployed authority read-path confidence not established

What passed:

- protected deployed authority probe route is reachable
- rehearsal env gate is active
- deployed probe execution returns HTTP 200
- Supabase core authority is enabled at probe level
- emailLookup object is present
- caseLookup object is present

What did not pass:

- fixture email read evidence is not present
- allowlisted case ID read evidence is not present
- emailLookup returned ok false
- emailLookup reported public.customers missing from schema cache
- caseLookup returned found false for the allowlisted fixture case ID

Current likely layer:

- deployed Supabase authority schema/table visibility or environment alignment
- deployed authority data availability for fixture records

Important distinction:

- This is not a route/env availability failure.
- This is not a frontend failure.
- This is not a payment, receipt, verification, or storage failure.
- This is not yet a helper patch decision.
- This is not yet a Supabase migration decision.
- This is a read-path confidence failure requiring separate blocker classification.

## Decision / Change Summary

Do not patch backend helper logic inside this smoke record.

Do not patch Supabase schema inside this smoke record.

The next step should classify the read-path confidence failure before any fix is selected.

The next classification should distinguish between possible causes:

1. Deployed backend points to a Supabase project where public.customers is absent.
2. Clean authority tables exist locally or in another Supabase project but not in the deployed Render SUPABASE_URL target.
3. public.customers exists but is not visible through the schema cache / exposed schema configuration.
4. Fixture customer/case records are absent in the deployed Supabase authority source.
5. Backend adapter is querying canonical customers/cases tables, but deployed authority baseline is not aligned.

## Acceptance Criteria

This smoke record is complete when:

- The protected fixture authority probe HTTP 200 is documented.
- success true is documented.
- rehearsal true is documented.
- supabaseCoreAuthorityEnabled true is documented.
- emailLookup failure is documented.
- public.customers schema cache error is documented.
- caseLookup found false is documented.
- The result is classified as read-path confidence FAIL.
- The record avoids selecting a fix prematurely.
- The next action is narrowed to blocker classification.

## Validation

Commands / checks run:

- Protected deployed authority probe full JSON smoke.

Observed result:

- HTTP 200
- success true
- rehearsal true
- supabaseCoreAuthorityEnabled true
- emailLookup.ok false
- emailLookup error: Could not find the table 'public.customers' in the schema cache
- caseLookup.ok true
- caseLookup.found false

## Risk / Stop Line

Stop line:

- Do not treat this as route/env failure.
- Do not treat this as frontend failure.
- Do not treat this as payment, receipt, verification, or storage failure.
- Do not patch helpers without blocker classification.
- Do not apply Supabase migrations without contract direction and isolated rehearsal.
- Do not broaden the probe beyond fixture-only / allowlisted-case-only.
- Do not expose arbitrary customer data.

Allowed next step:

- v0.9-5C deployed authority read-path confidence blocker classification.

## Next Action

Next suitable work item:

- v0.9-5C deployed authority read-path confidence blocker classification.

Suggested focus:

- Classify the public.customers schema cache error.
- Confirm whether Render SUPABASE_URL points to the intended Supabase authority project.
- Confirm whether canonical public.customers and related clean authority tables exist in that project.
- Confirm whether fixture records exist in the deployed authority source.
- Decide whether this is environment/project drift, schema visibility drift, missing fixture data, or backend contract drift before selecting a fix.