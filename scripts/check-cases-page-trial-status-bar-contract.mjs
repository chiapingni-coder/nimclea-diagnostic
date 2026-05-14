#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const contractPath = path.join(
  repoRoot,
  "docs",
  "NIMCLEA_CASES_PAGE_TRIAL_STATUS_BAR_CONTRACT_V0_1.md"
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
    .replace(/[`*_"]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const contractExists = existsSync(contractPath);
const source = contractExists ? readFileSync(contractPath, "utf8") : "";
const normalizedSource = normalize(source);

function containsRequiredPhrase(phrase) {
  if (
    phrase === "does not control verification eligibility" &&
    containsRequiredPhrase("does not control receipt readiness, verification eligibility")
  ) {
    return true;
  }

  if (
    phrase === "does not control payment activation" &&
    containsRequiredPhrase("does not control receipt readiness, verification eligibility, or payment activation")
  ) {
    return true;
  }

  return normalizedSource.includes(normalize(phrase));
}

const displayPhrases = [
  "Trial Day X of 7",
  "Cases created: N",
  "same line",
  "one line",
  "Do not split them into two rows",
  "lightweight",
  "progress indicator",
  "not a warning",
];

const ownershipPhrases = [
  "CasesPage",
  "workspace-level",
  "pilot/workspace-level",
  "not part of a single case card",
  "not inside individual case cards",
  "does not replace PilotResultPage",
  "does not replace the future pilot-level summary entry",
  "does not control receipt readiness",
  "does not control verification eligibility",
  "does not control payment activation",
];

const visibilityPhrases = [
  "Show during the active 7-day trial",
  "Show after the first trial has started",
  "Do not show before the user starts the 7-day pilot",
  "Do not show as a special ResultPage state",
  "Do not show inside individual case cards",
  "Do not show as a replacement for case status labels",
];

const trialDayPhrases = [
  "trial start timestamp",
  "backend-owned trial state",
  "should not be guessed from local-only UI state",
  "bounded from 1 to 7",
  "Expired trial behavior should be handled by the trial lifecycle / summary entry contract",
];

const caseCountPhrases = [
  "Cases created: N",
  "trial/workspace context",
  "CasesPage case aggregation",
  "archived/deleted cases",
  "evidence event count",
  "receipt count",
  "paid verification count",
];

const nonGoalPhrases = [
  "shallow green 7-day pilot summary entry",
  "$9 / $29 payment rules",
  "receipt readiness",
  "verification unlock",
  "Stripe checkout",
  "backend trial expiration enforcement",
  "runtime fixture tests",
];

const riskCasePhrases = [
  "trial progress shown inside each case card",
  "Trial Day and Cases created split into two rows",
  "oversized banner",
  "payment warning",
  "single case status",
  "case count confused with evidence/event count",
  "trial status shown before the user starts the 7-day pilot",
  "status bar replacing the final pilot-level summary entry",
];

const checks = [
  expect(contractExists, "CasesPage trial status bar contract doc should exist"),
  ...displayPhrases.map((phrase) =>
    expect(containsRequiredPhrase(phrase), `display phrase present: ${phrase}`)
  ),
  ...ownershipPhrases.map((phrase) =>
    expect(containsRequiredPhrase(phrase), `ownership phrase present: ${phrase}`)
  ),
  ...visibilityPhrases.map((phrase) =>
    expect(containsRequiredPhrase(phrase), `visibility phrase present: ${phrase}`)
  ),
  ...trialDayPhrases.map((phrase) =>
    expect(containsRequiredPhrase(phrase), `trial day principle present: ${phrase}`)
  ),
  ...caseCountPhrases.map((phrase) =>
    expect(containsRequiredPhrase(phrase), `case count principle present: ${phrase}`)
  ),
  ...nonGoalPhrases.map((phrase) =>
    expect(containsRequiredPhrase(phrase), `non-goal present: ${phrase}`)
  ),
  ...riskCasePhrases.map((phrase) =>
    expect(containsRequiredPhrase(phrase), `risk case present: ${phrase}`)
  ),
];

const failed = checks.filter((check) => !check.pass);

console.log("\nNimclea CasesPage Trial Status Bar Contract Guard v0.1\n");

for (const check of checks) {
  console.log(`${check.pass ? "PASS" : "FAIL"} ${check.message}`);
}

if (failed.length > 0) {
  console.error(
    `\nFAIL: ${failed.length}/${checks.length} CasesPage trial status bar contract checks failed.`
  );
  process.exit(1);
}

console.log(
  `\nPASS: ${checks.length}/${checks.length} CasesPage trial status bar contract checks passed.`
);
