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

const sourceExists = existsSync(receiptPagePath);
const source = sourceExists ? readFileSync(receiptPagePath, "utf8") : "";
const normalizedSource = normalize(source);

const checks = [
  expect(sourceExists, "ReceiptPage.jsx should exist"),
  expect(
    source.includes("Nimclea Decision Receipt"),
    'receipt PDF export contains "Nimclea Decision Receipt"'
  ),
  expect(
    source.includes("Evidence-backed decision record"),
    'receipt PDF export contains "Evidence-backed decision record"'
  ),
  expect(source.includes("Case ID"), 'receipt PDF export contains "Case ID"'),
  expect(
    source.includes("Receipt status"),
    'receipt PDF export contains "Receipt status"'
  ),
  expect(
    source.includes("Evidence event count"),
    'receipt PDF export contains "Evidence event count"'
  ),
  expect(
    source.includes("Ledger") || normalizedSource.toLowerCase().includes("hash"),
    'receipt PDF export contains "Ledger" or "hash"'
  ),
  expect(
    source.includes("This receipt summarizes the available case record at the time of generation"),
    "receipt PDF export contains durable footer disclaimer wording"
  ),
  expect(
    source.includes("buildReceiptPdfDeliverableHtml") &&
      source.includes("nimclea-decision-receipt.pdf"),
    "receipt PDF export uses the dedicated deliverable builder and filename"
  ),
];

const failed = checks.filter((check) => !check.pass);

console.log("\nNimclea Receipt PDF Deliverable Trust Guard v0.1\n");

for (const check of checks) {
  console.log(`${check.pass ? "PASS" : "FAIL"} ${check.message}`);
}

if (failed.length > 0) {
  console.error(
    `\nFAIL: ${failed.length}/${checks.length} receipt PDF deliverable checks failed.`
  );
  process.exit(1);
}

console.log(
  `\nPASS: ${checks.length}/${checks.length} receipt PDF deliverable checks passed.`
);
