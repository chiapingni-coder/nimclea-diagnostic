# Nimclea Supabase Migration Structure Plan v0.1

## 1. Title and Version

Document: Nimclea Supabase Migration Structure Plan

Version: v0.1

Status: Documentation-only structure plan. This document does not authorize SQL execution, database table creation, migration file creation, directory creation, backend endpoint changes, frontend behavior changes, production cutover, or commit activity.

## 2. Current Scan Result

Observed current state:

- No project-level `supabase/` directory was found.
- No project-level `supabase/migrations/` directory was found.
- Existing Supabase-related files are backend utility files, docs, and scripts only.
- SQL has not been executed.
- Database tables have not been created.
- Migration files have not been created.

This means the project does not currently have a dedicated Supabase migration structure.

## 3. Why No Migration File Should Be Created Yet

No migration file should be created until the clean authority SQL draft is converted into a concrete migration candidate through a separate review step.

The current accepted state remains:

- The SQL draft is documentation only.
- Identity mapping, role grants, RLS policies, backend write boundaries, constraints, indexes, and rollback planning still require migration-file review.
- Old Render JSON data remains test/dev data and should not be migrated.
- Any actual SQL execution must happen only after a separate migration file review pass.

Creating a migration file before that review would make the draft look executable before the project has approved the final structure, identity model, and execution boundary.

## 4. Proposed Migration Directory Structure

Proposed future structure:

```text
supabase/
supabase/migrations/
```

Optional future file:

```text
supabase/config.toml
```

`supabase/config.toml` should be added only if the project adopts a Supabase CLI workflow later. It should not be created as part of this documentation-only plan.

## 5. Proposed Naming Convention

Two possible future migration naming conventions are:

```text
supabase/migrations/YYYYMMDDHHMMSS_create_nimclea_clean_authority_tables.sql
```

or:

```text
supabase/migrations/001_create_nimclea_clean_authority_tables.sql
```

Preferred convention:

```text
supabase/migrations/YYYYMMDDHHMMSS_create_nimclea_clean_authority_tables.sql
```

Reason:

- Timestamped migration names are compatible with common Supabase CLI migration workflows.
- They preserve chronological ordering across multiple developers and future migration branches.
- They reduce ambiguity when more than one migration is prepared near the same release phase.
- They make later audit and rollback discussion easier because the migration filename records when the migration candidate was created.

The sequential `001_...` convention is simpler, but it is easier to collide or reorder incorrectly once parallel work begins.

## 6. What Must Not Happen Yet

- Do not create `supabase/`.
- Do not create `supabase/migrations/`.
- Do not create `supabase/config.toml`.
- Do not create migration files.
- Do not execute SQL.
- Do not create database tables.
- Do not change backend endpoints.
- Do not change frontend behavior.
- Do not migrate old Render JSON data.
- Do not connect production runtime behavior to the future clean Supabase authority database.

## 7. Acceptance Criteria

- The document records that no project-level `supabase/` directory currently exists.
- The document records that no project-level `supabase/migrations/` directory currently exists.
- The document records that existing Supabase-related files are backend utility files, docs, and scripts only.
- The document states that SQL has not been executed.
- The document states that database tables have not been created.
- The document states that migration files have not been created.
- The document proposes a future migration directory structure without creating it.
- The document recommends a preferred future migration naming convention and explains why.
- The document remains documentation-only.

## 8. Recommended Next Step

When the project is ready, request a separate migration-structure implementation step that creates only the approved directory structure. After that, request a separate migration-file preparation step that creates a reviewed migration candidate without executing it.
