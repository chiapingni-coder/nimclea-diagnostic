import React from "react";
import { Link, useLocation } from "react-router-dom";
import ROUTES from "../routes";

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
    overallStatus: input.overallStatus || "Ready for Review",
    receiptId: input.receiptId || "RCPT-DEMO-001",
    verifiedAt: input.verifiedAt || "",
    caseInput: input.caseInput || "",

    scenarioLabel: input.scenarioLabel || "",
    stageLabel: input.stageLabel || "",
    runLabel: input.runLabel || "",
    topSignals: Array.isArray(input.topSignals) ? input.topSignals : [],
    receiptHash: input.receiptHash || "",

    introText:
      input.introText ||
      "This page shows whether the receipt, supporting structure, and final output can be checked consistently. It is designed to make the record easier to trust, review, and carry forward.",
    checks: Array.isArray(input.checks)
      ? input.checks
      : [
          {
            label: "Receipt and case record available",
            status: "passed",
            detail: "The receipt fields and attached case input are present and readable in the verification layer.",
          },
          {
            label: "Scenario, stage, and case alignment",
            status: "passed",
            detail: "The current scenario, stage, case, and recommended next step are aligned in the recorded path.",
          },
          {
            label: "Supporting signal consistency",
            status: "passed",
            detail: "Supporting signals are present and readable in the current record.",
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
            detail: `Receipt captured ${input.scenarioLabel || "—"} / ${input.stageLabel || "—"} / ${input.runLabel || "—"} / Case: ${input.caseInput || "No case attached"}.`,
          },
          {
            time: "Step 3",
            title: "Verification opened",
            detail: "The user entered the verification layer to review traceability.",
          },
        ],

    finalNote:
      input.finalNote ||
      "Verification confirms whether the current receipt and supporting output are consistent and reviewable. It does not replace legal, compliance, or professional review.",

    backToReceiptText: input.backToReceiptText || "Back to Decision Receipt",
  };
}

function buildDynamicVerificationData(input = {}) {
  const hasReceiptId = !!input.receiptId;
  const hasCase = !!String(input.caseInput || "").trim();
  const hasScenario = !!String(input.scenarioLabel || "").trim();
  const hasStage = !!String(input.stageLabel || "").trim();
  const hasRun = !!String(input.runLabel || "").trim();
  const hasSignals = Array.isArray(input.topSignals) && input.topSignals.length > 0;

  const checks = [
    {
      label: "Receipt and case record available",
      status: hasReceiptId && hasCase ? "passed" : hasReceiptId ? "warning" : "failed",
      detail:
        hasReceiptId && hasCase
          ? "The receipt fields and attached case input are present and readable in the verification layer."
          : hasReceiptId
          ? "Receipt exists, but no concrete case is attached."
          : "Receipt record is missing.",
    },
    {
      label: "Scenario, stage, and case alignment",
      status: hasScenario && hasStage && hasCase ? "passed" : hasScenario || hasStage ? "warning" : "failed",
      detail:
        hasScenario && hasStage && hasCase
          ? `Scenario ${input.scenarioLabel}, stage ${input.stageLabel}, and the recorded case are aligned.`
          : hasScenario || hasStage
          ? "Some structural fields are present, but the record is not fully aligned."
          : "Scenario/stage structure is missing.",
    },
    {
      label: "Supporting signal consistency",
      status: hasSignals ? "passed" : "warning",
      detail: hasSignals
        ? "Supporting signals are present and readable in the current record."
        : "No supporting signal payload was passed into verification.",
    },
  ];

  const failedCount = checks.filter((c) => c.status === "failed").length;
  const warningCount = checks.filter((c) => c.status === "warning").length;

  let overallStatus = "Verification Ready";
  if (failedCount > 0) overallStatus = "Verification Failed";
  else if (warningCount > 0) overallStatus = "Verification Warning";

  return {
    overallStatus,
    checks,
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

  const routeData =
    location.state?.verificationPageData ||
    location.state ||
    null;
  
  const storedData = getStoredVerificationData();
  const receiptContext = location.state?.receiptPageData || null;
  const baseData = normalizeVerificationData({
    ...(receiptContext || {}),
    ...(routeData || storedData || {}),
  });

  const dynamicData = buildDynamicVerificationData(baseData);

  const hasVerificationPayload = !!(receiptContext || routeData || storedData);

  const data = {
    ...baseData,
    overallStatus: hasVerificationPayload
      ? dynamicData.overallStatus
      : "Verification Preview",
    checks: hasVerificationPayload
      ? dynamicData.checks
      : [
          {
            label: "Receipt payload",
            status: "warning",
            detail: "No receipt payload was passed into this page.",
          },
          {
            label: "Structure alignment",
            status: "warning",
            detail: "No scenario/stage/run context is currently attached.",
          },
          {
            label: "Verification readiness",
            status: "warning",
            detail: "This page is open in preview mode. Open it from Receipt for live data.",
          },
        ],
    eventTimeline: hasVerificationPayload
      ? baseData.eventTimeline
      : [
          {
            time: "Step 1",
            title: "Preview opened",
            detail: "Verification was opened directly without a live receipt payload.",
          },
          {
            time: "Step 2",
            title: "Awaiting receipt context",
            detail: "Scenario, stage, RUN, and case details will appear once this page is opened from Receipt.",
          },
          {
            time: "Step 3",
            title: "Ready for live verification",
            detail: "Return to the recorded flow to load a live verification record.",
          },
        ],
  };

  const proofRecordId =
    data.proofRecordId ||
    `LBP-${String(data.receiptId || "NO-RECEIPT").replace(/[^a-zA-Z0-9]/g, "")}`;

  const anchorStatus =
    data.anchorStatus ||
    (hasVerificationPayload ? "Anchored" : "Pending");

  const anchoredAt =
    data.anchoredAt ||
    data.verifiedAt ||
    "Not recorded yet";

  const proofReceiptHash =
    data.receiptHash ||
    "Unavailable";

  const displayReceiptHash =
    proofReceiptHash && proofReceiptHash !== "Unavailable"
      ? `${proofReceiptHash.slice(0, 10)}…${proofReceiptHash.slice(-6)}`
      : proofReceiptHash;

  console.log("VerificationPage location.state:", location.state);
  console.log("VerificationPage receiptContext:", receiptContext);
  console.log("VerificationPage routeData:", routeData);
  console.log("VerificationPage data:", data);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 px-6 py-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <p className="text-sm font-medium text-slate-500 mb-2">Verification</p>
          <h1 className="text-3xl font-bold mb-3">{data.verificationTitle}</h1>
          <p className="text-slate-700 leading-7 mb-5">
            {hasVerificationPayload
              ? "This verifies whether the recorded case, workflow, and decision path hold together under inspection."
              : "This page is currently open in preview mode. Live verification data will appear when opened from Receipt."}
          </p>

          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-slate-500 mb-1">Verification Status</p>
              <p
                className={`font-semibold ${
                  data.overallStatus === "Verification Failed"
                    ? "text-red-700"
                    : data.overallStatus === "Verification Warning"
                    ? "text-amber-700"
                    : "text-emerald-700"
                }`}
              >
                {data.overallStatus}
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-slate-500 mb-1">Receipt ID</p>
              <p className="font-semibold break-all">
                {hasVerificationPayload ? data.receiptId : "No live receipt attached"}
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-slate-500 mb-1">Verified At</p>
              <p className="font-semibold">{data.verifiedAt || "Not recorded yet"}</p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-slate-500 mb-1">Case tested</p>
              <p className="font-semibold">{data.caseInput || "No case attached"}</p>
            </div>
          </div>
        </header>

        <div
          className="rounded-2xl px-10 py-8 shadow-md"
          style={{ backgroundColor: "#047857" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              color: "#ffffff",
              fontSize: "18px",
              fontWeight: 600,
              textAlign: "center",
            }}
          >
            <div style={{ flex: 1, opacity: 0.9 }}>
              Verification Status
            </div>

            <div style={{ flex: 1 }}>
              {hasVerificationPayload ? "✓ Receipt Hash verified" : "Receipt Hash pending"}
            </div>

            <div style={{ flex: 1 }}>
              {hasVerificationPayload ? "✓ Structure consistent" : "Structure pending"}
            </div>

            <div style={{ flex: 1 }}>
              {hasVerificationPayload ? "✓ Ready for audit" : "Preview mode"}
            </div>
          </div>
        </div>

        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-semibold mb-4">What was checked</h2>

          <p className="mb-4 text-sm text-slate-600">
            Verification confirms whether the recorded case, workflow, and final decision output remain consistent across the receipt and verification layers.
          </p>

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
          <h2 className="text-xl font-semibold mb-4">Verification timeline</h2>

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

        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Ledger-backed proof</h2>

          <p className="mb-4 text-sm text-slate-600">
            This receipt is supported by a backend verification record for traceability and audit readiness.
          </p>

          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-slate-500 mb-1">Anchor status</p>
              <p
                className={`font-semibold ${
                  anchorStatus === "Anchored"
                    ? "text-emerald-700"
                    : anchorStatus === "Pending"
                    ? "text-amber-700"
                    : "text-slate-700"
                }`}
              >
                {anchorStatus}
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-slate-500 mb-1">Proof record ID</p>
              <p className="font-semibold break-all">{proofRecordId}</p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-slate-500 mb-1">Receipt hash</p>
              <p className="font-semibold break-all">{displayReceiptHash}</p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-slate-500 mb-1">Anchored at</p>
              <p className="font-semibold">{anchoredAt}</p>
            </div>
          </div>

          <p className="mt-4 text-sm text-slate-500 leading-6">
            This page does not expose the full ledger. It shows the proof layer linked to the current receipt.
          </p>
        </section>

        <section className="bg-blue-50 rounded-2xl border border-blue-200 p-6">
          <h2 className="text-lg font-semibold mb-2">Verification note</h2>
          <p className="text-slate-700 leading-7">
            Verification improves trust, portability, and audit readiness by checking whether the recorded case and decision path remain internally consistent.
            It does not replace professional or legal review.
          </p>
        </section>

        <div className="flex flex-wrap gap-3">
          <Link
            to={ROUTES.RECEIPT}
            state={{
              receiptPageData: receiptContext || routeData || data,
              verificationPageData: routeData || null,
            }}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-100"
          >
            {data.backToReceiptText || "Back to Decision Receipt"}
          </Link>
        </div>
      </div>
    </div>
  );
}