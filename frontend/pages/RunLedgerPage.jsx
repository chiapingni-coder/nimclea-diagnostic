import React, { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import ROUTES from "../routes";
import { getRunLedger } from "./runLedger";

function formatTime(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function RunLedgerPage() {
  const navigate = useNavigate();

  const ledger = useMemo(() => {
    const data = getRunLedger();
    return Array.isArray(data) ? [...data].reverse() : [];
  }, []);

  const handleOpenReceipt = (item) => {
  navigate(ROUTES.RECEIPT, {
    state: {
      receiptPageData: item.receiptPageData || {
        receiptId: item.receiptId || "",
        generatedAt: item.timestamp || new Date().toLocaleString(),
        caseInput: item.caseInput || "",
        scenarioLabel: item.scenarioLabel || "",
        stageLabel: item.stageLabel || "",
        runLabel: item.runLabel || "",
        topSignals: Array.isArray(item.topSignals) ? item.topSignals : [],
        decisionStatus: item.decisionStatus || "Ready for Verification",
        confidenceLabel: item.confidenceLabel || "High",
      },
      verificationPageData: item.verificationPageData || null,
    },
  });
};

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 px-6 py-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <p className="text-sm font-medium text-slate-500 mb-2">RUN Ledger</p>
          <h1 className="text-3xl font-bold mb-3">Recorded execution history</h1>
          <p className="text-slate-700 leading-7">
            This page shows the recorded pilot-to-receipt history captured by the system.
            Each row is one recorded execution event written into the local RUN ledger.
          </p>
        </header>

        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-xl font-semibold">Ledger entries</h2>
              <p className="text-sm text-slate-500 mt-1">
                Total records: {ledger.length}
              </p>
            </div>

            <Link
              to={ROUTES.HOME || "/"}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
            >
              Back to Homepage
            </Link>
          </div>

          {ledger.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <p className="text-sm text-slate-600">
                No RUN records found yet. Generate a receipt from Pilot Result to create the first ledger entry.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {ledger.map((item, index) => (
                <button
                  type="button"
                  key={item.id || `${item.receiptId || "receipt"}-${index}`}
                  onClick={() => handleOpenReceipt(item)}
                  className="block w-full rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left transition hover:border-slate-300 hover:bg-slate-100"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Ledger ID
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-900 break-all">
                        {item.id || "—"}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Timestamp
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {formatTime(item.timestamp)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Receipt ID
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-900 break-all">
                        {item.receiptId || "—"}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Workflow
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {item.workflow || "—"}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Scenario
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {item.scenarioLabel || "—"}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Stage / RUN
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {item.stageLabel || "—"} / {item.runLabel || "—"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
                      Case tested
                    </p>
                    <p className="mt-2 text-sm font-semibold text-emerald-900">
                      {item.caseInput || "No case attached"}
                    </p>
                    <p className="mt-3 text-xs font-medium text-slate-500">
                      Click this record to open its receipt.
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}