#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const casesPagePath = path.join(repoRoot, "frontend", "pages", "CasesPage.jsx");

function pass(message) {
  return { pass: true, message };
}

function fail(message) {
  return { pass: false, message };
}

function expect(condition, message) {
  return condition ? pass(message) : fail(message);
}

function extractBetween(source, startNeedle, endNeedle) {
  const start = source.indexOf(startNeedle);

  if (start === -1) return "";

  const end = source.indexOf(endNeedle, start + startNeedle.length);

  if (end === -1) return source.slice(start);

  return source.slice(start, end);
}

function normalize(source = "") {
  return String(source).replace(/\s+/g, " ").trim();
}

const sourceExists = existsSync(casesPagePath);
const source = sourceExists ? readFileSync(casesPagePath, "utf8") : "";
const displayModelBlock = extractBetween(
  source,
  "const trialStatusDisplay = React.useMemo(() => {",
  "// Derived only; not wired into the UI yet."
);
const renderBlock = extractBetween(
  source,
  "{hasWorkspaceIdentity && trialStatusDisplay && (",
  "{hasWorkspaceIdentity && ("
);
const trialStatusArea = normalize(`${displayModelBlock}\n${renderBlock}`);

const requiredStrings = [
  "7-Day Pilot",
  "Day",
  "of 7",
  "Cases created",
  "7-Day Pilot active",
  "Pilot guide",
  "Use this workspace to run real cases during the 7-day pilot.",
  "Progress is tracked by cases created and evidence captured.",
  "The Result page is the entry point; Cases is the control surface.",
  "Keep each case small, real, and evidence-backed.",
];

const forbiddenTrialAreaStrings = [
  "$9",
  "$29",
  "payment",
  "checkout",
  "Stripe",
  "View 7-day pilot summary",
  "summary payment",
  "Pay",
];

const checks = [
  expect(sourceExists, "CasesPage.jsx should exist"),
  expect(displayModelBlock.length > 0, "trial status display model block should be found"),
  expect(renderBlock.length > 0, "trial status render block should be found"),
  ...requiredStrings.map((requiredString) =>
    expect(
      trialStatusArea.includes(requiredString),
      `trial status area includes: ${requiredString}`
    )
  ),
  expect(
    displayModelBlock.includes("getTrialSession()"),
    "trial status display model uses getTrialSession()"
  ),
  ...forbiddenTrialAreaStrings.map((forbiddenString) =>
    expect(
      !trialStatusArea.includes(forbiddenString),
      `trial status area does not include forbidden CTA/copy: ${forbiddenString}`
    )
  ),
];

const failed = checks.filter((check) => !check.pass);

console.log("\nNimclea CasesPage 7-Day Trial Status Bar Guard v0.1\n");

for (const check of checks) {
  console.log(`${check.pass ? "PASS" : "FAIL"} ${check.message}`);
}

if (failed.length > 0) {
  console.error(
    `\nFAIL: ${failed.length}/${checks.length} CasesPage trial status bar checks failed.`
  );
  process.exit(1);
}

console.log(
  `\nPASS: ${checks.length}/${checks.length} CasesPage trial status bar checks passed.`
);
