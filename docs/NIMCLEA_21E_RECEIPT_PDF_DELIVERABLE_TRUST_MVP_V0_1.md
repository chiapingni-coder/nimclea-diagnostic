# Nimclea 21-E Receipt PDF Deliverable Trust MVP v0.1

## Purpose

This document defines the minimum professional structure required for the Receipt PDF export before limited real outreach. The PDF must read as a credible decision receipt, not an informal screen dump.

The scope is deliverable trust only. This work does not change scoring, receipt eligibility, payment, routing, or verification unlock behavior.

## Required PDF Sections

The exported Receipt PDF must include these sections in order:

- A. Header / brand block
- B. Receipt identity block
- C. Decision summary block
- D. Evidence status block
- E. Ledger / integrity block
- F. Footer disclaimer block

## Required Core Fields

The PDF must show these fields with visible values. If a value is not available, the PDF must show "Not available" or "Pending" instead of blank space.

- Case ID
- Case name or decision title
- Customer / organization if available
- Receipt status
- Decision readiness / receipt readiness status
- Evidence event count
- Baseline / receipt issued date if available
- Generated date
- Verification eligibility if available
- Hash / ledger reference if available

## Out of Scope

The following are intentionally out of scope for 21-E:

- Receipt scoring logic changes
- Receipt eligibility logic changes
- Payment logic changes
- Routing changes
- Verification unlock logic changes
- Full ReceiptPage redesign
- New binary logo assets
- Browser automation for the regression guard

## Manual Smoke Test Steps

1. Open a production Receipt page for a real case context.
2. Confirm the page still loads without changing receipt readiness, payment, routing, or verification behavior.
3. Click the receipt export control.
4. Confirm the generated PDF shows the Nimclea wordmark or existing approved logo.
5. Confirm the title reads "Nimclea Decision Receipt".
6. Confirm the subtitle reads "Evidence-backed decision record".
7. Confirm the document label reads "Receipt PDF".
8. Confirm Case ID and Generated date appear in the header.
9. Confirm each required core field is present and has a value, "Not available", or "Pending".
10. Confirm the Ledger / integrity block includes the hash or ledger reference field.
11. Confirm the footer disclaimer appears.

## Acceptance Criteria

- The Receipt PDF has a professional header with Nimclea branding.
- The Receipt PDF presents identity, decision, evidence, ledger, and disclaimer sections in the required order.
- Required fields do not render as blank space.
- The footer states that the receipt is not a legal opinion, audit opinion, or regulatory certification.
- The static guard script passes.
- The release gate runs the static guard.
