# NIMCLEA 004 Case Schema Snapshot Field Decision Record v0.1

## Decision

Nimclea will use `case_schema jsonb` as the embedded case schema snapshot field.

No standalone `case_snapshots` table is introduced in the clean authority schema v0.1.

## Reason

`case_schema` is already present in the Supabase clean authority SQL draft, the executable migration draft, and the migration guard.

The field represents a passive embedded schema snapshot that travels with a case or event review record. It is not a separate authority table in v0.1.

## Boundary

Use:

- `cases.case_schema` for the current case-level embedded schema snapshot.
- `event_reviews.case_schema` for the case schema snapshot referenced at the time of event review.

Do not introduce these names in v0.1:

- `case_snapshots`
- `case_snapshot`
- `schema_snapshot`
- `schemaSnapshot`

## Rule

Snapshot is the usage.

`case_schema` is the field name.

If versioned schema history becomes necessary later, it must be introduced through a separate migration and decision record, not by silently renaming this field.
