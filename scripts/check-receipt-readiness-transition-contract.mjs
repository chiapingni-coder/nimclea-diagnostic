#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const contractPath = path.join(
  repoRoot,
  "docs",
  "NIMCLEA_RECEIPT_READINESS_TRANSITION_CONTRACT_V0_1.md"
);

function pass(message) {
  return { pass: true, message };
}

function fail(message) {
  return { pass: false, message };
}

function expect(condition, message) {
  return condition ? pass(message) : fail(message);
}

function normalize(value) {
  return String(value || "")
    .replace(/[`*_]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const contractExists = existsSync(contractPath);
const source = contractExists ? readFileSync(contractPath, "utf8") : "";
const normalizedSource = normalize(source);

function containsRequiredTerm(term) {
  return source.includes(term);
}

function containsRequiredPhrase(phrase) {
  return normalizedSource.includes(normalize(phrase));
}

const canonicalTransitionTerms = [
  "no_event",
  "event_captured",
  "receipt_ready",
  "receipt_checkout_started",
  "receipt_paid_or_activated",
  "verification_eligible",
];

const stateOwnershipTerms = [
  "eventCaptured",
  "eventCount",
  "receiptEligible",
  "receiptStatus",
  "stage",
  "paymentStatus",
  "paid",
  "verificationEligible",
];

const nonDowngradeRules = [
  "checkout_created must not downgrade receipt_ready",
  "paymentStatus must not overwrite receiptEligible",
  "paid=false must not mean receiptEligible=false",
  "missing payment must not erase readiness",
  "hydration loading must not briefly display insufficient state",
  "/cases aggregation must preserve receipt readiness",
  "ReceiptPage should not infer failure before hydration completes",
];

const riskCases = [
  "ready case becomes yellow after checkout_created",
  "paid receipt appears not ready",
  "event count exists but receipt card says insufficient",
  "frontend localStorage stale status conflicts with backend",
  "deep link loads ReceiptPage before backend hydration finishes",
  "/cases card and ReceiptPage disagree",
];

const checks = [
  expect(contractExists, "receipt readiness transition contract doc should exist"),
  ...canonicalTransitionTerms.map((term) =>
    expect(containsRequiredTerm(term), `canonical transition term present: ${term}`)
  ),
  ...stateOwnershipTerms.map((term) =>
    expect(containsRequiredTerm(term), `state ownership term present: ${term}`)
  ),
  ...nonDowngradeRules.map((phrase) =>
    expect(containsRequiredPhrase(phrase), `non-downgrade rule present: ${phrase}`)
  ),
  ...riskCases.map((phrase) =>
    expect(containsRequiredPhrase(phrase), `risk case present: ${phrase}`)
  ),
];

const failed = checks.filter((check) => !check.pass);

console.log("\nNimclea Receipt Readiness Transition Contract Guard v0.1\n");

for (const check of checks) {
  console.log(`${check.pass ? "PASS" : "FAIL"} ${check.message}`);
}

if (failed.length > 0) {
  console.error(
    `\nFAIL: ${failed.length}/${checks.length} receipt readiness transition contract checks failed.`
  );
  process.exit(1);
}

console.log(
  `\nPASS: ${checks.length}/${checks.length} receipt readiness transition contract checks passed.`
);
