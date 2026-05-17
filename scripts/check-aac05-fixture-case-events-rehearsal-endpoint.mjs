#!/usr/bin/env node

import "dotenv/config";

const baseUrl = String(process.env.AAC05_REHEARSAL_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
const endpointUrl = `${baseUrl}/internal/rehearsal/case-events`;
const rehearsalFlagEnabled = String(process.env.NIMCLEA_ENABLE_REHEARSAL_ENDPOINTS || "").trim().toLowerCase() === "true";

const smokePayload = {
  caseId: "00000000-0000-4000-8000-000000000024",
  eventType: "rehearsal.case_event_fixture",
  actorEmail: "smoke+cases-existing-001@nimclea.test",
  rehearsalKey: "aac05",
  eventPayload: {
    rehearsal: true,
    fixture: true,
    note: "AAC-05 fixture-only rehearsal smoke",
  },
};

async function canReachBackend() {
  try {
    const response = await fetch(`${baseUrl}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(2500),
    });

    return response.ok;
  } catch {
    return false;
  }
}

async function main() {
  const reachable = await canReachBackend();

  if (!reachable) {
    console.log(`SKIP backend not reachable at ${baseUrl}`);
    process.exit(0);
  }

  if (!rehearsalFlagEnabled) {
    console.log("SKIP NIMCLEA_ENABLE_REHEARSAL_ENDPOINTS is not true");
    process.exit(0);
  }

  try {
    const response = await fetch(endpointUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(smokePayload),
      signal: AbortSignal.timeout(5000),
    });

    const text = await response.text();
    let payload = null;

    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = text;
    }

    if (!response.ok || payload?.success !== true) {
      console.error("FAIL rehearsal endpoint did not return success");
      console.error(`status=${response.status}`);
      console.error(typeof payload === "string" ? payload : JSON.stringify(payload, null, 2));
      process.exit(1);
    }

    console.log("PASS rehearsal endpoint recorded fixture case_event");
    console.log(JSON.stringify(payload, null, 2));
  } catch (error) {
    console.error("FAIL rehearsal endpoint smoke failed");
    console.error(error?.message || String(error));
    process.exit(1);
  }
}

await main();
