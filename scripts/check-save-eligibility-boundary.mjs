#!/usr/bin/env node

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const caseRoutesPath = path.join(repoRoot, "backend", "routes", "caseRoutes.js");
const source = readFileSync(caseRoutesPath, "utf8");

function pass(message) {
  return { pass: true, message };
}

function fail(message) {
  return { pass: false, message };
}

function expect(condition, message) {
  return condition ? pass(message) : fail(message);
}

function extractSaveBlock() {
  const start = source.indexOf('router.post("/save"');

  if (start === -1) return "";

  const preferredEnd = source.indexOf('router.patch("/:caseId/title"', start);

  if (preferredEnd !== -1) {
    return source.slice(start, preferredEnd);
  }

  const nextRouteMatch = source.slice(start + 1).match(/\nrouter\./);

  if (!nextRouteMatch || nextRouteMatch.index === undefined) {
    return source.slice(start);
  }

  return source.slice(start, start + 1 + nextRouteMatch.index);
}

function extractMirrorCaseResultPayload(saveBlock) {
  const start = saveBlock.indexOf("mirrorCaseResultToSupabase({");

  if (start === -1) return "";

  const afterStart = start + "mirrorCaseResultToSupabase({".length;
  const end = saveBlock.indexOf("});", afterStart);

  if (end === -1) return saveBlock.slice(start);

  return saveBlock.slice(start, end);
}

const saveBlock = extractSaveBlock();
const mirrorCaseResultPayload = extractMirrorCaseResultPayload(saveBlock);

const forbiddenSaveBlockPatterns = [
  {
    pattern: /receiptEligible\s*=\s*false/,
    message: "POST /save should not default receiptEligible to false",
  },
  {
    pattern: /verificationEligible\s*=\s*false/,
    message: "POST /save should not default verificationEligible to false",
  },
  {
    pattern: /receiptEligible:\s*savedCase\.receiptEligible/,
    message: "POST /save should not mirror savedCase.receiptEligible unconditionally",
  },
  {
    pattern: /verificationEligible:\s*savedCase\.verificationEligible/,
    message: "POST /save should not mirror savedCase.verificationEligible unconditionally",
  },
];

const requiredSaveBlockSnippets = [
  {
    snippet: "const body = req.body || {};",
    message: "POST /save should use a sanitized body variable",
  },
  {
    snippet: "...safeBody",
    message: "POST /save should spread safeBody instead of raw req.body",
  },
  {
    snippet: "sanitizedCaseData",
    message: "POST /save should use sanitizedCaseData",
  },
  {
    snippet: "delete sanitizedCaseData.receiptEligible;",
    message: "POST /save should strip receiptEligible from caseData",
  },
  {
    snippet: "delete sanitizedCaseData.caseReceiptEligible;",
    message: "POST /save should strip caseReceiptEligible from caseData",
  },
  {
    snippet: "delete sanitizedCaseData.verificationEligible;",
    message: "POST /save should strip verificationEligible from caseData",
  },
  {
    snippet: "preservedReceiptEligible",
    message: "POST /save should preserve existing receipt eligibility only",
  },
  {
    snippet: "preservedVerificationEligible",
    message: "POST /save should preserve existing verification eligibility only",
  },
];

const checks = [
  expect(saveBlock.length > 0, 'should extract router.post("/save") block'),
  ...forbiddenSaveBlockPatterns.map(({ pattern, message }) =>
    expect(!pattern.test(saveBlock), message)
  ),
  expect(
    !mirrorCaseResultPayload.includes("...(req.body || {})"),
    "mirrorCaseResultToSupabase payload should not spread raw req.body"
  ),
  ...requiredSaveBlockSnippets.map(({ snippet, message }) =>
    expect(saveBlock.includes(snippet), message)
  ),
];

const failed = checks.filter((check) => !check.pass);

console.log("\nNimclea POST /save Eligibility Boundary Guard v0.1\n");

for (const check of checks) {
  console.log(`${check.pass ? "PASS" : "FAIL"} ${check.message}`);
}

if (failed.length > 0) {
  console.error(`\nFAIL: ${failed.length}/${checks.length} save eligibility boundary checks failed.`);
  process.exit(1);
}

console.log(`\nPASS: ${checks.length}/${checks.length} save eligibility boundary checks passed.`);
