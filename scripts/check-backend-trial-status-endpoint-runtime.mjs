#!/usr/bin/env node

import { spawn } from "node:child_process";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const backendDir = path.join(repoRoot, "backend");
const port = 3000;
const baseUrl = `http://127.0.0.1:${port}`;

const canonicalFields = [
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

const safeDefault = {
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

const forbiddenRawKeys = new Set(
  [
    "trialRecords",
    "caseRecords",
    "paymentRecords",
    "subscriptionRecords",
    "emailLogs",
    "rawTrial",
    "rawPayment",
    "rawSubscription",
    "stripePayload",
    "providerPayload",
    "filePath",
    "internalPath",
  ].map((key) => key.toLowerCase())
);

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

function assertCanonicalData(data, message) {
  const actualFields = Object.keys(data || {}).sort();
  const expectedFields = [...canonicalFields].sort();
  const sameFields =
    actualFields.length === expectedFields.length &&
    actualFields.every((field, index) => field === expectedFields[index]);

  return expect(
    sameFields,
    message,
    sameFields ? null : { expectedFields, actualFields, data }
  );
}

function findForbiddenRawKeys(value, currentPath = "$", matches = []) {
  if (!value || typeof value !== "object") {
    return matches;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      findForbiddenRawKeys(item, `${currentPath}[${index}]`, matches)
    );
    return matches;
  }

  for (const [key, child] of Object.entries(value)) {
    const childPath = `${currentPath}.${key}`;
    if (forbiddenRawKeys.has(key.toLowerCase())) {
      matches.push(childPath);
    }
    findForbiddenRawKeys(child, childPath, matches);
  }

  return matches;
}

function assertNoRawLeaks(json, message) {
  const matches = findForbiddenRawKeys(json);
  return expect(matches.length === 0, message, matches.length > 0 ? matches : null);
}

function requestJson(requestPath) {
  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path: requestPath,
        method: "GET",
        timeout: 5000,
      },
      (response) => {
        let body = "";

        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          try {
            resolve({
              statusCode: response.statusCode,
              body,
              json: body ? JSON.parse(body) : null,
            });
          } catch (error) {
            reject(new Error(`Invalid JSON from ${requestPath}: ${error.message}`));
          }
        });
      }
    );

    request.on("timeout", () => {
      request.destroy(new Error(`Timed out requesting ${requestPath}`));
    });
    request.on("error", reject);
    request.end();
  });
}

function isPortOpen() {
  return new Promise((resolve) => {
    const socket = net.connect(port, "127.0.0.1");
    socket.setTimeout(1000);
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("error", () => resolve(false));
  });
}

async function waitForServer(child, logs) {
  const deadline = Date.now() + 15000;

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(
        `Backend exited before startup with code ${child.exitCode}. ${logs
          .join("")
          .trim()}`
      );
    }

    try {
      await requestJson("/trial-status");
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  throw new Error(`Backend did not become reachable at ${baseUrl}`);
}

function startBackend() {
  const logs = [];
  const child = spawn(process.execPath, ["server.js"], {
    cwd: backendDir,
    env: { ...process.env },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  child.stdout.on("data", (chunk) => logs.push(chunk.toString()));
  child.stderr.on("data", (chunk) => logs.push(chunk.toString()));

  return { child, logs };
}

async function stopBackend(child) {
  if (!child || child.exitCode !== null) {
    return;
  }

  await new Promise((resolve) => {
    child.once("exit", resolve);
    child.kill();
    setTimeout(resolve, 3000);
  });
}

async function run() {
  const checks = [];
  let backend = null;

  try {
    const occupied = await isPortOpen();
    if (occupied) {
      throw new Error(
        `Port ${port} is already in use; endpoint runtime smoke requires its own backend child process.`
      );
    }

    backend = startBackend();
    await waitForServer(backend.child, backend.logs);
    checks.push(pass("backend child process started and /trial-status became reachable"));

    const missingEmail = await requestJson("/trial-status");
    checks.push(expect(missingEmail.statusCode < 500, "missing email does not crash"));
    checks.push(
      assertFields(
        missingEmail.json?.data,
        safeDefault,
        "missing email returns safe hidden default data"
      )
    );
    checks.push(
      assertFields(
        missingEmail.json,
        { success: false, error: "email_required" },
        "missing email returns email_required"
      )
    );

    const blankEmail = await requestJson("/trial-status?email=");
    checks.push(
      assertFields(
        blankEmail.json,
        { success: false, error: "email_required" },
        "blank email returns email_required"
      )
    );
    checks.push(
      assertFields(
        blankEmail.json?.data,
        {
          source: "none",
          shouldShowTrialStatusBar: false,
          shouldShowPilotSummaryEntry: false,
        },
        "blank email keeps hidden UI flags"
      )
    );

    const normalEmail = await requestJson("/trial-status?email=test@example.com");
    checks.push(
      assertFields(normalEmail.json, { success: true }, "normal email returns success true")
    );
    checks.push(
      assertCanonicalData(
        normalEmail.json?.data,
        "normal email returns exactly canonical data fields"
      )
    );
    checks.push(assertNoRawLeaks(normalEmail.json, "normal email response leaks no raw records"));

    const normalizedEmail = await requestJson(
      "/trial-status?email=%20TEST%40EXAMPLE.COM%20"
    );
    checks.push(
      expect(
        typeof normalizedEmail.json?.success === "boolean",
        "trimmed uppercase email returns boolean success",
        normalizedEmail.json
      )
    );
    checks.push(
      assertCanonicalData(
        normalizedEmail.json?.data,
        "trimmed uppercase email keeps canonical data shape"
      )
    );
    checks.push(
      assertNoRawLeaks(normalizedEmail.json, "trimmed uppercase email response leaks no raw records")
    );

    const malformedEmail = await requestJson("/trial-status?email=not-an-email");
    const malformedSafeFailure =
      malformedEmail.json?.success === false &&
      malformedEmail.json?.error === "email_required" &&
      malformedEmail.json?.data?.source === "none";
    const malformedSafeSuccess =
      malformedEmail.json?.success === true &&
      assertCanonicalData(malformedEmail.json?.data, "malformed email canonical shape").pass;

    checks.push(
      expect(
        malformedEmail.statusCode < 500 && (malformedSafeFailure || malformedSafeSuccess),
        "malformed-ish email does not crash and returns safe response",
        malformedEmail.json
      )
    );
    checks.push(
      assertNoRawLeaks(malformedEmail.json, "malformed-ish email response leaks no raw records")
    );

    const casesResponse = await requestJson("/cases?email=test@example.com");
    checks.push(expect(casesResponse.statusCode < 500, "/cases lightweight smoke does not crash"));
  } catch (error) {
    checks.push(fail("endpoint runtime smoke failed to complete", error.message));
  } finally {
    await stopBackend(backend?.child);
  }

  return checks;
}

console.log("\nNimclea Backend Trial Status Endpoint Runtime Smoke v0.1\n");

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
    `\nFAIL: ${failed.length}/${checks.length} backend trial status endpoint runtime checks failed.`
  );
  process.exit(1);
}

console.log(
  `\nPASS: ${checks.length}/${checks.length} backend trial status endpoint runtime checks passed.`
);
