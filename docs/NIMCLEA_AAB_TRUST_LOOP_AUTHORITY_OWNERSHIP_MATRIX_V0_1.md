# Nimclea AAB Trust-Loop Authority Ownership Matrix v0.1

## Boundary Statement

AAB does not migrate Render JSON data into Supabase.

Render JSON remains legacy behavior reference only.

This document does not change runtime behavior.

This document does not authorize frontend direct writes to Supabase authority tables.

## Trust-Loop Chain

Diagnostic -> Case -> Event Capture / Event Review -> Receipt Readiness -> Payment -> PDF Export Unlock -> Verification Unlock

## Authority Ownership Matrix

| Trust-Loop State | User-Facing Meaning | Allowed Authority Source | Disallowed Authority Source | Backend Adapter Responsibility | Notes |
| --- | --- | --- | --- | --- | --- |
| case exists | A user has a persisted case visible through the case APIs. | backend case authority record; isolated Supabase rehearsal case record; legacy JSON only as behavior reference during rehearsal | frontend-only state, localStorage, imported Render JSON bulk data | read and normalize the authoritative case existence signal without changing the frontend API contract | Rehearsal may compare behavior against legacy JSON but must not migrate it. |
| case authority present | The case has enough backend-owned identity and lifecycle data to act as a canonical case. | backend case authority record with caseId/customer/email binding; isolated Supabase rehearsal data | local draft state, localStorage, query params, frontend-derived identity | expose a stable backend-derived case authority view | Required before trust-loop overlays are attached. |
| event captured | A user action or case event has been recorded by the backend. | backend event capture route; backend case event record; isolated Supabase rehearsal event record | frontend component state, browser cache, localStorage-only event lists | map event writes/reads to an adapter boundary while preserving event API shape | P0 rehearsal should be read-only unless isolated test records are used. |
| event reviewed | Event evidence has been included in backend-derived review context. | backend event review computation from case/event authority records | frontend-only review flags, localStorage, manually edited Render JSON import | provide backend-derived review state to case and trust-loop reads | Review state should be reproducible from authority records. |
| receipt ready | The case is eligible for formal receipt flow. | backend case/receipt authority; backend receipt readiness decision; isolated Supabase rehearsal record | localStorage, UI step completion, URL flags, imported Render JSON | surface receipt readiness as backend-derived state | Readiness may be displayed by frontend but not created by frontend UI state. |
| receipt issued | A formal receipt record/hash has been issued for the case. | backend receipt record; hash ledger authority; backend-confirmed receipt generation | localStorage, downloaded file presence, frontend PDF state | map issued receipt state and hash reference through backend adapter | Issued receipt should be tied to case authority. |
| payment pending | A checkout or payment flow has been created but not confirmed paid. | backend-created payment record; payment provider checkout/session state | localStorage, checkout return URL alone, frontend button state | distinguish pending from confirmed paid using backend/provider authority | Pending state must not unlock paid artifacts. |
| payment confirmed | Payment provider or backend webhook/confirmation confirms paid status. | Stripe/provider confirmation; backend payment record updated by trusted backend path | localStorage, query params, frontend success screen, manual JSON import | expose confirmed payment status through backend adapter | This is the payment authority for paid trust-loop transitions. |
| PDF export unlocked | User can export the formal PDF deliverable. | backend-confirmed payment or backend-confirmed entitlement | localStorage, frontend PDF generated flag, URL params, unverified receipt readiness | return PDF unlock only from backend-derived entitlement/payment state | PDF unlock must not rely on browser-only state. |
| verification eligible | The case is eligible to enter formal verification. | backend case/receipt/payment authority; backend eligibility computation | frontend-only eligibility flag, localStorage, imported Render JSON | map eligibility inputs and expose backend-derived eligibility state | Eligibility can depend on receipt/payment authority, not UI hints. |
| verification unlocked | User can access formal verification flow or deliverable. | backend-confirmed receipt/payment authority; backend verification record | localStorage, query params, frontend route state, payment success screen alone | expose unlock state only after backend authority confirms prerequisites | Verification unlock is downstream of receipt/payment authority. |
| pilot summary available | The backend has enough case/trial data to show pilot summary information. | backend trial/case/payment aggregation; isolated Supabase rehearsal data | frontend-only computed summary, localStorage, imported Render JSON | aggregate summary availability from backend-owned records | Availability is displayable by frontend, not authored by it. |
| pilot summary paid | Pilot summary/payment entitlement has been confirmed. | backend payment provider confirmation; backend subscription/payment record | localStorage, URL checkout success, frontend toggle, imported Render JSON | expose paid status from backend-confirmed payment or entitlement record | Paid summary status follows the same payment authority rules. |

## Hard Rules

- localStorage may only cache navigation hints, never payment/receipt/PDF/verification authority.
- frontend UI state may only display backend-derived authority, not create authority.
- payment confirmation must come from backend/payment provider authority.
- PDF export unlock must depend on backend-confirmed payment or backend-confirmed entitlement.
- verification unlock must depend on backend-confirmed receipt/payment authority.
- Supabase `service_role` must never be exposed to frontend.
- no Render JSON import into Supabase.

## AAB Rehearsal Acceptance

- authority owner identified for each trust-loop state
- adapter responsibility identified
- disallowed authority sources listed
- no runtime behavior changed
- release gate requires this document
