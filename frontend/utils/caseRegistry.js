// frontend/utils/caseRegistry.js

const CASE_REGISTRY_KEY = "nimclea_case_registry";
const CURRENT_CASE_ID_KEY = "nimclea_current_case_id";
const CASE_ID_PATTERN = /^CASE-\d+-[A-Z0-9]{6}$/;

export const CASE_STATUS = {
  DRAFT: "draft",
  RESULT_READY: "result_ready",
  WORKSPACE_ACTIVE: "workspace_active",
  WORKSPACE_SUMMARY: "workspace_summary",
  RECEIPT_READY: "receipt_ready",
  VERIFICATION_READY: "verification_ready",
  VERIFICATION_BLOCKED: "verification_blocked",
};

function safeParse(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function nowIso() {
  return new Date().toISOString();
}

export function createCaseId() {
  return `CASE-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase()}`;
}

export function isValidCaseId(caseId = "") {
  return CASE_ID_PATTERN.test(String(caseId || ""));
}

export function getCaseRegistry() {
  if (typeof window === "undefined") return [];

  const raw = localStorage.getItem(CASE_REGISTRY_KEY);
  const list = safeParse(raw, []);

  return Array.isArray(list) ? list : [];
}

export function getAllCases() {
  try {
    return Object.keys(localStorage)
      .filter((key) => key.startsWith("nimclea_case_"))
      .map((key) => {
        try {
          return JSON.parse(localStorage.getItem(key));
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function saveCaseRegistry(cases = []) {
  if (typeof window === "undefined") return [];

  const safeCases = Array.isArray(cases) ? cases : [];
  localStorage.setItem(CASE_REGISTRY_KEY, JSON.stringify(safeCases));

  return safeCases;
}

export function getCurrentCaseId() {
  if (typeof window === "undefined") return "";

  const caseId = localStorage.getItem(CURRENT_CASE_ID_KEY) || "";
  return isValidCaseId(caseId) ? caseId : "";
}

export function setCurrentCaseId(caseId = "") {
  if (typeof window === "undefined") return "";

  if (!caseId || !isValidCaseId(caseId)) {
    localStorage.removeItem(CURRENT_CASE_ID_KEY);
    return "";
  }

  localStorage.setItem(CURRENT_CASE_ID_KEY, caseId);
  return caseId;
}

export function getCaseById(caseId = "") {
  if (!caseId) return null;

  const cases = getCaseRegistry();
  return cases.find((item) => item.caseId === caseId) || null;
}

function hasCaseEvents(caseRecord = {}) {
  return Array.isArray(caseRecord?.events) && caseRecord.events.length > 0;
}

function isDraftCaseRecord(caseRecord = {}) {
  const status = caseRecord?.status || CASE_STATUS.DRAFT;

  return (
    !hasCaseEvents(caseRecord) &&
    (status === CASE_STATUS.DRAFT || status === CASE_STATUS.RESULT_READY)
  );
}

export function getDraftCase() {
  return getCaseRegistry().find((item) => isDraftCaseRecord(item)) || null;
}

export function createCaseSnapshot(input = {}) {
  const caseId = isValidCaseId(input.caseId) ? input.caseId : createCaseId();
  const createdAt = input.createdAt || nowIso();

  return {
    caseId,

    title:
      input.title ||
      buildCaseTitle(input),

    status: input.status || CASE_STATUS.DRAFT,

    createdAt,
    updatedAt: input.updatedAt || createdAt,

    currentStep: input.currentStep || "diagnostic",

    score:
      typeof input.score === "number"
        ? input.score
        : null,

    weakestDimension: input.weakestDimension || "",
    scenarioLabel: input.scenarioLabel || "",
    stageLabel: input.stageLabel || "",
    runLabel: input.runLabel || "",

    summary:
      input.summary ||
      input.summaryContext ||
      input.displayContext ||
      "",

    receiptId: input.receiptId || "",
    receiptHash: input.receiptHash || "",
    verificationStatus: input.verificationStatus || "",

    scopeLock: input.scopeLock || null,
    acceptanceChecklist: input.acceptanceChecklist || null,

    source: input.source || "local",
  };
}

export function upsertCase(input = {}) {
  if (typeof window === "undefined") return null;

  const cases = getCaseRegistry();
  const explicitCaseId = isValidCaseId(input.caseId) ? input.caseId : "";
  const explicitCase = explicitCaseId
    ? cases.find((item) => item.caseId === explicitCaseId) || null
    : null;
  const wantsDraftCase =
    !hasCaseEvents(input) &&
    (input.status === CASE_STATUS.DRAFT ||
      input.status === CASE_STATUS.RESULT_READY);
  const existingDraft = wantsDraftCase ? getDraftCase() : null;
  const caseId =
    wantsDraftCase && existingDraft && (!explicitCase || isDraftCaseRecord(explicitCase))
      ? existingDraft.caseId
      : explicitCaseId || getCurrentCaseId() || createCaseId();
  const existing = cases.find((item) => item.caseId === caseId) || null;

  const nextCase = {
    ...(existing || createCaseSnapshot({ ...input, caseId })),
    ...input,
    caseId,
    updatedAt: nowIso(),
  };

  const index = cases.findIndex((item) => item.caseId === caseId);

  const nextCases =
    index >= 0
      ? cases.map((item) => (item.caseId === caseId ? nextCase : item))
      : [nextCase, ...cases];

  saveCaseRegistry(nextCases);
  setCurrentCaseId(caseId);

  return nextCase;
}

export function updateCaseStatus(caseId = "", status = "", extra = {}) {
  if (!caseId || !status) return null;

  return upsertCase({
    ...extra,
    caseId,
    status,
  });
}

export function updateCaseScopeLock(caseId = "", scopeLock = null) {
  if (!caseId || !scopeLock) return null;

  try {
    const existing = getCaseById(caseId) || {};
    const existingScopeLock =
      existing.scopeLock && typeof existing.scopeLock === "object"
        ? existing.scopeLock
        : {};

    return upsertCase({
      ...existing,
      caseId,
      scopeLock: {
        ...existingScopeLock,
        ...scopeLock,
      },
      updatedAt: nowIso(),
    });
  } catch (error) {
    console.warn("Failed to update case scope lock", error);
    return null;
  }
}

export function updateCaseAcceptanceChecklist(
  caseId = "",
  acceptanceChecklist = null
) {
  if (!caseId || !acceptanceChecklist) return null;

  try {
    const existing = getCaseById(caseId) || {};
    const existingAcceptanceChecklist =
      existing.acceptanceChecklist &&
      typeof existing.acceptanceChecklist === "object" &&
      !Array.isArray(existing.acceptanceChecklist)
        ? existing.acceptanceChecklist
        : {};

    return upsertCase({
      ...existing,
      caseId,
      acceptanceChecklist: {
        ...existingAcceptanceChecklist,
        ...acceptanceChecklist,
      },
      updatedAt: nowIso(),
    });
  } catch (error) {
    console.warn("Failed to update case acceptance checklist", error);
    return null;
  }
}

export function updateCaseLead(caseId = "", lead = {}) {
  if (!caseId) return null;

  return upsertCase({
    caseId,
    lead: {
      name: lead.name || "",
      email: lead.email || "",
      company: lead.company || "",
      capturedAt: new Date().toISOString(),
      sourcePage: "ReceiptPage",
    },
  });
}

export function markCaseAsPaid(caseId = "") {
  if (!caseId) return null;

  const existing = getCaseById(caseId);
  if (!existing) return null;

  return upsertCase({
    ...existing,
    caseId,
    receipt: {
      ...(existing.receipt || {}),
      paid: true,
    },
  });
}

export function addCaseEvent(caseId, eventPayload) {
  if (!caseId || !eventPayload) return null;

  const storageKey = `nimclea_case_${caseId}`;
  const existingRaw = localStorage.getItem(storageKey);

  const existingCase = existingRaw
    ? JSON.parse(existingRaw)
    : {
        caseId,
        status: "diagnostic_started",
        events: [],
        createdAt: new Date().toISOString(),
      };

  const existingEvents = Array.isArray(existingCase.events)
    ? existingCase.events
    : [];

  const nextEvent = {
    ...eventPayload,
    caseId,
    createdAt: eventPayload.createdAt || new Date().toISOString(),
  };

  const nextCase = {
    ...existingCase,
    caseId,
    events: [...existingEvents, nextEvent],
    status: CASE_STATUS.WORKSPACE_ACTIVE,
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem(storageKey, JSON.stringify(nextCase));
  upsertCase(nextCase);

  return nextCase;
}

export function deleteCase(caseId = "") {
  if (!caseId) return getCaseRegistry();

  const nextCases = getCaseRegistry().filter(
    (item) => item.caseId !== caseId
  );

  saveCaseRegistry(nextCases);

  if (getCurrentCaseId() === caseId) {
    setCurrentCaseId("");
  }

  return nextCases;
}

export function resolveCaseId(locationState = {}) {
  return (
    (isValidCaseId(locationState?.caseId) ? locationState.caseId : "") ||
    (isValidCaseId(locationState?.case_id) ? locationState.case_id : "") ||
    getCurrentCaseId() ||
    createCaseId()
  );
}

export function buildCaseTitle(input = {}) {
  const raw =
    input.workflowName ||
    input.summaryTitle ||
    input.summary ||
    input.summaryContext ||
    input.displayContext ||
    input.caseInput ||
    "";

  const text = String(raw || "").trim();

  if (!text) return "Untitled case";

  return text.length > 72 ? `${text.slice(0, 72)}...` : text;
}

export function getMatchableCases() {
  const registryCases = getCaseRegistry();
  const storedCases = getAllCases();

  const byId = new Map();

  [...registryCases, ...storedCases].forEach((item) => {
    if (!item?.caseId) return;
    byId.set(item.caseId, {
      ...(byId.get(item.caseId) || {}),
      ...item,
    });
  });

  return Array.from(byId.values());
}

export function createCaseFromRoutedInput(inputText = "", extra = {}) {
  return upsertCase({
    title: buildCaseTitle({ caseInput: inputText }),
    summary: String(inputText || ""),
    status: CASE_STATUS.WORKSPACE_ACTIVE,
    currentStep: "pilot_capture",
    source: "input_router",
    ...extra,
  });
}

export function attachRoutedEventToCase(caseId = "", inputText = "", extra = {}) {
  if (!caseId || !inputText) return null;

  return addCaseEvent(caseId, {
    eventId: `EVT-${Date.now()}`,
    text: String(inputText || ""),
    eventType: "routed_input",
    source: "input_router",
    ...extra,
  });
}

export function saveStandaloneRoutedEvent(inputText = "", extra = {}) {
  if (typeof window === "undefined") return null;

  const key = "nimclea_standalone_events";
  const existing = safeParse(localStorage.getItem(key), []);

  const event = {
    eventId: `STANDALONE-${Date.now()}`,
    text: String(inputText || ""),
    eventType: "standalone_input",
    source: "input_router",
    createdAt: nowIso(),
    ...extra,
  };

  localStorage.setItem(key, JSON.stringify([...existing, event]));

  return event;
}
