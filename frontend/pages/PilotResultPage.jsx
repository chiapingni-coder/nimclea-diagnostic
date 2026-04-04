import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { buildReceiptPageData } from "../buildReceiptPageData";
import { buildVerificationPageData } from "../buildVerificationPageData";
import ROUTES from "../routes";

function buildSourceInputFromState(locationState = {}) {
  const preview = locationState?.preview || null;
  const pilotSetup = locationState?.pilot_setup || null;
  const pilotResult = locationState?.pilot_result || null;

  const strongestSignal = Array.isArray(preview?.top_signals)
    ? preview.top_signals[0]
    : null;

  return {
    runId:
      pilotResult?.runId ||
      preview?.run_id ||
      preview?.anchor_run ||
      "RUN000",

    pattern:
      pilotResult?.pattern ||
      preview?.pattern ||
      preview?.pattern_id ||
      "PAT-00",

    stage:
      pilotResult?.stage ||
      preview?.stage ||
      "S0",

    decision:
      pilotResult?.decision ||
      preview?.recommended_next_step ||
      preview?.pilot_preview?.entry ||
      "Continue with structured pilot execution.",

    signals:
      pilotResult?.signals ||
      (Array.isArray(preview?.top_signals)
        ? preview.top_signals.map((signal) => ({
            label: signal?.label || signal?.key || "unknown_signal",
            value: signal?.value || signal?.level || "unknown",
          }))
        : []),

    workflow:
      pilotSetup?.workflow || "Unknown workflow",

    scenarioLabel:
      preview?.scenario?.label || "No Dominant Scenario",
  };
}

export default function PilotResultPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const sourceInput = buildSourceInputFromState(location.state || {});
  const rawReceipt = buildReceiptPageData(sourceInput);
  const rawVerification = buildVerificationPageData(rawReceipt);

  const receiptPageData = {
    receiptTitle: "Decision Receipt",
    receiptId: rawReceipt.receipt_id,
    generatedAt: new Date(rawReceipt.timestamp).toLocaleString(),

    summaryTitle: "Decision Summary",
    summaryText: rawReceipt.decision,

    scenarioLabel: sourceInput.scenarioLabel || sourceInput.pattern,
    stageLabel: rawReceipt.summary?.stage || sourceInput.stage,
    runLabel: rawReceipt.summary?.runId || sourceInput.runId,

    topSignals: (rawReceipt.signals || []).map(
      (signal) => `${signal.label}: ${signal.value}`
    ),

    nextStepTitle: "Recommended Next Step",
    nextStepText:
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
      rawVerification.status === "verified" ? "Verified" : "Failed",
    receiptId: rawReceipt.receipt_id,
    verifiedAt: new Date().toLocaleString(),

    introText:
      "This page checks whether the receipt output is structurally complete and ready for review.",

    checks: (rawVerification.checks || []).map((check) => ({
      label: check.name,
      status: check.passed ? "passed" : "failed",
      detail: check.passed
        ? `${check.name} check passed.`
        : `${check.name} check failed.`,
    })),

    eventTimeline: [
      {
        time: "Step 1",
        title: "Pilot result generated",
        detail: "Pilot output was converted into structured receipt input.",
      },
      {
        time: "Step 2",
        title: "Receipt built",
        detail: "The system generated a receipt payload from builder logic.",
      },
      {
        time: "Step 3",
        title: "Verification prepared",
        detail: "Verification checks were generated from the receipt payload.",
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
            This page summarizes the current pilot outcome and lets the user generate a receipt.
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

          <button
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
            className="inline-flex items-center justify-center px-5 py-3 rounded-xl bg-slate-900 text-white font-medium hover:opacity-90 transition"
          >
            Generate Receipt
          </button>
        </section>
      </div>
    </div>
  );
}