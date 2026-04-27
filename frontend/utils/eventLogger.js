const USER_ID_KEY = "nimclea_user_id_v1";

function createStableUserId() {
  const seed = Math.random().toString(36).slice(2, 10);
  const time = Date.now().toString(36);
  return `u_${time}_${seed}`;
}

export function getStableUserId() {
  try {
    const existing = localStorage.getItem(USER_ID_KEY);
    if (existing) return existing;

    const nextId = createStableUserId();
    localStorage.setItem(USER_ID_KEY, nextId);
    return nextId;
  } catch {
    return `u_fallback_${Date.now()}`;
  }
}

export function getEntrySource() {
  try {
    const url = new URL(window.location.href);

    const fromQuery =
      url.searchParams.get("source") ||
      url.searchParams.get("from") ||
      url.searchParams.get("utm_source") ||
      url.searchParams.get("ref");

    if (fromQuery) return fromQuery;

    const path = window.location.pathname || "";

    if (path.includes("/verification")) return "verification";
    if (path.includes("/receipt")) return "receipt";
    if (path.includes("/pilot-setup")) return "pilot_setup";
    if (path.includes("/pilot")) return "pilot";
    if (path.includes("/result")) return "result";

    return "direct";
  } catch {
    return "unknown";
  }
}

function resolveCurrentCaseId(payload = {}) {
  if (payload?.caseId) return payload.caseId;
  if (payload?.meta?.caseId) return payload.meta.caseId;

  try {
    const candidates = [
      localStorage.getItem("nimclea_current_case_id"),
      localStorage.getItem("currentCaseId"),
      localStorage.getItem("caseId"),
    ].filter(Boolean);

    return candidates[0] || null;
  } catch {
    return null;
  }
}

export function buildEventPayload(eventName, payload = {}) {
  const resolvedCaseId = resolveCurrentCaseId(payload);

  return {
    event: eventName,
    timestamp: new Date().toISOString(),
    userId: payload.userId || getStableUserId(),
    source: payload.source || getEntrySource(),
    sessionId: payload.sessionId || null,
    ...payload,
    caseId: payload.caseId ?? resolvedCaseId ?? null,
    meta: {
      ...(payload.meta || {}),
      caseId: payload.meta?.caseId ?? payload.caseId ?? resolvedCaseId ?? null,
    },
  };
}

export async function logEvent(eventName, payload = {}) {
  const eventPayload = buildEventPayload(eventName, payload);

  try {
    await fetch("http://localhost:3000/api/events/log", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventPayload),
    });
  } catch (error) {
    console.error("logEvent failed:", error, eventPayload);
  }

  return eventPayload;
}
