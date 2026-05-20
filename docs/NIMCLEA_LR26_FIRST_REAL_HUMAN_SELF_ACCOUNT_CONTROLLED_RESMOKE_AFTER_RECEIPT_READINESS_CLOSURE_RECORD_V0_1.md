# NIMCLEA LR26 FIRST REAL HUMAN SELF-ACCOUNT CONTROLLED RESMOKE AFTER RECEIPT READINESS CLOSURE RECORD

## Record ID

NIMCLEA_LR26_FIRST_REAL_HUMAN_SELF_ACCOUNT_CONTROLLED_RESMOKE_AFTER_RECEIPT_READINESS_CLOSURE_RECORD_V0_1

## Date

2026-05-20

## Purpose

This record captures the first real human founder self-account controlled resmoke after receipt readiness closure.

The purpose is to verify, without exposing the real email address and without creating duplicate case records, that an existing real founder browser account can resolve to an existing deployed case through the production API read path.

## Scope

- Area: First real human self-account controlled resmoke.
- Files inspected: none.
- Files changed: documentation only.
- Runtime behavior affected: none.
- Supabase Storage included: no.
- Payment provider included: no.
- New case creation included: no.

## Privacy Boundary

The real founder email address was not recorded in this document.

Only non-sensitive derived evidence was used:

- Email length.
- Whether the email existed in browser localStorage.
- Whether the email contained an at-sign.
- Whether the email contained a plus sign.
- Short SHA-256 hash prefixes for process comparison.
- API response shape and case-count evidence.

## Process Correction

An initial PowerShell `/cases?email=` check returned zero cases.

That zero-case result was not treated as a product failure because the browser email hash and PowerShell email hash did not match.

Observed process evidence:

- BrowserEmailLength: 19
- BrowserEmailHasAt: true
- BrowserEmailHasPlus: false
- BrowserEmailHashPrefix: e0a3a38cb68a
- PowerShellEmailHashPrefix: 182eca102e01
- Hash match: false

Conclusion: the initial PowerShell check used a different email from the browser session that displayed the existing case.

## Browser / Deployed API Evidence

After correcting the endpoint target to the deployed API base instead of a relative frontend path, the browser session produced the following non-sensitive evidence:

- EndpointUsed: https://nimclea-api.onrender.com
- HttpStatus: 200
- ResponseLooksHtml: false
- JsonParseOK: true
- CasesCountFromBrowserEmail: 1
- FirstCaseIdPresent: true
- ResponseIsArray: true
- EmailPrinted: false
- BrowserEmailLength: 19

The earlier relative-path browser fetch returned frontend HTML and caused a JSON parse error. That was classified as a test-script endpoint mistake, not a product failure.

## Result

Result: PASS WITH PROCESS CORRECTION

The existing real founder browser account resolved to one deployed case through the production API read path.

No new case was created.

The earlier zero-case PowerShell observation was explained by an email mismatch and is not evidence of a deployed `/cases?email=` failure.

## Claim Boundary

This record claims only:

- A real founder browser account with an existing case can resolve that case through the deployed `/cases?email=` API path.
- The deployed API returned JSON successfully.
- The response contained one case and a present case identifier.
- No duplicate case was created during this resmoke.

This record does not claim:

- Fresh no-case diagnostic intake PASS for the founder email.
- Payment provider readiness.
- Supabase Storage readiness.
- Receipt PDF export readiness.
- Arbitrary customer account readiness.
- Full customer launch readiness.

## Next Step

Proceed to the next controlled launch-readiness record only after this documentation-only PASS is protected by the release gate and pushed.
