#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const pilotSetupPath = path.join(repoRoot, "frontend", "PilotSetupPage.jsx");
const buildTrialStatusPath = path.join(repoRoot, "backend", "utils", "buildTrialStatus.js");

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

function extractBetween(source = "", startNeedle = "", endNeedle = "") {
  const start = source.indexOf(startNeedle);

  if (start === -1) return "";

  const end = source.indexOf(endNeedle, start + startNeedle.length);

  if (end === -1) return source.slice(start);

  return source.slice(start, end);
}

const pilotSetupExists = existsSync(pilotSetupPath);
const buildTrialStatusExists = existsSync(buildTrialStatusPath);
const pilotSetupSource = pilotSetupExists ? readFileSync(pilotSetupPath, "utf8") : "";
const buildTrialStatusSource = buildTrialStatusExists
  ? readFileSync(buildTrialStatusPath, "utf8")
  : "";
const normalizedPilotSetup = normalize(pilotSetupSource);
const normalizedBuildTrialStatus = normalize(buildTrialStatusSource);
const missingSessionBlock = extractBetween(
  pilotSetupSource,
  "if (",
  "let mergedTrialSession = existingTrialSession;"
);
const normalizedMissingSessionBlock = normalize(missingSessionBlock);
const checks = [
  expect(pilotSetupExists, "PilotSetupPage.jsx should exist"),
  expect(buildTrialStatusExists, "buildTrialStatus.js should exist"),
  expect(
    !pilotSetupSource.includes("trialId: `case_${resolvedCaseId}`") &&
      !pilotSetupSource.includes('trialId: "case_') &&
      !pilotSetupSource.includes("trialId: 'case_"),
    "PilotSetupPage must not create fake case_ trial IDs"
  ),
  expect(
    pilotSetupSource.includes("const hasStartedTrialSession ="),
    "PilotSetupPage defines hasStartedTrialSession"
  ),
  expect(
    !normalizedPilotSetup.includes("if (isCaseFlowSubmission) { mergedTrialSession =") &&
      normalizedPilotSetup.includes("if (isCaseFlowSubmission && hasStartedTrialSession)"),
    "PilotSetupPage does not unconditionally skip startTrial for case flow"
  ),
  expect(
    normalizedMissingSessionBlock.includes("registerTrialUser({") &&
      normalizedMissingSessionBlock.includes("isCaseFlowSubmission") &&
      normalizedMissingSessionBlock.includes("setTrialSession(existingTrialSession)") &&
      normalizedMissingSessionBlock.includes('localStorage.setItem("stableUserId", existingTrialSession.userId)'),
    "PilotSetupPage registers a real trial before first case-flow start when session is missing/fallback/mismatched"
  ),
  expect(
    buildTrialStatusSource.includes("TRIAL_START_GRACE_MS"),
    "buildTrialStatus keeps TRIAL_START_GRACE_MS"
  ),
  expect(
    normalizedBuildTrialStatus.includes("nowMs + TRIAL_START_GRACE_MS < startMs"),
    "buildTrialStatus uses grace window in futureTrial calculation"
  ),
];

const failed = checks.filter((check) => !check.pass);

console.log("\nNimclea Trial Supabase Authority Contract Guard v0.1\n");

for (const check of checks) {
  console.log(`${check.pass ? "PASS" : "FAIL"} ${check.message}`);
}

if (failed.length > 0) {
  console.error(
    `\nFAIL: ${failed.length}/${checks.length} trial Supabase authority checks failed.`
  );
  process.exit(1);
}

console.log(
  `\nPASS: ${checks.length}/${checks.length} trial Supabase authority checks passed.`
);
