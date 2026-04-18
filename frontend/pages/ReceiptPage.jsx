import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import ROUTES from "../routes";
// import { evaluateCaseRecordStatus } from "../utils/verificationStatus";
import { normalizeCaseInput, getSafeCaseSummary } from "../utils/caseSchema";
import { logTrialEvent } from "../lib/trialApi";
import { getTrialSession } from "../lib/trialSession";

import {
  getCaseSummary,
  getCaseContext,
  getCaseScenarioCode,
  getCaseStage,
  getCaseRunCode,
} from "../utils/caseAccessors";
import {
  buildReceiptContract,
  flattenSharedReceiptVerificationContract,
} from "../utils/sharedReceiptVerificationContract";

function getStoredReceiptData() {
  try {
    const raw = localStorage.getItem("receiptPageData");
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error("Failed to read receiptPageData from localStorage:", error);
    return null;
  }
}

function getStoredSharedReceiptVerificationContract() {
  try {
    const raw = localStorage.getItem("sharedReceiptVerificationContract");
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error(
      "Failed to read sharedReceiptVerificationContract from localStorage:",
      error
    );
    return null;
  }
}

function getStoredReceiptRouteDecision() {
  try {
    const raw = localStorage.getItem("receiptRouteDecision");
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error("Failed to read receiptRouteDecision from localStorage:", error);
    return null;
  }
}

function getStoredReceiptSource() {
  try {
    return localStorage.getItem("receiptSource") || "";
  } catch (error) {
    console.error("Failed to read receiptSource from localStorage:", error);
    return "";
  }
}

function normalizeRunEntry(entry = {}) {
  return {
    runId: entry.runId || entry.runLabel || "RUN000",
    runLabel: entry.runLabel || entry.runId || "RUN000",
    count: Number.isFinite(entry.count) ? entry.count : 1,
    stageLabel: entry.stageLabel || "",
    scenarioLabel: entry.scenarioLabel || "",
    confidenceLabel: entry.confidenceLabel || "",
  };
}

function buildRunAggregation(input = {}) {
  const rawEntries = Array.isArray(input.runEntries) ? input.runEntries : [];

  if (rawEntries.length > 0) {
    const normalizedEntries = rawEntries.map(normalizeRunEntry);
    const totalRunHits = normalizedEntries.reduce(
      (sum, entry) => sum + (entry.count || 0),
      0
    );

    return {
      runEntries: normalizedEntries,
      totalRunHits,
      primaryRunLabel:
        normalizedEntries[0]?.runLabel ||
        input.runLabel ||
        "RUN000",
      runSummaryText:
        input.runSummaryText ||
        `${normalizedEntries.length} RUN pattern(s) recorded across ${totalRunHits} structured hit(s).`,
    };
  }

  const fallbackRun = normalizeRunEntry({
    runId: input.runId || input.runLabel || "RUN000",
    runLabel: input.runLabel || input.runId || "RUN000",
    count: 1,
    stageLabel: input.stageLabel || "",
    scenarioLabel: input.scenarioLabel || "",
    confidenceLabel: input.confidenceLabel || "",
  });

  return {
    runEntries: [fallbackRun],
    totalRunHits: 1,
    primaryRunLabel: fallbackRun.runLabel,
    runSummaryText:
      input.runSummaryText ||
      "1 RUN pattern recorded across 1 structured hit.",
  };
}

function createRunSummarySignature(runEntries = []) {
  return runEntries
    .map((entry) => `${entry.runLabel}:${entry.count}`)
    .join("|");
}

export function createReceiptHash(input = {}) {
  const runSummarySignature = createRunSummarySignature(
    Array.isArray(input.runEntries) ? input.runEntries : []
  );

  const behaviorSignature = [
    input.executionSummary?.totalEvents || 0,
    input.executionSummary?.structuredEventsCount || 0,
    input.executionSummary?.latestEventType || "",
    input.executionSummary?.mainObservedShift || "",
  ].join("|");

  const raw = [
    input.receiptId || "",
    getCaseSummary(input) || getCaseContext(input),
    getCaseScenarioCode(input),
    getCaseStage(input),
    runSummarySignature || getCaseRunCode(input),
    input.totalRunHits || "",
    behaviorSignature,
    input.generatedAt || "",
  ].join("|");

  let hash = 0;
  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash << 5) - hash + raw.charCodeAt(i);
    hash |= 0;
  }

  return `H-${Math.abs(hash).toString(16).toUpperCase()}`;
}

function getFirstNonEmpty(...values) {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    return value;
  }
  return null;
}

function resolveReceiptPayload(locationState = {}, routeData = null, storedData = null) {
  const directCaseData =
    locationState?.caseData ||
    locationState?.caseSchemaSnapshot ||
    locationState?.caseSchema ||
    null;

  const routeCaseData =
    routeData?.caseData ||
    routeData?.caseSchemaSnapshot ||
    routeData?.caseSchema ||
    null;

  const storedCaseData =
    storedData?.caseData ||
    storedData?.caseSchemaSnapshot ||
    storedData?.caseSchema ||
    null;

  const caseData = directCaseData || routeCaseData || storedCaseData || null;

  const eventHistorySummary =
    locationState?.eventHistorySummary ||
    locationState?.eventSummary ||
    routeData?.eventHistorySummary ||
    routeData?.eventSummary ||
    routeData?.executionSummary ||
    routeData?.eventExecutionSummary ||
    storedData?.eventHistorySummary ||
    storedData?.eventSummary ||
    storedData?.executionSummary ||
    storedData?.eventExecutionSummary ||
    null;

  const reviewResultSummary =
    locationState?.reviewResultSummary ||
    locationState?.reviewSummary ||
    locationState?.pilotResultSummary ||
    routeData?.reviewResultSummary ||
    routeData?.reviewSummary ||
    routeData?.pilotResultSummary ||
    storedData?.reviewResultSummary ||
    storedData?.reviewSummary ||
    storedData?.pilotResultSummary ||
    null;

  return {
    caseData,
    eventHistorySummary,
    reviewResultSummary,

    receiptTitle: getFirstNonEmpty(
      locationState?.receiptTitle,
      routeData?.receiptTitle,
      storedData?.receiptTitle
    ),
    receiptId: getFirstNonEmpty(
      locationState?.receiptId,
      routeData?.receiptId,
      storedData?.receiptId
    ),
    generatedAt: getFirstNonEmpty(
      locationState?.generatedAt,
      routeData?.generatedAt,
      storedData?.generatedAt
    ),
    verifiedAt: getFirstNonEmpty(
      locationState?.verifiedAt,
      routeData?.verifiedAt,
      storedData?.verifiedAt
    ),
    receiptHash: getFirstNonEmpty(
      locationState?.receiptHash,
      routeData?.receiptHash,
      storedData?.receiptHash
    ),

    runEntries:
      locationState?.runEntries ||
      reviewResultSummary?.runEntries ||
      routeData?.runEntries ||
      storedData?.runEntries ||
      [],

    runSummaryText: getFirstNonEmpty(
      locationState?.runSummaryText,
      reviewResultSummary?.runSummaryText,
      routeData?.runSummaryText,
      storedData?.runSummaryText
    ),

    topSignals:
      locationState?.topSignals ||
      reviewResultSummary?.topSignals ||
      routeData?.topSignals ||
      storedData?.topSignals ||
      [],

    nextStepTitle: getFirstNonEmpty(
      locationState?.nextStepTitle,
      reviewResultSummary?.nextStepTitle,
      routeData?.nextStepTitle,
      storedData?.nextStepTitle
    ),

    nextStepText: getFirstNonEmpty(
      locationState?.nextStepText,
      reviewResultSummary?.nextStepText,
      routeData?.nextStepText,
      storedData?.nextStepText
    ),

    confidenceLabel: getFirstNonEmpty(
      locationState?.confidenceLabel,
      reviewResultSummary?.confidenceLabel,
      routeData?.confidenceLabel,
      storedData?.confidenceLabel
    ),

    receiptNote: getFirstNonEmpty(
      locationState?.receiptNote,
      reviewResultSummary?.receiptNote,
      routeData?.receiptNote,
      storedData?.receiptNote
    ),

    verificationCtaText: getFirstNonEmpty(
      locationState?.verificationCtaText,
      reviewResultSummary?.verificationCtaText,
      routeData?.verificationCtaText,
      storedData?.verificationCtaText
    ),

    decisionStatus: getFirstNonEmpty(
      locationState?.decisionStatus,
      reviewResultSummary?.decisionStatus,
      routeData?.decisionStatus,
      storedData?.decisionStatus
    ),
  };
}

function normalizeReceiptData(input = {}) {
  const aggregation = buildRunAggregation({
    ...input,
    runEntries:
      input.runEntries ||
      input.reviewResultSummary?.runEntries ||
      [],
  });

  const normalizedCaseData = input.caseData
    ? normalizeCaseInput(input.caseData, { source: "receipt" })
    : null;

  const resolvedExecutionSummary =
    input.eventHistorySummary ||
    input.executionSummary ||
    input.eventExecutionSummary ||
    {};

  const resolvedReviewSummary = input.reviewResultSummary || {};

  return {
    receiptTitle: input.receiptTitle || "Decision Receipt",
    receiptId: input.receiptId || "RCPT-DEMO-001",
    generatedAt: input.generatedAt || new Date().toLocaleString(),
    verifiedAt: input.verifiedAt || "",
    receiptHash: input.receiptHash || "",

    summaryTitle:
      input.summaryTitle ||
      resolvedReviewSummary.summaryTitle ||
      "Recorded Decision Structure",

    summaryText:
      getCaseSummary({
        ...input,
        caseData: normalizedCaseData,
      }) ||
      resolvedReviewSummary.summaryText ||
      "This receipt records the structured RUN patterns identified during the current pilot window.",

    scenarioLabel:
      getCaseScenarioCode({
        ...input,
        caseData: normalizedCaseData,
      }) || "No Dominant Scenario",

    stageLabel:
      getCaseStage({
        ...input,
        caseData: normalizedCaseData,
      }) || "S0",

    runLabel:
      getCaseRunCode({
       ...input,
        caseData: normalizedCaseData,
      }) ||
      aggregation.primaryRunLabel ||
      "RUN000",

    caseInput: getCaseContext({
      ...input,
      caseData: normalizedCaseData,
    }),

    summaryContext: getCaseSummary({
      ...input,
      caseData: normalizedCaseData,
    }),

    displayContext:
      getCaseSummary({
        ...input,
        caseData: normalizedCaseData,
      }) ||
      getCaseContext({
        ...input,
        caseData: normalizedCaseData,
      }),

    runEntries: aggregation.runEntries,
    totalRunHits: aggregation.totalRunHits,
    primaryRunLabel: aggregation.primaryRunLabel,
    runSummaryText: aggregation.runSummaryText,

    executionSummary: {
      totalEvents: resolvedExecutionSummary.totalEvents ?? 0,
      structuredEventsCount: resolvedExecutionSummary.structuredEventsCount ?? 0,
      latestEventType: resolvedExecutionSummary.latestEventType || "other",
      latestEventLabel:
        resolvedExecutionSummary.latestEventLabel || "No recorded structural event",
      latestEventDescription:
        resolvedExecutionSummary.latestEventDescription || "",
      mainObservedShift:
        resolvedExecutionSummary.mainObservedShift ||
        "No behavioral shift recorded yet.",
      nextCalibrationAction:
        resolvedExecutionSummary.nextCalibrationAction ||
        "Record one real workflow event to begin calibration.",
      behaviorStatus:
        resolvedExecutionSummary.behaviorStatus || "behavior_weak",
    },

    topSignals: Array.isArray(input.topSignals) && input.topSignals.length > 0
      ? input.topSignals
      : Array.isArray(resolvedReviewSummary.topSignals) && resolvedReviewSummary.topSignals.length > 0
      ? resolvedReviewSummary.topSignals
      : [
          "dominant_failure_mode",
          "external_pressure",
          "pressure_revealed_weak_point",
        ],

    nextStepTitle:
      input.nextStepTitle ||
      resolvedReviewSummary.nextStepTitle ||
      "Recommended Next Step",

    nextStepText:
      input.nextStepText ||
      resolvedReviewSummary.nextStepText ||
      "Proceed to verification to confirm whether this aggregated RUN record can be checked consistently across the final output, proof, and receipt.",

    decisionStatus:
      input.decisionStatus ||
      resolvedReviewSummary.decisionStatus ||
      "Ready for Verification",

    confidenceLabel:
      input.confidenceLabel ||
      resolvedReviewSummary.confidenceLabel ||
      "High",

    receiptNote:
      input.receiptNote ||
      resolvedReviewSummary.receiptNote ||
      "This receipt is a structured record of aggregated RUN patterns for review and verification. It does not certify individual events, but validates the structural patterns observed across the pilot window.",

    verificationCtaText:
      input.verificationCtaText ||
      resolvedReviewSummary.verificationCtaText ||
      "Proceed to Verification",

    caseData: normalizedCaseData,
    schemaVersion: normalizedCaseData?.schemaVersion || null,
    structureScoreFromCase: normalizedCaseData?.structureScore ?? null,
    structureStatusFromCase: normalizedCaseData?.structureStatus || null,
    routeDecisionFromCase: normalizedCaseData?.routeDecision || null,
  };
}

export default function ReceiptPage() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const receiptViewedLoggedRef = React.useRef(false);
  const routeEnvelope = location.state || null;

  const storedRouteDecision = getStoredReceiptRouteDecision();
  const storedReceiptSource = getStoredReceiptSource();

  const routeDecision =
    routeEnvelope?.routeDecision ||
    storedRouteDecision ||
    null;

  const receiptSource =
    routeEnvelope?.receiptSource ||
    storedReceiptSource ||
    "";

  const rawReceiptMode = routeDecision?.mode || "";

  const receiptMode =
    rawReceiptMode === "case_receipt" || rawReceiptMode === "final_receipt"
      ? rawReceiptMode
      : receiptSource === "pilot_weekly_summary"
      ? "final_receipt"
      : "case_receipt";

  const routeData = location.state?.receiptPageData || null;
  const storedData = getStoredReceiptData();

  const resolvedPayload = resolveReceiptPayload(
    location.state || {},
    routeData,
    storedData
  );

    const normalized = normalizeReceiptData(resolvedPayload);
    const isVerified =
      normalized.verifiedAt ||
      location.state?.verificationPageData?.verifiedAt;
  
    const normalizedWithoutDecisionStatus = normalized;
  
    const baseReceiptData = {
      ...normalizedWithoutDecisionStatus,
        caseData: normalized.caseData || resolvedPayload.caseData || null,
      generatedAt: normalized.generatedAt || new Date().toLocaleString(),
  
      verifiedAt:
        normalized.verifiedAt ||
        location.state?.verificationPageData?.verifiedAt ||
        "",
  
      receiptHash:
        normalized.receiptHash ||
        createReceiptHash({
          ...normalized,
          runEntries: normalized.runEntries,
          totalRunHits: normalized.totalRunHits,
        }),
    };

  const rawData = {
    ...baseReceiptData,
    caseData: baseReceiptData.caseData || null,
    summaryContext: getCaseSummary(baseReceiptData),
    displayContext:
      getCaseSummary(baseReceiptData) ||
      getCaseContext(baseReceiptData),
  };

  const storedSharedReceiptVerificationContract =
    getStoredSharedReceiptVerificationContract();

  const incomingSharedReceiptVerificationContract =
    location.state?.sharedReceiptVerificationContract ||
    storedSharedReceiptVerificationContract ||
    null;

  const hasReceiptIdentity = !!(
    resolvedPayload.receiptId ||
    storedData?.receiptId ||
    routeData?.receiptId ||
    incomingSharedReceiptVerificationContract?.receiptId
  );

  const hasReceiptProof = !!(
    resolvedPayload.receiptHash ||
    storedData?.receiptHash ||
    routeData?.receiptHash ||
    incomingSharedReceiptVerificationContract?.receiptHash ||
    location.state?.evidenceLock?.receiptHash
  );

  const hasReceiptSource = !!(
    receiptSource ||
    incomingSharedReceiptVerificationContract?.receiptSource ||
    location.state?.evidenceLock?.receiptSource
  );

  const hasReceiptMode = !!(
    receiptMode ||
    incomingSharedReceiptVerificationContract?.receiptMode ||
    location.state?.evidenceLock?.receiptMode
  );

  const hasReceiptEligibilitySignal =
    incomingSharedReceiptVerificationContract?.scoring?.receiptEligible === true ||
    location.state?.sharedReceiptVerificationContract?.scoring?.receiptEligible === true ||
    routeDecision?.mode === "case_receipt" ||
    routeDecision?.mode === "final_receipt";

  const canRenderReceipt =
    (hasReceiptIdentity && hasReceiptSource) ||
    (hasReceiptIdentity && hasReceiptProof) ||
    (hasReceiptIdentity && hasReceiptMode) ||
    hasReceiptEligibilitySignal;

  const sharedContract = buildReceiptContract({
    ...(incomingSharedReceiptVerificationContract || {}),
    ...rawData,
    caseData: rawData.caseData || null,
    receiptSource,
  });

  const sharedFlat = flattenSharedReceiptVerificationContract(sharedContract);

  const data = {
    ...rawData,
    ...sharedFlat,

  executionSummary:
    sharedFlat.executionSummary ||
    rawData.executionSummary ||
    normalized.executionSummary || {
      totalEvents: 0,
      structuredEventsCount: 0,
      latestEventType: "other",
      latestEventLabel: "No recorded structural event",
      latestEventDescription: "",
      mainObservedShift: "No behavioral shift recorded yet.",
      nextCalibrationAction: "Record one real workflow event to begin calibration.",
      behaviorStatus: "behavior_weak",
    },

    totalRunHits:
      sharedFlat.totalRunHits ??
      rawData.totalRunHits ??
      normalized.totalRunHits ??
      0,

  topSignals:
    Array.isArray(sharedFlat.topSignals) && sharedFlat.topSignals.length > 0
      ? sharedFlat.topSignals
      : Array.isArray(rawData.topSignals) && rawData.topSignals.length > 0
      ? rawData.topSignals
      : Array.isArray(normalized.topSignals) && normalized.topSignals.length > 0
      ? normalized.topSignals
      : [],

  runEntries:
    Array.isArray(sharedFlat.runEntries) && sharedFlat.runEntries.length > 0
      ? sharedFlat.runEntries
      : Array.isArray(rawData.runEntries) && rawData.runEntries.length > 0
      ? rawData.runEntries
      : Array.isArray(normalized.runEntries)
      ? normalized.runEntries
      : [],

  confidenceLabel:
    sharedFlat.confidenceLabel ||
    rawData.confidenceLabel ||
    normalized.confidenceLabel ||
    "High",

  nextStepTitle:
    sharedFlat.nextStepTitle ||
    rawData.nextStepTitle ||
    normalized.nextStepTitle ||
    "Recommended Next Step",

  nextStepText:
    sharedFlat.nextStepText ||
    rawData.nextStepText ||
    normalized.nextStepText ||
    "Proceed to verification to confirm whether this aggregated RUN record can be checked consistently across the final output, proof, and receipt.",

  receiptNote:
    sharedFlat.receiptNote ||
    rawData.receiptNote ||
    normalized.receiptNote ||
    "This receipt is a structured record of aggregated RUN patterns for review and verification. It does not certify individual events, but validates the structural patterns observed across the pilot window.",

  verificationCtaText:
    sharedFlat.verificationCtaText ||
    rawData.verificationCtaText ||
    normalized.verificationCtaText ||
    "Proceed to Verification",

  decisionStatus:
    isVerified
      ? "Verified"
      : sharedFlat.decisionStatus || "Ready for Verification",
};

const finalEvidenceLock = {
  ...(location.state?.evidenceLock || {}),
  receiptId: data.receiptId,
  receiptHash: data.receiptHash,
  receiptSource,
  receiptMode: receiptMode,
};

const evidenceLock =
  location.state?.evidenceLock ||
  incomingSharedReceiptVerificationContract?.evidenceLock ||
  null;

const isEvidenceLockedConsistent =
  !evidenceLock ||
  (
    evidenceLock.receiptId === data.receiptId &&
    (!evidenceLock.receiptHash || evidenceLock.receiptHash === data.receiptHash) &&
    evidenceLock.receiptSource === receiptSource &&
    evidenceLock.receiptMode === receiptMode
  );

console.log("incoming evidenceLock =", evidenceLock);
console.log("current receiptId =", data.receiptId);
console.log("current receiptHash =", data.receiptHash);
console.log("current receiptSource / mode =", receiptSource, receiptMode);
console.log("lock checks =", {
  idMatch: evidenceLock?.receiptId === data.receiptId,
  hashMatch: !evidenceLock?.receiptHash || evidenceLock?.receiptHash === data.receiptHash,
  sourceMatch: evidenceLock?.receiptSource === receiptSource,
  modeMatch: evidenceLock?.receiptMode === receiptMode,
});

const receiptAllowsVerification =
  data.decisionStatus === "Ready for Verification" ||
  data.decisionStatus === "Verified" ||
  data.overallStatus === "Ready for Review" ||
  data.overallStatus === "Verified" ||
  sharedFlat?.overallStatus === "Ready for Review" ||
  sharedFlat?.overallStatus === "Verified" ||
  sharedFlat?.scoring?.receiptEligible === true ||
  incomingSharedReceiptVerificationContract?.scoring?.receiptEligible === true ||
  receiptMode === "case_receipt" ||
  receiptMode === "final_receipt";

const canEnterVerification =
  receiptAllowsVerification && isEvidenceLockedConsistent;

const verificationBlockedReason = !receiptAllowsVerification
  ? "Verification is unavailable because this receipt has not been issued for verification yet."
  : !isEvidenceLockedConsistent
  ? "Verification is locked because this receipt no longer matches the issued evidence chain."
  : "";

const verificationReturnStatus =
  location.state?.verificationPageData?.overallStatus || "";

const returnedFromFailedVerification =
  verificationReturnStatus === "Verification Failed";

React.useEffect(() => {
  const session =
    location.state?.trialSession || getTrialSession();

  if (!session?.userId || !session?.trialId) return;
  if (!canRenderReceipt) return;
  if (receiptViewedLoggedRef.current) return;

  receiptViewedLoggedRef.current = true;

  logTrialEvent(
    {
      userId: session.userId,
      trialId: session.trialId,
      sessionId:
        location.state?.session_id ||
        location.state?.sessionId ||
        data.caseData?.sessionId ||
        data.receiptId ||
        "receipt_entry",
      caseId:
        data.caseData?.caseId ||
        data.caseData?.id ||
        data.receiptId ||
        "receipt_entry",
      eventType: "receipt_viewed",
      page: "ReceiptPage",
      meta: {
        receiptMode,
        receiptSource,
        decisionStatus: data.decisionStatus,
        canEnterVerification,
        isVerified: !!data.verifiedAt,
        evidenceLockStatus: isEvidenceLockedConsistent
          ? "consistent"
          : "broken",
      },
    },
    { once: true }
  ).catch((error) => {
    console.error("receipt_viewed log error:", error);
  });
}, [
  canRenderReceipt,
  data.receiptId,
  data.decisionStatus,
  data.verifiedAt,
  receiptMode,
  receiptSource,
  canEnterVerification,
  isEvidenceLockedConsistent,
]);

if (!canRenderReceipt) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 px-6 py-10">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <p className="text-sm font-medium text-slate-500 mb-2">
            Receipt not ready
          </p>
          <h1 className="text-2xl font-bold mb-3">
            This entry has not been issued as a receipt
          </h1>
          <p className="text-slate-700 leading-7">
            This receipt could not be reconstructed from the current proof chain. Please return to the pilot result page and re-issue the receipt.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate(ROUTES.PILOT_RESULT, { state: location.state })}
              className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              Back to Pilot Result
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <p className="text-sm font-medium text-slate-500 mb-2">
            {receiptMode === "final_receipt"
              ? "Derived from 7-day pilot summary"
              : "Generated from a single pilot case"}
          </p>
          <h1 className="text-3xl font-bold mb-3">
            {receiptMode === "final_receipt"
              ? "Final Structure Proof"
              : "Case Structure Proof"}
          </h1>

          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-slate-500 mb-1">Receipt ID</p>
              <p className="font-semibold break-all">{data.receiptId}</p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-slate-500 mb-1">Generated At</p>
              <p className="font-semibold">{data.generatedAt}</p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-slate-500 mb-1">Verified At</p>
              <p className="font-semibold">
                {data.verifiedAt || "Not verified yet"}
              </p>
            </div>
          </div>

          <div className="mt-4 grid md:grid-cols-2 gap-4 text-sm">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-slate-500 mb-1">Receipt Hash</p>
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold break-all">{data.receiptHash}</p>

                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(data.receiptHash)}
                  className="shrink-0 text-xs font-medium text-green-700 bg-white border border-green-200 rounded-full px-3 py-1.5 hover:bg-green-50 hover:border-green-300 transition"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Deterministically generated from RUN structure and behavioral execution summary. Reproducible under the same inputs.
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-slate-500 mb-1">Evidence Lock</p>
              <p className="font-semibold">
                {isEvidenceLockedConsistent ? "Consistent" : "Broken"}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                {isEvidenceLockedConsistent
                  ? "Receipt matches the issued pilot evidence chain."
                  : "This receipt no longer matches the issued pilot evidence chain."}
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-slate-500 mb-1">Status</p>
              <p className="font-semibold">{data.decisionStatus}</p>
              <p className="text-xs text-slate-500 mt-2">
                This status reflects structural consistency evaluation across RUN aggregation, hash integrity, and verification readiness.
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-slate-500 mb-1">Case Schema</p>
              <p className="font-semibold">
                {data.schemaVersion || "Not attached"}
              </p>

              {typeof data.structureScoreFromCase === "number" ? (
                <p className="text-xs text-slate-500 mt-2">
                  Structure score: {data.structureScoreFromCase.toFixed(2)}
                </p>
              ) : null}

              {data.structureStatusFromCase ? (
                <p className="text-xs text-slate-500 mt-1">
                  Structure status: {data.structureStatusFromCase}
                </p>
              ) : null}
            </div>
          </div>
        </header>

        {returnedFromFailedVerification && (
          <section className="bg-red-50 rounded-2xl border border-red-200 p-6">
            <h2 className="text-lg font-semibold mb-2 text-red-800">
              Returned from verification recovery
            </h2>
            <p className="text-red-700 leading-7">
              This receipt has been reopened after verification was downgraded.
            </p>
            <p className="mt-3 text-red-700 leading-7">
              Use this page as the current recovery layer before trying to re-enter verification.
            </p>
          </section>
        )}

        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-semibold mb-3">{data.summaryTitle}</h2>

          <p className="text-slate-700 leading-7">
            {data.summaryText ||
              (receiptMode === "final_receipt"
                ? "This structure proof certifies the summarized outcome of the 7-day pilot window, including the dominant workflow, observed structure, and final decision path."
                : "This structure proof certifies the aggregated RUN patterns identified during the current pilot window.")}
          </p>

          {!data.summaryText && (
            <p className="mt-3 text-slate-700 leading-7">
              {receiptMode === "final_receipt"
                ? "It does not represent a generic recommendation. It formalizes the final pilot summary that was eligible for receipt generation."
                : "It does not represent a generic recommendation. It formalizes the structural patterns (RUNs) observed across the current pilot execution."}
            </p>
          )}
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Recorded Structure</h2>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-sm text-slate-500 mb-1">Scenario</p>
              <p className="font-semibold">
                {data.scenarioLabel || data.caseData?.scenarioCode || "No Dominant Scenario"}
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-sm text-slate-500 mb-1">Stage</p>
              <p className="font-semibold">
                {data.stageLabel || data.caseData?.stage || "S0"}
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-sm text-slate-500 mb-1">Confidence</p>
              <p className="font-semibold">{data.confidenceLabel}</p>
            </div>
          </div>

          <div className="mt-4 bg-slate-50 rounded-xl p-4 border border-slate-200">
            <div className="flex items-center justify-between gap-3 mb-3">
              <p className="text-sm text-slate-500">Aggregated RUNs</p>
              <p className="text-sm font-medium text-slate-600">
                {data.totalRunHits} total hit{data.totalRunHits > 1 ? "s" : ""}
              </p>
            </div>

            {Array.isArray(data.runEntries) && data.runEntries.length > 0 ? (
              <ul className="space-y-3">
                {data.runEntries.map((entry, index) => (
                  <li
                    key={`${entry.runLabel}-${index}`}
                    className="rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold">{entry.runLabel}</p>
                      <span className="text-sm font-medium text-slate-600">
                        × {entry.count}
                      </span>
                    </div>

                    {(entry.stageLabel || entry.scenarioLabel) && (
                      <p className="mt-2 text-sm text-slate-600">
                        {[entry.stageLabel, entry.scenarioLabel].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-600">No RUN aggregation available.</p>
            )}
          </div>

          <div className="mt-4 bg-slate-50 rounded-xl p-4 border border-slate-200">
            <p className="text-sm text-slate-500 mb-1">
              {receiptMode === "final_receipt" ? "Pilot summary" : "Case tested"}
            </p>
            <p className="font-semibold leading-7">
              {getSafeCaseSummary(data.caseData || {}) ||
                data.displayContext ||
                "No case attached"}
            </p>
          </div>
        </section>

              {data.caseData ? (
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-semibold mb-4">Case Schema Snapshot</h2>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <p className="text-sm text-slate-500 mb-1">Weakest dimension</p>
                <p className="font-semibold">
                  {data.caseData.weakestDimension || "Not specified"}
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <p className="text-sm text-slate-500 mb-1">Pattern</p>
                <p className="font-semibold">
                  {data.caseData.patternId || "PAT-00"}
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <p className="text-sm text-slate-500 mb-1">RUN fallback</p>
                <p className="font-semibold">
                  {data.caseData.fallbackRunCode || "RUN000"}
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <p className="text-sm text-slate-500 mb-1">Route decision</p>
                <p className="font-semibold">
                  {data.caseData.routeDecision?.mode || "summary_only"}
                </p>
                {data.caseData.routeDecision?.reason ? (
                  <p className="text-xs text-slate-500 mt-2">
                    {data.caseData.routeDecision.reason}
                  </p>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Execution Summary</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-sm text-slate-500 mb-1">Recorded events</p>
              <p className="font-semibold">{data.executionSummary?.totalEvents ?? 0}</p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-sm text-slate-500 mb-1">Structured events</p>
              <p className="font-semibold">{data.executionSummary?.structuredEventsCount ?? 0}</p>
            </div>
          </div>

          <div className="mt-4 grid md:grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                What happened
              </p>
              <p className="text-sm text-slate-500 mb-1">Latest event</p>
              <p className="font-semibold leading-7">
                {data.executionSummary?.latestEventLabel || "No recorded structural event"}
              </p>
            </div>

            {data.executionSummary?.latestEventDescription ? (
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <p className="text-sm text-slate-500 mb-1">Latest description</p>
                <p className="font-semibold leading-7">
                  {data.executionSummary.latestEventDescription}
                </p>
              </div>
            ) : null}

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                What it caused
              </p>
              <p className="text-sm text-slate-500 mb-1">Observed structural shift</p>
              <p className="font-semibold leading-7">
                {data.executionSummary?.mainObservedShift || "No behavioral shift recorded yet."}
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 md:col-span-2">
              <p className="text-sm text-slate-500 mb-1">Next calibration action</p>
              <p className="font-semibold leading-7">
                {data.executionSummary?.nextCalibrationAction || "Record one real workflow event to begin calibration."}
              </p>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Supporting Signals</h2>

          {Array.isArray(data.topSignals) && data.topSignals.length > 0 ? (
            <ul className="space-y-3">
              {data.topSignals.map((signal, index) => (
                <li
                  key={`${signal}-${index}`}
                  className="bg-slate-50 rounded-xl p-4 border border-slate-200"
                >
                  {signal}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-600">No signal data available.</p>
          )}
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-semibold mb-3">
            {returnedFromFailedVerification ? "Recovery step" : data.nextStepTitle}
          </h2>
          <p className="text-slate-700 leading-7">
            {returnedFromFailedVerification
              ? "Verification previously failed on this chain. Reconfirm this receipt as the current source of truth before attempting any further verification or activation."
              : receiptMode === "final_receipt"
              ? "Proceed to verification to confirm whether this final pilot summary, workflow, and decision path can be consistently checked across the final output, proof, and receipt."
              : "Proceed to verification to confirm whether this aggregated RUN structure can be consistently validated across the receipt, proof, and verification layers."}
          </p>
        </section>

        <div>
          <section className="bg-amber-50 rounded-2xl border border-amber-200 p-6">
            <h2 className="text-lg font-semibold mb-2">Record Note</h2>
            <p className="text-slate-700 leading-7">{data.receiptNote}</p>
          </section>

          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-2xl p-6 text-sm text-amber-900">
            <p>
              This record can be shared, but not verified externally.
            </p>
            <p className="mt-1 font-medium">
              Verification unlocks audit-ready proof.
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          {canEnterVerification ? (
            <button
              type="button"
              onClick={() => {
                const session =
                  location.state?.trialSession || getTrialSession();

                logTrialEvent(
                  {
                    userId:
                      session?.userId ||
                      location.state?.stableUserId ||
                      localStorage.getItem("nimclea_user_id") ||
                      "anonymous_user",
                    trialId:
                      session?.trialId ||
                      session?.trialSessionId ||
                      "receipt_entry",
                    sessionId:
                      location.state?.session_id ||
                      location.state?.sessionId ||
                      data.caseData?.sessionId ||
                      data.receiptId ||
                      "receipt_entry",
                    caseId:
                      data.caseData?.caseId ||
                      data.caseData?.id ||
                      data.receiptId ||
                      "receipt_entry",
                    eventType: "receipt_to_verification_clicked",
                    page: "ReceiptPage",
                    meta: {
                      receiptMode,
                      receiptSource,
                      decisionStatus: data.decisionStatus,
                      canEnterVerification,
                      evidenceLockStatus: isEvidenceLockedConsistent
                        ? "consistent"
                        : "broken",
                    },
                  },
                  { once: true }
                ).catch((error) => {
                  console.error("receipt_to_verification_clicked log error:", error);
                });
          
                navigate(ROUTES.VERIFICATION, {
                  state: {
                    ...(location.state || {}),
                    receiptPageData: data,
                    sharedReceiptVerificationContract: sharedContract,
                    caseData: data.caseData || null,
                    verificationPageData: location.state?.verificationPageData || null,
                    routeDecision,
                    receiptSource,
                    evidenceLock: finalEvidenceLock,
                  },
                });
              }}
              className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              {returnedFromFailedVerification
                ? "Retry Verification from Recovered Receipt →"
                : data.verificationCtaText || "Proceed to Verification"}
            </button>
          ) : (
            <div className="flex flex-col gap-3">
              <button
                type="button"
                disabled
                className={`inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold shadow-sm cursor-not-allowed ${
                  !receiptAllowsVerification
                    ? "bg-red-700 text-white"
                    : "bg-slate-300 text-slate-600"
                }`}
                title={verificationBlockedReason}
              >
                {!receiptAllowsVerification ? "Verification Unavailable" : "Verification Locked"}
              </button>

              <div
                className={`rounded-xl px-4 py-3 text-sm ${
                  !receiptAllowsVerification
                   ? "border border-red-200 bg-red-50 text-red-700"
                    : "border border-red-200 bg-red-50 text-red-700"
                }`}
              >
               {returnedFromFailedVerification
                  ? "Verification was previously downgraded on this chain, and the receipt still needs recovery before re-entry."
                  : verificationBlockedReason}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}