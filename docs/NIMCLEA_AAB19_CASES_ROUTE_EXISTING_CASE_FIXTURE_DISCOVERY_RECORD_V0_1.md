# Nimclea AAB-19 - GET /cases?email=... Existing-Case Fixture Discovery Record v0.1

## Purpose

This record documents a read-only discovery attempt for an existing-case fixture suitable for strengthening `GET /cases?email=...` response-shape evidence.

AAB-18 confirmed the empty or unknown smoke email scenario.

AAB-19 does not claim existing-case PASS evidence. It records that no reliable existing-case fixture was confirmed during this pass.

## Scope

Route under consideration:

`GET /cases?email=<encodedEmail>`

Allowed actions:

- local documentation search
- local JSON/document search
- Render production read-only GET request
- response inspection
- evidence recording

Forbidden actions:

- runtime code changes
- route behavior changes
- Supabase writes
- local JSON writes
- fixture creation
- migration execution
- frontend behavior changes
- fabricated PASS evidence

## Discovery Search

Command used:

```powershell
Get-ChildItem -Path docs,backend -Include *.md,*.json -Recurse -ErrorAction SilentlyContinue |
  Select-String -Pattern "[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}" |
  Where-Object { $_.Line -match "smoke|nimclea\.test|case|trial|receipt" } |
  Select-Object -First 80 Path,LineNumber,Line
```

Result:

- Candidate smoke identities were searched in local documentation and backend JSON/document files.
- No reliable existing-case fixture for `GET /cases?email=...` was confirmed.
- No fixture was created.
- No local JSON file was modified.
- No database record was written.

## Render Read-Only Discovery Attempt

Target environment:

- Render production API
- Route: `GET /cases?email=<encodedEmail>`
- Purpose: existing-case fixture discovery only

Result:

- Read-only discovery was attempted.
- No reliable existing-case fixture was confirmed during this pass.
- No existing-case PASS evidence is claimed by this record.
- No route behavior change, fixture creation, Supabase write, local JSON write, or migration was performed.

## Evidence Boundary

AAB-19 is a fixture discovery record, not a successful existing-case smoke record.

This record may support a later AAB record if a controlled smoke-only existing-case fixture is identified. Any later record must capture the confirmed fixture source, sanitized request pattern, response shape summary, and read-only result without creating or mutating records.

## Pass / Warn / Fail Status

WARN:

- Existing-case fixture discovery was attempted, but no reliable existing-case fixture was confirmed.

Not PASS:

- This record does not prove that `GET /cases?email=...` returns an existing-case list for a known smoke identity.

Not FAIL:

- No mutation, migration, fixture creation, or runtime behavior change was performed.

## Acceptance Checklist

- read-only discovery attempt recorded
- no existing-case PASS evidence claimed
- no fixture created
- no Supabase write performed
- no local JSON write performed
- no runtime code changed
- no frontend behavior changed
- release gate requires this document

## Stop Line

If future existing-case evidence requires creating fixtures, writing database records, mutating local JSON, changing route behavior, or fabricating PASS evidence, AAB existing-case fixture discovery must stop and be re-scoped before execution.
