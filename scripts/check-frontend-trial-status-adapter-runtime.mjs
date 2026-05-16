#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { getTrialStatusDisplayModel } from "../frontend/lib/trialStatusApi.js";

const repoRoot = process.cwd();

const displayFields = [
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

const hiddenFields = {
  loading: false,
  trialActive: false,
  trialDay: null,
  trialEnded: false,
  casesCreatedDuringTrial: 0,
  shouldShowTrialStatusBar: false,
  shouldShowPilotSummaryEntry: false,
  pilotSummaryAvailable: false,
  pilotSummaryPaid: false,
  source: "none",
};

const safeDefaultBackendData = {
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
};

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
    ([key, value]) => result?.[key] !== value
  );

  return expect(
    mismatches.length === 0,
    message,
    mismatches.length > 0 ? { expected, actual: result, mismatches } : null
  );
}

function assertHidden(result, message, options = {}) {
  const checks = [assertFields(result, hiddenFields, message)];

  if (Object.prototype.hasOwnProperty.call(options, "error")) {
    checks.push(
      expect(
        result?.error === options.error,
        `${message}: error is ${options.error}`,
        result
      )
    );
  } else if (options.safeError) {
    checks.push(
      expect(
        result?.error === null || typeof result?.error === "string",
        `${message}: error is null or safe internal string`,
        result
      )
    );
  }

  return checks;
}

function assertOnlyDisplayFields(result, message) {
  const actualFields = Object.keys(result || {}).sort();
  const expectedFields = [...displayFields].sort();
  const sameFields =
    actualFields.length === expectedFields.length &&
    actualFields.every((field, index) => field === expectedFields[index]);

  return expect(
    sameFields,
    message,
    sameFields ? null : { expectedFields, actualFields, result }
  );
}

function makeResponse(payload, ok = true) {
  return {
    ok,
    async json() {
      return payload;
    },
  };
}

async function withMockedFetch(fetchImpl, callback) {
  const originalFetch = globalThis.fetch;
  const calls = [];

  globalThis.fetch = async (...args) => {
    calls.push(args);
    return fetchImpl(...args);
  };

  try {
    const result = await callback(calls);
    return { result, calls };
  } finally {
    globalThis.fetch = originalFetch;
  }
}

function validBackendPayload(overrides = {}, extraData = {}) {
  return {
    success: true,
    data: {
      trialActive: true,
      trialStartedAt: "2026-05-01T00:00:00.000Z",
      trialEndsAt: "2026-05-08T00:00:00.000Z",
      trialDay: 3,
      trialEnded: false,
      casesCreatedDuringTrial: 2,
      pilotSummaryAvailable: false,
      pilotSummaryPaid: false,
      shouldShowTrialStatusBar: true,
      shouldShowPilotSummaryEntry: false,
      source: "trial_record",
      ...overrides,
      ...extraData,
    },
  };
}

function readTextIfPresent(relativeFile) {
  const absoluteFile = path.join(repoRoot, relativeFile);
  return existsSync(absoluteFile) ? readFileSync(absoluteFile, "utf8") : "";
}

async function run() {
  const checks = [];

  const missingEmail = await withMockedFetch(
    () => {
      throw new Error("fetch should not be called for missing email");
    },
    async (calls) => {
      const result = await getTrialStatusDisplayModel({ email: "" });
      checks.push(expect(calls.length === 0, "missing email does not call fetch", calls));
      checks.push(...assertHidden(result, "missing email returns safe hidden model", { error: null }));
      checks.push(assertOnlyDisplayFields(result, "missing email returns only display fields"));
    }
  );
  void missingEmail;

  const blankEmail = await withMockedFetch(
    () => {
      throw new Error("fetch should not be called for blank email");
    },
    async (calls) => {
      const result = await getTrialStatusDisplayModel({ email: "   " });
      checks.push(expect(calls.length === 0, "blank email does not call fetch", calls));
      checks.push(...assertHidden(result, "blank email returns safe hidden model", { error: null }));
    }
  );
  void blankEmail;

  await withMockedFetch(
    async () =>
      makeResponse({
        success: false,
        error: "email_required",
        data: safeDefaultBackendData,
      }),
    async (calls) => {
      const result = await getTrialStatusDisplayModel({ email: "test@example.com" });
      checks.push(expect(calls.length === 1, "backend success false calls fetch once", calls));
      checks.push(
        ...assertHidden(result, "backend success false returns hidden UI state", {
          safeError: true,
        })
      );
    }
  );

  await withMockedFetch(
    async () => {
      throw new Error("network unavailable");
    },
    async () => {
      const result = await getTrialStatusDisplayModel({ email: "test@example.com" });
      checks.push(
        ...assertHidden(result, "network failure returns hidden UI state", {
          error: "trial_status_unavailable",
        })
      );
    }
  );

  await withMockedFetch(
    async () => makeResponse({ success: true, data: { trialActive: "yes" } }),
    async () => {
      const result = await getTrialStatusDisplayModel({ email: "test@example.com" });
      checks.push(
        ...assertHidden(result, "malformed response returns hidden UI state", {
          error: "trial_status_invalid_response",
        })
      );
      checks.push(expect(result.trialDay === null, "malformed response does not fabricate trialDay", result));
    }
  );

  await withMockedFetch(
    async () => makeResponse({ success: true }),
    async () => {
      const result = await getTrialStatusDisplayModel({ email: "test@example.com" });
      checks.push(
        ...assertHidden(result, "missing data returns hidden UI state", {
          error: "trial_status_invalid_response",
        })
      );
    }
  );

  await withMockedFetch(
    async () => makeResponse(validBackendPayload()),
    async () => {
      const result = await getTrialStatusDisplayModel({ email: "test@example.com" });
      checks.push(
        assertFields(
          result,
          {
            loading: false,
            error: null,
            trialActive: true,
            trialDay: 3,
            trialEnded: false,
            casesCreatedDuringTrial: 2,
            shouldShowTrialStatusBar: true,
            shouldShowPilotSummaryEntry: false,
            pilotSummaryAvailable: false,
            pilotSummaryPaid: false,
            source: "trial_record",
          },
          "valid success maps backend fields into display model"
        )
      );
      checks.push(assertOnlyDisplayFields(result, "valid success returns only display fields"));
    }
  );

  await withMockedFetch(
    async () =>
      makeResponse(
        validBackendPayload({
          trialActive: false,
          trialDay: 7,
          trialEnded: true,
          pilotSummaryAvailable: true,
          pilotSummaryPaid: false,
          shouldShowTrialStatusBar: true,
          shouldShowPilotSummaryEntry: true,
        })
      ),
    async () => {
      const result = await getTrialStatusDisplayModel({ email: "test@example.com" });
      checks.push(
        assertFields(
          result,
          {
            shouldShowPilotSummaryEntry: true,
            pilotSummaryAvailable: true,
            pilotSummaryPaid: false,
          },
          "summary entry success preserves backend summary flags"
        )
      );
    }
  );

  await withMockedFetch(
    async () =>
      makeResponse(
        validBackendPayload({
          trialActive: false,
          trialDay: 7,
          trialEnded: true,
          pilotSummaryAvailable: true,
          pilotSummaryPaid: true,
          shouldShowTrialStatusBar: true,
          shouldShowPilotSummaryEntry: false,
        })
      ),
    async () => {
      const result = await getTrialStatusDisplayModel({ email: "test@example.com" });
      checks.push(
        assertFields(
          result,
          {
            pilotSummaryPaid: true,
            shouldShowPilotSummaryEntry: false,
          },
          "paid summary preserves backend paid and hidden summary-entry flags"
        )
      );
    }
  );

  await withMockedFetch(
    async () => makeResponse(validBackendPayload()),
    async (calls) => {
      await getTrialStatusDisplayModel({ email: "  TEST@EXAMPLE.COM  " });
      const url = String(calls[0]?.[0] || "");
      checks.push(expect(url.includes("/trial-status"), "request URL includes /trial-status", url));
      checks.push(
        expect(url.includes("test%40example.com"), "request URL encodes lowercase trimmed email", url)
      );
      checks.push(expect(!url.includes("/cases"), "request URL does not include /cases", url));
    }
  );

  await withMockedFetch(
    async () =>
      makeResponse({
        ...validBackendPayload({}, {
          rawTrial: { secret: true },
          paymentRecords: [{ secret: true }],
        }),
        rawPayment: { secret: true },
      }),
    async () => {
      const result = await getTrialStatusDisplayModel({ email: "test@example.com" });
      checks.push(assertOnlyDisplayFields(result, "raw-leak response returns only display fields"));
      checks.push(expect(!("rawTrial" in result), "rawTrial is not present in display model", result));
      checks.push(
        expect(!("paymentRecords" in result), "paymentRecords is not present in display model", result)
      );
      checks.push(expect(!("rawPayment" in result), "rawPayment is not present in display model", result));
    }
  );

  const casesPageSource = readTextIfPresent("frontend/pages/CasesPage.jsx");
  checks.push(
    expect(
      casesPageSource.includes('import { getTrialStatusDisplayModel } from "../lib/trialStatusApi";') &&
        casesPageSource.includes("getTrialStatusDisplayModel({"),
      "CasesPage uses backend trial-status display adapter",
      "CasesPage does not import or call getTrialStatusDisplayModel"
    )
  );

  const routesSource = readTextIfPresent("frontend/routes.js");
  checks.push(
    expect(
      !/trialStatusApi|getTrialStatusDisplayModel|trial-status/.test(routesSource),
      "routes.js does not reference adapter or trial-status",
      "routes.js contains adapter or trial-status reference"
    )
  );

  return checks;
}

console.log("\nNimclea Frontend Trial Status Adapter Runtime Smoke v0.1\n");

const checks = await run();
const failed = checks.filter((check) => !check.pass);

for (const check of checks) {
  console.log(`${check.pass ? "PASS" : "FAIL"} ${check.message}`);
  if (!check.pass && check.details) {
    console.error(
      typeof check.details === "string"
        ? check.details
        : JSON.stringify(check.details, null, 2)
    );
  }
}

if (failed.length > 0) {
  console.error(
    `\nFAIL: ${failed.length}/${checks.length} frontend trial status adapter runtime checks failed.`
  );
  process.exit(1);
}

console.log(
  `\nPASS: ${checks.length}/${checks.length} frontend trial status adapter runtime checks passed.`
);
