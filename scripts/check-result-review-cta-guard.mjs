#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const resultPagePath = path.join(repoRoot, "frontend", "pages", "ResultPage.jsx");

function pass(message) {
  return { pass: true, message };
}

function fail(message) {
  return { pass: false, message };
}

function expect(condition, message) {
  return condition ? pass(message) : fail(message);
}

function normalize(source) {
  return String(source || "").replace(/\s+/g, " ").trim();
}

function extractBetween(source, startNeedle, endNeedle) {
  const start = source.indexOf(startNeedle);

  if (start === -1) return "";

  const end = source.indexOf(endNeedle, start + startNeedle.length);

  if (end === -1) return source.slice(start);

  return source.slice(start, end);
}

function extractConstExpression(source, constName) {
  const startNeedle = `const ${constName} =`;
  const start = source.indexOf(startNeedle);

  if (start === -1) return "";

  const nextConst = source.indexOf("\nconst ", start + startNeedle.length);

  if (nextConst === -1) return source.slice(start);

  return source.slice(start, nextConst);
}

const sourceExists = existsSync(resultPagePath);
const source = sourceExists ? readFileSync(resultPagePath, "utf8") : "";
const showPilotCtasBlock = extractConstExpression(source, "showPilotCtas");
const showContinueCasePlanCtaBlock = extractConstExpression(
  source,
  "showContinueCasePlanCta"
);
const hasStableCaseContextBlock = extractBetween(
  source,
  "const hasStableCaseContext = useMemo(() => {",
  "const isWorkspaceCaseContext = hasStableCaseContext;"
);

const normalizedShowPilotCtas = normalize(showPilotCtasBlock);
const normalizedShowContinueCasePlanCta = normalize(showContinueCasePlanCtaBlock);
const normalizedHasStableCaseContext = normalize(hasStableCaseContextBlock);

const casePilotStartedCall =
  "hasStartedPilotForCase(reviewCaseId || resolvedCaseId)";

const checks = [
  expect(sourceExists, "ResultPage.jsx should exist"),
  expect(
    source.includes("function hasStartedPilotForCase"),
    "ResultPage defines hasStartedPilotForCase helper"
  ),
  expect(
    normalizedShowPilotCtas.includes(`!${casePilotStartedCall}`),
    "showPilotCtas is suppressed after pilot has started for the case"
  ),
  expect(
    normalizedShowContinueCasePlanCta.includes("!isCaseReview"),
    "showContinueCasePlanCta is suppressed for ResultPage case review mode"
  ),
  expect(
    normalizedShowContinueCasePlanCta.includes(`!${casePilotStartedCall}`),
    "showContinueCasePlanCta is suppressed after pilot has started for the case"
  ),
  expect(
    !normalizedHasStableCaseContext.includes("hasStartedPilotForCase") &&
      !normalizedHasStableCaseContext.includes("nimclea_pilot_started_case_"),
    "pilot-started flag is not used to create hasStableCaseContext"
  ),
];

const failed = checks.filter((check) => !check.pass);

console.log("\nNimclea ResultPage Review CTA Guard v0.1\n");

for (const check of checks) {
  console.log(`${check.pass ? "PASS" : "FAIL"} ${check.message}`);
}

if (failed.length > 0) {
  console.error(
    `\nFAIL: ${failed.length}/${checks.length} ResultPage review CTA checks failed.`
  );
  process.exit(1);
}

console.log(
  `\nPASS: ${checks.length}/${checks.length} ResultPage review CTA checks passed.`
);
