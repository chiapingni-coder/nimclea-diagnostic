import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { buildReceiptPageData } from "../buildReceiptPageData";
import { buildVerificationPageData } from "../buildVerificationPageData";
import ROUTES from "../routes";
import { logEvent } from "../utils/eventLogger";
import { getPilotEntries } from "../utils/pilotEntries";
import { evaluatePilotCombinationStatus } from "../utils/verificationStatus";
import { recordRun } from "./runLedger";

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
  return {
    runId:
      entry.runId ||
      entry.runLabel ||
      fallback.runId ||
      fallback.runLabel ||
      "RUN000",
    runLabel:
      entry.runLabel ||
      entry.runId ||
      fallback.runLabel ||
      fallback.runId ||
      "RUN000",
    stageLabel:
      entry.stageLabel ||
      entry.stage ||
      fallback.stageLabel ||
      fallback.stage ||
      "",
    scenarioLabel:
      entry.scenarioLabel ||
      entry.scenario ||
      fallback.scenarioLabel ||
      "",
    confidenceLabel:
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
  return entries[entries.length - 1]?.eventType || "other";
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

function getWeakestDimensionExplanation(weakestDimension, eventType) {
  const eventLabelMap = {
    decision_suggested: "Someone suggested a decision for you.",
    decision_override_attempt: "Someone tried to decide on your behalf.",
    resource_control_request: "A resource, money, or control request appeared.",
    high_pressure_decision: "You were pushed toward a fast decision.",
    role_boundary_blur: "Roles or responsibilities became unclear.",
    other: "A structurally unclear event occurred.",
  };

  const baseEvent = eventLabelMap[eventType] || "A real workflow event occurred.";

  const explanationMap = {
    authority: `${baseEvent} The main risk is not the event itself, but that authority is weak enough for the event to reshape your decision space.`,
    boundary: `${baseEvent} The event became risky because structural boundaries were too weak to hold role clarity or responsibility.`,
    evidence: `${baseEvent} The event became risky because the evidence path is too weak to make the situation traceable and defensible.`,
    coordination: `${baseEvent} The event became risky because coordination is weak, so execution can drift or fragment.`,
  };

  return (
    explanationMap[weakestDimension] ||
    `${baseEvent} This is currently being interpreted at the event layer, not yet through a dominant structural weakness.`
  );
}

function getNextStructuralMove(weakestDimension, firstGuidedAction) {
  if (firstGuidedAction) return firstGuidedAction;

  const moveMap = {
    authority: "Clarify who has decision ownership before the next action moves forward.",
    boundary: "Restore one boundary of role, responsibility, or approval before expanding the workflow.",
    evidence: "Create one traceable record so the next decision can be reviewed and defended.",
    coordination: "Reduce ambiguity by assigning one owner and one next operational step.",
  };

  return (
    moveMap[weakestDimension] ||
    "Take the next step that makes the workflow easier to explain, verify, and defend."
  );
}

function buildExecutionSummary(entries = [], weakestDimension = "", firstGuidedAction = "") {
  const safeEntries = Array.isArray(entries) ? entries : [];
  const totalEvents = safeEntries.length;

  const structuredEvents = safeEntries.filter((entry) => {
    const hasDescription = String(entry?.description || "").trim().length > 0;
    const hasEventType = String(entry?.eventType || "").trim().length > 0;
    const hasPressure = String(entry?.externalPressure || "").trim().length > 0;
    const hasBoundary = String(entry?.authorityBoundary || "").trim().length > 0;
    const hasDependency = String(entry?.dependency || "").trim().length > 0;

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

  return {
    totalEvents,
    structuredEventsCount: structuredEvents.length,
    latestEventType: latestEntry?.eventType || "other",
    latestEventLabel:
      latestEventLabelMap[latestEntry?.eventType] || "Structural event recorded",
    latestEventDescription: latestEntry?.description || "",
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

function buildSourceInputFromState(locationState = {}) {
  const preview = locationState?.preview || null;
  const sourceInput = locationState?.sourceInput || null;
  const pilotSetup = locationState?.pilot_setup || null;
  const pilotResult = locationState?.pilot_result || null;
  const caseInput =
    locationState?.caseInput ||
    pilotSetup?.caseInput ||
    pilotResult?.caseInput ||
    "";

  const upstream = sourceInput || preview || {};
  const extraction = upstream?.extraction || {};
  const resultSeed = upstream?.resultSeed || upstream?.extraction || {};

  const strongestSignal = Array.isArray(upstream?.top_signals)
    ? upstream.top_signals[0]
    : null;

return {
  weakestDimension:
    locationState?.weakestDimension ||
    pilotResult?.judgmentFocus ||
    locationState?.latest_pilot_entry?.judgmentFocus ||
    "",

  judgmentFocus:
    pilotResult?.judgmentFocus ||
    locationState?.latest_pilot_entry?.judgmentFocus ||
    locationState?.weakestDimension ||
    "event_based",

  resolvedBy:
    pilotResult?.resolvedBy ||
    pilotSetup?.resolvedBy ||
    (locationState?.weakestDimension ? "weakest_dimension" : "event_type"),

  firstGuidedAction:
    locationState?.firstGuidedAction ||
    pilotResult?.firstGuidedAction ||
    "",

  firstStepLabel:
    locationState?.firstStepLabel ||
    pilotResult?.firstStepLabel ||
    "",

  runId:
    pilotResult?.runId ||
    extraction?.runCode ||
    resultSeed?.runCode ||
    upstream?.run_id ||
    upstream?.anchor_run ||
    "RUN000",

  pattern:
    pilotResult?.pattern ||
    extraction?.patternCode ||
    resultSeed?.patternCode ||
    upstream?.pattern ||
    upstream?.pattern_id ||
    "PAT-00",

  patternLabel:
    pilotResult?.patternLabel ||
    pilotSetup?.resolvedPatternLabel ||
    "Unresolved Pattern",

  structureStatus:
    locationState?.routeMeta?.structureStatus ||
    pilotResult?.structureStatus ||
    null,

  summaryMode:
    pilotResult?.summaryMode === true,

  stage:
    pilotResult?.stage ||
    extraction?.stageCode ||
    resultSeed?.stageCode ||
    upstream?.stage ||
    "S0",

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
    pilotResult?.scenarioLabel ||
    (preview?.scenario?.label &&
    preview?.scenario?.label !== "No Dominant Scenario"
      ? preview.scenario.label
      : null) ||
    SCENARIO_LABEL_MAP[extraction?.scenarioKey] ||
    SCENARIO_LABEL_MAP[resultSeed?.scenarioKey] ||
    "No Dominant Scenario",

  scenarioCode:
    pilotResult?.scenarioCode ||
    extraction?.scenarioKey ||
    resultSeed?.scenarioKey ||
    upstream?.scenario?.code ||
    "unknown_scenario",

  summaryText:
    pilotResult?.summaryText ||
    upstream?.summary?.[0] ||
    resultSeed?.summary ||
    "No structured summary available.",

  caseInput:
    caseInput ||
    pilotSetup?.description ||
    pilotResult?.summaryText ||
    "",
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
  const [selectedPlan, setSelectedPlan] = useState("");

  const passedPilotEntries =
    location.state?.pilot_entries ||
    getPilotEntries();

  const [forceWeeklySummary, setForceWeeklySummary] = useState(false);
  const [weeklySummaryExpanded, setWeeklySummaryExpanded] = useState(false);
  const [structuralTraceExpanded, setStructuralTraceExpanded] = useState(false);
  const [receiptEligibilityExpanded, setReceiptEligibilityExpanded] = useState(false);
  const [showJudgmentAngle, setShowJudgmentAngle] = useState(false);

  const pilotFlow = useMemo(() => {
    const entries = Array.isArray(passedPilotEntries) ? passedPilotEntries : [];
    const entryCount = entries.length;

    const hasExplanation = entries.some(
      (item) => String(item.description || "").trim().length > 0
    );

    const hasEvidenceReady = entries.some((item) =>
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
  }, [passedPilotEntries, forceWeeklySummary]);

  const weeklySummaryText = useMemo(() => {
    const entries = Array.isArray(passedPilotEntries) ? passedPilotEntries : [];

    if (!entries.length) {
      return "No pilot entries were recorded during this window.";
    }

    const workflow =
      entries[0]?.workflow || sourceInput.workflow || "Selected workflow";

    const dominantEvent =
      entries[entries.length - 1]?.eventType || "other";

    const lastDescription =
      entries[entries.length - 1]?.description ||
      sourceInput.summaryText ||
      "No detailed description recorded.";

    return `7-day summary for ${workflow}. ${entries.length} pilot entr${entries.length > 1 ? "ies were" : "y was"} recorded. Dominant event: ${dominantEvent}. Latest observed context: ${lastDescription}`;
  }, [passedPilotEntries, sourceInput.workflow, sourceInput.summaryText]);

  const entries = Array.isArray(passedPilotEntries) ? passedPilotEntries : [];

  const currentEventType = getCurrentEventType(entries);
  const currentEventLabel = getEventLabel(currentEventType);

  const weakestDimensionExplanation = getWeakestDimensionExplanation(
    sourceInput.weakestDimension,
    currentEventType
  );

  const nextStructuralMove = getNextStructuralMove(
    sourceInput.weakestDimension,
    sourceInput.firstGuidedAction
  );

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

const executionSummary = useMemo(() => {
  return buildExecutionSummary(
    entries,
    sourceInput.weakestDimension,
    sourceInput.firstGuidedAction
  );
}, [entries, sourceInput.weakestDimension, sourceInput.firstGuidedAction]);

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
const canShowProgressSummary = hasPilotEntries;

const weeklySummaryDue = hasSevenDayWindowElapsed(entries, location.state || {});
  useEffect(() => {
    if (weeklySummaryDue) {
      setForceWeeklySummary(true);
    }
  }, [weeklySummaryDue]);

const score = combinationStatus.score ?? 0;
const caseReceiptEligible =
  hasPilotEntries && combinationStatus.receiptEligible;

const weeklyReceiptEligible =
  weeklySummaryDue && combinationStatus.finalReceiptEligible;

const isWeeklySummaryFlow = forceWeeklySummary === true;
const isCaseReceiptFlow =
  !isWeeklySummaryFlow && caseReceiptEligible;
const receiptReviewEligible = isWeeklySummaryFlow
  ? weeklyReceiptEligible
  : caseReceiptEligible;
const resolvedSummaryMode = isWeeklySummaryFlow;

const resolvedStructureStatus = combinationStatus.structureStatus;
  const resolvedCaseInput = sourceInput.caseInput || "";

  const resolvedSummaryText =
    sourceInput.summaryText || "No structured summary available.";

const enhancedSourceInput = {
  ...sourceInput,
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
  structureCompleteness: combinationStatus.structureCompleteness,
  evidenceSupport: combinationStatus.evidenceSupport,
  score: combinationStatus.score,
  receiptEligible: receiptReviewEligible,
};

const receiptSourceInput = isWeeklySummaryFlow
  ? {
      ...enhancedSourceInput,
      summaryMode: true,
      structureStatus: weeklyReceiptEligible ? "ready" : "weak",
      caseInput: weeklySummaryText,
      summaryText: weeklySummaryText,
    }
  : enhancedSourceInput;

  const rawReceipt = buildReceiptPageData(receiptSourceInput);
  const verificationPageData = buildVerificationPageData(rawReceipt);

  const receiptPageData = {
    receiptTitle: "Decision Receipt",
    receiptId: rawReceipt.receipt_id,
    generatedAt: new Date(rawReceipt.timestamp).toLocaleString(),
    caseInput: receiptSourceInput.caseInput || "",
    summaryTitle: receiptSourceInput.summaryMode ? "Pilot Final Summary" : "Decision Summary",
    summaryText: receiptSourceInput.summaryText || rawReceipt.decision,
    scenarioLabel: receiptSourceInput.scenarioLabel || receiptSourceInput.pattern,
    stageLabel: receiptSourceInput.stage || rawReceipt.summary?.stage || "S0",
    runLabel: primaryRunLabel,
    runEntries,
    totalRunHits,
    primaryRunLabel,
    runSummaryText,
    executionSummary,

    topSignals: (enhancedSourceInput.signals || []).map(
      (signal) => `${signal.label}: ${signal.value}`
    ),

    nextStepTitle: "Recommended Next Step",
    nextStepText:
     nextStructuralMove ||
      enhancedSourceInput.decision ||
      "Move into verification and confirm the receipt structure is complete and traceable.",

    decisionStatus: isWeeklySummaryFlow
      ? weeklyReceiptEligible
        ? "Final Receipt Ready"
        : "Summary Generated (Receipt Pending)"
      : "Ready for Verification",

    confidenceLabel: "High",
    receiptNote:
      "This receipt is now grounded in both structural aggregation and recorded pilot behavior. It is not a legal determination.",
    verificationCtaText: "Go to Verification",
  };

const routeDecision = {
  mode: isWeeklySummaryFlow ? "final_receipt" : "case_receipt",
  reason: isWeeklySummaryFlow
    ? "weekly_summary_confirmed"
    : "single_case_confirmed",
};

const receiptSource = isWeeklySummaryFlow
  ? "pilot_weekly_summary"
  : "pilot_case_result";

const evidenceLock = {
  receiptId: receiptPageData.receiptId,
  receiptHash: "",
  receiptSource,
  receiptMode: routeDecision.mode,
};

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
              : sourceInput.weakestDimension
              ? `This event is first interpreted through your weakest dimension: ${sourceInput.weakestDimension}.`
              : "This page explains how the current event is being interpreted structurally."}
          </p>
        </header>

        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">

          {/* 🧠 Layer 1: First Judgment Angle */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: "16px",
            }}
          >
            <div className="rounded-xl bg-white border border-slate-200 p-4">
              <p className="text-slate-500">Weakest dimension</p>
              <p className="text-slate-900">
                {sourceInput.weakestDimension || "Not specified"}
              </p>
            </div>

            <div className="rounded-xl bg-white border border-slate-200 p-4">
              <p className="text-slate-500">Current event</p>
              <p className="text-slate-900">
                {currentEventLabel}
              </p>
            </div>

            <div className="rounded-xl bg-white border border-slate-200 p-4">
              <p className="text-slate-500">Judgment angle</p>
              <p className="text-slate-900">
                {sourceInput.resolvedBy === "event_type"
                  ? "Event-based interpretation"
                  : `Interpreted through weakest dimension: ${sourceInput.weakestDimension}`}
              </p>
            </div>

            <div className="rounded-xl bg-white border border-slate-200 p-4">
              <p className="text-slate-500">First guided action</p>
              <p className="text-slate-900">
                {sourceInput.firstGuidedAction ||
                  sourceInput.firstStepLabel ||
                  "Take the first structural corrective move."}
              </p>
            </div>
          </div>

          {/* 🧠 Layer 2: State & Conclusion */}
          <div className="space-y-6">

            <div className="flex gap-4 mb-2 items-start">

              <div
                className="flex-1 rounded-xl p-4"
                style={
                  enhancedSourceInput.structureStatus === "ready"
                    ? {
                        backgroundColor: "#DCFCE7",
                        border: "1px solid #86EFAC",
                      }
                    : enhancedSourceInput.structureStatus === "building"
                    ? {
                        backgroundColor: "#FEF9C3",
                        border: "1px solid #FDE68A",
                      }
                    : enhancedSourceInput.structureStatus === "weak"
                    ? {
                        backgroundColor: "#FEE2E2",
                        border: "1px solid #FCA5A5",
                      }
                    : {
                        backgroundColor: "#F8FAFC",
                        border: "1px solid #E2E8F0",
                      }
                }
              >
                <p className="text-sm text-slate-500">Structure status</p>
                <p className="text-base font-semibold text-slate-900">
                  <span
                    style={
                      enhancedSourceInput.structureStatus === "ready"
                        ? {
                            backgroundColor: "#DCFCE7",
                            color: "#15803D",
                            borderRadius: "8px",
                            padding: "4px 10px",
                            display: "inline-block",
                            fontSize: "14px",
                            fontWeight: 600,
                          }
                        : enhancedSourceInput.structureStatus === "building"
                        ? {
                            backgroundColor: "#FEF9C3",
                            color: "#A16207",
                            borderRadius: "8px",
                            padding: "4px 10px",
                            display: "inline-block",
                            fontSize: "14px",
                            fontWeight: 600,
                          }
                        : enhancedSourceInput.structureStatus === "weak"
                        ? {
                            backgroundColor: "#FEE2E2",
                            color: "#B91C1C",
                            borderRadius: "8px",
                            padding: "4px 10px",
                            display: "inline-block",
                            fontSize: "14px",
                            fontWeight: 600,
                          }
                        : {
                            backgroundColor: "#F1F5F9",
                            color: "#475569",
                            borderRadius: "8px",
                            padding: "4px 10px",
                            display: "inline-block",
                            fontSize: "14px",
                            fontWeight: 600,
                          }
                    }
                  >
                    {enhancedSourceInput.structureStatus === "ready"
                      ? "Ready"
                      : enhancedSourceInput.structureStatus === "building"
                      ? "Building"
                      : enhancedSourceInput.structureStatus === "weak"
                      ? "Weak"
                      : "Not set"}
                  </span>
                </p>
              </div>

              <div className="flex-1 rounded-xl bg-slate-50 border border-slate-200 p-4">
                <p className="text-sm text-slate-500">Summary mode</p>
                <p className="text-base font-semibold text-slate-900">
                  {enhancedSourceInput.summaryMode
                    ? "Weekly summary active"
                    : "Case interpretation mode"}
                </p>
              </div>

              <div
                style={{
                  marginLeft: "auto",
                  width: "100%",
                  maxWidth: "405px",
                  backgroundColor: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: "16px",
                  padding: "16px",
                }}
              >
                <div
                 style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "12px",
                    marginBottom: "12px",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      margin: 0,
                      fontSize: "14px",
                      color: "#64748B",
                    }}
                  >
                    Combination judgment
                  </p>

                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#0F172A",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Score: {combinationStatus.score.toFixed(1)} / 4
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: "8px",
                    fontSize: "14px",
                  }}
                >
                  <div className="rounded-lg bg-white border border-slate-200 px-3 py-3">
                    Continuity: {combinationStatus.continuity}
                  </div>
                  <div className="rounded-lg bg-white border border-slate-200 px-3 py-3">
                    Consistency: {combinationStatus.consistency}
                  </div>
                  <div className="rounded-lg bg-white border border-slate-200 px-3 py-3">
                    Structure: {combinationStatus.structureCompleteness}
                  </div>
                  <div className="rounded-lg bg-white border border-slate-200 px-3 py-3">
                    Evidence: {combinationStatus.evidenceSupport}
                  </div>
                </div>
              </div>

            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Why this event matters structurally</p>

              <p className="text-base font-semibold text-slate-900">
                {weakestDimensionExplanation}
              </p>

              <div className="mt-4 rounded-xl border border-slate-200 bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowJudgmentAngle((prev) => !prev)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left"
                >
                  <p className="text-sm text-slate-500">
                    First judgment angle
                  </p>

                  <span className="text-sm text-slate-500">
                    {showJudgmentAngle ? "Hide" : "View"}
                  </span>
                </button>

                {showJudgmentAngle && (
                  <div className="px-4 pb-4">
                    <p className="text-sm leading-6 text-slate-700">
                      {sourceInput.weakestDimension ? (
                        <>
                          {`This event is first interpreted through your weakest dimension: ${sourceInput.weakestDimension}.`}
                          <br />
                          <span className="font-medium text-slate-800">
                            Which means: this situation is not just happening to you — your structure is allowing it.
                          </span>
                        </>
                      ) : (
                        "This event is currently being interpreted from the event layer."
                      )}
                    </p>
                  </div>
                )}
              </div>

              {(enhancedSourceInput.caseInput || enhancedSourceInput.summaryText) && (
                <div className="mt-4">
                  <p className="text-sm text-slate-500">Observed context</p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">
                    {enhancedSourceInput.caseInput ||
                      enhancedSourceInput.summaryText ||
                      "No case attached"}
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
              <p className="text-sm text-emerald-700">Next structural move</p>
              <p className="text-base font-semibold text-emerald-900">
                {nextStructuralMove}
              </p>
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
                    ? "Eligible for receipt review"
                    : "Not yet eligible"}
                </p>
              </div>

              <span className="text-sm font-medium text-slate-500">
                {receiptEligibilityExpanded ? "Hide" : "View"}
              </span>
            </button>

            {receiptEligibilityExpanded && (
              <div className="border-t border-slate-200 bg-slate-50 px-4 py-4 space-y-2">
                <p className="text-sm text-slate-700">
                  Structure {receiptReviewEligible ? "meets" : "does not meet"} the minimum threshold for receipt review.
                </p>

                <p className="text-sm text-slate-700">
                  Score: {score.toFixed(1)} / 4 (≥ 3.5 required)
                </p>

                {!receiptReviewEligible && (
                  <p className="text-sm text-amber-700">
                    Improve structure completeness or evidence support to unlock receipt review.
                  </p>
                )}
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
          
                    const receiptState = {
                      receiptPageData,
                      verificationPageData,
                      routeDecision,
                      receiptSource,
                      evidenceLock,
                    };
          
                    recordRun({
                      receiptId: receiptPageData.receiptId,
                      caseInput: receiptSourceInput.caseInput || "",
                      workflow: receiptSourceInput.workflow || "",
                      scenarioLabel: receiptSourceInput.scenarioLabel || "",
                      stageLabel: receiptSourceInput.stage || "",
                      runLabel: receiptSourceInput.runId || "",
                      totalEvents: executionSummary.totalEvents,
                      structuredEventsCount: executionSummary.structuredEventsCount,
                      latestEventType: executionSummary.latestEventType,
                      behaviorStatus: executionSummary.behaviorStatus,
                      receiptPageData,
                      verificationPageData,
                      routeDecision,
                      receiptSource,
                      runEntries,
                      totalRunHits,
                      primaryRunLabel,
                      runSummaryText,
                      evidenceLock,
                    });
          
                    localStorage.setItem("receiptPageData", JSON.stringify(receiptPageData));
                    localStorage.setItem("receiptRouteDecision", JSON.stringify(routeDecision));
                    localStorage.setItem("receiptSource", receiptSource);
          
                    navigate(ROUTES.RECEIPT, {
                      state: receiptState,
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
                    : "Not ready for receipt →"}
                </button>
          
                <button
                  type="button"
                  onClick={() => {
                    console.log("OPEN SUBSCRIPTION MODAL");
                    setShowSubscriptionModal(true);
                    setSelectedPlan("Modal opened");
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
                      setSelectedPlan("Formal Decision Review");
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
                      setSelectedPlan("Weekly Decision Support");
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
                      setSelectedPlan("Monthly Judgment Support");
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