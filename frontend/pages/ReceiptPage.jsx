import React from "react";
import { Link, useLocation } from "react-router-dom";
import ROUTES from "../routes";

function getStoredReceiptData() {
  try {
    const raw = localStorage.getItem("receiptPageData");
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error("Failed to read receiptPageData from localStorage:", error);
    return null;
  }
}

function createReceiptHash(input = {}) {
  const raw = [
    input.receiptId || "",
    input.caseInput || "",
    input.scenarioLabel || "",
    input.stageLabel || "",
    input.runLabel || "",
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
  return {
    receiptTitle: input.receiptTitle || "Decision Receipt",
    receiptId: input.receiptId || "RCPT-DEMO-001",
    generatedAt: input.generatedAt || new Date().toLocaleString(),
    receiptHash: input.receiptHash || "",

    summaryTitle: input.summaryTitle || "Recorded Decision Path",
    summaryText:
      input.summaryText ||
      "This receipt records the decision path your system is now operating on.",

    scenarioLabel: input.scenarioLabel || "No Dominant Scenario",
    stageLabel: input.stageLabel || "S0",
    runLabel: input.runLabel || "RUN000",
    caseInput: input.caseInput || "",

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
      "Proceed to verification and confirm whether this recorded decision path can be checked consistently across the final output, proof, and receipt.",

    decisionStatus: input.decisionStatus || "Ready for Verification",
    confidenceLabel: input.confidenceLabel || "High",
    receiptNote:
      input.receiptNote ||
      "This receipt is a structured record prepared for review and verification. It formalizes the current decision path, but does not by itself constitute a legal determination.",

    verificationCtaText: input.verificationCtaText || "Proceed to Verification",
  };
}

export default function ReceiptPage() {
  const location = useLocation();

  const routeData = location.state?.receiptPageData || location.state || null;
  const storedData = getStoredReceiptData();
  const normalized = normalizeReceiptData(routeData || storedData || {});
  const data = {
    ...normalized,
    receiptHash: normalized.receiptHash || createReceiptHash(normalized),
  };

  console.log("ReceiptPage location.state:", location.state);
  console.log("ReceiptPage data:", data);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 px-6 py-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <p className="text-sm font-medium text-slate-500 mb-2">Decision Receipt</p>
          <h1 className="text-3xl font-bold mb-3">{data.receiptTitle}</h1>

          <div className="grid md:grid-cols-2 gap-4 text-sm">
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
              <p className="text-slate-500 mb-1"></p>
              <p className="font-semibold">{data.decisionStatus}</p>
            </div>
          </div>
        </header>

        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-semibold mb-3">{data.summaryTitle}</h2>
          <p className="text-slate-700 leading-7">
            This receipt records the concrete case, workflow, and decision path your system is now operating on.
          </p>

          <p className="mt-3 text-slate-700 leading-7">
            This receipt does not represent a generic recommendation.
            It records one concrete case, the selected workflow, and the decision path implied by your current response structure.
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
            <p className="text-sm text-slate-500 mb-1">RUN</p>
            <p className="font-semibold leading-7">{data.runLabel}</p>
          </div>

          <div className="mt-4 bg-slate-50 rounded-xl p-4 border border-slate-200">
            <p className="text-sm text-slate-500 mb-1">Case tested</p>
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
            Proceed to verification to confirm whether this recorded case, workflow, and decision path can be consistently checked across the final output, proof, and receipt.
          </p>
        </section>

        <section className="bg-amber-50 rounded-2xl border border-amber-200 p-6">
          <h2 className="text-lg font-semibold mb-2">Record Note</h2>
          <p className="text-slate-700 leading-7">{data.receiptNote}</p>
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to={ROUTES.VERIFICATION}
            state={{
              receiptPageData: data,
              verificationPageData: {
                ...(location.state?.verificationPageData || {}),
                receiptId: data.receiptId,
                caseInput: data.caseInput,
                scenarioLabel: data.scenarioLabel,
                stageLabel: data.stageLabel,
                runLabel: data.runLabel,
                topSignals: data.topSignals,
                receiptHash: data.receiptHash,
              },
            }}
            className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            Proceed to Verification →
          </Link>
        </div>
      </div>
    </div>
  );
}