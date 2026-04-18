const API_BASE = "http://localhost:3000";

async function safeJsonFetch(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.message || data?.error || "Request failed");
  }

  return data;
}

function getEventOnceKey(payload = {}) {
  const sessionId = payload?.sessionId || "anonymous";
  const eventType =
    payload?.eventType || payload?.type || payload?.event || "unknown_event";

  return `nimclea_event_once_${sessionId}_${eventType}`;
}

function hasLoggedEventOnce(payload = {}) {
  return localStorage.getItem(getEventOnceKey(payload)) === "1";
}

function markEventLoggedOnce(payload = {}) {
  localStorage.setItem(getEventOnceKey(payload), "1");
}

export async function registerTrialUser(payload) {
  return safeJsonFetch(`${API_BASE}/trial/register`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function startTrial(payload) {
  return safeJsonFetch(`${API_BASE}/trial/start`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function saveCaseSnapshot(payload) {
  return safeJsonFetch(`${API_BASE}/case/save`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function logTrialEvent(payload, options = {}) {
  const { once = false } = options;

  if (once && hasLoggedEventOnce(payload)) {
    return {
      ok: true,
      skipped: true,
      reason: "already_logged_once",
    };
  }

  const data = await safeJsonFetch(`${API_BASE}/event/log`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (once) {
    markEventLoggedOnce(payload);
  }

  return data;
}

export async function sendTrialEmail(payload) {
  return safeJsonFetch(`${API_BASE}/email/send`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}