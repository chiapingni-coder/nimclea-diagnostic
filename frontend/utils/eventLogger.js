const loggedEvents = new Set();

export function logEvent(type, payload = {}) {
  try {
    const sessionId = payload?.sessionId || "anonymous";
    const dedupeKey = `${sessionId}_${type}`;

    if (loggedEvents.has(dedupeKey)) return;

    loggedEvents.add(dedupeKey);

    const entry = {
      type,
      payload,
      timestamp: new Date().toISOString(),
    };

    console.log("EVENT:", entry);

    const existing = JSON.parse(localStorage.getItem("nimclea_event_log") || "[]");
    existing.push(entry);
    localStorage.setItem("nimclea_event_log", JSON.stringify(existing));
  } catch (error) {
    console.error("logEvent failed:", error);
  }
}

export function logTrialEvent(payload) {
  console.log("logTrialEvent:", payload);
}