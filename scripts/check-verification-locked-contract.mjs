#!/usr/bin/env node

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const verificationPagePath = path.join(repoRoot, "frontend", "pages", "VerificationPage.jsx");
const source = readFileSync(verificationPagePath, "utf8");

function pass(message) {
  return { pass: true, message };
}

function fail(message) {
  return { pass: false, message };
}

function expect(condition, message) {
  return condition ? pass(message) : fail(message);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findPhraseWindows(phrases, windowSize = 220) {
  const windows = [];

  for (const phrase of phrases) {
    const pattern = new RegExp(escapeRegExp(phrase), "gi");
    let match;

    while ((match = pattern.exec(source)) !== null) {
      const start = Math.max(0, match.index - windowSize);
      const end = Math.min(source.length, match.index + phrase.length + windowSize);
      windows.push({
        phrase,
        context: source.slice(start, end),
      });
    }
  }

  return windows;
}

const lockedLanguagePatterns = [
  /FORMAL VERIFICATION NOT YET ISSUABLE/i,
  /Formal verification is not active yet/i,
  /FORMAL VERIFICATION BLOCKED/i,
  /not\s+(?:yet\s+)?issuable/i,
  /verification\s+(?:is\s+)?(?:locked|not\s+active|blocked)/i,
];

const caseIdFromUrlPattern = /(?:URLSearchParams|verificationUrlParams)[\s\S]{0,250}\.get\(\s*["']caseId["']\s*\)/;
const caseIdFromRouteStatePattern = /location\.state\?\.(?:caseId|caseData\?\.caseId)/;

const guardedEligibilityPattern =
  /(canStartFormalVerification|verificationEligible|finalOverallStatus\s*===\s*["']Verification Ready["']|receiptDecisionStatus\s*===\s*["']Verified["'])/;

const forbiddenSuccessPhrases = [
  "FORMAL VERIFICATION ISSUED",
  "VERIFICATION PASSED",
];

const forbiddenSuccessWindows = findPhraseWindows(forbiddenSuccessPhrases);
const unguardedForbiddenSuccessWindows = forbiddenSuccessWindows.filter(
  ({ context }) => !guardedEligibilityPattern.test(context)
);

const standaloneVerifiedPattern = /(?<![A-Za-z])["']Verified["'](?![A-Za-z])/g;
const unguardedStandaloneVerifiedWindows = findPhraseWindows(["\"Verified\"", "'Verified'"]).filter(
  ({ context }) => !guardedEligibilityPattern.test(context)
);

const checks = [
  expect(
    lockedLanguagePatterns.some((pattern) => pattern.test(source)),
    "VerificationPage should contain locked / not-ready verification language"
  ),
  expect(
    unguardedForbiddenSuccessWindows.length === 0,
    "VerificationPage should not contain unguarded issued/passed success wording"
  ),
  expect(
    !standaloneVerifiedPattern.test(source) || unguardedStandaloneVerifiedWindows.length === 0,
    'standalone "Verified" wording should be guarded by eligibility/status logic'
  ),
  expect(
    caseIdFromUrlPattern.test(source) || caseIdFromRouteStatePattern.test(source),
    "VerificationPage should keep deriving caseId from the URL or route state"
  ),
];

const failed = checks.filter((check) => !check.pass);

console.log("\nNimclea Verification Locked Page Contract Guard v0.1\n");

for (const check of checks) {
  console.log(`${check.pass ? "PASS" : "FAIL"} ${check.message}`);
}

if (unguardedForbiddenSuccessWindows.length > 0) {
  console.error("\nUnguarded success wording found:");
  for (const { phrase } of unguardedForbiddenSuccessWindows) {
    console.error(`- ${phrase}`);
  }
}

if (unguardedStandaloneVerifiedWindows.length > 0) {
  console.error('\nUnguarded standalone "Verified" wording found.');
}

if (failed.length > 0) {
  console.error(`\nFAIL: ${failed.length}/${checks.length} verification locked contract checks failed.`);
  process.exit(1);
}

console.log(`\nPASS: ${checks.length}/${checks.length} verification locked contract checks passed.`);
