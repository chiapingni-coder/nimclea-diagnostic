#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const contractPath = path.join(
  repoRoot,
  "docs",
  "NIMCLEA_BACKEND_TRIAL_STATUS_ENDPOINT_CONTRACT_V0_1.md"
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

const endpointAnchors = [
  "GET /trial-status?email=...",
  "email",
  "userId",
  "Required current input",
  "Optional future input",
];

const successResponseAnchors = [
  "success: true",
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

const safeFailureAnchors = [
  "success: false",
  "error",
  "email_required",
  "safe default",
  "trialActive: false",
  "trialStartedAt: null",
  "trialEndsAt: null",
  "trialDay: null",
  "trialEnded: false",
  "casesCreatedDuringTrial: 0",
  "pilotSummaryAvailable: false",
  "pilotSummaryPaid: false",
  "shouldShowTrialStatusBar: false",
  "shouldShowPilotSummaryEntry: false",
  "source: none",
];

const conceptualChecks = [
  {
    message: "data sources should use trials.json / trial lifecycle records as primary lifecycle source",
    phrases: ["trials.json / trial lifecycle records as primary lifecycle source"],
  },
  {
    message: "data sources should use cases.json as case count and relationship support",
    phrases: ["cases.json as case count and relationship support"],
  },
  {
    message: "data sources should use emailLogs.json as relationship support only, not lifecycle truth",
    phrases: ["emailLogs.json as relationship support only, not lifecycle truth"],
  },
  {
    message: "payment/subscription sources should be explicitly scoped workspace/trial continuation or pilot-summary payment state",
    phrases: [
      "paymentRecords.json and subscriptionRecords.json only for explicitly scoped workspace/trial continuation or pilot-summary payment state",
    ],
  },
  {
    message: "data sources should exclude frontend localStorage",
    phrases: ["No frontend localStorage"],
  },
  {
    message: "data sources should exclude route text, button text, visual labels, or PilotResultPage presence",
    phrases: ["No route text, button text, visual labels, or PilotResultPage presence"],
  },
  {
    message: "endpoint should load existing data read-only",
    phrases: ["load existing data read-only"],
  },
  {
    message: "endpoint should pass data into buildTrialStatus",
    phrases: ["pass data into buildTrialStatus"],
  },
  {
    message: "endpoint should return helper output under data",
    phrases: ["return the helper output under data"],
  },
  {
    message: "endpoint should use backend time for now",
    phrases: ["use backend time for now"],
  },
  {
    message: "endpoint should return safe hidden UI defaults when data is missing or weak",
    phrases: ["return safe hidden UI defaults when data is missing or weak"],
  },
  {
    message: "endpoint should never create, update, delete, or reorder records",
    phrases: ["never create, update, delete, reorder"],
  },
  {
    message: "endpoint must not write files",
    phrases: ["write files"],
  },
  {
    message: "endpoint must not mutate trial records",
    phrases: ["mutate trial records"],
  },
  {
    message: "endpoint must not create cases",
    phrases: ["create cases"],
  },
  {
    message: "endpoint must not create summary data",
    phrases: ["create summary data"],
  },
  {
    message: "endpoint must not mark payment as paid",
    phrases: ["mark payment as paid"],
  },
  {
    message: "endpoint must not change receipt behavior",
    phrases: ["change receipt behavior"],
  },
  {
    message: "endpoint must not change verification behavior",
    phrases: ["change verification behavior"],
  },
  {
    message: "endpoint must not change scoring behavior",
    phrases: ["change scoring behavior"],
  },
  {
    message: "endpoint must not change payment behavior",
    phrases: ["change payment behavior"],
  },
  {
    message: "endpoint must not change routing behavior",
    phrases: ["change routing behavior"],
  },
  {
    message: "endpoint must not change /cases aggregation behavior",
    phrases: ["change /cases aggregation behavior"],
  },
  {
    message: "endpoint must not connect to frontend UI in the same step",
    phrases: ["connect to frontend UI in the same step"],
  },
  {
    message: "endpoint must not use generic paid fields as pilotSummaryPaid",
    phrases: ["use generic paid fields as pilotSummaryPaid"],
  },
  {
    message: "endpoint must not treat receipt activation or formal verification payment as pilot summary payment",
    phrases: [
      "treat receipt activation payment as pilot summary payment",
      "treat formal verification payment as pilot summary payment",
    ],
    requireAll: true,
  },
  {
    message: "endpoint must not infer lifecycle from PilotResultPage existence",
    phrases: ["infer lifecycle from PilotResultPage existence"],
  },
  {
    message: "/cases remains unchanged for now",
    phrases: ["/cases remains unchanged for now"],
  },
  {
    message: "/trial-status should be separate read-only status source",
    phrases: ["/trial-status is a separate read-only status source"],
  },
  {
    message: "CasesPage may later call /trial-status in frontend adapter step",
    phrases: ["CasesPage may later call /trial-status in a frontend adapter step"],
  },
  {
    message: "trial status should not merge into /cases until endpoint behavior is proven",
    phrases: ["Do not merge trial status into /cases until endpoint behavior is proven"],
  },
  {
    message: "missing email should return success false with safe default object",
    phrases: ["Missing email returns success: false with the safe default object"],
  },
  {
    message: "malformed email should return success false with safe default object",
    phrases: ["Malformed email returns success: false with the safe default object"],
  },
  {
    message: "missing data files should not crash endpoint",
    phrases: ["Missing data files should not crash the endpoint"],
  },
  {
    message: "corrupt or invalid records should be ignored",
    phrases: ["Corrupt or invalid records should be ignored"],
  },
  {
    message: "endpoint should avoid exposing raw internal file errors",
    phrases: ["raw internal file errors should not be exposed", "avoid exposing raw internal file errors"],
  },
  {
    message: "endpoint should prefer hiding UI over guessing lifecycle state",
    phrases: ["prefer hiding UI over guessing lifecycle state"],
  },
  {
    message: "endpoint should return normalized status fields only",
    phrases: ["only return normalized status fields"],
  },
  {
    message: "endpoint should not return raw trial records",
    phrases: ["raw trial records"],
  },
  {
    message: "endpoint should not return raw payment records",
    phrases: ["raw payment records"],
  },
  {
    message: "endpoint should not return raw subscription records",
    phrases: ["raw subscription records"],
  },
  {
    message: "endpoint should not return raw case contents",
    phrases: ["raw case contents"],
  },
  {
    message: "endpoint should not return raw email logs",
    phrases: ["raw email logs"],
  },
  {
    message: "endpoint should not expose internal file paths",
    phrases: ["internal file paths"],
  },
  {
    message: "endpoint should not expose payment provider payloads",
    phrases: ["payment provider payloads"],
  },
  {
    message: "recommended next step should point to 16-A14",
    phrases: ["16-A14"],
  },
  {
    message: "recommended next step should be endpoint implementation or read-only endpoint implementation",
    phrases: ["read-only endpoint implementation", "endpoint implementation"],
  },
  {
    message: "endpoint implementation should happen only after endpoint contract smoke guard",
    phrases: ["only after the endpoint contract smoke guard"],
  },
];

const checks = [
  expect(contractExists, "backend trial status endpoint contract doc should exist"),
  ...endpointAnchors.map((anchor) =>
    expect(hasPhrase(anchor), `endpoint anchor present: ${anchor}`)
  ),
  ...successResponseAnchors.map((anchor) =>
    expect(hasPhrase(anchor), `success response anchor present: ${anchor}`)
  ),
  ...safeFailureAnchors.map((anchor) =>
    expect(hasPhrase(anchor), `safe failure response anchor present: ${anchor}`)
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

console.log("\nNimclea Backend Trial Status Endpoint Contract Guard v0.1\n");

for (const check of checks) {
  console.log(`${check.pass ? "PASS" : "FAIL"} ${check.message}`);
}

if (failed.length > 0) {
  console.error(
    `\nFAIL: ${failed.length}/${checks.length} backend trial status endpoint contract checks failed.`
  );
  process.exit(1);
}

console.log(
  `\nPASS: ${checks.length}/${checks.length} backend trial status endpoint contract checks passed.`
);
