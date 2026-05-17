# Nimclea Supabase Identity Mapping Decision v0.1

## Purpose

Define the identity mapping rules that must be accepted before any clean Supabase migration candidate can proceed.

## 1. Primary Identity Authority for Nimclea Users

The primary identity authority for Nimclea users is the backend-authenticated customer identity, represented by a stable backend customer record rather than by frontend-only session state.

## 2. Relationship Between `email`, `userId`, `caseId`, and `caseRecord`

- `email` is the human-readable contact identifier.
- `userId` is the current application-facing user identifier used by existing flows.
- `caseId` is the stable case record identifier.
- `caseRecord` is the persisted case object tied to a case identifier and may carry derived or historical identifiers.

Before migration, `email` and `userId` may both appear in local records, but they are not interchangeable authority sources. A case record may reference either one, but the backend must resolve them to a single authoritative customer identity before clean authority writes are introduced.

## 3. How Existing Local JSON Records Should Be Interpreted Before Migration

Existing local JSON records should be treated as transitional, user-facing source material.

- They may contain legacy duplicates or mixed identity references.
- They should be read as fallback state only.
- They must not be assumed to be the final authoritative mapping for clean Supabase writes.
- They should be normalized before any clean authority migration candidate is authored.

## 4. Which Identifiers Are Allowed in Frontend State

Allowed in frontend state:

- `email`
- `userId`
- `caseId`
- `trialId`
- `caseRecord` references

Frontend state may carry these identifiers for display, routing, and transitional fallback behavior, but it must not invent authority from them.

## 5. Which Identifiers Must Be Backend-Authoritative Only

Backend-authoritative only:

- canonical `customer_id`
- canonical clean Supabase record identifiers
- authoritative clean table foreign keys
- any identity join that determines which clean Supabase row is read or written

These identifiers must be resolved by the backend and must not be sourced from frontend state alone.

## 6. Risks If Identity Mapping Is Skipped

- Duplicate records may be written under mismatched identities.
- Clean authority rows may attach to the wrong customer.
- Read paths may select the wrong case or trial record.
- Route fallbacks may mask schema issues during transition.
- Migration candidate execution may become unsafe or ambiguous.

## 7. Explicit Stop Line

Do not proceed to a migration candidate until this decision is accepted.
