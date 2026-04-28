import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ROUTES from "../routes";
import { getAccessMode } from "../utils/accessMode";
import { sanitizeText } from "../lib/sanitizeText";
import { createCaseId, upsertCase, getAllCases } from "../utils/caseRegistry.js";
import { resolveSafeCaseId } from "../utils/caseIdResolver.js";

import {
  getDecisionStabilityLabel,
  getWeakestDimensionDisplay,
} from "../lib/customerDecisionDisplay";

const API_BASE = "http://localhost:3000";
const EMAIL_STORAGE_KEY = "nimclea_email";

function normalizeEmail(value = "") {
  return String(value || "").trim().toLowerCase();
}

function formatEmail(value = "") {
  return String(value || "").trim();
}

async function logCaseEmail({ email, caseId, source }) {
  const trimmedEmail = formatEmail(email);
  if (!trimmedEmail || !caseId) return null;

  try {
    const response = await fetch(`${API_BASE}/email/log`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: trimmedEmail,
        caseId,
        source: source || "cases_page",
      }),
    });

    if (!response.ok) {
      console.warn("Failed to persist case email log", await response.text());
      return null;
    }

    return response.json().catch(() => null);
  } catch (error) {
    console.warn("Failed to persist case email log", error);
    return null;
  }
}

function normalizeCaseItem(item) {
  if (!Array.isArray(item)) return item || {};

  const objectPart = item.find(
    (part) => part && typeof part === "object" && !Array.isArray(part)
  );

  const stringPart = item.find(
    (part) => typeof part === "string" && part.trim().length > 0
  );

  return {
    ...(objectPart || {}),
    caseId:
      objectPart?.caseId ||
      objectPart?.id ||
      objectPart?.case_id ||
      stringPart ||
      "",
    _rawCaseItem: item,
  };
}

function hasNonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0;
}

function hasNonEmptyText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function getDisplayStatus(item) {
  const normalized = normalizeCaseItem(item);
  const eventCount =
    Number(normalized?.eventCount || 0) ||
    (Array.isArray(normalized?.events) ? normalized.events.length : 0);

  if (normalized?.paid || normalized?.paymentStatus === "paid") return "Paid";
  if (normalized?.paymentStatus === "checkout_created") return "Receipt checkout started";
  if (normalized?.receiptEligible) return "Receipt ready";
  if (eventCount > 0) return `Event captured (${eventCount})`;
  return normalized?.status || "draft";
}

function resolveCaseId(item) {
  const normalized = normalizeCaseItem(item);
  return resolveSafeCaseId(normalized);
}

function getCaseDetailRoute(item) {
  const caseIdSafe = resolveCaseId(item);

  if (!caseIdSafe) {
    return "/cases";
  }

  return `/receipt?caseId=${encodeURIComponent(caseIdSafe)}&from=case`;
}

function hasRealEventSignal(item) {
  const normalized = normalizeCaseItem(item);

  const eventCount =
    Number(item?.eventCount || 0) ||
    Number(normalized?.eventCount || 0) ||
    (Array.isArray(item?.events) ? item.events.length : 0) ||
    (Array.isArray(normalized?.events) ? normalized.events.length : 0);

  return eventCount > 0;
}

export default function CasesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedCaseIds, setExpandedCaseIds] = React.useState({});
  const [caseCreationError, setCaseCreationError] = React.useState("");
  const [showSubscriptionOptions, setShowSubscriptionOptions] = React.useState(false);
  const [subscriptionCheckoutError, setSubscriptionCheckoutError] = React.useState("");
  const [startingSubscriptionCheckout, setStartingSubscriptionCheckout] = React.useState(false);

  const [cases, setCases] = React.useState([]);
  const [savedEmail, setSavedEmail] = React.useState("");
  const [emailInput, setEmailInput] = React.useState("");
  const [emailError, setEmailError] = React.useState("");
  const [emailStatus, setEmailStatus] = React.useState("");
  const [loadingCases, setLoadingCases] = React.useState(false);
  const [showNoCaseModal, setShowNoCaseModal] = React.useState(false);

  const loadCasesForEmail = React.useCallback(async (rawEmail, options = {}) => {
    const email = formatEmail(rawEmail);

    if (!email) {
      setEmailError("Enter an email to continue.");
      setEmailStatus("");
      return;
    }

    setLoadingCases(true);
    setEmailError("");
    setEmailStatus("");

    try {
      const response = await fetch(`${API_BASE}/cases?email=${encodeURIComponent(email)}`);

      const payload = await response.json().catch(() => []);

      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || "Could not load cases.");
      }

      const nextCases = Array.isArray(payload) ? payload : [];

      const localCases = getAllCases()
        .flatMap((item) => (Array.isArray(item) ? item : [item]))
        .filter((item) => {
          const caseEmail = String(
            item?.email ||
            item?.lead?.email ||
            item?.ownerEmail ||
            item?.metadata?.email ||
            item?.caseData?.email ||
            item?.caseRecord?.email ||
            item?.trialSession?.email ||
            item?.routeMeta?.email ||
            item?.sourceInput?.email ||
            item?.pilot_setup?.email ||
            item?.pilot_result?.email ||
            item?.caseSnapshot?.email ||
            item?.caseSnapshot?.caseRecord?.email ||
            item?.caseSnapshot?.caseRecord?.caseData?.email ||
            ""
          )
            .trim()
            .toLowerCase();

          return caseEmail === email.trim().toLowerCase();
        });

      const mergedCases = nextCases.length > 0 ? nextCases : localCases;

      if (mergedCases.length === 0) {
        setCases([]);
        setSavedEmail("");
        setEmailInput(email);
        setEmailStatus("");
        setShowNoCaseModal(true);
        localStorage.setItem(EMAIL_STORAGE_KEY, email);
        localStorage.removeItem("nimclea_email_verified");

        return;
      }

      const hydratedCases = mergedCases.map((c) => {
        const events =
          Array.isArray(c.events)
            ? c.events
            : Array.isArray(c.caseSnapshot?.events)
            ? c.caseSnapshot.events
            : [];

        const eventCount =
          Number(c.eventCount || 0) ||
          Number(c.caseSnapshot?.eventCount || 0) ||
          events.length;

        return {
          ...c,
          title:
            c.title ||
            c.caseData?.workflow ||
            c.caseSnapshot?.caseRecord?.caseData?.workflow ||
            c.caseId ||
            "Untitled case",
          events,
          eventCount,
          score: c.score ?? c.caseSnapshot?.caseRecord?.score,
          receiptEligible: Boolean(c.receiptEligible),
          paymentStatus: c.paymentStatus || "",
          paid: Boolean(c.paid),
          status: eventCount > 0 ? "active" : c.status || "draft",
        };
      });

      setCases(hydratedCases);
      setSavedEmail(email);
      setEmailInput(email);
      localStorage.setItem(EMAIL_STORAGE_KEY, email);

    } catch (error) {
      console.warn("Failed to load cases by email", error);
      setCases([]);
      setEmailStatus("");
      setEmailError("Could not load cases. Please try again.");
    } finally {
      setLoadingCases(false);
    }
  }, [navigate]);

  React.useEffect(() => {
    const params = new URLSearchParams(location.search || "");

    if (params.get("checkout") === "success") {
      localStorage.setItem("nimclea_pilot_extension_paid", "true");
      setShowSubscriptionOptions(false);
    }
  }, [location.search]);

  React.useEffect(() => {
    const storedEmail = formatEmail(localStorage.getItem(EMAIL_STORAGE_KEY) || "");

    if (!storedEmail) return;

    setSavedEmail(storedEmail);
    setEmailInput(storedEmail);
    void loadCasesForEmail(storedEmail);
  }, [loadCasesForEmail]);

  const handleContinueWithEmail = React.useCallback(() => {

    const email = formatEmail(emailInput);

    if (!email) {
      setEmailError("Enter an email to continue.");
      return;
    }

    void loadCasesForEmail(email);
  }, [emailInput, loadCasesForEmail, navigate]);

  const handleSwitchEmail = React.useCallback(() => {
    localStorage.removeItem(EMAIL_STORAGE_KEY);
    setSavedEmail("");
    setEmailInput("");
    setCases([]);
    setEmailError("");
    setEmailStatus("");
    setLoadingCases(false);
  }, []);

  const handlePilotExtensionCheckout = React.useCallback(async () => {
    setSubscriptionCheckoutError("");
    setStartingSubscriptionCheckout(true);

    try {
      const response = await fetch(`${API_BASE}/create-checkout-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceType: "pilot_extension",
          email: savedEmail,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload?.url) {
        throw new Error(payload?.message || payload?.error || "Checkout session failed.");
      }

      window.location.href = payload.url;
    } catch (error) {
      console.warn("Failed to start pilot extension checkout", error);
      setSubscriptionCheckoutError("Could not start checkout. Please try again.");
      setStartingSubscriptionCheckout(false);
    }
  }, [savedEmail]);

  const handleCreateNewCase = async () => {

    if (!savedEmail) {
      setCaseCreationError("Enter your email first.");
      return;
    }
    setCaseCreationError("");

    try {
      const createdCase = upsertCase({
        caseId: createCaseId(),
        title: "Untitled case",
        status: "draft",
        currentStep: "pilot_capture",
        source: "cases_page",
        email: savedEmail,
      });

      const newCaseId = createdCase?.caseId;

      if (!newCaseId) {
        setCaseCreationError("Could not create a new case. Please try again.");
        return;
      }

      await logCaseEmail({
        email: savedEmail,
        caseId: newCaseId,
        source: "cases_page",
      });

      navigate(`/pilot/setup?caseId=${encodeURIComponent(newCaseId)}&from=case`, {
        state: {
          caseId: newCaseId,
          email: savedEmail,
          from: "case",
        },
      });
    } catch (error) {
      console.warn("Failed to create case", error);
      setCaseCreationError("Could not create a new case. Please try again.");
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-900 px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-6 pt-10">
        {savedEmail && (
          <header className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Cases</h1>
              {caseCreationError && (
                <p className="mt-2 text-xs font-medium text-red-600">
                  {sanitizeText(caseCreationError)}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <>
                <button
                  type="button"
                  onClick={() => {
                    setSubscriptionCheckoutError("");
                    setShowSubscriptionOptions(true);
                  }}
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

                <button
                  type="button"
                  onClick={handleSwitchEmail}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
                >
                  Switch email
                </button>
              </>
            </div>
          </header>
        )}

        {!savedEmail && (
          <section className="flex justify-center">
            <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mb-6 flex flex-col items-center text-center">
                <h2 className="text-xl font-semibold text-slate-900 whitespace-nowrap">
                  Access your Nimclea workspace
                </h2>
              </div>

              <div className="flex flex-col items-center gap-3">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(event) => setEmailInput(event.target.value)}
                  placeholder="Enter your email"
                  className="w-full rounded-full border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-500"
                />
                <button
                  type="button"
                  onClick={handleContinueWithEmail}
                  className="inline-flex items-center justify-center rounded-full text-sm font-medium transition"
                  style={{
                    backgroundColor: "#0F172A",
                    color: "#FFFFFF",
                    border: "1px solid #0F172A",
                    padding: "10px 14px",
                    lineHeight: "1.2",
                    width: "auto",
                    minWidth: "unset",
                  }}
                >
                  Continue to Cases
                </button>
              </div>

              {emailError ? (
                <p className="mt-3 text-left text-xs text-red-600">
                  {sanitizeText(emailError)}
                </p>
              ) : null}

              {emailStatus ? (
                <p className="mt-3 text-left text-xs text-slate-500">
                  {sanitizeText(emailStatus)}
                </p>
              ) : null}
            </div>
          </section>
        )}

        {loadingCases ? (
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <p className="text-slate-600">Loading cases...</p>
          </section>
        ) : cases.length === 0 ? null : (
          <section className="space-y-3">
            {cases.map((item, index) => {
              const normalizedItem = normalizeCaseItem(item);
              const caseId = normalizedItem?.caseId || normalizedItem?.case_id || normalizedItem?.id || "";
              const accessMode = getAccessMode(normalizedItem);
              const isPaid = accessMode === "paid";
              const caseSchema = normalizedItem?.caseSchema || normalizedItem?.caseData || normalizedItem || {};
              const pilotResult = normalizedItem?.pilot_result || normalizedItem?.pilotResult || {};
              const receiptBillingStatus = normalizedItem?.caseBilling?.receiptActivated
                ? "Activated"
                : "Preview";
              const verificationBillingStatus = normalizedItem?.caseBilling?.verificationActivated
                ? "Activated"
                : "Preview";
              const scopeLock = normalizedItem?.scopeLock || null;
              const acceptanceChecklist = Array.isArray(normalizedItem?.acceptanceChecklist)
                ? normalizedItem.acceptanceChecklist
                : [];
              const detailPath = getCaseDetailRoute(normalizedItem);
              const caseKey = caseId || normalizedItem?.id || normalizedItem?.caseId || normalizedItem?.resultId || String(index);
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
                          {sanitizeText(item?.title, "Untitled case")}
                        </h2>
                        <p className="mt-1 text-xs font-medium text-slate-500">
                          {isPaid ? "Formal case record" : "Trial workspace"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                      <p>Status: {sanitizeText(getDisplayStatus(normalizedItem))}</p>
                      {isExpanded && (
                        <>
                          <p>{sanitizeText(getDecisionStabilityLabel(item?.score))}</p>
                          <p>Where it is weakest: {sanitizeText(getWeakestDimensionDisplay(item?.weakestDimension))}</p>
                          <p>Updated: {sanitizeText(item?.updatedAt, "N/A")}</p>
                          <p>Receipt: {sanitizeText(isPaid ? receiptBillingStatus : "Preview only")}</p>
                          <p>Verification: {sanitizeText(isPaid ? verificationBillingStatus : "Not activated")}</p>
                        </>
                      )}
                    </div>

                    {isExpanded && (
                      <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 text-xs text-slate-600">
                        <div>
                          <h3 className="font-semibold text-slate-800">Scope Lock</h3>
                          <p className="mt-1 leading-5">
                            {sanitizeText(scopeLock?.scopeStatement, "No scope lock recorded yet.")}
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
                                      {sanitizeText(check?.label, "Checklist item")}
                                    </span>
                                    <span
                                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeClass}`}
                                    >
                                      {sanitizeText(decision, "UNKNOWN")}
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

                        const resolvedCaseId = resolveCaseId(normalizedItem);
                        const targetPath = getCaseDetailRoute(normalizedItem);

                        if (!resolvedCaseId) {
                          console.warn("[CasePage] Missing resolvedCaseId for case item", normalizedItem);
                        }

                        console.log("[CasePage] detail route", {
                          resolvedCaseId,
                          fullItem: normalizedItem,
                          rawItem: item,
                          hasRealEvent: hasRealEventSignal(normalizedItem),
                          events: normalizedItem?.events,
                          eventLogs: normalizedItem?.eventLogs,
                          structuredEvents: normalizedItem?.structuredEvents,
                          caseEvents: normalizedItem?.caseEvents,
                          entries: normalizedItem?.entries,
                          pilotEntries: normalizedItem?.pilotEntries,
                          eventEntries: normalizedItem?.eventEntries,
                          captureRecords: normalizedItem?.captureRecords,
                          captures: normalizedItem?.captures,
                          rawEventText: normalizedItem?.rawEventText,
                          eventText: normalizedItem?.eventText,
                          captureText: normalizedItem?.captureText,
                          userEventText: normalizedItem?.userEventText,
                          caseText: normalizedItem?.caseText,
                          inputText: normalizedItem?.inputText,
                          description: normalizedItem?.description,
                          targetPath,
                        });

                        navigate(targetPath, {
                          state: {
                            caseId: resolvedCaseId,
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

      {showNoCaseModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99998,
            backgroundColor: "rgba(15, 23, 42, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "420px",
              backgroundColor: "#FFFFFF",
              borderRadius: "24px",
              border: "1px solid #E2E8F0",
              boxShadow: "0 24px 80px rgba(15, 23, 42, 0.20)",
              padding: "22px",
            }}
          >
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#0F172A" }}>
              No case found yet
            </h2>

            <p style={{ margin: "10px 0 0 0", fontSize: "14px", lineHeight: 1.6, color: "#475569" }}>
              This email does not have an existing case. Start a diagnostic first to create one.
            </p>

            <div style={{ marginTop: "18px", display: "flex", justifyContent: "flex-end", gap: "10px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setShowNoCaseModal(false)}
                style={{
                  border: "1px solid #CBD5E1",
                  background: "#FFFFFF",
                  color: "#334155",
                  borderRadius: "999px",
                  padding: "9px 14px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowNoCaseModal(false);
                  localStorage.setItem(EMAIL_STORAGE_KEY, emailInput);
                  localStorage.removeItem("nimclea_email_verified");
                  navigate(ROUTES.DIAGNOSTIC);
                }}
                style={{
                  border: "1px solid #0F172A",
                  background: "#0F172A",
                  color: "#FFFFFF",
                  borderRadius: "999px",
                  padding: "9px 14px",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Start Diagnostic
              </button>
            </div>
          </div>
        </div>
      )}

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
                onClick={() => {
                  setSubscriptionCheckoutError("");
                  setShowSubscriptionOptions(false);
                }}
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
                  $9 first month
                </p>

                <p
                  style={{
                    margin: "4px 0 0 0",
                    fontSize: "13px",
                    color: "#94A3B8",
                    textDecoration: "line-through",
                  }}
                >
                  Then $79/month
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
                  <div>- Continue your current cases</div>
                  <div>- Up to 3 active cases in the first month</div>
                  <div>- Unlimited pilot sessions</div>
                  <div>- Continuous result tracking</div>
                  <div>- Internal case memory</div>
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
                  onClick={handlePilotExtensionCheckout}
                  disabled={startingSubscriptionCheckout}
                  className="inline-flex items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-xs font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100"
                  style={{ marginTop: "16px" }}
                >
                  {startingSubscriptionCheckout ? "Starting checkout..." : "Continue for $9"}
                </button>
                {subscriptionCheckoutError ? (
                  <p
                    style={{
                      margin: "10px 0 0 0",
                      fontSize: "12px",
                      lineHeight: 1.5,
                      color: "#DC2626",
                    }}
                  >
                    {sanitizeText(subscriptionCheckoutError)}
                  </p>
                ) : null}
              </div>

            </div>

          </div>
        </div>
      )}
    </div>
  );
}
