#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const receiptPagePath = path.join(repoRoot, "frontend", "pages", "ReceiptPage.jsx");

function pass(message) {
  return { pass: true, message };
}

function fail(message) {
  return { pass: false, message };
}

function expect(condition, message) {
  return condition ? pass(message) : fail(message);
}

function normalize(source = "") {
  return String(source).replace(/\s+/g, " ").trim();
}

function extractConstExpression(source, constName) {
  const startNeedle = `const ${constName} =`;
  const start = source.indexOf(startNeedle);

  if (start === -1) return "";

  const nextConst = source.indexOf("\nconst ", start + startNeedle.length);

  if (nextConst === -1) return source.slice(start);

  return source.slice(start, nextConst);
}

const sourceExists = existsSync(receiptPagePath);
const source = sourceExists ? readFileSync(receiptPagePath, "utf8") : "";
const normalizedSource = normalize(source);
const receiptDisplayStateBlock = normalize(extractConstExpression(source, "receiptDisplayState"));
const buttonStateBlock = normalize(extractConstExpression(source, "buttonState"));

const requiredTokens = [
  "const receiptReadinessAuthoritative =",
  "const canRenderReceiptInsufficient =",
  "const visualDecisionStatus =",
  "const visualStatusTone =",
  "const receiptDisplayState =",
  "const buttonState =",
];

const checks = [
  expect(sourceExists, "ReceiptPage.jsx should exist"),
  ...requiredTokens.map((token) =>
    expect(source.includes(token), `required token exists: ${token}`)
  ),
  expect(
    receiptDisplayStateBlock.includes("canRenderReceiptInsufficient") &&
      receiptDisplayStateBlock.includes("? \"insufficient\""),
    'receiptDisplayState uses canRenderReceiptInsufficient for "insufficient"'
  ),
  expect(
    !receiptDisplayStateBlock.includes("hasPilotResultContext ? \"insufficient\"") &&
      !receiptDisplayStateBlock.includes(": hasPilotResultContext ? \"insufficient\""),
    'receiptDisplayState does not fall back from hasPilotResultContext to "insufficient"'
  ),
  expect(
    buttonStateBlock.includes('receiptDisplayState === "insufficient"') &&
      buttonStateBlock.includes('hasEvents ? "has_event_not_ready"') &&
      buttonStateBlock.includes(': "no_event"'),
    'buttonState only produces event-not-ready/no-event inside the insufficient branch'
  ),
  expect(
    !normalizedSource.includes(': hasEvents ? "has_event_not_ready"'),
    'buttonState does not use a direct hasEvents fallback to "has_event_not_ready"'
  ),
  expect(
    normalizedSource.includes("sanitizeText(visualDecisionStatus)") ||
      normalizedSource.includes("visualDecisionStatus).toUpperCase()"),
    "visible status rendering uses visualDecisionStatus"
  ),
  expect(
    !normalizedSource.includes('data.decisionStatus === "Insufficient Record"'),
    'visible decision status checks do not use data.decisionStatus === "Insufficient Record"'
  ),
  expect(
    !normalizedSource.includes('receiptEligible ? "text-emerald-700" : "text-amber-700"'),
    "text color branch does not use receiptEligible emerald/amber shortcut"
  ),
];

const failed = checks.filter((check) => !check.pass);

console.log("\nNimclea Receipt Readiness Visual Gate v0.1\n");

for (const check of checks) {
  console.log(`${check.pass ? "PASS" : "FAIL"} ${check.message}`);
}

if (failed.length > 0) {
  console.error(
    `\nFAIL: ${failed.length}/${checks.length} receipt readiness visual gate checks failed.`
  );
  process.exit(1);
}

console.log(
  `\nPASS: ${checks.length}/${checks.length} receipt readiness visual gate checks passed.`
);
