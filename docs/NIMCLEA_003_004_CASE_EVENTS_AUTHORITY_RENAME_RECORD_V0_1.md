# Nimclea 003/004 Case Events Authority Rename Record v0.1

## 1. Title and Version

Document: Nimclea 003/004 Case Events Authority Rename Record

Version: v0.1

Status: Documentation-only record. This document does not authorize SQL execution, Supabase connection, table creation, backend changes, frontend changes, or runtime behavior changes.

## 2. Record Scope

This record captures the authority-chain rename of the trust foundation case event table from `event_logs` to `case_events` before SQL execution.

No SQL was executed.

No Supabase connection was made.

No tables were created.

No backend behavior changed.

No frontend behavior changed.

No runtime behavior changed.

## 3. Rename Record

The `event_logs` table name was renamed to `case_events` in all four aligned artifacts:

- Schema plan
- SQL draft
- Migration draft
- Migration guard

The primary key name `event_log_id` was renamed to `case_event_id`.

The `event_reviews` table now binds to `case_events` through `case_event_id`.

`audit_trail` remains the audit/supporting table and was not renamed.

## 4. Protected Commits

The rename work is associated with these protected commits:

- `7305331` Clarify event review SQL authority link
- `97a4f0a` Align migration event review authority link
- `47825ef` Guard migration event review authority link
- `774bb52` Rename event logs to case events authority

## 5. Release Gate Record

Current release gate result:

`PASS 35 / WARN 5 / FAIL 0, Final result: WARN`

The `WARN 5` result refers to existing manual-only smoke areas. Those warnings were not introduced by this rename record or by the case events authority rename.

## 6. Recommended Next Step

Add this record path to `requiredDocs` in `scripts/check-release-gate.mjs` in a separate change. This document does not modify the release gate itself.

