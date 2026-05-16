#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const questionsPath = path.join(repoRoot, "frontend", "questions.js");

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

function extractQ1Block(source = "") {
  const start = source.indexOf('id: "Q1"');
  if (start === -1) return "";

  const end = source.indexOf('id: "Q2"', start);
  if (end === -1) return source.slice(start);

  return source.slice(start, end);
}

const sourceExists = existsSync(questionsPath);
const source = sourceExists ? readFileSync(questionsPath, "utf8") : "";
const q1Block = extractQ1Block(source);
const normalizedQ1Block = normalize(q1Block);
const finalOptionMatch = q1Block.match(/\{\s*value:\s*"none_of_the_above"[\s\S]*?label:\s*"([^"]+)"/);
const finalOptionLabel = finalOptionMatch?.[1] || "";

const checks = [
  expect(sourceExists, "frontend/questions.js should exist"),
  expect(q1Block.length > 0, "Q1 block should be found"),
  expect(
    normalizedQ1Block.includes('type: "single_select"'),
    'Q1 still uses type: "single_select"'
  ),
  expect(
    q1Block.includes("Which situation best describes the primary reason"),
    "Q1 prompt contains primary reason wording"
  ),
  expect(
    !q1Block.includes("any of the following"),
    'Q1 prompt does not contain "any of the following"'
  ),
  expect(
    finalOptionLabel.includes("No active external pressure at this time"),
    "Q1 final visible option label contains no-active-pressure wording"
  ),
  expect(
    !finalOptionLabel.includes("None of the above"),
    'Q1 final visible option label does not contain "None of the above"'
  ),
];

const failed = checks.filter((check) => !check.pass);

console.log("\nNimclea Diagnostic Q1 Primary Pressure Guard v0.1\n");

for (const check of checks) {
  console.log(`${check.pass ? "PASS" : "FAIL"} ${check.message}`);
}

if (failed.length > 0) {
  console.error(
    `\nFAIL: ${failed.length}/${checks.length} Diagnostic Q1 checks failed.`
  );
  process.exit(1);
}

console.log(`\nPASS: ${checks.length}/${checks.length} Diagnostic Q1 checks passed.`);
