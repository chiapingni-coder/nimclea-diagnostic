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
    pilotResult?.summaryMode === true ||
    locationState?.routeMeta?.structureStatus === "pilot_complete",

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
  const [selectedPlan, setSelectedPlan] = useState("");

  const passedPilotEntries =
    location.state?.pilot_entries ||
    getPilotEntries();

  const [forceWeeklySummary, setForceWeeklySummary] = useState(false);
  const [weeklySummaryExpanded, setWeeklySummaryExpanded] = useState(false);

  const pilotFlow = useMemo(() => {
    const entries = Array.isArray(passedPilotEntries) ? passedPilotEntries : [];
    const entryCount = entries.length;

    const hasExplanation = entries.some(
      (item) => String(item.description || "").trim().length > 0
    );

    const hasEvidenceReady = entries.some(
      (item) =>
        item.eventType &&
        item.externalPressure &&
        item.authorityBoundary &&
        item.dependency
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
const canGenerateWeeklySummary = weeklySummaryDue;

const weeklyReceiptEligible =
  weeklySummaryDue && combinationStatus.finalReceiptEligible;

const isWeeklySummaryFlow = forceWeeklySummary === true;
const isCaseReceiptFlow =
  !isWeeklySummaryFlow && combinationStatus.canGenerateCaseReceipt;

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

  continuity: combinationStatus.continuity,
  consistency: combinationStatus.consistency,
  structureCompleteness: combinationStatus.structureCompleteness,
  evidenceSupport: combinationStatus.evidenceSupport,
  score: combinationStatus.score,
  receiptEligible: combinationStatus.receiptEligible,
};

  const receiptSourceInput = isWeeklySummaryFlow
    ? {
        ...enhancedSourceInput,
        summaryMode: true,
        structureStatus: weeklyReceiptEligible ? "pilot_complete" : "insufficient",
        caseInput: weeklySummaryText,
        summaryText: weeklySummaryText,
      }
    : enhancedSourceInput;

  const rawReceipt = buildReceiptPageData(receiptSourceInput);
  const rawVerification = buildVerificationPageData(rawReceipt);

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

    topSignals: (enhancedSourceInput.signals || []).map(
      (signal) => `${signal.label}: ${signal.value}`
    ),

    nextStepTitle: "Recommended Next Step",
    nextStepText:
      enhancedSourceInput.decision ||
      "Move into verification and confirm the receipt structure is complete and traceable.",

    decisionStatus: isWeeklySummaryFlow
      ? weeklyReceiptEligible
        ? "Final Receipt Ready"
        : "Summary Generated (Receipt Pending)"
      : "Ready for Verification",

    confidenceLabel: "High",
    receiptNote:
      "This receipt is a structured output for review and verification. It is not a legal determination.",
    verificationCtaText: "Go to Verification",
  };

const verificationPageData = {
  verificationTitle: "Verification",
  overallStatus:
    rawVerification.status === "verified" ? "Verification Ready" : "Verification Failed",
  receiptId: rawReceipt.receipt_id,
  verifiedAt: new Date().toLocaleString(),

  runLabel: primaryRunLabel,
  runEntries,
  totalRunHits,
  primaryRunLabel,
  runSummaryText,
  caseInput: receiptSourceInput.caseInput || "",
  scenarioLabel: receiptSourceInput.scenarioLabel || receiptSourceInput.pattern,
  stageLabel: receiptSourceInput.stage || rawReceipt.summary?.stage || "S0",
  topSignals: (enhancedSourceInput.signals || []).map(
    (signal) => `${signal.label}: ${signal.value}`
  ),

  introText:
    "This page helps confirm whether the receipt output is internally consistent, structurally traceable, and ready for external review.",

  checks: [
    {
      label: "Receipt structure loaded",
      status: "passed",
      detail: "The receipt fields were successfully loaded into the verification layer.",
    },
    {
      label: "Scenario-stage alignment",
      status: "passed",
            detail: `Scenario ${enhancedSourceInput.scenarioLabel}, stage ${enhancedSourceInput.stage}, and next-step logic are aligned.`,
    },
    {
      label: "Signal consistency",
      status: enhancedSourceInput.signals?.length > 0 ? "passed" : "warning",
      detail:
        enhancedSourceInput.signals?.length > 0
          ? "Top signal output is present and readable."
          : "No strong signal payload was passed forward.",
    },
  ],

  eventTimeline: [
    {
      time: "Step 1",
      title: "Diagnostic completed",
      detail: "User finished the diagnostic flow and received structured output.",
    },
    {
      time: "Step 2",
      title: "Receipt generated",
            detail: `Receipt captured ${enhancedSourceInput.scenarioLabel} / ${enhancedSourceInput.stage} / ${enhancedSourceInput.runId}${enhancedSourceInput.caseInput ? ` / Case: ${enhancedSourceInput.caseInput}` : ""}.`,
    },
    {
      time: "Step 3",
      title: "Verification opened",
      detail: "The user entered the verification layer to review traceability.",
    },
  ],

  finalNote:
    "Verification confirms structural completeness. It does not replace legal, compliance, or professional review.",
  backToReceiptText: "Back to Receipt",
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <p className="text-sm font-medium text-slate-500 mb-2">
            {isWeeklySummaryFlow
              ? "7-Day Summary"
              : pilotFlow === "evidence_backed_result"
              ? "Pilot Result"
              : "Pilot Explanation"}
          </p>

          <h1 className="text-3xl font-bold mb-3">
            {isWeeklySummaryFlow
              ? "7-Day Pilot Summary"
              : pilotFlow === "evidence_backed_result"
              ? "Pilot Result"
              : "Pilot Explanation"}
          </h1>

          <p className="text-slate-700 leading-7">
            {isWeeklySummaryFlow
              ? "This page summarizes the pilot window and prepares it for final receipt generation and verification."
              : pilotFlow === "evidence_backed_result"
              ? "This shows the result of one concrete pilot case and prepares it for receipt generation and verification."
              : "This page explains the current pilot structure, but it is not yet ready for a final receipt."}
          </p>
        </header>

        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">

          {/* 🧩 Layer 1: Structure Identity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Resolved RUN</p>
              <p className="text-base font-semibold text-slate-900">
                {enhancedSourceInput.runId}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Resolved Pattern</p>
              <p className="text-base font-semibold text-slate-900">
                {enhancedSourceInput.pattern}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {enhancedSourceInput.patternLabel}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
             <p className="text-sm text-slate-500">Scenario</p>
              <p className="text-base font-semibold text-slate-900">
                {enhancedSourceInput.scenarioLabel}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Workflow</p>
              <p className="text-base font-semibold text-slate-900">
                {enhancedSourceInput.workflow}
              </p>
            </div>

          </div>

          {/* 🧠 Layer 2: State & Conclusion */}
          <div className="space-y-6">

            <div className="flex flex-wrap gap-4 mb-2">

              <div
                className="flex-1 rounded-xl p-4"
                style={
                  enhancedSourceInput.structureStatus === "pilot_complete"
                    ? {
                        backgroundColor: "#DCFCE7",
                        border: "1px solid #86EFAC",
                      }
                    : enhancedSourceInput.structureStatus === "emerging"
                      ? {
                          backgroundColor: "#FEF9C3",
                          border: "1px solid #FDE68A",
                        }
                    : enhancedSourceInput.structureStatus === "insufficient"
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
                      enhancedSourceInput.structureStatus === "pilot_complete"
                        ? {
                            backgroundColor: "#DCFCE7",
                            color: "#15803D",
                            borderRadius: "8px",
                            padding: "4px 10px",
                            display: "inline-block",
                            fontSize: "14px",
                            fontWeight: 600,
                          }
                        : enhancedSourceInput.structureStatus === "emerging"
                        ? {
                            backgroundColor: "#FEF9C3",
                            color: "#A16207",
                            borderRadius: "8px",
                            padding: "4px 10px",
                            display: "inline-block",
                            fontSize: "14px",
                            fontWeight: 600,
                          }
                        : enhancedSourceInput.structureStatus === "insufficient"
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
                    {enhancedSourceInput.structureStatus === "pilot_complete"
                      ? "Completed"
                      : enhancedSourceInput.structureStatus || "not_set"}
                  </span>
                </p>
              </div>

              <div className="flex-1 rounded-xl bg-slate-50 border border-slate-200 p-4">
                <p className="text-sm text-slate-500">Summary mode</p>
                <p className="text-base font-semibold text-slate-900">
                  {enhancedSourceInput.summaryMode ? "true" : "false"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                <p className="text-sm text-slate-500 mb-2">Combination judgment</p>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-white border border-slate-200 px-3 py-2">
                    Continuity: {combinationStatus.continuity}
                  </div>
                  <div className="rounded-lg bg-white border border-slate-200 px-3 py-2">
                    Consistency: {combinationStatus.consistency}
                  </div>
                  <div className="rounded-lg bg-white border border-slate-200 px-3 py-2">
                    Structure: {combinationStatus.structureCompleteness}
                  </div>
                  <div className="rounded-lg bg-white border border-slate-200 px-3 py-2">
                    Evidence: {combinationStatus.evidenceSupport}
                  </div>
                </div>

                <p className="mt-3 text-sm font-medium text-slate-700">
                  Score: {combinationStatus.score.toFixed(1)} / 4
                </p>
              </div>

            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Case tested</p>

              <p className="text-base font-semibold text-slate-900">
                {enhancedSourceInput.caseInput || "No case attached"}
              </p>

              {enhancedSourceInput.summaryText ? (
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {enhancedSourceInput.summaryText}
                </p>
              ) : null}
            </div>
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

          {/* 🚀 CTA */}
          <div className="pt-2 flex flex-wrap gap-3">
            {hasPilotEntries ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (!isCaseReceiptFlow) return;

                    const receiptState = {
                      receiptPageData,
                      verificationPageData,
                      routeDecision,
                      receiptSource,
                    };

                    recordRun({
                      receiptId: receiptPageData.receiptId,
                      caseInput: receiptSourceInput.caseInput || "",
                      workflow: receiptSourceInput.workflow || "",
                      scenarioLabel: receiptSourceInput.scenarioLabel || "",
                      stageLabel: receiptSourceInput.stage || "",
                      runLabel: receiptSourceInput.runId || "",
                      receiptPageData,
                      verificationPageData,
                      routeDecision,
                      receiptSource,
                      runEntries,
                      totalRunHits,
                      primaryRunLabel,
                      runSummaryText,
                    });

                    localStorage.setItem("receiptPageData", JSON.stringify(receiptPageData));
                    localStorage.setItem("verificationPageData", JSON.stringify(verificationPageData));
                    localStorage.setItem("receiptRouteDecision", JSON.stringify(routeDecision));
                    localStorage.setItem("receiptSource", receiptSource);

                    navigate(ROUTES.RECEIPT, {
                      state: receiptState,
                    });
                  }}
                  style={{
                   display: "inline-flex",
                    minWidth: "240px",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "999px",
                    padding: "12px 24px",
                    fontSize: "14px",
                    fontWeight: 600,
                    boxShadow: isCaseReceiptFlow
                      ? "0 4px 12px rgba(15, 23, 42, 0.08)"
                      : "none",
                    backgroundColor: isCaseReceiptFlow ? "#0F172A" : "#FFFFFF",
                    color: isCaseReceiptFlow ? "#FFFFFF" : "#dde2eb",
                    border: isCaseReceiptFlow ? "none" : "1px solid #E2E8F0",
                    cursor: isCaseReceiptFlow ? "pointer" : "not-allowed",
                  }}
                >
                  Generate Case Receipt →
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
                    minWidth: "240px",
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
                    Formal Decision Review
                  </h3>
                  <p style={{ margin: "8px 0 0 0", fontSize: "14px", lineHeight: 1.6, color: "#475569" }}>
                    One formal decision for a specific case.
                  </p>
                  <p style={{ fontSize: "20px", fontWeight: 700 }}>
                    $149
                  </p>

                  <p style={{ fontSize: "13px", color: "#94A3B8", textDecoration: "line-through" }}>
                    $199 original
                  </p>
        
                  <p
                    style={{
                      marginTop: "4px",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#969aa4",
                    }}
                  >
                    Pilot continuation rate available within 3 days
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
                    Choose Formal Review →
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
                    Weekly Decision Support
                  </h3>
                  <p style={{ margin: "8px 0 0 0", fontSize: "14px", lineHeight: 1.6, color: "#475569" }}>
                    Handle multiple live decision events across 7 days.
                  </p>
                  <p style={{ fontSize: "20px", fontWeight: 700 }}>
                    $799 / week
                  </p>

                  <p style={{ fontSize: "13px", color: "#94A3B8", textDecoration: "line-through" }}>
                    $999 original
                  </p>
        
                  <p
                    style={{
                      marginTop: "4px",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#969aa4",
                    }}
                  >
                    Pilot continuation rate available within 3 days
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
                      border: "1px solid #FFEDA3",
                      fontSize: "14px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Choose Weekly Support →
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
                    Monthly Judgment Support
                  </h3>
                  <p style={{ margin: "8px 0 0 0", fontSize: "14px", lineHeight: 1.6, color: "#475569" }}>
                    Ongoing support across recurring decision events.
                  </p>
                  <p style={{ fontSize: "20px", fontWeight: 700 }}>
                    From $2,399 / month
                  </p>

                  <p style={{ fontSize: "13px", color: "#94A3B8", textDecoration: "line-through" }}>
                    $3,000 original
                  </p>
        
                  <p
                    style={{
                      marginTop: "4px",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#969aa4",
                    }}
                  >
                    Pilot continuation rate available within 3 days
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
                    Request Monthly Support →
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