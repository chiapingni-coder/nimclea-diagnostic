#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const contractPath = path.join(
  repoRoot,
  "docs",
  "NIMCLEA_FRONTEND_TRIAL_STATUS_ADAPTER_CONTRACT_V0_1.md"
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

function hasPhrase(phrase) {
  return normalizedSource.includes(normalize(phrase));
}

function hasAny(phrases) {
  return phrases.some((phrase) => hasPhrase(phrase));
}

const adapterIdentityAnchors = [
  "getTrialStatusDisplayModel",
  "email",
  "frontend/lib/trialStatusApi.js",
  "frontend/lib/trialApi.js",
  "API_BASE",
];

const backendEndpointAnchors = [
  "GET /trial-status?email=...",
  "success",
  "error",
  "data",
  "trialActive",
  "trialStartedAt",
  "trialEndsAt",
  "trialDay",
  "trialEnded",
  "casesCreatedDuringTrial",
  "pilotSummaryAvailable",
  "pilotSummaryPaid",
  "shouldShowTrialStatusBar",
  "shouldShowPilotSummaryEntry",
  "source",
];

const safeDisplayModelAnchors = [
  "loading",
  "error",
  "trialActive",
  "trialDay",
  "trialEnded",
  "casesCreatedDuringTrial",
  "shouldShowTrialStatusBar",
  "shouldShowPilotSummaryEntry",
  "pilotSummaryAvailable",
  "pilotSummaryPaid",
  "source",
];

const conceptualChecks = [
  {
    message: "email boundary says CasesPage passes resolved email",
    phrases: [
      "CasesPage should pass the currently resolved email into the adapter",
      "receive the currently resolved email from CasesPage",
    ],
  },
  {
    message: "email boundary allows trim/lowercase for request hygiene",
    phrases: ["trim whitespace lowercase", "normalize email client-side for request hygiene"],
  },
  {
    message: "email boundary says backend remains authority",
    phrases: ["backend remains the authority"],
  },
  {
    message: "email boundary forbids invented identity",
    phrases: ["invent identity"],
  },
  {
    message: "email boundary forbids localStorage trial-state inference",
    phrases: ["infer trial state from localStorage"],
  },
  {
    message: "missing email returns safe hidden display model",
    phrases: ["missing email", "safe hidden display model"],
    requireAll: true,
  },
  {
    message: "API base follows existing frontend API base pattern",
    phrases: ["follow the existing frontend API base pattern"],
  },
  {
    message: "API base uses VITE_API_BASE_URL",
    phrases: ["VITE_API_BASE_URL"],
  },
  {
    message: "API base forbids hardcoded production Render URL",
    phrases: ["hardcode the production Render URL directly"],
  },
  {
    message: "API base forbids duplicated inconsistent base logic",
    phrases: ["duplicate inconsistent API base logic"],
  },
  {
    message: "failure handling defines missing email result",
    phrases: ["Missing email"],
  },
  {
    message: "failure handling defines network failure result",
    phrases: ["Network failure"],
  },
  {
    message: "failure handling defines backend success false result",
    phrases: ["Backend success=false", "Backend success false"],
  },
  {
    message: "failure handling defines malformed response result",
    phrases: ["Malformed response"],
  },
  {
    message: "failure handling defines backend success true result",
    phrases: ["Backend success=true", "Backend success true"],
  },
  {
    message: "failure states hide trial UI",
    phrases: ["failure states hide trial UI"],
  },
  {
    message: "adapter never fabricates trial day",
    phrases: ["must never fabricate trialDay", "should never fabricate trial day"],
  },
  {
    message: "adapter prefers hidden UI over guessed lifecycle state",
    phrases: ["hidden UI over guessed lifecycle state"],
  },
  {
    message: "loading should not flash incorrect trial UI",
    phrases: ["CasesPage should not flash incorrect trial UI while loading"],
  },
  {
    message: "loading hides bar or uses neutral placeholder only if approved",
    phrases: ["hide the bar while loading", "neutral placeholder only after a later UI step approves"],
    requireAll: true,
  },
  {
    message: "error should not block CasesPage rendering",
    phrases: ["error must not block CasesPage rendering", "error should not block CasesPage rendering"],
  },
  {
    message: "error should not change case card routing",
    phrases: ["change case card routing"],
  },
  {
    message: "error should not show trial summary entry",
    phrases: ["error must not show the trial summary entry", "error should not show trial summary entry"],
  },
  {
    message: "CasesPage may later display Trial Day X of 7",
    phrases: ["Trial Day X of 7"],
  },
  {
    message: "CasesPage may later display Cases created: N",
    phrases: ["Cases created: N"],
  },
  {
    message: "CasesPage may display pilot-level summary entry only when flag is true",
    phrases: ["pilot-level summary entry only when shouldShowPilotSummaryEntry is true"],
  },
  {
    message: "CasesPage must not calculate trial lifecycle itself",
    phrases: ["calculate trial lifecycle itself"],
  },
  {
    message: "CasesPage must not mutate trial status",
    phrases: ["mutate trial status"],
  },
  {
    message: "CasesPage must not alter case cards",
    phrases: ["alter case cards"],
  },
  {
    message: "CasesPage must not alter Detail buttons",
    phrases: ["alter Detail buttons"],
  },
  {
    message: "CasesPage must not alter foldout behavior",
    phrases: ["alter foldout behavior"],
  },
  {
    message: "CasesPage must not alter routes",
    phrases: ["alter routes"],
  },
  {
    message: "CasesPage must not alter payment state",
    phrases: ["alter payment state"],
  },
  {
    message: "CasesPage must not alter receipt behavior",
    phrases: ["alter receipt behavior"],
  },
  {
    message: "CasesPage must not alter verification behavior",
    phrases: ["alter verification behavior"],
  },
  {
    message: "CasesPage must not alter scoring behavior",
    phrases: ["alter scoring behavior"],
  },
  {
    message: "CasesPage must not alter /cases behavior",
    phrases: ["alter /cases behavior"],
  },
  {
    message: "CasesPage must not replace PilotResultPage",
    phrases: ["replace PilotResultPage"],
  },
  {
    message: "pilot summary flag is controlled by backend response",
    phrases: ["shouldShowPilotSummaryEntry is controlled by the backend response"],
  },
  {
    message: "frontend should not decide summary availability from PilotResultPage existence",
    phrases: ["should not decide summary availability from", "PilotResultPage existence"],
    requireAll: true,
  },
  {
    message: "summary entry is pilot-level entry on CasesPage",
    phrases: ["summary entry is a pilot-level entry on CasesPage"],
  },
  {
    message: "summary entry is not replacement for PilotResultPage",
    phrases: ["not a replacement for PilotResultPage"],
  },
  {
    message: "payment prompt disappearance is backend normalized paid/converted driven",
    phrases: ["driven by backend normalized paid / converted state later"],
  },
  {
    message: "payment prompt disappearance is not UI deletion",
    phrases: ["not by UI deletion"],
  },
  {
    message: "adapter ignores unexpected raw records",
    phrases: ["ignore unexpected raw records"],
  },
  {
    message: "adapter does not store raw records in localStorage",
    phrases: ["should not store raw records in localStorage"],
  },
  {
    message: "adapter does not expose backend errors directly",
    phrases: ["should not expose backend errors directly to user-facing UI"],
  },
  {
    message: "adapter only passes normalized display fields to CasesPage",
    phrases: ["only pass normalized display fields to CasesPage"],
  },
  {
    message: "recommended next step points to 16-A18",
    phrases: ["16-A18"],
  },
  {
    message: "recommended next step is implement frontend adapter only",
    phrases: ["implement frontend adapter only"],
  },
  {
    message: "recommended next step excludes CasesPage UI",
    phrases: ["add CasesPage UI", "connect CasesPage to /trial-status"],
  },
  {
    message: "recommended next step excludes trial status bar UI",
    phrases: ["no trial status bar UI", "add trial status bar UI"],
  },
];

const checks = [
  expect(contractExists, "frontend trial status adapter contract doc should exist"),
  ...adapterIdentityAnchors.map((anchor) =>
    expect(hasPhrase(anchor), `adapter identity anchor present: ${anchor}`)
  ),
  ...backendEndpointAnchors.map((anchor) =>
    expect(hasPhrase(anchor), `backend endpoint anchor present: ${anchor}`)
  ),
  ...safeDisplayModelAnchors.map((anchor) =>
    expect(hasPhrase(anchor), `safe display model anchor present: ${anchor}`)
  ),
  ...conceptualChecks.map((check) =>
    expect(
      check.requireAll
        ? check.phrases.every((phrase) => hasPhrase(phrase))
        : hasAny(check.phrases),
      check.message
    )
  ),
];

const failed = checks.filter((check) => !check.pass);

console.log("\nNimclea Frontend Trial Status Adapter Contract Guard v0.1\n");

for (const check of checks) {
  console.log(`${check.pass ? "PASS" : "FAIL"} ${check.message}`);
}

if (failed.length > 0) {
  console.error(
    `\nFAIL: ${failed.length}/${checks.length} frontend trial status adapter contract checks failed.`
  );
  process.exit(1);
}

console.log(
  `\nPASS: ${checks.length}/${checks.length} frontend trial status adapter contract checks passed.`
);
