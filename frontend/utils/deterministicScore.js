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
    .filter((event) => event.text.length > 0 || event.type.length > 0)
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
  const joinedText = input.events
    .map((e) => `${e.text || ""} ${e.type || ""}`.toLowerCase())
    .join(" ");

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

  const hasRepeatedEvents = eventCount >= 2;

  const baseEvidence = hasEvidence ? 0.9 : hasRealEvent ? 0.55 : 0;
  const baseStructure = hasWorkflow || hasDecisionScope ? 1.0 : hasRealEvent ? 0.6 : 0;
  const baseConsistency = hasDecisionScope ? 0.85 : hasRealEvent ? 0.45 : 0;
  const baseContinuity = hasContinuity ? 0.85 : hasRepeatedEvents ? 0.65 : hasRealEvent ? 0.45 : 0;

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

function normalizeStatusText(value = "") {
  return String(value || "").trim().toLowerCase();
}

function isMissingStatus(value = "") {
  const normalized = normalizeStatusText(value);

  return (
    !normalized ||
    normalized === "unknown" ||
    normalized === "missing" ||
    normalized === "empty" ||
    normalized === "none" ||
    normalized === "n/a"
  );
}

function hasBrokenSignal(value = "") {
  const normalized = normalizeStatusText(value);

  return (
    normalized === "broken" ||
    normalized === "failed" ||
    normalized === "fail" ||
    normalized.includes("broken") ||
    normalized.includes("mismatch") ||
    normalized.includes("inconsistent")
  );
}

function hasExplicitReceiptReady(input = {}) {
  const receiptStatus = normalizeStatusText(input?.receiptStatus || input?.receipt?.status);
  const stage = normalizeStatusText(input?.stage || input?.receipt?.stage);
  const status = normalizeStatusText(input?.status);

  return Boolean(
    input?.explicitReceiptReady === true ||
      input?.explicitBackendReady === true ||
      input?.backendReceiptReady === true ||
      input?.receiptEligible === true ||
      input?.caseReceiptEligible === true ||
      receiptStatus === "ready" ||
      stage === "receipt_ready" ||
      status === "receipt_ready"
  );
}

function isReadinessEvidenceEvent(event = {}) {
  const text = String(event?.text || "").trim();
  const type = normalizeStatusText(event?.type);
  const nonEvidenceTypes = new Set([
    "entry_viewed",
    "entry_clicked",
    "diagnostic_started",
    "diagnostic_completed",
    "diagnostic_submitted",
    "result_viewed",
    "case_viewed",
    "case_opened",
    "cases_viewed",
    "receipt_viewed",
    "verification_viewed",
    "page_viewed",
    "score_computed",
    "deterministic_score",
  ]);

  if (nonEvidenceTypes.has(type)) return false;
  if (type.startsWith("diagnostic_")) return false;
  if (text.length > 0) return true;

  return (
    type === "quick_capture" ||
    type === "quick_capture_submitted" ||
    type === "receipt_quick_capture" ||
    type === "event_capture" ||
    type === "pilot_event" ||
    type === "workflow_event" ||
    type === "case_event" ||
    type === "structured_event" ||
    type.includes("capture")
  );
}

export function buildReadinessContract(input = {}) {
  const safeInput = input && typeof input === "object" ? input : {};
  const deterministicScore = calculateDeterministicScore(safeInput);
  const normalizedInput = normalizeScoreInput(safeInput);
  const raw = normalizedInput.raw || {};
  const explicitReceiptReady = hasExplicitReceiptReady(raw);
  const hasEvidence = normalizedInput.events.some(isReadinessEvidenceEvent);

  const structureStatus =
    raw?.structureStatus ||
    raw?.structureStatusFromCase ||
    raw?.caseData?.structureStatus ||
    raw?.receipt?.structureStatus ||
    raw?.scopeLock?.status ||
    raw?.scope?.status ||
    raw?.acceptanceChecklist?.status ||
    raw?.checklist?.status ||
    "";
  const structureScore = Number(
    raw?.structureScore ??
      raw?.structureScoreFromCase ??
      raw?.caseData?.structureScore ??
      deterministicScore.structure ??
      0
  );
  const structurePassed =
    !isMissingStatus(structureStatus) && Number.isFinite(structureScore) && structureScore > 0;

  const consistencyStatus =
    raw?.consistencyStatus ||
    raw?.evidenceLockStatus ||
    raw?.evidenceLock?.status ||
    raw?.receipt?.consistencyStatus ||
    raw?.caseData?.consistencyStatus ||
    "";
  const consistencyBroken =
    raw?.evidenceLockBroken === true ||
    raw?.isEvidenceLockedConsistent === false ||
    hasBrokenSignal(consistencyStatus);
  const consistencyPassed = !consistencyBroken;

  const continuityStatus =
    raw?.continuityStatus ||
    raw?.receipt?.continuityStatus ||
    raw?.caseData?.continuityStatus ||
    raw?.stage ||
    raw?.status ||
    raw?.currentStep ||
    "";
  const enoughProgression =
    normalizedInput.events.length > 0 ||
    !isMissingStatus(raw?.stage) ||
    !isMissingStatus(raw?.status) ||
    !isMissingStatus(raw?.currentStep);
  const continuityPassed =
    !isMissingStatus(continuityStatus) && enoughProgression;

  const receiptRecordFormable = Boolean(
    explicitReceiptReady ||
      raw?.receiptRecordFormable === true ||
      raw?.receiptId ||
      raw?.receiptHash ||
      raw?.hash ||
      raw?.caseSnapshotHash ||
      raw?.receipt?.receiptId ||
      raw?.receipt?.hash ||
      raw?.receipt?.receiptHash ||
      (normalizedInput.caseId && hasEvidence && structurePassed && continuityPassed)
  );

  const checks = {
    evidence: {
      passed: hasEvidence,
      score: hasEvidence ? 1 : 0,
      label: "Evidence",
      reason: hasEvidence
        ? "At least one real evidence event exists."
        : "Evidence requires at least one real event.",
    },
    structure: {
      passed: structurePassed,
      score: structurePassed ? 1 : 0,
      label: "Structure",
      reason: structurePassed ? "Case structure is present." : "Structure is empty.",
    },
    consistency: {
      passed: consistencyPassed,
      score: consistencyPassed ? 1 : 0,
      label: "Consistency",
      reason: consistencyPassed
        ? "No evidence-chain break detected."
        : "Consistency cannot be broken.",
    },
    continuity: {
      passed: continuityPassed,
      score: continuityPassed ? 1 : 0,
      label: "Continuity",
      reason: continuityPassed
        ? "Case continuity is present."
        : "Continuity is missing.",
    },
    receiptRecord: {
      passed: receiptRecordFormable,
      score: receiptRecordFormable ? 1 : 0,
      label: "Receipt record",
      reason: receiptRecordFormable
        ? "Receipt record can be formed."
        : "Receipt record must be formable.",
    },
  };

  const blockers = Object.entries(checks)
    .filter(([, check]) => !check.passed)
    .map(([key, check]) => ({
      key,
      label: check.label,
      reason: check.reason,
    }));
  const criticalBlockers = [
    !checks.evidence.passed
      ? {
          key: "evidence",
          label: checks.evidence.label,
          reason: checks.evidence.reason,
        }
      : null,
    !checks.consistency.passed
      ? {
          key: "consistency",
          label: checks.consistency.label,
          reason: checks.consistency.reason,
        }
      : null,
    !checks.receiptRecord.passed
      ? {
          key: "receiptRecord",
          label: checks.receiptRecord.label,
          reason: checks.receiptRecord.reason,
        }
      : null,
  ].filter(Boolean);

  const rawReadinessScore = Object.values(checks).reduce(
    (sum, check) => sum + Number(check.score || 0),
    0
  );
  let readinessScore = rawReadinessScore;

  if (!checks.evidence.passed) {
    readinessScore = Math.min(readinessScore, 1.0);
  }
  if (!checks.structure.passed) {
    readinessScore = Math.min(readinessScore, 2.4);
  }
  if (!checks.consistency.passed) {
    readinessScore = Math.min(readinessScore, 2.0);
  }
  if (!checks.continuity.passed) {
    readinessScore = Math.min(readinessScore, 2.8);
  }

  readinessScore = Number(readinessScore.toFixed(2));

  const receiptReady =
    readinessScore >= 3.0 &&
    criticalBlockers.length === 0;

  const readinessLevel = receiptReady
    ? "ready"
    : !checks.consistency.passed
    ? "failed"
    : !checks.evidence.passed
    ? "insufficient_record"
    : "pending_review";

  return {
    readinessScore,
    readinessLevel,
    checks,
    blockers,
    criticalBlockers,
    receiptReady,
    deterministicScore,
  };
}
