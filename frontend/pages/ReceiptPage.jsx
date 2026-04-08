import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import ROUTES from "../routes";
import { evaluateCaseRecordStatus } from "../utils/verificationStatus";

function getStoredReceiptData() {
  try {
    const raw = localStorage.getItem("receiptPageData");
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error("Failed to read receiptPageData from localStorage:", error);
    return null;
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

function createReceiptHash(input = {}) {
  const runSummarySignature = createRunSummarySignature(
    Array.isArray(input.runEntries) ? input.runEntries : []
  );

  const raw = [
    input.receiptId || "",
    input.caseInput || "",
    input.scenarioLabel || "",
    input.stageLabel || "",
    runSummarySignature || input.runLabel || "",
    input.totalRunHits || "",
    input.generatedAt || "",
  ].join("|");

  let hash = 0;
  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash << 5) - hash + raw.charCodeAt(i);
    hash |= 0;
  }

  return `H-${Math.abs(hash).toString(16).toUpperCase()}`;
}

function normalizeReceiptData(input = {}) {
  const aggregation = buildRunAggregation(input);

  return {
    receiptTitle: input.receiptTitle || "Decision Receipt",
    receiptId: input.receiptId || "RCPT-DEMO-001",
    generatedAt: input.generatedAt || new Date().toLocaleString(),
    verifiedAt: input.verifiedAt || "",
    receiptHash: input.receiptHash || "",

    summaryTitle: input.summaryTitle || "Recorded Decision Structure",
    summaryText:
      input.summaryText ||
      "This receipt records the structured RUN patterns identified during the current pilot window.",

    scenarioLabel: input.scenarioLabel || "No Dominant Scenario",
    stageLabel: input.stageLabel || "S0",
    runLabel: input.runLabel || aggregation.primaryRunLabel || "RUN000",
    caseInput: input.caseInput || "",

    runEntries: aggregation.runEntries,
    totalRunHits: aggregation.totalRunHits,
    primaryRunLabel: aggregation.primaryRunLabel,
    runSummaryText: aggregation.runSummaryText,

    topSignals: Array.isArray(input.topSignals)
      ? input.topSignals
      : [
          "dominant_failure_mode",
          "external_pressure",
          "pressure_revealed_weak_point",
        ],

    nextStepTitle: input.nextStepTitle || "Recommended Next Step",
    nextStepText:
      input.nextStepText ||
      "Proceed to verification to confirm whether this aggregated RUN record can be checked consistently across the final output, proof, and receipt.",

    decisionStatus: input.decisionStatus || "Ready for Verification",
    confidenceLabel: input.confidenceLabel || "High",
    receiptNote:
      input.receiptNote ||
      "This receipt is a structured record of aggregated RUN patterns for review and verification. It does not certify individual events, but validates the structural patterns observed across the pilot window.",

    verificationCtaText: input.verificationCtaText || "Proceed to Verification",
  };
}

export default function ReceiptPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const routeDecision = location.state?.routeDecision || null;
  const receiptSource = location.state?.receiptSource || "";

  const receiptMode = routeDecision?.mode || "case_receipt";

  const canRenderReceipt =
    (receiptMode === "case_receipt" &&
      receiptSource === "pilot_case_result") ||
    (receiptMode === "final_receipt" &&
      receiptSource === "pilot_weekly_summary");

  const routeData = canRenderReceipt
    ? location.state?.receiptPageData || null
    : null;

  const storedData = canRenderReceipt ? getStoredReceiptData() : null;
  const normalized = normalizeReceiptData(routeData || storedData || {});
  const isVerified =
    normalized.verifiedAt ||
    location.state?.verificationPageData?.verifiedAt;

  const {
    decisionStatus: _ignoredDecisionStatus,
    ...normalizedWithoutDecisionStatus
  } = normalized;

  const baseReceiptData = {
    ...normalizedWithoutDecisionStatus,
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

const evaluated = evaluateCaseRecordStatus(baseReceiptData);

const data = {
  ...baseReceiptData,
  decisionStatus: isVerified ? "Verified" : evaluated.receiptStatus,
};

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
            Receipts are issued only after confirmation from the pilot result page.
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

  console.log("ReceiptPage location.state:", location.state);
  console.log("ReceiptPage data:", data);

  const verificationPayload = {
    ...(location.state?.verificationPageData || {}),
    receiptId: data.receiptId,
    caseInput: data.caseInput,
    scenarioLabel: data.scenarioLabel,
    stageLabel: data.stageLabel,
    runLabel: data.primaryRunLabel || data.runLabel,
    runEntries: data.runEntries,
    totalRunHits: data.totalRunHits,
    primaryRunLabel: data.primaryRunLabel,
    runSummaryText: data.runSummaryText,
    topSignals: data.topSignals,
    receiptHash: data.receiptHash,
    verificationTitle: "Case Verification",
    verifiedAt: data.verifiedAt,
  };

  function handleProceedToVerification() {
    try {
      localStorage.setItem("receiptPageData", JSON.stringify(data));
      localStorage.setItem(
        "verificationPageData",
        JSON.stringify(verificationPayload)
      );
    } catch (error) {
      console.error("Failed to persist verification payload:", error);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 px-6 py-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <p className="text-sm font-medium text-slate-500 mb-2">
            {receiptMode === "final_receipt"
              ? "Derived from 7-day pilot summary"
              : "Generated from a single pilot case"}
          </p>
          <h1 className="text-3xl font-bold mb-3">
            {receiptMode === "final_receipt"
              ? "Final Pilot Receipt"
              : "Case Receipt"}
          </h1>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-slate-500 mb-1">Receipt ID</p>
              <p className="font-semibold break-all">{data.receiptId}</p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-slate-500 mb-1">Generated At</p>
              <p className="font-semibold">{data.generatedAt}</p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-slate-500 mb-1">Receipt Hash</p>
              <p className="font-semibold break-all">{data.receiptHash}</p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-slate-500 mb-1">Verified At</p>
              <p className="font-semibold">
                {data.verifiedAt || "Not verified yet"}
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-slate-500 mb-1">Status</p>
              <p className="font-semibold">{data.decisionStatus}</p>
            </div>
          </div>
        </header>

        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-semibold mb-3">{data.summaryTitle}</h2>

          <p className="text-slate-700 leading-7">
            {receiptMode === "final_receipt"
              ? "This receipt records the summarized outcome of the 7-day pilot window, including the dominant workflow, observed structure, and final decision path."
              : "This receipt records the aggregated RUN structure identified from the current pilot window."}
          </p>

          <p className="mt-3 text-slate-700 leading-7">
            {receiptMode === "final_receipt"
              ? "It does not represent a generic recommendation. It formalizes the final pilot summary that was eligible for receipt generation."
              : "It does not represent a generic recommendation. It formalizes the structural patterns (RUNs) observed across the current pilot execution."}
          </p>
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Recorded Structure</h2>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-sm text-slate-500 mb-1">Scenario</p>
              <p className="font-semibold">{data.scenarioLabel}</p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-sm text-slate-500 mb-1">Stage</p>
              <p className="font-semibold">{data.stageLabel}</p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-sm text-slate-500 mb-1">Confidence</p>
              <p className="font-semibold">{data.confidenceLabel}</p>
            </div>
          </div>

          <div className="mt-4 bg-slate-50 rounded-xl p-4 border border-slate-200">
            <p className="text-sm text-slate-500 mb-1">Primary RUN</p>
            <p className="font-semibold leading-7">
              {data.primaryRunLabel || data.runLabel}
            </p>
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
              {data.caseInput || "No case attached"}
            </p>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Supporting Signals</h2>

          {data.topSignals.length > 0 ? (
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
          <h2 className="text-xl font-semibold mb-3">{data.nextStepTitle}</h2>
          <p className="text-slate-700 leading-7">
            {receiptMode === "final_receipt"
              ? "Proceed to verification to confirm whether this final pilot summary, workflow, and decision path can be consistently checked across the final output, proof, and receipt."
              : "Proceed to verification to confirm whether this aggregated RUN structure can be consistently validated across the receipt, proof, and verification layers."}
          </p>
        </section>

        <section className="bg-amber-50 rounded-2xl border border-amber-200 p-6">
          <h2 className="text-lg font-semibold mb-2">Record Note</h2>
          <p className="text-slate-700 leading-7">{data.receiptNote}</p>
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to={ROUTES.VERIFICATION}
            onClick={handleProceedToVerification}
            state={{
              receiptPageData: data,
              verificationPageData: verificationPayload,
              routeDecision,
              receiptSource,
            }}
            className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            {data.verificationCtaText || "Proceed to Verification"} →
          </Link>
        </div>
      </div>
    </div>
  );
}