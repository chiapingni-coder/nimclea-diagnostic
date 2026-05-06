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

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://nimclea-api.onrender.com";
const EMAIL_STORAGE_KEY = "nimclea_email";
const ARCHIVED_CASE_IDS_KEY = "nimclea_archived_case_ids";

function getArchivedCaseIds() {
  try {
    const raw = localStorage.getItem(ARCHIVED_CASE_IDS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function saveArchivedCaseIds(caseIds = []) {
  try {
    const safeIds = Array.from(new Set(caseIds.filter(Boolean)));
    localStorage.setItem(ARCHIVED_CASE_IDS_KEY, JSON.stringify(safeIds));
    return safeIds;
  } catch {
    return [];
  }
}

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

const NON_EVIDENCE_EVENT_TYPES = new Set([
  "entry_viewed",
  "entry_clicked",
  "diagnostic_started",
  "diagnostic_completed",
  "diagnostic_submitted",
  "result_viewed",
  "case_viewed",
  "case_opened",
  "cases_viewed",
  "access_continue_clicked",
  "receipt_viewed",
  "verification_viewed",
  "pilot_setup_viewed",
  "page_viewed",
  "score_computed",
  "deterministic_score",
]);

function getCaseEventType(event = {}) {
  return String(
    event?.eventType ||
      event?.type ||
      event?.selectedEventType ||
      event?.meta?.eventType ||
      event?.meta?.selectedEventType ||
      ""
  )
    .trim()
    .toLowerCase();
}

function getEventCaseId(event = {}) {
  if (!event || typeof event !== "object") return "";

  return String(
    event?.caseId ||
      event?.case_id ||
      event?.metadata?.caseId ||
      event?.metadata?.case_id ||
      event?.meta?.caseId ||
      event?.meta?.case_id ||
      event?.id ||
      ""
  ).trim();
}

function hasRealEvidenceText(event = {}) {
  return (
    hasNonEmptyText(event?.rawEventText) ||
    hasNonEmptyText(event?.eventText) ||
    hasNonEmptyText(event?.captureText) ||
    hasNonEmptyText(event?.userEventText) ||
    hasNonEmptyText(event?.meta?.rawEventText) ||
    hasNonEmptyText(event?.meta?.eventText) ||
    hasNonEmptyText(event?.meta?.captureText) ||
    hasNonEmptyText(event?.meta?.userEventText)
  );
}

function isEvidenceEventType(eventType = "") {
  const normalizedType = String(eventType || "").toLowerCase();

  return (
    normalizedType === "routed_input" ||
    normalizedType === "quick_capture" ||
    normalizedType === "quick_capture_submitted" ||
    normalizedType === "receipt_quick_capture" ||
    normalizedType === "event_capture" ||
    normalizedType === "resource_control_request" ||
    normalizedType === "structured_event_submitted" ||
    normalizedType === "pilot_entry_submitted" ||
    normalizedType === "pilot_result_submitted" ||
    normalizedType === "pilot_event" ||
    normalizedType === "workflow_event" ||
    normalizedType === "case_event" ||
    normalizedType === "structured_event" ||
    normalizedType.includes("capture")
  );
}

function isRealEvidenceEvent(event = {}, currentCaseId = "") {
  if (!event || typeof event !== "object") return false;

  const eventType = getCaseEventType(event);
  const page = String(event?.page || event?.meta?.page || "").toLowerCase();
  const source = String(event?.source || event?.meta?.source || "").toLowerCase();
  const eventCaseId = getEventCaseId(event);
  const normalizedCurrentCaseId = String(currentCaseId || "").trim();

  if (!normalizedCurrentCaseId) return false;
  if (!eventCaseId || eventCaseId !== normalizedCurrentCaseId) return false;

  if (eventType && NON_EVIDENCE_EVENT_TYPES.has(eventType)) return false;
  if (page.includes("diagnostic") && eventType.startsWith("entry_")) return false;
  if (eventType.startsWith("diagnostic_")) return false;

  const evidenceSources = new Set([
    "quick_capture",
    "pilot_setup",
    "receipt_quick_capture",
    "event_capture",
  ]);

  if (hasRealEvidenceText(event)) return true;
  if (evidenceSources.has(source)) return true;
  if (String(event?.id || "").startsWith("entry_")) return true;
  if (!eventType) return false;

  return isEvidenceEventType(eventType);
}

function getEventDedupeKey(event = {}) {
  if (!event || typeof event !== "object") return "";

  const eventType = getCaseEventType(event);
  const stableId =
    event?.eventId ||
    event?.event_id ||
    event?.id ||
    event?.quickCaptureId ||
    event?.quick_capture_id ||
    event?.meta?.eventId ||
    event?.meta?.quickCaptureId ||
    "";

  if (stableId) return String(stableId);

  return [
    event?.timestamp || event?.createdAt || event?.submittedAt || "",
    eventType,
  ].join(":");
}

function getEvidenceEvents(item = {}) {
  const normalized = normalizeCaseItem(item);
  const currentCaseId = resolveCaseId(normalized);
  const seen = new Set();

  return [
    ...(Array.isArray(item?.events) ? item.events : []),
    ...(Array.isArray(item?.eventLogs) ? item.eventLogs : []),
    ...(Array.isArray(item?.eventHistory) ? item.eventHistory : []),
    ...(Array.isArray(normalized?.events) ? normalized.events : []),
    ...(Array.isArray(normalized?.eventLogs) ? normalized.eventLogs : []),
    ...(Array.isArray(normalized?.eventHistory) ? normalized.eventHistory : []),
    ...(Array.isArray(normalized?.caseData?.eventHistory) ? normalized.caseData.eventHistory : []),
    ...(Array.isArray(normalized?.structuredEvents) ? normalized.structuredEvents : []),
    ...(Array.isArray(normalized?.caseEvents) ? normalized.caseEvents : []),
    ...(Array.isArray(normalized?.entries) ? normalized.entries : []),
    ...(Array.isArray(normalized?.pilotEntries) ? normalized.pilotEntries : []),
    ...(Array.isArray(normalized?.eventEntries) ? normalized.eventEntries : []),
    ...(Array.isArray(normalized?.captureRecords) ? normalized.captureRecords : []),
    ...(Array.isArray(normalized?.captures) ? normalized.captures : []),
    ...(Array.isArray(normalized?.caseSnapshot?.events) ? normalized.caseSnapshot.events : []),
    ...(Array.isArray(normalized?.caseSnapshot?.eventLogs) ? normalized.caseSnapshot.eventLogs : []),
    ...(Array.isArray(normalized?.caseSnapshot?.eventHistory) ? normalized.caseSnapshot.eventHistory : []),
    ...(Array.isArray(normalized?.caseSnapshot?.caseRecord?.events) ? normalized.caseSnapshot.caseRecord.events : []),
    ...(Array.isArray(normalized?.caseSnapshot?.caseRecord?.eventLogs) ? normalized.caseSnapshot.caseRecord.eventLogs : []),
    ...(Array.isArray(normalized?.caseSnapshot?.caseRecord?.eventHistory) ? normalized.caseSnapshot.caseRecord.eventHistory : []),
    ...(Array.isArray(normalized?.caseSnapshot?.caseRecord?.caseData?.eventHistory) ? normalized.caseSnapshot.caseRecord.caseData.eventHistory : []),
  ].filter((event) => {
    if (!isRealEvidenceEvent(event, currentCaseId)) return false;
    const dedupeKey = getEventDedupeKey(event) || event;
    if (seen.has(dedupeKey)) return false;
    seen.add(dedupeKey);
    return true;
  });
}

async function hydrateCaseDetails(cases = []) {
  const detailCache = new Map();

  return Promise.all(
    cases.map(async (caseItem) => {
      const caseId = resolveCaseId(caseItem);

      if (!caseId) return caseItem;

      try {
        if (!detailCache.has(caseId)) {
          detailCache.set(
            caseId,
            fetch(`${API_BASE}/case/${encodeURIComponent(caseId)}`)
              .then((response) =>
                response.ok ? response.json().catch(() => ({})) : null
              )
              .then((payload) => payload?.data || null)
              .catch((error) => {
                console.warn("Failed to hydrate case detail", caseId, error);
                return null;
              })
          );
        }

        const detail = await detailCache.get(caseId);

        if (!detail || typeof detail !== "object") return caseItem;

        return {
          ...caseItem,
          ...detail,
          caseId,
          id: caseItem?.id || detail?.id || caseId,
          caseData: {
            ...(caseItem?.caseData || {}),
            ...(detail?.caseData || {}),
            eventHistory:
              detail?.caseData?.eventHistory ||
              caseItem?.caseData?.eventHistory ||
              [],
          },
          events: Array.isArray(detail?.events) ? detail.events : caseItem?.events,
          eventLogs: Array.isArray(detail?.eventLogs)
            ? detail.eventLogs
            : caseItem?.eventLogs,
          eventHistory: Array.isArray(detail?.eventHistory)
            ? detail.eventHistory
            : caseItem?.eventHistory,
          receiptStatus:
            detail?.receiptStatus ?? caseItem?.receiptStatus,
          verificationStatus:
            detail?.verificationStatus ?? caseItem?.verificationStatus,
          currentStep:
            detail?.currentStep ?? caseItem?.currentStep,
          status:
            detail?.status ?? caseItem?.status,
        };
      } catch (error) {
        console.warn("Failed to hydrate case detail", caseId, error);
        return caseItem;
      }
    })
  );
}

function isDiagnosticContinuationCase(item = {}) {
  const normalized = normalizeCaseItem(item);
  const caseData = normalized?.caseData || normalized?.caseSchema || {};
  const pilotResult = normalized?.pilot_result || normalized?.pilotResult || {};
  const caseIdSafe = resolveCaseId(normalized);
  const evidenceEventCount = getEvidenceEvents(normalized).length;
  const continuationStates = new Set([
    "diagnostic_completed",
    "result_ready",
    "result",
    "diagnostic",
  ]);
  const status = String(normalized?.status || caseData?.status || "").toLowerCase();
  const stage = String(
    normalized?.stage ||
      normalized?.stageLabel ||
      caseData?.stage ||
      caseData?.stageLabel ||
      ""
  ).toLowerCase();
  const currentStep = String(
    normalized?.currentStep ||
      normalized?.step ||
      caseData?.currentStep ||
      caseData?.step ||
      ""
  ).toLowerCase();
  const hasPilotResult =
    Boolean(pilotResult?.result) ||
    (Array.isArray(pilotResult?.entries) && pilotResult.entries.length > 0) ||
    (Array.isArray(pilotResult?.events) && pilotResult.events.length > 0);
  const hasContinuationState =
    continuationStates.has(status) ||
    continuationStates.has(stage) ||
    continuationStates.has(currentStep);

  return Boolean(
    caseIdSafe &&
      (evidenceEventCount === 0 || !hasRealEventSignal(normalized)) &&
      !hasActivatedReceipt(normalized) &&
      !hasActivatedVerification(normalized) &&
      !hasPilotResult &&
      (hasDiagnosticResultData(normalized) || hasContinuationState)
  );
}

function getDisplayStatus(item) {
  const normalized = normalizeCaseItem(item);
  const evidenceEventCount = getEvidenceEvents(normalized).length;

  if (normalized?.paid || normalized?.paymentStatus === "paid") return "Paid";
  if (normalized?.paymentStatus === "checkout_created") return "Receipt checkout started";
  if (normalized?.receiptEligible) return "Receipt ready";
  if (evidenceEventCount > 0) return `Event captured (${evidenceEventCount})`;
  if (isDiagnosticContinuationCase(normalized)) return "Diagnostic completed";
  return normalized?.status || "draft";
}

function resolveCaseId(item) {
  const normalized = normalizeCaseItem(item);
  return resolveSafeCaseId(normalized);
}

function hasDiagnosticResultData(item) {
  const normalized = normalizeCaseItem(item);
  const caseData = normalized?.caseData || normalized?.caseSchema || normalized || {};

  return Boolean(
    normalized?.result ||
      normalized?.preview ||
      normalized?.diagnostic ||
      normalized?.diagnosticResult ||
      normalized?.caseSnapshot?.caseRecord ||
      normalized?.pilot_result ||
      normalized?.pilotResult ||
      normalized?.resultId ||
      caseData?.result ||
      caseData?.preview ||
      caseData?.scenario ||
      caseData?.scenarioCode ||
      caseData?.scenarioLabel ||
      caseData?.stage ||
      caseData?.score != null ||
      caseData?.normalizedScore != null ||
      hasNonEmptyArray(caseData?.signals) ||
      hasNonEmptyArray(caseData?.top_signals) ||
      hasNonEmptyArray(caseData?.topSignals)
  );
}

function getCaseDetailRoute(item) {
  const caseIdSafe = resolveCaseId(item);

  if (!caseIdSafe) {
    return "/cases";
  }

  const encodedCaseId = encodeURIComponent(caseIdSafe);

  if (!hasDiagnosticResultData(item)) {
    return `${ROUTES.DIAGNOSTIC}?caseId=${encodedCaseId}`;
  }

  if (!hasRealEventSignal(item)) {
    return `${ROUTES.RESULT}?caseId=${encodedCaseId}`;
  }

  if (hasActivatedReceipt(item)) {
    return `${ROUTES.VERIFICATION}?caseId=${encodedCaseId}`;
  }

  return `${ROUTES.RECEIPT}?caseId=${encodedCaseId}`;
}

function hasRealEventSignal(item) {
  const normalized = normalizeCaseItem(item);
  const evidenceEventCount = getEvidenceEvents(normalized).length;

  return (
    evidenceEventCount > 0 ||
    hasNonEmptyText(normalized?.rawEventText) ||
    hasNonEmptyText(normalized?.eventText) ||
    hasNonEmptyText(normalized?.captureText) ||
    hasNonEmptyText(normalized?.userEventText)
  );
}

function hasPostDiagnosticProgress(item) {
  const normalized = normalizeCaseItem(item);
  const pilotResult = normalized?.pilot_result || normalized?.pilotResult || {};
  const pilotEvidenceEventCount = getEvidenceEvents({
    ...normalized,
    events: Array.isArray(pilotResult?.events) ? pilotResult.events : [],
    entries: Array.isArray(pilotResult?.entries) ? pilotResult.entries : [],
  }).length;
  const postDiagnosticStatuses = [
    "workspace_summary",
    "receipt_ready",
    "verification_ready",
    "receipt_activated",
    "verification_activated",
    "paid",
  ];
  const postDiagnosticSteps = [
    "pilot",
    "pilot_setup",
    "pilot_result",
    "receipt",
    "verification",
  ];

  return Boolean(
    hasRealEventSignal(normalized) ||
      pilotResult?.result ||
      pilotEvidenceEventCount > 0 ||
      normalized?.receipt ||
      normalized?.verification ||
      postDiagnosticSteps.includes(String(normalized?.currentStep || "").toLowerCase()) ||
      postDiagnosticStatuses.includes(String(normalized?.status || "").toLowerCase())
  );
}

function isEmptyDraftCase(item) {
  const normalized = normalizeCaseItem(item);

  return (
    normalized?.status === "draft" &&
    !hasDiagnosticResultData(normalized) &&
    !hasPostDiagnosticProgress(normalized)
  );
}

function isVisibleActiveCase(item) {
  return !isEmptyDraftCase(item);
}

function hasActivatedReceipt(item) {
  const normalized = normalizeCaseItem(item);
  const receiptStatus = String(
    normalized?.receiptStatus ||
      normalized?.receipt?.status ||
      normalized?.payment?.receiptStatus ||
      normalized?.paymentStatus ||
      ""
  ).toLowerCase();
  const paymentStatus = String(
    normalized?.payment?.status ||
      normalized?.caseBilling?.receiptStatus ||
      ""
  ).toLowerCase();

  return Boolean(
    normalized?.caseBilling?.receiptActivated === true ||
      normalized?.payment?.receiptActivated === true ||
      normalized?.payment?.receiptPaid === true ||
      normalized?.receipt?.paid === true ||
      normalized?.receiptPaid === true ||
      normalized?.paidReceipt === true ||
      normalized?.formalReceiptUnlocked === true ||
      normalized?.paid === true ||
      normalized?.isPaid === true ||
      receiptStatus === "paid" ||
      receiptStatus === "activated" ||
      paymentStatus === "paid"
  );
}

function hasActivatedVerification(item = {}) {
  const normalized = normalizeCaseItem(item);
  const verificationStatus = String(
    normalized?.verificationStatus ||
      normalized?.verification?.status ||
      normalized?.payment?.verificationStatus ||
      normalized?.caseBilling?.verificationStatus ||
      ""
  ).toLowerCase();

  return Boolean(
    normalized?.caseBilling?.verificationActivated === true ||
      normalized?.payment?.verificationActivated === true ||
      normalized?.verification?.paid === true ||
      normalized?.verificationPaid === true ||
      normalized?.paidVerification === true ||
      normalized?.formalVerificationUnlocked === true ||
      verificationStatus === "paid" ||
      verificationStatus === "activated" ||
      verificationStatus === "ready" ||
      verificationStatus === "pass" ||
      verificationStatus === "passed" ||
      verificationStatus === "final"
  );
}

function resolveEmailFromCaseId(caseId = "") {
  if (!caseId) return "";

  const allCases = getAllCases().flatMap((item) =>
    Array.isArray(item) ? item : [item]
  );

  const found = allCases.find((item) => {
    const normalized = normalizeCaseItem(item);
    const itemCaseId =
      normalized?.caseId ||
      normalized?.case_id ||
      normalized?.id ||
      "";

    return String(itemCaseId) === String(caseId);
  });

  return formatEmail(
    found?.email ||
      found?.lead?.email ||
      found?.ownerEmail ||
      found?.metadata?.email ||
      found?.caseData?.email ||
      found?.caseRecord?.email ||
      found?.trialSession?.email ||
      found?.routeMeta?.email ||
      found?.sourceInput?.email ||
      found?.pilot_setup?.email ||
      found?.pilot_result?.email ||
      found?.caseSnapshot?.email ||
      found?.caseSnapshot?.caseRecord?.email ||
      found?.caseSnapshot?.caseRecord?.caseData?.email ||
      ""
  );
}

export default function CasesPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const resolvedCaseId =
    location.state?.caseId ||
    location.state?.case_id ||
    localStorage.getItem("nimclea_current_case_id") ||
    "";
  const resolvedEmail =
    location.state?.email ||
    location.state?.userEmail ||
    localStorage.getItem(EMAIL_STORAGE_KEY) ||
    resolveEmailFromCaseId(
      location.state?.caseId ||
        location.state?.case_id ||
        localStorage.getItem("nimclea_current_case_id") ||
        ""
    ) ||
    "";
  const [expandedCaseIds, setExpandedCaseIds] = React.useState({});
  const [caseCreationError, setCaseCreationError] = React.useState("");
  const [showSubscriptionOptions, setShowSubscriptionOptions] = React.useState(false);
  const [subscriptionCheckoutError, setSubscriptionCheckoutError] = React.useState("");
  const [startingSubscriptionCheckout, setStartingSubscriptionCheckout] = React.useState(false);

  const [cases, setCases] = React.useState([]);
  const [archivedCases, setArchivedCases] = React.useState([]);
  const [savedEmail, setSavedEmail] = React.useState(resolvedEmail);
  const [emailInput, setEmailInput] = React.useState(resolvedEmail);
  const [emailError, setEmailError] = React.useState("");
  const [emailStatus, setEmailStatus] = React.useState("");
  const [loadingCases, setLoadingCases] = React.useState(false);
  const [showNoCaseModal, setShowNoCaseModal] = React.useState(false);
  const [caseView, setCaseView] = React.useState("active");
  const hasWorkspaceIdentity =
    Boolean(formatEmail(savedEmail || resolvedEmail)) &&
    (cases.length > 0 || archivedCases.length > 0);

  console.log("[CasesPage identity]", {
    resolvedCaseId,
    resolvedEmail,
    savedEmail,
    hasWorkspaceIdentity,
    locationState: location.state,
  });

  React.useEffect(() => {
    if (resolvedCaseId) {
      localStorage.setItem("nimclea_current_case_id", resolvedCaseId);
    }
    if (resolvedEmail) {
      localStorage.setItem(EMAIL_STORAGE_KEY, resolvedEmail);
    }
  }, [resolvedCaseId, resolvedEmail]);

  const loadCasesForEmail = React.useCallback(async (rawEmail, options = {}) => {
    console.log("[loadCasesForEmail called]", rawEmail);

    const email = formatEmail(rawEmail);

    if (!email || !email.includes("@")) {
      console.log("[CasesPage] invalid email, forcing access state");

      localStorage.removeItem(EMAIL_STORAGE_KEY);
      setSavedEmail("");
      setEmailInput("");
      setCases([]);
      setArchivedCases([]);

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

      const caseIdOf = (item = {}) =>
        String(
          item?.caseId ||
            item?.case_id ||
            item?.id ||
            item?.caseSnapshot?.caseId ||
            item?.caseSnapshot?.caseRecord?.caseId ||
            ""
        ).trim();

      const mergedCaseMap = new Map();

      nextCases.forEach((item) => {
        const id = caseIdOf(item);
        if (!id) return;
        mergedCaseMap.set(id, {
          ...item,
          caseId: id,
        });
      });

      localCases.forEach((item) => {
        const id = caseIdOf(item);
        if (!id) return;

        const existing = mergedCaseMap.get(id) || {};
        mergedCaseMap.set(id, {
          ...existing,
          ...item,
          caseId: id,
          id,
        });
      });

      const mergedCases = await hydrateCaseDetails(
        Array.from(mergedCaseMap.values())
      );

      if (mergedCases.length === 0) {
        setCases([]);
        setArchivedCases([]);
        setSavedEmail(email);
        setEmailInput(email);
        setEmailStatus("");
        setShowNoCaseModal(true);
        localStorage.setItem(EMAIL_STORAGE_KEY, email);
        localStorage.removeItem("nimclea_email_verified");
        localStorage.removeItem("nimclea_current_case_id");

        return;
      }

      const hydratedCases = mergedCases.map((c) => {
        const eventCandidates = [
          c.eventLogs,
          c.events,
          c.eventHistory,
          c.caseData?.eventHistory,
          c.capturedEvents,
          c.pilotTrail,
          c.trail,
          c.caseSnapshot?.eventLogs,
          c.caseSnapshot?.events,
          c.caseSnapshot?.eventHistory,
          c.caseSnapshot?.caseRecord?.eventLogs,
          c.caseSnapshot?.caseRecord?.events,
          c.caseSnapshot?.caseRecord?.eventHistory,
          c.caseSnapshot?.caseRecord?.caseData?.eventHistory,
          c.caseSnapshot?.caseRecord?.capturedEvents,
          c.caseSnapshot?.caseRecord?.pilotTrail,
          c.caseSnapshot?.caseRecord?.trail,
        ].filter((candidate) => Array.isArray(candidate) && candidate.length > 0);

        const events = eventCandidates.flat();

        const eventCount = Math.max(
          Number(c.eventCount || 0),
          Number(c.caseSnapshot?.eventCount || 0),
          events.length
        );

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
          receiptEligible: Boolean(c.receiptEligible || c.caseReceiptEligible),
          paymentStatus: c.paymentStatus || "",
          paid: Boolean(c.paid),
          status:
            getEvidenceEvents({ ...c, events, eventLogs: events }).length > 0
              ? "active"
              : c.status || "draft",
        };
      });

      const archivedCaseIds = getArchivedCaseIds();

      const activeCases = [];
      const nextArchivedCases = [];

      hydratedCases.forEach((caseItem) => {
        const visibleCaseId = String(
          caseItem?.caseId ||
          caseItem?.case_id ||
          caseItem?.id ||
          ""
        ).trim();

        if (visibleCaseId && archivedCaseIds.includes(visibleCaseId)) {
          nextArchivedCases.push(caseItem);
        } else {
          activeCases.push(caseItem);
        }
      });

      setCases(activeCases);
      setArchivedCases(nextArchivedCases);
      setSavedEmail(email);
      setEmailInput(email);
      localStorage.setItem(EMAIL_STORAGE_KEY, email);

    } catch (error) {
      console.warn("Failed to load cases by email", error);
      setCases([]);
      setArchivedCases([]);
      setEmailStatus("");
      setEmailError("Could not load cases. Please try again.");
    } finally {
      setLoadingCases(false);
    }
  }, [navigate]);

  React.useEffect(() => {
    const email = formatEmail(savedEmail || resolvedEmail);

    if (!email) return;

    setSavedEmail(email);
    setEmailInput(email);
    void loadCasesForEmail(email);
  }, [resolvedEmail, savedEmail, loadCasesForEmail]);

  React.useEffect(() => {
    const params = new URLSearchParams(location.search || "");

    if (params.get("checkout") === "success") {
      localStorage.setItem("nimclea_pilot_extension_paid", "true");
      setShowSubscriptionOptions(false);
    }
  }, [location.search]);

  const handleContinueWithEmail = React.useCallback(() => {
    console.log("[access continue clicked]", { emailInput });
    console.log("[access continue formatted]", formatEmail(emailInput));

    const email = formatEmail(emailInput);

    if (!email) {
      setEmailError("Enter an email to continue.");
      return;
    }

    void loadCasesForEmail(email);
  }, [emailInput, loadCasesForEmail, navigate]);

  const handleSwitchEmail = React.useCallback(() => {
    localStorage.removeItem(EMAIL_STORAGE_KEY);
    localStorage.removeItem("nimclea_email_verified");
    localStorage.removeItem("nimclea_current_case_id");

    setSavedEmail("");
    setEmailInput("");
    setCases([]);
    setArchivedCases([]);
    setEmailError("");
    setEmailStatus("");
    setLoadingCases(false);
    setShowNoCaseModal(false);
    setCaseView("active");

    navigate(ROUTES.CASES || "/cases", {
      replace: true,
      state: {},
    });
  }, [navigate]);

  const handleArchiveCase = React.useCallback((caseIdToArchive = "") => {
    const safeCaseId = String(caseIdToArchive || "").trim();

    if (!safeCaseId) return;

    const confirmed = window.confirm(
      "Archive this case? It will be hidden from Active Cases, but the underlying records will not be deleted."
    );

    if (!confirmed) return;

    const nextArchivedIds = saveArchivedCaseIds([
      ...getArchivedCaseIds(),
      safeCaseId,
    ]);

    const archivedCase = cases.find((caseItem) => {
      const currentCaseId = String(
        caseItem?.caseId ||
        caseItem?.case_id ||
        caseItem?.id ||
        ""
      ).trim();

      return currentCaseId === safeCaseId;
    });

    if (archivedCase) {
      setArchivedCases((prev) => {
        const alreadyArchived = prev.some((caseItem) => {
          const currentCaseId = String(
            caseItem?.caseId ||
            caseItem?.case_id ||
            caseItem?.id ||
            ""
          ).trim();

          return currentCaseId === safeCaseId;
        });

        return alreadyArchived ? prev : [...prev, archivedCase];
      });
    }

    setCases((prev) =>
      prev.filter((caseItem) => {
        const currentCaseId = String(
          caseItem?.caseId ||
          caseItem?.case_id ||
          caseItem?.id ||
          ""
        ).trim();

        return !currentCaseId || !nextArchivedIds.includes(currentCaseId);
      })
    );

    setExpandedCaseIds((prev) => {
      const next = { ...prev };
      delete next[safeCaseId];
      return next;
    });
  }, [cases]);

  const handleRestoreCase = React.useCallback((caseIdToRestore = "") => {
    const safeCaseId = String(caseIdToRestore || "").trim();

    if (!safeCaseId) return;

    saveArchivedCaseIds(
      getArchivedCaseIds().filter((caseId) => String(caseId).trim() !== safeCaseId)
    );

    const restoredCase = archivedCases.find((caseItem) => {
      const currentCaseId = String(
        caseItem?.caseId ||
        caseItem?.case_id ||
        caseItem?.id ||
        ""
      ).trim();

      return currentCaseId === safeCaseId;
    });

    if (restoredCase) {
      setCases((prev) => {
        const alreadyActive = prev.some((caseItem) => {
          const currentCaseId = String(
            caseItem?.caseId ||
            caseItem?.case_id ||
            caseItem?.id ||
            ""
          ).trim();

          return currentCaseId === safeCaseId;
        });

        return alreadyActive ? prev : [...prev, restoredCase];
      });
    }

    setArchivedCases((prev) =>
      prev.filter((caseItem) => {
        const currentCaseId = String(
          caseItem?.caseId ||
          caseItem?.case_id ||
          caseItem?.id ||
          ""
        ).trim();

        return currentCaseId !== safeCaseId;
      })
    );
  }, [archivedCases]);

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
        currentStep: "diagnostic",
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

      navigate(`${ROUTES.DIAGNOSTIC}?caseId=${encodeURIComponent(newCaseId)}&from=new_case`, {
        state: {
          caseId: newCaseId,
          email: savedEmail,
          from: "new_case",
          source: "cases_page",
        },
      });
    } catch (error) {
      console.warn("Failed to create case", error);
      setCaseCreationError("Could not create a new case. Please try again.");
    }
  };

  const visibleActiveCases = React.useMemo(
    () => cases.filter(isVisibleActiveCase),
    [cases]
  );

  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-900 px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-6 pt-10">
        {hasWorkspaceIdentity && (
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

        {hasWorkspaceIdentity && (
          <nav
            className="flex items-center gap-3 px-1 text-sm"
            aria-label="Case views"
            style={{ paddingLeft: "25px" }}
          >
            <button
              type="button"
              onClick={() => setCaseView("active")}
              className={`border-b-2 pb-1 transition ${
                caseView === "active"
                  ? "border-slate-900 font-semibold text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              Active Cases ({visibleActiveCases.length})
            </button>
            <span className="text-slate-300" aria-hidden="true">
              |
            </span>
            <button
              type="button"
              onClick={() => setCaseView("archived")}
              className={`border-b-2 pb-1 transition ${
                caseView === "archived"
                  ? "border-slate-900 font-semibold text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              Archived Cases ({archivedCases.length})
            </button>
          </nav>
        )}

        {!loadingCases && !hasWorkspaceIdentity && (
          <section className="flex justify-center">
            <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mb-8 flex flex-col items-center">
                {/* Logo */}
                <div
                  style={{
                    color: "#0467a5",
                    fontSize: "36px",
                    fontWeight: "900",
                    fontFamily: "Arial Black, Arial, Helvetica, sans-serif",
                    WebkitTextStroke: "0.3px #0467a5",   // ← 关键：视觉加粗
                    letterSpacing: "-0.5px",
                    lineHeight: 1,
                    marginBottom: "28px",
                  }}
                >
                  Nimclea
                </div>

                {/* Title（靠近输入框 + 左对齐） */}
                <h2
                  style={{
                    width: "100%",
                    fontSize: "16px",     // ← 稍微放大
                    fontWeight: 600,      // ← 加粗（但不抢logo）
                    color: "#334155",     // ← 稍微更深一点
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
                    onClick={() => window.location.href = "https://nimclea.com"}
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
                    type="button"
                    onClick={handleContinueWithEmail}
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
        ) : caseView === "active" && visibleActiveCases.length === 0 && hasWorkspaceIdentity ? (
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <p className="text-sm text-slate-500">No active cases.</p>
          </section>
        ) : caseView === "active" && visibleActiveCases.length > 0 ? (
          <section className="space-y-3">
            {visibleActiveCases.map((item, index) => {
              const normalizedItem = normalizeCaseItem(item);
              const caseId = normalizedItem?.caseId || normalizedItem?.case_id || normalizedItem?.id || "";
              const accessMode = getAccessMode(normalizedItem);
              const isPaid = accessMode === "paid";
              const caseSchema = normalizedItem?.caseSchema || normalizedItem?.caseData || normalizedItem || {};
              const hasDiagnosticData = hasDiagnosticResultData(normalizedItem);
              const hasProgress = hasPostDiagnosticProgress(normalizedItem);
              const isDiagnosticCompletedOnly =
                (hasDiagnosticData && !hasProgress) ||
                isDiagnosticContinuationCase(normalizedItem);
              const isDiagnosticContinuation =
                isDiagnosticContinuationCase(normalizedItem);

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
              const primaryResolvedCaseId = resolveCaseId(normalizedItem);
              const primaryActionPath = isDiagnosticContinuation && primaryResolvedCaseId
                ? `${ROUTES.PILOT || "/pilot"}?caseId=${encodeURIComponent(primaryResolvedCaseId)}&from=case`
                : detailPath;
              const primaryActionLabel = isDiagnosticContinuation ? "Continue Case" : "Detail";
              const redoDiagnosticCaseId = primaryResolvedCaseId;
              const redoDiagnosticPath = redoDiagnosticCaseId
                ? `${ROUTES.DIAGNOSTIC}?caseId=${encodeURIComponent(redoDiagnosticCaseId)}&redo=1`
                : ROUTES.DIAGNOSTIC;
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
                          <p>
                            Updated:{" "}
                            {item?.updatedAt
                              ? new Date(item.updatedAt).toLocaleString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                  hour: "numeric",
                                  minute: "2-digit",
                                })
                              : "N/A"}
                          </p>
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

                        <div className="mt-5 flex flex-row flex-wrap items-center justify-start gap-3 border-t border-slate-100 py-4">
                          <a
                            href={redoDiagnosticPath}
                            onClick={(event) => {
                              event.preventDefault();

                              navigate(redoDiagnosticPath, {
                                state: {
                                  caseId: redoDiagnosticCaseId,
                                  case_id: redoDiagnosticCaseId,
                                  sourceCaseId: redoDiagnosticCaseId,
                                  from: "case",
                                  redoDiagnostic: true,
                                },
                              });
                            }}
                            className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white text-sm font-medium text-slate-800 transition hover:bg-slate-50"
                            style={{
                              height: "28px",
                              minHeight: "28px",
                              maxHeight: "28px",
                              padding: "0 14px",
                              lineHeight: "1",
                            }}
                          >
                            Redo Diagnostic
                          </a>

                          <button
                            type="button"
                            onClick={() => handleArchiveCase(redoDiagnosticCaseId || caseId)}
                            className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                            style={{
                              height: "28px",
                              minHeight: "28px",
                              maxHeight: "28px",
                              padding: "0 14px",
                              lineHeight: "1",
                            }}
                          >
                            Archive case
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <a
                      href={primaryActionPath}
                      onClick={(event) => {
                        event.preventDefault();

                        const resolvedCaseId = resolveCaseId(normalizedItem);
                        const targetPath = isDiagnosticContinuation
                          ? primaryActionPath
                          : getCaseDetailRoute(normalizedItem);

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
                          state: isDiagnosticContinuation
                            ? {
                                caseId: resolvedCaseId,
                                case_id: resolvedCaseId,
                                email: savedEmail || resolvedEmail,
                                source: "cases_page",
                                from: "case_continue",
                              }
                            : {
                                caseId: resolvedCaseId,
                                email: savedEmail || resolvedEmail,
                                trialId:
                                  normalizedItem?.trialId ||
                                  normalizedItem?.trial_id ||
                                  normalizedItem?.trialSession?.trialId ||
                                  normalizedItem?.caseSnapshot?.trialId ||
                                  "",
                                userId:
                                  normalizedItem?.userId ||
                                  normalizedItem?.user_id ||
                                  normalizedItem?.trialSession?.userId ||
                                  "",
                                source: "cases_page",
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
                      {primaryActionLabel}
                    </a>
                  </div>
                </div>
              </article>
            );
            })}
          </section>
        ) : null}

        {!loadingCases && caseView === "archived" && (
          archivedCases.length === 0 ? (
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <p className="text-sm text-slate-500">No archived cases.</p>
            </section>
          ) : (
            <section className="space-y-3">
              {archivedCases.map((item, index) => {
                const normalizedItem = normalizeCaseItem(item);
                const caseId =
                  normalizedItem?.caseId ||
                  normalizedItem?.case_id ||
                  normalizedItem?.id ||
                  resolveCaseId(normalizedItem) ||
                  "";
                const caseKey = caseId || normalizedItem?.resultId || String(index);

                return (
                  <article
                    key={caseKey}
                    className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-base font-semibold text-slate-900">
                          {sanitizeText(normalizedItem?.title || caseId, "Untitled case")}
                        </h3>
                        <p className="mt-1 text-sm text-slate-600">
                          Status: {sanitizeText(getDisplayStatus(normalizedItem))}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRestoreCase(caseId)}
                        className="inline-flex shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        style={{
                          height: "28px",
                          minHeight: "28px",
                          maxHeight: "28px",
                          padding: "0 14px",
                          lineHeight: "1",
                        }}
                      >
                        Restore case
                      </button>
                    </div>
                  </article>
                );
              })}
            </section>
          )
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
                  navigate(ROUTES.DIAGNOSTIC, {
                    state: {
                      email: emailInput,
                      caseId: resolvedCaseId,
                      source: "cases_page",
                    },
                  });
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
