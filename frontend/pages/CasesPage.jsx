import React from "react";
import { useNavigate } from "react-router-dom";
import ROUTES from "../routes";
import { getAccessMode } from "../utils/accessMode";
import { createCaseId, getAllCases, upsertCase } from "../utils/caseRegistry.js";

function getCaseDetailRoute(item) {
  const caseIdSafe = item?.id || item?.caseId || item?.case_id || item?.resultId || "";

  const status = item?.status || "";
  const hasEvents =
    Array.isArray(item?.events) && item.events.length > 0;
  const hasPilotResult =
    status === "pilot_result_ready" ||
    status === "workspace_summary" ||
    Boolean(item?.pilotResult || item?.pilot_result);
  const hasSummary = Boolean(
    item?.workspace_summary ||
    item?.workspaceSummary ||
    item?.pilot_result ||
    item?.pilotResult
  );
  const hasReceipt = Boolean(
    item?.receiptHash ||
    item?.receipt?.hash ||
    item?.receiptGenerated ||
    item?.caseBilling?.receiptActivated
  );
  const hasVerification = Boolean(
    item?.verificationHash ||
    item?.verification?.verificationHash ||
    item?.verificationDone ||
    item?.caseBilling?.verificationActivated
  );

  let route = ROUTES.PILOT_RESULT || "/pilot-result";

  if (hasVerification || status === "verification_done" || status === "verification_ready") {
    route = ROUTES.VERIFICATION || "/verification";
  } else if (hasReceipt || status === "receipt_ready") {
    route = ROUTES.RECEIPT || "/receipt";
  } else if (hasSummary || status === "pilot_summary_ready") {
    route = ROUTES.PILOT_RESULT || "/pilot-result";
  } else if (hasEvents || hasPilotResult) {
    route = ROUTES.PILOT_RESULT || "/pilot-result";
  } else if (status === "result_ready" || status === "draft") {
    route = ROUTES.PILOT || "/pilot";
  }

  return caseIdSafe
    ? `${route}?caseId=${encodeURIComponent(caseIdSafe)}`
    : route;
}

export default function CasesPage() {
  const navigate = useNavigate();
  const [expandedCaseIds, setExpandedCaseIds] = React.useState({});
  const [caseCreationError, setCaseCreationError] = React.useState("");
  const [showSubscriptionOptions, setShowSubscriptionOptions] = React.useState(false);

  const cases = React.useMemo(() => {
    try {
      const list = getAllCases();
      return Array.isArray(list) ? list : [];
    } catch (error) {
      console.warn("Failed to read cases", error);
      return [];
    }
  }, []);

  const handleCreateNewCase = () => {
    setCaseCreationError("");

    try {
      const createdCase = upsertCase({
        caseId: createCaseId(),
        title: "Untitled case",
        status: "draft",
        currentStep: "pilot_capture",
        source: "cases_page",
      });

      const newCaseId = createdCase?.caseId;

      if (!newCaseId) {
        setCaseCreationError("Could not create a new case. Please try again.");
        return;
      }

      navigate(`${ROUTES.PILOT || "/pilot"}?caseId=${newCaseId}`);
    } catch (error) {
      console.warn("Failed to create case", error);
      setCaseCreationError("Could not create a new case. Please try again.");
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-900 px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-6 pt-10">
        <header className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Cases</h1>
            {caseCreationError && (
              <p className="mt-2 text-xs font-medium text-red-600">
                {caseCreationError}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowSubscriptionOptions(true)}
              className="inline-flex items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-700 hover:bg-amber-100 transition"
            >
              View Subscription Options
            </button>
            <button
              type="button"
              onClick={handleCreateNewCase}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
            >
              + Create new case
            </button>
          </div>
        </header>

        {cases.length === 0 ? (
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <p className="text-slate-600">No cases yet.</p>
          </section>
        ) : (
          <section className="space-y-3">
            {cases.map((item, index) => {
              const caseId = item?.caseId || item?.case_id || item?.id || "";
              const accessMode = getAccessMode(item);
              const isPaid = accessMode === "paid";
              const caseSchema = item?.caseSchema || item?.caseData || item || {};
              const pilotResult = item?.pilot_result || item?.pilotResult || {};
              const receiptBillingStatus = item?.caseBilling?.receiptActivated
                ? "Activated"
                : "Preview";
              const verificationBillingStatus = item?.caseBilling?.verificationActivated
                ? "Activated"
                : "Preview";
              const scopeLock = item?.scopeLock || null;
              const acceptanceChecklist = Array.isArray(item?.acceptanceChecklist)
                ? item.acceptanceChecklist
                : [];
              const detailPath = getCaseDetailRoute(item);
              const caseKey = caseId || item?.id || item?.caseId || item?.resultId || String(index);
              const isExpanded = Boolean(expandedCaseIds[caseKey]);

              return (
              <article
                key={caseId || item?.id || Math.random()}
                className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedCaseIds((prev) => ({
                            ...prev,
                            [caseKey]: !prev[caseKey],
                          }))
                        }
                        className="mt-1 flex-shrink-0 text-black"
                        aria-label="Toggle case details"
                      >
                      <span
                          style={{
                            display: "inline-block",
                            transition: "transform 0.2s ease",
                            transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                          }}
                        >
                          ▶
                        </span>
                      </button>

                      <div className="min-w-0">
                        <h2 className="text-lg font-semibold text-slate-900">
                          {item?.title || "Untitled case"}
                        </h2>
                        <p className="mt-1 text-xs font-medium text-slate-500">
                          {isPaid ? "Formal case record" : "Trial workspace"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                      <p>Status: {item?.status || "draft"}</p>
                      {isExpanded && (
                        <>
                          <p>Score: {item?.score ?? "N/A"}</p>
                          <p>Weakest dimension: {item?.weakestDimension || "N/A"}</p>
                          <p>Updated: {item?.updatedAt || "N/A"}</p>
                          <p>Receipt: {isPaid ? receiptBillingStatus : "Preview only"}</p>
                          <p>Verification: {isPaid ? verificationBillingStatus : "Not activated"}</p>
                        </>
                      )}
                    </div>

                    {isExpanded && (
                      <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 text-xs text-slate-600">
                        <div>
                          <h3 className="font-semibold text-slate-800">Scope Lock</h3>
                          <p className="mt-1 leading-5">
                            {scopeLock?.scopeStatement || "No scope lock recorded yet."}
                          </p>
                        </div>

                        <div>
                          <h3 className="font-semibold text-slate-800">Acceptance Checklist</h3>
                          {acceptanceChecklist.length > 0 ? (
                            <div className="mt-2 space-y-1.5">
                              {acceptanceChecklist.map((check) => {
                                const decision = check?.decision || "";
                                const badgeClass =
                                  decision === "PASS"
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : decision === "BLOCK"
                                    ? "border-red-200 bg-red-50 text-red-700"
                                    : decision === "NEEDS_INPUT"
                                    ? "border-amber-200 bg-amber-50 text-amber-700"
                                    : "border-slate-200 bg-slate-50 text-slate-600";

                                return (
                                  <div
                                    key={check?.id || check?.label || decision}
                                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2"
                                  >
                                    <span className="min-w-0 leading-5 text-slate-700">
                                      {check?.label || "Checklist item"}
                                    </span>
                                    <span
                                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeClass}`}
                                    >
                                      {decision || "UNKNOWN"}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="mt-1 leading-5">
                              No acceptance checklist recorded yet.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <a
                      href={detailPath}
                      onClick={(event) => {
                        event.preventDefault();
                        const targetPath = getCaseDetailRoute(item);
                        console.log("[CasePage] detail route", {
                          caseId: item.id,
                          status: item.status,
                          hasReceipt: Boolean(item.receipt),
                          hasPilotResult: Boolean(item.pilotResult),
                          hasResult: Boolean(item.result),
                          targetPath,
                        });

                        navigate(targetPath, {
                          state: {
                            caseId: item.id,
                          },
                        });
                      }}
                      className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
                      style={{
                        height: "28px",
                        minHeight: "28px",
                        maxHeight: "28px",
                        padding: "0 14px",
                        lineHeight: "1",
                      }}
                    >
                      Detail
                    </a>
                  </div>
                </div>
              </article>
            );
            })}
          </section>
        )}
      </div>

      {showSubscriptionOptions && (
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
              width: "fit-content",
              maxWidth: "calc(100vw - 80px)",
              maxHeight: "90vh",
              overflowY: "auto",
              backgroundColor: "#ffffff",
              borderRadius: "24px",
              boxShadow: "0 24px 80px rgba(15, 23, 42, 0.18)",
              padding: "18px 18px 14px 18px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "16px",
                marginBottom: "14px",
                paddingLeft: "8px",
                paddingRight: "8px",
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: "20px",
                    fontWeight: 700,
                    color: "#0F172A",
                  }}
                >
                  Choose how to continue
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setShowSubscriptionOptions(false)}
                aria-label="Close subscription options"
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#94A3B8",
                  fontSize: "24px",
                  lineHeight: 1,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                }}
              >
                x
              </button>
            </div>

            <div
              style={{
                display: "flex",
                gap: "16px",
                overflowX: "auto",
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
                <h3
                  style={{
                    margin: 0,
                    fontSize: "20px",
                    fontWeight: 700,
                    color: "#0F172A",
                  }}
                >
                  Founding Access
                </h3>

                <p
                  style={{
                    margin: "8px 0 0 0",
                    fontSize: "14px",
                    lineHeight: 1.6,
                    color: "#475569",
                  }}
                >
                  For continuous decision work inside the system.
                </p>

                <p
                  style={{
                    margin: "12px 0 0 0",
                    fontSize: "28px",
                    fontWeight: 700,
                    color: "#0F172A",
                  }}
                >
                  $99 / month
                </p>

                <p
                  style={{
                    margin: "4px 0 0 0",
                    fontSize: "13px",
                    color: "#94A3B8",
                    textDecoration: "line-through",
                  }}
                >
                  Regular price $199
                </p>

                <div
                  style={{
                    marginTop: "14px",
                    fontSize: "14px",
                    lineHeight: 1.7,
                    color: "#334155",
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: "4px" }}>Includes</div>
                  <div>- Unlimited pilot sessions</div>
                  <div>- Unlimited result access</div>
                  <div>- Internal case tracking</div>
                  <div>- Analytics and history</div>
                  <div>- Export Record (.txt)</div>
                  <div>- Preview of receipt & verification states</div>
                </div>

                <div
                  style={{
                    marginTop: "12px",
                    fontSize: "14px",
                    lineHeight: 1.7,
                    color: "#64748B",
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: "4px" }}>Does not include</div>
                  <div>- Formal Receipt issuance</div>
                  <div>- Formal Verification packages</div>
                  <div>- Exportable proof</div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowSubscriptionOptions(false)}
                  className="inline-flex items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-xs font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100"
                  style={{ marginTop: "16px" }}
                >
                  Start workspace
                </button>
              </div>

            </div>

          </div>
        </div>
      )}
    </div>
  );
}
