#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const contractDocPath = path.join(
  repoRoot,
  "docs",
  "NIMCLEA_7_DAY_TRIAL_LIFECYCLE_CONTRACT_V0_1.md"
);
const resultPagePath = path.join(repoRoot, "frontend", "pages", "ResultPage.jsx");

const contractDocExists = existsSync(contractDocPath);
const contractDoc = contractDocExists ? readFileSync(contractDocPath, "utf8") : "";
const resultPage = readFileSync(resultPagePath, "utf8");

function pass(message) {
  return { pass: true, message };
}

function fail(message) {
  return { pass: false, message };
}

function expect(condition, message) {
  return condition ? pass(message) : fail(message);
}

function containsAll(source, requiredTerms) {
  return requiredTerms.every((term) => source.includes(term));
}

function getConstBlock(source, constName) {
  const startPattern = new RegExp(`const\\s+${constName}\\s*=`);
  const startMatch = source.match(startPattern);

  if (!startMatch || startMatch.index === undefined) return "";

  const start = startMatch.index;
  const nextConst = source.slice(start + startMatch[0].length).search(/\nconst\s+/);

  if (nextConst === -1) return source.slice(start);

  return source.slice(start, start + startMatch[0].length + nextConst);
}

const exactStatusLine = "7-day pilot: Day X of 7 · N cases created";
const splitStatusExamplePattern =
  /Trial Day X of 7[\s\S]{0,160}Cases created:\s*N/i;

const directBareStableCasePattern =
  /const\s+hasStableCaseContext\s*=\s*isValidCaseId\s*\(\s*resolvedCaseId\s*\)/;
const workspaceContextBlock = getConstBlock(resultPage, "hasStableCaseContext");
const legacyWorkspaceContextBlock = getConstBlock(resultPage, "isWorkspaceCaseContext");
const contextBlocks = `${workspaceContextBlock}\n${legacyWorkspaceContextBlock}`;
const bareHasCaseIdForcesWorkspacePattern =
  /hasCaseIdInUrl(?![\s\S]{0,120}(?:resultIdentityStable|isCaseReview|workspace|caseReview|caseItem|from))/;

const pilotCtaCaseIdRoutingPattern =
  /handleStartPilot[\s\S]{0,9000}?ROUTES\.PILOT[\s\S]{0,300}?caseId=\$\{encodeURIComponent\(resolvedCaseId\)\}[\s\S]{0,600}?caseId:\s*resolvedCaseId/;

const checks = [
  expect(
    contractDocExists,
    "required 7-day trial lifecycle contract doc should exist"
  ),
  expect(
    containsAll(contractDoc, [
      "Start 7-day pilot",
      "7-day trial explanation",
      "normal diagnostic result page",
    ]),
    "contract doc should define first ResultPage as normal ResultPage plus lightweight trial opening"
  ),
  expect(
    containsAll(contractDoc, ["Start 7-day pilot", "Start a case", "Case Plan"]),
    "contract doc should define first-case and later-case CTA labels"
  ),
  expect(
    contractDoc.includes(exactStatusLine),
    "contract doc should contain the intended single-line CasesPage status bar"
  ),
  expect(
    !splitStatusExamplePattern.test(contractDoc),
    "contract doc should not suggest split trial day / cases-created display lines"
  ),
  expect(
    !directBareStableCasePattern.test(resultPage),
    "ResultPage should not treat a valid generated caseId alone as stable case context"
  ),
  expect(
    !bareHasCaseIdForcesWorkspacePattern.test(contextBlocks),
    "bare hasCaseIdInUrl should not force workspace/case-review context"
  ),
  expect(
    resultPage.includes("showPilotCtas") &&
      resultPage.includes("onStartPilot") &&
      pilotCtaCaseIdRoutingPattern.test(resultPage),
    "first-run pilot CTA path should remain present and carry caseId into Case Plan"
  ),
  expect(
    containsAll(contractDoc, [
      "PilotResultPage",
      "one individual case",
      "not the global 7-day pilot summary",
    ]),
    "contract doc should define PilotResultPage as a single-case summary, not the global trial summary"
  ),
];

const failed = checks.filter((check) => !check.pass);

console.log("\nNimclea 7-Day Trial Lifecycle Contract Guard v0.1\n");

for (const check of checks) {
  console.log(`${check.pass ? "PASS" : "FAIL"} ${check.message}`);
}

if (failed.length > 0) {
  console.error(`\nFAIL: ${failed.length}/${checks.length} 7-day trial lifecycle checks failed.`);
  process.exit(1);
}

console.log(`\nPASS: ${checks.length}/${checks.length} 7-day trial lifecycle checks passed.`);
