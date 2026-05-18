# Nimclea AAC-07 Positive Write Smoke Preflight Record v0.1

## Baseline

- AAC-06 is complete and protected.
- Release Automation v0.8 is the active workflow.
- No v0.9 work is included.
- No runtime code change is included in this record.

## Positive Write Target

The target must be fixture-only.

The target must use a controlled case ID.

The target must write only one minimal `case_event` row.

The target must not touch production customer data.

## Endpoint Boundary

The rehearsal endpoint may be used only when explicitly enabled by env.

Stop if the rehearsal endpoint is exposed on Render unexpectedly.

Stop if env status is unclear.

## Verification Path

After future write execution, read back through the backend authority path.

Do not verify by direct Supabase table inspection alone.

Do not modify frontend behavior.

## Stop Lines

Stop if any of the following is true:

- fixture case ID is not confirmed
- endpoint exposure boundary is not confirmed
- backend-only write boundary is not preserved
- any receipt, payment, verification, or customer-facing route change is required

## Final Boundary

This record does not execute the write.

This record only prepares the first controlled positive write smoke for `case_events`.
