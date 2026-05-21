import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ROUTES from "../routes";
import { sanitizeText } from "../lib/sanitizeText";
import { saveCaseSnapshot } from "../lib/trialApi";
import { getTrialStatusDisplayModel } from "../lib/trialStatusApi";
import { getTrialSession } from "../lib/trialSession";
import { getPlanSurfaceContract } from "../lib/planSurfaceContract";
import { createCaseId, upsertCase, getAllCases, deleteCase as deleteLocalCase } from "../utils/caseRegistry.js";
import { resolveSafeCaseId } from "../utils/caseIdResolver.js";
import { runClientStateGuard } from "../utils/clientStateGuard.js";
import { getStableUserId } from "../utils/eventLogger";
import { buildReadinessContract } from "../utils/deterministicScore";
import {
  hasBackendOwnedReceiptAccess,
  hasBackendOwnedVerificationAccess,
  isBackendOwnedReceiptPaidOrActivated,
  isBackendReceiptPaidOrActivated,
  isBackendReceiptReady,
} from "../utils/dataContractLifecycle";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://nimclea-api.onrender.com";
const EMAIL_STORAGE_KEY = "nimclea_email";
const KNOWN_WORKSPACE_EMAILS_KEY = "nimclea_known_workspace_emails";
const ARCHIVED_CASE_IDS_KEY = "nimclea_archived_case_ids";
const DELETED_CASE_IDS_KEY = "nimclea_deleted_case_ids";
const CASE_PLAN_COMPLETED_PENDING_RECEIPT_AUTHORITY_STATE =
  "case_plan_completed_pending_receipt_authority";

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

function getDeletedCaseIds() {
  try {
    const raw = localStorage.getItem(DELETED_CASE_IDS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function saveDeletedCaseIds(caseIds = []) {
  try {
    const safeIds = Array.from(new Set(caseIds.filter(Boolean)));
    localStorage.setItem(DELETED_CASE_IDS_KEY, JSON.stringify(safeIds));
    return safeIds;
  } catch {
    return [];
  }
}

function isDeletedCaseId(caseId = "") {
  const safeCaseId = String(caseId || "").trim();
  return Boolean(safeCaseId && getDeletedCaseIds().includes(safeCaseId));
}

function filterDeletedCases(caseItems = []) {
  if (!Array.isArray(caseItems)) return [];

  return caseItems.filter((caseItem) => {
    const normalized = normalizeCaseItem(caseItem);
    const caseId = String(
      normalized?.caseId ||
        normalized?.case_id ||
        normalized?.id ||
        ""
    ).trim();

    return !caseId || !isDeletedCaseId(caseId);
  });
}

function getKnownWorkspaceEmails() {
  try {
    const raw = localStorage.getItem(KNOWN_WORKSPACE_EMAILS_KEY);
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed)
      ? parsed.map((email) => formatEmail(email)).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

function rememberKnownWorkspaceEmail(email = "") {
  const normalizedEmail = formatEmail(email);
  if (!normalizedEmail) return [];

  const emails = getKnownWorkspaceEmails();
  const next = Array.from(new Set([...emails, normalizedEmail]));
  localStorage.setItem(KNOWN_WORKSPACE_EMAILS_KEY, JSON.stringify(next));
  return next;
}

function forgetKnownWorkspaceEmail(email = "") {
  const normalizedEmail = formatEmail(email);
  if (!normalizedEmail) return getKnownWorkspaceEmails();

  const next = getKnownWorkspaceEmails().filter(
    (knownEmail) => knownEmail !== normalizedEmail
  );
  localStorage.setItem(KNOWN_WORKSPACE_EMAILS_KEY, JSON.stringify(next));
  return next;
}

function isKnownWorkspaceEmail(email = "") {
  const normalizedEmail = formatEmail(email);
  if (!normalizedEmail) return false;
  return getKnownWorkspaceEmails().includes(normalizedEmail);
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

function normalizeCaseText(value = "") {
  return String(value || "").trim().toLowerCase();
}

function isBackendCaseAuthorityMissing(item = {}) {
  const normalized = normalizeCaseItem(item);
  return (
    normalized?._backendCaseAuthority === "missing" ||
    normalized?.backendCaseMissing === true
  );
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
              .then(async (response) => {
                const payload = await response.json().catch(() => ({}));
                if (!response.ok || payload?.success === false || !payload?.data) {
                  return { found: false, detail: null };
                }
                return { found: true, detail: payload.data };
              })
              .catch((error) => {
                console.warn("Failed to hydrate case detail", caseId, error);
                return { found: false, detail: null };
              })
          );
        }

        const detailResult = await detailCache.get(caseId);
        const detail = detailResult?.detail || null;

        if (!detailResult?.found || !detail || typeof detail !== "object") {
          return {
            ...caseItem,
            caseId,
            id: caseItem?.id || caseId,
            _backendCaseAuthority: "missing",
            backendCaseMissing: true,
          };
        }

        return {
          ...caseItem,
          ...detail,
          caseId,
          id: caseItem?.id || detail?.id || caseId,
          _backendCaseAuthority: "confirmed",
          backendCaseMissing: false,
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

function isDiagnosticOnlyCase(item = {}, options = {}) {
  const normalized = normalizeCaseItem(item);
  const caseData = normalized?.caseData || normalized?.caseSchema || {};
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
  const eventCount = Number(
    normalized?.eventCount ??
      caseData?.eventCount ??
      normalized?.caseSnapshot?.eventCount ??
      0
  );
  const evidenceEventCount =
    typeof options.evidenceEventCount === "number"
      ? options.evidenceEventCount
      : getEvidenceEvents(normalized).length;
  const paymentStatus = String(normalized?.paymentStatus || "").toLowerCase();
  const receiptStatus = String(normalized?.receiptStatus || "").toLowerCase();
  const receiptObjectStatus = String(normalized?.receipt?.status || "").toLowerCase();
  const verificationStatus = String(normalized?.verificationStatus || "").toLowerCase();
  const verificationObjectStatus = String(normalized?.verification?.status || "").toLowerCase();
  const lockedReceiptStatuses = new Set(["paid", "issued", "activated"]);
  const lockedVerificationStatuses = new Set([
    "paid",
    "ready",
    "verification_ready",
    "issued",
    "activated",
    "delivered",
    "verified",
    "completed",
  ]);

  return Boolean(
    (status === "diagnostic_completed" || stage === "diagnostic_completed") &&
      (!currentStep || currentStep === "result") &&
      normalized?.receiptEligible !== true &&
      normalized?.caseReceiptEligible !== true &&
      (!Number.isFinite(eventCount) || eventCount <= 0) &&
      evidenceEventCount === 0 &&
      !hasRealEventSignal(normalized) &&
      normalized?.paid !== true &&
      !["paid", "checkout_created"].includes(paymentStatus) &&
      !lockedReceiptStatuses.has(receiptStatus) &&
      !lockedReceiptStatuses.has(receiptObjectStatus) &&
      !lockedVerificationStatuses.has(verificationStatus) &&
      !lockedVerificationStatuses.has(verificationObjectStatus) &&
      !hasActivatedReceipt(normalized) &&
      !hasActivatedVerification(normalized)
  );
}

function hasCanonicalBackendReceiptReadySignal(item = {}) {
  return isBackendReceiptReady(normalizeCaseItem(item));
}

function hasCasePlanCompletedEvidence(item = {}) {
  const normalized = normalizeCaseItem(item);
  const casePlan = normalized?.casePlan || normalized?.case_plan || {};
  const caseData = normalized?.caseData || normalized?.caseSchema || {};
  const candidateValues = [
    normalized?.lifecycleState,
    normalized?.lifecycle_state,
    normalized?.status,
    normalized?.stage,
    normalized?.currentStep,
    normalized?.step,
    normalized?.planStatus,
    normalized?.casePlanStatus,
    normalized?.case_plan_status,
    casePlan?.status,
    casePlan?.stage,
    casePlan?.state,
    caseData?.planStatus,
    caseData?.casePlanStatus,
    caseData?.case_plan_status,
  ].map((value) => normalizeCaseText(value));

  return Boolean(
    normalized?.casePlanCompleted === true ||
      normalized?.case_plan_completed === true ||
      casePlan?.completed === true ||
      casePlan?.isCompleted === true ||
      candidateValues.some((value) =>
        [
          CASE_PLAN_COMPLETED_PENDING_RECEIPT_AUTHORITY_STATE,
          "case_plan_completed",
          "case_plan_complete",
          "plan_completed",
          "plan_complete",
        ].includes(value)
      )
  );
}

function deriveCaseListState(item) {
  const normalized = normalizeCaseItem(item);

  if (isBackendCaseAuthorityMissing(normalized)) {
    return {
      normalized,
      evidenceEventCount: 0,
      hasEvidenceEvent: false,
      receiptReady: false,
      checkoutStarted: false,
      paid: false,
      displayStatus: "Record needs sync",
      readinessContract: {
        receiptReady: false,
        readinessLevel: "integrity_boundary",
        blockers: ["Case record was not found in the workspace authority."],
        criticalBlockers: ["backend_case_missing"],
        checks: [],
      },
      hasReceiptStageSignal: false,
      directBackendReceiptReady: false,
      hasPilotOrCaseResultContext: false,
      hasReceiptPathContext: false,
      hasReceiptNonReadySignal: false,
      hasReceiptNotReadyDisplaySignal: false,
      hasConcreteReceiptProgress: false,
      legacyReceiptReadySignal: false,
      snapshotOnly: false,
      concreteProgressReasons: {},
      paymentStatusText: "",
      hasRealPaymentObject: false,
      trustedPaymentProgress: false,
      readinessDetailLabel: "",
      diagnosticOnly: false,
      diagnosticContinuation: false,
      lifecycleState: "backend_case_missing",
    };
  }

  const evidenceEventCount = getEvidenceEvents(normalized).length;
  const diagnosticOnly = isDiagnosticOnlyCase(normalized, { evidenceEventCount });
  const diagnosticContinuation =
    diagnosticOnly || isDiagnosticContinuationCase(normalized);
  const strictBackendOwnedReceiptAuthority = hasBackendOwnedReceiptAccess(normalized);
  const strictBackendOwnedVerificationAuthority =
    hasBackendOwnedVerificationAccess(normalized);
  const legacyBackendReceiptReadySignal =
    hasCanonicalBackendReceiptReadySignal(normalized) ||
    normalized?.receiptEligible === true ||
    normalized?.caseReceiptEligible === true ||
    normalizeCaseText(normalized?.receiptStatus) === "ready" ||
    normalizeCaseText(normalized?.status) === "receipt_ready" ||
    normalizeCaseText(normalized?.stage) === "receipt_ready";
  const directBackendReceiptReady = strictBackendOwnedReceiptAuthority;
  const effectiveEventCaptured =
    diagnosticContinuation ? false : normalized?.eventCaptured === true || evidenceEventCount > 0;
  const explicitBackendReady = directBackendReceiptReady;
  const rawStructureStatus =
    normalized?.structureStatus ||
    normalized?.structureStatusFromCase ||
    normalized?.caseData?.structureStatus ||
    "";

  const normalizedStructureStatusText = String(rawStructureStatus || "")
    .trim()
    .toLowerCase();

  const hasUsableStructureStatus =
    Boolean(String(rawStructureStatus || "").trim()) &&
    !["empty", "missing", "none", "null", "undefined", "unknown"].includes(
      normalizedStructureStatusText
    );

  const effectiveStructureStatus = hasUsableStructureStatus
    ? rawStructureStatus
    : explicitBackendReady && effectiveEventCaptured
    ? "receipt_ready_case_structure"
    : "";
  const rawStructureScore = Number(
    normalized?.structureScore ??
      normalized?.structureScoreFromCase ??
      normalized?.caseData?.structureScore ??
      0
  );
  const effectiveStructureScore =
    Number.isFinite(rawStructureScore) && rawStructureScore > 0
      ? rawStructureScore
      : explicitBackendReady && effectiveEventCaptured
      ? 1
      : 0;

  const readinessContract = buildReadinessContract({
    ...normalized,
    eventCaptured: effectiveEventCaptured,
    explicitBackendReady,
    structureStatus: effectiveStructureStatus,
    structureScore: effectiveStructureScore,
  });
  const snapshotOnly = normalized?.source === "receipt_snapshot";
  const hasMeaningfulPilotResult =
    Boolean(normalized?.pilotResult?.result) ||
    Boolean(normalized?.pilotResult?.preview) ||
    (Array.isArray(normalized?.pilotResult?.entries) &&
      normalized.pilotResult.entries.length > 0) ||
    (Array.isArray(normalized?.pilotResult?.events) &&
      normalized.pilotResult.events.length > 0);
  const hasPilotOrCaseResultContext =
    Boolean(normalized?.result) ||
    Boolean(normalized?.preview) ||
    Boolean(normalized?.caseResult) ||
    hasMeaningfulPilotResult ||
    evidenceEventCount > 0 ||
    Number(normalized?.eventCount || 0) > 0;
  const currentStepText = normalizeCaseText(
    normalized?.currentStep ||
      normalized?.step ||
      normalized?.caseData?.currentStep ||
      normalized?.caseData?.step
  );
  const sourceText = normalizeCaseText(normalized?.source);
  const receiptStatusText = normalizeCaseText(
    normalized?.receiptStatus || normalized?.receipt?.status
  );
  const hasReceiptPathContext =
    ["receipt", "verification"].includes(currentStepText) ||
    ["receipt_page", "receipt_page_repair"].includes(sourceText) ||
    Boolean(receiptStatusText);
  const casePlanCompletedEvidence = hasCasePlanCompletedEvidence(normalized);
  const hasReceiptNonReadySignal =
    normalized?.receiptEligible === false ||
    normalized?.caseReceiptEligible === false ||
    (Boolean(receiptStatusText) && receiptStatusText !== "ready");
  const hasReceiptNotReadyDisplaySignal =
    !directBackendReceiptReady &&
    hasReceiptPathContext &&
    hasPilotOrCaseResultContext &&
    hasReceiptNonReadySignal;
  const paymentStatusText = String(normalized?.paymentStatus || "").toLowerCase();
  const hasRealPaymentObject =
    Boolean(normalized?.payment?.id) ||
    Boolean(normalized?.payment?.sessionId) ||
    Boolean(normalized?.payment?.checkoutSessionId) ||
    Boolean(normalized?.caseBilling?.id) ||
    Boolean(normalized?.caseBilling?.sessionId) ||
    Boolean(normalized?.caseBilling?.checkoutSessionId) ||
    Boolean(normalized?.stripeSessionId) ||
    Boolean(normalized?.checkoutSessionId);
  const paymentCheckoutOrPaid =
    !snapshotOnly &&
    (paymentStatusText.includes("checkout") || paymentStatusText.includes("paid"));
  const trustedPaymentProgress = paymentCheckoutOrPaid || hasRealPaymentObject;
  const hasReceiptObjectId =
    hasNonEmptyText(normalized?.receipt?.receiptId) ||
    (!snapshotOnly && hasNonEmptyText(normalized?.receipt?.id));
  const hasIssuedReceiptObject =
    hasReceiptObjectId ||
    (!snapshotOnly &&
      ["issued", "activated", "paid"].includes(
        String(normalized?.receipt?.status || "").toLowerCase()
      ));
  const concreteProgressReasons = {
    evidenceEventCountPositive: evidenceEventCount > 0,
    eventCaptured: effectiveEventCaptured,
    hasMeaningfulPilotResult,
    hasIssuedReceiptObject,
    hasReceiptId: hasNonEmptyText(normalized?.receiptId),
    paymentCheckoutOrPaid,
  };
  const hasConcreteReceiptProgress =
    evidenceEventCount > 0 ||
    effectiveEventCaptured ||
    hasMeaningfulPilotResult ||
    hasIssuedReceiptObject ||
    hasNonEmptyText(normalized?.receiptId) ||
    trustedPaymentProgress;
  const legacyReceiptReadySignal = legacyBackendReceiptReadySignal;
  const hasReceiptStageSignal = directBackendReceiptReady || hasReceiptNotReadyDisplaySignal;

  const receiptReady = directBackendReceiptReady;
  const pendingReceiptAuthority = Boolean(
    !receiptReady &&
      !strictBackendOwnedReceiptAuthority &&
      casePlanCompletedEvidence &&
      (hasReceiptPathContext || hasPilotOrCaseResultContext || legacyReceiptReadySignal)
  );

  const checkoutStarted =
    normalized?.paymentStatus === "checkout_created";

  const paid =
    isBackendOwnedReceiptPaidOrActivated(normalized) ||
    ((strictBackendOwnedReceiptAuthority || strictBackendOwnedVerificationAuthority) &&
      isBackendReceiptPaidOrActivated(normalized));

  const hasEvidenceEvent = evidenceEventCount > 0;
  const readinessDetailLabel =
    diagnosticContinuation
      ? ""
      : readinessContract.readinessLevel === "pending_review"
      ? "Pending review"
      : readinessContract.readinessLevel === "insufficient_record"
      ? "Insufficient record"
      : readinessContract.readinessLevel === "failed"
      ? "Receipt failed"
      : "";

  let displayStatus =
    legacyReceiptReadySignal && !receiptReady
      ? "Result ready"
      : normalized?.status || "draft";

  if (paid) {
    displayStatus = "Paid";
  } else if (checkoutStarted) {
    displayStatus = "Receipt checkout started";
  } else if (receiptReady) {
    displayStatus = "Receipt ready";
  } else if (pendingReceiptAuthority) {
    displayStatus = CASE_PLAN_COMPLETED_PENDING_RECEIPT_AUTHORITY_STATE;
  } else if (hasReceiptNotReadyDisplaySignal) {
    if (readinessContract.readinessLevel === "pending_review") {
      displayStatus = "Receipt not ready · Pending review";
    } else if (readinessContract.readinessLevel === "insufficient_record") {
      displayStatus = "Receipt not ready · Insufficient record";
    } else if (readinessContract.readinessLevel === "failed") {
      displayStatus = "Receipt failed";
    } else {
      displayStatus = "Receipt not ready";
    }
  } else if (hasEvidenceEvent) {
    displayStatus = `Event captured (${evidenceEventCount})`;
  } else if (
    !pendingReceiptAuthority &&
    (diagnosticContinuation || isDiagnosticContinuationCase(normalized))
  ) {
    displayStatus = "Diagnostic completed";
  }

  return {
    normalized,
    evidenceEventCount,
    hasEvidenceEvent,
    receiptReady,
    checkoutStarted,
    paid,
    displayStatus,
    readinessContract,
    hasReceiptStageSignal,
    directBackendReceiptReady,
    hasPilotOrCaseResultContext,
    hasReceiptPathContext,
    hasReceiptNonReadySignal,
    hasReceiptNotReadyDisplaySignal,
    hasConcreteReceiptProgress,
    legacyReceiptReadySignal,
    snapshotOnly,
    concreteProgressReasons,
    paymentStatusText,
    hasRealPaymentObject,
    trustedPaymentProgress,
    readinessDetailLabel,
    diagnosticOnly,
    diagnosticContinuation,
    lifecycleState: pendingReceiptAuthority
      ? CASE_PLAN_COMPLETED_PENDING_RECEIPT_AUTHORITY_STATE
      : normalizeCaseText(displayStatus),
  };
}

function getDisplayStatus(item) {
  return deriveCaseListState(item).displayStatus;
}

function resolveCaseId(item) {
  const normalized = normalizeCaseItem(item);
  return resolveSafeCaseId(normalized);
}

function isValidBusinessCaseId(value = "") {
  return /^CASE-\d+-[A-Z0-9]{6}$/.test(String(value || "").trim());
}

function getOwnCaseId(item = {}) {
  const normalized = normalizeCaseItem(item);
  const candidates = [
    normalized?.caseId,
    normalized?.case_id,
    normalized?.id,
  ];

  return candidates
    .map((value) => String(value || "").trim())
    .find(isValidBusinessCaseId) || "";
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

function hasReceiptDetailRouteSignal(item) {
  const normalized = normalizeCaseItem(item);

  if (isBackendCaseAuthorityMissing(normalized)) {
    return false;
  }

  if (
    isDiagnosticContinuationCase(normalized) ||
    deriveCaseListState(normalized).diagnosticOnly === true
  ) {
    return false;
  }

  const caseData = normalized?.caseData || normalized?.caseSchema || {};
  const statusText = [
    normalized?.status,
    normalized?.stage,
    normalized?.stageLabel,
    normalized?.currentStep,
    normalized?.paymentStatus,
    normalized?.receiptStatus,
    caseData?.status,
    caseData?.stage,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const trustedEvidenceEventCount = getEvidenceEvents(normalized).length;
  const readinessContract = buildReadinessContract({
    ...normalized,
    eventCaptured: trustedEvidenceEventCount > 0,
  });

  return Boolean(
    hasCanonicalBackendReceiptReadySignal(normalized) ||
      hasBackendOwnedReceiptAccess(normalized) ||
      hasBackendOwnedVerificationAccess(normalized) ||
      trustedEvidenceEventCount > 0 ||
      readinessContract.receiptReady === true ||
      statusText.includes("receipt_ready") ||
      statusText.includes("receipt ready") ||
      statusText.includes("receipt checkout started") ||
      statusText.includes("checkout_created") ||
      statusText.includes("paid")
  );
}

function getCaseDetailRoute(item, explicitCaseId = "") {
  const caseIdSafe = isValidBusinessCaseId(explicitCaseId)
    ? explicitCaseId
    : getOwnCaseId(item);

  if (!caseIdSafe) {
    return "/cases";
  }

  const encodedCaseId = encodeURIComponent(caseIdSafe);
  const normalized = normalizeCaseItem(item);
  const derived = deriveCaseListState(normalized);

  if (isBackendCaseAuthorityMissing(normalized)) {
    return "/cases";
  }

  if (
    derived.receiptReady ||
    derived.hasReceiptStageSignal ||
    hasReceiptDetailRouteSignal(normalized)
  ) {
    return `${ROUTES.RECEIPT}?caseId=${encodedCaseId}`;
  }

  if (hasActivatedReceipt(normalized)) {
    return `${ROUTES.VERIFICATION}?caseId=${encodedCaseId}`;
  }

  if (derived.diagnosticOnly || isDiagnosticContinuationCase(normalized)) {
    return `${ROUTES.PILOT || "/pilot"}?caseId=${encodedCaseId}&from=case`;
  }

  if (!hasDiagnosticResultData(normalized)) {
    return `${ROUTES.DIAGNOSTIC}?caseId=${encodedCaseId}`;
  }

  if (!hasRealEventSignal(normalized)) {
    return `${ROUTES.RESULT}?caseId=${encodedCaseId}`;
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

function getCaseEventCount(item = {}) {
  const normalized = normalizeCaseItem(item);
  const caseData = normalized?.caseData || {};
  const rawCount = Number(
    normalized?.eventCount ??
      caseData?.eventCount ??
      normalized?.caseSnapshot?.eventCount ??
      0
  );

  return Math.max(
    Number.isFinite(rawCount) ? rawCount : 0,
    getEvidenceEvents(normalized).length
  );
}

function hasMeaningfulCaseTitle(item = {}) {
  const normalized = normalizeCaseItem(item);
  const title = String(
    normalized?.title ||
      normalized?.caseName ||
      normalized?.name ||
      normalized?.caseData?.title ||
      normalized?.caseData?.caseName ||
      ""
  ).trim();

  if (!title) return false;
  if (title === resolveCaseId(normalized)) return false;

  return !["untitled case", "new case", "draft case"].includes(
    title.toLowerCase()
  );
}

function isReceiptSnapshotCase(item = {}) {
  return normalizeCaseText(normalizeCaseItem(item)?.source) === "receipt_snapshot";
}

function isProtectedReceiptSnapshotCase(item = {}) {
  const normalized = normalizeCaseItem(item);
  const paymentStatus = normalizeCaseText(normalized?.paymentStatus);
  const receiptStatus = normalizeCaseText(normalized?.receiptStatus);
  const receiptObjectStatus = normalizeCaseText(normalized?.receipt?.status);
  const verificationStatus = normalizeCaseText(normalized?.verificationStatus);

  return Boolean(
    isReceiptSnapshotCase(normalized) &&
      (normalized?.paid === true ||
        ["paid", "issued", "activated"].includes(paymentStatus) ||
        ["paid", "issued", "activated"].includes(receiptStatus) ||
        ["paid", "issued", "activated"].includes(receiptObjectStatus) ||
        ["paid", "ready", "issued", "activated"].includes(verificationStatus))
  );
}

function isDeletedOrDiscardedCase(item = {}) {
  const normalized = normalizeCaseItem(item);

  return Boolean(
    normalized?.deletedAt ||
      normalized?.discardedAt ||
      normalized?.caseDeletedAt ||
      normalized?.isDeleted === true ||
      normalized?.deleted === true
  );
}

function hasVerificationHistoricSignal(item = {}) {
  const normalized = normalizeCaseItem(item);
  const verificationStatus = normalizeCaseText(normalized?.verificationStatus);
  const verificationObjectStatus = normalizeCaseText(normalized?.verification?.status);

  return Boolean(
    normalized?.verificationPaid === true ||
      normalized?.verification?.paid === true ||
      normalized?.verificationDelivered === true ||
      normalized?.verificationDeliveryCompleted === true ||
      normalized?.evidencePackageDownloaded === true ||
      normalized?.firstEvidencePackageDownloaded === true ||
      normalized?.firstEvidencePackageDownloadedAt ||
      normalized?.evidencePackageDownloadedAt ||
      normalized?.deliveryCompletedAt ||
      normalized?.certificateDownloaded === true ||
      normalized?.certificateDownloadedAt ||
      normalized?.proofDownloaded === true ||
      normalized?.proofDownloadedAt ||
      normalized?.proofPackageDownloaded === true ||
      normalized?.proofPackageDownloadedAt ||
      normalized?.finalDeterminationDelivered === true ||
      normalized?.finalDeterminationDeliveredAt ||
      normalized?.verification?.delivered === true ||
      normalized?.verification?.deliveryCompleted === true ||
      normalized?.verification?.evidencePackageDownloaded === true ||
      normalized?.verification?.firstEvidencePackageDownloaded === true ||
      normalized?.verification?.firstEvidencePackageDownloadedAt ||
      normalized?.verification?.evidencePackageDownloadedAt ||
      normalized?.verification?.deliveryCompletedAt ||
      normalized?.verification?.certificateDownloaded === true ||
      normalized?.verification?.certificateDownloadedAt ||
      normalized?.verification?.proofDownloaded === true ||
      normalized?.verification?.proofDownloadedAt ||
      normalized?.verification?.proofPackageDownloaded === true ||
      normalized?.verification?.proofPackageDownloadedAt ||
      normalized?.verification?.finalDeterminationDelivered === true ||
      normalized?.verification?.finalDeterminationDeliveredAt ||
      ["paid", "completed", "issued", "delivered"].includes(verificationStatus) ||
      ["paid", "completed", "issued", "delivered"].includes(verificationObjectStatus)
  );
}

function hasPaymentOrFormalReceiptSignal(item = {}) {
  const normalized = normalizeCaseItem(item);
  const paymentStatus = normalizeCaseText(normalized?.paymentStatus);
  const receiptStatus = normalizeCaseText(normalized?.receiptStatus);
  const receiptObjectStatus = normalizeCaseText(normalized?.receipt?.status);
  const paymentType = normalizeCaseText(
    normalized?.paymentType ||
      normalized?.priceType ||
      normalized?.productType ||
      normalized?.receipt?.paymentType ||
      normalized?.receipt?.priceType ||
      normalized?.receipt?.productType
  );

  return Boolean(
    normalized?.paid === true ||
      ["paid", "succeeded", "complete"].includes(paymentStatus) ||
      ["issued", "activated", "baseline_issued"].includes(receiptStatus) ||
      ["issued", "activated", "baseline_issued"].includes(receiptObjectStatus) ||
      normalized?.receiptIssued === true ||
      normalized?.baselineIssued === true ||
      normalized?.receipt?.issued === true ||
      normalized?.receipt?.activated === true ||
      normalized?.receipt?.baselineIssued === true ||
      (["receipt_activation", "formal_receipt"].includes(paymentType) &&
        (normalized?.paid === true ||
          ["paid", "succeeded", "complete"].includes(paymentStatus)))
  );
}

function isSuppressedWorkspaceCase(item = {}) {
  const normalized = normalizeCaseItem(item);

  if (isDeletedOrDiscardedCase(normalized)) return true;
  if (isReceiptSnapshotCase(normalized) && !isProtectedReceiptSnapshotCase(normalized)) {
    return true;
  }

  const status = normalizeCaseText(normalized?.status);
  const stage = normalizeCaseText(normalized?.stage);
  const currentStep = normalizeCaseText(normalized?.currentStep);
  const source = normalizeCaseText(normalized?.source);
  const title = normalizeCaseText(
    normalized?.title ||
      normalized?.caseName ||
      normalized?.name ||
      normalized?.caseData?.title ||
      normalized?.caseData?.caseName
  );
  const eventCount = getCaseEventCount(normalized);
  const hasReceiptReadiness =
    normalized?.receiptEligible === true ||
    normalized?.caseReceiptEligible === true ||
    status === "receipt_ready" ||
    stage === "receipt_ready";
  const hasFormalOrHistoricSignal =
    hasPaymentOrFormalReceiptSignal(normalized) ||
    hasVerificationHistoricSignal(normalized);
  const hasActionableStep = Boolean(
    currentStep &&
      !["diagnostic", "result"].includes(currentStep)
  );
  const emptyDraftOrResultOnly = Boolean(
    ["", "draft", "diagnostic_completed", "result_ready", "result", "diagnostic"].includes(status) &&
      ["", "draft", "diagnostic_completed", "result_ready", "result", "diagnostic"].includes(stage) &&
      eventCount === 0 &&
      !hasReceiptReadiness &&
      !hasFormalOrHistoricSignal &&
      !hasMeaningfulCaseTitle(normalized) &&
      !hasActionableStep
  );
  const oldTestShell = Boolean(
    (source.includes("test") ||
      source.includes("demo") ||
      title.includes("test") ||
      title.includes("demo")) &&
      eventCount === 0 &&
      !hasReceiptReadiness &&
      !hasFormalOrHistoricSignal
  );

  return emptyDraftOrResultOnly || oldTestShell;
}

function getWorkspaceCaseRichnessScore(item = {}) {
  const normalized = normalizeCaseItem(item);
  const stage = normalizeCaseText(normalized?.stage || normalized?.status);
  const currentStep = normalizeCaseText(normalized?.currentStep);
  const source = normalizeCaseText(normalized?.source);
  const updatedAtMs = new Date(
    normalized?.updatedAt ||
      normalized?.savedAt ||
      normalized?.createdAt ||
      0
  ).getTime();

  const stageScore =
    stage === "receipt_ready"
      ? 2000
      : stage.startsWith("s")
        ? 20
        : stage
          ? 100
          : 0;
  const receiptScore = normalized?.receiptEligible === true ? 1000 : 0;
  const sourceScore =
    source === "receipt_page_repair" || source === "receipt_page"
      ? 700
      : source === "pilot_page"
        ? 600
        : source === "pilot_page_case_name"
          ? 500
          : source === "pilot"
            ? 10
            : 100;
  const stepScore =
    currentStep === "receipt" || currentStep === "verification"
      ? 500
      : currentStep === "pilot_result"
        ? 400
        : currentStep
          ? 50
          : 0;
  const updatedScore = Number.isFinite(updatedAtMs) ? updatedAtMs / 1000000 : 0;

  return (
    stageScore +
    receiptScore +
    sourceScore +
    stepScore +
    updatedScore +
    getCaseEventCount(normalized)
  );
}

function pickRicherWorkspaceCase(existing = {}, incoming = {}) {
  return getWorkspaceCaseRichnessScore(incoming) >
    getWorkspaceCaseRichnessScore(existing)
    ? incoming
    : existing;
}

function dedupeWorkspaceCases(caseItems = []) {
  const caseMap = new Map();

  (Array.isArray(caseItems) ? caseItems : []).forEach((caseItem) => {
    const caseId = resolveCaseId(caseItem);
    if (!caseId) return;

    const existing = caseMap.get(caseId);
    caseMap.set(
      caseId,
      existing
        ? pickRicherWorkspaceCase(existing, caseItem)
        : { ...caseItem, caseId }
    );
  });

  return Array.from(caseMap.values());
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
  const status = normalizeCaseText(normalized?.status);
  const stage = normalizeCaseText(normalized?.stage);
  const currentStep = normalizeCaseText(normalized?.currentStep);

  return (
    (status === "draft" || stage === "draft" || (!status && !stage)) &&
    getCaseEventCount(normalized) === 0 &&
    normalized?.receiptEligible !== true &&
    !hasMeaningfulCaseTitle(normalized) &&
    (!currentStep || currentStep === "diagnostic" || currentStep === "result") &&
    !hasDiagnosticResultData(normalized) &&
    !hasPostDiagnosticProgress(normalized)
  );
}

function isVisibleActiveCase(item) {
  return (
    !isSuppressedWorkspaceCase(item) &&
    (!isReceiptSnapshotCase(item) || isProtectedReceiptSnapshotCase(item))
  );
}

function hasActivatedReceipt(item) {
  return isBackendReceiptPaidOrActivated(normalizeCaseItem(item));
}

function hasActivatedVerification(item = {}) {
  return hasBackendOwnedVerificationAccess(normalizeCaseItem(item));
}

// This helper is intentionally not wired into the UI yet. It mirrors
// docs/CASE_LIFECYCLE_AND_WORKSPACE_LIMIT_CONTRACT.md and will later power
// Active / Baseline / Historic grouping.
function getCaseSection(caseItem) {
  const normalized = normalizeCaseItem(caseItem);
  const derived = deriveCaseListState(normalized);
  const status = normalizeCaseText(normalized?.status);
  const stage = normalizeCaseText(normalized?.stage);
  const currentStep = normalizeCaseText(normalized?.currentStep);
  const source = normalizeCaseText(normalized?.source);
  const eventCount = getCaseEventCount(normalized);
  const hasMeaningfulTitle = hasMeaningfulCaseTitle(normalized);

  if (isSuppressedWorkspaceCase(normalized)) {
    return "hidden";
  }

  const hasExplicitHistoricDelivery = Boolean(
    hasVerificationHistoricSignal(normalized)
  );

  if (hasExplicitHistoricDelivery) {
    return "historic";
  }

  const receiptRecordStatuses = new Set(["issued", "activated", "baseline_issued"]);
  const verificationRecordStatuses = new Set([
    "paid",
    "completed",
    "delivered",
    "activated",
    "issued",
  ]);
  const receiptStatus = String(normalized?.receiptStatus || "").toLowerCase();
  const receiptObjectStatus = String(
    normalized?.receipt?.status || ""
  ).toLowerCase();
  const paymentStatus = String(normalized?.paymentStatus || "").toLowerCase();
  const verificationStatus = String(
    normalized?.verificationStatus || ""
  ).toLowerCase();
  const verificationObjectStatus = String(
    normalized?.verification?.status || ""
  ).toLowerCase();
  const hasLiveReceiptIdentifier = Boolean(
    hasNonEmptyText(normalized?.receiptId) ||
      hasNonEmptyText(normalized?.receiptHash) ||
      hasNonEmptyText(normalized?.receipt?.receiptId) ||
      hasNonEmptyText(normalized?.receipt?.hash) ||
      hasNonEmptyText(normalized?.receipt?.receiptHash)
  );
  const paymentType = normalizeCaseText(
    normalized?.paymentType ||
      normalized?.priceType ||
      normalized?.productType ||
      normalized?.receipt?.paymentType ||
      normalized?.receipt?.priceType ||
      normalized?.receipt?.productType
  );
  const hasFormalReceiptPaymentRecord = Boolean(
    ["receipt_activation", "formal_receipt"].includes(paymentType) &&
      (normalized?.paid === true ||
        ["paid", "succeeded", "complete"].includes(paymentStatus))
  );
  const hasFormalLiveReceiptIssued = Boolean(
    normalized?.receiptIssued === true ||
      normalized?.baselineIssued === true ||
      normalized?.receipt?.issued === true ||
      normalized?.receipt?.activated === true ||
      normalized?.receipt?.baselineIssued === true
  );
  const hasFormalBaselineIndicator = Boolean(
    status === "baseline_issued" ||
      stage === "baseline_issued" ||
      status === "receipt_issued" ||
      stage === "receipt_issued" ||
      status === "receipt_activated" ||
      stage === "receipt_activated" ||
      hasFormalReceiptPaymentRecord ||
      hasFormalLiveReceiptIssued
  );

  const hasBaselineSignal = Boolean(
    !hasVerificationHistoricSignal(normalized) &&
      (normalized?.paid === true ||
      hasFormalBaselineIndicator ||
      (hasLiveReceiptIdentifier && hasFormalLiveReceiptIssued) ||
      receiptRecordStatuses.has(receiptObjectStatus) ||
      ["paid", "succeeded", "complete"].includes(paymentStatus) ||
      receiptRecordStatuses.has(receiptStatus) ||
      verificationRecordStatuses.has(verificationStatus) ||
        verificationRecordStatuses.has(verificationObjectStatus))
  );

  if (hasBaselineSignal) {
    return "baseline";
  }

  if (
    status === "completed" ||
    stage === "completed" ||
    status === "closed" ||
    stage === "closed"
  ) {
    return hasVerificationHistoricSignal(normalized) ? "historic" : "hidden";
  }

  const actionableStates = new Set([
    "draft",
    "diagnostic_completed",
    "result_ready",
    "result",
    "pilot",
    "pilot_result",
    "event_captured",
    "receipt_ready",
    "workspace_active",
  ]);
  const isReceiptReadyActionable = Boolean(
    normalized?.receiptEligible === true ||
      stage === "receipt_ready" ||
      status === "receipt_ready"
  );
  const hasActionableState =
    actionableStates.has(status) ||
    actionableStates.has(stage) ||
    actionableStates.has(currentStep) ||
    source === "pilot_page" ||
    source === "pilot_page_case_name";
  const savedDiagnosticResultCase = Boolean(
    status === "diagnostic_completed" ||
      source === "result_page_save_case" ||
      source === "diagnostic_save_case"
  );

  const staleDiagnosticOrResultOnly = Boolean(
    (status.includes("diagnostic") ||
      stage.includes("diagnostic") ||
      status.includes("result") ||
      stage.includes("result")) &&
      normalized?.receiptEligible !== true &&
      eventCount === 0 &&
      !hasMeaningfulTitle &&
      !savedDiagnosticResultCase
  );

  if (isEmptyDraftCase(normalized) || staleDiagnosticOrResultOnly) {
    return "hidden";
  }

  if (hasActionableState || isReceiptReadyActionable || eventCount > 0) {
    return "active";
  }

  if (
    !hasMeaningfulTitle &&
    eventCount === 0 &&
    normalized?.receiptEligible !== true &&
    !savedDiagnosticResultCase
  ) {
    return "hidden";
  }

  return "active";
}

// Central frontend contract for ordinary Delete, high-risk Delete, and Protected record eligibility.
function getCaseDeleteMode(caseItem) {
  const normalized = normalizeCaseItem(caseItem);
  const section = getCaseSection(normalized);

  if (section === "baseline" || section === "historic") {
    return "not_deletable";
  }

  const lockedReceiptStatuses = new Set(["paid", "issued", "activated"]);
  const lockedVerificationStatuses = new Set([
    "paid",
    "activated",
    "issued",
    "delivered",
    "verified",
    "completed",
  ]);
  const paymentStatus = String(normalized?.paymentStatus || "").toLowerCase();
  const paymentType = String(
    normalized?.paymentType ||
      normalized?.priceType ||
      normalized?.productType ||
      normalized?.receipt?.paymentType ||
      normalized?.receipt?.priceType ||
      normalized?.receipt?.productType ||
      ""
  ).toLowerCase();
  const receiptStatus = String(normalized?.receiptStatus || "").toLowerCase();
  const receiptObjectStatus = String(normalized?.receipt?.status || "").toLowerCase();
  const verificationStatus = String(normalized?.verificationStatus || "").toLowerCase();
  const verificationObjectStatus = String(normalized?.verification?.status || "").toLowerCase();
  const isFormalReceiptPayment = ["receipt_activation", "formal_receipt"].includes(paymentType);

  if (
    hasActivatedReceipt(normalized) ||
    hasActivatedVerification(normalized) ||
    normalized?.paid === true ||
    paymentStatus === "paid" ||
    lockedReceiptStatuses.has(receiptStatus) ||
    lockedReceiptStatuses.has(receiptObjectStatus) ||
    lockedVerificationStatuses.has(verificationStatus) ||
    lockedVerificationStatuses.has(verificationObjectStatus) ||
    normalized?.verificationDelivered === true ||
    normalized?.evidencePackageDownloaded === true ||
    normalized?.firstEvidencePackageDownloaded === true ||
    normalized?.verification?.delivered === true ||
    normalized?.verification?.evidencePackageDownloaded === true ||
    normalized?.verification?.firstEvidencePackageDownloaded === true
  ) {
    return "not_deletable";
  }

  if (
    paymentStatus === "checkout_created" &&
    normalized?.paid !== true &&
    isFormalReceiptPayment
  ) {
    return "high_risk_delete";
  }

  return "normal_delete";
}

// Current trial / pilot extension active case limit is 3. Future paid workspace
// plans should replace this with a plan-aware limit.
const CURRENT_ACTIVE_CASE_LIMIT = 3;

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
  const guardedClientState = React.useMemo(
    () => runClientStateGuard(location),
    [location.search, location.state]
  );

  const resolvedCaseId =
    location.state?.caseId ||
    location.state?.case_id ||
    guardedClientState.currentCaseId ||
    "";
  const resolvedEmail =
    location.state?.email ||
    location.state?.userEmail ||
    guardedClientState.workspaceEmail ||
    resolveEmailFromCaseId(
      location.state?.caseId ||
        location.state?.case_id ||
        guardedClientState.currentCaseId ||
        ""
    ) ||
    "";
  const [expandedCaseIds, setExpandedCaseIds] = React.useState({});
  const [caseCreationError, setCaseCreationError] = React.useState("");
  const [showSubscriptionOptions, setShowSubscriptionOptions] = React.useState(false);
  const [subscriptionCheckoutError, setSubscriptionCheckoutError] = React.useState("");
  const [startingSubscriptionCheckout, setStartingSubscriptionCheckout] = React.useState(false);
  const [pilotExtensionAccess, setPilotExtensionAccess] = React.useState(null);

  const [cases, setCases] = React.useState([]);
  const [archivedCases, setArchivedCases] = React.useState([]);
  const [savedEmail, setSavedEmail] = React.useState(resolvedEmail);
  const [emailInput, setEmailInput] = React.useState(resolvedEmail);
  const [emailError, setEmailError] = React.useState("");
  const [emailStatus, setEmailStatus] = React.useState("");
  const [loadingCases, setLoadingCases] = React.useState(false);
  const [workspaceLookupSettled, setWorkspaceLookupSettled] = React.useState(
    () => !formatEmail(resolvedEmail).includes("@")
  );
  const [diagnosticHandoffInProgress, setDiagnosticHandoffInProgress] = React.useState(false);
  const [showNoCaseModal, setShowNoCaseModal] = React.useState(false);
  const [showActiveCaseLimitModal, setShowActiveCaseLimitModal] = React.useState(false);
  const [highRiskDeleteTarget, setHighRiskDeleteTarget] = React.useState(null);
  const [caseView, setCaseView] = React.useState("active");
  const [editingCaseId, setEditingCaseId] = React.useState("");
  const [editingTitle, setEditingTitle] = React.useState("");
  const [showTrialDetails, setShowTrialDetails] = React.useState(false);
  const [trialStatusDisplay, setTrialStatusDisplay] = React.useState(null);
  const [savingTitleCaseId, setSavingTitleCaseId] = React.useState("");
  const [titleEditError, setTitleEditError] = React.useState({ caseId: "", message: "" });
  const titleInputRef = React.useRef(null);
  const diagnosticHandoffInProgressRef = React.useRef(false);
  const pilotExtensionConfirmAttemptedRef = React.useRef(new Set());
  const resolvedWorkspaceEmail = formatEmail(savedEmail || resolvedEmail);
  React.useEffect(() => {
    let cancelled = false;

    async function loadTrialStatusDisplay() {
      if (!resolvedWorkspaceEmail) {
        setTrialStatusDisplay(null);
        return;
      }

      const result = await getTrialStatusDisplayModel({
        email: resolvedWorkspaceEmail,
      });

      if (cancelled) return;

      setTrialStatusDisplay(
        result?.shouldShowTrialStatusBar === true ? result : null
      );
    }

    void loadTrialStatusDisplay();

    return () => {
      cancelled = true;
    };
  }, [resolvedWorkspaceEmail]);

  const hasWorkspaceIdentity =
    Boolean(resolvedWorkspaceEmail) &&
    (
      cases.length > 0 ||
      archivedCases.length > 0 ||
      isKnownWorkspaceEmail(resolvedWorkspaceEmail)
    );
  const hasResolvedEmailForLookup = Boolean(
    resolvedWorkspaceEmail && resolvedWorkspaceEmail.includes("@")
  );
  const workspaceLookupUnsettled =
    hasResolvedEmailForLookup && !workspaceLookupSettled && !hasWorkspaceIdentity;
  const shouldSuppressWorkspaceOnboardingSurface = workspaceLookupUnsettled;
  const hasBackendConfirmedPilotExtension =
    pilotExtensionAccess?._backendConfirmed === true &&
    pilotExtensionAccess?.pilotExtensionPaid === true &&
    pilotExtensionAccess?.paymentType === "pilot_extension";
  const planSurfaceContract = React.useMemo(() => {
    const trialSession = getTrialSession() || {};
    const trialStartedAt =
      trialSession?.startedAt ||
      trialSession?.createdAt ||
      trialSession?.trialStartedAt ||
      "";
    const trialStartMs = trialStartedAt ? new Date(trialStartedAt).getTime() : 0;
    const pilotWindowEnded =
      Number.isFinite(trialStartMs) &&
      trialStartMs > 0 &&
      Date.now() - trialStartMs >= 7 * 24 * 60 * 60 * 1000;

    return getPlanSurfaceContract({
      checkoutStarted:
        pilotExtensionAccess?.pilotExtensionPaymentStatus === "checkout_created" ||
        pilotExtensionAccess?.paymentStatus === "checkout_created",
      checkoutSessionId:
        pilotExtensionAccess?.stripeSessionId ||
        pilotExtensionAccess?.sessionId ||
        pilotExtensionAccess?.checkoutSessionId ||
        "",
      paymentStatus:
        pilotExtensionAccess?.pilotExtensionPaymentStatus ||
        pilotExtensionAccess?.paymentStatus ||
        "",
      subscriptionStatus:
        pilotExtensionAccess?.subscriptionStatus ||
        pilotExtensionAccess?.status ||
        "",
      subscriptionActive: hasBackendConfirmedPilotExtension,
      planActive: pilotExtensionAccess?.pilotExtensionPaid === true,
      localPlanFlowEntered: false,
      pilotWindowEnded,
    }) || {};
  }, [hasBackendConfirmedPilotExtension, pilotExtensionAccess]);
  const planOuterCtaLabel = planSurfaceContract?.outerCtaLabel || "Manage Plan";
  const planModalPrimaryLabel =
    planSurfaceContract?.modalPrimaryLabel ||
    (hasBackendConfirmedPilotExtension ? "Manage Billing" : "Continue Plan");
  const showPlanCancelOption =
    planSurfaceContract?.showCancelPlan === true &&
    planSurfaceContract?.cancelPlanPlacement === "manage_plan_modal_only";

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

  React.useEffect(() => {
    if (!editingCaseId) return;

    const timeout = window.setTimeout(() => {
      titleInputRef.current?.focus?.();
      titleInputRef.current?.select?.();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [editingCaseId]);

  const loadCasesForEmail = React.useCallback(async (rawEmail, options = {}) => {
    console.log("[loadCasesForEmail called]", rawEmail);

    const email = formatEmail(rawEmail);
    const showNoCaseModalForEmpty = options.showNoCaseModalForEmpty === true;

    if (!email || !email.includes("@")) {
      console.log("[CasesPage] invalid email, forcing access state");

      diagnosticHandoffInProgressRef.current = false;
      setDiagnosticHandoffInProgress(false);
      localStorage.removeItem(EMAIL_STORAGE_KEY);
      setSavedEmail("");
      setEmailInput("");
      setCases([]);
      setArchivedCases([]);
      setWorkspaceLookupSettled(true);

      return;
    }

    diagnosticHandoffInProgressRef.current = false;
    setDiagnosticHandoffInProgress(false);
    setWorkspaceLookupSettled(false);
    setLoadingCases(true);
    setEmailError("");
    setEmailStatus("");

    try {
      const casesLookupUrl = `${API_BASE}/cases?email=${encodeURIComponent(email)}`;
      const response = await fetch(casesLookupUrl);

      const payload = await response.json().catch(() => []);

      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || "Could not load cases.");
      }

      const caseIdOf = (item = {}) =>
        String(
          item?.caseId ||
            item?.case_id ||
            item?.id ||
            item?.caseSnapshot?.caseId ||
            item?.caseSnapshot?.caseRecord?.caseId ||
            ""
        ).trim();
      const deletedCaseIds = getDeletedCaseIds();
      const isDeletedRecord = (item = {}) => {
        const itemCaseId = caseIdOf(item);
        return Boolean(itemCaseId && deletedCaseIds.includes(itemCaseId));
      };
      const nextCases = (Array.isArray(payload) ? payload : []).filter(
        (item) => !isDeletedRecord(item)
      );

      const backendCaseIds = new Set(nextCases.map(caseIdOf).filter(Boolean));

      const localCases = getAllCases()
        .flatMap((item) => (Array.isArray(item) ? item : [item]))
        .filter((item) => {
          if (isDeletedRecord(item)) return false;

          const itemCaseId = caseIdOf(item);
          return Boolean(itemCaseId && backendCaseIds.has(itemCaseId));
        });

      const mergedCaseMap = new Map();

      nextCases.forEach((item) => {
        const id = caseIdOf(item);
        if (!id) return;
        if (deletedCaseIds.includes(id)) return;
        mergedCaseMap.set(id, {
          ...item,
          caseId: id,
        });
      });

      localCases.forEach((item) => {
        const id = caseIdOf(item);
        if (!id) return;
        if (deletedCaseIds.includes(id)) return;
        if (!mergedCaseMap.has(id)) return;

        // Local registry may enrich backend cases but must not seed workspace cases after backend load succeeds.
        const existing = mergedCaseMap.get(id) || {};
        mergedCaseMap.set(id, {
          ...item,
          ...existing,
          caseId: id,
          id,
        });
      });

      const mergedCases = await hydrateCaseDetails(
        Array.from(mergedCaseMap.values()).filter((item) => !isDeletedRecord(item))
      );

      const visibleMergedCases = mergedCases.filter((item) => !isDeletedRecord(item));

      if (visibleMergedCases.length === 0) {
        setCases([]);
        setArchivedCases([]);
        setSavedEmail(email);
        setEmailInput(email);
        setEmailStatus("");
        localStorage.setItem(EMAIL_STORAGE_KEY, email);
        localStorage.removeItem("nimclea_current_case_id");
        forgetKnownWorkspaceEmail(email);

        if (showNoCaseModalForEmpty) {
          setShowNoCaseModal(true);
          localStorage.removeItem("nimclea_email_verified");
        } else {
          diagnosticHandoffInProgressRef.current = true;
          setDiagnosticHandoffInProgress(true);
          setShowNoCaseModal(false);
          navigate(ROUTES.DIAGNOSTIC, {
            replace: true,
            state: {
              email,
              from: "zero_case_workspace_redirect",
            },
          });
        }

        return;
      }

      rememberKnownWorkspaceEmail(email);

      const hydratedCases = visibleMergedCases.filter((item) => !isDeletedRecord(item)).map((c) => {
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
          listDisplayStatus:
            getEvidenceEvents({ ...c, events, eventLogs: events }).length > 0
              ? "active"
              : c.status || "draft",
        };
      });

      const confirmedPilotExtension = hydratedCases
        .map((caseItem) => caseItem?.subscription || null)
        .find(
          (subscription) =>
            subscription?._backendConfirmed === true &&
            subscription?.pilotExtensionPaid === true &&
            subscription?.paymentType === "pilot_extension"
        );

      setPilotExtensionAccess(confirmedPilotExtension || null);

      const archivedCaseIds = getArchivedCaseIds().filter(
        (caseId) => !deletedCaseIds.includes(String(caseId || "").trim())
      );
      saveArchivedCaseIds(archivedCaseIds);

      const activeCases = [];
      const nextArchivedCases = [];

      hydratedCases.forEach((caseItem) => {
        const visibleCaseId = String(
          caseItem?.caseId ||
          caseItem?.case_id ||
          caseItem?.id ||
          ""
        ).trim();

        if (visibleCaseId && deletedCaseIds.includes(visibleCaseId)) {
          return;
        }

        if (visibleCaseId && archivedCaseIds.includes(visibleCaseId)) {
          nextArchivedCases.push(caseItem);
        } else {
          activeCases.push(caseItem);
        }
      });

      setCases(filterDeletedCases(activeCases));
      setArchivedCases(filterDeletedCases(nextArchivedCases));
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
      setWorkspaceLookupSettled(true);
      if (!diagnosticHandoffInProgressRef.current) {
        setLoadingCases(false);
      }
    }
  }, [navigate]);

  const beginCaseTitleEdit = React.useCallback((caseItem) => {
    const caseId = getOwnCaseId(caseItem);

    if (!caseId) {
      console.warn("[CasesPage title edit] Missing caseId for rename target", caseItem);
      return;
    }

    setTitleEditError({ caseId: "", message: "" });
    setEditingCaseId(caseId);
    setEditingTitle(
      String(
        caseItem?.title ||
          caseItem?.caseName ||
          caseItem?.name ||
          "Untitled case"
      ).trim() || "Untitled case"
    );
  }, []);

  const cancelCaseTitleEdit = React.useCallback(() => {
    setEditingCaseId("");
    setEditingTitle("");
  }, []);

  const applyTitleToCaseLists = React.useCallback((caseId, nextTitle, updatedAt) => {
    const updateItem = (item = {}) => {
      const itemCaseId = getOwnCaseId(item);

      if (itemCaseId !== caseId) return item;

      return {
        ...item,
        title: nextTitle,
        name: nextTitle,
        caseName: nextTitle,
        updatedAt: updatedAt || item?.updatedAt,
        caseData: {
          ...(item?.caseData || {}),
          title: nextTitle,
          name: nextTitle,
          caseName: nextTitle,
        },
      };
    };

    setCases((prev) => prev.map(updateItem));
    setArchivedCases((prev) => prev.map(updateItem));
  }, []);

  const commitCaseTitleEdit = React.useCallback(
    async (caseItem) => {
      const caseId = getOwnCaseId(caseItem);
      if (!caseId || savingTitleCaseId === caseId) return;

      const currentTitle = String(
        caseItem?.title ||
          caseItem?.caseName ||
          caseItem?.name ||
          "Untitled case"
      ).trim() || "Untitled case";
      const nextTitle = String(editingTitle || "").trim();

      if (!nextTitle) {
        setEditingCaseId("");
        setEditingTitle("");
        setTitleEditError({
          caseId,
          message: "Title cannot be empty.",
        });
        return;
      }

      if (nextTitle === currentTitle) {
        cancelCaseTitleEdit();
        return;
      }

      setSavingTitleCaseId(caseId);
      setTitleEditError({ caseId: "", message: "" });

      try {
        const response = await fetch(`${API_BASE}/case/${encodeURIComponent(caseId)}/title`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ title: nextTitle }),
        });

        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.message || "Failed to rename case.");
        }

        const updatedTitle =
          String(payload?.data?.title || nextTitle).trim() || currentTitle;
        const updatedAt = payload?.data?.updatedAt || new Date().toISOString();

        applyTitleToCaseLists(caseId, updatedTitle, updatedAt);
        cancelCaseTitleEdit();
      } catch (error) {
        console.warn("[CasesPage title edit] Failed to update case title", error);
        setEditingCaseId("");
        setEditingTitle("");
        setTitleEditError({
          caseId,
          message: "Could not rename case.",
        });
      } finally {
        setSavingTitleCaseId("");
      }
    },
    [API_BASE, applyTitleToCaseLists, cancelCaseTitleEdit, editingTitle, savingTitleCaseId]
  );

  React.useEffect(() => {
    const email = formatEmail(savedEmail || resolvedEmail);

    if (!email) return;

    setSavedEmail(email);
    setEmailInput(email);
    void loadCasesForEmail(email);
  }, [resolvedEmail, savedEmail, loadCasesForEmail]);

  React.useEffect(() => {
    const params = new URLSearchParams(location.search || "");
    const checkoutStatus = params.get("checkout");
    const paymentType = params.get("paymentType");
    const sessionId = String(params.get("session_id") || "").trim();

    if (checkoutStatus === "cancel" && paymentType === "pilot_extension") {
      setSubscriptionCheckoutError("");
      setStartingSubscriptionCheckout(false);
      return;
    }

    if (checkoutStatus !== "success" || paymentType !== "pilot_extension") {
      return;
    }

    if (!sessionId) {
      console.warn("[CasesPage] Pilot extension checkout returned without session_id; ignoring as payment authority.");
      setSubscriptionCheckoutError("Checkout returned without a session reference. Please retry checkout.");
      return;
    }

    const confirmationKey = `pilot_extension:${sessionId}`;
    if (pilotExtensionConfirmAttemptedRef.current.has(confirmationKey)) {
      return;
    }
    pilotExtensionConfirmAttemptedRef.current.add(confirmationKey);

    let cancelled = false;

    async function confirmPilotExtensionCheckout() {
      try {
        const email = formatEmail(savedEmail || resolvedEmail);
        const response = await fetch(`${API_BASE}/api/confirm-checkout-session`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId,
            paymentType: "pilot_extension",
            email,
            caseId:
              resolvedCaseId ||
              cases[0]?.caseId ||
              cases[0]?.id ||
              archivedCases[0]?.caseId ||
              archivedCases[0]?.id ||
              "",
          }),
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok || payload?.success !== true) {
          throw new Error(
            payload?.message ||
              payload?.error ||
              `Pilot extension confirmation failed (${response.status})`
          );
        }

        if (cancelled) return;

        const subscription = {
          ...(payload?.subscription || payload?.subscriptionRecord || {}),
          _backendConfirmed: true,
        };

        setPilotExtensionAccess(subscription);
        localStorage.setItem(
          "nimclea_pilot_extension_paid",
          JSON.stringify({
            paid: true,
            source: "stripe_checkout_confirmed_cache",
            paymentType: "pilot_extension",
            stripeSessionId: sessionId,
            cachedAt: new Date().toISOString(),
          })
        );
        setShowSubscriptionOptions(false);
        setSubscriptionCheckoutError("");
      } catch (error) {
        console.warn("[CasesPage] Failed to confirm pilot extension checkout", error);
        if (!cancelled) {
          setSubscriptionCheckoutError("Could not confirm checkout. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setStartingSubscriptionCheckout(false);
        }
      }
    }

    void confirmPilotExtensionCheckout();

    return () => {
      cancelled = true;
    };
  }, [archivedCases, cases, location.search, resolvedCaseId, resolvedEmail, savedEmail]);

  const handleContinueWithEmail = React.useCallback(() => {
    console.log("[access continue clicked]", { emailInput });
    console.log("[access continue formatted]", formatEmail(emailInput));

    const email = formatEmail(emailInput);

    if (!email) {
      setEmailError("Enter an email to continue.");
      return;
    }

    void loadCasesForEmail(email, {
      showNoCaseModalForEmpty: false,
    });
  }, [emailInput, loadCasesForEmail, navigate]);

  const handleSwitchEmail = React.useCallback(() => {
    diagnosticHandoffInProgressRef.current = false;
    setDiagnosticHandoffInProgress(false);
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
    setWorkspaceLookupSettled(true);
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

        return filterDeletedCases(alreadyArchived ? prev : [...prev, archivedCase]);
      });
    }

    setCases((prev) =>
      filterDeletedCases(prev.filter((caseItem) => {
        const currentCaseId = String(
          caseItem?.caseId ||
          caseItem?.case_id ||
          caseItem?.id ||
          ""
        ).trim();

        return !currentCaseId || !nextArchivedIds.includes(currentCaseId);
      }))
    );

    setExpandedCaseIds((prev) => {
      const next = { ...prev };
      delete next[safeCaseId];
      return next;
    });
  }, [cases]);

  const handleDiscardCase = React.useCallback(async (caseItemOrCaseId, options = {}) => {
    const isCaseIdInput = typeof caseItemOrCaseId === "string";
    const normalizedInput = isCaseIdInput ? {} : normalizeCaseItem(caseItemOrCaseId);
    const safeCaseId = String(
      isCaseIdInput
        ? caseItemOrCaseId
        : normalizedInput?.caseId ||
            normalizedInput?.case_id ||
            normalizedInput?.id ||
            ""
    ).trim();

    if (!safeCaseId) {
      setCaseCreationError("Could not delete this case. Missing case ID.");
      return null;
    }

    const caseItem = isCaseIdInput
      ? cases.find((item) => {
          const normalized = normalizeCaseItem(item);
          const currentCaseId = String(
            normalized?.caseId ||
              normalized?.case_id ||
              normalized?.id ||
              ""
          ).trim();

          return currentCaseId === safeCaseId;
        }) || { caseId: safeCaseId }
      : normalizedInput;

    const deleteMode = getCaseDeleteMode(caseItem);
    const workspaceEmail = formatEmail(
      savedEmail ||
        resolvedEmail ||
        caseItem?.email ||
        normalizedInput?.email ||
        ""
    );

    if (deleteMode === "not_deletable") {
      setCaseCreationError("Formal records cannot be deleted as ordinary cases.");
      return null;
    }

    if (deleteMode === "high_risk_delete" && options.highRiskConfirmed !== true) {
      setCaseCreationError(
        "This case has a payment-pending Formal Receipt checkout. Confirm high-risk deletion before deleting it."
      );
      return { requiresHighRiskConfirmation: true, caseId: safeCaseId };
    }

    try {
      const response = await fetch(`${API_BASE}/case/${encodeURIComponent(safeCaseId)}/discard`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          deletedBy: "user",
          deletionReason: options.deletionReason || "user_confirmed_delete",
          deletedFrom: options.deletedFrom || "cases_page",
          highRiskConfirmed: options.highRiskConfirmed === true,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 404 && deleteMode !== "not_deletable") {
          saveDeletedCaseIds([...getDeletedCaseIds(), safeCaseId]);
          saveArchivedCaseIds(
            getArchivedCaseIds().filter((caseId) => String(caseId).trim() !== safeCaseId)
          );
          try {
            deleteLocalCase(safeCaseId);
          } catch (error) {
            console.warn("Failed to remove deleted case from local registry", error);
          }

          setCases((prev) =>
            filterDeletedCases(prev.filter((caseItem) => {
              const currentCaseId = String(
                caseItem?.caseId ||
                  caseItem?.case_id ||
                  caseItem?.id ||
                  ""
              ).trim();

              return currentCaseId !== safeCaseId;
            }))
          );

          setArchivedCases((prev) =>
            filterDeletedCases(prev.filter((caseItem) => {
              const currentCaseId = String(
                caseItem?.caseId ||
                  caseItem?.case_id ||
                  caseItem?.id ||
                  ""
              ).trim();

              return currentCaseId !== safeCaseId;
            }))
          );

          setExpandedCaseIds((prev) => {
            const next = { ...prev };
            delete next[safeCaseId];
            return next;
          });
          if (workspaceEmail) {
            rememberKnownWorkspaceEmail(workspaceEmail);
            void loadCasesForEmail(workspaceEmail, {
              showNoCaseModalForEmpty: false,
            });
          }
          setCaseCreationError("");

          return { success: true, staleRemoved: true, caseId: safeCaseId };
        }

        if (response.status === 409 && payload?.requiresHighRiskConfirmation === true) {
          setCaseCreationError(
            "This case has a payment-pending Formal Receipt checkout. Confirm high-risk deletion before deleting it."
          );
          return { requiresHighRiskConfirmation: true, caseId: safeCaseId };
        }

        setCaseCreationError(payload?.message || "Could not delete this case. Please try again.");
        return null;
      }

      saveDeletedCaseIds([...getDeletedCaseIds(), safeCaseId]);
      saveArchivedCaseIds(
        getArchivedCaseIds().filter((caseId) => String(caseId).trim() !== safeCaseId)
      );
      try {
        deleteLocalCase(safeCaseId);
      } catch (error) {
        console.warn("Failed to remove deleted case from local registry", error);
      }

      setCases((prev) =>
        filterDeletedCases(prev.filter((caseItem) => {
          const currentCaseId = String(
            caseItem?.caseId ||
              caseItem?.case_id ||
              caseItem?.id ||
              ""
          ).trim();

          return currentCaseId !== safeCaseId;
        }))
      );

      setArchivedCases((prev) =>
        filterDeletedCases(prev.filter((caseItem) => {
          const currentCaseId = String(
            caseItem?.caseId ||
              caseItem?.case_id ||
              caseItem?.id ||
              ""
          ).trim();

          return currentCaseId !== safeCaseId;
        }))
      );

      setExpandedCaseIds((prev) => {
        const next = { ...prev };
        delete next[safeCaseId];
        return next;
      });
      if (workspaceEmail) {
        rememberKnownWorkspaceEmail(workspaceEmail);
        void loadCasesForEmail(workspaceEmail, {
          showNoCaseModalForEmpty: false,
        });
      }
      setCaseCreationError("");

      return payload;
    } catch (error) {
      console.warn("Failed to discard case", error);
      setCaseCreationError("Could not delete this case. Please try again.");
      return null;
    }
  }, [
    cases,
    loadCasesForEmail,
    resolvedEmail,
    savedEmail,
    setArchivedCases,
    setCaseCreationError,
    setCases,
    setExpandedCaseIds,
  ]);

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

        return filterDeletedCases(alreadyActive ? prev : [...prev, restoredCase]);
      });
    }

    setArchivedCases((prev) =>
      filterDeletedCases(prev.filter((caseItem) => {
        const currentCaseId = String(
          caseItem?.caseId ||
          caseItem?.case_id ||
          caseItem?.id ||
          ""
        ).trim();

        return currentCaseId !== safeCaseId;
      }))
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
          paymentType: "pilot_extension",
          email: savedEmail,
          caseId:
            resolvedCaseId ||
            cases[0]?.caseId ||
            cases[0]?.id ||
            archivedCases[0]?.caseId ||
            archivedCases[0]?.id ||
            "",
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
  }, [archivedCases, cases, resolvedCaseId, savedEmail]);

  const handleCreateNewCase = async () => {

    if (!savedEmail) {
      setCaseCreationError("Enter your email first.");
      return;
    }

    if (caseSectionCounts.active >= CURRENT_ACTIVE_CASE_LIMIT) {
      setCaseCreationError("");
      setShowActiveCaseLimitModal(true);
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
      const createdAt = createdCase?.createdAt || new Date().toISOString();

      if (!newCaseId) {
        setCaseCreationError("Could not create a new case. Please try again.");
        return;
      }

      const trialSession = getTrialSession() || {};
      const userId =
        trialSession?.userId ||
        localStorage.getItem("stableUserId") ||
        getStableUserId();
      const trialId = `case_${newCaseId}`;

      await saveCaseSnapshot({
        userId,
        trialId,
        caseId: newCaseId,
        id: newCaseId,
        email: savedEmail,
        title: "Untitled case",
        status: "draft",
        stage: "diagnostic",
        currentStep: "diagnostic",
        source: "cases_page",
        createdAt,
        updatedAt: new Date().toISOString(),
      });

      await logCaseEmail({
        email: savedEmail,
        caseId: newCaseId,
        source: "cases_page",
      });

      navigate(`${ROUTES.DIAGNOSTIC}?caseId=${encodeURIComponent(newCaseId)}&from=new_case`, {
        state: {
          caseId: newCaseId,
          case_id: newCaseId,
          email: savedEmail,
          trialId,
          session_id: trialId,
          from: "new_case",
          source: "cases_page",
        },
      });
    } catch (error) {
      console.warn("Failed to create case", error);
      setCaseCreationError("Could not create a new case. Please try again.");
    }
  };

  const workspaceCases = React.useMemo(
    () =>
      dedupeWorkspaceCases([
        ...cases,
        ...archivedCases.map((caseItem) => ({
          ...caseItem,
          archived: true,
        })),
      ]),
    [archivedCases, cases]
  );

  const visibleActiveCases = React.useMemo(
    () => workspaceCases.filter(isVisibleActiveCase),
    [workspaceCases]
  );

  // Derived only; not wired into the UI yet. Current rendering still uses
  // visibleActiveCases / archivedCases until the three-section UI is introduced.
  const activeCaseSectionGroups = React.useMemo(() => {
    return workspaceCases.reduce(
      (groups, caseItem) => {
        if (!isVisibleActiveCase(caseItem)) {
          return groups;
        }

        const section = getCaseSection(caseItem);

        if (section === "hidden") {
          return groups;
        }

        if (section === "historic") {
          groups.historicRecords.push(caseItem);
        } else if (section === "baseline") {
          groups.baselineRecords.push(caseItem);
        } else {
          groups.activeCases.push(caseItem);
        }

        return groups;
      },
      {
        activeCases: [],
        baselineRecords: [],
        historicRecords: [],
      }
    );
  }, [workspaceCases]);

  // Derived only; not wired into the UI yet. It previews future Delete / high-risk Delete / not-deletable eligibility before Archive is replaced.
  const caseDeleteModeGroups = React.useMemo(() => {
    return workspaceCases.reduce(
      (groups, caseItem) => {
        if (!isVisibleActiveCase(caseItem)) {
          return groups;
        }

        const mode = getCaseDeleteMode(caseItem);

        if (mode === "high_risk_delete") {
          groups.highRiskDeleteCases.push(caseItem);
        } else if (mode === "normal_delete") {
          groups.normalDeleteCases.push(caseItem);
        } else {
          groups.notDeletableCases.push(caseItem);
        }

        return groups;
      },
      {
        normalDeleteCases: [],
        highRiskDeleteCases: [],
        notDeletableCases: [],
      }
    );
  }, [workspaceCases]);

  const caseSectionCounts = React.useMemo(
    () => ({
      active: activeCaseSectionGroups.activeCases.length,
      baseline: activeCaseSectionGroups.baselineRecords.length,
      historic: activeCaseSectionGroups.historicRecords.length,
    }),
    [activeCaseSectionGroups]
  );

  const visibleLifecycleCases = React.useMemo(() => {
    if (caseView === "baseline") {
      return activeCaseSectionGroups.baselineRecords;
    }

    if (caseView === "historic") {
      return activeCaseSectionGroups.historicRecords;
    }

    return activeCaseSectionGroups.activeCases;
  }, [activeCaseSectionGroups, caseView]);

  const lifecycleEmptyMessage =
    caseView === "baseline"
      ? "No baseline records."
      : caseView === "historic"
        ? "No historic records."
        : "No active cases.";
  const isLifecycleView = ["active", "baseline", "historic"].includes(caseView);

  const renderCaseTitleControl = (caseItem) => {
    const caseId = getOwnCaseId(caseItem);
    const isEditing = Boolean(caseId && editingCaseId === caseId);
    const isSaving = Boolean(caseId && savingTitleCaseId === caseId);
    const currentTitle = String(
      caseItem?.title ||
        caseItem?.caseName ||
        caseItem?.name ||
        "Untitled case"
    ).trim() || "Untitled case";

    return (
      <div className="min-w-0 flex-1">
        {isEditing ? (
          <input
            ref={titleInputRef}
            type="text"
            value={editingTitle}
            onChange={(event) => setEditingTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                event.stopPropagation();
                void commitCaseTitleEdit(caseItem);
              }

              if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                cancelCaseTitleEdit();
              }
            }}
            onBlur={() => {
              if (!isSaving) {
                void commitCaseTitleEdit(caseItem);
              }
            }}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-lg font-semibold text-slate-900 outline-none focus:border-slate-500"
            aria-label="Rename case title"
          />
        ) : (
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="min-w-0 truncate text-lg font-semibold text-slate-900">
              {sanitizeText(currentTitle, "Untitled case")}
            </h2>
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (!caseId) {
                  console.warn("[CasesPage title edit] Missing caseId for rename target", caseItem);
                  return;
                }
                beginCaseTitleEdit(caseItem);
              }}
              onMouseDown={(event) => event.stopPropagation()}
              disabled={!caseId || isSaving}
              aria-label="Rename case"
              className="inline-flex shrink-0 items-center justify-center rounded-full p-1 text-sm font-semibold text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              title="Rename case"
            >
              {"\u270E"}
            </button>
          </div>
        )}

        {titleEditError.caseId === caseId && titleEditError.message ? (
          <p className="mt-1 text-xs font-medium text-red-600">
            {sanitizeText(titleEditError.message)}
          </p>
        ) : null}
      </div>
    );
  };

  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-900 px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-6 pt-10">
        {hasWorkspaceIdentity && (
          <header className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold">Cases</h1>
                {caseCreationError && (
                  <p className="mt-2 text-xs font-medium text-red-600">
                    {sanitizeText(caseCreationError)}
                  </p>
                )}
              </div>
              <div
                style={{
                  marginLeft: "auto",
                  display: "inline-flex",
                  flexDirection: "column",
                  alignItems: "stretch",
                }}
              >
                {formatEmail(savedEmail || resolvedEmail) && (
                  <div
                    className="text-right text-[11px] font-normal text-slate-400"
                    style={{
                      paddingRight: "16px",
                      whiteSpace: "nowrap",
                      marginBottom: "10px",
                    }}
                  >
                    {formatEmail(savedEmail || resolvedEmail)}
                 </div>
                )}

                <div className="flex flex-wrap items-center justify-end gap-3">
                  {planSurfaceContract?.showOuterCta !== false ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSubscriptionCheckoutError("");
                        setShowSubscriptionOptions(true);
                      }}
                      className="inline-flex items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-700 hover:bg-amber-100 transition"
                    >
                      {sanitizeText(planOuterCtaLabel, "Manage Access")}
                    </button>
                  ) : null}

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
                </div>
              </div>
            </div>

            {trialStatusDisplay && (
              <section
                className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-950"
                aria-label="7-day trial status"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="whitespace-nowrap font-medium">
                    {trialStatusDisplay.trialDay ? (
                      <>
                        <span className="font-semibold text-emerald-950">7-Day Pilot</span>
                        {" · Day "}
                        <span className="font-semibold text-emerald-950">
                          {trialStatusDisplay.trialDay}
                        </span>
                        {" of 7"}
                      </>
                    ) : (
                      <span className="font-semibold text-emerald-950">7-Day Pilot active</span>
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowTrialDetails((current) => !current)}
                    className="inline-flex min-h-7 items-center justify-center rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-900 transition hover:bg-emerald-200"
                    aria-expanded={showTrialDetails}
                  >
                    Pilot guide
                  </button>
                </div>

                {showTrialDetails && (
                  <div className="mt-3 border-t border-emerald-100 pt-3 text-xs leading-5 text-emerald-900">
                    <p className="mb-1 font-semibold text-emerald-950">How this pilot works</p>
                    <p>Use this workspace to run real cases during the 7-day pilot.</p>
                    <p>Progress is tracked by cases created and evidence captured.</p>
                    <p>The Result page is the entry point; Cases is the control surface.</p>
                    <p>Keep each case small, real, and evidence-backed.</p>
                  </div>
                )}
              </section>
            )}
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
              Active Cases ({caseSectionCounts.active})
            </button>
            <span className="text-slate-300" aria-hidden="true">
              |
            </span>
            <button
              type="button"
              onClick={() => setCaseView("baseline")}
              className={`border-b-2 pb-1 transition ${
                caseView === "baseline"
                  ? "border-slate-900 font-semibold text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              Baseline Records ({caseSectionCounts.baseline})
            </button>
            <span className="text-slate-300" aria-hidden="true">
              |
            </span>
            <button
              type="button"
              onClick={() => setCaseView("historic")}
              className={`border-b-2 pb-1 transition ${
                caseView === "historic"
                  ? "border-slate-900 font-semibold text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              Historic Records ({caseSectionCounts.historic})
            </button>
          </nav>
        )}

        {!loadingCases &&
          !diagnosticHandoffInProgress &&
          !hasWorkspaceIdentity &&
          !shouldSuppressWorkspaceOnboardingSurface && (
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
        ) : isLifecycleView && visibleLifecycleCases.length === 0 && hasWorkspaceIdentity ? (
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <p className="text-sm text-slate-500">{lifecycleEmptyMessage}</p>
          </section>
        ) : isLifecycleView && visibleLifecycleCases.length > 0 ? (
          <section className="space-y-3">
            {visibleLifecycleCases.map((item, index) => {
              const normalizedItem = normalizeCaseItem(item);
              const derived = deriveCaseListState(normalizedItem);
              const caseId = normalizedItem?.caseId || normalizedItem?.case_id || normalizedItem?.id || "";
              const hasDiagnosticData = hasDiagnosticResultData(normalizedItem);
              const hasProgress = hasPostDiagnosticProgress(normalizedItem);
              const hasBackendAuthorityIssue = isBackendCaseAuthorityMissing(normalizedItem);
              const isDiagnosticCompletedOnly =
                (hasDiagnosticData && !hasProgress) ||
                isDiagnosticContinuationCase(normalizedItem);
              const isDiagnosticContinuation =
                isDiagnosticContinuationCase(normalizedItem);
              const clickedCaseId = getOwnCaseId(normalizedItem);
              const detailPath = clickedCaseId
                ? getCaseDetailRoute(normalizedItem, clickedCaseId)
                : "/cases";
              const primaryResolvedCaseId = clickedCaseId;
              const eventCount = derived.evidenceEventCount;
              const humanizeStatus = (value = "") =>
                String(value || "")
                  .trim()
                  .replace(/[_-]+/g, " ")
                  .replace(/\b\w/g, (letter) => letter.toUpperCase());
              console.log("[CasesPage state trace]", {
                caseId: primaryResolvedCaseId,
                displayStatus: derived.displayStatus,
                receiptReady: derived.receiptReady,
                hasEvidenceEvent: derived.hasEvidenceEvent,
                evidenceEventCount: derived.evidenceEventCount,
                stage: derived.normalized?.stage,
                status: derived.normalized?.status,
                receiptStatus: derived.normalized?.receiptStatus,
                receiptEligible: derived.normalized?.receiptEligible,
                caseReceiptEligible: derived.normalized?.caseReceiptEligible,
                hasReceiptStageSignal: derived.hasReceiptStageSignal,
                hasConcreteReceiptProgress: derived.hasConcreteReceiptProgress,
                legacyReceiptReadySignal: derived.legacyReceiptReadySignal,
                snapshotOnly: derived.snapshotOnly,
                concreteProgressReasons: derived.concreteProgressReasons,
                paymentStatusText: derived.paymentStatusText,
                hasRealPaymentObject: derived.hasRealPaymentObject,
                trustedPaymentProgress: derived.trustedPaymentProgress,
                rawEventCount: derived.normalized?.eventCount,
                trustedEvidenceEventCount: derived.evidenceEventCount,
                source: derived.normalized?.source,
                readinessScore: derived.readinessContract?.readinessScore,
                readinessLevel: derived.readinessContract?.readinessLevel,
                contractReceiptReady: derived.readinessContract?.receiptReady,
                blockers: derived.readinessContract?.blockers,
                criticalBlockers: derived.readinessContract?.criticalBlockers,
                checks: derived.readinessContract?.checks,
              });
              const shouldContinueDiagnostic =
                !hasBackendAuthorityIssue &&
                (derived.diagnosticOnly || isDiagnosticContinuation) &&
                !derived.hasReceiptStageSignal &&
                !derived.receiptReady;
              const primaryActionPath = shouldContinueDiagnostic && primaryResolvedCaseId
                ? `${ROUTES.PILOT || "/pilot"}?caseId=${encodeURIComponent(primaryResolvedCaseId)}&from=case`
                : detailPath;
              const primaryActionLabel = hasBackendAuthorityIssue
                ? "Record needs sync"
                : shouldContinueDiagnostic
                ? "Continue Case"
                : "Detail";
              const redoDiagnosticCaseId = primaryResolvedCaseId;
              const redoDiagnosticPath = redoDiagnosticCaseId
                ? `${ROUTES.DIAGNOSTIC}?caseId=${encodeURIComponent(redoDiagnosticCaseId)}&redo=1`
                : ROUTES.DIAGNOSTIC;
              const caseKey = caseId || normalizedItem?.id || normalizedItem?.caseId || normalizedItem?.resultId || String(index);
              const isExpanded = Boolean(expandedCaseIds[caseKey]);
              const deleteMode = getCaseDeleteMode(normalizedItem || item);
              const createdAt = normalizedItem?.createdAt || item?.createdAt || "";
              const updatedAt = normalizedItem?.updatedAt || item?.updatedAt || "";
              const savedAt = normalizedItem?.savedAt || item?.savedAt || "";
              const formattedCreatedAt = createdAt
                ? new Date(createdAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })
                : "";
              const formattedUpdatedAt = updatedAt
                ? new Date(updatedAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })
                : "";
              const formattedSavedAt = savedAt
                ? new Date(savedAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })
                : "";

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
                          {isExpanded ? "\u25B6" : "\u25B6"}
                        </span>
                      </button>

                      {renderCaseTitleControl(item)}
                    </div>

                    <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                      <p>Status: {sanitizeText(derived.displayStatus)}</p>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 text-xs text-slate-600">
                        {formattedCreatedAt ? (
                          <p>Created: {formattedCreatedAt}</p>
                        ) : null}
                        {formattedUpdatedAt || formattedSavedAt ? (
                          <p>
                            {formattedUpdatedAt
                              ? `Updated: ${formattedUpdatedAt}`
                              : `Saved: ${formattedSavedAt}`}
                          </p>
                        ) : null}
                        <div className="flex flex-row flex-wrap items-center justify-start gap-3 py-4">
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
                            onClick={() => {
                              if (deleteMode === "not_deletable") {
                                return;
                              }

                              if (deleteMode === "high_risk_delete") {
                                setHighRiskDeleteTarget(normalizedItem || item);
                                return;
                              }

                              const confirmed = window.confirm(
                                "Delete this case? This will remove it from your workspace. This action cannot be undone."
                              );

                              if (!confirmed) return;

                              void handleDiscardCase(normalizedItem || item, {
                                deletionReason: "user_confirmed_delete",
                                deletedFrom: "cases_page",
                              });
                            }}
                            disabled={deleteMode === "not_deletable"}
                            aria-disabled={deleteMode === "not_deletable"}
                            className={
                              deleteMode === "not_deletable"
                                ? "inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-sm font-medium text-slate-400 cursor-not-allowed transition"
                                : "inline-flex items-center justify-center rounded-full border border-slate-300 bg-white text-sm font-medium text-slate-800 transition hover:bg-slate-50"
                            }
                            style={{
                              height: "28px",
                              minHeight: "28px",
                              maxHeight: "28px",
                              padding: "0 14px",
                              lineHeight: "1",
                            }}
                          >
                            {deleteMode === "not_deletable" ? "Protected" : "Delete"}
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

                        const resolvedCaseId = getOwnCaseId(normalizedItem);
                        const targetPath = shouldContinueDiagnostic
                          ? primaryActionPath
                          : getCaseDetailRoute(normalizedItem, resolvedCaseId);
                        const targetCaseId =
                          new URLSearchParams(String(targetPath).split("?")[1] || "")
                            .get("caseId") || "";

                        if (!resolvedCaseId) {
                          console.warn("[CasesPage Detail route] missing clicked caseId", normalizedItem);
                          return;
                        }

                        if (isBackendCaseAuthorityMissing(normalizedItem)) {
                          console.warn("[CasesPage Detail route] backend authority missing; navigation blocked", {
                            clickedCaseId: resolvedCaseId,
                          });
                          return;
                        }

                        console.log("[CasesPage Detail route]", {
                          clickedCaseId: resolvedCaseId,
                          clickedStatus: normalizedItem?.status || "",
                          clickedStage: normalizedItem?.stage || "",
                          clickedCurrentStep: normalizedItem?.currentStep || "",
                          targetPath,
                          targetCaseId,
                        });

                        if (targetCaseId !== resolvedCaseId) {
                          console.error("[CasesPage Detail route] caseId mismatch; navigation blocked", {
                            clickedCaseId: resolvedCaseId,
                            targetPath,
                            targetCaseId,
                          });
                          return;
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
                          state: shouldContinueDiagnostic
                            ? {
                                caseId: resolvedCaseId,
                                case_id: resolvedCaseId,
                                email: savedEmail || resolvedEmail,
                                source: "cases_page",
                                from: "case_continue",
                              }
                            : {
                                caseId: resolvedCaseId,
                                case_id: resolvedCaseId,
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
                const derived = deriveCaseListState(normalizedItem);
                const caseId =
                  normalizedItem?.caseId ||
                  normalizedItem?.case_id ||
                  normalizedItem?.id ||
                  resolveCaseId(normalizedItem) ||
                  "";
                const primaryResolvedCaseId = resolveCaseId(normalizedItem);
                console.log("[CasesPage state trace]", {
                  caseId: primaryResolvedCaseId,
                  displayStatus: derived.displayStatus,
                  receiptReady: derived.receiptReady,
                  hasEvidenceEvent: derived.hasEvidenceEvent,
                  evidenceEventCount: derived.evidenceEventCount,
                  stage: derived.normalized?.stage,
                  status: derived.normalized?.status,
                  receiptStatus: derived.normalized?.receiptStatus,
                  receiptEligible: derived.normalized?.receiptEligible,
                  caseReceiptEligible: derived.normalized?.caseReceiptEligible,
                  hasReceiptStageSignal: derived.hasReceiptStageSignal,
                  hasConcreteReceiptProgress: derived.hasConcreteReceiptProgress,
                  legacyReceiptReadySignal: derived.legacyReceiptReadySignal,
                  snapshotOnly: derived.snapshotOnly,
                  concreteProgressReasons: derived.concreteProgressReasons,
                  paymentStatusText: derived.paymentStatusText,
                  hasRealPaymentObject: derived.hasRealPaymentObject,
                  trustedPaymentProgress: derived.trustedPaymentProgress,
                  rawEventCount: derived.normalized?.eventCount,
                  trustedEvidenceEventCount: derived.evidenceEventCount,
                  source: derived.normalized?.source,
                  readinessScore: derived.readinessContract?.readinessScore,
                  readinessLevel: derived.readinessContract?.readinessLevel,
                  contractReceiptReady: derived.readinessContract?.receiptReady,
                  blockers: derived.readinessContract?.blockers,
                  criticalBlockers: derived.readinessContract?.criticalBlockers,
                  checks: derived.readinessContract?.checks,
                });
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
                          Status: {sanitizeText(derived.displayStatus)}
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

      {showNoCaseModal && !diagnosticHandoffInProgress && (
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

      {showActiveCaseLimitModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4"
          onClick={() => setShowActiveCaseLimitModal(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-slate-900">
              Active case limit reached
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              You already have {CURRENT_ACTIVE_CASE_LIMIT} active cases. Delete an unpaid active case or complete a formal record before creating a new one.
            </p>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowActiveCaseLimitModal(false)}
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
                style={{
                  minWidth: "96px",
                  minHeight: "40px",
                  color: "#1E293B",
                  backgroundColor: "#FFFFFF",
                  borderColor: "#CBD5E1",
                  opacity: 1,
                  visibility: "visible",
                }}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {highRiskDeleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4"
          onClick={() => setHighRiskDeleteTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-red-200 bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-lg font-bold" style={{ color: "#B91C1C" }}>
              Delete pending receipt checkout?
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              This case has a payment-pending Formal Receipt checkout. Deleting it may discard the pending record and cannot be undone.
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Only continue if you are sure this pending checkout should be removed from your workspace.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setHighRiskDeleteTarget(null)}
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = highRiskDeleteTarget;
                  if (!target) return;

                  setHighRiskDeleteTarget(null);
                  void handleDiscardCase(target, {
                    deletionReason: "user_confirmed_high_risk_delete",
                    deletedFrom: "cases_page",
                    highRiskConfirmed: true,
                  });
                }}
                className="inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition"
                style={{
                  border: "1px solid #B91C1C",
                  backgroundColor: "#B91C1C",
                  color: "#FFFFFF",
                }}
              >
                Delete pending record
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
              maxWidth: "min(720px, calc(100vw - 48px))",
              maxHeight: "90vh",
              overflowY: "auto",
              backgroundColor: "#ffffff",
              borderRadius: "24px",
              boxShadow: "0 24px 80px rgba(15, 23, 42, 0.18)",
              padding: "14px 14px 12px 14px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                marginBottom: "10px",
                paddingLeft: "4px",
                paddingRight: "4px",
              }}
            >
              <div>
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
                paddingLeft: "4px",
                paddingRight: "4px",
              }}
            >
              <div
                style={{
                  width: "100%",
                  maxWidth: "460px",
                  padding: "16px",
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
                  <div>- Continue up to 3 active cases</div>
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
                  disabled={startingSubscriptionCheckout || hasBackendConfirmedPilotExtension}
                  className="inline-flex items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-xs font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100"
                  style={{ marginTop: "16px" }}
                >
                  {startingSubscriptionCheckout
                    ? "Starting checkout..."
                    : sanitizeText(planModalPrimaryLabel, "Continue Access")}
                </button>
                {showPlanCancelOption ? (
                  <p
                    style={{
                      margin: "10px 0 0 0",
                      fontSize: "12px",
                      lineHeight: 1.5,
                      color: "#64748B",
                    }}
                  >
                    Cancellation is available through billing management.
                  </p>
                ) : null}
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
