export function normalizeScoreInput(caseData = {}) {
  const events =
    Array.isArray(caseData.events) ? caseData.events :
    Array.isArray(caseData.capturedEvents) ? caseData.capturedEvents :
    Array.isArray(caseData.entries) ? caseData.entries :
    Array.isArray(caseData.pilot_entries) ? caseData.pilot_entries :
    Array.isArray(caseData.pilotEntries) ? caseData.pilotEntries :
    Array.isArray(caseData.pilot?.entries) ? caseData.pilot.entries :
    Array.isArray(caseData.pilot?.pilot_entries) ? caseData.pilot.pilot_entries :
    [];

  const normalizedEvents = events
    .filter(Boolean)
    .map((event, index) => ({
      index,
      text: String(
        event.text ||
        event.input ||
        event.rawText ||
        event.summary ||
        event.eventInput ||
        event.reviewResult ||
        event.description ||
        event.note ||
        ""
      ).trim(),
      type: String(
        event.type ||
        event.eventType ||
        event.kind ||
        "event"
      ).trim(),
      createdAt: String(
        event.createdAt ||
        event.timestamp ||
        event.time ||
        event.date ||
        ""
      ),
    }))
    .filter(event => event.text.length > 0)
    .sort((a, b) => {
      const ta = a.createdAt || "";
      const tb = b.createdAt || "";
      if (ta !== tb) return ta.localeCompare(tb);
      return a.index - b.index;
    });

  console.log("[NORMALIZE_EVENT_SOURCE]", {
    hasEvents: Array.isArray(caseData.events),
    hasCapturedEvents: Array.isArray(caseData.capturedEvents),
    hasEntries: Array.isArray(caseData.entries),
    hasPilotEntriesSnake: Array.isArray(caseData.pilot_entries),
    hasPilotEntriesCamel: Array.isArray(caseData.pilotEntries),
    normalizedEventCount: normalizedEvents.length,
    firstRawEvent: events[0],
    firstNormalizedEvent: normalizedEvents[0],
  });

  const scopeLock = caseData.scopeLock || caseData.scope || {};
  const checklist = caseData.acceptanceChecklist || caseData.checklist || {};

  return {
    caseId: String(caseData.caseId || caseData.id || ""),
    title: String(caseData.title || caseData.caseTitle || ""),
    workflow: String(scopeLock.workflow || caseData.workflow || ""),
    scopeStatus: String(scopeLock.status || caseData.scopeStatus || ""),
    acceptanceStatus: String(checklist.status || caseData.acceptanceStatus || ""),
    events: normalizedEvents,
    raw: caseData,
  };
}

export function calculateDeterministicScore(caseData = {}) {
  const input = normalizeScoreInput(caseData);
  console.log("[SCORE_INPUT_SNAPSHOT]", {
    caseId: input.caseId,
    title: input.title,
    workflow: input.workflow,
    scopeStatus: input.scopeStatus,
    acceptanceStatus: input.acceptanceStatus,
    eventCount: input.events.length,
    events: input.events.map(e => ({
      text: e.text.slice(0, 120),
      type: e.type,
      createdAt: e.createdAt,
    })),
    rawKeys: caseData ? Object.keys(caseData) : [],
  });
  const eventCount = input.events.length;
  const joinedText = input.events.map(e => e.text.toLowerCase()).join(" ");

  const hasRealEvent = eventCount > 0;
  const hasWorkflow = input.workflow.length > 0 || joinedText.includes("workflow");
  const hasEvidence =
    joinedText.includes("evidence") ||
    joinedText.includes("record") ||
    joinedText.includes("reviewed") ||
    joinedText.includes("verified") ||
    joinedText.includes("support");

  const hasDecisionScope =
    joinedText.includes("request") ||
    joinedText.includes("decision") ||
    joinedText.includes("scope") ||
    joinedText.includes("clarified");

  const hasContinuity =
    eventCount >= 2 ||
    joinedText.includes("follow") ||
    joinedText.includes("next") ||
    joinedText.includes("after");

  const evidence = hasEvidence ? 0.9 : hasRealEvent ? 0.55 : 0;
  const structure = hasWorkflow || hasDecisionScope ? 1.0 : hasRealEvent ? 0.6 : 0;
  const consistency = hasDecisionScope ? 0.85 : hasRealEvent ? 0.45 : 0;
  const continuity = hasContinuity ? 0.85 : hasRealEvent ? 0.45 : 0;

  const totalScore = Number(
    (evidence + structure + consistency + continuity).toFixed(2)
  );

  const receiptThreshold = 3.0;
  const receiptEligible = totalScore >= receiptThreshold && hasRealEvent;

  return {
    evidence: Number(evidence.toFixed(2)),
    structure: Number(structure.toFixed(2)),
    consistency: Number(consistency.toFixed(2)),
    continuity: Number(continuity.toFixed(2)),
    totalScore,
    maxScore: 4,
    receiptThreshold,
    receiptEligible,
    eventCount,
    reason: receiptEligible
      ? "Receipt-ready based on deterministic four-check scoring."
      : "Receipt locked until deterministic four-check score reaches threshold.",
  };
}
