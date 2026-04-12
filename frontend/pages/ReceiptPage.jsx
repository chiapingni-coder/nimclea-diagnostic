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

  const behaviorSignature = [
    input.executionSummary?.totalEvents || 0,
    input.executionSummary?.structuredEventsCount || 0,
    input.executionSummary?.latestEventType || "",
    input.executionSummary?.mainObservedShift || "",
  ].join("|");

  const raw = [
    input.receiptId || "",
    input.summaryContext || input.caseInput || "",
    input.scenarioLabel || "",
    input.stageLabel || "",
    runSummarySignature || input.runLabel || "",
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
    summaryContext: input.summaryContext || "",
    displayContext:
      input.summaryContext ||
      input.caseInput ||
      "",

    runEntries: aggregation.runEntries,
    totalRunHits: aggregation.totalRunHits,
    primaryRunLabel: aggregation.primaryRunLabel,
    runSummaryText: aggregation.runSummaryText,

    executionSummary: input.executionSummary || {
      totalEvents: 0,
      structuredEventsCount: 0,
      latestEventType: "other",
      latestEventLabel: "No recorded structural event",
      latestEventDescription: "",
      mainObservedShift: "No behavioral shift recorded yet.",
      nextCalibrationAction: "Record one real workflow event to begin calibration.",
      behaviorStatus: "behavior_weak",
    },

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
  summaryContext:
    baseReceiptData.summaryContext || "",
  displayContext:
    baseReceiptData.summaryContext ||
    baseReceiptData.caseInput ||
    "",
  decisionStatus: isVerified ? "Verified" : evaluated.receiptStatus,
};

const finalEvidenceLock = {
  ...(location.state?.evidenceLock || {}),
  receiptId: data.receiptId,
  receiptHash: data.receiptHash,
  receiptSource,
  receiptMode: receiptMode,
};

const evidenceLock = location.state?.evidenceLock || null;
const isEvidenceLockedConsistent =
  !evidenceLock ||
  (
    evidenceLock.receiptId === data.receiptId &&
    (!evidenceLock.receiptHash || evidenceLock.receiptHash === data.receiptHash) &&
    evidenceLock.receiptSource === receiptSource &&
    evidenceLock.receiptMode === receiptMode
  );

const verificationBlockedReason = !isEvidenceLockedConsistent
  ? "Verification is locked because this receipt no longer matches the issued evidence chain."
  : "";

const verificationReturnStatus =
  location.state?.verificationPageData?.overallStatus || "";

const returnedFromFailedVerification =
  verificationReturnStatus === "Verification Failed";

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

  function handleProceedToVerification() {
    try {
      localStorage.setItem("receiptPageData", JSON.stringify(data));
    } catch (error) {
      console.error("Failed to persist receipt payload:", error);
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
              ? "Final Structure Proof"
              : "Case Structure Proof"}
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
              <p className="text-slate-500 mb-1">Verified At</p>
              <p className="font-semibold">
                {data.verifiedAt || "Not verified yet"}
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-slate-500 mb-1">Status</p>
              <p className="font-semibold">{data.decisionStatus}</p>
              <p className="text-xs text-slate-500 mt-2">
                This status reflects structural consistency evaluation across RUN aggregation, hash integrity, and verification readiness.
              </p>
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
            {receiptMode === "final_receipt"
              ? "This structure proof certifies the summarized outcome of the 7-day pilot window, including the dominant workflow, observed structure, and final decision path."
              : "This structure proof certifies the aggregated RUN patterns identified during the current pilot window."}
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
              {data.displayContext || "No case attached"}
            </p>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Execution Summary</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-sm text-slate-500 mb-1">Recorded events</p>
              <p className="font-semibold">{data.executionSummary.totalEvents}</p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-sm text-slate-500 mb-1">Structured events</p>
              <p className="font-semibold">{data.executionSummary.structuredEventsCount}</p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-sm text-slate-500 mb-1">Latest event</p>
              <p className="font-semibold">{data.executionSummary.latestEventLabel}</p>
            </div>

            {data.executionSummary.latestEventDescription ? (
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <p className="text-sm text-slate-500 mb-1">Latest description</p>
                <p className="font-semibold leading-7">
                  {data.executionSummary.latestEventDescription}
                </p>
              </div>
            ) : null}

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-sm text-slate-500 mb-1">Observed structural shift</p>
              <p className="font-semibold leading-7">
                {data.executionSummary.mainObservedShift}
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-sm text-slate-500 mb-1">Next calibration action</p>
              <p className="font-semibold leading-7">
                {data.executionSummary.nextCalibrationAction}
              </p>
            </div>
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

        <section className="bg-amber-50 rounded-2xl border border-amber-200 p-6">
          <h2 className="text-lg font-semibold mb-2">Record Note</h2>
          <p className="text-slate-700 leading-7">{data.receiptNote}</p>
        </section>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
          <p>
            This record can be shared, but not verified externally.
          </p>
          <p className="mt-1 font-medium">
            Verification unlocks audit-ready proof.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          {isEvidenceLockedConsistent ? (
            <Link
              to={ROUTES.VERIFICATION}
              onClick={handleProceedToVerification}
              state={{
                receiptPageData: data,
                verificationPageData: location.state?.verificationPageData || null,
                routeDecision,
                receiptSource,
                evidenceLock: finalEvidenceLock,
              }}
              className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              {returnedFromFailedVerification
                ? "Retry Verification from Recovered Receipt →"
                : data.verificationCtaText || "Proceed to Verification"} 
            </Link>
          ) : (
            <div className="flex flex-col gap-3">
              <button
                type="button"
                disabled
                className="inline-flex items-center justify-center rounded-2xl bg-slate-300 px-5 py-3 text-sm font-semibold text-slate-600 shadow-sm cursor-not-allowed"
                title={verificationBlockedReason}
              >
                Verification Locked
              </button>

              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
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