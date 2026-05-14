import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

import ROUTES from "../routes";

const API_BASE =
  import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000";
const EMAIL_STORAGE_KEY = "nimclea_email";

function normalizeEmail(value = "") {
  return String(value || "").trim().toLowerCase();
}

function isValidEmailIdentity(value = "") {
  const email = normalizeEmail(value);
  return Boolean(email && email.includes("@"));
}

function extractCases(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.cases)) return payload.cases;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function getCaseId(value = {}) {
  return String(
    value?.caseId ||
      value?.case_id ||
      value?.id ||
      value?.caseSnapshot?.caseId ||
      value?.caseSnapshot?.caseRecord?.caseId ||
      ""
  ).trim();
}

function hasRealCase(value = {}) {
  return Boolean(value && typeof value === "object" && getCaseId(value));
}

function readStoredEmail() {
  try {
    const email = normalizeEmail(localStorage.getItem(EMAIL_STORAGE_KEY));
    return isValidEmailIdentity(email) ? email : "";
  } catch {
    return "";
  }
}

function resolveInitialEmail(locationState = {}) {
  const storedEmail = readStoredEmail();
  if (storedEmail) return storedEmail;

  const stateEmail = normalizeEmail(
    locationState?.savedEmail ||
      locationState?.email ||
      locationState?.userEmail ||
      locationState?.lead?.email ||
      ""
  );

  return isValidEmailIdentity(stateEmail) ? stateEmail : "";
}

function writeStoredEmail(email) {
  try {
    localStorage.setItem(EMAIL_STORAGE_KEY, email);
  } catch {
    // Storage is optional for routing; backend lookup remains the authority.
  }
}

function clearCurrentCase() {
  try {
    localStorage.removeItem("nimclea_current_case_id");
  } catch {
    // Ignore storage failures; navigation should still proceed.
  }
}

export default function AccessEntryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialEmail = React.useMemo(
    () => resolveInitialEmail(location.state || {}),
    [location.state]
  );
  const [emailInput, setEmailInput] = React.useState(initialEmail);
  const [lookupEmail, setLookupEmail] = React.useState(initialEmail);
  const [isResolving, setIsResolving] = React.useState(
    isValidEmailIdentity(initialEmail)
  );
  const [emailError, setEmailError] = React.useState("");

  React.useEffect(() => {
    const email = normalizeEmail(lookupEmail);
    if (!isResolving) return undefined;

    if (!isValidEmailIdentity(email)) {
      setIsResolving(false);
      return undefined;
    }

    let cancelled = false;

    async function resolveAccessEntry() {
      try {
        const url = `${API_BASE}/cases?email=${encodeURIComponent(email)}`;

        const response = await fetch(url);
        const payload = await response.json().catch(() => []);

        if (!response.ok) {
          throw new Error(payload?.message || payload?.error || "Could not check cases.");
        }

        if (cancelled) return;

        writeStoredEmail(email);

        const backendCases = extractCases(payload).filter(hasRealCase);
        if (backendCases.length > 0) {
          navigate(ROUTES.CASES, {
            replace: true,
            state: { email },
          });
          return;
        }

        clearCurrentCase();
        navigate(ROUTES.DIAGNOSTIC, {
          replace: true,
          state: { email },
        });
      } catch (error) {
        console.warn("[AccessEntryPage] Failed to resolve email access", error);
        if (!cancelled) {
          setEmailError("Could not check this email. Please try again.");
          setIsResolving(false);
        }
      }
    }

    void resolveAccessEntry();

    return () => {
      cancelled = true;
    };
  }, [isResolving, lookupEmail, navigate]);

  function handleSubmit(event) {
    event.preventDefault();

    const email = normalizeEmail(emailInput);
    if (!isValidEmailIdentity(email)) {
      setEmailError("Enter a valid email to continue.");
      return;
    }

    setEmailError("");
    setLookupEmail(email);
    setIsResolving(true);
  }

  if (isResolving) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
        <section className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-600">Checking workspace...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <section className="mx-auto flex max-w-md justify-center">
        <form
          onSubmit={handleSubmit}
          className="w-full rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
        >
          <div className="mb-8 flex flex-col items-center">
            <div
              style={{
                color: "#0467a5",
                fontSize: "36px",
                fontWeight: "900",
                fontFamily: "Arial Black, Arial, Helvetica, sans-serif",
                WebkitTextStroke: "0.3px #0467a5",
                letterSpacing: "-0.5px",
                lineHeight: 1,
                marginBottom: "28px",
              }}
            >
              Nimclea
            </div>
            <h2
              style={{
                width: "100%",
                fontSize: "16px",
                fontWeight: 600,
                color: "#334155",
                marginBottom: "12px",
                textAlign: "center",
              }}
            >
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
            <div
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "12px",
                marginTop: "8px",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  window.location.href = "https://nimclea.com";
                }}
                className="inline-flex items-center justify-center rounded-full text-sm font-medium transition hover:bg-slate-100"
                style={{
                  backgroundColor: "#FFFFFF",
                  color: "#0F172A",
                  border: "1px solid #CBD5E1",
                  padding: "6px 14px",
                  lineHeight: "1.2",
                }}
              >
                Back
              </button>
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full text-sm font-medium transition"
                style={{
                  backgroundColor: "#0F172A",
                  color: "#FFFFFF",
                  border: "1px solid #0F172A",
                  padding: "6px 14px",
                  lineHeight: "1.2",
                  width: "auto",
                  minWidth: "unset",
                }}
              >
                Continue
              </button>
            </div>
          </div>

          {emailError ? (
            <p className="mt-3 text-left text-xs text-red-600">{emailError}</p>
          ) : null}
        </form>
      </section>
    </main>
  );
}
