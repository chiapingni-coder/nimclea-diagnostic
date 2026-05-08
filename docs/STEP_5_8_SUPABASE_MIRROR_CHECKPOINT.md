# Step 5.8 Supabase Mirror Checkpoint

Date:
2026-05-08

Status:
Completed and validated.

## Purpose

Step 5.8 connected existing JSON-backed backend writes to Supabase as a mirror-only persistence layer.

Current rule:
- JSON files remain the source of truth.
- Supabase is mirror-only.
- Supabase write failures must not break existing requests.
- Read paths are not switched to Supabase yet.

## Backend commits

- ff13205 Add idempotent Supabase mirror for events and receipts
- 1f7eb2e Save diagnostic case before result navigation
- 3fc5ba5 Allow nullable uuid user id in event mirror
- 609eeeb Mirror receipt records by case id

## Files changed in Step 5.8

Backend mirror hooks:
- backend/utils/supabaseMirrorWrites.js
- backend/utils/fileStore.js
- backend/utils/jsonStore.js

Frontend case-save fix:
- frontend/pages/Questionnaire.jsx

## Event mirror design

Write source:
- POST /event/log
- Existing JSON write path: eventLogs.json
- Hook point: backend/utils/fileStore.js appendJsonFile(...)
- Mirror helper: mirrorEventLogToSupabase(eventRecord)
- Supabase table: event_logs

Idempotency:
- event_id is required for Supabase mirror.
- If eventRecord has eventId / event_id / id, use it.
- If missing, generate deterministic fallback event_id with stable hash.
- Always upsert on event_id.
- No fallback insert.

UUID handling:
- event_logs.user_id remains nullable uuid.
- Backend sends user_id only if it is a valid UUID.
- Empty string or app-level user ids are converted to null.

Validated event:
- caseId: CASE-1778196530556-7BBG0U
- eventId: evt_1778198459158_b64y3i
- eventType: step_5_8_event_mirror_test_after_grant
- page: manual_powerShell_test

Validation result:
- Render /event/log returned success.
- Render /case/:caseId aggregated eventCount.
- Supabase event_logs received the row.

## Receipt mirror design

Write source:
- POST /hash-ledger/receipt
- Existing JSON write path: receiptRecords.json
- Hook point: backend/utils/jsonStore.js writeJsonFile(...)
- Mirror helper: mirrorReceiptRecordToSupabase(receiptRecord)
- Supabase table: receipt_records

Important design decision:
- receipt_records.receipt_id remains Supabase-generated uuid.
- Backend does not write receipt_id.
- case_id is the idempotent mirror conflict key.
- Upsert uses onConflict: case_id.

Reason:
- receipt_id is referenced by verification_records.
- Changing receipt_id to text would break or conflict with verification_records foreign-key structure.
- case_id is stable for one receipt baseline per case.

Validated receipt:
- caseId: CASE-1778196530556-7BBG0U
- receiptHash: H-5A8C9D10EF22AB33CD44EF55
- source: step_5_8_d_receipt_mirror_test
- payment_status: unpaid
- paid: false

Validation result:
- POST /hash-ledger/receipt returned ok: true, created: true.
- GET /receipt-record?caseId=CASE-1778196530556-7BBG0U returned the receipt.
- Supabase receipt_records received the row.
- Reposting same caseId + receiptHash returned ok: true, existing: true.
- Supabase receipt_records count for that case remained 1.

## Supabase event_logs schema corrections

Applied corrections:
- event_id changed to text.
- page added as text.
- meta added as jsonb.
- raw_record added as jsonb.
- user_id kept as nullable uuid.
- trial_id added/kept as text.
- source exists as text.
- unique index added on event_id.
- service_role granted table privileges.
- PostgREST schema cache reloaded.

Relevant SQL actions:
- alter table event_logs add column if not exists page text;
- alter table event_logs alter column event_id type text using event_id::text;
- alter table event_logs add column if not exists meta jsonb default '{}'::jsonb;
- alter table event_logs add column if not exists raw_record jsonb default '{}'::jsonb;
- alter table event_logs add column if not exists trial_id text;
- create unique index if not exists event_logs_event_id_key on event_logs (event_id);
- grant all privileges on table public.event_logs to service_role;
- select pg_notify('pgrst', 'reload schema');

Resolved issues:
- Missing page column.
- event_id incorrectly typed as uuid.
- Missing meta / raw_record columns.
- user_id uuid rejection from empty string.
- Permission denied for table event_logs.

## Supabase receipt_records schema corrections

Applied corrections:
- receipt_id kept as uuid.
- case_id used as mirror conflict key.
- hash added as text.
- payment_status added as text.
- verification_status added as text.
- paid added as boolean default false.
- source added as text.
- case_snapshot added as jsonb.
- raw_record added as jsonb.
- raw_payload kept as jsonb.
- unique index added on case_id.
- service_role granted table privileges.
- PostgREST schema cache reloaded.

Relevant SQL actions:
- alter table receipt_records add column if not exists hash text;
- alter table receipt_records add column if not exists payment_status text;
- alter table receipt_records add column if not exists verification_status text;
- alter table receipt_records add column if not exists paid boolean default false;
- alter table receipt_records add column if not exists source text;
- alter table receipt_records add column if not exists case_snapshot jsonb default '{}'::jsonb;
- alter table receipt_records add column if not exists raw_record jsonb default '{}'::jsonb;
- create unique index if not exists receipt_records_case_id_key on receipt_records (case_id);
- grant all privileges on table public.receipt_records to service_role;
- select pg_notify('pgrst', 'reload schema');

Resolved issues:
- receipt_id could not be changed to text because verification_records references receipt_records.receipt_id.
- Receipt mirror was changed to use case_id instead.
- Duplicate receipt mirror writes now upsert into one row.

## Diagnostic side note

Observed warning:
- [supabase:diagnostic] failed but ignored: null value in column "answers" of relation "diagnostic_records" violates not-null constraint.

Decision:
- Not part of Step 5.8 event / receipt mirror.
- Leave diagnostic_records for a separate step.

## Current final state

Step 5.8 is complete:
- 5.8-A event mirror backend hook completed.
- 5.8-B receipt mirror backend hook completed.
- 5.8-C event Supabase落表验证 completed.
- 5.8-D receipt Supabase落表验证 completed.
- 5.8-E mirror idempotency / 去重验证 completed.

Next recommended step:
- Do not switch read paths to Supabase yet.
- Keep JSON as source of truth.
- Later create a separate Step 5.9 for Supabase read-side comparison or migration planning.
