#!/usr/bin/env node

import {
  hasBackendOwnedReceiptAccess,
  hasBackendOwnedVerificationAccess,
  isBackendReceiptPaidOrActivated,
  isBackendReceiptReady,
  normalizeLifecycleValue,
} from "../frontend/utils/dataContractLifecycle.js";

const DEFAULT_API_BASE_URL = "https://nimclea-api.onrender.com";

function getApiBaseUrl() {
  return (process.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/+$/, "");
}

function getProbeEmail() {
  const email = String(process.env.NIMCLEA_PROBE_EMAIL || "").trim();
  if (!email) {
    console.error("NIMCLEA_PROBE_EMAIL is required.");
    process.exit(1);
  }
  return email;
}

function asCaseList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.cases)) return payload.cases;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function getCaseId(record) {
  return (
    record?.caseId ||
    record?.id ||
    record?.case_id ||
    record?.case?.caseId ||
    record?.case?.id ||
    null
  );
}

function buildTrace(record) {
  const receiptStatus = normalizeLifecycleValue(record?.receiptStatus);
  const status = normalizeLifecycleValue(record?.status);
  const stage = normalizeLifecycleValue(record?.stage);
  const paymentStatus = normalizeLifecycleValue(record?.paymentStatus);

  const backendSignals = {
    isBackendReceiptReady: isBackendReceiptReady(record),
    isBackendReceiptPaidOrActivated: isBackendReceiptPaidOrActivated(record),
    hasBackendOwnedReceiptAccess: hasBackendOwnedReceiptAccess(record),
    hasBackendOwnedVerificationAccess: hasBackendOwnedVerificationAccess(record),
  };

  const legacyReadyHints = {
    receiptEligibleTrue: record?.receiptEligible === true,
    caseReceiptEligibleTrue: record?.caseReceiptEligible === true,
    receiptStatusReady: receiptStatus === "ready" || receiptStatus === "receipt_ready",
    statusReceiptReady: status === "ready" || status === "receipt_ready",
    stageReceiptReady: stage === "ready" || stage === "receipt_ready",
  };

  const legacyPaidHints = {
    paidTrue: record?.paid === true,
    paymentStatusPaid: paymentStatus === "paid",
  };

  const suspectedGreenSource = backendSignals.isBackendReceiptReady
    ? "backend_owned_ready"
    : backendSignals.isBackendReceiptPaidOrActivated
      ? "backend_owned_paid"
      : Object.values(legacyReadyHints).some(Boolean)
        ? "legacy_ready_hint"
        : Object.values(legacyPaidHints).some(Boolean)
          ? "legacy_paid_hint"
          : "unknown";

  return {
    caseId: getCaseId(record),
    status: record?.status,
    stage: record?.stage,
    currentStep: record?.currentStep,
    receiptStatus: record?.receiptStatus,
    paymentStatus: record?.paymentStatus,
    paid: record?.paid,
    receiptEligible: record?.receiptEligible,
    caseReceiptEligible: record?.caseReceiptEligible,
    ...backendSignals,
    legacyReadyHints,
    legacyPaidHints,
    suspectedGreenSource,
  };
}

async function main() {
  const email = getProbeEmail();
  const apiBaseUrl = getApiBaseUrl();
  const url = `${apiBaseUrl}/cases?email=${encodeURIComponent(email)}`;

  const response = await fetch(url, {
    method: "GET",
    headers: { accept: "application/json" },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`GET ${url} failed with ${response.status}: ${body.slice(0, 300)}`);
  }

  const payload = await response.json();
  const cases = asCaseList(payload);

  for (const record of cases) {
    console.log(JSON.stringify(buildTrace(record)));
  }
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
