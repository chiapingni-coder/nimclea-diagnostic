#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const contractPath = path.join(
  repoRoot,
  "docs",
  "NIMCLEA_BACKEND_TRIAL_STATUS_HELPER_CONTRACT_V0_1.md"
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

const helperSignatureAnchors = [
  "buildTrialStatus",
  "email",
  "userId",
  "trialRecords",
  "caseRecords",
  "paymentRecords",
  "subscriptionRecords",
  "now",
];

const canonicalOutputFields = [
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

const conceptualChecks = [
  {
    message: "trial selection should match by userId",
    phrases: ["match by userId", "matching userId"],
  },
  {
    message: "trial selection should match by normalized email",
    phrases: ["match by normalized email", "normalized email"],
  },
  {
    message: "trial selection should prefer active or most recent trusted lifecycle record",
    phrases: [
      "active started records first",
      "Prefer the most recent relevant lifecycle record",
    ],
  },
  {
    message: "trial selection should define safe default when no trusted trial record exists",
    phrases: ["Safe default when no trusted trial record exists"],
  },
  {
    message: "timestamp rules should include startedAt / trialStartedAt",
    phrases: ["startedAt", "trialStartedAt"],
  },
  {
    message: "timestamp rules should include expiresAt / trialEndsAt",
    phrases: ["expiresAt", "trialEndsAt"],
  },
  {
    message: "createdAt should be fallback only, not trial start authority",
    phrases: [
      "createdAt only as a fallback",
      "Do not use createdAt as trial start",
    ],
  },
  {
    message: "timestamp rules should specify UTC or ISO time handling",
    phrases: ["ISO UTC", "ISO"],
  },
  {
    message: "trialDay should be bounded 1 to 7",
    phrases: ["Bound active display day from 1 to 7", "bounded 1-7"],
  },
  {
    message: "invalid or missing timestamps should produce safe hidden/null state",
    phrases: [
      "Hide trial lifecycle UI rather than infer",
      "Return null for timestamp fields",
    ],
  },
  {
    message: "case counting should use same user/email/trial relationship",
    phrases: ["same user/email/trial relationship"],
  },
  {
    message: "case counting should prefer cases created within trialStartedAt and trialEndsAt",
    phrases: ["created between trialStartedAt and trialEndsAt"],
  },
  {
    message: "case counting should fallback only if timestamp filtering is unavailable",
    phrases: ["Fall back to related case count only if timestamp filtering is unavailable"],
  },
  {
    message: "case counting should not mutate or reorder cases",
    phrases: ["without mutating or reordering cases"],
  },
  {
    message: "case counting should not alter /cases aggregation behavior",
    phrases: ["Do not alter /cases aggregation behavior"],
  },
  {
    message: "pilotSummaryAvailable should remain false unless normalized summary-ready signal exists",
    phrases: ["pilotSummaryAvailable should remain false unless there is a normalized summary-ready signal"],
  },
  {
    message: "PilotResultPage existence must not be authority",
    phrases: ["PilotResultPage existence must not be used as authority"],
  },
  {
    message: "final day / trial ended may be prerequisite but not sole proof",
    phrases: ["Final day / trial ended may be a prerequisite, but not the only proof"],
  },
  {
    message: "helper should not create or delete summary data",
    phrases: ["Summary data is not created or deleted by this helper"],
  },
  {
    message: "payment boundary should require workspace / trial continuation scope",
    phrases: ["workspace/trial continuation scope", "workspace continuation"],
  },
  {
    message: "payment boundary should not confuse $9 workspace renewal",
    phrases: ["$9 workspace renewal"],
  },
  {
    message: "payment boundary should not confuse $29 receipt activation",
    phrases: ["$29 receipt activation"],
  },
  {
    message: "payment boundary should not confuse formal verification payment",
    phrases: ["formal verification payment"],
  },
  {
    message: "generic paid fields should not be enough",
    phrases: ["generic paid: true without scope", "generic paymentStatus: paid without scope"],
  },
  {
    message: "helper must not mark payment as paid",
    phrases: ["Do not mark payment as paid", "mark payment as paid"],
  },
  {
    message: "helper must not write files",
    phrases: ["write files"],
  },
  {
    message: "helper must not mutate trial records",
    phrases: ["mutate trial records"],
  },
  {
    message: "helper must not create cases",
    phrases: ["create cases"],
  },
  {
    message: "helper must not create summary data",
    phrases: ["create summary data"],
  },
  {
    message: "helper must not change receipt, verification, scoring, routing, payment, or /cases behavior",
    phrases: [
      "change receipt behavior",
      "change verification behavior",
      "change scoring behavior",
      "change routing behavior",
      "change payment behavior",
      "change /cases behavior",
    ],
    requireAll: true,
  },
  {
    message: "helper must not depend on frontend localStorage",
    phrases: ["depend on frontend localStorage", "frontend localStorage"],
  },
  {
    message: "helper must not infer lifecycle from button text, route, visual labels, or PilotResultPage presence",
    phrases: ["infer lifecycle from button text, route, visual labels, or PilotResultPage presence"],
  },
];

const checks = [
  expect(contractExists, "backend trial status helper contract doc should exist"),
  ...helperSignatureAnchors.map((anchor) =>
    expect(hasPhrase(anchor), `helper signature anchor present: ${anchor}`)
  ),
  ...canonicalOutputFields.map((field) =>
    expect(hasPhrase(field), `canonical output field present: ${field}`)
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

console.log("\nNimclea Backend Trial Status Helper Contract Guard v0.1\n");

for (const check of checks) {
  console.log(`${check.pass ? "PASS" : "FAIL"} ${check.message}`);
}

if (failed.length > 0) {
  console.error(
    `\nFAIL: ${failed.length}/${checks.length} backend trial status helper contract checks failed.`
  );
  process.exit(1);
}

console.log(
  `\nPASS: ${checks.length}/${checks.length} backend trial status helper contract checks passed.`
);
