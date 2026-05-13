#!/usr/bin/env node

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const receiptPagePath = path.join(repoRoot, "frontend", "pages", "ReceiptPage.jsx");
const source = readFileSync(receiptPagePath, "utf8");

function pass(message) {
  return { pass: true, message };
}

function fail(message) {
  return { pass: false, message };
}

function expect(condition, message) {
  return condition ? pass(message) : fail(message);
}

const receiptCtaBlockMatch = source.match(
  /const receiptCtaLabel = !receiptEligible[\s\S]*?: "Open Verification";/
);
const receiptCtaBlock = receiptCtaBlockMatch?.[0] || "";

const earlyNotReadyPilotReroutePattern =
  /if\s*\(\s*!receiptEligible\s*\)\s*{[\s\S]{0,500}?ROUTES\.PILOT_RESULT/;
const verificationNavigationPattern =
  /navigate\(\s*`\$\{ROUTES\.VERIFICATION\}\$\{location\.search \|\| ""\}`[\s\S]{0,700}?caseId:\s*inferredCaseId/;

const checks = [
  expect(
    receiptCtaBlock.includes('? "Verification"'),
    'not-ready receipt CTA should use the simple label "Verification"'
  ),
  expect(
    !receiptCtaBlock.includes("View Verification Status"),
    'not-ready receipt CTA should not use "View Verification Status"'
  ),
  expect(
    !receiptCtaBlock.includes("Improve Record to Issue Receipt"),
    'not-ready receipt CTA should not use "Improve Record to Issue Receipt"'
  ),
  expect(
    verificationNavigationPattern.test(source),
    "ReceiptPage should navigate to Verification with inferredCaseId in state"
  ),
  expect(
    !earlyNotReadyPilotReroutePattern.test(source),
    "ReceiptPage should not contain an early !receiptEligible reroute to Pilot Result"
  ),
];

const failed = checks.filter((check) => !check.pass);

console.log("\nNimclea Receipt -> Verification Access Contract Guard v0.1\n");

for (const check of checks) {
  console.log(`${check.pass ? "PASS" : "FAIL"} ${check.message}`);
}

if (failed.length > 0) {
  console.error(`\nFAIL: ${failed.length}/${checks.length} receipt verification access checks failed.`);
  process.exit(1);
}

console.log(`\nPASS: ${checks.length}/${checks.length} receipt verification access checks passed.`);

