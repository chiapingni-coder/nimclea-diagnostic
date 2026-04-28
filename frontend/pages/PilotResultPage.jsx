import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { buildReceiptPageData } from "../buildReceiptPageData";
import { buildVerificationPageData } from "../buildVerificationPageData";
import { createReceiptHash } from "./ReceiptPage";
import { inferSignalsFromText, SIGNAL_PRIORITY } from "../utils/signalEngine";

import {
  buildReceiptContract,
  flattenSharedReceiptVerificationContract,
} from "../utils/sharedReceiptVerificationContract";

import ROUTES from "../routes";
import TopRightCasesCapsule from "../components/TopRightCasesCapsule.jsx";
import { logEvent } from "../utils/eventLogger";
import { getPilotEntries } from "../utils/pilotEntries";
import { logTrialEvent } from "../lib/trialApi";
import { getTrialSession } from "../lib/trialSession";
import { resolveAccessMode } from "../lib/accessMode";
import { sanitizeText } from "../lib/sanitizeText";
import {
  getCustomerNextAction,
  getWeakestDimensionDisplay,
} from "../lib/customerDecisionDisplay";
import { evaluatePilotCombinationStatus } from "../utils/verificationStatus";
import { calculateDeterministicScore } from "../utils/deterministicScore";
import { recordRun } from "./runLedger";
import { normalizeCaseInput, getSafeCaseSummary } from "../utils/caseSchema";
import {
  resolveCaseId,
  updateCaseStatus as setCaseStatus,
  getCurrentCaseId,
  getCaseById,
  upsertCase,
} from "../utils/caseRegistry.js";

import {
  getCaseSummary,
  getCaseContext,
  getCaseScenarioCode,
  getCaseStage,
  getCaseRunCode,
  getCasePatternId,
  getCaseWeakestDimension,
} from "../utils/caseAccessors";

const SCENARIO_LABEL_MAP = {
  pre_audit_collapse: "Pre-Audit Collapse",
  barely_functional: "Barely Functional",
  boundary_blur: "Boundary Blur",
  fully_ready: "Fully Ready",
};

const getEventText = (event) => {
  if (!event) return "";
  return String(
    event.text ??
      event.eventText ??
      event.description ??
      event.input ??
      event.rawText ??
      event.content ??
      event.eventInput?.description ??
      event.eventInput?.summaryContext ??
      event.sourceInput?.description ??
      event.pilot_setup?.description ??
      ""
  ).trim();
};

const getRawEventText = (event) => {
  if (!event) return "";

  const text = String(
    event.rawText ??
      event.userInput ??
      event.originalText ??
      event.input ??
      ""
  ).trim();

  return text;
};

const cleanTraceId = (value) => {
  const text = String(value ?? "").trim();
  const match = text.match(/\b(RUN\d+|PAT-\d+|CHAIN-\d+)\b/i);
  return match ? match[1].toUpperCase() : "";
};

const isMarketPlaceholder = (value = "") => {
  const text = String(value || "").trim();
  if (!text) return true;
  return [
    "RUN000",
    "PAT-00",
    "unknown_scenario",
    "unknown_signal",
    "No Dominant Scenario",
    "Selected workflow",
    "Unknown workflow",
  ].includes(text);
};

const safeMarketText = (value = "") => {
  const text = String(value || "").trim();
  return isMarketPlaceholder(text) ? "" : text;
};

function normalizeRunEntry(entry = {}) {
  return {
    runId: entry.runId || entry.runLabel || "RUN000",
    runLabel: entry.runLabel || entry.runId || "RUN000",
    count: Number.isFinite(entry.count) ? entry.count : 1,
    stageLabel: entry.stageLabel || "",
    scenarioLabel: entry.scenarioLabel || "",
    confidenceLabel: entry.confidenceLabel || "",
  };
}

function deriveRunFromPilotEntry(entry = {}, fallback = {}) {
  const reviewResult = getEntryReviewResult(entry) || {};
  const caseData = getEntryCaseData(entry);

  return {
    runId:
      reviewResult.runId ||
      reviewResult.runLabel ||
      entry.runId ||
      entry.runLabel ||
      fallback.runId ||
      fallback.runLabel ||
      "RUN000",
    runLabel:
      reviewResult.runLabel ||
      reviewResult.runId ||
      entry.runLabel ||
      entry.runId ||
      fallback.runLabel ||
      fallback.runId ||
      "RUN000",
    stageLabel:
      reviewResult.stage ||
      reviewResult.stageLabel ||
      caseData?.stage ||
      entry.stageLabel ||
      entry.stage ||
      fallback.stageLabel ||
      fallback.stage ||
      "",
    scenarioLabel:
      reviewResult.scenarioLabel ||
      caseData?.scenarioCode ||
      entry.scenarioLabel ||
      entry.scenario ||
      fallback.scenarioLabel ||
      "",
    confidenceLabel:
      reviewResult.confidenceLabel ||
      entry.confidenceLabel ||
      fallback.confidenceLabel ||
      "High",
  };
}

function buildRunEntriesFromPilotEntries(entries = [], fallback = {}) {
  const counter = new Map();

  entries.forEach((entry) => {
    const normalized = deriveRunFromPilotEntry(entry, fallback);
    const key = normalized.runLabel;

    if (!counter.has(key)) {
      counter.set(key, {
        ...normalized,
        count: 1,
      });
      return;
    }

    const current = counter.get(key);
    counter.set(key, {
      ...current,
      count: current.count + 1,
    });
  });

  const aggregated = Array.from(counter.values()).map(normalizeRunEntry);

  if (aggregated.length > 0) {
    return aggregated;
  }

  return [
    normalizeRunEntry({
      runId: fallback.runId || fallback.runLabel || "RUN000",
      runLabel: fallback.runLabel || fallback.runId || "RUN000",
      count: 1,
      stageLabel: fallback.stageLabel || "",
      scenarioLabel: fallback.scenarioLabel || "",
      confidenceLabel: fallback.confidenceLabel || "High",
    }),
  ];
}

function buildRunSummaryText(runEntries = []) {
  const totalRunHits = runEntries.reduce(
    (sum, entry) => sum + (entry.count || 0),
    0
  );

  return `${runEntries.length} RUN pattern${runEntries.length > 1 ? "s" : ""} recorded across ${totalRunHits} structured hit${totalRunHits > 1 ? "s" : ""}.`;
}

function updateCase(caseId = "", patch = {}) {
  if (!caseId) return null;

  return upsertCase({
    caseId,
    ...patch,
  });
}

function getEntryTimestamp(entry = {}) {
  if (!entry || typeof entry !== "object") return null;

  const raw =
    entry.timestamp ||
    entry.createdAt ||
    entry.created_at ||
    entry.recordedAt ||
    entry.recorded_at ||
    null;

  if (!raw) return null;

  const time = new Date(raw).getTime();
  return Number.isNaN(time) ? null : time;
}

function getEntryEventInput(entry = {}) {
  if (!entry || typeof entry !== "object") return null;

  return entry.eventInput || entry.sourceInput || null;
}

function getEntryReviewResult(entry = {}) {
  if (!entry || typeof entry !== "object") return null;

  return entry.reviewResult || entry.result || null;
}

function getEntryWeakestDimension(entry) {
  if (!entry || typeof entry !== "object") {
    return "N/A";
  }

  return (
    entry.weakestDimensionSnapshot ||
    entry.weakestDimension ||
    entry.dimension ||
    entry?.snapshot?.weakestDimension ||
    "N/A"
  );
}

function getEntryCaseData(entry = {}) {
  if (!entry || typeof entry !== "object") return null;

  return (
    entry.reviewResult?.caseData ||
    entry.caseSchema ||
    entry.caseData ||
    null
  );
}

function getNormalizedEvidenceItems(caseData = {}, eventInput = {}) {
  const items = [];

  const pushItem = (value, type = "generic") => {
    if (!value) return;

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return;
      items.push({ type, text: trimmed });
      return;
    }

    if (typeof value === "object") {
      const text =
        value.text ||
        value.detail ||
        value.description ||
        value.label ||
        value.id ||
        "";

      if (String(text).trim()) {
        items.push({
          type: value.type || type,
          text: String(text).trim(),
          id: value.id || "",
          timestamp: value.timestamp || "",
        });
      }
    }
  };

  // 1) evidenceItems
  if (Array.isArray(caseData?.evidenceItems)) {
    caseData.evidenceItems.forEach((item) => pushItem(item, "evidence_item"));
  }

  // 2) evidence / evidenceSupport
  if (Array.isArray(caseData?.evidence)) {
    caseData.evidence.forEach((item) => pushItem(item, "evidence"));
  }

  if (Array.isArray(caseData?.evidenceSupport)) {
    caseData.evidenceSupport.forEach((item) => pushItem(item, "evidence_support"));
  }

  // 3) supporting record inputs
  pushItem(caseData?.invoice, "invoice");
  pushItem(caseData?.bankRecord, "bank_record");
  pushItem(caseData?.approvalNote, "approval_note");
  pushItem(caseData?.executionNote, "execution_note");
  pushItem(caseData?.decisionStatement, "decision_statement");
  pushItem(caseData?.executionSummary, "execution_summary");

  // 4) eventInput
  pushItem(eventInput?.evidence, "event_evidence");
  pushItem(eventInput?.evidenceNote, "event_evidence_note");
  pushItem(eventInput?.proofNote, "proof_note");

  return items;
}

function hasSevenDayWindowElapsed(entries = [], locationState = {}) {
  const explicitPilotStart =
    locationState?.pilot_setup?.startedAt ||
    locationState?.pilot_setup?.startTime ||
    locationState?.pilot_setup?.createdAt ||
    locationState?.pilot_setup?.timestamp ||
    null;

  const explicitStartTime = explicitPilotStart
    ? new Date(explicitPilotStart).getTime()
    : null;

  const entryTimes = (Array.isArray(entries) ? entries : [])
    .map(getEntryTimestamp)
    .filter(Boolean);

  const fallbackStartTime =
    entryTimes.length > 0 ? Math.min(...entryTimes) : null;

  const startTime = explicitStartTime || fallbackStartTime;

  if (!startTime) return false;

  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  return Date.now() - startTime >= sevenDaysMs;
}

function getCurrentEventType(entries = []) {
  if (!Array.isArray(entries) || entries.length === 0) return "other";

  const latest = entries[entries.length - 1];

  return (
    latest?.eventType ||
    getEntryReviewResult(latest)?.eventType ||
    "other"
  );
}

function getEventLabel(eventType) {
  const EVENT_LABEL_MAP = {
    decision_suggested: "Someone suggested a decision for you",
    decision_override_attempt: "Someone tried to decide on your behalf",
    resource_control_request: "A resource / money / control request",
    high_pressure_decision: "You were pushed toward a fast decision",
    role_boundary_blur: "Roles or responsibilities became unclear",
    other: "Other structural event",
  };

  return EVENT_LABEL_MAP[eventType] || "Other structural event";
}

function getPrimaryRecommendation({
  weakestDimension = "",
  firstGuidedAction = "",
  structureStatus = "",
}) {
  if (firstGuidedAction) {
    return firstGuidedAction;
  }

  const normalizedStatus = String(structureStatus || "").toLowerCase();

  const map = {
    authority:
      normalizedStatus === "ready"
        ? "Move forward, but keep decision ownership explicit at the next approval point."
        : "Stabilize decision ownership before taking the next visible action.",
    boundary:
      normalizedStatus === "ready"
        ? "Move forward, but keep role and approval boundaries explicit."
        : "Rebuild one clear role or approval boundary before expanding the workflow.",
    evidence:
      normalizedStatus === "ready"
        ? "Move forward, but keep one traceable record attached to the next action."
        : "Create one traceable record before the next decision becomes harder to defend.",
    coordination:
      normalizedStatus === "ready"
        ? "Move forward, but keep one owner and one next step clearly assigned."
        : "Reduce execution drift by locking one owner and one next operational step.",
  };

  return (
    map[weakestDimension] ||
    "Take the next step that makes the workflow easier to explain, verify, and defend."
  );
}

function getBackupRecommendation(weakestDimension = "") {
  const map = {
    authority:
      "If ownership cannot be clarified yet, narrow the decision scope so fewer people can reshape it.",
    boundary:
      "If boundaries cannot be restored yet, add one temporary approval checkpoint before execution continues.",
    evidence:
      "If a full record is not possible yet, capture one minimal written justification before moving forward.",
    coordination:
      "If alignment is still weak, pause expansion and reduce the number of active actors in the workflow.",
  };

  return (
    map[weakestDimension] ||
    "Use a smaller temporary control so the workflow becomes easier to review and defend."
  );
}

function getCostAttachment(weakestDimension = "") {
  const map = {
    authority:
      "Cost attached: this may slow decision speed slightly, but it prevents ownership drift from silently reshaping the outcome.",
    boundary:
      "Cost attached: this may add one friction point, but it prevents role blur from creating hidden responsibility gaps.",
    evidence:
      "Cost attached: this adds recording effort, but it prevents the next decision from becoming hard to explain or defend.",
    coordination:
      "Cost attached: this may reduce flexibility in the short term, but it prevents fragmented execution from compounding later.",
  };

  return (
    map[weakestDimension] ||
    "Cost attached: this adds short-term discipline, but it improves structural defensibility."
  );
}

function getTopInterventions({
  acceptanceChecklist = null,
  weakestDimension = "",
}) {
  const checklist = acceptanceChecklist || {};
  const interventions = [];

  if (!checklist.hasEvent) {
    interventions.push("Log one real event before continuing.");
  }

  if (!checklist.hasSignals) {
    interventions.push("Add one event with clearer structural signals.");
  }

  if (!checklist.hasStructure) {
    interventions.push("Resolve one RUN or Pattern before receipt review.");
  }

  if (!checklist.hasEvidence) {
    interventions.push("Attach one minimal traceable explanation or evidence note.");
  }

  if (interventions.length >= 2) {
    return interventions.slice(0, 2);
  }

  const fallbackMap = {
    authority: "Clarify one ownership point before moving forward.",
    boundary: "Restore one role boundary before moving forward.",
    evidence: "Add one traceable record before moving forward.",
    coordination: "Lock one owner and one next step before moving forward.",
  };

  if (interventions.length === 0) {
    interventions.push(
      fallbackMap[weakestDimension] ||
        "Make one smaller structural correction before continuing."
    );
  }

  if (interventions.length === 1) {
    interventions.push("Strengthen one more structural signal before continuing.");
  }

  return interventions.slice(0, 2);
}

function getScoreTag(score, type) {
  if (type === "evidence") {
    if (score >= 3) return "strong";
    if (score >= 1.5) return "partial";
    return "light";
  }

  if (type === "structure") {
    if (score >= 3) return "solid";
    if (score >= 1.5) return "forming";
    return "weak";
  }

  if (type === "consistency") {
    if (score >= 3) return "aligned";
    if (score >= 1.5) return "mixed";
    return "unstable";
  }

  if (type === "continuity") {
    if (score >= 3) return "repeated";
    if (score >= 1.5) return "emerging";
    return "thin";
  }

  return "";
}

function getScoreSourceTag({
  type,
  score = 0,
  entries = [],
}) {
  const safeEntries = Array.isArray(entries) ? entries : [];
  const entryCount = safeEntries.length;

  const latestThree = safeEntries.slice(-3);

  if (type === "evidence") {
    if (score >= 3) return "traceable support";
    if (score >= 1.5) return "partial support";
    return "light support";
  }

  if (type === "structure") {
    if (score >= 3) return "well-formed record";
    if (score >= 1.5) return "partial structure";
    return "thin structure";
  }

  if (type === "consistency") {
    const scenarioSet = new Set(
      latestThree
        .map((entry) => entry?.caseData?.scenarioCode || entry?.reviewResult?.scenarioCode || "")
        .filter(Boolean)
    );

    const weakestSet = new Set(
      latestThree
        .map(
          (entry) =>
            entry?.weakestDimensionSnapshot ||
            entry?.weakestDimension ||
            entry?.caseData?.weakestDimension ||
            ""
        )
        .filter(Boolean)
    );

    if (score >= 3 && scenarioSet.size <= 1 && weakestSet.size <= 1) {
      return "stable direction";
    }

    if (score >= 1.5) {
      return "partial alignment";
    }

    return "mixed direction";
  }

  if (type === "continuity") {
    if (entryCount >= 5) return `across ${entryCount} entries`;
    if (entryCount >= 3) return `across ${entryCount} events`;
    if (entryCount >= 2) return `across ${entryCount} logs`;
    return "single event only";
  }

  return "";
}

function getScoreTriggerTag({
  type,
  score = 0,
  entries = [],
}) {
  const safeEntries = Array.isArray(entries) ? entries.filter(Boolean) : [];
  const latestThree = safeEntries.slice(-3);

  if (type === "evidence") {
    const evidenceItemCount = latestThree.reduce((sum, entry) => {
      const caseData = entry?.caseData || entry?.reviewResult?.caseData || {};
      const eventInput = entry?.eventInput || entry?.sourceInput || {};
      const items = getNormalizedEvidenceItems(caseData, eventInput);
      return sum + items.length;
    }, 0);

    const narrativeLength = latestThree.reduce((sum, entry) => {
      const eventInput = entry?.eventInput || entry?.sourceInput || {};
      const text =
        eventInput?.summaryContext ||
        eventInput?.description ||
        entry?.summaryText ||
        "";
      return sum + String(text).trim().length;
    }, 0);

    if (evidenceItemCount >= 2) return `${evidenceItemCount} evidence items`;
    if (narrativeLength >= 120) return "long narrative support";
    if (score >= 1.5) return "partial support signals";
    return "no strong proof signal";
  }

  if (type === "structure") {
    const coverageCounts = latestThree.map((entry) => {
      const eventInput = entry?.eventInput || entry?.sourceInput || {};
      const caseData = entry?.caseData || entry?.reviewResult?.caseData || {};
      let count = 0;

      if (String(entry?.eventType || entry?.reviewResult?.eventType || "").trim()) count += 1;
      if (String(eventInput?.externalPressure || "").trim()) count += 1;
      if (String(eventInput?.authorityBoundary || "").trim()) count += 1;
      if (String(eventInput?.dependency || "").trim()) count += 1;
      if (String(caseData?.scenarioCode || "").trim()) count += 1;
      if (String(caseData?.stage || "").trim()) count += 1;

      return count;
    });

    const bestCoverage = coverageCounts.length ? Math.max(...coverageCounts) : 0;

    if (bestCoverage >= 5) return "strong field coverage";
    if (bestCoverage >= 3) return "partial field coverage";
    return "thin field coverage";
  }

  if (type === "consistency") {
    const scenarioSet = new Set(
      latestThree
        .map((entry) => entry?.caseData?.scenarioCode || entry?.reviewResult?.scenarioCode || "")
        .filter(Boolean)
    );

    const weakestSet = new Set(
      latestThree
        .map(
          (entry) =>
            entry?.weakestDimensionSnapshot ||
            entry?.weakestDimension ||
            entry?.caseData?.weakestDimension ||
            ""
        )
        .filter(Boolean)
    );

    if (scenarioSet.size <= 1 && weakestSet.size <= 1 && latestThree.length >= 2) {
      return "same situation pattern and same weak point";
    }

    if (score >= 1.5) {
      return "partially aligned direction";
    }

    return "direction still mixed";
  }

  if (type === "continuity") {
    const count = safeEntries.length;

    if (count >= 5) return `${count} logged entries`;
    if (count >= 3) return `${count} repeated events`;
    if (count >= 2) return `${count} linked logs`;
    return "single logged event";
  }

  return "";
}

function getTriggerEvidenceItems({ type, entries = [] }) {
  const safeEntries = Array.isArray(entries) ? entries.filter(Boolean) : [];
  const latestThree = safeEntries.slice(-3);

  if (type === "evidence") {
    return latestThree.map((entry, index) => {
      const eventInput = entry?.eventInput || entry?.sourceInput || {};
      const caseData = entry?.caseData || entry?.reviewResult?.caseData || {};
      const evidenceCount = Array.isArray(caseData?.evidenceItems)
        ? caseData.evidenceItems.length
        : 0;

      const narrative =
        eventInput?.summaryContext ||
        eventInput?.description ||
        entry?.summaryText ||
        "No supporting narrative";

      return {
        id: `evidence-${index}`,
        title: `Entry ${safeEntries.length - latestThree.length + index + 1}`,
        detail:
          evidenceCount > 0
            ? `${evidenceCount} evidence item(s) attached`
            : String(narrative).trim().slice(0, 100) || "No strong proof signal",
      };
    });
  }

  if (type === "structure") {
    return latestThree.map((entry, index) => {
      const eventInput = entry?.eventInput || entry?.sourceInput || {};
      const caseData = entry?.caseData || entry?.reviewResult?.caseData || {};
      const filled = [
        entry?.eventType || entry?.reviewResult?.eventType,
        eventInput?.externalPressure,
        eventInput?.authorityBoundary,
        eventInput?.dependency,
        caseData?.scenarioCode,
        caseData?.stage,
      ].filter((v) => String(v || "").trim().length > 0).length;

      return {
        id: `structure-${index}`,
        title: `Entry ${safeEntries.length - latestThree.length + index + 1}`,
        detail: `${filled}/6 structural fields present`,
      };
    });
  }

  if (type === "consistency") {
    return latestThree.map((entry, index) => {
      const caseData = entry?.caseData || entry?.reviewResult?.caseData || {};
      const weakest =
        entry?.weakestDimensionSnapshot ||
        entry?.weakestDimension ||
        caseData?.weakestDimension ||
        "unknown";
      const scenario =
        caseData?.scenarioCode ||
        entry?.reviewResult?.scenarioCode ||
        "unknown_scenario";

      return {
        id: `consistency-${index}`,
        title: `Entry ${safeEntries.length - latestThree.length + index + 1}`,
        detail: [safeMarketText(scenario), safeMarketText(weakest)].filter(Boolean).join(" / "),
      };
    });
  }

  if (type === "continuity") {
    return safeEntries.slice(-5).map((entry, index) => {
      const eventType =
        entry?.eventType ||
        entry?.reviewResult?.eventType ||
        "other";

      const ts =
        entry?.timestamp ||
        entry?.createdAt ||
        entry?.recordedAt ||
        "no timestamp";

      return {
        id: `continuity-${index}`,
        title: `Log ${safeEntries.length - Math.min(5, safeEntries.length) + index + 1}`,
      };
    });
  }

  return [];
}

function getScoreExplanationLines({
  evidenceScore = 0,
  structureScore = 0,
  consistencyScore = 0,
  continuityScore = 0,
}) {
  const explainBand = (score, type) => {
    if (type === "evidence") {
      if (score >= 3) {
        return "Evidence support is strong because the case includes traceable support or closure-like signals.";
      }
      if (score >= 1.5) {
        return "Evidence support is forming, but the record is still only partially traceable.";
      }
      return "Evidence support is still light, so the case relies more on structure than on direct proof.";
    }

    if (type === "structure") {
      if (score >= 3) {
        return "Structure is strong because the event record contains enough fields and closure signals to hold shape.";
      }
      if (score >= 1.5) {
        return "Structure is visible, but some parts of the case are still incomplete or thinly formed.";
      }
      return "Structure is still weak, so the case is not yet stable enough to defend confidently.";
    }

    if (type === "consistency") {
      if (score >= 3) {
        return "Consistency is high because the recent entries point in the same structural direction.";
      }
      if (score >= 1.5) {
        return "Consistency is moderate because parts of the record align, but not yet tightly.";
      }
      return "Consistency is still weak because the record has not formed a stable pattern yet.";
    }

    if (type === "continuity") {
      if (score >= 3) {
        return "Continuity is high because the pattern is supported by repeated event logging over time.";
      }
      if (score >= 1.5) {
        return "Continuity is emerging because the pattern appears more than once, but is not yet deeply reinforced.";
      }
      return "Continuity is still light because too few events have been logged to confirm repetition.";
    }

    return "";
  };

  return {
    evidence: explainBand(evidenceScore, "evidence"),
    structure: explainBand(structureScore, "structure"),
    consistency: explainBand(consistencyScore, "consistency"),
    continuity: explainBand(continuityScore, "continuity"),
  };
}

function getMainPathSummary({
  structureStatus = "",
  weakestDimension = "",
  currentEventLabel = "",
}) {
  const status = String(structureStatus || "").toLowerCase();
  const dimension = String(weakestDimension || "").trim();
  const eventLabel = currentEventLabel || "Current structural event";

  if (status === "ready") {
    return {
      title: "This case is structurally strong enough to move forward.",
      body: `${eventLabel} is now being interpreted through ${dimension || "the current structure"}, and the record is strong enough to proceed to receipt review. If this decision needs to hold under scrutiny, continue to Verification after receipt generation.`,
    };
  }

  if (status === "building") {
    return {
      title: "This case is structurally forming, but not stable yet.",
      body: `${eventLabel} reveals pressure around ${dimension || "the current structure"}, but the record still needs more support before it becomes review-ready for receipt or later Verification.`,
    };
  }

  if (status === "weak") {
    return {
      title: "This case is not structurally ready yet.",
      body: `${eventLabel} is exposing weakness in ${dimension || "the current structure"}, and that weakness is still preventing reliable receipt review.`,
    };
  }

  return {
    title: "This case is being structurally interpreted.",
    body: `${eventLabel} is currently being interpreted through ${dimension || "the current structure"}.`,
  };
}

function buildExecutionSummary(entries = [], weakestDimension = "", firstGuidedAction = "") {
  const safeEntries = Array.isArray(entries) ? entries : [];
  const totalEvents = safeEntries.length;
  const structuredEvents = safeEntries
    .filter((entry) => {
      const eventInput = getEntryEventInput(entry) || {};
      return String(eventInput.description || "").trim().length > 0;
    })
    .map((entry, index) => {
      const eventInput = getEntryEventInput(entry) || {};
      const reviewResult = getEntryReviewResult(entry) || {};

      const eventType =
        entry?.eventType ||
        reviewResult?.eventType ||
        "decision_accepted";

      const eventLabel =
        getEventLabel(eventType) || "Structured event";

      const eventDescription = eventInput.description || "";

      const createdAt =
        entry?.timestamp ||
        entry?.createdAt ||
        new Date().toISOString();

      return {
        id: entry?.id || `evt_${Date.now()}_${index}`,
        type: eventType,
        label: eventLabel,
        description: eventDescription,
        text: eventDescription,
        note: eventDescription,
        time: createdAt,
      };
    });

  const latestEntry =
    safeEntries.length > 0 ? safeEntries[safeEntries.length - 1] : null;

  const latestEventLabelMap = {
    decision_suggested: "Decision suggestion detected",
    decision_override_attempt: "Decision override attempt detected",
    resource_control_request: "Resource or control request detected",
    high_pressure_decision: "High-pressure decision moment detected",
    role_boundary_blur: "Boundary blur detected",
    other: "Structural event recorded",
  };

  const mainObservedShiftMap = {
    authority: "Authority is becoming the main structural stress point.",
    boundary: "Boundary clarity is becoming the main structural stress point.",
    evidence: "Evidence support is becoming the main structural stress point.",
    coordination: "Coordination is becoming the main structural stress point.",
  };

  const resolvedEventType =
    latestEntry?.eventType ||
    getEntryReviewResult(latestEntry)?.eventType ||
    "other";

  return {
    totalEvents,
    structuredEventsCount: structuredEvents.length,
    structuredEvents,
    latestEventType: resolvedEventType,
    latestEventLabel:
      latestEventLabelMap[resolvedEventType] || "Structural event recorded",
    latestEventDescription: (() => {
      const latestCaseData = getEntryCaseData(latestEntry);
      const latestEventInput = getEntryEventInput(latestEntry) || {};

      return (
        getCaseSummary({
          caseData: latestCaseData,
          summaryText: latestEventInput.summaryContext || "",
        }) ||
        getCaseContext({
          caseData: latestCaseData,
          caseInput: latestEventInput.description || "",
        }) ||
        latestEventInput.description ||
        ""
      );
    })(),
    mainObservedShift:
      mainObservedShiftMap[weakestDimension] ||
      "A structural weakness is becoming easier to observe through real events.",
    nextCalibrationAction:
      firstGuidedAction ||
      "Use the next real event to confirm whether this structural weakness repeats.",
    behaviorStatus:
      structuredEvents.length >= 3
        ? "behavior_confirmed"
        : structuredEvents.length >= 1
        ? "behavior_emerging"
        : "behavior_weak",
  };
}

function resolveCaseDataFromState(locationState = {}) {
  const directCaseData = locationState?.caseData || null;
  const pilotResultCaseData = locationState?.pilot_result?.caseData || null;
  const latestEntryCaseData = locationState?.latest_pilot_entry?.caseData || null;

  if (directCaseData) return directCaseData;
  if (pilotResultCaseData) return pilotResultCaseData;
  if (latestEntryCaseData) return latestEntryCaseData;

  return null;
}

const sanitizeForMarket = (obj = {}) => {
  const BLOCK_LIST = [
    "RUN000",
    "PAT-00",
    "unknown_scenario",
    "unknown_signal",
    "No Dominant Scenario",
    "Selected workflow",
    "Unknown workflow"
  ];

  const clean = (value) => {
    const text = String(value || "").trim();
    if (!text) return "";
    return BLOCK_LIST.includes(text) ? "" : text;
  };

  return {
    ...obj,
    runId: clean(obj.runId),
    pattern: clean(obj.pattern),
    scenarioCode: clean(obj.scenarioCode),
    scenarioLabel: clean(obj.scenarioLabel),
    workflow: clean(obj.workflow),
  };
};

function buildSourceInputFromState(locationState = {}) {
  const preview = locationState?.preview || null;
  const sourceInput = locationState?.sourceInput || null;
  const pilotSetup = locationState?.pilot_setup || null;
  const pilotResult = locationState?.pilot_result || null;
  const resolvedCaseData = resolveCaseDataFromState(locationState);
  const caseInput =
    locationState?.caseInput ||
    pilotSetup?.caseInput ||
    pilotResult?.caseInput ||
    "";

  const upstream = sourceInput || preview || {};
  const extraction = upstream?.extraction || {};
  const resultSeed = upstream?.resultSeed || upstream?.extraction || {};

return {
  weakestDimension: getCaseWeakestDimension({
    caseData: resolvedCaseData,
    weakestDimension:
      locationState?.weakestDimension ||
      pilotResult?.judgmentFocus ||
      locationState?.latest_pilot_entry?.judgmentFocus ||
      "",
  }),

  judgmentFocus:
    getCaseWeakestDimension({
      caseData: resolvedCaseData,
      weakestDimension:
        pilotResult?.judgmentFocus ||
        locationState?.latest_pilot_entry?.judgmentFocus ||
        locationState?.weakestDimension ||
        "event_based",
    }) || "event_based",

  resolvedBy:
    pilotResult?.resolvedBy ||
    pilotSetup?.resolvedBy ||
    (resolvedCaseData?.weakestDimension
      ? "case_schema"
      : locationState?.weakestDimension
      ? "weakest_dimension"
      : "event_type"),

  firstGuidedAction:
    locationState?.firstGuidedAction ||
    pilotResult?.firstGuidedAction ||
    "",

  firstStepLabel:
    locationState?.firstStepLabel ||
    pilotResult?.firstStepLabel ||
    "",

  runId:
    getCaseRunCode({
      caseData: resolvedCaseData,
      runId:
        pilotResult?.runId ||
        extraction?.runCode ||
        resultSeed?.runCode ||
        upstream?.run_id ||
        upstream?.anchor_run ||
        "RUN000",
    }) || "RUN000",

  pattern:
    getCasePatternId({
      caseData: resolvedCaseData,
      pattern:
        pilotResult?.pattern ||
        extraction?.patternCode ||
        resultSeed?.patternCode ||
        upstream?.pattern ||
        upstream?.pattern_id ||
        "PAT-00",
    }) || "PAT-00",

  patternLabel:
    pilotResult?.patternLabel ||
    pilotSetup?.resolvedPatternLabel ||
    "Unresolved Pattern",

  structureStatus:
    resolvedCaseData?.structureStatus ||
    locationState?.routeMeta?.structureStatus ||
    pilotResult?.structureStatus ||
    null,

  summaryMode:
    pilotResult?.summaryMode === true,

  stage:
    getCaseStage({
      caseData: resolvedCaseData,
      stage:
        pilotResult?.stage ||
        extraction?.stageCode ||
        resultSeed?.stageCode ||
        upstream?.stage ||
        "S0",
    }) || "S0",

  decision:
    pilotResult?.decision ||
    resultSeed?.recommendedAction ||
    upstream?.recommended_next_step ||
    upstream?.pilot_preview?.entry ||
    "Continue with structured pilot execution.",

  signals:
    pilotResult?.signals ||
    (Array.isArray(upstream?.top_signals)
      ? upstream.top_signals.map((signal) => ({
          label: signal?.label || signal?.key || "unknown_signal",
          value: signal?.value || signal?.level || signal?.description || "unknown",
        }))
      : Array.isArray(resultSeed?.signals)
      ? resultSeed.signals.map((signal, index) => ({
          label:
            typeof signal === "string"
              ? signal
              : signal?.label || signal?.key || `signal_${index + 1}`,
          value:
            typeof signal === "string"
              ? "present"
              : signal?.description || signal?.value || "present",
        }))
      : []),

  workflow:
    pilotSetup?.workflow ||
    upstream?.workflow ||
    "Unknown workflow",

    scenarioLabel:
      SCENARIO_LABEL_MAP[
        getCaseScenarioCode({
          caseData: resolvedCaseData,
          scenarioCode:
            pilotResult?.scenarioCode ||
            extraction?.scenarioKey ||
            resultSeed?.scenarioKey ||
            upstream?.scenario?.code ||
            "unknown_scenario",
        })
      ] ||
      pilotResult?.scenarioLabel ||
      (preview?.scenario?.label &&
      preview?.scenario?.label !== "No Dominant Scenario"
        ? preview.scenario.label
        : null) ||
      "No Dominant Scenario",

  scenarioCode:
    getCaseScenarioCode({
      caseData: resolvedCaseData,
      scenarioCode:
        pilotResult?.scenarioCode ||
        extraction?.scenarioKey ||
        resultSeed?.scenarioKey ||
        upstream?.scenario?.code ||
        "unknown_scenario",
    }) || "unknown_scenario",

  summaryText:
    getCaseSummary({
      caseData: resolvedCaseData,
      summaryText:
        pilotResult?.summaryText ||
        upstream?.summary?.[0] ||
        resultSeed?.summary ||
        "No structured summary is available yet.",
    }) || "No structured summary is available yet.",

  caseInput: getCaseContext({
    caseData: resolvedCaseData,
    caseInput:
      caseInput ||
      pilotSetup?.description ||
      pilotResult?.summaryText ||
      "",
  }),

  eventWindow:
    locationState?.routeMeta?.eventWindow || null,

  progressLabel:
    locationState?.routeMeta?.progressLabel || null,

  nextAction:
    locationState?.routeMeta?.nextAction || null,

  caseData: resolvedCaseData,
};
}

// ===== runtime helpers =====
function normalizePilotStructureStatus(status = "") {
  const normalized = String(status || "").trim().toLowerCase();

  if (
    normalized === "receipt_ready" ||
    normalized === "resolved" ||
    normalized === "ready"
  ) {
    return "ready";
  }

  if (
    normalized === "pilot_complete" ||
    normalized === "emerging" ||
    normalized === "building"
  ) {
    return "building";
  }

  if (
    normalized === "insufficient" ||
    normalized === "weak"
  ) {
    return "weak";
  }

  return "weak";
}

function resolvePilotRuntimeState(locationState = {}, combinationStatus = {}, hasPilotEntries = false) {
  const routeMeta = locationState?.routeMeta || {};
  const pilotResult = locationState?.pilot_result || {};

  const upstreamStructureStatus =
    routeMeta.structureStatus ||
    pilotResult.structureStatus ||
    null;

  const upstreamSummaryMode =
    pilotResult.summaryMode === true ||
    routeMeta.structureStatus === "pilot_complete";

  const upstreamReviewMode =
    routeMeta.reviewMode ||
    pilotResult.reviewMode ||
    null;

  const upstreamStructuredEventCount =
    routeMeta.structuredEventCount ??
    pilotResult.structuredEventCount ??
    null;

  const upstreamEvidenceSupport =
    routeMeta.evidenceSupport ??
    pilotResult.evidenceSupport ??
    null;

  const upstreamStructureCompleteness =
    routeMeta.structureCompleteness ??
    pilotResult.structureCompleteness ??
    null;

  const upstreamSamplingWindowClosed =
    routeMeta.samplingWindowClosed === true ||
    pilotResult.samplingWindowClosed === true;

  const fallbackStructureStatus = combinationStatus.structureStatus || "weak";
  const fallbackScore = combinationStatus.score ?? 0;

  const resolvedStructureStatus = normalizePilotStructureStatus(
    upstreamStructureStatus || fallbackStructureStatus
  );

  const resolvedSummaryMode = upstreamSummaryMode === true;
  const resolvedReviewMode = upstreamReviewMode || "event_review";

  const resolvedStructuredEventCount =
    upstreamStructuredEventCount ??
    (hasPilotEntries ? 1 : 0);

  const resolvedEvidenceSupport =
    upstreamEvidenceSupport ??
    combinationStatus.evidenceSupport ??
    0;

  const resolvedStructureCompleteness =
    upstreamStructureCompleteness ??
    combinationStatus.structureCompleteness ??
    0;

  const resolvedSamplingWindowClosed = upstreamSamplingWindowClosed;

  const resolvedScore =
    upstreamEvidenceSupport !== null &&
    upstreamStructureCompleteness !== null
      ? Number(upstreamEvidenceSupport || 0) +
        Number(upstreamStructureCompleteness || 0)
      : fallbackScore;
const resolvedReceiptEligible = null;

  return {
    routeMeta,
    pilotResult,
    resolvedStructureStatus,
    resolvedSummaryMode,
    resolvedReviewMode,
    resolvedStructuredEventCount,
    resolvedEvidenceSupport,
    resolvedStructureCompleteness,
    resolvedSamplingWindowClosed,
    resolvedScore,
    resolvedReceiptEligible,
    resolvedNextAction:
      routeMeta.nextAction ||
      pilotResult.nextAction ||
      null,
  };
}

const resolveObservedContext = (caseData) => {
  const candidates = [
    caseData?.rawText,
    caseData?.eventText,
    caseData?.summaryContext,
    caseData?.displayContext,
    ...(Array.isArray(caseData?.events)
      ? caseData.events.map((event) => event?.text || event?.note || event?.label)
      : []),
  ];

  return (
    candidates.find((value) => {
      const text = String(value || "").trim();
      if (!text) return false;
      if (text.includes("INV-2048")) return false;
      if (text.includes("TXN-88921")) return false;
      if (text.includes("Duplicate charge")) return false;
      return true;
    }) || "No observed context has been captured for this case yet."
  );
};

export default function PilotResultPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = useMemo(() => {
    try {
      return new URLSearchParams(location.search || "");
    } catch {
      return new URLSearchParams();
    }
  }, [location.search]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  const resolvedCaseId = useMemo(
    () =>
      resolveCaseId({
        caseId:
          location.state?.caseId ||
          location.state?.case_id ||
          location.state?.result?.caseId ||
          location.state?.result?.case_id ||
          searchParams.get("caseId") ||
          getCurrentCaseId() ||
          "",
      }),
    [location.state, searchParams]
  );
  const caseId = resolvedCaseId;
  const isCaseReview =
    searchParams.get("from") === "case" || Boolean(searchParams.get("caseId"));
  const resultCaseId =
    location.state?.resultCaseId ||
    location.state?.originCaseId ||
    location.state?.fromCaseId ||
    location.state?.caseId ||
    location.state?.case_id ||
    location.state?.result?.caseId ||
    location.state?.result?.case_id ||
    searchParams.get("caseId") ||
    "";

  const rawPilotEntries =
    location.state?.pilot_entries ||
    location.state?.latest_pilot_entry?.eventHistory ||
    location.state?.pilot_result?.eventHistory ||
    location.state?.eventHistory ||
    getPilotEntries();

  const eventHistory = useMemo(() => {
    return Array.isArray(rawPilotEntries) ? rawPilotEntries : [];
  }, [rawPilotEntries]);

  const capturedEvents = eventHistory;
  const visibleEvents = Array.isArray(capturedEvents)
    ? capturedEvents.filter((event) => getEventText(event).length > 0)
    : [];
  const hasCapturedEvents = capturedEvents.length > 0;

  useEffect(() => {
    if (!resolvedCaseId) return;
    if (!hasCapturedEvents) return;

    try {
      setCaseStatus(resolvedCaseId, "workspace_summary");
    } catch (error) {
      console.warn("Failed to update case status", error);
    }
  }, [resolvedCaseId, hasCapturedEvents]);

  const persistedCase = useMemo(
    () => {
      try {
        return caseId && typeof getCaseById === "function"
          ? getCaseById(caseId)
          : null;
      } catch (error) {
        console.warn("Failed to read case registry for pilot result guard", error);
        return null;
      }
    },
    [caseId]
  );
  const currentCase = persistedCase;

  const hasEventBackedBaseline =
    Array.isArray(currentCase?.events) && currentCase.events.length > 0;
  const activeCaseBilling = currentCase?.caseBilling || {};
  const isFormalWorkspaceActive =
    activeCaseBilling?.receiptActivated === true ||
    activeCaseBilling?.verificationActivated === true ||
    currentCase?.payment?.receiptActivated === true ||
    currentCase?.payment?.verificationActivated === true ||
    currentCase?.isPaid === true;
  const workspaceCopy = isFormalWorkspaceActive
    ? {
        workspaceTitle: "Active workspace",
        workspaceCta: "Continue workspace",
        receiptCta: "Open formal workspace",
      }
    : {
        workspaceTitle: "Free workspace preview",
        workspaceCta: "Start workspace preview",
        receiptCta: "Activate formal workspace",
      };

  const suggestedIntervention =
    location.state?.suggestedIntervention || "";

  const suggestedInterventionRank =
    location.state?.suggestedInterventionRank || null;

  const pcMeta = location.state?.pcMeta || {
    pc_id: "PC-001",
    pc_name: "Decision Risk Diagnostic",
  };
  const diagnosticResultPath = resultCaseId
    ? `${ROUTES.RESULT || "/result"}?caseId=${encodeURIComponent(resultCaseId)}&from=case`
    : ROUTES.RESULT || "/result";
  const backToPilotPath = location.state?.session_id
    ? `${ROUTES.PILOT_SETUP}?session_id=${location.state.session_id}`
    : ROUTES.PILOT_SETUP;
  const stripBreadcrumbState = (state = {}) => {
    const {
      routeMeta,
      sourcePath,
      flowSteps,
      steps,
      breadcrumb,
      ...rest
    } = state || {};

    return rest;
  };
  const handleBack = () => {
    navigate(backToPilotPath, {
      state: {
        ...stripBreadcrumbState(location.state || {}),
        pcMeta,
      },
    });
  };

  useEffect(() => {
    if (!resolvedCaseId) return;
    if (!hasCapturedEvents) return;

    const session =
      location.state?.trialSession ||
      getTrialSession() ||
      {};
    const stableUserId =
      location.state?.stableUserId ||
      session?.stableUserId ||
      session?.userId ||
      "";

    logTrialEvent(
      {
        userId: session?.userId || stableUserId || "",
        trialId: session?.trialId || session?.trialSessionId || "",
        caseId: resolvedCaseId,
        eventType: "pilot_result_viewed",
        page: "PilotResultPage",
        stableUserId,
        meta: {
          stableUserId,
          source: "funnel_event",
        },
      },
      { once: true }
    ).catch((error) => {
      console.error("pilot_result_viewed log error:", error);
    });
  }, [resolvedCaseId, location.state, hasCapturedEvents]);

  const rawSourceInput = buildSourceInputFromState(location.state || {});
  const sourceInput = sanitizeForMarket(rawSourceInput);

  const rawAcceptanceChecklist =
    location.state?.acceptanceChecklist ||
    location.state?.pilot_result?.acceptanceChecklist ||
    null;
  const acceptanceChecklist =
    rawAcceptanceChecklist?.passed !== undefined
      ? rawAcceptanceChecklist
      : rawAcceptanceChecklist?.status
      ? {
          passed: rawAcceptanceChecklist.status === "PASS",
        }
      : rawAcceptanceChecklist;
  const hardenedScopeLock =
    currentCase?.scopeLock ||
    location.state?.scopeLock ||
    location.state?.pilot_setup?.scopeLock ||
    null;
  const resolvedAcceptanceChecklist =
    currentCase?.acceptanceChecklist ||
    location.state?.acceptanceChecklist ||
    location.state?.pilot_result?.acceptanceChecklist ||
    acceptanceChecklist;
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  const [forceWeeklySummary, setForceWeeklySummary] = useState(false);
  const [structuralTraceExpanded, setStructuralTraceExpanded] = useState(false);
  const [receiptEligibilityExpanded, setReceiptEligibilityExpanded] = useState(false);
  const [backupPathExpanded, setBackupPathExpanded] = useState(false);
  const [submittedExpanded, setSubmittedExpanded] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [expandedTriggerKey, setExpandedTriggerKey] = useState(null);

  const pilotFlow = useMemo(() => {
    const entryCount = eventHistory.length;

    const hasExplanation = eventHistory.some((item) => {
      const eventInput = getEntryEventInput(item) || {};
      const caseData = getEntryCaseData(item);

      return (
        String(
          getCaseSummary({
            caseData,
            summaryText: eventInput.summaryContext || "",
          }) || ""
        ).trim().length > 0 ||
        String(
          getCaseContext({
            caseData,
           caseInput: eventInput.description || "",
          }) || ""
        ).trim().length > 0 ||
        String(eventInput.description || "").trim().length > 0
      );
    });

    const hasEvidenceReady = eventHistory.some((item) =>
      evaluatePilotCombinationStatus({ entries: [item] }).evidenceSupport >= 1
    );

    if (forceWeeklySummary) {
      return "weekly_summary";
    }

    if (hasEvidenceReady) {
      return "evidence_backed_result";
    }

    if (hasExplanation || entryCount > 0) {
      return "explanation_only";
    }

    return "empty";
  }, [eventHistory, forceWeeklySummary]);

  const entries = useMemo(() => {
    const rawEntries = eventHistory;

    return rawEntries.map((entry) => {
      const existingCaseData = getEntryCaseData(entry);
      if (existingCaseData) {
        return {
          ...entry,
          caseData: existingCaseData,
        };
      }

      const eventInput = getEntryEventInput(entry) || {};
      const reviewResult = getEntryReviewResult(entry) || {};
      const weakestDimension =
        getEntryWeakestDimension(entry) ||
        sourceInput?.weakestDimension ||
        "";

      const normalizedEntryCase = normalizeCaseInput(
        {
          source: "pilot",
          summary: getCaseSummary({
            caseData: existingCaseData || null,
            summaryText:
              reviewResult.summaryText ||
              eventInput.summaryContext ||
              "",
            caseInput: eventInput.description || "",
          }),
          description: getCaseContext({
            caseData: existingCaseData || null,
            caseInput: eventInput.description || "",
          }),
          eventType:
            entry?.eventType ||
            reviewResult?.eventType ||
            "other",
          eventContext: getCaseContext({
            caseData: existingCaseData || null,
            caseInput: eventInput.description || "",
          }),
          weakestDimension: getCaseWeakestDimension({
            caseData: existingCaseData || null,
            weakestDimension,
          }),
          scenarioCode:
            getCaseScenarioCode({
              caseData: existingCaseData || null,
              scenarioCode:
                reviewResult?.scenarioCode ||
                entry?.scenarioCode ||
                sourceInput?.scenarioCode ||
                "unknown_scenario",
            }) || "unknown_scenario",
          patternId: getCasePatternId({
            caseData: existingCaseData || null,
            pattern:
              reviewResult?.pattern ||
              entry?.pattern ||
              sourceInput?.pattern ||
              "",
          }),
          fallbackRunCode: getCaseRunCode({
            caseData: existingCaseData || null,
            runId:
              reviewResult?.runId ||
              entry?.runId ||
              sourceInput?.runId ||
              "",
          }),
          stage:
            getCaseStage({
              caseData: existingCaseData || null,
              stage:
                reviewResult?.stage ||
                entry?.stage ||
                sourceInput?.stage ||
                "S0",
            }) || "S0",
          dimensions: {
            evidence: weakestDimension === "evidence" ? 1 : 2,
            authority: weakestDimension === "authority" ? 1 : 2,
            coordination: weakestDimension === "coordination" ? 1 : 2,
            timing: 2,
          },
        },
        {
          source: "pilot",
        }
      );
  
      return {
        ...entry,
        caseData: normalizedEntryCase,
      };
    });
  }, [eventHistory, sourceInput]);

  const latestEvent = entries[entries.length - 1] || null;
  const currentEventType = latestEvent?.eventType || getCurrentEventType(entries);
  const currentEventLabel = getEventLabel(currentEventType);

  const scoringEntries = useMemo(() => {
    return entries.slice(-5);
  }, [entries]);

  const resolvedWeakestDimension =
    getEntryWeakestDimension(latestEvent || {}) ||
    sourceInput.weakestDimension ||
    "";

  const topInterventions = useMemo(() => {
    return getTopInterventions({
      acceptanceChecklist,
      weakestDimension: resolvedWeakestDimension,
    });
  }, [acceptanceChecklist, resolvedWeakestDimension]);

  const scoringSource = useMemo(() => {
    return (
      persistedCase ||
      currentCase ||
      location.state?.case ||
      {
        caseId,
        events: scoringEntries,
        capturedEvents: scoringEntries,
        entries: scoringEntries,
        scopeLock: hardenedScopeLock,
        acceptanceChecklist: resolvedAcceptanceChecklist || acceptanceChecklist,
      }
    );
  }, [
    acceptanceChecklist,
    currentCase,
    caseId,
    hardenedScopeLock,
    location.state,
    persistedCase,
    resolvedAcceptanceChecklist,
    scoringEntries,
  ]);

  const score = useMemo(() => {
    return calculateDeterministicScore(scoringSource);
  }, [caseId, persistedCase, scoringEntries, scoringSource]);
  const isReceiptReady = Boolean(score?.receiptEligible);

  useEffect(() => {
    if (!topInterventions[0]) return;
    if (!resolvedCaseId) return;
    if (!hasCapturedEvents) return;

    const session =
      location.state?.trialSession ||
      getTrialSession() ||
      {};
    const stableUserId =
      location.state?.stableUserId ||
      session?.stableUserId ||
      session?.userId ||
      "";

    logEvent("suggested_intervention_shown", {
      eventName: "suggested_intervention_shown",
      rank: 1,
      intervention: topInterventions[0],
      page: "PilotResultPage",
      caseId: resolvedCaseId,
      stableUserId,
      meta: {
        stableUserId,
        source: "funnel_event",
      },
    });
  }, [topInterventions, resolvedCaseId, location.state, hasCapturedEvents]);

  const executionSummary = useMemo(() => {
    return buildExecutionSummary(
      entries,
      resolvedWeakestDimension,
      sourceInput.firstGuidedAction
    );
  }, [entries, resolvedWeakestDimension, sourceInput.firstGuidedAction]);

  const combinationStatus = useMemo(
    () => ({
      score: score.totalScore,
      evidenceSupport: score.evidence,
      structureCompleteness: score.structure,
      consistency: score.consistency,
      continuity: score.continuity,
      structureStatus:
        score.receiptEligible || score.totalScore >= score.receiptThreshold
          ? "ready"
          : score.totalScore >= 2
          ? "building"
          : "weak",
      receiptEligible: score.receiptEligible,
    }),
    [score]
  );

  const hasPilotEntries = entries.length > 0;

  const runtimeState = useMemo(() => {
    return resolvePilotRuntimeState(
      location.state || {},
      combinationStatus,
      hasPilotEntries
    );
  }, [location.state, combinationStatus, hasPilotEntries]);

  const resolvedStructureStatus = runtimeState.resolvedStructureStatus;

  const mainPathSummary = getMainPathSummary({
    structureStatus: resolvedStructureStatus,
    weakestDimension: resolvedWeakestDimension,
    currentEventLabel,
  });

  const primaryRecommendation = getPrimaryRecommendation({
    weakestDimension: resolvedWeakestDimension,
    firstGuidedAction: sourceInput.firstGuidedAction,
    structureStatus: resolvedStructureStatus,
  });

  const backupRecommendation = getBackupRecommendation(
    resolvedWeakestDimension
  );

  const costAttachment = getCostAttachment(resolvedWeakestDimension);

  const runEntries = useMemo(() => {
    return buildRunEntriesFromPilotEntries(entries, {
      runId: sourceInput.runId,
      runLabel: sourceInput.runId,
      stageLabel: sourceInput.stage,
      scenarioLabel: sourceInput.scenarioLabel,
      confidenceLabel: "High",
    });
  }, [entries, sourceInput.runId, sourceInput.stage, sourceInput.scenarioLabel]);

  const totalRunHits = useMemo(() => {
    return runEntries.reduce((sum, entry) => sum + (entry.count || 0), 0);
  }, [runEntries]);

  const primaryRunLabel = runEntries[0]?.runLabel || sourceInput.runId || "RUN000";
  const cleanRunId = cleanTraceId(
    primaryRunLabel ||
      sourceInput.runId ||
      sourceInput.result?.runId ||
      sourceInput.result?.run
  );
  const cleanPatternId = cleanTraceId(
    sourceInput.pattern ||
      sourceInput.patternId ||
      sourceInput.result?.patternId ||
      sourceInput.result?.pattern
  );
  const structuralTraceText = [cleanRunId, cleanPatternId]
    .map(safeMarketText)
    .filter(Boolean)
    .join(" → ");
  const runSummaryText = useMemo(() => {
    return buildRunSummaryText(runEntries);
  }, [runEntries]);

const weeklySummaryDue =
  runtimeState.resolvedSamplingWindowClosed ||
  hasSevenDayWindowElapsed(entries, location.state || {});

useEffect(() => {
  if (weeklySummaryDue) {
    setForceWeeklySummary(true);
  }
}, [weeklySummaryDue]);

const isWeeklySummaryFlow =
  forceWeeklySummary === true || runtimeState.resolvedSummaryMode === true;

const resolvedSummaryMode = isWeeklySummaryFlow;

const incomingSharedScoring =
  location.state?.sharedReceiptVerificationContract?.scoring || null;

const pressureComplexity =
  String(
    entries[entries.length - 1]?.eventInput?.externalPressure ||
    entries[entries.length - 1]?.sourceInput?.externalPressure ||
    ""
  ).trim().length > 0
    ? 1
    : 0;

const boundaryComplexity =
  String(
    entries[entries.length - 1]?.eventInput?.authorityBoundary ||
    entries[entries.length - 1]?.sourceInput?.authorityBoundary ||
    ""
  ).trim().length > 0
    ? 1
    : 0;

const dependencyComplexity =
  String(
    entries[entries.length - 1]?.eventInput?.dependency ||
    entries[entries.length - 1]?.sourceInput?.dependency ||
    ""
  ).trim().length > 0
    ? 1
    : 0;

const eventComplexityMap = {
  other: 0.25,
  decision_suggested: 0.5,
  resource_control_request: 0.75,
  role_boundary_blur: 0.75,
  high_pressure_decision: 1,
  decision_override_attempt: 1,
};

const eventComplexity =
  eventComplexityMap[currentEventType] ?? 0.25;

const complexityScore =
  (pressureComplexity +
    boundaryComplexity +
    dependencyComplexity +
    eventComplexity) / 4;

const complexityLabel =
  complexityScore >= 0.75
    ? "High"
    : complexityScore >= 0.4
    ? "Medium"
    : "Low";

const complexityNote =
  complexityLabel === "High"
    ? "This score was reached under high structural complexity."
    : complexityLabel === "Medium"
    ? "This score was reached under moderate structural complexity."
    : "This score was reached under relatively low structural complexity.";

  const scoring = {
    scoringVersion: "v1",
    evidenceScore: Number(combinationStatus.evidenceSupport || 0),
    structureScore: Number(combinationStatus.structureCompleteness || 0),
    consistencyScore: Number(combinationStatus.consistency || 0),
    continuityScore: Number(combinationStatus.continuity || 0),
    totalScore: Number(score.totalScore.toFixed(2)),
    receiptThreshold: Number(score.receiptThreshold.toFixed(1)),
    receiptEligible: score.receiptEligible,
  };

const scopeGatePassed =
  acceptanceChecklist?.passed === true;

const caseReceiptEligible =
  typeof currentCase?.receipt?.eligible === "boolean"
    ? currentCase.receipt.eligible
    : null;

const access = resolveAccessMode({
  ...(currentCase || {}),
  ...(sourceInput.caseData || {}),
  normalizedScore: scoring.totalScore,
  score: scoring.totalScore,
  eventCount: entries.length,
  events: entries,
  receiptPaid:
    activeCaseBilling?.receiptActivated === true ||
    currentCase?.payment?.receiptActivated === true ||
    currentCase?.payment?.receiptPaid === true ||
    currentCase?.isPaid === true,
  verificationPaid:
    activeCaseBilling?.verificationActivated === true ||
    currentCase?.payment?.verificationActivated === true ||
    currentCase?.payment?.verificationPaid === true,
});

const canProceedToReceipt =
  caseReceiptEligible ?? (access.receiptEligible && scopeGatePassed);

const totalBase =
  scoring.evidenceScore +
  scoring.structureScore +
  scoring.consistencyScore +
  scoring.continuityScore ||
  1;

const ratio = scoring.totalScore / totalBase;

const scoringDisplay = {
  evidenceScore: Number(scoring.evidenceScore.toFixed(2)),
  structureScore: Number(scoring.structureScore.toFixed(2)),
  consistencyScore: Number(scoring.consistencyScore.toFixed(2)),
  continuityScore: Number(scoring.continuityScore.toFixed(2)),

  evidenceWeighted: Number((scoring.evidenceScore * ratio).toFixed(2)),
  structureWeighted: Number((scoring.structureScore * ratio).toFixed(2)),
  consistencyWeighted: Number((scoring.consistencyScore * ratio).toFixed(2)),
  continuityWeighted: Number((scoring.continuityScore * ratio).toFixed(2)),

  totalScore: Number(scoring.totalScore.toFixed(2)),
  rawTotal: Number(scoring.totalScore.toFixed(2)),
  receiptThreshold: Number(scoring.receiptThreshold.toFixed(1)),
};

const scoreTriggerTags = {
  evidence: getScoreTriggerTag({
    type: "evidence",
    score: scoring.evidenceScore,
    entries,
  }),
  structure: getScoreTriggerTag({
    type: "structure",
    score: scoring.structureScore,
    entries,
  }),
  consistency: getScoreTriggerTag({
    type: "consistency",
    score: scoring.consistencyScore,
    entries,
  }),
  continuity: getScoreTriggerTag({
    type: "continuity",
    score: scoring.continuityScore,
    entries,
  }),
};

const triggerEvidenceMap = {
  evidence: getTriggerEvidenceItems({ type: "evidence", entries }),
  structure: getTriggerEvidenceItems({ type: "structure", entries }),
  consistency: getTriggerEvidenceItems({ type: "consistency", entries }),
  continuity: getTriggerEvidenceItems({ type: "continuity", entries }),
};

const resolvedCaseInput = getCaseContext(sourceInput);

const resolvedSummaryText =
  getCaseSummary(sourceInput) ||
  "No structured summary is available yet.";

const missingSummaryText = "No structured summary is available yet.";
const existingPilotSummary = [
  getCaseSummary(sourceInput),
  sourceInput?.summaryText,
].find(
  (summary) =>
    typeof summary === "string" &&
    summary.trim() &&
    summary.trim() !== missingSummaryText
);
const capturedEventText = (Array.isArray(capturedEvents) ? capturedEvents : entries)
  .map((event) =>
    typeof event === "string"
      ? event
      : event?.text ||
        event?.event ||
        event?.description ||
        event?.content ||
        event?.eventInput?.summaryContext ||
        event?.eventInput?.eventDescription ||
        event?.eventInput?.eventText ||
        ""
  )
  .filter(Boolean)
  .join(" ");
const displayPilotSummary = existingPilotSummary || missingSummaryText;

const enhancedSourceInput = {
  ...sourceInput,
  caseData: sourceInput.caseData || null,
  eventHistory: entries,
  latestEvent: entries[entries.length - 1] || null,
  schemaVersion: sourceInput.caseData?.schemaVersion || null,
  structureScoreFromCase: sourceInput.caseData?.structureScore ?? null,
  routeDecisionFromCase: sourceInput.caseData?.routeDecision || null,

  reviewMode: runtimeState.resolvedReviewMode,
  structuredEventCount: runtimeState.resolvedStructuredEventCount,
  evidenceSupport: runtimeState.resolvedEvidenceSupport,
  structureCompleteness: runtimeState.resolvedStructureCompleteness,
  samplingWindowClosed: runtimeState.resolvedSamplingWindowClosed,

  summaryMode: resolvedSummaryMode,
  structureStatus: resolvedStructureStatus,
  caseInput: resolvedCaseInput,
  summaryText: resolvedSummaryText,
  signals: sourceInput.signals || [],
  pilotEntriesCount: entries.length,
  pilotFlow,
  runEntries,
  totalRunHits,
  primaryRunLabel,
  runSummaryText,
  executionSummary,

  continuity: combinationStatus.continuity,
  consistency: combinationStatus.consistency,
  score: scoring.totalScore,
  receiptEligible: canProceedToReceipt,
};

const data = enhancedSourceInput;

const textSource =
  data?.caseInput ||
  data?.latestEvent?.description ||
  data?.latestEvent?.text ||
  data?.latestEvent?.eventInput?.description ||
  data?.latestEvent?.eventInput?.summaryContext ||
  data?.summaryText ||
  "";

const inferredSignals = inferSignalsFromText(textSource);

const mergedSignals = Array.from(new Set([
  ...(data.signals || []),
  ...inferredSignals,
]));

data.signals = mergedSignals;

const pilotSupportingSignals = mergedSignals
  .map((signal) =>
    typeof signal === "string"
      ? safeMarketText(signal)
      : safeMarketText(signal?.label || signal?.key || signal?.value || "")
  )
  .filter(Boolean)
  .sort((a, b) => (SIGNAL_PRIORITY[b] || 0) - (SIGNAL_PRIORITY[a] || 0))
  .slice(0, 2);

console.log("RAW signals:", data?.signals);

const acceptanceStatus = resolvedAcceptanceChecklist?.status || "NEEDS_INPUT";
const acceptanceStatusClass =
  acceptanceStatus === "PASS"
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : acceptanceStatus === "BLOCK"
    ? "bg-red-50 text-red-700 border-red-200"
    : "bg-amber-50 text-amber-700 border-amber-200";
const resolvedChecklistItems = Array.isArray(resolvedAcceptanceChecklist?.items)
  ? resolvedAcceptanceChecklist.items
  : [];
const now = Date.now();

const pilotStartedAt =
  currentCase?.pilotStartedAt ||
  currentCase?.createdAt ||
  location.state?.pilotStartedAt ||
  location.state?.createdAt;

const paidAt =
  currentCase?.paidAt ||
  currentCase?.payment?.paidAt ||
  location.state?.paidAt;

const isPaid =
  Boolean(currentCase?.paid) ||
  currentCase?.accessMode === "paid" ||
  Boolean(paidAt);

const pilotStartMs = pilotStartedAt ? new Date(pilotStartedAt).getTime() : null;
const paidMs = paidAt ? new Date(paidAt).getTime() : null;

const hasSevenDayWindowEnded =
  pilotStartMs ? now - pilotStartMs >= 7 * 24 * 60 * 60 * 1000 : false;

const paidSummaryStillVisible =
  isPaid && paidMs ? now - paidMs < 24 * 60 * 60 * 1000 : false;

const summaryTitle = hasSevenDayWindowEnded
  ? (isPaid ? (paidSummaryStillVisible ? "7-Day Summary" : "Case Record") : "7-Day Summary")
  : "Current Pilot Record";

if (!hasCapturedEvents) {
  const pilotPath = resolvedCaseId
    ? `${ROUTES.PILOT || "/pilot"}?caseId=${encodeURIComponent(resolvedCaseId)}`
    : ROUTES.PILOT || "/pilot";

    return (
      <div className="relative min-h-screen bg-slate-50 text-slate-900 px-6 py-10">
      <TopRightCasesCapsule />
      <div className="max-w-3xl mx-auto">
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={() => {
              const currentCaseId =
                resolvedCaseId ||
                location.state?.caseId ||
                currentCase?.caseId ||
                currentCase?.id ||
                "";

              if (currentCaseId) {
                console.log("[View all cases]", { caseId: currentCaseId });
              }

              navigate(ROUTES.CASES || "/cases");
            }}
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
          >
            View all cases
          </button>
        </div>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm leading-6 text-slate-700">
            Please capture at least one event before generating a pilot result.
          </p>
          <button
            type="button"
            onClick={() =>
              navigate(pilotPath, {
                state: {
                  ...(location.state || {}),
                  caseId: resolvedCaseId,
                  case_id: resolvedCaseId,
                  pcMeta,
                },
              })
            }
            className="mt-4 inline-flex items-center justify-center rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 transition"
          >
            Capture first event
          </button>
        </section>
      </div>
    </div>
  );
}

return (
  <div className="relative min-h-screen bg-slate-50 text-slate-900 px-6 py-10">
    <style>
      {`
        .backup-path-caret {
          width: 0;
          height: 0;
          border-top: 7px solid transparent;
          border-bottom: 7px solid transparent;
          border-left: 10px solid #020617;
          display: inline-block;
          transition: transform 160ms ease;
          transform-origin: center;
          flex: 0 0 auto;
        }

        .backup-path-caret-open {
          transform: rotate(90deg);
        }

        .section-caret {
          width: 0;
          height: 0;
          border-top: 7px solid transparent;
          border-bottom: 7px solid transparent;
          border-left: 10px solid #020617;
          display: inline-block;
          transition: transform 160ms ease;
          transform-origin: center;
          flex: 0 0 auto;
        }

        .section-caret-open {
          transform: rotate(90deg);
        }
      `}
    </style>
    <TopRightCasesCapsule />
    <div className="max-w-3xl mx-auto">
      <div id="pilot-summary-root" className="bg-white rounded-[28px] border border-slate-200 shadow-sm p-6 md:p-8 space-y-6">
        <header className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              {suggestedIntervention && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
                    {suggestedInterventionRank
                      ? `Suggested next move #${suggestedInterventionRank}`
                      : "Suggested next move"}
                  </p>
                  <p className="mt-1 text-xs text-amber-900">
                    {sanitizeText(suggestedIntervention)}
                  </p>
                </div>
              )}
              <h1 className="text-3xl font-bold mb-3">
                {isWeeklySummaryFlow
                  ? "7-Day Pilot Summary"
                  : "Structural Pilot Interpretation"}
              </h1>

              <p className="text-slate-700 leading-7">
                {isWeeklySummaryFlow
                  ? "This page summarizes the pilot window and prepares it for final receipt generation and verification."
                  : resolvedWeakestDimension
                  ? `Where it is weakest: ${sanitizeText(getWeakestDimensionDisplay(resolvedWeakestDimension))}`
                : "This page explains how the current event is being interpreted structurally."}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                What to do next: {sanitizeText(getCustomerNextAction({
                  score: score?.totalScore,
                  weakestDimension: resolvedWeakestDimension,
                }))}
              </p>
            </div>
            <div className="flex items-start justify-end">
              <button
                type="button"
                onClick={() => {
                  const currentCaseId =
                    resolvedCaseId ||
                    location.state?.caseId ||
                    currentCase?.caseId ||
                    currentCase?.id ||
                    "";

                  if (currentCaseId) {
                    console.log("[View all cases]", { caseId: currentCaseId });
                  }

                  navigate(ROUTES.CASES || "/cases");
                }}
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
              >
                View all cases
              </button>
            </div>
          </div>
        </header>

        {false ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <h2 className="text-lg font-semibold text-amber-900">
              No real events recorded yet
            </h2>
            <p className="mt-2 text-sm leading-6 text-amber-800">
              This result is still based on diagnostic input. Capture one real event to activate a grounded baseline.
            </p>
            <button
              type="button"
              onClick={() =>
                navigate(ROUTES.RECEIPT, {
                  state: {
                    ...stripBreadcrumbState(location.state || {}),
                    openQuickCapture: true,
                    quickCaptureIntent: "first_event_from_pilot_result",
                  },
                })
              }
              className="mt-4 inline-flex items-center justify-center rounded-full border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition cursor-pointer"
            >
              Capture first real event
            </button>
          </section>
        ) : null}

        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="rounded-xl bg-white shadow-sm">
                <div className="h-4" />
                <div className="px-5 pt-2 pb-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium text-slate-400">
                        Main judgment path
                      </p>
                      <h2 className="mt-1 text-2xl md:text-3xl font-semibold leading-tight text-slate-950">
                        {sanitizeText(mainPathSummary.title)}
                      </h2>
                    </div>
                  </div>

                  <p className="mt-4 text-xs leading-6 text-slate-700">
                    {sanitizeText(mainPathSummary.body)}
                  </p>

                  <div className="mt-4">
                    {hasCapturedEvents ? (
                      <div style={{ marginTop: "8px" }}>                  
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">
                        No captured events yet.
                      </p>
                    )}
                  </div>

                  {pilotSupportingSignals.length > 0 ? (
                    <div style={{ marginTop: "12px" }}>
                      <section
                        style={{
                          background: "#fff",
                          border: "1px solid #E2E8F0",
                          borderRadius: "16px",
                          padding: "14px 16px",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            width: "100%",
                          }}
                        >
                          <h2
                            style={{
                              fontSize: "15px",
                              fontWeight: 500,
                              margin: 0,
                              color: "#0F172A",
                            }}
                          >
                            What is happening
                          </h2>
                        </div>

                        <div
                          style={{
                            marginTop: "10px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "4px",
                            paddingLeft: "0px",
                          }}
                        >
                          {pilotSupportingSignals.map((signal, index) => (
                            <div
                              key={`${signal}-${index}`}
                              style={{
                                fontSize: "12px",
                                fontWeight: 400,
                                color: "#475569",
                                lineHeight: 1.45,
                              }}
                            >
                              <span style={{ color: "#64748B" }}>
                                What this means in practice {index + 1}:
                              </span>{" "}
                              {sanitizeText(signal)}
                            </div>
                          ))}
                        </div>
                      </section>
                    </div>
                  ) : null}

                  <div className="mt-4 border-t border-slate-100 pt-3">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                      <p className="text-xs font-medium text-slate-900">
                        {isReceiptReady ? "Structure: Receipt-ready" : "Structure: Still forming"}
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowDetails(!showDetails)}
                        className="text-[11px] font-medium text-slate-400 hover:text-slate-600 transition cursor-pointer !bg-transparent !border-0 !shadow-none !p-0"
                      >
                        {showDetails ? "Hide" : "View"}
                      </button>
                    </div>

                    {showDetails && (
                      <div>
                        <p className="mt-3 text-xs font-medium text-slate-900">
                          Case lock & acceptance
                        </p>
                        <div className="mt-2 grid gap-2 text-xs text-slate-700 sm:grid-cols-2">
                          <div>
                            <span className="text-slate-900">Scope status: </span>
                            <span className="font-medium text-slate-900">
                              {sanitizeText(hardenedScopeLock?.status, "not locked")}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-900">Workflow: </span>
                            <span className="font-medium text-slate-900">
                              {sanitizeText(safeMarketText(hardenedScopeLock?.workflow || sourceInput?.workflow || ""))}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-900">Acceptance status: </span>
                            <span
                              className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${acceptanceStatusClass}`}
                            >
                              {sanitizeText(acceptanceStatus)}
                            </span>
                            <p className="text-sm text-slate-500 mt-1">
                              Acceptance means the required structure exists. Receipt readiness depends on the decision stability threshold below.
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-900">Receipt-ready: </span>
                            <span className="font-medium text-slate-900">
                              {isReceiptReady ? "Ready" : "Locked"}
                            </span>
                          </div>
                        </div>

                        <div className="mt-3">
                          <p className="text-xs font-medium text-slate-900">
                            Acceptance Checklist
                          </p>
                          <div className="mt-2 grid gap-1.5 text-xs text-slate-700">
                            {resolvedChecklistItems.length > 0 ? (
                              resolvedChecklistItems.map((item) => (
                                <div
                                  key={item?.key || item?.label}
                                  className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"
                                >
                                  <span>
                                    {sanitizeText(item?.label, "Checklist item")}
                                  </span>
                                  <span
                                    className={
                                      item?.passed
                                        ? "font-medium text-emerald-700"
                                        : "font-medium text-slate-500"
                                    }
                                  >
                                    {item?.passed ? "Passed" : "Missing"}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <p className="text-slate-500">
                                No acceptance checklist recorded yet.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {(enhancedSourceInput.caseInput ||
                  enhancedSourceInput.summaryText ||
                  enhancedSourceInput.latestEvent) && (
                  <div className="mx-5 mb-5 bg-white p-4">
                    <p className="text-xs font-medium text-slate-400">
                      Observed context
                    </p>
                    <p className="mt-1 text-xs leading-6 text-slate-700">
                      {sanitizeText(resolveObservedContext(currentCase))}
                    </p>
                  </div>
                )}

                <div className="mx-5 mb-3 bg-transparent p-4">
                  <p className="text-xs font-medium text-emerald-700">
                    Next best action
                  </p>

                  <p className="mt-1 text-sm font-medium text-emerald-900">
                    {sanitizeText(primaryRecommendation)}
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    This is the smallest next action most likely to change the outcome without rebuilding the entire path.
                  </p>
                </div>

                <div className="mx-6 mb-6 rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setBackupPathExpanded((prev) => !prev)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-xs font-medium text-slate-900"
                  >
                    <span
                      aria-hidden="true"
                      className={`backup-path-caret ${
                        backupPathExpanded ? "backup-path-caret-open" : ""
                      }`}
                    />
                    <span>Backup path</span>
                  </button>

                  {backupPathExpanded && (
                    <div className="px-4 pb-4">
                      <p className="text-xs leading-6 text-slate-700">
                        {sanitizeText(backupRecommendation)}
                      </p>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>

          <div className="pt-2">
            {hasCapturedEvents ? (
              <div
                style={{
                  width: "100%",
                  paddingLeft: "8px",
                  paddingRight: "8px",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                    gap: "12px",
                    alignItems: "stretch",
                    width: "100%",
                    maxWidth: "920px",
                    margin: "0 auto",
                  }}
                >
                  <div>
                    <button
                      type="button"
                      onClick={async () => {
                        access.receiptEligible && scopeGatePassed

                        const routeDecision = {
                          mode: resolvedSummaryMode ? "final_receipt" : "case_receipt",
                          reason: resolvedSummaryMode
                            ? "Weekly review has reached receipt evaluation."
                            : "Current case is ready for receipt evaluation.",
                        };
                    
                      const receiptSource = resolvedSummaryMode
                        ? "pilot_weekly_summary"
                        : "pilot_case_result";
                    
                      const receiptSourceInput = {
                        ...enhancedSourceInput,
                        summaryMode: resolvedSummaryMode,
                        routeDecision: {
                          ...(enhancedSourceInput.routeDecision || {}),
                          ...routeDecision,
                        },
                        runEntries,
                        totalRunHits,
                        primaryRunLabel,
                        runSummaryText,
                        executionSummary,
                        scoring: {
                          scoringVersion: scoring.scoringVersion,
                          evidenceScore: scoring.evidenceScore,
                          structureScore: scoring.structureScore,
                          consistencyScore: scoring.consistencyScore,
                          continuityScore: scoring.continuityScore,
                          totalScore: scoring.totalScore,
                          receiptThreshold: scoring.receiptThreshold,
                          receiptEligible: scoring.receiptEligible,
                        },
                      };
                    
                      const receiptPageData = buildReceiptPageData(receiptSourceInput);
                      const finalReceiptHash = await createReceiptHash({
                        ...receiptPageData,
                        runEntries,
                        totalRunHits,
                      });

                      const safeEntries = Array.isArray(entries) ? entries : [];
                      const existingEvents = Array.isArray(currentCase?.events)
                        ? currentCase.events
                        : [];
                      const mergedEvents = [...safeEntries, ...existingEvents].filter(Boolean);

                      try {
                        if (!currentCase?.receipt?.hash) {
                          upsertCase({
                            caseId: resolvedCaseId,
                            events: mergedEvents,
                            eventLogs: mergedEvents,
                            entries: mergedEvents,
                            latestEvent: mergedEvents[0] || null,
                            status: "workspace_summary",
                            updatedAt: new Date().toISOString(),
                            receipt: {
                              eligible: canProceedToReceipt,
                              score: scoring.totalScore,
                              generatedAt: new Date().toISOString(),
                              hash: finalReceiptHash,
                            },
                          });
                        }
                      } catch (error) {
                        console.warn("Failed to persist receipt on case", error);
                      }

                      try {
                        if (resolvedCaseId) {
                          updateCase(resolvedCaseId, {
                            scopeLock: {
                              summary: {
                                receiptEligible: scoring.receiptEligible,
                                scopeGatePassed,
                                totalScore: scoring.totalScore,
                                threshold: scoring.receiptThreshold,
                                weakestDimension: resolvedWeakestDimension || "",
                                reason: routeDecision.reason || "",
                              },
                              lockedAt: new Date().toISOString(),
                              sourcePage: "PilotResultPage",
                            },
                            updatedAt: new Date().toISOString(),
                          });
                        }
                      } catch (error) {
                        console.warn("Failed to save scopeLock to case", error);
                      }
                     
                      const receiptPageDataWithHash = {
                        ...receiptPageData,
                        receiptHash: finalReceiptHash,
                        runEntries,
                        totalRunHits,
                        primaryRunLabel,
                        runSummaryText,
                        executionSummary,
                      };
                    
                      const verificationPageData = buildVerificationPageData(receiptSourceInput);
                    
                      const sharedReceiptVerificationContract = buildReceiptContract({
                        ...receiptPageDataWithHash,
                        ...verificationPageData,
                        caseData:
                          receiptSourceInput.caseData ||
                          enhancedSourceInput.caseData ||
                          null,
                        receiptSource,
                      });
                    
                      const flattenedSharedReceiptVerificationContract =
                        flattenSharedReceiptVerificationContract(
                          sharedReceiptVerificationContract
                        );

                      const finalEvidenceLock = {
                        receiptId:
                          flattenedSharedReceiptVerificationContract?.receiptId ||
                          receiptPageDataWithHash.receiptId,
                        receiptHash:
                          flattenedSharedReceiptVerificationContract?.receiptHash ||
                          finalReceiptHash,
                        receiptSource,
                        receiptMode: routeDecision.mode,
                      };
                    
                      const sharedReceiptVerificationContractForStorage = {
                        receiptId:
                          flattenedSharedReceiptVerificationContract?.receiptId ||
                          receiptPageDataWithHash.receiptId ||
                          null,

                        receiptHash:
                          flattenedSharedReceiptVerificationContract?.receiptHash ||
                          finalReceiptHash ||
                          null,

                        receiptSource,
                        receiptMode: routeDecision.mode,

                        weakestDimension:
                          flattenedSharedReceiptVerificationContract?.weakestDimension ||
                          resolvedWeakestDimension ||
                          "",

                        overallStatus:
                          flattenedSharedReceiptVerificationContract?.overallStatus ||
                          verificationPageData?.overallStatus ||
                          "Ready for Review",

                        scoring: {
                          scoringVersion: scoring.scoringVersion,
                          evidenceScore: scoring.evidenceScore,
                          structureScore: scoring.structureScore,
                          consistencyScore: scoring.consistencyScore,
                          continuityScore: scoring.continuityScore,
                          totalScore: scoring.totalScore,
                          receiptThreshold: scoring.receiptThreshold,
                          receiptEligible: scoring.receiptEligible,
                        },

                        evidenceLock: finalEvidenceLock,

                        routeDecision: {
                          mode: routeDecision.mode,
                          reason: routeDecision.reason,
                        },

                        reviewMode: runtimeState.resolvedReviewMode || "event_review",
                        summaryMode: resolvedSummaryMode === true,

                        primaryRunLabel: primaryRunLabel || "RUN000",
                        runSummaryText: runSummaryText || "",

                        executionSummary: executionSummary
                          ? {
                              totalEvents: executionSummary.totalEvents ?? 0,
                              structuredEventsCount: executionSummary.structuredEventsCount ?? 0,
                              structuredEvents: Array.isArray(executionSummary.structuredEvents)
                                ? executionSummary.structuredEvents
                                : [],
                              latestEventType: executionSummary.latestEventType || "other",
                              latestEventLabel: executionSummary.latestEventLabel || "",
                              mainObservedShift: executionSummary.mainObservedShift || "",
                              nextCalibrationAction: executionSummary.nextCalibrationAction || "",
                              behaviorStatus: executionSummary.behaviorStatus || "behavior_weak",
                            }
                          : null,
                      }; 
                  
                      try {
                        localStorage.setItem(
                          "receiptPageData",
                    JSON.stringify(receiptPageDataWithHash)
                        );
                        localStorage.setItem(
                    "receiptRouteDecision",
                          JSON.stringify(routeDecision)
                        );
                        localStorage.setItem("receiptSource", receiptSource);
                        localStorage.setItem(
                          "sharedReceiptVerificationContract",
                          JSON.stringify(sharedReceiptVerificationContractForStorage)
                        );
                        localStorage.setItem(
                          "verificationPageData",
                          JSON.stringify({
                            receiptId:
                              flattenedSharedReceiptVerificationContract?.receiptId ||
                              receiptPageDataWithHash.receiptId,
                            receiptHash:
                              flattenedSharedReceiptVerificationContract?.receiptHash ||
                              finalReceiptHash,
                            weakestDimension:
                              flattenedSharedReceiptVerificationContract?.weakestDimension ||
                              resolvedWeakestDimension ||
                              "",
                            overallStatus:
                              flattenedSharedReceiptVerificationContract?.overallStatus ||
                              verificationPageData?.overallStatus ||
                              "Ready for Review",
                            scoring: {
                              scoringVersion: scoring.scoringVersion,
                              evidenceScore: scoring.evidenceScore,
                              structureScore: scoring.structureScore,
                              consistencyScore: scoring.consistencyScore,
                              continuityScore: scoring.continuityScore,
                              totalScore: scoring.totalScore,
                              receiptThreshold: scoring.receiptThreshold,
                              receiptEligible: scoring.receiptEligible,
                            },
                          })
                        );
                      } catch (error) {
                        console.error("Failed to persist receipt payload:", error);
                      }
                    
                      const session =
                        location.state?.trialSession ||
                        getTrialSession() ||
                        null;
                    
                      logTrialEvent(
                        {
                          userId:
                            session?.userId ||
                            location.state?.stableUserId ||
                            localStorage.getItem("nimclea_user_id") ||
                            "anonymous_user",
                          trialId:
                            session?.trialId ||
                            session?.trialSessionId ||
                            "pilot_result",
                          sessionId:
                            location.state?.session_id ||
                            location.state?.sessionId ||
                            session?.trialSessionId ||
                            session?.trialId ||
                            receiptPageDataWithHash.receiptId ||
                            "pilot_result",
                          caseId:
                            receiptSourceInput.caseData?.caseId ||
                            receiptSourceInput.caseData?.id ||
                            location.state?.caseId ||
                            location.state?.case_id ||
                            resolvedCaseId,
                          eventType: "pilot_to_receipt_clicked",
                          page: "PilotResultPage",
                          meta: {
                            receiptMode: routeDecision.mode,
                            receiptSource,
                            receiptEligible: scoring.receiptEligible,
                            totalScore: scoring.totalScore,
                            weakestDimension: resolvedWeakestDimension || "",
                            receiptId:
                              flattenedSharedReceiptVerificationContract?.receiptId ||
                              receiptPageDataWithHash.receiptId,
                            receiptHash:
                              flattenedSharedReceiptVerificationContract?.receiptHash ||
                              finalReceiptHash,
                          },
                        },
                        { once: true }
                      ).catch((error) => {
                        console.error("pilot_to_receipt_clicked log error:", error);
                      });

                      navigate(ROUTES.RECEIPT, {
                        state: {
                          session_id:
                            location.state?.session_id ||
                            location.state?.sessionId ||
                            receiptPageDataWithHash.receiptId ||
                            "pilot_result",

                          sessionId:
                            location.state?.sessionId ||
                            location.state?.session_id ||
                            receiptPageDataWithHash.receiptId ||
                            "pilot_result",

                          caseId:
                            receiptSourceInput.caseData?.caseId ||
                            receiptSourceInput.caseData?.id ||
                            resolvedCaseId,

                          pcMeta,
                          receiptReady: true,
                        },
                      });
                      }}
                      className="w-full inline-flex items-center justify-center rounded-full border border-slate-950 bg-slate-950 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-900 active:bg-black transition cursor-pointer"
                    >
                      Receipt
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      console.log("[BACK_TO_RESULT_TARGET]", {
                        resultCaseId,
                        resolvedCaseId,
                        diagnosticResultPath,
                      });

                      navigate(diagnosticResultPath, {
                        state: {
                          ...(location.state || {}),
                          caseId: resultCaseId || resolvedCaseId,
                          case_id: resultCaseId || resolvedCaseId,
                          from: "case",
                          pcMeta,
                        },
                      });
                    }}
                    style={{
                      display: "inline-flex",
                      width: "100%",
                      minHeight: "38px",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "999px",
                      padding: "7px 12px",
                      fontSize: "10px",
                      fontWeight: 600,
                      backgroundColor: "#FFFFFF",
                      color: "#0F172A",
                      border: "1px solid #E2E8F0",
                      boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
                      cursor: "pointer",
                    }}
                    >
                    Back to Result
                  </button>

                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500">
                <p>No events recorded yet.</p>
                <p className="mt-1">
                  Add your first event to start building a real case record.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      {showSubscriptionModal && (
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
                onClick={() => setShowSubscriptionModal(false)}
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
                  {sanitizeText(workspaceCopy.workspaceTitle)}
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
                  $499 / month
                </p>
      
                <p
                  style={{
                    margin: "4px 0 0 0",
                    fontSize: "13px",
                    color: "#94A3B8",
                    textDecoration: "line-through",
                  }}
                >
                  $699
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
                  <div>Unlimited pilot sessions</div>
                  <div>Unlimited result access</div>
                  <div>Internal case tracking</div>
                  <div>Analytics and history</div>
                  <div>Preview of receipt & verification states</div>
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
                  <div>Formal Receipt issuance</div>
                  <div>Formal Verification packages</div>
                  <div>Exportable proof</div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowSubscriptionModal(false)}
                  className="inline-flex items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-xs font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100"
                  style={{ marginTop: "16px" }}
                >
                  {sanitizeText(workspaceCopy.workspaceCta)}
                </button>
              </div>

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
                  Formal Receipt
                </h3>
      
                <p
                  style={{
                    margin: "8px 0 0 0",
                    fontSize: "14px",
                    lineHeight: 1.6,
                    color: "#475569",
                  }}
                >
                  Turn a case into a formal, stored decision record.
                </p>

                <p
                  style={{
                    margin: "12px 0 0 0",
                    fontSize: "28px",
                    fontWeight: 700,
                    color: "#0F172A",
                  }}
                >
                  $499 / case
                </p>
      
                <p
                  style={{
                    margin: "4px 0 0 0",
                    fontSize: "13px",
                    color: "#94A3B8",
                    textDecoration: "line-through",
                  }}
                >
                  $699
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
                  <div>Official receipt issuance</div>
                  <div>Locked case snapshot</div>
                  <div>Persistent storage</div>
                  <div>Internal documentation use</div>
                </div>

                <div
                  style={{
                    marginTop: "12px",
                    fontSize: "14px",
                    lineHeight: 1.7,
                    color: "#64748B",
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: "4px" }}>Best for</div>
              <div>Recording key decisions</div>
                    <div>Internal audits</div>
                  <div>Case archiving</div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowSubscriptionModal(false)}
                  className="inline-flex items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-xs font-semibold text-amber-700 shadow-sm transition hover:bg-amber-100"
                  style={{ marginTop: "16px" }}
                >
                  {sanitizeText(workspaceCopy.receiptCta)}
                </button>
              </div>
            </div>

            <p
              style={{
                width: "100%",
                margin: "12px 8px 0 8px",
                fontSize: "13px",
                lineHeight: 1.7,
                color: "#475569",
                textAlign: "left",
                whiteSpace: "nowrap",
              }}
            >
              Run unlimited decisions inside the workspace. Only pay when a case becomes a formal, portable outcome.
            </p>
          </div>
        </div>
      )}

    </div>
  </div>
);
}
