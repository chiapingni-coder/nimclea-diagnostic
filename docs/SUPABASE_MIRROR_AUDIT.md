# Supabase Mirror Audit Log

Date: 2026-05-07
Final passing caseId: CASE-1778190475059-ZQOSKK
Final passing email: supa-finaltest-20260507144754@nimclea.test

Verified result:
cases = 1
diagnostic_records = 1
case_plan_records = 1

Backend commits:
4089fbd Add Supabase mirror writes for case save
7b134d5 Add Supabase mirror writes for case plan records
3f39213 Guard Supabase diagnostic mirror writes

Render env notes:
SUPABASE_URL must be the project URL only, without /rest/v1.
SUPABASE_SERVICE_ROLE_KEY must be service_role or sb_secret key, not anon, not sb_publishable, not URL.

Supabase schema patches applied:
cases: added status, stage, source, result, case_data, raw_record, created_at, updated_at, company, name.
diagnostic_records: added source, answers, result, case_schema, case_data, raw_record, created_at.
case_plan_records: added source, workflow, plan_data, case_data, raw_record, updated_at, unique(case_id).
grants: granted public schema/table/sequence privileges to service_role.

Status: Step 5.6, 5.7, and 5.6.1 online mirror test PASS.
