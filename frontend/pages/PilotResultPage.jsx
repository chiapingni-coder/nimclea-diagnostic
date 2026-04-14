import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { buildReceiptPageData } from "../buildReceiptPageData";
import { buildVerificationPageData } from "../buildVerificationPageData";
import { createReceiptHash } from "./ReceiptPage";

import {
  buildReceiptContract,
  flattenSharedReceiptVerificationContract,
} from "../utils/sharedReceiptVerificationContract";

import ROUTES from "../routes";
import { logEvent } from "../utils/eventLogger";
import { getPilotEntries } from "../utils/pilotEntries";
import { evaluatePilotCombinationStatus } from "../utils/verificationStatus";
import { recordRun } from "./runLedger";
import { normalizeCaseInput, getSafeCaseSummary } from "../utils/caseSchema";

import {
  getCaseSummary,
  getCaseContext,
  getCaseScenarioCode,
  getCaseStage,
  getCaseRunCode,
  getCasePatternId,
  getCaseWeakestDimension,
} from "../utils/caseAccessors";

const SCENARIO_LABEL_MAP = {
  pre_audit_collapse: "Pre-Audit Collapse",
  barely_functional: "Barely Functional",
  boundary_blur: "Boundary Blur",
  fully_ready: "Fully Ready",
};

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

function deriveRunFromPilotEntry(entry = {}, fallback = {}) {
  const reviewResult = getEntryReviewResult(entry) || {};
  const caseData = getEntryCaseData(entry);

  return {
    runId:
      reviewResult.runId ||
      reviewResult.runLabel ||
      entry.runId ||
      entry.runLabel ||
      fallback.runId ||
      fallback.runLabel ||
      "RUN000",
    runLabel:
      reviewResult.runLabel ||
      reviewResult.runId ||
      entry.runLabel ||
      entry.runId ||
      fallback.runLabel ||
      fallback.runId ||
      "RUN000",
    stageLabel:
      reviewResult.stage ||
      reviewResult.stageLabel ||
      caseData?.stage ||
      entry.stageLabel ||
      entry.stage ||
      fallback.stageLabel ||
      fallback.stage ||
      "",
    scenarioLabel:
      reviewResult.scenarioLabel ||
      caseData?.scenarioCode ||
      entry.scenarioLabel ||
      entry.scenario ||
      fallback.scenarioLabel ||
      "",
    confidenceLabel:
      reviewResult.confidenceLabel ||
      entry.confidenceLabel ||
      fallback.confidenceLabel ||
      "High",
  };
}

function buildRunEntriesFromPilotEntries(entries = [], fallback = {}) {
  const counter = new Map();

  entries.forEach((entry) => {
    const normalized = deriveRunFromPilotEntry(entry, fallback);
    const key = normalized.runLabel;

    if (!counter.has(key)) {
      counter.set(key, {
        ...normalized,
        count: 1,
      });
      return;
    }

    const current = counter.get(key);
    counter.set(key, {
      ...current,
      count: current.count + 1,
    });
  });

  const aggregated = Array.from(counter.values()).map(normalizeRunEntry);

  if (aggregated.length > 0) {
    return aggregated;
  }

  return [
    normalizeRunEntry({
      runId: fallback.runId || fallback.runLabel || "RUN000",
      runLabel: fallback.runLabel || fallback.runId || "RUN000",
      count: 1,
      stageLabel: fallback.stageLabel || "",
      scenarioLabel: fallback.scenarioLabel || "",
      confidenceLabel: fallback.confidenceLabel || "High",
    }),
  ];
}

function buildRunSummaryText(runEntries = []) {
  const totalRunHits = runEntries.reduce(
    (sum, entry) => sum + (entry.count || 0),
    0
  );

  return `${runEntries.length} RUN pattern${runEntries.length > 1 ? "s" : ""} recorded across ${totalRunHits} structured hit${totalRunHits > 1 ? "s" : ""}.`;
}

function getEntryTimestamp(entry = {}) {
  const raw =
    entry.timestamp ||
    entry.createdAt ||
    entry.created_at ||
    entry.recordedAt ||
    entry.recorded_at ||
    null;

  if (!raw) return null;

  const time = new Date(raw).getTime();
  return Number.isNaN(time) ? null : time;
}

function getEntryEventInput(entry = {}) {
  return entry.eventInput || entry.sourceInput || null;
}

function getEntryReviewResult(entry = {}) {
  return entry.reviewResult || entry.result || null;
}

function getEntryWeakestDimension(entry = {}) {
  return (
    entry.weakestDimensionSnapshot ||
    entry.weakestDimension ||
    entry.caseData?.weakestDimension ||
    ""
  );
}

function getEntryCaseData(entry = {}) {
  return (
    entry.reviewResult?.caseData ||
    entry.caseSchema ||
    entry.caseData ||
    null
  );
}

function hasSevenDayWindowElapsed(entries = [], locationState = {}) {
  const explicitPilotStart =
    locationState?.pilot_setup?.startedAt ||
    locationState?.pilot_setup?.startTime ||
    locationState?.pilot_setup?.createdAt ||
    locationState?.pilot_setup?.timestamp ||
    null;

  const explicitStartTime = explicitPilotStart
    ? new Date(explicitPilotStart).getTime()
    : null;

  const entryTimes = (Array.isArray(entries) ? entries : [])
    .map(getEntryTimestamp)
    .filter(Boolean);

  const fallbackStartTime =
    entryTimes.length > 0 ? Math.min(...entryTimes) : null;

  const startTime = explicitStartTime || fallbackStartTime;

  if (!startTime) return false;

  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  return Date.now() - startTime >= sevenDaysMs;
}

function getCurrentEventType(entries = []) {
  if (!Array.isArray(entries) || entries.length === 0) return "other";

  const latest = entries[entries.length - 1];

  return (
    latest?.eventType ||
    getEntryReviewResult(latest)?.eventType ||
    "other"
  );
}

function getEventLabel(eventType) {
  const EVENT_LABEL_MAP = {
    decision_suggested: "Someone suggested a decision for you",
    decision_override_attempt: "Someone tried to decide on your behalf",
    resource_control_request: "A resource / money / control request",
    high_pressure_decision: "You were pushed toward a fast decision",
    role_boundary_blur: "Roles or responsibilities became unclear",
    other: "Other structural event",
  };

  return EVENT_LABEL_MAP[eventType] || "Other structural event";
}

function getPrimaryRecommendation({
  weakestDimension = "",
  firstGuidedAction = "",
  structureStatus = "",
}) {
  if (firstGuidedAction) {
    return firstGuidedAction;
  }

  const normalizedStatus = String(structureStatus || "").toLowerCase();

  const map = {
    authority:
      normalizedStatus === "ready"
        ? "Move forward, but keep decision ownership explicit at the next approval point."
        : "Stabilize decision ownership before taking the next visible action.",
    boundary:
      normalizedStatus === "ready"
        ? "Move forward, but keep role and approval boundaries explicit."
        : "Rebuild one clear role or approval boundary before expanding the workflow.",
    evidence:
      normalizedStatus === "ready"
        ? "Move forward, but keep one traceable record attached to the next action."
        : "Create one traceable record before the next decision becomes harder to defend.",
    coordination:
      normalizedStatus === "ready"
        ? "Move forward, but keep one owner and one next step clearly assigned."
        : "Reduce execution drift by locking one owner and one next operational step.",
  };

  return (
    map[weakestDimension] ||
    "Take the next step that makes the workflow easier to explain, verify, and defend."
  );
}

function getBackupRecommendation(weakestDimension = "") {
  const map = {
    authority:
      "If ownership cannot be clarified yet, narrow the decision scope so fewer people can reshape it.",
    boundary:
      "If boundaries cannot be restored yet, add one temporary approval checkpoint before execution continues.",
    evidence:
      "If a full record is not possible yet, capture one minimal written justification before moving forward.",
    coordination:
      "If alignment is still weak, pause expansion and reduce the number of active actors in the workflow.",
  };

  return (
    map[weakestDimension] ||
    "Use a smaller temporary control so the workflow becomes easier to review and defend."
  );
}

function getCostAttachment(weakestDimension = "") {
  const map = {
    authority:
      "Cost attached: this may slow decision speed slightly, but it prevents ownership drift from silently reshaping the outcome.",
    boundary:
      "Cost attached: this may add one friction point, but it prevents role blur from creating hidden responsibility gaps.",
    evidence:
      "Cost attached: this adds recording effort, but it prevents the next decision from becoming hard to explain or defend.",
    coordination:
      "Cost attached: this may reduce flexibility in the short term, but it prevents fragmented execution from compounding later.",
  };

  return (
    map[weakestDimension] ||
    "Cost attached: this adds short-term discipline, but it improves structural defensibility."
  );
}

function getMainPathSummary({
  structureStatus = "",
  weakestDimension = "",
  currentEventLabel = "",
}) {
  const status = String(structureStatus || "").toLowerCase();
  const dimension = String(weakestDimension || "").trim();
  const eventLabel = currentEventLabel || "Current structural event";

  if (status === "ready") {
    return {
      title: "This case is structurally strong enough to move forward.",
      body: `${eventLabel} is now being interpreted through ${dimension || "the current structure"}, and the record is strong enough to proceed to receipt review.`,
    };
  }

  if (status === "building") {
    return {
      title: "This case is structurally forming, but not stable yet.",
      body: `${eventLabel} reveals pressure around ${dimension || "the current structure"}, but the record still needs more support before it becomes review-ready.`,
    };
  }

  if (status === "weak") {
    return {
      title: "This case is not structurally ready yet.",
      body: `${eventLabel} is exposing weakness in ${dimension || "the current structure"}, and that weakness is still preventing reliable receipt review.`,
    };
  }

  return {
    title: "This case is being structurally interpreted.",
    body: `${eventLabel} is currently being interpreted through ${dimension || "the current structure"}.`,
  };
}

function buildExecutionSummary(entries = [], weakestDimension = "", firstGuidedAction = "") {
  const safeEntries = Array.isArray(entries) ? entries : [];
  const totalEvents = safeEntries.length;

  const structuredEvents = safeEntries.filter((entry) => {
  const eventInput = getEntryEventInput(entry) || {};
  const caseData = getEntryCaseData(entry);

  const hasDescription =
    String(
      getCaseSummary({
        caseData,
        summaryText: eventInput.summaryContext || "",
      }) || ""
    ).trim().length > 0 ||
    String(
      getCaseContext({
        caseData,
        caseInput: eventInput.description || "",
      }) || ""
    ).trim().length > 0;

  const hasEventType =
    String(
      entry?.eventType ||
      getEntryReviewResult(entry)?.eventType ||
      ""
    ).trim().length > 0;
  const hasPressure = String(eventInput?.externalPressure || "").trim().length > 0;
  const hasBoundary = String(eventInput?.authorityBoundary || "").trim().length > 0;
  const hasDependency = String(eventInput?.dependency || "").trim().length > 0;

    return (
      hasDescription &&
      hasEventType &&
      hasPressure &&
      hasBoundary &&
      hasDependency
    );
  });

  const latestEntry =
    safeEntries.length > 0 ? safeEntries[safeEntries.length - 1] : null;

  const latestEventLabelMap = {
    decision_suggested: "Decision suggestion detected",
    decision_override_attempt: "Decision override attempt detected",
    resource_control_request: "Resource or control request detected",
    high_pressure_decision: "High-pressure decision moment detected",
    role_boundary_blur: "Boundary blur detected",
    other: "Structural event recorded",
  };

  const mainObservedShiftMap = {
    authority: "Authority is becoming the main structural stress point.",
    boundary: "Boundary clarity is becoming the main structural stress point.",
    evidence: "Evidence support is becoming the main structural stress point.",
    coordination: "Coordination is becoming the main structural stress point.",
  };

  const resolvedEventType =
    latestEntry?.eventType ||
    getEntryReviewResult(latestEntry)?.eventType ||
    "other";

  return {
    totalEvents,
    structuredEventsCount: structuredEvents.length,
    latestEventType: resolvedEventType,
    latestEventLabel:
      latestEventLabelMap[resolvedEventType] || "Structural event recorded",
    latestEventDescription: (() => {
      const latestCaseData = getEntryCaseData(latestEntry);
      const latestEventInput = getEntryEventInput(latestEntry) || {};

      return (
        getCaseSummary({
          caseData: latestCaseData,
          summaryText: latestEventInput.summaryContext || "",
        }) ||
        getCaseContext({
          caseData: latestCaseData,
          caseInput: latestEventInput.description || "",
        }) ||
        latestEventInput.description ||
        ""
      );
    })(),
    mainObservedShift:
      mainObservedShiftMap[weakestDimension] ||
      "A structural weakness is becoming easier to observe through real events.",
    nextCalibrationAction:
      firstGuidedAction ||
      "Use the next real event to confirm whether this structural weakness repeats.",
    behaviorStatus:
      structuredEvents.length >= 3
        ? "behavior_confirmed"
        : structuredEvents.length >= 1
        ? "behavior_emerging"
        : "behavior_weak",
  };
}

function resolveCaseDataFromState(locationState = {}) {
  const directCaseData = locationState?.caseData || null;
  const pilotResultCaseData = locationState?.pilot_result?.caseData || null;
  const latestEntryCaseData = locationState?.latest_pilot_entry?.caseData || null;

  if (directCaseData) return directCaseData;
  if (pilotResultCaseData) return pilotResultCaseData;
  if (latestEntryCaseData) return latestEntryCaseData;

  return null;
}

function buildSourceInputFromState(locationState = {}) {
  const preview = locationState?.preview || null;
  const sourceInput = locationState?.sourceInput || null;
  const pilotSetup = locationState?.pilot_setup || null;
  const pilotResult = locationState?.pilot_result || null;
  const resolvedCaseData = resolveCaseDataFromState(locationState);
  const caseInput =
    locationState?.caseInput ||
    pilotSetup?.caseInput ||
    pilotResult?.caseInput ||
    "";

  const upstream = sourceInput || preview || {};
  const extraction = upstream?.extraction || {};
  const resultSeed = upstream?.resultSeed || upstream?.extraction || {};

return {
  weakestDimension: getCaseWeakestDimension({
    caseData: resolvedCaseData,
    weakestDimension:
      locationState?.weakestDimension ||
      pilotResult?.judgmentFocus ||
      locationState?.latest_pilot_entry?.judgmentFocus ||
      "",
  }),

  judgmentFocus:
    getCaseWeakestDimension({
      caseData: resolvedCaseData,
      weakestDimension:
        pilotResult?.judgmentFocus ||
        locationState?.latest_pilot_entry?.judgmentFocus ||
        locationState?.weakestDimension ||
        "event_based",
    }) || "event_based",

  resolvedBy:
    pilotResult?.resolvedBy ||
    pilotSetup?.resolvedBy ||
    (resolvedCaseData?.weakestDimension
      ? "case_schema"
      : locationState?.weakestDimension
      ? "weakest_dimension"
      : "event_type"),

  firstGuidedAction:
    locationState?.firstGuidedAction ||
    pilotResult?.firstGuidedAction ||
    "",

  firstStepLabel:
    locationState?.firstStepLabel ||
    pilotResult?.firstStepLabel ||
    "",

  runId:
    getCaseRunCode({
      caseData: resolvedCaseData,
      runId:
        pilotResult?.runId ||
        extraction?.runCode ||
        resultSeed?.runCode ||
        upstream?.run_id ||
        upstream?.anchor_run ||
        "RUN000",
    }) || "RUN000",

  pattern:
    getCasePatternId({
      caseData: resolvedCaseData,
      pattern:
        pilotResult?.pattern ||
        extraction?.patternCode ||
        resultSeed?.patternCode ||
        upstream?.pattern ||
        upstream?.pattern_id ||
        "PAT-00",
    }) || "PAT-00",

  patternLabel:
    pilotResult?.patternLabel ||
    pilotSetup?.resolvedPatternLabel ||
    "Unresolved Pattern",

  structureStatus:
    resolvedCaseData?.structureStatus ||
    locationState?.routeMeta?.structureStatus ||
    pilotResult?.structureStatus ||
    null,

  summaryMode:
    pilotResult?.summaryMode === true,

  stage:
    getCaseStage({
      caseData: resolvedCaseData,
      stage:
        pilotResult?.stage ||
        extraction?.stageCode ||
        resultSeed?.stageCode ||
        upstream?.stage ||
        "S0",
    }) || "S0",

  decision:
    pilotResult?.decision ||
    resultSeed?.recommendedAction ||
    upstream?.recommended_next_step ||
    upstream?.pilot_preview?.entry ||
    "Continue with structured pilot execution.",

  signals:
    pilotResult?.signals ||
    (Array.isArray(upstream?.top_signals)
      ? upstream.top_signals.map((signal) => ({
          label: signal?.label || signal?.key || "unknown_signal",
          value: signal?.value || signal?.level || signal?.description || "unknown",
        }))
      : Array.isArray(resultSeed?.signals)
      ? resultSeed.signals.map((signal, index) => ({
          label:
            typeof signal === "string"
              ? signal
              : signal?.label || signal?.key || `signal_${index + 1}`,
          value:
            typeof signal === "string"
              ? "present"
              : signal?.description || signal?.value || "present",
        }))
      : []),

  workflow:
    pilotSetup?.workflow ||
    upstream?.workflow ||
    "Unknown workflow",

    scenarioLabel:
      SCENARIO_LABEL_MAP[
        getCaseScenarioCode({
          caseData: resolvedCaseData,
          scenarioCode:
            pilotResult?.scenarioCode ||
            extraction?.scenarioKey ||
            resultSeed?.scenarioKey ||
            upstream?.scenario?.code ||
            "unknown_scenario",
        })
      ] ||
      pilotResult?.scenarioLabel ||
      (preview?.scenario?.label &&
      preview?.scenario?.label !== "No Dominant Scenario"
        ? preview.scenario.label
        : null) ||
      "No Dominant Scenario",

  scenarioCode:
    getCaseScenarioCode({
      caseData: resolvedCaseData,
      scenarioCode:
        pilotResult?.scenarioCode ||
        extraction?.scenarioKey ||
        resultSeed?.scenarioKey ||
        upstream?.scenario?.code ||
        "unknown_scenario",
    }) || "unknown_scenario",

  summaryText:
    getCaseSummary({
      caseData: resolvedCaseData,
      summaryText:
        pilotResult?.summaryText ||
        upstream?.summary?.[0] ||
        resultSeed?.summary ||
        "No structured summary available.",
    }) || "No structured summary available.",

  caseInput: getCaseContext({
    caseData: resolvedCaseData,
    caseInput:
      caseInput ||
      pilotSetup?.description ||
      pilotResult?.summaryText ||
      "",
  }),

  eventWindow:
    locationState?.routeMeta?.eventWindow || null,

  progressLabel:
    locationState?.routeMeta?.progressLabel || null,

  nextAction:
    locationState?.routeMeta?.nextAction || null,

  caseData: resolvedCaseData,
};
}

// ===== runtime helpers =====
function normalizePilotStructureStatus(status = "") {
  const normalized = String(status || "").trim().toLowerCase();

  if (
    normalized === "receipt_ready" ||
    normalized === "resolved" ||
    normalized === "ready"
  ) {
    return "ready";
  }

  if (
    normalized === "pilot_complete" ||
    normalized === "emerging" ||
    normalized === "building"
  ) {
    return "building";
  }

  if (
    normalized === "insufficient" ||
    normalized === "weak"
  ) {
    return "weak";
  }

  return "weak";
}

function resolvePilotRuntimeState(locationState = {}, combinationStatus = {}, hasPilotEntries = false) {
  const routeMeta = locationState?.routeMeta || {};
  const pilotResult = locationState?.pilot_result || {};

  const upstreamStructureStatus =
    routeMeta.structureStatus ||
    pilotResult.structureStatus ||
    null;

  const upstreamSummaryMode =
    pilotResult.summaryMode === true ||
    routeMeta.structureStatus === "pilot_complete";

  const upstreamReviewMode =
    routeMeta.reviewMode ||
    pilotResult.reviewMode ||
    null;

  const upstreamStructuredEventCount =
    routeMeta.structuredEventCount ??
    pilotResult.structuredEventCount ??
    null;

  const upstreamEvidenceSupport =
    routeMeta.evidenceSupport ??
    pilotResult.evidenceSupport ??
    null;

  const upstreamStructureCompleteness =
    routeMeta.structureCompleteness ??
    pilotResult.structureCompleteness ??
    null;

  const upstreamSamplingWindowClosed =
    routeMeta.samplingWindowClosed === true ||
    pilotResult.samplingWindowClosed === true;

  const fallbackStructureStatus = combinationStatus.structureStatus || "weak";
  const fallbackScore = combinationStatus.score ?? 0;

  const resolvedStructureStatus = normalizePilotStructureStatus(
    upstreamStructureStatus || fallbackStructureStatus
  );

  const resolvedSummaryMode = upstreamSummaryMode === true;
  const resolvedReviewMode = upstreamReviewMode || "event_review";

  const resolvedStructuredEventCount =
    upstreamStructuredEventCount ??
    (hasPilotEntries ? 1 : 0);

  const resolvedEvidenceSupport =
    upstreamEvidenceSupport ??
    combinationStatus.evidenceSupport ??
    0;

  const resolvedStructureCompleteness =
    upstreamStructureCompleteness ??
    combinationStatus.structureCompleteness ??
    0;

  const resolvedSamplingWindowClosed = upstreamSamplingWindowClosed;

  const resolvedScore =
    upstreamEvidenceSupport !== null &&
    upstreamStructureCompleteness !== null
      ? Number(upstreamEvidenceSupport || 0) +
        Number(upstreamStructureCompleteness || 0)
      : fallbackScore;

  // ✅ descriptive-only（彻底去功能）
const resolvedReceiptEligible = null;

  return {
    routeMeta,
    pilotResult,
    resolvedStructureStatus,
    resolvedSummaryMode,
    resolvedReviewMode,
    resolvedStructuredEventCount,
    resolvedEvidenceSupport,
    resolvedStructureCompleteness,
    resolvedSamplingWindowClosed,
    resolvedScore,
    resolvedReceiptEligible,
    resolvedNextAction:
      routeMeta.nextAction ||
      pilotResult.nextAction ||
      null,
  };
}

export default function PilotResultPage() {
  const navigate = useNavigate();
  const location = useLocation();

  console.log("🧠 PilotResult location.state =", location.state);

  useEffect(() => {
    logEvent("pilot_result_viewed");
  }, []);

  const sourceInput = buildSourceInputFromState(location.state || {});
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showPilotRulesModal, setShowPilotRulesModal] = useState(false);

  const rawPilotEntries =
    location.state?.eventHistory ||
    location.state?.pilot_entries ||
    location.state?.pilot_result?.eventHistory ||
    getPilotEntries();

  const eventHistory = useMemo(() => {
    return Array.isArray(rawPilotEntries) ? rawPilotEntries : [];
  }, [rawPilotEntries]);

  const [forceWeeklySummary, setForceWeeklySummary] = useState(false);
  const [weeklySummaryExpanded, setWeeklySummaryExpanded] = useState(false);
  const [structuralTraceExpanded, setStructuralTraceExpanded] = useState(false);
  const [receiptEligibilityExpanded, setReceiptEligibilityExpanded] = useState(false);
  const [backupPathExpanded, setBackupPathExpanded] = useState(false);

  const pilotFlow = useMemo(() => {
    const entryCount = eventHistory.length;

    const hasExplanation = eventHistory.some((item) => {
      const eventInput = getEntryEventInput(item) || {};
      const caseData = getEntryCaseData(item);

      return (
        String(
          getCaseSummary({
            caseData,
            summaryText: eventInput.summaryContext || "",
          }) || ""
        ).trim().length > 0 ||
        String(
          getCaseContext({
            caseData,
           caseInput: eventInput.description || "",
          }) || ""
        ).trim().length > 0 ||
        String(eventInput.description || "").trim().length > 0
      );
    });

    const hasEvidenceReady = eventHistory.some((item) =>
      evaluatePilotCombinationStatus({ entries: [item] }).evidenceSupport >= 1
    );

    if (forceWeeklySummary) {
      return "weekly_summary";
    }

    if (hasEvidenceReady) {
      return "evidence_backed_result";
    }

    if (hasExplanation || entryCount > 0) {
      return "explanation_only";
    }

    return "empty";
  }, [eventHistory, forceWeeklySummary]);

  const weeklySummaryText = useMemo(() => {
    if (!eventHistory.length) {
      return "No pilot entries were recorded during this window.";
    }

    const latestEvent = eventHistory[eventHistory.length - 1] || {};
    const latestEventInput = getEntryEventInput(latestEvent) || {};
    const latestCaseData = getEntryCaseData(latestEvent);

    const workflow =
      latestEvent?.workflow ||
      latestEventInput?.workflow ||
      eventHistory[0]?.workflow ||
      sourceInput.workflow ||
      "Selected workflow";

    const dominantEvent =
      latestEvent?.eventType ||
      getEntryReviewResult(latestEvent)?.eventType ||
      latestCaseData?.eventType ||
      "other";
  
    const lastDescription =
      getCaseSummary({
        caseData: latestCaseData,
        summaryText: latestEventInput.summaryContext || "",
      }) ||
      getCaseContext({
        caseData: latestCaseData,
        caseInput: latestEventInput.description || "",
      }) ||
      latestEventInput.description ||
      sourceInput.summaryText ||
      "No detailed description recorded.";
  
    return `7-day summary for ${workflow}. ${eventHistory.length} pilot entr${eventHistory.length > 1 ? "ies were" : "y was"} recorded. Dominant event: ${dominantEvent}. Latest observed context: ${lastDescription}`;
  }, [eventHistory, sourceInput.workflow, sourceInput.summaryText]);

  const entries = useMemo(() => {
    const rawEntries = eventHistory;

    return rawEntries.map((entry) => {
      const existingCaseData = getEntryCaseData(entry);
      if (existingCaseData) {
        return {
          ...entry,
          caseData: existingCaseData,
        };
      }

      const eventInput = getEntryEventInput(entry) || {};
      const reviewResult = getEntryReviewResult(entry) || {};
      const weakestDimension =
        getEntryWeakestDimension(entry) ||
        sourceInput?.weakestDimension ||
        "";

      const normalizedEntryCase = normalizeCaseInput(
        {
          source: "pilot",
          summary: getCaseSummary({
            caseData: existingCaseData || null,
            summaryText:
              reviewResult.summaryText ||
              eventInput.summaryContext ||
              "",
            caseInput: eventInput.description || "",
          }),
          description: getCaseContext({
            caseData: existingCaseData || null,
            caseInput: eventInput.description || "",
          }),
          eventType:
            entry?.eventType ||
            reviewResult?.eventType ||
            "other",
          eventContext: getCaseContext({
            caseData: existingCaseData || null,
            caseInput: eventInput.description || "",
          }),
          weakestDimension: getCaseWeakestDimension({
            caseData: existingCaseData || null,
            weakestDimension,
          }),
          scenarioCode:
            getCaseScenarioCode({
              caseData: existingCaseData || null,
              scenarioCode:
                reviewResult?.scenarioCode ||
                entry?.scenarioCode ||
                sourceInput?.scenarioCode ||
                "unknown_scenario",
            }) || "unknown_scenario",
          patternId: getCasePatternId({
            caseData: existingCaseData || null,
            pattern:
              reviewResult?.pattern ||
              entry?.pattern ||
              sourceInput?.pattern ||
              "",
          }),
          fallbackRunCode: getCaseRunCode({
            caseData: existingCaseData || null,
            runId:
              reviewResult?.runId ||
              entry?.runId ||
              sourceInput?.runId ||
              "",
          }),
          stage:
            getCaseStage({
              caseData: existingCaseData || null,
              stage:
                reviewResult?.stage ||
                entry?.stage ||
                sourceInput?.stage ||
                "S0",
            }) || "S0",
          dimensions: {
            evidence: weakestDimension === "evidence" ? 1 : 2,
            authority: weakestDimension === "authority" ? 1 : 2,
            coordination: weakestDimension === "coordination" ? 1 : 2,
            timing: 2,
          },
        },
        {
          source: "pilot",
        }
      );
  
      return {
        ...entry,
        caseData: normalizedEntryCase,
      };
    });
  }, [eventHistory, sourceInput]);

  const latestEvent = entries[entries.length - 1] || null;
  const currentEventType = latestEvent?.eventType || getCurrentEventType(entries);
  const currentEventLabel = getEventLabel(currentEventType);

  const resolvedWeakestDimension =
    getEntryWeakestDimension(latestEvent) ||
    sourceInput.weakestDimension ||
    "";

  const executionSummary = useMemo(() => {
    return buildExecutionSummary(
      entries,
      resolvedWeakestDimension,
      sourceInput.firstGuidedAction
    );
  }, [entries, resolvedWeakestDimension, sourceInput.firstGuidedAction]);

  const combinationStatus = useMemo(() => {
    return evaluatePilotCombinationStatus({
      entries,
      summaryMode: forceWeeklySummary,
      topSignals: (sourceInput.signals || []).map(
        (signal) => `${signal.label}: ${signal.value}`
      ),
    });
  }, [entries, forceWeeklySummary, sourceInput.signals]);

  const hasPilotEntries = entries.length > 0;

  const runtimeState = useMemo(() => {
    return resolvePilotRuntimeState(
      location.state || {},
      combinationStatus,
      hasPilotEntries
    );
  }, [location.state, combinationStatus, hasPilotEntries]);

  const resolvedStructureStatus = runtimeState.resolvedStructureStatus;  // ✅ 仅展示

  const mainPathSummary = getMainPathSummary({
    structureStatus: resolvedStructureStatus,
    weakestDimension: resolvedWeakestDimension,
    currentEventLabel,
  });

  const primaryRecommendation = getPrimaryRecommendation({
    weakestDimension: resolvedWeakestDimension,
    firstGuidedAction: sourceInput.firstGuidedAction,
    structureStatus: resolvedStructureStatus,
  });

  const backupRecommendation = getBackupRecommendation(
    resolvedWeakestDimension
  );

  const costAttachment = getCostAttachment(resolvedWeakestDimension);

  const runEntries = useMemo(() => {
    return buildRunEntriesFromPilotEntries(entries, {
      runId: sourceInput.runId,
      runLabel: sourceInput.runId,
      stageLabel: sourceInput.stage,
      scenarioLabel: sourceInput.scenarioLabel,
      confidenceLabel: "High",
    });
  }, [entries, sourceInput.runId, sourceInput.stage, sourceInput.scenarioLabel]);

  const totalRunHits = useMemo(() => {
    return runEntries.reduce((sum, entry) => sum + (entry.count || 0), 0);
  }, [runEntries]);

  const primaryRunLabel = runEntries[0]?.runLabel || sourceInput.runId || "RUN000";

  const runSummaryText = useMemo(() => {
    return buildRunSummaryText(runEntries);
  }, [runEntries]);

const canShowProgressSummary = hasPilotEntries;

const weeklySummaryDue =
  runtimeState.resolvedSamplingWindowClosed ||
  hasSevenDayWindowElapsed(entries, location.state || {});

useEffect(() => {
  if (weeklySummaryDue) {
    setForceWeeklySummary(true);
  }
}, [weeklySummaryDue]);

const isWeeklySummaryFlow =
  forceWeeklySummary === true || runtimeState.resolvedSummaryMode === true;

const resolvedSummaryMode = isWeeklySummaryFlow;

const evidenceSupportScore = runtimeState.resolvedEvidenceSupport ?? 0;
const structureCompletenessScore = runtimeState.resolvedStructureCompleteness ?? 0;

const consistencySignal = combinationStatus.consistency ?? 0;
const continuitySignal = combinationStatus.continuity ?? 0;

const consistencyScore = consistencySignal > 0 ? 1 : 0;
const continuityScore = continuitySignal > 0 ? 1 : 0;

const normalizedEvidenceScore = Math.max(
  0,
  Math.min(1, evidenceSupportScore / 2)
);

const normalizedStructureScore = Math.max(
  0,
  Math.min(1, structureCompletenessScore / 2)
);

const normalizedConsistencyScore = Math.max(
  0,
  Math.min(1, consistencyScore)
);

const normalizedContinuityScore = Math.max(
  0,
  Math.min(1, continuityScore)
);

// ✅ 唯一来源：shared contract / scoring
const receiptReviewEligible =
  location.state?.sharedReceiptVerificationContract?.scoring?.receiptEligible ??
  false;

const resolvedCaseInput = getCaseContext(sourceInput);

const resolvedSummaryText =
  getCaseSummary(sourceInput) ||
  "No structured summary available.";

const enhancedSourceInput = {
  ...sourceInput,
  caseData: sourceInput.caseData || null,
  eventHistory: entries,
  latestEvent: entries[entries.length - 1] || null,
  schemaVersion: sourceInput.caseData?.schemaVersion || null,
  structureScoreFromCase: sourceInput.caseData?.structureScore ?? null,
  routeDecisionFromCase: sourceInput.caseData?.routeDecision || null,

  reviewMode: runtimeState.resolvedReviewMode,
  structuredEventCount: runtimeState.resolvedStructuredEventCount,
  evidenceSupport: runtimeState.resolvedEvidenceSupport,
  structureCompleteness: runtimeState.resolvedStructureCompleteness,
  samplingWindowClosed: runtimeState.resolvedSamplingWindowClosed,

  summaryMode: resolvedSummaryMode,
  structureStatus: resolvedStructureStatus,
  caseInput: resolvedCaseInput,
  summaryText: resolvedSummaryText,
  pilotEntriesCount: entries.length,
  pilotFlow,
  runEntries,
  totalRunHits,
  primaryRunLabel,
  runSummaryText,
  executionSummary,

  continuity: combinationStatus.continuity,
  consistency: combinationStatus.consistency,
  score:
    location.state?.sharedReceiptVerificationContract?.scoring?.totalScore ?? 0,
  receiptEligible: receiptReviewEligible,
};

const receiptSourceInput = isWeeklySummaryFlow
  ? {
      ...enhancedSourceInput,
      eventHistory: entries,
      latestEvent: entries[entries.length - 1] || null,
      summaryMode: true,
      structureStatus: resolvedStructureStatus,
      caseInput: weeklySummaryText,
      summaryText: weeklySummaryText,
      caseData: enhancedSourceInput.caseData
        ? {
            ...enhancedSourceInput.caseData,
            summary: weeklySummaryText,
            description: weeklySummaryText,
            eventContext: weeklySummaryText,
          }
        : normalizeCaseInput({
            source: "pilot",
            summary: weeklySummaryText,
            description: weeklySummaryText,
            eventContext: weeklySummaryText,
            scenarioCode: sourceInput.scenarioCode || "unknown_scenario",
            stage: sourceInput.stage || "S0",
            fallbackRunCode: sourceInput.runId || "RUN000",
            patternId: sourceInput.pattern || "PAT-00",
            weakestDimension: resolvedWeakestDimension || "",
          }),
    }
  : enhancedSourceInput;

const scoring = {
  scoringVersion: "v1",
  evidenceScore: normalizedEvidenceScore,
  structureScore: normalizedStructureScore,
  consistencyScore: normalizedConsistencyScore,
  continuityScore: normalizedContinuityScore,
  totalScore:
    location.state?.sharedReceiptVerificationContract?.scoring?.totalScore ?? 0,

  receiptThreshold:
    location.state?.sharedReceiptVerificationContract?.scoring?.receiptThreshold ?? 3.0,
  receiptEligible: receiptReviewEligible,
};

const pressureComplexity =
  String(
    entries[entries.length - 1]?.eventInput?.externalPressure ||
    entries[entries.length - 1]?.sourceInput?.externalPressure ||
    ""
  ).trim().length > 0
    ? 1
    : 0;

const boundaryComplexity =
  String(
    entries[entries.length - 1]?.eventInput?.authorityBoundary ||
    entries[entries.length - 1]?.sourceInput?.authorityBoundary ||
    ""
  ).trim().length > 0
    ? 1
    : 0;

const dependencyComplexity =
  String(
    entries[entries.length - 1]?.eventInput?.dependency ||
    entries[entries.length - 1]?.sourceInput?.dependency ||
    ""
  ).trim().length > 0
    ? 1
    : 0;

const eventComplexityMap = {
  other: 0.25,
  decision_suggested: 0.5,
  resource_control_request: 0.75,
  role_boundary_blur: 0.75,
  high_pressure_decision: 1,
  decision_override_attempt: 1,
};

const eventComplexity =
  eventComplexityMap[currentEventType] ?? 0.25;

const complexityScore =
  (pressureComplexity +
    boundaryComplexity +
    dependencyComplexity +
    eventComplexity) / 4;

const complexityLabel =
  complexityScore >= 0.75
    ? "High"
    : complexityScore >= 0.4
    ? "Medium"
    : "Low";

const complexityNote =
  complexityLabel === "High"
    ? "This score was reached under high structural complexity."
    : complexityLabel === "Medium"
    ? "This score was reached under moderate structural complexity."
    : "This score was reached under relatively low structural complexity.";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <p className="text-sm font-medium text-slate-500 mb-2">
            {isWeeklySummaryFlow
              ? "7-Day Summary"
              : "Structural Interpretation"}
          </p>

          <h1 className="text-3xl font-bold mb-3">
            {isWeeklySummaryFlow
              ? "7-Day Pilot Summary"
              : "Structural Pilot Interpretation"}
          </h1>

          <p className="text-slate-700 leading-7">
            {isWeeklySummaryFlow
              ? "This page summarizes the pilot window and prepares it for final receipt generation and verification."
              : resolvedWeakestDimension
              ? `This event is first interpreted through your weakest dimension: ${resolvedWeakestDimension}.`
              : "This page explains how the current event is being interpreted structurally."}
          </p>
        </header>

        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="rounded-xl bg-white shadow-sm">
              <div className="h-4" />
              <div className="px-5 pt-2 pb-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      Main judgment path
                    </p>
                    <h2 className="mt-1 text-xl font-semibold text-slate-950">
                      {mainPathSummary.title}
                    </h2>
                  </div>
            
                  <div>
                    <span
                      className="inline-flex rounded-full px-3 py-1 text-sm font-semibold"
                      style={
                        resolvedStructureStatus === "ready"
                          ? {
                              backgroundColor: "#DCFCE7",
                              color: "#15803D",
                            }
                          : resolvedStructureStatus === "building"
                          ? {
                              backgroundColor: "#FEF9C3",
                              color: "#A16207",
                            }
                          : resolvedStructureStatus === "weak"
                          ? {
                              backgroundColor: "#FEE2E2",
                              color: "#B91C1C",
                            }
                          : {
                              backgroundColor: "#F1F5F9",
                              color: "#475569",
                            }
                      }
                    >
                      {resolvedStructureStatus === "ready"
                        ? "Ready"
                        : resolvedStructureStatus === "building"
                        ? "Building"
                        : resolvedStructureStatus === "weak"
                        ? "Weak"
                        : "Not set"}
                    </span>
                  </div>
                </div>
            
                <p className="mt-4 text-sm leading-7 text-slate-700">
                  {mainPathSummary.body}
                </p>
              </div>
          
              {(enhancedSourceInput.caseInput ||
                enhancedSourceInput.summaryText ||
                enhancedSourceInput.latestEvent) && (
                <div className="mx-5 mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-500">
                    Observed context
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">
                    {getCaseSummary(enhancedSourceInput.latestEvent) ||
                      getCaseContext(enhancedSourceInput.latestEvent) ||
                      getCaseSummary(enhancedSourceInput) ||
                      getCaseContext(enhancedSourceInput) ||
                      "No case attached"}
                  </p>
                </div>
              )}
          
              <div className="mx-5 mb-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-medium text-emerald-700">
                  Primary recommendation
                </p>
                <p className="mt-1 text-base font-semibold text-emerald-900">
                  {primaryRecommendation}
                </p>

                <p className="mt-3 text-sm leading-6 text-emerald-800">
                  {costAttachment}
                </p>
              </div>

              <div className="mx-5 mb-6 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setBackupPathExpanded((prev) => !prev)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      Backup path
                    </p>
                    <p className="text-sm font-semibold text-slate-900">
                      Collapsed alternative
                    </p>
                  </div>

                  <span className="text-sm font-medium text-slate-500">
                    {backupPathExpanded ? "Hide" : "View"}
                  </span>
                </button>

                {backupPathExpanded && (
                  <div className="border-t border-slate-200 bg-white px-4 py-4">
                    <p className="text-sm leading-6 text-slate-700">
                      {backupRecommendation}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

          <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white">
            <button
              type="button"
              onClick={() => setStructuralTraceExpanded((prev) => !prev)}
              className="w-full flex items-center justify-between px-4 py-4 text-left"
            >
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Structural trace
                </p>
                <p className="text-base font-semibold text-slate-900">
                  {primaryRunLabel || sourceInput.runId || "RUN000"} · {sourceInput.pattern || "PAT-00"}
                </p>
              </div>

              <span className="text-sm font-medium text-slate-500">
                {structuralTraceExpanded ? "Hide" : "View"}
              </span>
            </button>

            {structuralTraceExpanded && (
              <div className="border-t border-slate-200 bg-slate-50">
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: "0px",
                  }}
                >
                  <div className="bg-white p-4 border-r border-slate-200">
                    <p className="text-sm text-slate-500">Resolved RUN</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {primaryRunLabel || sourceInput.runId || "RUN000"}
                    </p>
                  </div>

                  <div className="bg-white p-4">
                    <p className="text-sm text-slate-500">Resolved Pattern</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {sourceInput.pattern || "PAT-00"}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {sourceInput.patternLabel || "Unresolved Pattern"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {canShowProgressSummary && (
            <div
              className="rounded-2xl overflow-hidden"
              style={
                weeklySummaryDue || isWeeklySummaryFlow
                  ? {
                      backgroundColor: "#FEF2F2",
                      border: "1px solid #FECACA",
                    }
                  : {
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #E2E8F0",
                    }
              }
            >
              <button
                type="button"
                onClick={() => setWeeklySummaryExpanded((prev) => !prev)}
                className="w-full flex items-center justify-between px-4 py-4 text-left"
              >
                <div>
                  <p
                    className="text-sm font-medium"
                   style={
                      weeklySummaryDue || isWeeklySummaryFlow
                        ? { color: "#B91C1C" }
                        : { color: "#64748B" }
                    }
                  >
                    {weeklySummaryDue || isWeeklySummaryFlow ? "Weekly Summary" : "Progress Summary"}
                  </p>

                  <p
                    className="text-base font-semibold"
                    style={
                      weeklySummaryDue || isWeeklySummaryFlow
                        ? { color: "#991B1B" }
                        : { color: "#0F172A" }
                    }
                  >
                    {weeklySummaryDue || isWeeklySummaryFlow
                      ? isWeeklySummaryFlow
                        ? "7-Day review is active"
                        : "7-Day review is now due"
                      : "Current pilot accumulation"}
                  </p>
                </div>

                <span
                  className="text-sm font-medium"
                  style={
                    weeklySummaryDue || isWeeklySummaryFlow
                      ? { color: "#B91C1C" }
                      : { color: "#475569" }
                  }
                >
                  {weeklySummaryExpanded ? "Hide" : "View"}
                </span>
              </button>

              {weeklySummaryExpanded && (
                <div
                  className="border-t px-4 py-4 space-y-4"
                  style={
                    weeklySummaryDue || isWeeklySummaryFlow
                     ? {
                          borderColor: "#FECACA",
                          backgroundColor: "#FFF7F7",
                        }
                      : {
                          borderColor: "#E2E8F0",
                          backgroundColor: "#F8FAFC",
                        }
                  }
                >
                  <div>
                    <p
                      className="text-sm mb-1"
                      style={
                        weeklySummaryDue || isWeeklySummaryFlow
                          ? { color: "#B91C1C" }
                          : { color: "#64748B" }
                      }
                    >
                      Pilot summary
                    </p>

                    <p className="text-sm leading-6 text-slate-700">
                      {weeklySummaryText}
                    </p>
                  </div>

                  {weeklySummaryDue || isWeeklySummaryFlow ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="inline-flex rounded-xl px-3 py-2 text-sm font-medium bg-red-100 text-red-800 border border-red-200">
                        {weeklyReceiptEligible
                          ? "Weekly review complete enough for receipt evaluation"
                          : "Weekly review is due, but materials are still incomplete"}
                      </div>

                      <div className="text-sm text-slate-600">
                        The 7-day pilot window has reached its weekly review point.
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}

          {/* 🧾 Receipt eligibility (folded) */}
          <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white">
            <button
              type="button"
              onClick={() => setReceiptEligibilityExpanded((prev) => !prev)}
              className="w-full flex items-center justify-between px-4 py-4 text-left"
            >
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Receipt eligibility
                </p>

                <p className="text-base font-semibold text-slate-900">
                  {receiptReviewEligible
                    ? "Weekly review complete enough for receipt evaluation"
                    : "Weekly review is due, but materials are still incomplete"}
                </p>
              </div>

              <span className="text-sm font-medium text-slate-500">
                {receiptEligibilityExpanded ? "Hide" : "View"}
              </span>
            </button>

            {receiptEligibilityExpanded && (
              <div className="border-t border-slate-200 bg-slate-50 px-4 py-4 space-y-3">
                <p className="text-sm text-slate-700">
                  Structure {receiptReviewEligible ? "meets" : "does not meet"} the minimum threshold for receipt review.
                  Receipt stays locked until the score reaches {scoring.receiptThreshold.toFixed(1)} / 4.
                </p>

                <div className="px-3 py-2 space-y-1 text-sm text-slate-800">
                  <div className="flex justify-between">
                    <span>Evidence</span>
                    <span>{scoring.evidenceScore.toFixed(1)} / 1</span>
                  </div>

                  <div className="flex justify-between">
                    <span>Structure</span>
                    <span>{scoring.structureScore.toFixed(1)} / 1</span>
                  </div>

                  <div className="flex justify-between">
                    <span>Consistency</span>
                    <span>{scoring.consistencyScore.toFixed(1)} / 1</span>
                  </div>

                  <div className="flex justify-between">
                    <span>Continuity</span>
                    <span>{scoring.continuityScore.toFixed(1)} / 1</span>
                  </div>

                  <div className="border-t border-slate-200 mt-2 pt-2 flex justify-between font-medium text-slate-900">
                    <span>Total score</span>
                    <span>{scoring.totalScore.toFixed(1)} / 4</span>
                  </div>

                  <div className="flex justify-between text-sm text-slate-700">
                    <span>Complexity</span>
                    <span>{complexityLabel}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-slate-600">
                    {complexityNote}
                  </p>

                  {receiptReviewEligible ? (
                    <p className="text-sm text-emerald-700">
                      Receipt eligibility is based on four checks: Evidence, Structure, Consistency, and Continuity.
                    </p>
                  ) : (
                    <p className="text-sm text-amber-700">
                      Receipt eligibility is based on four checks: Evidence, Structure, Consistency, and Continuity.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 🚀 CTA */}
          <div className="pt-2 grid grid-cols-1 gap-3 md:grid-cols-3">
            {hasPilotEntries ? (
              <>
                <button
                  type="button"
                  onClick={() => setShowPilotRulesModal(true)}
                  style={{
                    display: "inline-flex",
                    width: "100%",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "999px",
                    padding: "12px 24px",
                    fontSize: "14px",
                    fontWeight: 600,
                    backgroundColor: "#FFFFFF",
                    color: "#0F172A",
                    border: "1px solid #E2E8F0",
                    boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
                    cursor: "pointer",
                  }}
                >
                  View Pilot Rules
                </button>
          
                <button
                  type="button"
                  onClick={() => {
                    if (!receiptReviewEligible) return;
          
                    const routeDecision = {
                      mode: resolvedSummaryMode
                        ? "final_receipt"
                        : runtimeState.resolvedReviewMode === "case_receipt"
                        ? "case_receipt"
                        : "case_receipt",
                      reason: resolvedSummaryMode
                        ? "weekly_summary_confirmed"
                        : runtimeState.resolvedNextAction ||
                          "single_case_confirmed",
                    };

                    const receiptSource = isWeeklySummaryFlow
                      ? "pilot_weekly_summary"
                      : "pilot_case_result";

                    const receiptPageData = buildReceiptPageData(receiptSourceInput);

                    const verificationPageData = buildVerificationPageData({
                      ...receiptSourceInput,
                      eventHistory: entries,
                      routeDecision,
                      receiptSource,
                    });

                    const finalReceiptHash = createReceiptHash({
                      ...receiptSourceInput,
                      ...receiptPageData,
                      runEntries,
                      totalRunHits,
                      executionSummary,
                      generatedAt: receiptPageData.generatedAt,
                    });

                    const receiptPageDataWithHash = {
                      ...receiptPageData,
                      receiptHash: finalReceiptHash,
                    };

                    const finalEvidenceLock = {
                      receiptId: receiptPageDataWithHash.receiptId || "RCPT-DEMO-001",
                      receiptHash: finalReceiptHash,
                      receiptSource: isWeeklySummaryFlow
                        ? "pilot_weekly_summary"
                        : "pilot_case_result",
                      receiptMode: isWeeklySummaryFlow
                        ? "final_receipt"
                        : "case_receipt",
                    };

                    const sharedReceiptVerificationContract = buildReceiptContract({
                      ...receiptPageDataWithHash,

                      receiptSource,
                      receiptHash: finalReceiptHash,

                      caseData: receiptSourceInput.caseData || enhancedSourceInput.caseData || null,
                      schemaVersion:
                        receiptSourceInput.caseData?.schemaVersion ||
                        enhancedSourceInput.caseData?.schemaVersion ||
                        null,

                      structureScoreFromCase:
                        receiptSourceInput.caseData?.structureScore ??
                        enhancedSourceInput.caseData?.structureScore ??
                        null,

                      // 🔽 Descriptive-only (NOT used for eligibility gating)
                      structureMeta: {
                        structureStatusFromCase:
                          receiptSourceInput.caseData?.structureStatus ||
                          enhancedSourceInput.caseData?.structureStatus ||
                          resolvedStructureStatus ||
                          null,
                      },

                      routeDecisionFromCase:
                        receiptSourceInput.caseData?.routeDecision ||
                        enhancedSourceInput.caseData?.routeDecision ||
                        null,

                      weakestDimension:
                        resolvedWeakestDimension ||
                        receiptSourceInput.caseData?.weakestDimension ||
                        enhancedSourceInput.caseData?.weakestDimension ||
                        "",

                      behavioralGroundingSummary:
                        verificationPageData?.behavioralGroundingSummary || {
                          groundingStatus: "",
                          groundingLabel: "",
                          groundingNote: "",
                          groundingScore: null,
                        },

                      verificationTitle:
                        verificationPageData?.verificationTitle || "Structure Proof Verification",
                      introText:
                        verificationPageData?.introText ||
                        "This page shows whether the receipt, supporting structure, and final output can be checked consistently.",
                      finalNote:
                        verificationPageData?.finalNote ||
                        "Verification confirms whether the current receipt and supporting output are consistent and reviewable.",
                      backToReceiptText:
                        verificationPageData?.backToReceiptText || "Back to Decision Receipt",
                      checks: verificationPageData?.checks || [],
                      eventTimeline: verificationPageData?.eventTimeline || [],
                      overallStatus:
                        verificationPageData?.overallStatus || "Ready for Review",
                      scoringVersion: scoring.scoringVersion,
                        evidenceScore: scoring.evidenceScore,
                        structureScore: scoring.structureScore,
                        consistencyScore: scoring.consistencyScore,
                        continuityScore: scoring.continuityScore,
                        totalScore: scoring.totalScore,
                        receiptThreshold: scoring.receiptThreshold,
                        receiptEligible: scoring.receiptEligible,
                        complexityScore,
                        complexityLabel,
                        complexityNote,
                    });

                    const flattenedSharedReceiptVerificationContract =
                      flattenSharedReceiptVerificationContract(
                        sharedReceiptVerificationContract
                      );

                    const receiptState = {
                      receiptPageData: receiptPageDataWithHash,
                      verificationPageData,

                      sharedReceiptVerificationContract,
                      flattenedSharedReceiptVerificationContract,

                      routeDecision,
                      receiptSource,
                      evidenceLock: finalEvidenceLock,

                      caseData: receiptSourceInput.caseData || enhancedSourceInput.caseData || null,
                      eventHistory: entries,
                    };
          
                    recordRun({
                      receiptId: receiptPageDataWithHash.receiptId,
                      caseInput: receiptSourceInput.caseInput || "",
                      workflow: receiptSourceInput.workflow || "",
                      scenarioLabel: receiptSourceInput.scenarioLabel || "",
                      stageLabel: receiptSourceInput.stage || "",
                      runLabel: receiptSourceInput.runId || "",
                      totalEvents: executionSummary.totalEvents,
                      structuredEventsCount: executionSummary.structuredEventsCount,
                      latestEventType: executionSummary.latestEventType,
                      behaviorStatus: executionSummary.behaviorStatus,
                      receiptPageData: receiptPageDataWithHash,
                      verificationPageData,
                      routeDecision,
                      receiptSource,
                      runEntries,
                      totalRunHits,
                      primaryRunLabel,
                      runSummaryText,
                      evidenceLock: finalEvidenceLock,
                      caseData: receiptSourceInput.caseData || enhancedSourceInput.caseData || null,
                      eventHistory: entries,
                    });
          
                    localStorage.setItem(
                      "receiptPageData",
                      JSON.stringify(receiptPageDataWithHash)
                    );
                    localStorage.setItem("receiptRouteDecision", JSON.stringify(routeDecision));
                    localStorage.setItem("receiptSource", receiptSource);

                    localStorage.setItem(
                      "sharedReceiptVerificationContract",
                      JSON.stringify(sharedReceiptVerificationContract)
                    );

                    localStorage.setItem(
                      "flattenedSharedReceiptVerificationContract",
                      JSON.stringify(flattenedSharedReceiptVerificationContract)
                    );
          
                    navigate(ROUTES.RECEIPT, {
                      state: {
                        receiptPageData: receiptPageDataWithHash,
                        routeDecision: {
                          mode: isWeeklySummaryFlow ? "final_receipt" : "case_receipt",
                        },
                        receiptSource: isWeeklySummaryFlow
                          ? "pilot_weekly_summary"
                          : "pilot_case_result",
                        evidenceLock: finalEvidenceLock,
                      },
                    });
                  }}
                  style={{
                    display: "inline-flex",
                    width: "100%",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "999px",
                    padding: "12px 24px",
                    fontSize: "14px",
                    fontWeight: 600,
                    boxShadow: receiptReviewEligible
                      ? "0 4px 12px rgba(15, 23, 42, 0.08)"
                      : "none",
                    backgroundColor: receiptReviewEligible ? "#0F172A" : "#FFFFFF",
                    color: receiptReviewEligible ? "#FFFFFF" : "#dde2eb",
                    border: receiptReviewEligible ? "none" : "1px solid #E2E8F0",
                    cursor: receiptReviewEligible ? "pointer" : "not-allowed",
                  }}
                >
                  {receiptReviewEligible
                    ? "Continue to Receipt Review →"
                    : "Receipt locked"}
                </button>
          
                <button
                  type="button"
                  onClick={() => {
                    console.log("OPEN SUBSCRIPTION MODAL");
                    setShowSubscriptionModal(true);
                  }}
                  style={{
                    display: "inline-flex",
                    width: "100%",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "999px",
                    padding: "12px 24px",
                    fontSize: "14px",
                    fontWeight: 600,
                    boxShadow: "0 2px 8px rgba(15, 23, 42, 0.06)",
                    backgroundColor: "#fef6d2",
                    color: "#D97706",
                    border: "1px solid #ffeda3",
                    cursor: "pointer",
                  }}
                >
                  View Subscription Options →
                </button>
              </>
            ) : (
              <div className="text-sm text-slate-500">
                No pilot data yet. Complete at least one pilot entry first.
              </div>
            )}
          </div>

        </section>

        {showPilotRulesModal && (
          <div
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              zIndex: 99998,
              backgroundColor: "rgba(15, 23, 42, 0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px",
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: "560px",
                backgroundColor: "#FFFFFF",
                borderRadius: "24px",
                boxShadow: "0 24px 80px rgba(15, 23, 42, 0.24)",
                border: "1px solid #E2E8F0",
                padding: "20px",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  alignItems: "center",
                  columnGap: "12px",
                  marginBottom: "16px",
                }}
              >
                <h2
                  style={{
                    fontSize: "22px",
                    fontWeight: 700,
                    color: "#0F172A",
                    margin: 0,
                  }}
                >
                  Pilot access rules
                </h2>
        
                <button
                  type="button"
                  onClick={() => setShowPilotRulesModal(false)}
                  aria-label="Close"
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "999px",
                    border: "1px solid #E2E8F0",
                    backgroundColor: "#FFFFFF",
                    color: "#64748B",
                    fontSize: "20px",
                    lineHeight: 1,
                    fontWeight: 500,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                  }}
                >
                  ×
                </button>
              </div>
        
              <div
                style={{
                  display: "grid",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    border: "1px solid #A7F3D0",
                    backgroundColor: "#ECFDF5",
                    borderRadius: "16px",
                    padding: "14px 16px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: "#047857",
                      marginBottom: "6px",
                    }}
                  >
                    Event logging
                  </div>
                  <div
                    style={{
                      fontSize: "16px",
                      fontWeight: 600,
                      color: "#064E3B",
                      lineHeight: 1.5,
                    }}
                  >
                    Unlimited during the 7-day pilot window
                  </div>
                </div>
        
                <div
                  style={{
                    border: "1px solid #BAE6FD",
                    backgroundColor: "#F0F9FF",
                    borderRadius: "16px",
                    padding: "14px 16px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: "#0369A1",
                      marginBottom: "6px",
                    }}
                  >
                    Structured reviews
                  </div>
                  <div
                    style={{
                      fontSize: "16px",
                      fontWeight: 600,
                      color: "#0C4A6E",
                      lineHeight: 1.5,
                    }}
                  >
                    Up to 5 during this pilot
                  </div>
                </div>
        
                <div
                  style={{
                    border: "1px solid #FDE68A",
                    backgroundColor: "#FFFBEB",
                    borderRadius: "16px",
                    padding: "14px 16px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: "#B45309",
                      marginBottom: "6px",
                    }}
                  >
                    Receipt readiness
                  </div>

                  <div
                    style={{
                      fontSize: "14px",
                      lineHeight: 1.6,
                      color: "#92400E",
                    }}
                  >
                    The diagnostic can be revisited during the pilot window, but receipt readiness is determined by structured pilot evidence, not by repeating the diagnostic alone.
                  </div>
                </div>
                   
              </div>
            </div>
          </div>
        )} 

        {showSubscriptionModal && (
          <div
            style={{
              position: "fixed",
             top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              zIndex: 99999,
              backgroundColor: "rgba(15, 23, 42, 0.55)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px",
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: "520px",
                maxHeight: "90vh",
                overflowY: "auto",
                backgroundColor: "#ffffff",
               borderRadius: "24px",
                boxShadow: "0 24px 80px rgba(15, 23, 42, 0.28)",
                border: "1px solid #E2E8F0",
                padding: "16px",
              }}
>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  alignItems: "center",
                  columnGap: "12px",
                  marginBottom: "16px",
                  paddingLeft: "8px",
                  paddingRight: "8px",
                }}
              >
                <h2
                  style={{
                    fontSize: "22px",
                    fontWeight: 700,
                    color: "#0F172A",
                    margin: 0,
                    flex: 1,
                  }}
                >
                  Choose how to continue
                </h2>
        
                <button
                  type="button"
                  onClick={() => setShowSubscriptionModal(false)}
                  aria-label="Close"
                  style={{
                    width: "32px",
                    height: "32px",
                    flexShrink: 0,
                    borderRadius: "999px",
                    border: "1px solid #E2E8F0",
                    backgroundColor: "#FFFFFF",
                    color: "#64748B",
                    fontSize: "20px",
                    lineHeight: 1,
                    fontWeight: 500,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                  }}
                >
                  ×
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: "12px",
                  justifyItems: "center",
                  paddingLeft: "8px",
                  paddingRight: "8px",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    maxWidth: "460px",
                    border: "1px solid #E2E8F0",
                    borderRadius: "16px",
                    padding: "16px",
                    backgroundColor: "#FFFFFF",
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#0F172A" }}>
                    Formal Decision Output
                  </h3>

                  <p style={{ margin: "8px 0 0 0", fontSize: "14px", lineHeight: 1.6, color: "#475569" }}>
                    One structured decision output for one specific case.
                  </p>

                  <p style={{ fontSize: "20px", fontWeight: 700 }}>
                    $29
                  </p>

                  <p style={{ fontSize: "13px", color: "#94A3B8", textDecoration: "line-through" }}>
                    $49 original
                  </p>

                  <p style={{ marginTop: "4px", fontSize: "12px", fontWeight: 600, color: "#969aa4" }}>
                    Pilot continuation pricing available within 3 days
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      setShowSubscriptionModal(false);
                    }}
                    style={{
                      marginTop: "12px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "auto",
                      minWidth: "200px",
                      padding: "10px 20px",
                      borderRadius: "999px",
                      backgroundColor: "#FEF2F2",
                      color: "#DC2626",
                      border: "1px solid #FECACA",
                      fontSize: "14px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Activate Formal Verification →
                  </button>
                </div>
        
                <div
                  style={{
                    width: "100%",
                    maxWidth: "460px",
                    border: "1px solid #E2E8F0",
                    borderRadius: "16px",
                    padding: "16px",
                    backgroundColor: "#FFFFFF",
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#0F172A" }}>
                    Weekly Decision Access
                  </h3>

                  <p style={{ margin: "8px 0 0 0", fontSize: "14px", lineHeight: 1.6, color: "#475569" }}>
                    Structured handling for multiple live decision events across one active week — not just one case.
                  </p>

                  <p style={{ fontSize: "20px", fontWeight: 700 }}>
                    $149 / week
                  </p>

                  <p style={{ fontSize: "13px", color: "#94A3B8", textDecoration: "line-through" }}>
                    $199 original
                  </p>

                  <p style={{ marginTop: "4px", fontSize: "12px", fontWeight: 600, color: "#969aa4" }}>
                    Pilot continuation pricing available within 3 days
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      setShowSubscriptionModal(false);
                    }}
                    style={{
                      marginTop: "12px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "auto",
                      minWidth: "200px",
                      padding: "10px 20px",
                      borderRadius: "999px",
                      backgroundColor: "#FEF6D2",
                      color: "#D97706",
                      border: "1px solid #ffe98f",
                      fontSize: "14px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Get Weekly Access →
                  </button>
                </div>
        
                <div
                  style={{
                    width: "100%",
                    maxWidth: "460px",
                    border: "1px solid #E2E8F0",
                    borderRadius: "16px",
                    padding: "16px",
                    backgroundColor: "#FFFFFF",
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#0F172A" }}>
                    Monthly Judgment Access
                  </h3>

                  <p style={{ margin: "8px 0 0 0", fontSize: "14px", lineHeight: 1.6, color: "#475569" }}>
                    Monthly access to process multiple cases across different scenarios using a structured decision approach.
                  </p>

                  <p style={{ fontSize: "20px", fontWeight: 700 }}>
                    $499 / month
                  </p>

                  <p style={{ fontSize: "13px", color: "#94A3B8", textDecoration: "line-through" }}>
                    $699 original
                  </p>

                  <p style={{ marginTop: "4px", fontSize: "12px", fontWeight: 600, color: "#969aa4" }}>
                    Pilot continuation pricing available within 3 days
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      setShowSubscriptionModal(false);
                    }}
                    style={{
                      marginTop: "16px",

                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",

                      width: "auto",
                      minWidth: "220px",

                      padding: "10px 20px",

                      borderRadius: "999px",

                      backgroundColor: "#ECFDF5",
                      color: "#059669",
                      border: "1px solid #A7F3D0",

                      fontSize: "14px",
                      fontWeight: 600,

                      cursor: "pointer",
                    }}
                  >
                    Get Monthly Access →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}