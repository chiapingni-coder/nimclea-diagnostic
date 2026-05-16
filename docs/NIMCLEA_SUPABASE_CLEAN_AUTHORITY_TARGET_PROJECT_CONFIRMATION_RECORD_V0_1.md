# NIMCLEA Supabase Clean Authority Target Project Confirmation Record v0.1

## Purpose

This record confirms the target Supabase project before applying the clean authority migration.

It must not contain Supabase service role keys, anon keys, passwords, or database connection strings.

## Current Status

Supabase CLI is not currently available in this repo environment.

`supabase/config.toml` does not exist.

The repo only contains Supabase environment variable examples:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

No real Supabase secret values should be committed.

## Migration Candidate

`supabase/migrations/20260516000100_create_nimclea_clean_authority_tables.sql`

## Preflight A Result

Migration draft guard: PASS

Migration SHA256:

`63F548C3E93AD45B60B7D2A81DDCC2BD85E6BF8A140A349773A5311AB57DB7FA`

Destructive statement scan: no real destructive SQL found.

The matched `delete` terms are service_role grants, not `DELETE FROM` statements.

## Target Project Confirmation

Fill manually before live apply.

- Supabase project name: nimclea-db
- Supabase project ref: nljnzjewucymgjvpmqfw
- Environment: test
- Confirmed by: BINGNI XIA
- Confirmation date: 2026-05-16
- Apply method: Dashboard SQL Editor 

## Do Not Include

Do not paste or commit:

- service role key
- anon key
- database password
- full database connection string
- JWT secret
- API secret

## Stop Conditions

Stop if:

- project name is uncertain
- project ref is uncertain
- environment is uncertain
- dashboard account is uncertain
- migration hash differs from the Preflight A hash
- release gate has FAIL
- migration guard fails

## Decision

The clean authority migration must not be applied until the target Supabase project and environment are confirmed in this record.

