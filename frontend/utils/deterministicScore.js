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
        event.event ||
        event.description ||
        event.content ||
        event.note ||
        event.userInput ||
        event.originalText ||
        event.input ||
        event.rawText ||
        event.summary ||
        event.eventInput?.summaryContext ||
        event.eventInput?.eventDescription ||
        event.eventInput?.eventText ||
        event.eventInput?.rawText ||
        event.eventInput?.userInput ||
        event.eventInput?.description ||
        event.sourceInput?.summaryContext ||
        event.sourceInput?.description ||
        event.reviewResult?.summary ||
        event.reviewResult?.description ||
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

export function normalizeEventText(events = []) {
  return events
    .map((event) => {
      if (typeof event === "string") return event;
      return (
        event?.text ||
        event?.event ||
        event?.description ||
        event?.content ||
        event?.note ||
        event?.rawText ||
        event?.userInput ||
        event?.originalText ||
        event?.input ||
        event?.summary ||
        event?.eventInput?.summaryContext ||
        event?.eventInput?.eventDescription ||
        event?.eventInput?.eventText ||
        event?.eventInput?.rawText ||
        event?.eventInput?.userInput ||
        event?.eventInput?.description ||
        event?.sourceInput?.summaryContext ||
        event?.sourceInput?.description ||
        ""
      );
    })
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function hasAnySignal(text, patterns = []) {
  return patterns.some((pattern) => pattern.test(text));
}

export function getEventScoreBoost(events = []) {
  const text = normalizeEventText(events);

  if (!text.trim()) {
    return {
      evidenceBoost: 0,
      structureBoost: 0,
      consistencyBoost: 0,
      continuityBoost: 0,
      totalBoost: 0,
    };
  }

  const hasEvidenceSignal = hasAnySignal(text, [
    /\b(inv|invoice|txn|transaction|receipt|record|hash|evidence|ap-|ex-)\b/i,
    /\bcase\s*id\b/i,
  ]);
  const hasConflictSignal = hasAnySignal(text, [
    /\b(inconsistent|inconsistency|conflict|conflicting|mismatch|duplicate|duplicated|discrepancy|ambiguous)\b/i,
    /\bdifferent interpretations\b/i,
    /\bunclear records?\b/i,
  ]);
  const hasAuthoritySignal = hasAnySignal(text, [
    /\b(authority|approved|approval|owner|ownership|manager|opsmgr|finance|role|responsibility|decision authority)\b/i,
  ]);
  const hasContinuitySignal = hasAnySignal(text, [
    /\b(pending|validation pending|follow-up validation|no final confirmation|not confirmed|awaiting confirmation|no closure|unresolved|under time pressure|time pressure)\b/i,
    /\b(still pending|still unresolved|pending validation|confirmation pending)\b/i,
  ]);

  let evidenceBoost = 0;
  let structureBoost = 0;
  let consistencyBoost = 0;
  let continuityBoost = 0;

  if (hasEvidenceSignal) {
    evidenceBoost += 0.2;
  }
  if (/\b(reviewed|approved|executed|confirmed|captured|logged|verified)\b/i.test(text)) {
    evidenceBoost += 0.1;
  }

  if (hasAuthoritySignal) {
    structureBoost += 0.2;
  }
  if (/\b(scope|boundary|responsibility|decision|path|workflow)\b/i.test(text)) {
    structureBoost += 0.1;
  }

  if (hasConflictSignal) {
    consistencyBoost += 0.2;
  }
  if (/\b(reconcile|reconciliation|manual|cross-check)\b/i.test(text)) {
    consistencyBoost += 0.1;
  }

  if (hasContinuitySignal) {
    continuityBoost += 0.2;
  }
  if (/\b(closed|closure|confirmed|confirmation|completed|resolved|resolved by)\b/i.test(text)) {
    continuityBoost += 0.1;
  }

  const synergyEligible = hasEvidenceSignal && hasConflictSignal && hasAuthoritySignal && hasContinuitySignal;
  if (synergyEligible) {
    evidenceBoost += 0.05;
    structureBoost += 0.05;
    consistencyBoost += 0.05;
    continuityBoost += 0.1;
  }

  evidenceBoost = Math.min(evidenceBoost, 0.35);
  structureBoost = Math.min(structureBoost, 0.35);
  consistencyBoost = Math.min(consistencyBoost, 0.35);
  continuityBoost = Math.min(continuityBoost, 0.3);

  const totalBoost =
    evidenceBoost + structureBoost + consistencyBoost + continuityBoost;

  return {
    evidenceBoost,
    structureBoost,
    consistencyBoost,
    continuityBoost,
    totalBoost,
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
  const hasEvidence = /\b(evidence|record|reviewed|verified|support|invoice|txn|transaction|receipt|hash|case id)\b/i.test(joinedText);
  const hasConflict = /\b(inconsistent|inconsistency|conflict|conflicting|mismatch|duplicate|duplicated|discrepancy|ambiguous|different interpretations|unclear records?)\b/i.test(joinedText);
  const hasAuthority = /\b(authority|approved|approval|owner|ownership|manager|opsmgr|finance|role|responsibility|decision authority)\b/i.test(joinedText);
  const hasContinuity =
    /\b(pending|validation pending|follow-up validation|no final confirmation|not confirmed|awaiting confirmation|no closure|unresolved|under time pressure|time pressure|still pending|still unresolved|pending validation|confirmation pending)\b/i.test(joinedText);

  const hasDecisionScope =
    joinedText.includes("request") ||
    joinedText.includes("decision") ||
    joinedText.includes("scope") ||
    joinedText.includes("clarified");

  const baseEvidence = hasEvidence ? 0.9 : hasRealEvent ? 0.55 : 0;
  const baseStructure = hasWorkflow || hasDecisionScope ? 1.0 : hasRealEvent ? 0.6 : 0;
  const baseConsistency = hasDecisionScope ? 0.85 : hasRealEvent ? 0.45 : 0;
  const baseContinuity = hasContinuity ? 0.85 : hasRealEvent ? 0.45 : 0;

  const eventBoost = getEventScoreBoost(input.events);
  const evidence = Math.min(1, baseEvidence + eventBoost.evidenceBoost);
  const structure = Math.min(1, baseStructure + eventBoost.structureBoost);
  const consistency = Math.min(1, baseConsistency + eventBoost.consistencyBoost);
  const continuity = Math.min(1, baseContinuity + eventBoost.continuityBoost);

  const totalScore = Number(
    Math.min(4, evidence + structure + consistency + continuity).toFixed(2)
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
    eventBoost,
    eventCount,
    reason: receiptEligible
      ? "Receipt-ready based on deterministic four-check scoring."
      : "Receipt locked until deterministic four-check score reaches threshold.",
  };
}
