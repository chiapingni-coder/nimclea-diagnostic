import React from "react";
import { Link, useLocation } from "react-router-dom";

function getStoredVerificationData() {
  try {
    const raw = localStorage.getItem("verificationPageData");
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error("Failed to read verificationPageData from localStorage:", error);
    return null;
  }
}

function normalizeVerificationData(input = {}) {
  return {
    verificationTitle: input.verificationTitle || "Verification",
    overallStatus: input.overallStatus || "Verification Ready",
    receiptId: input.receiptId || "RCPT-DEMO-001",
    verifiedAt: input.verifiedAt || new Date().toLocaleString(),

    introText:
      input.introText ||
      "This page helps confirm whether the receipt output is internally consistent, structurally traceable, and ready for external review.",

    checks: Array.isArray(input.checks)
      ? input.checks
      : [
          {
            label: "Receipt structure loaded",
            status: "passed",
            detail: "The receipt fields were successfully loaded into the verification layer.",
          },
          {
            label: "Scenario-stage alignment",
            status: "passed",
            detail: "Scenario, stage, and next-step logic are aligned.",
          },
          {
            label: "Signal consistency",
            status: "passed",
            detail: "Top signal output is present and readable.",
          },
        ],

    eventTimeline: Array.isArray(input.eventTimeline)
      ? input.eventTimeline
      : [
          {
            time: "Step 1",
            title: "Diagnostic completed",
            detail: "User finished the diagnostic flow and received structured output.",
          },
          {
            time: "Step 2",
            title: "Receipt generated",
            detail: "The system generated a receipt with decision summary and detected structure.",
          },
          {
            time: "Step 3",
            title: "Verification opened",
            detail: "The user entered the verification layer to review traceability.",
          },
        ],

    finalNote:
      input.finalNote ||
      "Verification confirms whether the current output is structurally coherent. It does not replace legal, compliance, or professional review.",

    backToReceiptText: input.backToReceiptText || "Back to Receipt",
  };
}

function getStatusStyles(status) {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "passed") {
    return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  }

  if (normalized === "warning") {
    return "bg-amber-50 text-amber-700 border border-amber-200";
  }

  if (normalized === "failed") {
    return "bg-red-50 text-red-700 border border-red-200";
  }

  return "bg-slate-50 text-slate-700 border border-slate-200";
}

export default function VerificationPage() {
  const location = useLocation();

  const routeData = location.state?.verificationPageData || location.state || null;
  const storedData = getStoredVerificationData();
  const data = normalizeVerificationData(routeData || storedData || {});

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 px-6 py-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <p className="text-sm font-medium text-slate-500 mb-2">Verification Page</p>
          <h1 className="text-3xl font-bold mb-3">{data.verificationTitle}</h1>
          <p className="text-slate-700 leading-7 mb-5">{data.introText}</p>

          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-slate-500 mb-1">Overall Status</p>
              <p className="font-semibold">{data.overallStatus}</p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-slate-500 mb-1">Receipt ID</p>
              <p className="font-semibold break-all">{data.receiptId}</p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-slate-500 mb-1">Verified At</p>
              <p className="font-semibold">{data.verifiedAt}</p>
            </div>
          </div>
        </header>

        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Verification Checks</h2>

          <div className="space-y-4">
            {data.checks.map((check, index) => (
              <div
                key={`${check.label}-${index}`}
                className="rounded-xl border border-slate-200 p-4 bg-slate-50"
              >
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h3 className="font-semibold">{check.label}</h3>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusStyles(
                      check.status
                    )}`}
                  >
                    {check.status || "unknown"}
                  </span>
                </div>
                <p className="text-slate-700 leading-7">{check.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Event Timeline</h2>

          <div className="space-y-4">
            {data.eventTimeline.map((item, index) => (
              <div
                key={`${item.time}-${item.title}-${index}`}
                className="rounded-xl border border-slate-200 p-4 bg-slate-50"
              >
                <p className="text-sm text-slate-500 mb-1">{item.time}</p>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-slate-700 leading-7">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-blue-50 rounded-2xl border border-blue-200 p-6">
          <h2 className="text-lg font-semibold mb-2">Final Note</h2>
          <p className="text-slate-700 leading-7">{data.finalNote}</p>
        </section>

        <div className="flex flex-wrap gap-3">
          <Link
            to="/receipt"
            className="inline-flex items-center justify-center px-5 py-3 rounded-xl bg-slate-900 text-white font-medium hover:opacity-90 transition"
          >
            {data.backToReceiptText}
          </Link>

          <Link
            to="/"
            className="inline-flex items-center justify-center px-5 py-3 rounded-xl bg-white text-slate-900 border border-slate-300 font-medium hover:bg-slate-50 transition"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}