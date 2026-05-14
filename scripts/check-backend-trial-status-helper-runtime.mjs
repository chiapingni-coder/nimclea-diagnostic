#!/usr/bin/env node

import { buildTrialStatus } from "../backend/utils/buildTrialStatus.js";

function pass(message) {
  return { pass: true, message };
}

function fail(message, details = null) {
  return { pass: false, message, details };
}

function expect(condition, message, details = null) {
  return condition ? pass(message) : fail(message, details);
}

function assertFields(result, expected, message) {
  const mismatches = Object.entries(expected).filter(
    ([key, value]) => result[key] !== value
  );

  return expect(
    mismatches.length === 0,
    message,
    mismatches.length > 0 ? { expected, actual: result, mismatches } : null
  );
}

const activeTrialResult = buildTrialStatus({
  email: "a@test.com",
  trialRecords: [
    {
      email: "a@test.com",
      startedAt: "2026-05-01T00:00:00.000Z",
      expiresAt: "2026-05-08T00:00:00.000Z",
    },
  ],
  caseRecords: [
    {
      email: "a@test.com",
      createdAt: "2026-05-02T00:00:00.000Z",
    },
  ],
  now: "2026-05-03T00:00:00.000Z",
});

const safeDefaultResult = buildTrialStatus({
  email: "none@test.com",
  trialRecords: [],
  caseRecords: [],
  now: "2026-05-03T00:00:00.000Z",
});

const futureTrialResult = buildTrialStatus({
  email: "future@test.com",
  trialRecords: [
    {
      email: "future@test.com",
      startedAt: "2026-05-10T00:00:00.000Z",
      expiresAt: "2026-05-17T00:00:00.000Z",
    },
  ],
  now: "2026-05-03T00:00:00.000Z",
});

const endedWithoutSummaryResult = buildTrialStatus({
  email: "ended@test.com",
  trialRecords: [
    {
      email: "ended@test.com",
      startedAt: "2026-05-01T00:00:00.000Z",
      expiresAt: "2026-05-08T00:00:00.000Z",
    },
  ],
  now: "2026-05-09T00:00:00.000Z",
});

const summaryUnpaidResult = buildTrialStatus({
  email: "summary@test.com",
  trialRecords: [
    {
      email: "summary@test.com",
      startedAt: "2026-05-01T00:00:00.000Z",
      expiresAt: "2026-05-08T00:00:00.000Z",
      pilotSummaryAvailable: true,
    },
  ],
  now: "2026-05-09T00:00:00.000Z",
});

const receiptPaymentResult = buildTrialStatus({
  email: "receipt@test.com",
  trialRecords: [
    {
      email: "receipt@test.com",
      startedAt: "2026-05-01T00:00:00.000Z",
      expiresAt: "2026-05-08T00:00:00.000Z",
      pilotSummaryAvailable: true,
    },
  ],
  paymentRecords: [
    {
      email: "receipt@test.com",
      paymentType: "receipt_activation",
      priceType: "receipt_activation",
      paymentStatus: "paid",
      paid: true,
    },
  ],
  now: "2026-05-09T00:00:00.000Z",
});

const verificationPaymentResult = buildTrialStatus({
  email: "verify@test.com",
  trialRecords: [
    {
      email: "verify@test.com",
      startedAt: "2026-05-01T00:00:00.000Z",
      expiresAt: "2026-05-08T00:00:00.000Z",
      pilotSummaryAvailable: true,
    },
  ],
  paymentRecords: [
    {
      email: "verify@test.com",
      paymentType: "formal_verification",
      priceType: "formal_verification",
      paymentStatus: "paid",
      paid: true,
    },
  ],
  now: "2026-05-09T00:00:00.000Z",
});

const workspaceContinuationResult = buildTrialStatus({
  email: "renew@test.com",
  trialRecords: [
    {
      email: "renew@test.com",
      startedAt: "2026-05-01T00:00:00.000Z",
      expiresAt: "2026-05-08T00:00:00.000Z",
      pilotSummaryAvailable: true,
    },
  ],
  subscriptionRecords: [
    {
      email: "renew@test.com",
      paymentType: "pilot_extension",
      priceType: "pilot_extension",
      subscriptionStatus: "active",
      pilotExtensionPaid: true,
    },
  ],
  now: "2026-05-09T00:00:00.000Z",
});

const userIdPreferredResult = buildTrialStatus({
  email: "same-email@test.com",
  userId: "user-preferred",
  trialRecords: [
    {
      email: "same-email@test.com",
      startedAt: "2026-05-01T00:00:00.000Z",
      expiresAt: "2026-05-08T00:00:00.000Z",
    },
    {
      userId: "user-preferred",
      email: "other-email@test.com",
      startedAt: "2026-05-04T00:00:00.000Z",
      expiresAt: "2026-05-11T00:00:00.000Z",
    },
  ],
  now: "2026-05-05T00:00:00.000Z",
});

const invalidTimestampResult = buildTrialStatus({
  email: "invalid@test.com",
  trialRecords: [
    {
      email: "invalid@test.com",
      startedAt: "not-a-date",
      trialStartedAt: "also-not-a-date",
      expiresAt: "2026-05-08T00:00:00.000Z",
    },
  ],
  now: "2026-05-03T00:00:00.000Z",
});

const checks = [
  assertFields(
    activeTrialResult,
    {
      trialActive: true,
      trialEnded: false,
      trialDay: 3,
      casesCreatedDuringTrial: 1,
      shouldShowTrialStatusBar: true,
      shouldShowPilotSummaryEntry: false,
    },
    "active trial shows status bar with day 3 and one case"
  ),
  assertFields(
    safeDefaultResult,
    {
      trialActive: false,
      trialStartedAt: null,
      trialEndsAt: null,
      trialDay: null,
      trialEnded: false,
      casesCreatedDuringTrial: 0,
      pilotSummaryAvailable: false,
      pilotSummaryPaid: false,
      shouldShowTrialStatusBar: false,
      shouldShowPilotSummaryEntry: false,
      source: "none",
    },
    "missing trial returns safe default"
  ),
  assertFields(
    futureTrialResult,
    {
      trialActive: false,
      trialEnded: false,
      shouldShowTrialStatusBar: false,
      shouldShowPilotSummaryEntry: false,
    },
    "future trial hides UI"
  ),
  assertFields(
    endedWithoutSummaryResult,
    {
      trialActive: false,
      trialEnded: true,
      pilotSummaryAvailable: false,
      shouldShowPilotSummaryEntry: false,
    },
    "ended trial without summary hides summary entry"
  ),
  assertFields(
    summaryUnpaidResult,
    {
      trialEnded: true,
      pilotSummaryAvailable: true,
      pilotSummaryPaid: false,
      shouldShowPilotSummaryEntry: true,
    },
    "summary available and unpaid shows pilot summary entry"
  ),
  assertFields(
    receiptPaymentResult,
    {
      pilotSummaryPaid: false,
      shouldShowPilotSummaryEntry: true,
    },
    "receipt activation payment does not count as pilot summary paid"
  ),
  assertFields(
    verificationPaymentResult,
    {
      pilotSummaryPaid: false,
      shouldShowPilotSummaryEntry: true,
    },
    "formal verification payment does not count as pilot summary paid"
  ),
  assertFields(
    workspaceContinuationResult,
    {
      pilotSummaryPaid: true,
      shouldShowPilotSummaryEntry: false,
    },
    "workspace/trial continuation payment hides pilot summary entry"
  ),
  expect(
    userIdPreferredResult.trialStartedAt === "2026-05-04T00:00:00.000Z" &&
      userIdPreferredResult.trialDay === 2 &&
      userIdPreferredResult.source !== "none",
    "userId matching beats email when available",
    userIdPreferredResult
  ),
  assertFields(
    invalidTimestampResult,
    {
      trialDay: null,
      shouldShowTrialStatusBar: false,
      shouldShowPilotSummaryEntry: false,
    },
    "invalid timestamps hide UI"
  ),
];

const failed = checks.filter((check) => !check.pass);

console.log("\nNimclea Backend Trial Status Helper Runtime Smoke v0.1\n");

for (const check of checks) {
  console.log(`${check.pass ? "PASS" : "FAIL"} ${check.message}`);
  if (!check.pass && check.details) {
    console.error(JSON.stringify(check.details, null, 2));
  }
}

if (failed.length > 0) {
  console.error(
    `\nFAIL: ${failed.length}/${checks.length} backend trial status helper runtime checks failed.`
  );
  process.exit(1);
}

console.log(
  `\nPASS: ${checks.length}/${checks.length} backend trial status helper runtime checks passed.`
);
