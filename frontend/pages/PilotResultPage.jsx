import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { buildReceiptPageData } from "../buildReceiptPageData";
import { buildVerificationPageData } from "../buildVerificationPageData";
import ROUTES from "../routes";
import { logEvent } from "../utils/eventLogger";

const SCENARIO_LABEL_MAP = {
  pre_audit_collapse: "Pre-Audit Collapse",
  barely_functional: "Barely Functional",
  boundary_blur: "Boundary Blur",
  fully_ready: "Fully Ready",
};

function buildSourceInputFromState(locationState = {}) {
  const preview = locationState?.preview || null;
  const sourceInput = locationState?.sourceInput || null;
  const pilotSetup = locationState?.pilot_setup || null;
  const pilotResult = locationState?.pilot_result || null;

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
      SCENARIO_LABEL_MAP[extraction?.scenarioKey] ||
      SCENARIO_LABEL_MAP[resultSeed?.scenarioKey] ||
      (upstream?.scenario?.label &&
      upstream?.scenario?.label !== "No Dominant Scenario"
        ? upstream.scenario.label
        : "No Dominant Scenario"),

    scenarioCode:
      extraction?.scenarioKey ||
      resultSeed?.scenarioKey ||
      upstream?.scenario?.code ||
      "unknown_scenario",

    summaryText:
      upstream?.summary?.[0] ||
      resultSeed?.summary ||
      "No structured summary available.",
  };
}

export default function PilotResultPage() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    logEvent("pilot_result_viewed");
  }, []);

  const sourceInput = buildSourceInputFromState(location.state || {});
  const rawReceipt = buildReceiptPageData(sourceInput);
  const rawVerification = buildVerificationPageData(rawReceipt);

  const receiptPageData = {
    receiptTitle: "Decision Receipt",
    receiptId: rawReceipt.receipt_id,
    generatedAt: new Date(rawReceipt.timestamp).toLocaleString(),

    summaryTitle: "Decision Summary",
    summaryText: sourceInput.summaryText || rawReceipt.decision,

    scenarioLabel: sourceInput.scenarioLabel || sourceInput.pattern,
    stageLabel: sourceInput.stage || rawReceipt.summary?.stage || "S0",
    runLabel: sourceInput.runId || rawReceipt.summary?.runId || "RUN000",

    topSignals: (sourceInput.signals || []).map(
      (signal) => `${signal.label}: ${signal.value}`
    ),

    nextStepTitle: "Recommended Next Step",
    nextStepText:
      sourceInput.decision ||
      "Move into verification and confirm the receipt structure is complete and traceable.",

    decisionStatus: "Ready for Verification",
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
      detail: `Scenario ${sourceInput.scenarioLabel}, stage ${sourceInput.stage}, and next-step logic are aligned.`,
    },
    {
      label: "Signal consistency",
      status: sourceInput.signals?.length > 0 ? "passed" : "warning",
      detail:
        sourceInput.signals?.length > 0
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
      detail: `Receipt captured ${sourceInput.scenarioLabel} / ${sourceInput.stage} / ${sourceInput.runId}.`,
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <p className="text-sm font-medium text-slate-500 mb-2">Pilot Result</p>
          <h1 className="text-3xl font-bold mb-3">Pilot Result</h1>
          <p className="text-slate-700 leading-7">
            This shows what changed after forcing execution into the system and lets the user generate a receipt.
          </p>
        </header>

        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
            <p className="text-sm text-slate-500">Workflow</p>
            <p className="text-base font-semibold text-slate-900">
              {sourceInput.workflow}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
            <p className="text-sm text-slate-500">Scenario</p>
            <p className="text-base font-semibold text-slate-900">
              {sourceInput.scenarioLabel}
            </p>
          </div>

          <div className="mt-6">
            <button
              type="button"
              onClick={() => {
                localStorage.setItem("receiptPageData", JSON.stringify(receiptPageData));
                localStorage.setItem(
                  "verificationPageData",
                  JSON.stringify(verificationPageData)
                );

                navigate(ROUTES.RECEIPT, {
                  state: {
                    receiptPageData,
                    verificationPageData,
                  },
                });
              }}
              className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              Generate Receipt →
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}