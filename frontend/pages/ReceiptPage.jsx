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
    runId: entry.runId || entry.runLabel || "",
    runLabel: entry.runLabel || entry.runId || "",
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
    runId: input.runId || input.runLabel || "",
    runLabel: input.runLabel || input.runId || "",
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
      "READY FOR FORMAL DETERMINATION",

    confidenceLabel:
      input.confidenceLabel ||
      resolvedReviewSummary.confidenceLabel ||
      "High",

    receiptNote:
      input.receiptNote ||
      resolvedReviewSummary.receiptNote ||
      "This record establishes a single baseline for scope, ownership, and later review. Once issued, it prevents post-hoc revision, denial, or responsibility drift.",

    verificationCtaText:
      input.verificationCtaText ||
      resolvedReviewSummary.verificationCtaText ||
      "Open Verification Review",

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
    "This record establishes a single baseline for scope, ownership, and later review. Once issued, it prevents post-hoc revision, denial, or responsibility drift.",

  verificationCtaText:
    sharedFlat.verificationCtaText ||
    rawData.verificationCtaText ||
    normalized.verificationCtaText ||
    "Open Verification Review",

  decisionStatus: (() => {
    if (isVerified) return "Verified";

    const isEligible =
      sharedFlat?.scoring?.receiptEligible === true ||
      incomingSharedReceiptVerificationContract?.scoring?.receiptEligible === true;

    if (isEligible) return "READY FOR FORMAL DETERMINATION";

    return "Receipt Failed";
  })(),
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
  data.decisionStatus === "READY FOR FORMAL DETERMINATION" ||
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

const canFormalizeProof =
  data.decisionStatus === "READY FOR FORMAL DETERMINATION" ||
  data.decisionStatus === "Verified";

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
          <p className="text-sm font-medium text-slate-500 mb-1">
            {receiptMode === "final_receipt"
              ? "Structure-level output"
              : "Generated from a single pilot case"}
          </p>

          <p className="text-xs text-slate-400">
            {receiptMode === "final_receipt"
              ? "Recorded structure state issued from pilot execution"
              : "Recorded case structure from pilot execution"}
          </p>

          <h1
            className="font-bold tracking-tight text-slate-900 mt-3 mb-2"
            style={{ fontSize: "28px", lineHeight: "1.2" }}
          >
            {receiptMode === "final_receipt"
              ? "Official Baseline Record"
              : "Case Baseline Record"}
          </h1>

          <p className="text-sm text-slate-600 mt-1 mb-3">
            This record locks the current structure as the official baseline for scope, ownership, and future review.
          </p>

          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
              <span
                style={{
                  width: "16px",
                  height: "16px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "999px",
                  border: "1px solid #86EFAC",
                  background: "#ECFDF5",
                  fontSize: "10px",
                  lineHeight: 1,
                }}
              >
                🛡
              </span>
              Issued by Nimclea Engine
            </span>

            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-500">
              deterministic structure record
            </span>
          </div>

          <div
            style={{
              backgroundColor: "#F8FAFC",
              border: "1px solid #CBD5E1",
          borderRadius: "20px",
              padding: "14px 16px",
              marginTop: "12px",
            }}
          >
            {/* ===== Row 1：ID / Time / Verified ===== */}
           <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                alignItems: "center",
              }}
            >
              <div style={{ padding: "6px 16px", borderRight: "1px solid #CBD5E1" }}>
                <p style={{ fontSize: "13px", color: "#64748B", margin: "0 0 6px 0" }}>
                  Receipt ID
                </p>
                <p style={{ fontWeight: 600, margin: 0 }}>{data.receiptId}</p>
              </div>

              <div style={{ padding: "6px 16px", borderRight: "1px solid #CBD5E1" }}>
                <p style={{ fontSize: "13px", color: "#64748B", margin: "0 0 6px 0" }}>
                  Generated At
                </p>
                <p style={{ fontWeight: 600, margin: 0 }}>{data.generatedAt}</p>
              </div>
          
              <div style={{ padding: "6px 16px" }}>
                <p style={{ fontSize: "13px", color: "#64748B", margin: "0 0 6px 0" }}>
                  Verified At
                </p>
                <p style={{ fontWeight: 600, margin: 0 }}>
                  {data.verifiedAt || "Not verified yet"}
                </p>
              </div>
            </div>
          
            <div style={{ margin: "12px 0", height: "1px", background: "#CBD5E1" }} />
          
            {/* ===== Row 2：Hash / Lock ===== */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
              <div style={{ padding: "6px 16px" }}>
                <p style={{ fontSize: "13px", color: "#64748B", margin: "0 0 6px 0" }}>
                  Receipt Hash
                </p>
          
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <p style={{ fontWeight: 600, margin: 0 }}>{data.receiptHash}</p>
          
                  <button
                    onClick={() => navigator.clipboard.writeText(data.receiptHash)}
                    style={{
                      fontSize: "11px",
                      padding: "4px 10px",
                      borderRadius: "999px",
                      border: "1px solid #CBD5E1",
                      background: "white",
                      cursor: "pointer",
                    }}
                  >
                    Copy
                  </button>
                </div>
          
                <p style={{ fontSize: "11px", color: "#64748B", margin: 0, lineHeight: 1.5 }}>
                  This hash locks the issued baseline. Any material change to structure, scope, or evidence breaks the record.
                </p>
              </div>
          
              <div
                style={{
                  padding: "6px 16px",
                  borderLeft: "1px solid #CBD5E1",
                }}
              >
                <p style={{ fontSize: "13px", color: "#64748B", margin: "0 0 10px 0" }}>
                  Evidence Lock
                </p>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    margin: "0 0 8px 0",
                    color: isEvidenceLockedConsistent ? "#059669" : "#DC2626",
                    fontWeight: 700,
                    fontSize: "16px",
                  }}
                >
                  <span
                    style={{
                      width: "22px",
                      height: "22px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "999px",
                      background: isEvidenceLockedConsistent ? "#059669" : "#DC2626",
                      color: "#ffffff",
                      fontSize: "12px",
                      lineHeight: 1,
                    }}
                  >
                    {isEvidenceLockedConsistent ? "✓" : "!"}
                  </span>

                  <span>{isEvidenceLockedConsistent ? "Consistent" : "Broken"}</span>
                </div>

                <p style={{ fontSize: "11px", color: "#64748B", margin: 0, lineHeight: 1.5 }}>
                  {isEvidenceLockedConsistent
                    ? "Receipt matches the issued pilot evidence chain."
                    : "Evidence chain mismatch detected."}
                </p>

                <div style={{ marginTop: "10px" }}>
                  <p
                    style={{
                      fontSize: "11px",
                      color: "#64748B",
                      margin: 0,
                      lineHeight: 1.5,
                      fontWeight: 500,
                    }}
                  >
                    Structure trace is preserved in the locked baseline and is fully expressed through downstream evidence outputs.
                  </p>
                </div>
              </div>
            </div>
          
            <div style={{ margin: "12px 0", height: "1px", background: "#CBD5E1" }} />
          
            {/* ===== Row 3：Status / Schema ===== */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                alignItems: "stretch",
                gap: "0px",
              }}
            >
              <div
                style={{
                  padding: "12px 18px 12px 14px",
                  marginTop: "12px",
                  marginRight: "6px",
                  borderRadius: "16px",
                  background:
                    data.decisionStatus === "Verified"
                      ? "#ECFDF5"
                      : data.decisionStatus === "READY FOR FORMAL DETERMINATION"
                      ? "#F0FDF4"
                      : "#FEF2F2",
                  border:
                    data.decisionStatus === "Verified"
                     ? "1px solid #86EFAC"
                      : data.decisionStatus === "READY FOR FORMAL DETERMINATION"
                      ? "1px solid #86EFAC"
                      : "1px solid #FCA5A5",
                }}
              >
                <p
                  style={{
                    fontSize: "13px",
                    color:
                      data.decisionStatus === "Verified" ||
                      data.decisionStatus === "READY FOR FORMAL DETERMINATION"
                        ? "#059669"
                        : "#B91C1C",
                    margin: "0 0 10px 0",
                  }}
                >
                  Status (Judgment)
                </p>
              
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <span
                    style={{
                      width: "44px",
                      height: "44px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "999px",
                      background:
                        data.decisionStatus === "Verified" ||
                        data.decisionStatus === "READY FOR FORMAL DETERMINATION"
                          ? "#059669"
                          : "#DC2626",
                      color: "#ffffff",
                      fontSize: "22px",
                      lineHeight: 1,
                      flexShrink: 0,
                    }}
                  >
                    {data.decisionStatus === "Verified"
                      ? "✓"
                      : data.decisionStatus === "READY FOR FORMAL DETERMINATION"
                      ? "⚖"
                      : "✕"}
                  </span>
              
                  <div style={{ minWidth: 0 }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "15px",
                        fontWeight: 800,
                        letterSpacing: "0.02em",
                        color:
                          data.decisionStatus === "Verified" ||
                          data.decisionStatus === "READY FOR FORMAL DETERMINATION"
                            ? "#047857"
                            : "#991B1B",
                      }}
                    >
                      {data.decisionStatus.toUpperCase()}
                    </p>
              
                    <p
                      style={{
                        fontSize: "11px",
                        color: "#64748B",
                        margin: "8px 0 0 0",
                        lineHeight: 1.5,
                      }}
                    >
                      Baseline issuance is required for a valid and enforceable determination.
                    </p>
                  </div>
                </div>
              </div>

              <div
                style={{
                  padding: "6px 16px",
                  borderLeft: "1px solid #CBD5E1",
                }}
              >
                <p style={{ fontSize: "13px", color: "#64748B", margin: "0 0 6px 0" }}>
                  Case Schema
                </p>
                <p style={{ fontWeight: 600, margin: "0 0 6px 0" }}>
                  {data.schemaVersion || "Not attached"}
                </p>

                {typeof data.structureScoreFromCase === "number" && (
                  <p
                    style={{
                      fontSize: "11px",
                      color: "#64748B",
                      margin: "0 0 4px 0",
                      lineHeight: 1.5,
                    }}
                  >
                    Structure score: {data.structureScoreFromCase.toFixed(2)}
                  </p>
                )}

                {data.structureStatusFromCase && (
                  <p
                    style={{
                      fontSize: "11px",
                      color: "#64748B",
                      margin: 0,
                      lineHeight: 1.5,
                    }}
                  >
                    Structure status: {data.structureStatusFromCase}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6">
            {canFormalizeProof ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-700 font-medium">
                  This step locks the current structure as the official baseline record.
                  No baseline, no valid determination or evidence.
                </p>

                <p style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#D97706"
                }}>
                  It defines scope, ownership, and the reference point for all later review.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    window.location.href =
                      "https://buy.stripe.com/xxxxxxxxxxxx";
                  }}
                  className="inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition"
                  style={{
                    backgroundColor: "#D97706",
                    color: "#ffffff",
                    boxShadow: "0 4px 14px rgba(194,65,12,0.28)",
                  }}
                >
                  Lock Official Baseline Record
                </button>

                <p className="text-[11px] text-slate-400 mt-2">
                  You will review and confirm before the record becomes irreversible.
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() =>
                  navigate(ROUTES.PILOT_RESULT, { state: location.state })
                }
                className="inline-flex items-center justify-center rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
              >
                Return to Pilot Result
              </button>
            )}
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
            <h2 className="text-lg font-semibold mb-3">Recorded Structure</h2>

            <div
              style={{
                backgroundColor: "#F8FAFC",
                border: "1px solid #CBD5E1",
                borderRadius: "20px",
                padding: "14px 16px",
              }}
            >
              {/* ===== Row 1：Scenario / Stage / Confidence ===== */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    padding: "6px 16px",
                    borderRight: "1px solid #CBD5E1",
                  }}
                >
                  <p
                    style={{
                      fontSize: "13px",
                      color: "#64748B",
                      margin: "0 0 6px 0",
                    }}
                  >
                    Scenario
                  </p>
                  <p
                    style={{
                      fontSize: "15px",
                      fontWeight: 600,
                      margin: 0,
                    }}
                  >
                    {data.scenarioLabel || "No Dominant Scenario"}
                  </p>
                </div>

                <div
                  style={{
                    padding: "6px 16px",
                    borderRight: "1px solid #CBD5E1",
                  }}
                >
                  <p
                    style={{
                      fontSize: "13px",
                      color: "#64748B",
                      margin: "0 0 6px 0",
                    }}
                  >
                    Stage
                  </p>
                  <p
                    style={{
                      fontSize: "15px",
                      fontWeight: 600,
                      margin: 0,
                    }}
                  >
                    {data.stageLabel || "S0"}
                  </p>
                </div>
          
                <div
                  style={{
                    padding: "6px 16px",
                  }}
                >
                  <p
                    style={{
                      fontSize: "13px",
                      color: "#64748B",
                      margin: "0 0 6px 0",
                    }}
                  >
                    Confidence
                  </p>
                  <p
                    style={{
                      fontSize: "15px",
                      fontWeight: 600,
                      margin: 0,
                    }}
                  >
                    {data.confidenceLabel}
                  </p>
                </div>
              </div>
          
              <div
                style={{
                  margin: "12px 0",
                  height: "1px",
                  background: "#CBD5E1",
                }}
              />

              {/* ===== Row 2：RUN summary ===== */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0 16px",
                }}
              >
                <p
                  style={{
                    fontSize: "13px",
                    color: "#64748B",
                    margin: 0,
                  }}
                >
                  Aggregated RUNs
                </p>
                <p
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    margin: 0,
                    color: "#0F172A",
                  }}
                >
                  {data.totalRunHits} total hit{data.totalRunHits > 1 ? "s" : ""}
                </p>
              </div>

              <div
                style={{
                  margin: "12px 0",
                  height: "1px",
                  background: "#CBD5E1",
                }}
              />

              {/* ===== Row 3：Pilot summary ===== */}
              <div style={{ padding: "0 16px" }}>
                <p
                  style={{
                    fontSize: "13px",
                    color: "#64748B",
                    margin: "0 0 4px 0",
                  }}
                >
                  {receiptMode === "final_receipt" ? "Pilot summary" : "Case tested"}
                </p>

                <p
                  style={{
                    fontWeight: 600,
                    lineHeight: 1.4,
                    margin: 0,
                  }}
                >
                  {(() => {
                    const summary =
                      getSafeCaseSummary(data.caseData || {}) ||
                      data.displayContext ||
                      "";
          
                    if (!summary || summary === "No structured summary available.") {
                      return "No pilot case summary attached.";
                    }
          
                    return summary;
                  })()}
                </p>
              </div>
           </div>
          </section>

      {data.caseData ? (
        <section className="mt-4 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold mb-3">Case Schema Snapshot</h2>

          <div
            style={{
              backgroundColor: "#F8FAFC",
              border: "1px solid #CBD5E1",
              borderRadius: "20px",
              padding: "12px 16px",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  padding: "2px 18px",
                  borderRight: "1px solid #CBD5E1",
                }}
              >
                <p
                  style={{
                    fontSize: "13px",
                    color: "#64748B",
                    margin: "0 0 10px 0",
                  }}
                >
                  Weakest dimension
                </p>
                <p
                  style={{
                    fontSize: "16px",
                    fontWeight: 600,
                    lineHeight: 1,
                    margin: 0,
                  }}
                >
                  {data.caseData.weakestDimension || "Not specified"}
                </p>
              </div>
      
              <div
                style={{
                  padding: "2px 18px",
                  borderRight: "1px solid #CBD5E1",
                }}
              >
                <p
                  style={{
                    fontSize: "13px",
                    color: "#64748B",
                    margin: "0 0 10px 0",
                  }}
                >
                  Pattern
                </p>
                <p
                  style={{
                    fontSize: "16px",
                    fontWeight: 600,
                    lineHeight: 1,
                    margin: 0,
                  }}
                >
                  {data.caseData.patternId || "PAT-00"}
                </p>
              </div>
      
              <div
                style={{
                  padding: "2px 18px",
                  borderRight: "1px solid #CBD5E1",
                }}
              >
                <p
                  style={{
                    fontSize: "13px",
                    color: "#64748B",
                    margin: "0 0 10px 0",
                  }}
                >
                  RUN fallback
                </p>
                <p
                  style={{
                    fontSize: "16px",
                    fontWeight: 600,
                    lineHeight: 1,
                    margin: 0,
                  }}
                >
                  {data.caseData.fallbackRunCode || "RUN not resolved"}
                </p>
              </div>
      
              <div
                style={{
                  padding: "2px 18px",
                }}
              >
                <p
                  style={{
                    fontSize: "13px",
                    color: "#64748B",
                    margin: "0 0 10px 0",
                  }}
                >
                  Route decision
                </p>
                <p
                  style={{
                    fontSize: "16px",
                    fontWeight: 600,
                    lineHeight: 1,
                    margin: 0,
                  }}
                >
                  {data.caseData.routeDecision?.mode || "summary_only"}
                </p>
      
                {data.caseData.routeDecision?.reason ? (
                  <p
                    style={{
                      margin: "8px 0 0 0",
                      fontSize: "11px",
                      lineHeight: 1.25,
                      color: "#64748B",
                    }}
                  >
                    {data.caseData.routeDecision.reason}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      ) : null}

        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold mb-3">Execution Summary</h2>

          <div
            style={{
              backgroundColor: "#F8FAFC",
              border: "1px solid #CBD5E1",
              borderRadius: "20px",
              padding: "14px 16px",
            }}
          >
            {/* ===== Row 1 ===== */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
              <div style={{ padding: "6px 16px" }}>
                <p style={{ fontSize: "13px", color: "#64748B" }}>
                  Recorded events
                </p>
                <p style={{ fontSize: "16px", fontWeight: 600 }}>
                  {data.executionSummary?.totalEvents ?? 0}
                </p>
              </div>

              <div
                style={{
                  padding: "6px 16px",
                  borderLeft: "1px solid #CBD5E1",
                }}
              >
                <p style={{ fontSize: "13px", color: "#64748B" }}>
                  Structured events
                </p>
                <p style={{ fontSize: "16px", fontWeight: 600 }}>
                  {data.executionSummary?.structuredEventsCount ?? 0}
                </p>
              </div>
            </div>

            <div style={{ margin: "10px 0", height: "1px", background: "#CBD5E1" }} />

            {/* ===== Row 2 ===== */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
              <div style={{ padding: "6px 16px" }}>
                <p style={{ fontSize: "12px", color: "#64748B" }}>
                  WHAT HAPPENED
                </p>
                <p style={{ fontSize: "13px", color: "#64748B" }}>
                  Latest event
                </p>
                <p style={{ fontWeight: 600 }}>
                  {data.executionSummary?.latestEventLabel}
                </p>
              </div>
          
              <div
                style={{
                  padding: "6px 16px",
                  borderLeft: "1px solid #CBD5E1",
                }}
              >
                <p style={{ fontSize: "13px", color: "#64748B" }}>
                  Latest description
                </p>
                <p style={{ fontWeight: 600 }}>
                  {data.executionSummary?.latestEventDescription}
                </p>
              </div>
            </div>
          
            <div style={{ margin: "10px 0", height: "1px", background: "#CBD5E1" }} />
          
            {/* ===== Row 3 ===== */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
              <div style={{ padding: "6px 16px" }}>
                <p style={{ fontSize: "12px", color: "#64748B" }}>
                  WHAT IT CAUSED
                </p>
                <p style={{ fontSize: "13px", color: "#64748B" }}>
                  Observed structural shift
                </p>
                <p style={{ fontWeight: 600 }}>
                  {data.executionSummary?.mainObservedShift}
                </p>
              </div>
          
              <div
                style={{
                  padding: "6px 16px",
                  borderLeft: "1px solid #CBD5E1",
                }}
              >
                <p style={{ fontSize: "13px", color: "#64748B" }}>
                  Next calibration action
                </p>
                <p style={{ fontWeight: 600 }}>
                  {data.executionSummary?.nextCalibrationAction}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold mb-3">Supporting Signals</h2>

          {Array.isArray(data.topSignals) && data.topSignals.length > 0 ? (
            <div
              style={{
                backgroundColor: "#F8FAFC",
                border: "1px solid #CBD5E1",
                borderRadius: "20px",
                padding: "12px 16px",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${data.topSignals.length}, minmax(0, 1fr))`,
                  alignItems: "center",
                }}
              >
                {data.topSignals.map((signal, index) => (
                  <div
                    key={`${signal}-${index}`}
                    style={{
                      padding: "2px 14px",
                      borderRight:
                        index < data.topSignals.length - 1
                          ? "1px solid #CBD5E1"
                          : "none",
                      flex: "1 1 auto",   // ✅ 关键：允许变宽
                      minWidth: "0",      // ✅ 防止溢出
                    }}
                  >
                    {/* 上：label */}
                    <p
                      style={{
                        fontSize: "13px",
                        color: "#64748B",
                        margin: "0 0 8px 0",
                      }}
                    >
                      Signal {index + 1}
                    </p>
        
                    {/* 下：value（不加粗 👇） */}
                    <p
                      style={{
                        fontSize: "16px",
                        fontWeight: 600, 
                        margin: 0,
                        color: "#0F172A",
                        whiteSpace: "normal",
                        wordBreak: "keep-all",
                        overflowWrap: "break-word",
                      }}
                    >
                      {signal}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-slate-600">No signal data available.</p>
          )}
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold mb-2">
            Receipt status
          </h2>
          <p className="text-slate-700 leading-7">
            {returnedFromFailedVerification
              ? "This receipt has returned from a failed verification path. Use Verification to review the current failure state and see the repair path."
              : canEnterVerification
              ? "This receipt is now carrying the current structure forward. Open Verification to review whether the proof is ready, warning, or failed."
              : "This receipt records the current structure state. Open Verification to see the failure or warning state, along with the repair path and smallest next action."}
          </p>
        </section>

        <div>
          <section className="bg-amber-50 rounded-2xl border border-amber-200 p-6">
            <h2 className="text-lg font-semibold mb-2">Record Note</h2>
            <p className="text-slate-700 leading-7">{data.receiptNote}</p>
          </section>

          <div className="mt-8 flex flex-wrap items-center gap-3">
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
                ).catch(() => {});
                
                navigate(ROUTES.VERIFICATION, {
                  state: {
                    ...(location.state || {}),
                    receiptPageData: data,
                    sharedReceiptVerificationContract: sharedContract,
                    caseData: data.caseData || null,
                    verificationPageData:
                      location.state?.verificationPageData || null,
                    routeDecision,
                    receiptSource,
                    evidenceLock: finalEvidenceLock,
                  },
                });
              }}
              className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              {returnedFromFailedVerification
                ? "Re-open Verification Status"
                : "View Verification Status"}
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
              >
                {!receiptAllowsVerification
                  ? "Verification Unavailable"
                  : "Verification Locked"}
              </button>
            </div>
          )}

          {/* 👇 新增：Back to Pilot 按钮 */}
          <button
            type="button"
            onClick={() =>
              navigate(ROUTES.PILOT_RESULT, { state: location.state })
            }
            className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-100"
          >
            Back to Pilot
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}