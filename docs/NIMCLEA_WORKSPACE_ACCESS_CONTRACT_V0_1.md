# Nimclea Workspace Access Contract v0.1

## 1. Scope

This contract governs whether the Nimclea system is usable.

It controls:

- whether the customer can continue using Nimclea
- whether the customer can create new cases
- whether the customer can continue existing cases
- whether the customer can operate Receipt / Verification flows

## 2. Core Principle

Workspace access is the master gate.

Permission order:

1. Check workspace access first.
2. Then check case status.
3. Then check receipt / verification / payment nodes.

## 3. Workspace Active

If:

workspaceStatus = active

The system is usable.

The customer may:

- create new case
- continue existing case
- enter Case Plan
- view Result
- access available Receipt / Verification paths

Then the system may evaluate:

- case status
- receiptEligible
- verificationEligible
- paymentStatus
- pilotStatus

## 4. Workspace Expired

If:

workspaceStatus = expired

The system is not usable.

The customer may not:

- create new case
- continue existing case
- advance a case
- operate Receipt
- operate Verification

The system may show workspace renewal / restore access messaging.

## 5. $29 Boundary

$29 is a case-level paid action, such as:

- receipt activation
- formal receipt
- verification-related case action
- case-level paid action

It is not:

- workspace subscription
- continuous system access
- create new case permission
- a key to bypass workspace expired status

Rule:

Even if a customer paid $29 for a case-level action, if workspace is expired, the system is not usable until workspace is renewed.

## 6. $9 / Renewal Boundary

$9 may be used as a post-trial low-price renewal / workspace renewal entry.

The important rule is not the number itself.

The important rule is:

Does the payment make workspaceStatus active?

If payment makes workspace active:

- the system becomes usable
- the pilot-level light-green summary upsell entry automatically disappears

If workspace does not become active:

- the system remains unusable

## 7. Create New Case Permission

Create new case permission depends only on workspace access.

workspace active -> create new case allowed

workspace expired -> create new case not allowed

A prior $29 case-level payment must not grant create new case permission.

## 8. Forbidden Behavior

The system must not:

- use $29 to bypass workspace expired
- allow existing case operation while workspace expired
- allow create new case while workspace expired
- treat case-level payment as workspace subscription
- mix pilot summary exit entry logic with workspace access
- check case permissions before workspace access

## 9. One-Sentence Contract

Nimclea usability is governed first by workspace access. Workspace active means the system is usable; workspace expired means the system is not usable until renewed. A $29 case-level paid action does not bypass workspace expiration and does not grant create new case permission.
