# Nimclea Trial Persistence Risk Note v0.1

## Purpose

Record the current persistence risk for trial and user lifecycle records written under `backend/data/*.json` on Render.

This note is documentation-only. It does not change app logic.

## 1. Observed Evidence

- `/trial-status?email=xiabingni%40gmail.com` became active after register/start.
- After redeploy, `/trial-status?email=xiabingni%40gmail.com` returned `source: none` again.

## 2. Root Cause

- Trial records are runtime writes to `backend/data/trials.json`.
- Render's default filesystem is ephemeral unless the service uses Persistent Disk or durable database storage.
- A redeploy can reset or replace runtime-written JSON files, causing lifecycle state to disappear.

## 3. Affected Records

The same durability risk applies to runtime-written lifecycle files, including:

- `trials.json`
- `users.json`
- `cases.json`
- `deletedCases.json`
- `paymentRecords.json` if used
- `subscriptionRecords.json` if used

## 4. Recommended Fix

Preferred fix:

- Migrate trial lifecycle authority to Supabase or another durable database.

Temporary bridge:

- Configure Render Persistent Disk for `backend/data` if database migration cannot happen immediately.

## 5. Release Implication

- Write-once trial start logic protects trial start only after durable storage exists.
- File-based storage is not safe for production lifecycle state.
- Until durable storage is in place, trial status, user identity, case records, deleted-case tombstones, and payment/subscription state can regress after redeploy.

## 6. Minimal Implementation Plan

1. Choose durable authority for trial lifecycle records.
2. If using Supabase, create or confirm tables for users, trials, cases, deleted cases, payments, and subscriptions.
3. Update write paths so register/start/delete/payment lifecycle changes persist to the durable authority.
4. Update read paths so `/trial-status` and `/cases` use the durable authority first.
5. Keep JSON files only as local development fallback or deploy-time cache, not production source of truth.
6. Run register/start/redeploy smoke to confirm `/trial-status` remains stable after redeploy.
