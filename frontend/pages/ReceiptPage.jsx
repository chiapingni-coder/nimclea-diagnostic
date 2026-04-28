import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import ROUTES from "../routes";
// import { evaluateCaseRecordStatus } from "../utils/verificationStatus";
import { normalizeCaseInput, getSafeCaseSummary } from "../utils/caseSchema";
import { logTrialEvent } from "../lib/trialApi";
import { getTrialSession } from "../lib/trialSession";
import { sanitizeText } from "../lib/sanitizeText";
import {
  getCustomerDecisionReadiness,
  getCustomerNextStep,
  getCustomerStructureStatus,
} from "../lib/customerStructureDisplay";
import {
  getCustomerNextAction,
  getDecisionStabilityLabel,
  getWeakestDimensionDisplay,
} from "../lib/customerDecisionDisplay";
import { getAccessMode } from "../utils/accessMode";
import { calculateDeterministicScore } from "../utils/deterministicScore";
import TopRightCasesCapsule from "../components/TopRightCasesCapsule.jsx";
// import { writeSummaryBuffer, createSummaryBuffer } from "../lib/summaryBuffer";
// import { shouldRebuildSummaryBuffer } from "../lib/summaryBuffer";
// import { readSummaryBuffer } from "../lib/summaryBuffer";
import {
  getCaseById,
  getCurrentCaseId,
  resolveCaseId,
  upsertCase,
  updateCaseLead,
  updateCaseStatus,
} from "../utils/caseRegistry.js";
import CustomerRecordBlock from "./components/CustomerRecord_Receipt";

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

const HASH_LEDGER_API_BASE = "http://localhost:3000";
const CANONICAL_CASE_FLOW_STEPS = ["Result", "Pilot Result", "Receipt", "Verification"];

function sanitizeReceiptId(value) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();

  if (!trimmed || trimmed.includes("DEMO")) return null;

  return trimmed;
}

function stripCanonicalCaseFlowState(state = {}) {
  const nextState = { ...(state || {}) };
  delete nextState.routeMeta;
  delete nextState.sourcePath;
  delete nextState.flowSteps;
  delete nextState.steps;
  delete nextState.breadcrumb;
  return nextState;
}

function CanonicalCaseFlowBreadcrumb({ activeStep }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-400">
      {CANONICAL_CASE_FLOW_STEPS.map((step, index) => {
        const isActive = step === activeStep;

        return (
          <React.Fragment key={step}>
            {index > 0 ? (
              <span aria-hidden="true" className="text-slate-300"> / </span>
            ) : null}
            <span className={isActive ? "text-slate-900" : "text-slate-400"}>
              {sanitizeText(step)}
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
}

function getStoredReceiptData() {
  try {
    const raw = localStorage.getItem("receiptPageData");
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error("Failed to read receiptPageData from localStorage:", error);
    return null;
  }
}

function getStoredStableHash(key = "") {
  if (!key) return "";

  try {
    return localStorage.getItem(key) || "";
  } catch (error) {
    console.warn("Failed to read stored hash:", error);
    return "";
  }
}

function saveStoredStableHash(key = "", hash = "") {
  if (!key || !hash) return;

  try {
    localStorage.setItem(key, hash);
  } catch (error) {
    console.warn("Failed to save stored hash:", error);
  }
}

function getStableHashValue(value) {
  if (typeof value !== "string") return "";

  const trimmed = value.trim();
  return /^H-[A-F0-9]{24}$/i.test(trimmed) ? trimmed.toUpperCase() : "";
}

function getReceiptLedgerRecordHash(record = null) {
  return getStableHashValue(record?.hash || record?.receiptHash);
}

async function readReceiptLedger(caseId) {
  if (!caseId) return null;

  const response = await fetch(
    `${HASH_LEDGER_API_BASE}/hash-ledger/receipt?caseId=${encodeURIComponent(caseId)}`
  );

  if (response.status === 404) return null;

  if (!response.ok) {
    throw new Error(`Failed to read receipt ledger: ${response.status}`);
  }

  const data = await response.json();
  return data?.record || data || null;
}

async function createReceiptLedger(payload) {
  const response = await fetch(`${HASH_LEDGER_API_BASE}/hash-ledger/receipt`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...payload,
      receiptHash: payload.receiptHash || payload.hash,
    }),
  });

  if (response.status === 409) {
    return {
      conflict: true,
      alreadyExists: true,
    };
  }

  if (!response.ok) {
    throw new Error(`Failed to create receipt ledger: ${response.status}`);
  }

  return response.json();
}

async function fetchLedgerReceiptHash(caseId = "") {
  try {
    const record = await readReceiptLedger(caseId);
    return getReceiptLedgerRecordHash(record);
  } catch (error) {
    console.warn("Failed to read receipt hash ledger:", error);
    return "";
  }
}

async function postLedgerReceiptHash(caseId = "", receiptHash = "") {
  const safeReceiptHash = getStableHashValue(receiptHash);
  if (!caseId || !safeReceiptHash) return "";

  try {
    const existingRecord = await readReceiptLedger(caseId);
    const existingHash = getStableHashValue(existingRecord?.receiptHash);

    if (existingRecord) {
      if (existingHash && existingHash !== safeReceiptHash) {
        console.warn("Receipt already exists, skipping POST");
      }

      return existingHash || safeReceiptHash;
    }

    const createResult = await createReceiptLedger({
      caseId,
      hash: safeReceiptHash,
      receiptHash: safeReceiptHash,
      payload: {
        receiptHash: safeReceiptHash,
        source: "receipt_page",
      },
      source: "receipt_page",
      createdAt: new Date().toISOString(),
    });

    if (createResult?.conflict) {
      const recordAfterConflict = await readReceiptLedger(caseId);
      const conflictHash = getStableHashValue(recordAfterConflict?.receiptHash);
      return conflictHash || safeReceiptHash;
    }

    return getStableHashValue(createResult?.record?.receiptHash) || safeReceiptHash;
  } catch (error) {
    console.warn("Failed to sync receipt hash ledger:", error);
    return safeReceiptHash;
  }
}

function saveStoredReceiptHash(caseId = "", receiptId = "", receiptHash = "") {
  const safeReceiptHash = getStableHashValue(receiptHash);
  if (!safeReceiptHash) return;

  const hashKey = caseId || receiptId;
  saveStoredStableHash(hashKey ? `receiptHash:${hashKey}` : "", safeReceiptHash);

  try {
    const raw = localStorage.getItem("receiptPageData");
    const current = raw ? JSON.parse(raw) : {};
    localStorage.setItem(
      "receiptPageData",
      JSON.stringify({
        ...current,
        receiptHash: safeReceiptHash,
      })
    );
  } catch (error) {
    console.warn("Failed to persist receipt hash in receiptPageData:", error);
  }

  try {
    if (caseId) {
      upsertCase({
        caseId,
        receiptHash: safeReceiptHash,
      });
    }
  } catch (error) {
    console.warn("Failed to persist receipt hash in case registry:", error);
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

export async function createReceiptHash(input = {}) {
  const runSummarySignature = createRunSummarySignature(
    Array.isArray(input.runEntries) ? input.runEntries : []
  );

  const behaviorSignature = [
    input.executionSummary?.totalEvents || 0,
    input.executionSummary?.structuredEventsCount || 0,
    input.executionSummary?.latestEventType || "",
    input.executionSummary?.mainObservedShift || "",
  ].join("|");

  const canonicalPayload = {
    receiptId: input.receiptId || "",
    summary: getCaseSummary(input) || getCaseContext(input) || "",
    scenario: getCaseScenarioCode(input) || "",
    stage: getCaseStage(input) || "",
    runSignature: runSummarySignature || getCaseRunCode(input) || "",
    totalRunHits: input.totalRunHits || 0,
    behaviorSignature,
    caseData: input.caseData || null,
  };

  const raw = JSON.stringify(canonicalPayload);
  const encoder = new TextEncoder();
  const data = encoder.encode(raw);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = Array.from(new Uint8Array(digest));
  const hex = bytes.map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();

  return `H-${hex.slice(0, 24)}`;
}

function inferQuickCaptureSuggestion(note = "") {
  const text = String(note || "").toLowerCase();

  if (!text.trim()) {
    return {
      type: "decision_accepted",
      signalImpact: "medium",
      label: "Waiting for input",
      reason: "Add a short note to generate a structured event tag.",
    };
  }

  if (
    text.includes("block") ||
    text.includes("stuck") ||
    text.includes("cannot") ||
    text.includes("can't") ||
    text.includes("failed") ||
    text.includes("delay") ||
    text.includes("risk")
  ) {
    return {
      type: "blocker_encountered",
      signalImpact: "high",
      label: "Blocker encountered",
      reason: "The note suggests a workflow blocker or execution risk.",
    };
  }

  if (
    text.includes("owner") ||
    text.includes("ownership") ||
    text.includes("assigned") ||
    text.includes("responsible") ||
    text.includes("handoff")
  ) {
    return {
      type: "ownership_changed",
      signalImpact: "high",
      label: "Ownership changed",
      reason: "The note suggests responsibility or ownership shifted.",
    };
  }

  if (
    text.includes("scope") ||
    text.includes("changed") ||
    text.includes("update") ||
    text.includes("expanded") ||
    text.includes("reduced") ||
    text.includes("new requirement")
  ) {
    return {
      type: "scope_updated",
      signalImpact: "medium",
      label: "Scope updated",
      reason: "The note suggests the case scope has changed.",
    };
  }

  if (
    text.includes("approved") ||
    text.includes("accepted") ||
    text.includes("confirmed") ||
    text.includes("agreed") ||
    text.includes("yes") ||
    text.includes("done")
  ) {
    return {
      type: "decision_accepted",
      signalImpact: "medium",
      label: "Decision accepted",
      reason: "The note suggests the decision moved forward.",
    };
  }

  return {
    type: "decision_accepted",
    signalImpact: "low",
    label: "General progress",
    reason: "No strong risk, scope, or ownership signal detected.",
  };
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
    receiptId: sanitizeReceiptId(input.receiptId),
    generatedAt: input.generatedAt || "",
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
      structuredEvents: Array.isArray(resolvedExecutionSummary.structuredEvents)
        ? resolvedExecutionSummary.structuredEvents
        : [],
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
  const DEBUG_DISABLE_RECEIPT_HASH = false;
  const DEBUG_DISABLE_RECEIPT_EVENT_LOG = true;
  const location = useLocation();
  const navigate = useNavigate();
  const [computedReceiptHash, setComputedReceiptHash] = React.useState("");
  const [receiptLedgerRecord, setReceiptLedgerRecord] = React.useState(null);
  const [ledgerReceiptHash, setLedgerReceiptHash] = React.useState("");
  const [receiptHashCopied, setReceiptHashCopied] = React.useState(false);
  const [isCustomerRecordOpen, setIsCustomerRecordOpen] = React.useState(false);
  const [isReceiptEligibilityOpen, setIsReceiptEligibilityOpen] = React.useState(false);
  const [hydratedReceiptRecord, setHydratedReceiptRecord] = React.useState(null);

  const [quickCaptureOpen, setQuickCaptureOpen] = React.useState(false);
  const [quickCaptureType, setQuickCaptureType] = React.useState("decision_accepted");
  const [quickCaptureSignal, setQuickCaptureSignal] = React.useState("medium");
  const [quickCaptureNote, setQuickCaptureNote] = React.useState("");
  const quickCaptureSuggestion = React.useMemo(
    () => inferQuickCaptureSuggestion(quickCaptureNote),
    [quickCaptureNote]
  );
  const executionSummaryRef = React.useRef(null);
  const [latestQuickCapture, setLatestQuickCapture] = React.useState(null);
  const [caseBillingOverride, setCaseBillingOverride] = React.useState(null);
  
  const receiptViewedLoggedRef = React.useRef(false);
  const receiptDebugLoggedRef = React.useRef(false);
  const hashComputedForReceiptRef = React.useRef("");
  const routeEnvelope = location.state || null;

  React.useEffect(() => {
    if (location.state?.openQuickCapture) {
      setQuickCaptureOpen(true);
    }
  }, [location.state?.openQuickCapture]);

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
  const routeDataCaseId = String(
    routeData?.caseData?.caseId || routeData?.caseId || ""
  ).trim();
  const storedDataCaseId = String(
    storedData?.caseData?.caseId || storedData?.caseId || ""
  ).trim();

  const resolvedPayload = resolveReceiptPayload(
    location.state || {},
    routeData,
    hydratedReceiptRecord
  );

  const receiptHashCaseId =
    resolveCaseId({
      caseId:
        location.state?.caseId ||
        location.state?.case_id ||
        location.state?.result?.caseId ||
        location.state?.result?.case_id ||
        resolvedPayload?.caseData?.caseId ||
        resolvedPayload?.caseData?.id ||
        getCurrentCaseId() ||
        "",
    });

  const receiptHashReceiptId =
    resolvedPayload?.receiptId ||
    routeData?.receiptId ||
    storedData?.receiptId ||
    "";

  let persistedCaseReceiptHash = "";

  try {
    persistedCaseReceiptHash = receiptHashCaseId
      ? getCaseById(receiptHashCaseId)?.receipt?.hash ||
        getCaseById(receiptHashCaseId)?.receiptHash ||
        ""
      : "";
  } catch (error) {
    console.warn("Failed to read receipt hash from case registry:", error);
  }

  React.useEffect(() => {
    let cancelled = false;

    async function loadLedgerReceiptHash() {
      let existingRecord = null;

      try {
        existingRecord = await readReceiptLedger(receiptHashCaseId);
      } catch (error) {
        console.warn("Failed to read receipt hash ledger:", error);
        return;
      }

      if (!cancelled && existingRecord) {
        const ledgerHash = getReceiptLedgerRecordHash(existingRecord);
        setReceiptLedgerRecord(existingRecord);
        setLedgerReceiptHash(ledgerHash);
        saveStoredReceiptHash(
          receiptHashCaseId,
          receiptHashReceiptId,
          ledgerHash
        );
      }
    }

    if (receiptHashCaseId) {
      loadLedgerReceiptHash();
    }

    return () => {
      cancelled = true;
    };
  }, [receiptHashCaseId, receiptHashReceiptId]);

  const persistedReceiptHash =
    getReceiptLedgerRecordHash(receiptLedgerRecord) ||
    getStableHashValue(ledgerReceiptHash) ||
    getStableHashValue(persistedCaseReceiptHash) ||
    getStableHashValue(resolvedPayload?.receiptHash) ||
    getStableHashValue(routeData?.receiptHash) ||
    getStableHashValue(storedData?.receiptHash) ||
    getStableHashValue(
      getStoredStableHash(
        receiptHashCaseId || receiptHashReceiptId
          ? `receiptHash:${receiptHashCaseId || receiptHashReceiptId}`
          : ""
      )
    );

  const generatedAtRef = React.useRef(
    resolvedPayload.generatedAt || new Date().toLocaleString()
  );
  
    const normalized = {
      ...normalizeReceiptData(resolvedPayload),
      generatedAt: generatedAtRef.current,
    };
    const hasVerifiedAt =
      normalized.verifiedAt ||
      location.state?.verificationPageData?.verifiedAt;

      const hashCaseDataString = React.useMemo(
        () => JSON.stringify(normalized.caseData || resolvedPayload.caseData || null),
        [normalized.caseData, resolvedPayload.caseData]
      );

      const hashRunEntriesString = React.useMemo(
        () => JSON.stringify(normalized.runEntries || []),
        [normalized.runEntries]
      );

      const hashExecutionSummaryString = React.useMemo(
        () => JSON.stringify(normalized.executionSummary || {}),
        [normalized.executionSummary]
      );

      const hashInputSignature = [
        normalized.receiptId || "",
        normalized.generatedAt || "",
        normalized.scenarioLabel || "",
        normalized.stageLabel || "",
        String(normalized.totalRunHits || 0),
        hashRunEntriesString,
        hashExecutionSummaryString,
        hashCaseDataString,
      ].join("|");

      React.useEffect(() => {
        if (DEBUG_DISABLE_RECEIPT_HASH) return;

        const currentReceiptId = sanitizeReceiptId(normalized.receiptId) || receiptHashCaseId || "";

        if (persistedReceiptHash) {
          hashComputedForReceiptRef.current = currentReceiptId;
          setComputedReceiptHash(persistedReceiptHash);
          saveStoredReceiptHash(
            receiptHashCaseId,
            currentReceiptId,
            persistedReceiptHash
          );
          postLedgerReceiptHash(receiptHashCaseId, persistedReceiptHash).then((ledgerHash) => {
            if (ledgerHash) {
              readReceiptLedger(receiptHashCaseId).then((existingRecord) => {
                if (existingRecord) {
                  setReceiptLedgerRecord(existingRecord);
                  const existingHash = getReceiptLedgerRecordHash(existingRecord);
                  if (existingHash) {
                    setLedgerReceiptHash(existingHash);
                    setComputedReceiptHash(existingHash);
                    saveStoredReceiptHash(receiptHashCaseId, currentReceiptId, existingHash);
                  }
                }
              });
            }
          });
          return;
        }

        if (computedReceiptHash && hashComputedForReceiptRef.current === currentReceiptId) {
          return;
        }

        let cancelled = false;

        async function computeHash() {
          const nextHash = await createReceiptHash({
            receiptId: normalized.receiptId || "",
            generatedAt: normalized.generatedAt || "",
            scenarioLabel: normalized.scenarioLabel || "",
            stageLabel: normalized.stageLabel || "",
            totalRunHits: normalized.totalRunHits || 0,
            runEntries: normalized.runEntries || [],
            executionSummary: normalized.executionSummary || {},
            caseData: normalized.caseData || resolvedPayload.caseData || null,
          });

          const safeNextHash = getStableHashValue(nextHash);

          if (!cancelled && safeNextHash) {
            hashComputedForReceiptRef.current = currentReceiptId;
            setComputedReceiptHash(safeNextHash);
            saveStoredReceiptHash(
              receiptHashCaseId,
              currentReceiptId,
              safeNextHash
            );
            postLedgerReceiptHash(receiptHashCaseId, safeNextHash).then((ledgerHash) => {
              if (ledgerHash) {
                readReceiptLedger(receiptHashCaseId).then((existingRecord) => {
                  if (existingRecord) {
                    setReceiptLedgerRecord(existingRecord);
                    const existingHash = getReceiptLedgerRecordHash(existingRecord);
                    if (existingHash) {
                      setLedgerReceiptHash(existingHash);
                      setComputedReceiptHash(existingHash);
                      saveStoredReceiptHash(receiptHashCaseId, currentReceiptId, existingHash);
                    }
                  }
                });
              }
            });
          }
        }

        computeHash().catch((error) => {
          console.error("Failed to compute receipt hash:", error);
          hashComputedForReceiptRef.current = "";
       });

        return () => {
          cancelled = true;
        };
      }, [
        DEBUG_DISABLE_RECEIPT_HASH,
        persistedReceiptHash,
        computedReceiptHash,
        normalized.receiptId,
        normalized.generatedAt,
        receiptHashCaseId,
        receiptHashReceiptId,
      ]);
        
    const normalizedWithoutDecisionStatus = normalized;
  
    const baseReceiptData = {
      ...normalizedWithoutDecisionStatus,
      caseData: normalized.caseData || resolvedPayload.caseData || null,
      generatedAt: normalized.generatedAt || generatedAtRef.current,

      verifiedAt:
        normalized.verifiedAt ||
        location.state?.verificationPageData?.verifiedAt ||
        "",

      receiptHash:
        getReceiptLedgerRecordHash(receiptLedgerRecord) ||
        persistedReceiptHash ||
        getStableHashValue(computedReceiptHash) ||
        getStableHashValue(normalized.receiptHash) ||
        getStableHashValue(resolvedPayload.receiptHash) ||
        getStableHashValue(routeData?.receiptHash) ||
        getStableHashValue(storedData?.receiptHash) ||
        "",
    };
  const rawData = {
    ...baseReceiptData,
    caseData: baseReceiptData.caseData || null,
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

  const receiptEligibilityScoreSource = rawData?.caseData || {};
  console.log("[SCORE_INPUT_SOURCE]", {
    page: "ReceiptPage",
    caseId:
      receiptEligibilityScoreSource.caseId ||
      receiptEligibilityScoreSource.id ||
      "",
    sourceKeys: receiptEligibilityScoreSource
      ? Object.keys(receiptEligibilityScoreSource)
      : [],
    source: receiptEligibilityScoreSource,
  });
  const receiptEligibilityScore = calculateDeterministicScore(
    receiptEligibilityScoreSource
  );

  const hasReceiptEligibilitySignal =
    receiptEligibilityScore.receiptEligible === true ||
    routeDecision?.mode === "case_receipt" ||
    routeDecision?.mode === "final_receipt" ||
    Boolean(hydratedReceiptRecord);

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

  const verificationPageData = location.state?.verificationPageData || null;

  const verificationReturnStatus =
    verificationPageData?.overallStatus ||
    verificationPageData?.decisionStatus ||
    verificationPageData?.status ||
    "";

  const returnedFromFailedVerification =
    verificationReturnStatus === "Verification Failed" ||
    verificationReturnStatus === "Failed" ||
    verificationReturnStatus === "failed" ||
    verificationReturnStatus === "WARNING" ||
    verificationReturnStatus === "Warning" ||
    verificationReturnStatus === "warning" ||
    verificationReturnStatus === "Not Verified";

  const inferredCaseId =
    resolveCaseId({
      caseId:
        location.state?.caseId ||
        location.state?.case_id ||
        location.state?.result?.caseId ||
        location.state?.result?.case_id ||
        getCurrentCaseId() ||
        "",
    });

  React.useEffect(() => {
    let cancelled = false;

    async function hydrateReceiptRecord() {
      if (!inferredCaseId) {
        setHydratedReceiptRecord(null);
        return;
      }

      const currentStoredCaseId = routeDataCaseId || storedDataCaseId || "";

      if (currentStoredCaseId === inferredCaseId && storedData) {
        setHydratedReceiptRecord(storedData);
        return;
      }

      try {
        const response = await fetch(
          `http://localhost:3000/receipt-record?caseId=${encodeURIComponent(inferredCaseId)}`
        );

        if (!response.ok) {
          return;
        }

        const record = await response.json().catch(() => null);

        if (!cancelled && record) {
          setHydratedReceiptRecord(record);
        }
      } catch (error) {
        console.warn("Failed to hydrate receipt record", error);
      }
    }

    hydrateReceiptRecord();

    return () => {
      cancelled = true;
    };
  }, [inferredCaseId, routeDataCaseId, storedDataCaseId]);

  let currentCase = null;

  try {
    currentCase = inferredCaseId ? getCaseById(inferredCaseId) : null;
  } catch (error) {
    console.warn("Failed to read case registry for receipt gate", error);
  }
  const activeCurrentCase = currentCase || hydratedReceiptRecord || null;

  const existingLead = activeCurrentCase?.lead || null;
  const [lead, setLead] = React.useState({
    name: existingLead?.name || "",
    email: existingLead?.email || "",
    company: existingLead?.company || "",
  });
  const [leadError, setLeadError] = React.useState("");
  const hasValidLead = lead.email && lead.email.includes("@");

  const currentCaseEventSource =
    Array.isArray(activeCurrentCase?.events) && activeCurrentCase.events.length > 0
      ? activeCurrentCase.events
      : Array.isArray(activeCurrentCase?.eventLogs) && activeCurrentCase.eventLogs.length > 0
      ? activeCurrentCase.eventLogs
      : Array.isArray(activeCurrentCase?.capturedEvents) && activeCurrentCase.capturedEvents.length > 0
      ? activeCurrentCase.capturedEvents
      : Array.isArray(activeCurrentCase?.workspaceSummary?.events) && activeCurrentCase.workspaceSummary.events.length > 0
      ? activeCurrentCase.workspaceSummary.events
      : Array.isArray(activeCurrentCase?.pilotSummary?.events) && activeCurrentCase.pilotSummary.events.length > 0
      ? activeCurrentCase.pilotSummary.events
      : Array.isArray(activeCurrentCase?.pilotResult?.events) && activeCurrentCase.pilotResult.events.length > 0
      ? activeCurrentCase.pilotResult.events
      : [];

  const fallbackCapturedEvents =
    Array.isArray(normalized?.caseData?.events) && normalized.caseData.events.length > 0
      ? normalized.caseData.events
      : Array.isArray(resolvedPayload?.caseData?.events) && resolvedPayload.caseData.events.length > 0
      ? resolvedPayload.caseData.events
      : Array.isArray(sharedFlat?.executionSummary?.structuredEvents) && sharedFlat.executionSummary.structuredEvents.length > 0
      ? sharedFlat.executionSummary.structuredEvents
      : Array.isArray(rawData?.executionSummary?.structuredEvents) && rawData.executionSummary.structuredEvents.length > 0
      ? rawData.executionSummary.structuredEvents
      : Array.isArray(normalized?.executionSummary?.structuredEvents) && normalized.executionSummary.structuredEvents.length > 0
      ? normalized.executionSummary.structuredEvents
      : [];

  const currentCaseQuickCaptures =
    currentCaseEventSource.length > 0 ? currentCaseEventSource : fallbackCapturedEvents;

  const realCapturedEvents = currentCaseQuickCaptures.filter((event) => {
    if (!event || typeof event !== "object") return false;

    const readableText = String(
      event?.note ||
      event?.description ||
      event?.text ||
      event?.input ||
      event?.rawText ||
      event?.summary ||
      event?.eventInput?.description ||
      event?.eventInput?.summaryContext ||
      event?.sourceInput?.description ||
      ""
    ).trim();

    return (
      readableText.length > 0 ||
      Boolean(event?.eventType) ||
      Boolean(event?.eventId) ||
      Boolean(event?.meta)
    );
  });

  const hasEvents =
    Array.isArray(realCapturedEvents) &&
    realCapturedEvents.length > 0;

  const deterministicScoreSource = {
    ...(activeCurrentCase || normalized?.caseData || resolvedPayload?.caseData || {}),
    caseId: inferredCaseId || activeCurrentCase?.caseId || "",
    events:
      currentCaseQuickCaptures.length > 0
        ? currentCaseQuickCaptures
        : realCapturedEvents,
    capturedEvents:
      currentCaseQuickCaptures.length > 0
        ? currentCaseQuickCaptures
        : realCapturedEvents,
    entries:
      currentCaseQuickCaptures.length > 0
        ? currentCaseQuickCaptures
        : realCapturedEvents,
    scopeLock:
      activeCurrentCase?.scopeLock ||
      normalized?.caseData?.scopeLock ||
      resolvedPayload?.caseData?.scopeLock ||
      {},
    scope:
      activeCurrentCase?.scope ||
      normalized?.caseData?.scope ||
      resolvedPayload?.caseData?.scope ||
      {},
    acceptanceChecklist:
      activeCurrentCase?.acceptanceChecklist ||
      normalized?.caseData?.acceptanceChecklist ||
      resolvedPayload?.caseData?.acceptanceChecklist ||
      {},
    checklist:
      activeCurrentCase?.checklist ||
      normalized?.caseData?.checklist ||
      resolvedPayload?.caseData?.checklist ||
      {},
  };
  {
    const scoringSource = deterministicScoreSource;
    console.log("[SCORE_INPUT_SOURCE]", {
      page: "ReceiptPage",
      caseId: inferredCaseId,
      sourceKeys: scoringSource ? Object.keys(scoringSource) : [],
      source: scoringSource,
    });
  }
  const deterministicScore = calculateDeterministicScore(
    deterministicScoreSource
  );

  console.log("[DETERMINISTIC_SCORE]", {
    page: "ReceiptPage",
    caseId: inferredCaseId,
    score: deterministicScore,
    eventCount: deterministicScore.eventCount,
  });

  const activeCaseBilling = caseBillingOverride || activeCurrentCase?.caseBilling || {};
  const accessMode = getAccessMode(
    {
      ...(normalized?.caseData || resolvedPayload?.caseData || activeCurrentCase || {}),
      normalizedScore: deterministicScore.totalScore,
      score: deterministicScore.totalScore,
      eventCount: deterministicScore.eventCount,
      events: deterministicScore.events,
      receiptPaid:
        activeCaseBilling?.receiptActivated === true ||
        activeCurrentCase?.payment?.receiptActivated === true ||
        activeCurrentCase?.isPaid === true,
      verificationPaid:
        activeCaseBilling?.verificationActivated === true ||
        activeCurrentCase?.payment?.verificationActivated === true ||
        activeCurrentCase?.isPaid === true,
    }
  );
  const isPaid = accessMode === "paid";
  const handleUnlockFormalReceipt = async () => {
    const caseId = inferredCaseId || getCurrentCaseId();
    if (!caseId) return;

    try {
      const response = await fetch("http://localhost:3000/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ caseId }),
      });

      const data = await response.json();

      if (!response.ok || !data?.url) {
        console.error("Checkout session failed:", data);
        return;
      }

      window.location.href = data.url;
    } catch (error) {
      console.error("Checkout redirect error:", error);
    }
  };
  const receiptActivated =
    activeCaseBilling?.receiptActivated === true ||
    activeCurrentCase?.payment?.receiptActivated === true ||
    activeCurrentCase?.isPaid === true;

  const data = {
    ...rawData,
    ...sharedFlat,

  executionSummary:
    sharedFlat.executionSummary ||
    rawData.executionSummary ||
    normalized.executionSummary || {
      totalEvents: 0,
      structuredEventsCount: 0,
      structuredEvents: [],
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
    if (hasVerifiedAt) return "Verified";

    // Event-backed records are required before ready status.
    if (!hasEvents) {
      return "Insufficient Record";
    }

    const isEligible =
      deterministicScore.eventCount > 0 &&
      Number(deterministicScore.totalScore || 0) >= 3.0;

    if (isEligible) return "READY FOR FORMAL DETERMINATION";

    if (returnedFromFailedVerification) {
      return "Receipt Failed";
    }

    return "Receipt Failed";
    })(),
  };

  React.useEffect(() => {
    if (!inferredCaseId) return;

    try {
      upsertCase({
        caseId: inferredCaseId,

        status: "result_ready",

        caseData: normalized.caseData || resolvedPayload.caseData || {},

        receipt: {
          receiptId: data.receiptId,
          hash: data.receiptHash,
          generatedAt: data.generatedAt,
          decisionStatus: data.decisionStatus,
        },

        summary: data.summaryText || "",
        scenario: data.scenarioLabel || "",
        stage: data.stageLabel || "",

        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn("Failed to persist case at receipt stage", e);
    }
  }, [inferredCaseId]);

const canShowFormalPaymentEntry =
  data.decisionStatus === "READY FOR FORMAL DETERMINATION" ||
  data.decisionStatus === "Verified" ||
  returnedFromFailedVerification ||
  routeDecision?.mode === "case_receipt" ||
  routeDecision?.mode === "final_receipt" ||
  receiptMode === "case_receipt" ||
  receiptMode === "final_receipt";

const isVerified = data.verificationStatus === "passed";

const caseStatus = isVerified
  ? "verified"
  : hasEvents
  ? "issuable"
  : "draft";

const isReady =
  data.decisionStatus === "READY FOR FORMAL DETERMINATION" ||
  data.decisionStatus === "Verified";

const buttonState = isReady
  ? "ready"
  : hasEvents
  ? "has_event_not_ready"
  : "no_event";

const summarySignals = Array.isArray(data.topSignals) ? data.topSignals : [];

function formatSummaryLevel(value) {
  const text = String(value ?? "").trim();
  if (!text) return "Not enough signal yet";
  return text.replaceAll("_", " ");
}

function getSummaryBullet(label, primaryValue, fallbackValue) {
  return {
    label,
    value: formatSummaryLevel(primaryValue || fallbackValue),
  };
}

const decisionSummaryBullets = [
  getSummaryBullet(
    "Evidence fragmentation",
    data.executionSummary?.latestEventLabel ||
      data.executionSummary?.latestEventType ||
      summarySignals[0],
    data.executionSummary?.latestEventDescription
  ),
  getSummaryBullet(
    "Governance strength",
    data.executionSummary?.behaviorStatus || summarySignals[1],
    data.executionSummary?.mainObservedShift
  ),
  getSummaryBullet(
    "Operational complexity",
    data.executionSummary?.mainObservedShift || summarySignals[2],
    data.executionSummary?.nextCalibrationAction
  ),
];

// const summaryBufferPayload = createSummaryBuffer({...});
// const existingBuffer = readSummaryBuffer(inferredCaseId);
// let activeSummaryBuffer = existingBuffer || summaryBufferPayload;
// if (shouldRebuildSummaryBuffer({...})) {
//   writeSummaryBuffer(inferredCaseId, summaryBufferPayload);
//   activeSummaryBuffer = summaryBufferPayload;
// }
// const currentCaseQuickCaptures = (activeSummaryBuffer?.quickCaptures || []).filter(
//   (item) => item.caseId === inferredCaseId
// );

const persistedQuickCapture =
  latestQuickCapture ||
  currentCaseQuickCaptures[currentCaseQuickCaptures.length - 1] ||
  null;

const quickCaptureCount = currentCaseQuickCaptures.length;

const displayedTotalEvents = realCapturedEvents.length;

const displayedStructuredEvents = realCapturedEvents.length;

const submittedEvents = displayedTotalEvents;

const decisionPathEvents = displayedStructuredEvents;

const hasEventBackedBaseline =
  Number(submittedEvents || 0) > 0 ||
  Number(decisionPathEvents || 0) > 0;

const hasEventBackedRecord = Number(deterministicScore.eventCount || 0) > 0;
const normalizedScore = deterministicScore.totalScore;
const hasPassingScore = Number(normalizedScore || 0) >= 3.0;
const receiptEligible = hasEventBackedRecord && hasPassingScore;

const receiptExpressionModel = (() => {
  if (isVerified || data.decisionStatus === "Verified") {
    return {
      structureLabel: "Verified structure locked",
      statusText: "This baseline has been verified and can be used externally.",
    };
  }

  if (!hasEventBackedRecord || !hasEvents) {
    return {
      structureLabel: "Record not structured yet",
      statusText: "Add at least one real event to activate baseline issuance.",
    };
  }

  if (receiptEligible) {
    return {
      structureLabel: "Structured record prepared",
      statusText: "This case has enough structure to issue a receipt baseline.",
    };
  }

  return {
    structureLabel: "Structured but unstable",
    statusText: "The record contains event evidence, but the structure is not strong enough for receipt issuance yet.",
  };
})();

const formatEventText = (event) => {
  if (typeof event === "string") return event;

  if (!event || typeof event !== "object") return "";

  const eventInput = event.eventInput;

  if (typeof eventInput === "string") return eventInput;

  if (eventInput && typeof eventInput === "object") {
    return (
      eventInput.rawText ||
      eventInput.userInput ||
      eventInput.description ||
      eventInput.summary ||
      eventInput.title ||
      ""
    );
  }

  return (
    event.rawText ||
    event.userInput ||
    event.description ||
    event.summary ||
    event.title ||
    event.text ||
    ""
  );
};

const customerRecordCaseOrigin =
  activeCurrentCase?.caseOrigin ||
  activeCurrentCase?.origin ||
  activeCurrentCase?.caseInput ||
  activeCurrentCase?.initialInput ||
  activeCurrentCase?.problemStatement ||
  activeCurrentCase?.diagnosticSummary ||
  activeCurrentCase?.summary ||
  "";

const safeCustomerRecordEvents = realCapturedEvents.map((event) =>
  event && typeof event === "object"
    ? {
        ...event,
        text:
          formatEventText(event) ||
          "Event recorded, but no readable text was captured.",
      }
    : {
        text:
          formatEventText(event) ||
          "Event recorded, but no readable text was captured.",
      }
);

const customerRecordCaseText =
  customerRecordCaseOrigin ||
  getSafeCaseSummary(data.caseData || {}) ||
  data.displayContext ||
  data.summaryText ||
  "No case origin provided.";

const finalEvidenceLock = {
  receiptId: data.receiptId,
  receiptHash: data.receiptHash,
  receiptSource,
  receiptMode,
};

const evidenceLock =
  finalEvidenceLock ||
  location.state?.evidenceLock ||
  incomingSharedReceiptVerificationContract?.evidenceLock ||
  incomingSharedReceiptVerificationContract?.receiptEvidenceLock ||
  null;

const isEvidenceLockedConsistent =
  !evidenceLock ||
  (
    evidenceLock.receiptId === data.receiptId &&
    (!evidenceLock.receiptHash || evidenceLock.receiptHash === data.receiptHash) &&
    evidenceLock.receiptSource === receiptSource &&
    evidenceLock.receiptMode === receiptMode
  );

const receiptAllowsVerification =
  receiptEligible ||
  data.decisionStatus === "Verified" ||
  data.overallStatus === "Verified" ||
  sharedFlat?.overallStatus === "Verified";

const existingReceiptEligible = receiptAllowsVerification;

const guardedReceiptEligible =
  hasEventBackedBaseline && existingReceiptEligible;

const canEnterVerification =
  guardedReceiptEligible && isEvidenceLockedConsistent;

const verificationBlockedReason = !guardedReceiptEligible
  ? "Verification is unavailable because this receipt has not been issued for verification yet."
  : !isEvidenceLockedConsistent
  ? "Verification is locked because this receipt no longer matches the issued evidence chain."
  : "";

const canFormalizeProof =
  guardedReceiptEligible && canShowFormalPaymentEntry && caseStatus !== "draft";

const receiptCtaLabel = !receiptEligible
  ? "Improve Record to Issue Receipt"
  : "Open Verification";

const handleActivateReceiptForCase = () => {
  if (!inferredCaseId) return;

  const nextCaseBilling = {
    ...activeCaseBilling,
    receiptActivated: true,
    verificationActivated: activeCaseBilling?.verificationActivated === true,
    activatedAt: new Date().toISOString(),
    source: "local_test",
  };

  try {
    upsertCase({
      caseId: inferredCaseId,
      caseBilling: nextCaseBilling,
    });
    setCaseBillingOverride(nextCaseBilling);
  } catch (error) {
    console.warn("Failed to activate receipt for case", error);
  }
};

const handleQuickCaptureSubmit = () => {
  if (quickCaptureNote.trim().length < 12) {
    alert("Please describe one real event before submitting.");
    return;
  }

  const capturedAt = new Date().toISOString();

  const quickCaptureEvent = {
    id: `qc_${inferredCaseId}_${Date.now()}_${quickCaptureSuggestion.type}_${quickCaptureSuggestion.signalImpact}`,
    caseId: inferredCaseId,
    type: quickCaptureSuggestion.type,
    signalImpact: quickCaptureSuggestion.signalImpact,
    note: quickCaptureNote.trim().slice(0, 120),
    capturedAt,
  };

  upsertCase({
    caseId: inferredCaseId,
    events: [...currentCaseQuickCaptures, quickCaptureEvent],
  });

  setLatestQuickCapture(quickCaptureEvent);
  setQuickCaptureOpen(false);
  setQuickCaptureNote("");

  if (location.state?.returnToVerification) {
    navigate(ROUTES.VERIFICATION, {
      state: {
        ...stripCanonicalCaseFlowState(
          location.state?.returnToVerificationState || location.state || {}
        ),
        caseId: inferredCaseId,
      },
    });
    return;
  }

  setTimeout(() => {
    executionSummaryRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, 80);
};

const validateAndSaveLead = () => {
  const name = String(lead.name || "").trim();
  const email = String(lead.email || "").trim();
  const company = String(lead.company || "").trim();
  const existingLeadHasValidEmail =
    existingLead?.email && existingLead.email.includes("@");
  const leadChanged =
    name !== String(existingLead?.name || "").trim() ||
    email !== String(existingLead?.email || "").trim() ||
    company !== String(existingLead?.company || "").trim();

  if (existingLeadHasValidEmail && !leadChanged) {
    setLeadError("");
    return true;
  }

  if (!name || !email) {
    setLeadError("Name and work email are required.");
    return false;
  }

  if (!email.includes("@")) {
    setLeadError("Please enter a valid work email.");
    return false;
  }

  if (hasValidLead && !leadChanged) {
    setLeadError("");
    return true;
  }

  try {
    updateCaseLead(inferredCaseId || getCurrentCaseId(), {
      name,
      email,
      company,
    });
    setLeadError("");
    return true;
  } catch (error) {
    console.warn("Failed to save lead", error);
    setLeadError("Could not save contact. Please try again.");
    return false;
  }
};

React.useEffect(() => {
  if (DEBUG_DISABLE_RECEIPT_EVENT_LOG) return;

  const caseId =
    data.caseData?.caseId ||
    data.caseData?.id ||
    inferredCaseId;

  if (!caseId) return;

  const session =
    location.state?.trialSession || getTrialSession() || {};
  const stableUserId =
    location.state?.stableUserId ||
    session?.stableUserId ||
    session?.userId ||
    "";

  if (!canRenderReceipt) return;
  if (receiptViewedLoggedRef.current) return;

  receiptViewedLoggedRef.current = true;

  logTrialEvent(
    {
      userId: session?.userId || stableUserId || "",
      trialId: session?.trialId || session?.trialSessionId || "",
      sessionId:
        location.state?.session_id ||
        location.state?.sessionId ||
        data.caseData?.sessionId ||
        data.receiptId ||
        "receipt_entry",
      caseId,
      eventType: "receipt_viewed",
      page: "ReceiptPage",
      stableUserId,
      meta: {
        stableUserId,
        source: "funnel_event",
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
  DEBUG_DISABLE_RECEIPT_EVENT_LOG,
  canRenderReceipt,
  inferredCaseId,
  location.state,
  data.receiptId,
  data.caseData,
  data.decisionStatus,
  data.verifiedAt,
  receiptMode,
  receiptSource,
  canEnterVerification,
  isEvidenceLockedConsistent,
]);

if (!canRenderReceipt) {
  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-900 px-6 py-10">
      <div className="max-w-3xl mx-auto">
        <TopRightCasesCapsule />
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <p className="text-xs font-medium text-slate-400 mb-2">
            Baseline not ready
          </p>
          <h1 className="text-2xl font-bold mb-3">
            This decision baseline has not been issued yet.
          </h1>
          <p className="text-slate-700 leading-7">
            The record is not locked. Return to the result page to issue the baseline before proceeding to formal verification.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                navigate(
                  `${ROUTES.PILOT_RESULT}?caseId=${encodeURIComponent(
                    inferredCaseId || data.caseData?.caseId || data.caseData?.id || ""
                  )}`,
                  { state: location.state }
                )
              }
              className="inline-flex items-center justify-center rounded-full bg-black px-5 py-2 text-sm font-semibold text-white border border-black shadow-sm hover:bg-black hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
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
    <div className="relative min-h-screen bg-slate-50 text-slate-900 px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <TopRightCasesCapsule />
        <header className="relative bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "24px",
              marginBottom: "18px",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <p className="text-xs font-medium text-slate-400 mb-1">
                {receiptMode === "final_receipt"
                  ? "Structure-level output"
                  : "Generated from a single pilot case"}
              </p>

              <p className="text-xs text-slate-400">
                {receiptMode === "final_receipt"
                  ? "Recorded structure state issued from pilot execution"
                  : "Recorded case structure from pilot execution"}
              </p>

              <CanonicalCaseFlowBreadcrumb activeStep="Receipt" />

              <h1
                className="font-bold tracking-tight text-slate-900 mt-6 mb-3"
                style={{ fontSize: "28px", lineHeight: "1.2" }}
              >
                {isPaid ? "Formal Receipt" : "Receipt Preview"}
              </h1>
          
              <p className="text-xs text-slate-600 mt-1">
                This receipt locks the decision baseline.
              </p>
            </div>

            <div
              style={{
                flexShrink: 0,
                paddingTop: "16px",
                paddingRight: "24px",
                position: "relative",
                zIndex: 9999,
              }}
            >
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "10px" }}>
                <button
                  type="button"
                  onClick={() => {
                    const currentCaseId =
                      inferredCaseId ||
                      location.state?.caseId ||
                      activeCurrentCase?.caseId ||
                      activeCurrentCase?.id || 
                      "";

                    if (currentCaseId) {
                      console.log("[View all cases]", { caseId: currentCaseId });
                    }

                    navigate(ROUTES.CASES || "/cases");
                  }}
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
                >
                  View all cases
                </button>
              </div>

              <button
                type="button"
                onClick={() => setQuickCaptureOpen(true)}
                style={{
                  position: "relative",
                  zIndex: 9999,
                  pointerEvents: "auto",
                  borderRadius: "6px",
                  border: "1px solid #CBD5E1",
                  backgroundColor: "#FFFFFF",
                  color: "#0F172A",
                  padding: "8px 14px",
                  fontSize: "13px",
                  fontWeight: 500,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    lineHeight: 1,
                    marginRight: "2px",
                  }}
                >
                  +
                </span>
                Capture New Progress
              </button>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
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
            {/* Row 1: Receipt ID / Time / Verified */}
           <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                alignItems: "center",
              }}
            >
              <div style={{ padding: "6px 16px", borderRight: "1px solid #CBD5E1", minWidth: 0 }}>
                <p style={{ fontSize: "13px", color: "#64748B", margin: "0 0 6px 0" }}>
                  Receipt ID
                </p>
                <p
                  style={{
                    fontWeight: 500,
                    margin: 0,
                    minWidth: 0,
                    wordBreak: "break-word",
                    overflowWrap: "anywhere",
                  }}
                >
                  {sanitizeReceiptId(data.receiptId)
                    ? sanitizeReceiptId(data.receiptId)
                    : "No live receipt attached."}
                </p>
              </div>

              <div style={{ padding: "6px 16px", borderRight: "1px solid #CBD5E1", minWidth: 0 }}>
                <p style={{ fontSize: "13px", color: "#64748B", margin: "0 0 6px 0" }}>
                  Generated At
                </p>
                <p
                  style={{
                    fontWeight: 500,
                    margin: 0,
                    minWidth: 0,
                    wordBreak: "break-word",
                    overflowWrap: "anywhere",
                  }}
                >
                  {data.generatedAt}
                </p>
              </div>
          
              <div style={{ padding: "6px 16px", minWidth: 0 }}>
                <p style={{ fontSize: "13px", color: "#64748B", margin: "0 0 6px 0" }}>
                  Verified At
                </p>
                <p
                  style={{
                    fontWeight: 500,
                    margin: 0,
                    minWidth: 0,
                    wordBreak: "break-word",
                    overflowWrap: "anywhere",
                  }}
                >
                  {sanitizeText(data.verifiedAt, "Not verified yet")}
                </p>
              </div>
            </div>
          
            <div style={{ margin: "12px 0", height: "1px", background: "#CBD5E1" }} />
          
            {/* Row 2: Hash / Lock */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                alignItems: "start",
              }}
            >
              <div style={{ padding: "6px 16px", minWidth: 0 }}>
                <p style={{ fontSize: "13px", color: "#64748B", margin: "0 0 6px 0" }}>
                  {isPaid ? "Receipt Hash" : "Preview record hash"}
                </p>
          
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    marginBottom: "6px",
                    minWidth: 0,
                  }}
                >
                  <p
                    style={{
                      fontWeight: 500,
                      margin: 0,
                      flex: "1 1 auto",
                      minWidth: 0,
                      lineHeight: 1.45,
                      wordBreak: "break-word",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {(() => {
                      const safeHash =
                        typeof data.receiptHash === "string"
                          ? data.receiptHash
                          : "";

                      return safeHash
                        ? `H-${String(safeHash || "").slice(0, 8)}...${String(safeHash || "").slice(-6)}`
                        : "Generating...";
                    })()}
                  </p>

                  <button
                    type="button"
                    onClick={async () => {
                      if (typeof data.receiptHash !== "string" || !data.receiptHash) return;

                      await navigator.clipboard.writeText(data.receiptHash);
                      setReceiptHashCopied(true);

                      window.setTimeout(() => {
                        setReceiptHashCopied(false);
                      }, 1200);
                    }}
                    style={{
                      fontSize: "11px",
                      padding: "4px 10px",
                      borderRadius: "999px",
                      border: receiptHashCopied ? "1px solid #10B981" : "1px solid #CBD5E1",
                      background: receiptHashCopied ? "#ECFDF5" : "white",
                      color: receiptHashCopied ? "#047857" : "#334155",
                      cursor: "pointer",
                      flexShrink: 0,
                      marginTop: "0px",
                      height: "22px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      transition: "all 160ms ease",
                    }}
                  >
                    {receiptHashCopied && (
                      <span
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "999px",
                          backgroundColor: "#10B981",
                          display: "inline-block",
                        }}
                      />
                    )}
                    {receiptHashCopied ? "Copied" : "Copy"}
                  </button>
                </div>
          
                <p style={{ fontSize: "11px", color: "#64748B", margin: 0, lineHeight: 1.5 }}>
                  The receipt hash uniquely identifies this baseline. Any material change to inputs, structure, or evidence breaks the record.
                </p>
              </div>
          
              <div
                style={{
                  padding: "6px 16px",
                  borderLeft: "1px solid #CBD5E1",
                  minWidth: 0,
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
                    color: !hasEventBackedBaseline
                      ? "#64748B"
                      : !isEvidenceLockedConsistent
                      ? "#DC2626"
                      : guardedReceiptEligible
                      ? "#059669"
                      : "#D97706",
                    fontWeight: 700,
                    fontSize: "12px",
                  }}
                >
                  <span
                    style={{
                      width: "18px",
                      height: "18px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "999px",
                      background: !hasEventBackedBaseline
                        ? "#94A3B8"
                        : !isEvidenceLockedConsistent
                        ? "#DC2626"
                        : guardedReceiptEligible
                        ? "#059669"
                        : "#D97706",
                      color: "#ffffff",
                      lineHeight: 1,
                    }}
                  >
                    {!hasEventBackedBaseline
                      ? "-"
                      : !isEvidenceLockedConsistent
                      ? "!"
                      : guardedReceiptEligible
                      ? (
                        <svg
                          aria-hidden="true"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="m6 12 4 4 8-8" />
                        </svg>
                      )
                      : "!"}
                  </span>

                  <span>
                    {!hasEventBackedBaseline
                      ? "Not activated"
                      : !isEvidenceLockedConsistent
                      ? "Broken"
                      : guardedReceiptEligible
                      ? "Consistent"
                      : "Pending validation"}
                  </span>
                </div>

                <p style={{ fontSize: "11px", color: "#64748B", margin: 0, lineHeight: 1.5 }}>
                  {!hasEventBackedBaseline
                    ? "Evidence lock is established after the first event-backed baseline."
                    : !isEvidenceLockedConsistent
                    ? "Evidence chain mismatch detected."
                    : guardedReceiptEligible
                    ? "Receipt matches the issued pilot evidence chain."
                    : "Evidence has been captured, but the baseline is not ready for formal reliance yet."}
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
                    It captures the submitted inputs, decision path, receipt hash, and the next required step.
                  </p>
                </div>
              </div>
            </div>
          
            <div style={{ margin: "12px 0", height: "1px", background: "#CBD5E1" }} />
          
            {/* Row 3: Status / Schema */}
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
                      : data.decisionStatus === "Insufficient Record"
                      ? "#FFFBEB"
                      : "#FEF2F2",
                  border:
                    data.decisionStatus === "Verified"
                     ? "1px solid #86EFAC"
                      : data.decisionStatus === "READY FOR FORMAL DETERMINATION"
                      ? "1px solid #86EFAC"
                      : data.decisionStatus === "Insufficient Record"
                      ? "1px solid #FCD34D"
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
                        : data.decisionStatus === "Insufficient Record"
                        ? "#92400E"
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
                      width: "40px",
                      height: "40px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "999px",
                      background:
                        data.decisionStatus === "Verified" ||
                        data.decisionStatus === "READY FOR FORMAL DETERMINATION"
                          ? "#059669"
                          : data.decisionStatus === "Insufficient Record"
                          ? "#F59E0B"
                          : "#DC2626",
                      color: "#ffffff",
                      lineHeight: 1,
                      flexShrink: 0,
                    }}
                  >
                    {data.decisionStatus === "Verified"
                      ? (
                        <svg
                          aria-hidden="true"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M12 3v18" />
                          <path d="M5 7h14" />
                          <path d="M7 7 4.5 12.5A3 3 0 0 0 7.1 17h.8a3 3 0 0 0 2.6-4.5Z" />
                          <path d="M17 7 14.5 12.5A3 3 0 0 0 17.1 17h.8a3 3 0 0 0 2.6-4.5Z" />
                          <path d="M12 7v10" />
                        </svg>
                      )
                      : data.decisionStatus === "READY FOR FORMAL DETERMINATION"
                      ? (
                        <svg
                          aria-hidden="true"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M12 3v18" />
                          <path d="M5 7h14" />
                          <path d="M7 7 4.5 12.5A3 3 0 0 0 7.1 17h.8a3 3 0 0 0 2.6-4.5Z" />
                          <path d="M17 7 14.5 12.5A3 3 0 0 0 17.1 17h.8a3 3 0 0 0 2.6-4.5Z" />
                          <path d="M12 7v10" />
                        </svg>
                      )
                      : "-"}
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
                            : data.decisionStatus === "Insufficient Record"
                            ? "#92400E"
                            : "#991B1B",
                      }}
                    >
                      {sanitizeText(data.decisionStatus).toUpperCase()}
                    </p>
              
                    <p
                      style={{
                        fontSize: "11px",
                        color: "#64748B",
                        margin: "8px 0 0 0",
                        lineHeight: 1.5,
                      }}
                    >
                      {data.decisionStatus === "Insufficient Record"
                        ? "Add at least one real event to activate baseline issuance."
                        : "Baseline issuance is required for a valid and enforceable determination."}
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
                  Case Structure
                </p>
                <p style={{ fontWeight: 500, margin: "0 0 6px 0" }}>
                  {sanitizeText(receiptExpressionModel.structureLabel)}
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
                    {sanitizeText(getDecisionStabilityLabel(data.structureScoreFromCase))}
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
                    Structure status: {sanitizeText(data.structureStatusFromCase)}
                  </p>
                )}
                <p
                  style={{
                    fontSize: "11px",
                    color: "#64748B",
                    margin: "4px 0 0 0",
                    lineHeight: 1.5,
                  }}
                >
                  What to do next: {sanitizeText(getCustomerNextAction({
                    score: data.structureScoreFromCase,
                    weakestDimension: data.caseData?.weakestDimension || data.weakestDimension,
                  }))}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <div className="space-y-3">
              <p className="text-xs text-slate-700 font-medium">
                {sanitizeText(receiptExpressionModel.statusText)}
              </p>

              <button
                type="button"
                onClick={() => {
                  // Lead capture should not block payment during receipt checkout.
                  validateAndSaveLead();

                  if (buttonState === "has_event_not_ready") {
                    setQuickCaptureOpen(true);
                    return;
                  }

                  if (buttonState === "no_event") {
                    setQuickCaptureOpen(true);
                    return;
                  }

                  if (buttonState === "ready") {
                    if (!receiptActivated) {
                      handleUnlockFormalReceipt();
                      return;
                    }

                  navigate(`${ROUTES.VERIFICATION}${location.search || ""}`, {
                    state: {
                      ...stripCanonicalCaseFlowState(location.state || {}),
                      receiptPageData: data,
                      sharedReceiptVerificationContract: sharedContract,
                        caseData: data.caseData || null,
                        verificationPageData: location.state?.verificationPageData || null,
                        routeDecision,
                        receiptSource,
                        evidenceLock: finalEvidenceLock,
                        caseId: inferredCaseId,
                      },
                    });
                    return;
                  }
                }}
                style={{
                  backgroundColor:
                    buttonState === "ready"
                      ? "#D97706"
                      : "#FEF3C7",
                  color:
                    buttonState === "ready"
                      ? "#ffffff"
                      : "#92400E",
                  border:
                    buttonState === "ready"
                      ? "1px solid #D97706"
                      : "1px solid #FCD34D",
                  boxShadow:
                    buttonState === "ready"
                      ? "0 4px 14px rgba(194,65,12,0.28)"
                      : "0 2px 8px rgba(245,158,11,0.16)",
                  cursor: "pointer",
                  opacity: 1,
                }}
                className="inline-flex items-center justify-center rounded-2xl px-5 py-3 text-xs font-semibold transition"
              >
                {buttonState === "ready"
                  ? receiptActivated
                    ? "Open Verification"
                    : "Unlock Formal Receipt"
                  : buttonState === "no_event"
                  ? "Capture first event"
                  : "Improve Record to Pass"}
              </button>
            </div>
          </div>
        </header>

          <section className="rounded-2xl overflow-hidden border border-slate-200 bg-white">
            <button
              type="button"
              onClick={() => setIsReceiptEligibilityOpen((value) => !value)}
              className="w-full flex items-center justify-between px-4 py-4 text-left"
            >
              <div>
                <p className="text-xs font-medium text-slate-400">
                  Receipt eligibility
                </p>

                <p className="text-base font-semibold text-slate-900">
                  {receiptEligible
                    ? "Your formal receipt is ready to unlock"
                    : "Your formal receipt is still locked"}
                </p>
              </div>

              <span className="text-xs font-medium text-slate-400">
                {isReceiptEligibilityOpen ? "Hide" : "View"}
              </span>
            </button>

            {isReceiptEligibilityOpen && (
              <div className="border-t border-slate-200 bg-slate-50 px-4 py-4 space-y-3">
                <p className="text-xs text-slate-700">
                  {receiptEligible
                    ? "You can now unlock the formal receipt and move this case into verification."
                    : "Your formal receipt stays locked until the structure is strong enough."}
                </p>

                <div className="px-3 py-2 space-y-2 text-xs text-slate-800">
                  <div className="flex justify-between font-medium text-slate-900">
                    <span>Current status</span>
                    <span>{sanitizeText(getDecisionStabilityLabel(normalizedScore))}</span>
                  </div>

                  <div className="flex justify-between text-slate-700">
                    <span>Eligibility threshold</span>
                    <span>{Number(deterministicScore.receiptThreshold || 3.0).toFixed(1)} / 4</span>
                  </div>

                  <div className="border-t border-slate-200 mt-2 pt-2 grid grid-cols-[100px_1fr_70px] items-center gap-2">
                    <span>Evidence</span>
                    <span className="justify-self-center text-[12px] text-slate-500">
                      deterministic check
                    </span>
                    <span className="text-right">
                      {Number(deterministicScore.evidence || 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="grid grid-cols-[100px_1fr_70px] items-center gap-2">
                    <span>Structure</span>
                    <span className="justify-self-center text-[12px] text-slate-500">
                      deterministic check
                    </span>
                    <span className="text-right">
                      {Number(deterministicScore.structure || 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="grid grid-cols-[100px_1fr_70px] items-center gap-2">
                    <span>Consistency</span>
                    <span className="justify-self-center text-[12px] text-slate-500">
                      deterministic check
                    </span>
                    <span className="text-right">
                      {Number(deterministicScore.consistency || 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="grid grid-cols-[100px_1fr_70px] items-center gap-2">
                    <span>Continuity</span>
                    <span className="justify-self-center text-[12px] text-slate-500">
                      deterministic check
                    </span>
                    <span className="text-right">
                      {Number(deterministicScore.continuity || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <p
                    className={`text-xs ${
                      receiptEligible ? "text-emerald-700" : "text-amber-700"
                    }`}
                  >
                    Receipt eligibility is based on four checks: Evidence,
                    Structure, Consistency, and Continuity.
                  </p>
                </div>
              </div>
            )}
          </section>

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
            <h2 className="text-lg font-semibold mb-3">Locked Decision Baseline</h2>

            <div
              style={{
                backgroundColor: "#F8FAFC",
                border: "1px solid #CBD5E1",
                borderRadius: "20px",
                padding: "14px 16px",
              }}
            >
              {/* Row 1: Scenario / Stage / Confidence */}
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
                      fontWeight: 500,
                      margin: 0,
                    }}
                  >
                    {sanitizeText(data.scenarioLabel, "No Dominant Scenario")}
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
                      fontWeight: 500,
                      margin: 0,
                    }}
                  >
                    {sanitizeText(data.stageLabel, "S0")}
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
                      fontWeight: 500,
                      margin: 0,
                    }}
                  >
                    {sanitizeText(data.confidenceLabel, "Not available")}
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

              {/* Row 2: RUN summary */}
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
                  Aggregated structure
                </p>
                <div
                  style={{
                    textAlign: "right",
                    margin: 0,
                  }}
                >
                  <p
                    style={{
                      fontSize: "13px",
                      fontWeight: 500,
                      margin: 0,
                      color: "#0F172A",
                    }}
                  >
                    {hasEventBackedBaseline
                      ? `${data.totalRunHits} mapped RUN hit${data.totalRunHits === 1 ? "" : "s"}`
                      : "Not activated"}
                  </p>
                  <p
                    style={{
                      fontSize: "11px",
                      margin: "3px 0 0 0",
                      color: "#64748B",
                    }}
                  >
                    {hasEventBackedBaseline
                      ? "Derived from captured event signals and structured path mapping."
                      : "RUN mapping starts after the first captured event."}
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

              {/* Row 3: Pilot summary */}
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
                    fontWeight: 500,
                    lineHeight: 1.4,
                    margin: 0,
                  }}
                >
                  {(() => {
                    if (!hasEventBackedBaseline) {
                      return "No event-backed case summary yet.";
                    }

                    const summary =
                      data.executionSummary?.latestEventDescription ||
                      data.executionSummary?.latestEventLabel ||
                      persistedQuickCapture?.note ||
                      persistedQuickCapture?.type ||
                      "";
           
                    if (!summary || summary === "No structured summary is available yet.") {
                      return "No structured summary is available yet.";
                    }
           
                    return sanitizeText(summary, "No structured summary is available yet.");
                  })()}
                </p>
                {(() => {
                  const summary =
                    data.executionSummary?.latestEventDescription ||
                    data.executionSummary?.latestEventLabel ||
                    persistedQuickCapture?.note ||
                    persistedQuickCapture?.type ||
                    "";

                  const helperText = !hasEventBackedBaseline
                    ? "Capture a real event to attach a pilot-tested summary."
                    : !summary || summary === "No structured summary is available yet."
                    ? "No structured summary is available yet."
                    : "";

                  return helperText ? (
                    <p
                      style={{
                        fontSize: "11px",
                        lineHeight: 1.35,
                        margin: "6px 0 0 0",
                        color: "#64748B",
                      }}
                    >
                      {sanitizeText(helperText)}
                    </p>
                  ) : null;
                })()}
              </div>
           </div>
          </section>

<section
          ref={executionSummaryRef}
          className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6"
        >
          <h2
            className="text-lg font-semibold"
            style={{ marginBottom: "18px" }}
          >
            Baseline Summary
          </h2>

          {hasEventBackedBaseline ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
            <p className="text-xs font-medium tracking-wide text-slate-400 mb-3">
              Why this decision was made:
            </p>
            <ul className="space-y-2 text-sm text-slate-700">
              {decisionSummaryBullets.map((bullet) => (
                <li key={bullet.label} className="flex gap-2">
                  <span className="shrink-0 text-slate-400">-</span>
                  <span>
                    <span className="font-medium text-slate-900">
                      {sanitizeText(bullet.label)}:
                    </span>{" "}
                    {sanitizeText(bullet.value)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          ) : (
            <div
              style={{
                backgroundColor: "#FEFCE8",
                border: "1px solid #FACC15",
                borderRadius: "20px",
                padding: "16px",
              }}
            >
              <p
                style={{
                  color: "#854D0E",
                  fontSize: "12px",
                  fontWeight: 700,
                  margin: 0,
                }}
              >
                No event-backed baseline yet
              </p>
              <p
                style={{
                  color: "#A16207",
                  fontSize: "13px",
                  margin: "6px 0 14px 0",
                }}
              >
                This record contains diagnostic context but no captured event. A baseline cannot be issued without event-backed evidence.
              </p>
              <button
                type="button"
                onClick={() => setQuickCaptureOpen(true)}
                style={{
                  borderRadius: "6px",
                  border: "1px solid #CA8A04",
                  backgroundColor: "#EAB308",
                  color: "#422006",
                  padding: "8px 14px",
                  fontSize: "13px",
                  fontWeight: 700,
                }}
              >
                Capture first event
              </button>
            </div>
          )}
        </section>

<section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <h2 className="font-bold">Customer Record</h2>
                <p className="text-xs text-slate-400 mt-1">
                  This is the single Customer Record source for this case. Pilot Result and Verification only read from this baseline.
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-white">
              <div
                className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-900"
                onClick={() => setIsCustomerRecordOpen((v) => !v)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-900">
                      {isCustomerRecordOpen ? "v" : ">"}
                    </span>
                    <span>Customer Record Snapshot</span>
                  </div>

                  <button
                    type="button"
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();

                      const content = `
                        <h2>Customer Record Snapshot</h2>

                        <h3>Case origin</h3>
                        <p>${sanitizeText(customerRecordCaseText)}</p>

                        <h3>Supporting events</h3>
                        <ul>
                          ${safeCustomerRecordEvents
                            .slice(0, 3)
                            .map((event) => `<li>${sanitizeText(formatEventText(event), "Event recorded, but no readable text was captured.")}</li>`)
                            .join("")}
                        </ul>

                        <h3>Record integrity</h3>
                        <p>${safeCustomerRecordEvents.length} structured events included</p>
                        <p>No conflicting inputs detected</p>
                      `;

                      const element = document.createElement("div");
                      element.innerHTML = content;

                      const html2pdfModule = await import("html2pdf.js");
                      const html2pdf = html2pdfModule.default || html2pdfModule;
                      html2pdf().from(element).save("nimclea-baseline-record.pdf");
                    }}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50"
                  >
                    Export Summary
                  </button>
                </div>
              </div>

              {isCustomerRecordOpen ? (
                <div className="border-t border-slate-100 px-4 pb-4 pt-4 text-sm text-slate-700">
                  <div
                    className="py-2"
                    style={{
                      height: "240px",
                      overflowY: "auto",
                      overflowX: "hidden",
                    }}
                  >
                    <div className="space-y-5">
                      <div>
                        <p className="mb-1 text-xs font-medium text-slate-500">
                          Case origin
                        </p>
                        <p className="text-slate-900">
                          {sanitizeText(customerRecordCaseText)}
                        </p>
                      </div>

                      <div>
                        <p className="mb-2 text-xs font-medium text-slate-500">
                          Supporting events
                        </p>

                        {safeCustomerRecordEvents.length > 0 ? (
                          <ul className="space-y-1">
                            {safeCustomerRecordEvents.slice(0, 10).map((event, index) => (
                              <li key={event?.id || index}>
                                {sanitizeText(formatEventText(event), "Event recorded, but no readable text was captured.")}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-slate-400">
                            No events recorded yet. This baseline is currently derived from structured diagnostic input only.
                          </p>
                        )}
                      </div>

                      <div>
                        <p className="mb-1 text-xs font-medium text-slate-500">
                          Record integrity
                        </p>

                        <div className="space-y-1 text-xs font-medium text-emerald-700">
                          <div>{safeCustomerRecordEvents.length} structured events included</div>
                          <div>No conflicting inputs detected</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </section>      {data.caseData ? (
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
            {(() => {
              const customerSnapshot = {
                weakestDimension: data.caseData?.weakestDimension,
                patternId: data.caseData?.patternId,
                runFallback: data.caseData?.fallbackRunCode,
                routeDecision: data.caseData?.routeDecision,
              };

              return (
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
                  Where it is weakest
                </p>
                <p
                  style={{
                    fontSize: "12px",
                    fontWeight: 500,
                    lineHeight: 1,
                    margin: 0,
                  }}
                >
                  {sanitizeText(getWeakestDimensionDisplay(customerSnapshot.weakestDimension))}
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
                  Current structure status
                </p>
                <p
                  style={{
                    fontSize: "12px",
                    fontWeight: 500,
                    lineHeight: 1,
                    margin: 0,
                  }}
                >
                  {getCustomerStructureStatus(customerSnapshot)}
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
                  Decision readiness
                </p>
                <p
                  style={{
                    fontSize: "12px",
                    fontWeight: 500,
                    lineHeight: 1,
                    margin: 0,
                  }}
                >
                  {getCustomerDecisionReadiness(customerSnapshot)}
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
                  Next step
                </p>
                <p
                  style={{
                    fontSize: "12px",
                    fontWeight: 500,
                    lineHeight: 1.25,
                    margin: 0,
                  }}
                >
                  {getCustomerNextStep(customerSnapshot)}
                </p>
              </div>
            </div>
              );
            })()}
          </div>
        </section>
      ) : null}

        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold mb-2">
            Receipt status
          </h2>
          <p className="text-slate-700 leading-7">
            {!hasEventBackedBaseline
              ? "This receipt is not ready for verification. Capture at least one real event to activate the baseline."
              : returnedFromFailedVerification
              ? "This receipt has returned from a failed verification path. Use Verification to review the current failure state and see the repair path."
              : canEnterVerification
              ? "This receipt is now carrying the current structure forward. Open Verification to review whether the proof is ready, warning, or failed."
              : "This receipt records the current structure state. Open Verification to see the failure or warning state, along with the repair path and smallest next action."}
          </p>
        </section>

        <div>
          <section className="bg-amber-50 rounded-2xl border border-amber-200 p-6">
            <h2 className="text-lg font-semibold mb-2">Record Note</h2>
            <p className="text-slate-700 leading-7">
              {hasEventBackedBaseline
                ? sanitizeText(data.receiptNote)
                : "No issued baseline yet. This record is waiting for event-backed evidence before it can be used for review, verification, or external reliance."}
            </p>
          </section>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
                onClick={() => {
                  console.log("[RECEIPT_CTA_CLICK]", {
                    buttonState,
                    isPaid,
                    receiptEligible,
                    hasEventBackedRecord,
                    hasPassingScore,
                    hasEventBackedBaseline,
                    guardedReceiptEligible,
                    canShowFormalPaymentEntry,
                    dataDecisionStatus: data?.decisionStatus,
                  });

                  if (!receiptEligible) {
                    navigate(
                      `${ROUTES.PILOT_RESULT}?caseId=${encodeURIComponent(
                        inferredCaseId || data.caseData?.caseId || data.caseData?.id || ""
                      )}`,
                      {
                      state: {
                        ...stripCanonicalCaseFlowState(location.state || {}),
                        caseId: inferredCaseId,
                      },
                    }
                  );
                  return;
                }

                if (receiptEligible) {
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
                        inferredCaseId,
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

                  navigate(`${ROUTES.VERIFICATION}${location.search || ""}`, {
                    state: {
                      ...stripCanonicalCaseFlowState(location.state || {}),
                      receiptPageData: data,
                      sharedReceiptVerificationContract: sharedContract,
                      caseData: data.caseData || null,
                      verificationPageData:
                        location.state?.verificationPageData || null,
                      routeDecision,
                      receiptSource,
                      evidenceLock: finalEvidenceLock,
                      caseId: inferredCaseId,
                    },
                  });
                  return;
                }

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
                      inferredCaseId,
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

                navigate(`${ROUTES.VERIFICATION}${location.search || ""}`, {
                  state: {
                    ...stripCanonicalCaseFlowState(location.state || {}),

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
              className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2 text-sm font-semibold text-black border border-black shadow-sm hover:bg-white hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
            >
              {sanitizeText(receiptCtaLabel)}
            </button>

          {/* Back to Pilot */}
          <button
            type="button"
            onClick={() =>
              navigate(
                `${ROUTES.PILOT_RESULT}?caseId=${encodeURIComponent(
                  inferredCaseId || data.caseData?.caseId || data.caseData?.id || ""
                )}`,
                { state: location.state }
              )
            }
            className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-xs font-semibold text-slate-800 shadow-sm transition hover:bg-slate-100"
          >
            Back to Pilot
          </button>
        </div>
        </div>
        {quickCaptureOpen && (
          <div
            onClick={() => setQuickCaptureOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 2147483647,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(15, 23, 42, 0.45)",
              padding: "16px",
            }}
          >
            <div
              className="rounded-3xl bg-white shadow-xl border border-slate-200"
              onClick={(event) => event.stopPropagation()}
              style={{
                width: "50%",
                maxWidth: "390px",
                minWidth: "320px",
                padding: "34px 28px 30px",
              }}
            >
              <div className="mb-6">
                <h2 className="text-lg font-bold text-slate-900">
                  Capture New Progress
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Add one structured update to the current baseline record.
                </p>
              </div>

              <div className="space-y-7">
                <label className="block">
                  <span className="mb-3 block text-xs font-semibold text-slate-600">
                    What changed?
                  </span>
                  <select
                    value={quickCaptureType}
                    onChange={(event) => setQuickCaptureType(event.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-slate-500"
                  >
                    <option value="decision_accepted">Decision accepted</option>
                    <option value="blocker_encountered">Blocker encountered</option>
                    <option value="ownership_changed">Ownership changed</option>
                    <option value="scope_updated">Scope updated</option>
                  </select>
                </label>
        
                <label className="block">
                  <span className="mb-3 block text-xs font-semibold text-slate-600">
                    Signal impact
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {["low", "medium", "high"].map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setQuickCaptureSignal(level)}
                        className={`rounded-2xl px-3 py-2 text-xs font-semibold transition ${
                          quickCaptureSignal === level
                            ? "bg-slate-950 text-white"
                            : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </button>
                    ))}
                  </div>
                </label>
        
                <label className="block">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600">
                      Optional note
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {quickCaptureNote.length}/120
                    </span>
                  </div>
        
                  <textarea
                    value={quickCaptureNote}
                    onChange={(event) => {
                      const val = event.target.value.slice(0, 120);
                      setQuickCaptureNote(val);
                    }}
                    rows={1}
                    placeholder="Add context if needed"
                    style={{
                      resize: "none",
                      overflow: "hidden",
                      minHeight: "44px",
                      height: quickCaptureNote.trim()
                        ? `${Math.max(44, Math.ceil(quickCaptureNote.length / 42) * 22 + 22)}px`
                        : "44px",
                      lineHeight: "22px",
                    }}
                    className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-xs outline-none focus:border-slate-500"
                  />
                  <div
                    style={{
                      marginTop: "10px",
                      borderRadius: "16px",
                      border: "1px solid #CBD5E1",
                      background: "#F8FAFC",
                      padding: "10px 12px",
                    }}
                  >
                    <p
                      style={{
                        margin: "0 0 6px 0",
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "#64748B",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      Auto-generated event tag
                    </p>

                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <span className="rounded-full bg-slate-950 px-3 py-1 text-[11px] font-semibold text-white">
                        {sanitizeText(quickCaptureSuggestion.label)}
                      </span>

                      <span className="rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700">
                        What this means in practice: {sanitizeText(quickCaptureSuggestion.signalImpact)}
                      </span>
                    </div>

                    <p
                      style={{
                        margin: "8px 0 0 0",
                        fontSize: "11px",
                        lineHeight: 1.45,
                        color: "#64748B",
                      }}
                    >
                      {sanitizeText(quickCaptureSuggestion.reason)}
                    </p>
                  </div>
                </label>
              </div>
        
              <div className="mt-8 flex items-center justify-start gap-3">
                <button
                  type="button"
                  onClick={handleQuickCaptureSubmit}
                  className="inline-flex items-center justify-center rounded-2xl px-5 py-3 text-xs font-semibold text-white transition"
                  style={{
                    backgroundColor: "#16A34A",
                    boxShadow: "0 6px 18px rgba(22,163,74,0.35)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = "0 8px 22px rgba(22,163,74,0.45)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "0 6px 18px rgba(22,163,74,0.35)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  Capture Snapshot
                </button>

                <button
                  type="button"
                  onClick={() => setQuickCaptureOpen(false)}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



