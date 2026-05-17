# Nimclea AAB GET /case/:caseId Read-Only Runtime Smoke Record v0.1

## Boundary Statement

AAB read-only wiring for `GET /case/:caseId` was runtime-smoked locally.

Runtime smoke used existing local backend case data only.

No Render JSON data was migrated into Supabase.

No Supabase writes were introduced.

No JSON writes were introduced.

No frontend files were modified.

No payment/PDF/verification unlock behavior was changed.

External API response shape did not expose AAB rehearsal internals.

## Smoke Command

```powershell
$cases = Get-Content backend\data\cases.json | ConvertFrom-Json
$caseId = ($cases | Select-Object -First 1).caseId
Invoke-RestMethod "http://localhost:3000/case/$caseId" | ConvertTo-Json -Depth 10
```

## Observed Result

- `success`: true
- `message`: `"Case fetched"`
- `caseId`: `"CASE-MANUAL-DIAG-001"`
- `source`: `"case_route"`
- `status`: `"diagnostic_completed"`
- `eventCount`: 0

## Response-Shape Observation

- No AAB rehearsal fields were intentionally exposed.
- No `aabPlan` / `aabSource` / `aabSelection` fields were present.
- No `migrationPerformed` / `writePerformed` / `runtimeAuthorityChanged` fields were present.

## Guard Baseline

- AAB response-shape exposure guard: PASS
- AAB case route read-only wiring boundary guard: PASS, Mode B controlled read-only wiring detected
- AAB case route read-only wiring preflight guard: PASS, Mode B controlled read-only wiring detected
- Release gate: PASS 75 / WARN 5 / FAIL 0, Final result WARN

## Acceptance Checklist

- local runtime `GET /case/:caseId` returned success
- existing response shape remained compatible
- no AAB internal fields exposed
- no data migration
- no write path introduced
- no frontend authority introduced
- release gate requires this record

## Stop Line

If future runtime smoke exposes AAB internal fields, introduces write behavior, changes payment/PDF/verification unlock authority, imports Render JSON into Supabase, or changes response shape, AAB route wiring must stop and be re-reviewed.
