import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getTrialSession } from "../lib/trialSession";
import ROUTES from "../routes";
import { evaluateCaseRecordStatus } from "../utils/verificationStatus";
import { normalizeCaseInput } from "../utils/caseSchema";
import { logTrialEvent } from "../lib/trialApi";
import { getStableUserId } from "../utils/eventLogger";
import { readSummaryBuffer } from "../lib/summaryBuffer";
import { resolveAccessMode } from "../lib/accessMode";
import { getAccessMode } from "../utils/accessMode";
import VerificationTraceBlock from "./components/VerificationTraceBlock";
import TopRightCasesCapsule from "../components/TopRightCasesCapsule.jsx";
import { getCaseById, getCurrentCaseId, resolveCaseId, upsertCase } from "../utils/caseRegistry.js";
import { calculateDeterministicScore } from "../utils/deterministicScore";

import {
  getCaseSummary,
  getCaseContext,
  getCaseScenarioCode,
  getCaseStage,
  getCaseRunCode,
  getCaseWeakestDimension,
} from "../utils/caseAccessors";
import {
  flattenSharedReceiptVerificationContract,
} from "../utils/sharedReceiptVerificationContract";

function updateCase(caseId = "", patch = {}) {
  if (!caseId) return null;

  return upsertCase({
    caseId,
    ...patch,
  });
}

function getStoredVerificationData() {
  try {
    const raw = localStorage.getItem("verificationPageData");
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error("Failed to read verificationPageData from localStorage:", error);
    return null;
  }
}

function getStoredStableHash(key = "") {
  if (!key) return "";

  try {
    return localStorage.getItem(key) || "";
  } catch (error) {
    console.warn("Failed to read stored hash:", error);
    return "";
  }
}

function saveStoredStableHash(key = "", hash = "") {
  if (!key || !hash) return;

  try {
    localStorage.setItem(key, hash);
  } catch (error) {
    console.warn("Failed to save stored hash:", error);
  }
}

function getStableHashValue(value) {
  return typeof value === "string" && value.trim() ? value : "";
}

function saveStoredVerificationHash(caseId = "", receiptHash = "", verificationHash = "") {
  if (!verificationHash) return;

  const hashKey = caseId || receiptHash;
  saveStoredStableHash(
    hashKey ? `verificationHash:${hashKey}:${receiptHash || "no-receipt"}` : "",
    verificationHash
  );

  try {
    const raw = localStorage.getItem("verificationPageData");
    const current = raw ? JSON.parse(raw) : {};
    localStorage.setItem(
      "verificationPageData",
      JSON.stringify({
        ...current,
        verificationHash,
      })
    );
  } catch (error) {
    console.warn("Failed to persist verification hash in verificationPageData:", error);
  }

  try {
    if (caseId) {
      upsertCase({
        caseId,
        verificationHash,
      });
    }
  } catch (error) {
    console.warn("Failed to persist verification hash in case registry:", error);
  }
}

async function fetchReceiptLedgerRecord(caseId) {
  if (!caseId) return null;

  const response = await fetch(
    `http://localhost:3000/hash-ledger/receipt?caseId=${encodeURIComponent(caseId)}`
  );

  if (response.status === 404) return null;

  if (!response.ok) {
    throw new Error(`Failed to fetch receipt ledger: ${response.status}`);
  }

  const data = await response.json();
  return data?.record || data || null;
}

function getReceiptLedgerRecordHash(record) {
  return (
    record?.hash ||
    record?.receiptHash ||
    record?.data?.receiptHash ||
    record?.payload?.receiptHash ||
    ""
  );
}

function getStoredReceiptCaseData() {
  try {
    const raw = localStorage.getItem("receiptCaseData");
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error("Failed to read receiptCaseData from localStorage:", error);
    return null;
  }
}

function getStoredSharedReceiptVerificationContract() {
  try {
    const raw = localStorage.getItem("sharedReceiptVerificationContract");
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error("Failed to read sharedReceiptVerificationContract from localStorage:", error);
    return null;
  }
}

function generateVerificationHash({
  receiptHash,
  overallStatus,
  weakestDimension,
  checks = [],
}) {
  try {
    const base = JSON.stringify({
      receiptHash,
      overallStatus,
      weakestDimension,
      checks: checks.map((c) => ({
        label: c.label,
        status: c.status,
      })),
    });

    let h1 = 0x811c9dc5;
    let h2 = 0x01000193;
    let h3 = 0x9e3779b9;

    for (let i = 0; i < base.length; i++) {
      const code = base.charCodeAt(i);

      h1 ^= code;
      h1 = Math.imul(h1, 16777619);

      h2 ^= code + i;
      h2 = Math.imul(h2, 2166136261);

      h3 ^= code * (i + 1);
      h3 = Math.imul(h3, 2654435761);
    }

    const part1 = (h1 >>> 0).toString(16).toUpperCase().padStart(8, "0");
    const part2 = (h2 >>> 0).toString(16).toUpperCase().padStart(8, "0");
    const part3 = (h3 >>> 0).toString(16).toUpperCase().padStart(8, "0");

    return `VH-${part1}${part2}${part3}`;
  } catch (e) {
    return "VH-UNAVAILABLE";
  }
}

function getFirstNonEmpty(...values) {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    return value;
  }
  return null;
}

function resolveVerificationPayload(
  routeEnvelope = {},
  receiptContext = null,
  routeData = null,
  storedData = null,
  sharedContract = null
) {
  const storedReceiptCaseData = getStoredReceiptCaseData();
  const sharedFlat = sharedContract
    ? flattenSharedReceiptVerificationContract(sharedContract)
    : null;

  const schema =
    routeEnvelope?.caseData ||
    routeEnvelope?.caseSchemaSnapshot ||
    routeEnvelope?.caseSchema ||
    receiptContext?.caseData ||
    receiptContext?.caseSchemaSnapshot ||
    receiptContext?.caseSchema ||
    routeData?.caseData ||
    routeData?.caseSchemaSnapshot ||
    routeData?.caseSchema ||
    sharedFlat?.caseData ||
    storedData?.caseData ||
    storedData?.caseSchemaSnapshot ||
    storedData?.caseSchema ||
    storedReceiptCaseData ||
    null;

  const eventSummary =
    sharedFlat?.executionSummary ||
    routeEnvelope?.eventHistorySummary ||
    routeEnvelope?.eventSummary ||
    routeData?.eventHistorySummary ||
    routeData?.eventSummary ||
    routeData?.executionSummary ||
    routeData?.eventExecutionSummary ||
    receiptContext?.eventHistorySummary ||
    receiptContext?.eventSummary ||
    receiptContext?.executionSummary ||
    receiptContext?.eventExecutionSummary ||
    storedData?.eventHistorySummary ||
    storedData?.eventSummary ||
    storedData?.executionSummary ||
    storedData?.eventExecutionSummary ||
    null;

  const behavioralGroundingSummary =
    sharedFlat?.behavioralGroundingSummary ||
    routeEnvelope?.behavioralGroundingSummary ||
    routeEnvelope?.groundingSummary ||
    routeData?.behavioralGroundingSummary ||
    routeData?.groundingSummary ||
    receiptContext?.behavioralGroundingSummary ||
    receiptContext?.groundingSummary ||
    storedData?.behavioralGroundingSummary ||
    storedData?.groundingSummary ||
    null;

  const receiptHash = getFirstNonEmpty(
    sharedFlat?.receiptHash,
    routeEnvelope?.receiptHash,
    routeData?.receiptHash,
    receiptContext?.receiptHash,
    storedData?.receiptHash
  );

  return {
    schema,
    eventSummary,
    behavioralGroundingSummary,
    receiptHash,

    verificationTitle: getFirstNonEmpty(
      routeEnvelope?.verificationTitle,
      routeData?.verificationTitle,
      storedData?.verificationTitle
    ),

    overallStatus: getFirstNonEmpty(
      routeEnvelope?.overallStatus,
      routeData?.overallStatus,
      storedData?.overallStatus
    ),

    receiptId: getFirstNonEmpty(
      sharedFlat?.receiptId,
      routeEnvelope?.receiptId,
      routeData?.receiptId,
      receiptContext?.receiptId,
      storedData?.receiptId
    ),

    verifiedAt: getFirstNonEmpty(
      sharedFlat?.verifiedAt,
      routeEnvelope?.verifiedAt,
      routeData?.verifiedAt,
      receiptContext?.verifiedAt,
      storedData?.verifiedAt
    ),

    introText: getFirstNonEmpty(
      sharedFlat?.introText,
      routeEnvelope?.introText,
      routeData?.introText,
      storedData?.introText
    ),

    checks:
      routeEnvelope?.checks ||
      routeData?.checks ||
      storedData?.checks ||
      null,

    eventTimeline:
      routeEnvelope?.eventTimeline ||
      routeData?.eventTimeline ||
      storedData?.eventTimeline ||
      null,

    finalNote: getFirstNonEmpty(
      sharedFlat?.finalNote,
      routeEnvelope?.finalNote,
      routeData?.finalNote,
      storedData?.finalNote
    ),

    backToReceiptText: getFirstNonEmpty(
      sharedFlat?.backToReceiptText,
      routeEnvelope?.backToReceiptText,
      routeData?.backToReceiptText,
      storedData?.backToReceiptText
    ),

    runEntries:
      sharedFlat?.runEntries ||
      routeEnvelope?.runEntries ||
      routeData?.runEntries ||
      receiptContext?.runEntries ||
      storedData?.runEntries ||
      [],

    totalRunHits: getFirstNonEmpty(
      sharedFlat?.totalRunHits,
      routeEnvelope?.totalRunHits,
      routeData?.totalRunHits,
      receiptContext?.totalRunHits,
      storedData?.totalRunHits
    ),

    primaryRunLabel: getFirstNonEmpty(
      sharedFlat?.primaryRunLabel,
      routeEnvelope?.primaryRunLabel,
      routeData?.primaryRunLabel,
      receiptContext?.primaryRunLabel,
      storedData?.primaryRunLabel
    ),

    runSummaryText: getFirstNonEmpty(
      sharedFlat?.runSummaryText,
      routeEnvelope?.runSummaryText,
      routeData?.runSummaryText,
      receiptContext?.runSummaryText,
      storedData?.runSummaryText
    ),

    topSignals:
      sharedFlat?.topSignals ||
      routeEnvelope?.topSignals ||
      routeData?.topSignals ||
      receiptContext?.topSignals ||
      storedData?.topSignals ||
      [],
  };
}

function normalizeVerificationData(input = {}, summaryBuffer = null) {
  const normalizedCaseData = input.schema
    ? normalizeCaseInput(input.schema, { source: "verification" })
    : null;

  const resolvedEventSummary =
    input.eventSummary ||
    input.executionSummary ||
    input.eventExecutionSummary ||
    {};

  const resolvedBehavioralGroundingSummary =
    input.behavioralGroundingSummary || {};

  return {
    verificationTitle: input.verificationTitle || "Formal Verification Review Record",
    overallStatus: input.overallStatus || "Ready for Review",
    receiptId: input.receiptId || "RCPT-DEMO-001",
    verifiedAt: input.verifiedAt || "",
    caseInput: getCaseContext({
      ...input,
      caseData: normalizedCaseData,
    }),

    summaryContext:
      summaryBuffer?.summaryContext ||
      getCaseSummary({
        ...input,
        caseData: normalizedCaseData,
      }) ||
      "",

    displayContext:
      summaryBuffer?.displayContext ||
      summaryBuffer?.summaryContext ||
      getCaseSummary({
        ...input,
        caseData: normalizedCaseData,
      }) ||
      getCaseContext({
        ...input,
        caseData: normalizedCaseData,
      }),

    scenarioLabel: getCaseScenarioCode({
      ...input,
      caseData: normalizedCaseData,
    }),

    stageLabel: getCaseStage({
      ...input,
      caseData: normalizedCaseData,
    }),

    confidenceLabel:
      input.confidenceLabel ||
      normalizedCaseData?.confidenceLabel ||
      normalizedCaseData?.confidence ||
      "Not available",

    runLabel: getCaseRunCode({
      ...input,
      caseData: normalizedCaseData,
    }),

    weakestDimension: getCaseWeakestDimension({
      ...input,
      caseData: normalizedCaseData,
    }),
    runEntries: Array.isArray(input.runEntries) ? input.runEntries : [],
    totalRunHits: Number.isFinite(input.totalRunHits) ? input.totalRunHits : 0,
    primaryRunLabel: input.primaryRunLabel || input.runLabel || "",
    runSummaryText: input.runSummaryText || "",
    executionSummary: {
      totalEvents: resolvedEventSummary.totalEvents ?? 0,
      structuredEventsCount: resolvedEventSummary.structuredEventsCount ?? 0,
      latestEventType: resolvedEventSummary.latestEventType || "other",
      latestEventLabel:
        resolvedEventSummary.latestEventLabel || "No recorded structural event",
      latestEventDescription:
        resolvedEventSummary.latestEventDescription || "",
      mainObservedShift:
        resolvedEventSummary.mainObservedShift ||
        "No behavioral shift recorded yet.",
      nextCalibrationAction:
        resolvedEventSummary.nextCalibrationAction ||
        "Record one real workflow event to begin calibration.",
      behaviorStatus:
        resolvedEventSummary.behaviorStatus || "behavior_weak",
    },

    behavioralGroundingSummary: {
      groundingStatus:
        resolvedBehavioralGroundingSummary.groundingStatus || "",
      groundingLabel:
        resolvedBehavioralGroundingSummary.groundingLabel || "",
      groundingNote:
        resolvedBehavioralGroundingSummary.groundingNote || "",
      groundingScore:
        typeof resolvedBehavioralGroundingSummary.groundingScore === "number"
          ? resolvedBehavioralGroundingSummary.groundingScore
          : null,
    },

    topSignals: Array.isArray(input.topSignals) ? input.topSignals : [],
    receiptHash: input.receiptHash || "",

    introText:
      input.introText ||
      "This record reviews whether the issued receipt baseline is sufficient to support a formal verification outcome. It does not replace legal, compliance, or professional judgment.",
    checks: Array.isArray(input.checks)
      ? input.checks
      : [
          {
           label: "Continuity",
            status: "passed",
            detail: "The case context connects clearly to the recorded RUN path.",
          },
          {
            label: "Consistency",
            status: "passed",
            detail: "Scenario, stage, and RUN describe one coherent decision path.",
          },
          {
            label: "Structure completeness",
            status: "passed",
            detail: "The core structural fields are present and readable.",
          },
          {
            label: "Evidence support",
            status: "passed",
            detail: "Supporting signals and proof are present in the current record.",
          },
        ],

    eventTimeline: Array.isArray(input.eventTimeline)
      ? input.eventTimeline
      : [
          {
            time: "Step 1",
            title: "Diagnostic completed",
            detail: "User finished the diagnostic flow and received structured output.",
          },
          {
            time: "Step 2",
            title: "Receipt generated",
            detail: `Receipt captured structured decision path and execution stage.`
          },
          {
            time: "Step 3",
            title: "Verification opened",
            detail: "The user entered the verification layer to review traceability.",
          },
        ],

    finalNote:
      input.finalNote ||
      "Verification confirms whether the current receipt and supporting output are consistent and reviewable. It does not replace legal, compliance, or professional review.",
    
    backToReceiptText: input.backToReceiptText || "Back to Decision Receipt",

    caseData: normalizedCaseData,
    schemaVersion: normalizedCaseData?.schemaVersion || null,
    structureScoreFromCase: normalizedCaseData?.structureScore ?? null,
    structureStatusFromCase: normalizedCaseData?.structureStatus || null,
    routeDecisionFromCase: normalizedCaseData?.routeDecision || null,
  };
}

function getStatusStyles(status) {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "passed") {
    return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  }

  if (normalized === "warning") {
    return "bg-amber-50 text-amber-700 border border-amber-200";
  }

  if (normalized === "failed") {
    return "bg-red-50 text-red-700 border border-red-200";
  }

  return "bg-slate-50 text-slate-700 border border-slate-200";
}

function getCalibrationGuidance({ status, checks = [], weakestDimension = "" }) {
  if (status === "Verification Ready") {
    return {
      title: "This verification result ready to carry forward",
      message:
        "This record is now stable enough to be reviewed, shared, and relied on outside the pilot flow.",
      actions: [
        "Preserve the receipt and its hash before external use.",
        "Use the formal version when this decision needs to travel outside your system.",
      ],
      alternatives: [
       {
          label: "Preserve as internal archive",
          detail:
            "Low cost, but limited immediate decision impact. Best when future traceability matters more than immediate external use.",
        },
      ],
    };
  }

  if (status === "Verification Warning") {
    const weakChecks = checks.filter(
      (c) => c.status === "warning" || c.status === "failed"
    );

    const priorityOrder = [
      "Structure completeness",
      "Consistency",
      "Continuity",
     "Evidence support",
    ];

    const weakestCheck =
      priorityOrder
        .map((label) => weakChecks.find((c) => c.label === label))
        .find(Boolean) || weakChecks[0];

    const normalizedWeakestDimension = String(weakestDimension || "").toLowerCase();

    if (normalizedWeakestDimension) {
      if (normalizedWeakestDimension === "authority") {
        return {
          title: "Authority condition not yet sufficient",
          message: "Formal verification cannot be issued yet because decision authority is still too weak.",
          actions: [
            "Clarify who has decision authority before treating this proof as externally valid."
          ],
          alternatives: [
            {
              label: "Use internally only",
              detail:
                "Lower external risk, but limited decision force. Suitable for internal coordination while authority remains unresolved.",
            },
            {
              label: "Rebuild from receipt",
              detail:
                "Moderate effort, but improves external defensibility. Best when authority can be clarified without restarting the full pilot.",
            },
          ],
        };
      }
      if (normalizedWeakestDimension === "evidence") {
        return {
          title: "Evidence weakness detected",
          message: "This verification result not externally valid due to insufficient supporting evidence.",
          actions: [
            "Strengthen supporting signals and proof artifacts before external use."
          ],
          alternatives: [
            {
              label: "Use internally only",
              detail:
                "Lower risk but limited external value. Suitable for internal coordination while evidence is still incomplete.",
            },
            {
              label: "Rebuild from receipt",
              detail:
                "Moderate effort, with stronger proof quality. Best when evidence gaps can be fixed without rerunning upstream capture.",
            },
          ],
        };
      }

      if (normalizedWeakestDimension === "boundary") {
        return {
          title: "Boundary weakness detected",
          message: "This verification result internally reviewable but unstable because role or responsibility boundaries are not structurally clear.",
          actions: [
            "Re-establish one clear boundary of role, ownership, or approval before relying on this proof."
          ],
          alternatives: [
            {
              label: "Use internally only",
              detail:
                "Lower external risk, but leaves boundary ambiguity unresolved. Suitable only for temporary internal review.",
            },
            {
              label: "Rebuild from receipt",
             detail:
                "Moderate effort, but restores boundary clarity faster than restarting the full pilot.",
            },
          ],
        };
      }

      if (normalizedWeakestDimension === "coordination") {
        return {
          title: "Coordination weakness detected",
          message: "This proof may drift in execution because coordination is too weak to keep the record stable.",
          actions: [
            "Assign one owner and one next structural step before relying on this proof."
          ],
          alternatives: [
            {
              label: "Pause external use",
              detail:
                "Lowest external risk, but delays downstream action while coordination remains unstable.",
            },
            {
              label: "Rebuild from receipt",
              detail:
                "Moderate effort, with stronger structural stability once coordination is tightened.",
            },
          ],
        };
      }
    }

    const primaryAction = (() => {
      if (!weakestCheck) return "Strengthen the weakest part before sharing.";
      if (weakestCheck.label === "Structure completeness") {
        return "Fill the missing structural fields before sharing this record.";
      }
      if (weakestCheck.label === "Consistency") {
        return "Align scenario, stage, and RUN so the record describes one coherent path.";
      }
      if (weakestCheck.label === "Continuity") {
        return "Link the case context more clearly to the RUN path so the record is continuous.";
      }
     if (weakestCheck.label === "Evidence support") {
        return "Add supporting signals or proof so the record can be audited.";
      }
      return "Strengthen the weakest part before sharing.";
    })();

    return {
      title: "Formal verification not yet issuable",
      message:
        "This record can be reviewed internally, but is not strong enough for external use.",
      actions: [primaryAction],
      alternatives: [
        {
          label: "Use internally only",
          detail:
            "Lower external risk, but limited external value. Useful while the weakest structural area is still being repaired.",
        },
        {
          label: "Rebuild from receipt",
          detail:
            "Moderate effort, but usually the fastest way to improve external readiness without restarting the full pilot.",
        },
      ],
    };
  }

  if (status === "Verification Failed") {
    const normalizedWeakestDimension = String(weakestDimension || "").toLowerCase();

    if (normalizedWeakestDimension === "authority") {
      return {
        title: "Decisive failure condition: Authority validation not satisfied",
        message: "A formal negative determination has been issued because decision authority remains unresolved under the current baseline.",
        actions: [
          "Establish and document clear approval authority, override authority, and final decision ownership before re-submission."
        ],
        alternatives: [
          {
            label: "Rebuild from pilot",
            detail:
              "Higher cost, but restores authority alignment from the source. Best when ambiguity began before receipt formation.",
          },
          {
            label: "Pause external use",
            detail:
              "Lowest external risk, but delays external decision impact until authority is fully resolved.",
          },
        ],
      };
    }

    if (normalizedWeakestDimension === "evidence") {
      return {
        title: "Evidence failure detected",
        message: "This verification result not externally valid due to weakness in supporting evidence.",
        actions: [
          "Add stronger supporting signals, proof artifacts, or traceable evidence before reissuing this proof.",
        ],
        alternatives: [
          {
            label: "Rebuild from pilot",
            detail:
              "Higher cost, but restores full structural integrity. Requires re-capturing evidence from upstream events.",
          },
          {
            label: "Pause external use",
            detail:
              "Lowest external risk, but no external decision value until traceable evidence is attached.",
          },
        ],
      };
    }

    if (normalizedWeakestDimension === "boundary") {
      return {
        title: "Continuity failure detected",
        message: "This proof cannot support reliable review because the structural path is broken.",
        actions: [
          "Reconnect the case context, scenario, stage, and RUN path before reissuing this proof."
        ],
        alternatives: [
          {
            label: "Rebuild from receipt",
            detail:
              "Moderate effort, and faster recovery if the break happened during structure aggregation rather than upstream capture.",
          },
          {
            label: "Rebuild from pilot",
            detail:
              "Higher cost, but restores end-to-end continuity when the break began before receipt generation.",
          },
        ],
      };
    }
  
    if (normalizedWeakestDimension === "coordination") {
      return {
        title: "Pressure failure detected",
        message: "This verification result not reliable because external pressure is distorting the structural record.",
        actions: [
          "Stabilize the record against pressure-driven distortion before relying on this proof."
        ],
        alternatives: [
          {
            label: "Pause external use",
            detail:
              "Lowest external risk, but delays momentum until pressure distortion is reduced.",
          },
          {
            label: "Rebuild from pilot",
            detail:
              "Higher cost, but restores cleaner structural capture if distortion began during live event intake.",
          },
        ],
      };
    }

    return {
      title: "Formal verification cannot be issued",
      message:
        "This record cannot support reliable review. The issue is structural, not formatting.",
      actions: [
        "Return to the receipt or pilot stage and rebuild the record.",
        "Add complete case context with scenario, stage, and RUN alignment.",
        "Ensure at least one structured event with evidence support.",
      ],
      alternatives: [
        {
          label: "Rebuild from receipt",
          detail:
            "Moderate effort, with faster recovery when the structure is mostly intact but needs reassembly.",
        },
        {
          label: "Rebuild from pilot",
          detail:
            "Higher cost, but restores the strongest integrity when structural failure began before receipt formation.",
        },
      ],
    };
  }

    return null;
  }

function getVerificationVerdictLine({ overallStatus, weakestDimension = "" }) {
  const normalizedWeakestDimension = String(weakestDimension || "").trim();
  const raw = normalizedWeakestDimension || "structural condition";
  const dimensionLabel = raw.charAt(0).toUpperCase() + raw.slice(1);

  if (overallStatus === "Verification Ready") {
    return "Formal verification is issuable under the current record.";
  }

  if (overallStatus === "Verification Warning") {
    return `Formal verification is not yet issuable. One structural condition remains weak: ${dimensionLabel}.`;
  }

  return `Formal negative determination issued. This record is not issuable for formal verification under the current baseline. Decisive failure condition: ${dimensionLabel}.`;
}

function getConsistencyCheckFromData(data = {}) {
  const conflicts = [];

  const weakestDimension = String(
    data?.weakestDimension ||
      data?.caseData?.weakestDimension ||
      ""
  ).toLowerCase();

  const hasReceiptHash = !!data?.receiptHash;

  const structureScore =
    typeof data?.structureScoreFromCase === "number"
      ? data.structureScoreFromCase
      : typeof data?.caseData?.structureScore === "number"
      ? data.caseData.structureScore
      : null;

  const routeDecision = String(
    data?.routeDecisionFromCase ||
      data?.caseData?.routeDecision ||
      ""
  ).toLowerCase();

  const groundingStatus = String(
    data?.behavioralGroundingSummary?.groundingStatus || ""
  ).toLowerCase();

  if (weakestDimension === "authority" && routeDecision.includes("verification")) {
    conflicts.push({
      code: "authority_action_mismatch",
      label: "Authority does not yet support the current verification scope.",
      severity: "high",
      fix: "Clarify decision authority or reduce the current action scope before re-submission.",
    });
  }

  if (weakestDimension === "evidence" && !hasReceiptHash) {
    conflicts.push({
      code: "evidence_chain_gap",
      label: "Evidence support is not strong enough for formal verification.",
      severity: "high",
      fix: "Add one traceable proof item or restore the missing receipt proof chain.",
    });
  }

  if (
    structureScore !== null &&
    structureScore < 3 &&
    routeDecision.includes("verification")
  ) {
    conflicts.push({
      code: "structure_outcome_gap",
      label: "The current structural baseline is too weak for the requested verification outcome.",
      severity: "medium",
      fix: "Repair the weakest structural segment before requesting formal verification again.",
    });
  }

  if (
    groundingStatus &&
    groundingStatus !== "grounded" &&
    groundingStatus !== "passed"
  ) {
    conflicts.push({
      code: "behavioral_grounding_gap",
      label: "Behavioral grounding is not yet stable enough to support this record.",
      severity: "medium",
      fix: "Add one real behavioral event or grounding signal before re-running verification.",
    });
  }

  return {
    passed: conflicts.length === 0,
    conflicts,
    minimalRepair: conflicts[0]
      ? {
          code: conflicts[0].code,
          label: conflicts[0].label,
          action: conflicts[0].fix,
        }
      : null,
  };
}

function getConsistencyRepairCardData({
  consistencyCheck,
  isEvidenceLockedConsistent = true,
}) {
  if (!isEvidenceLockedConsistent) {
    return {
      title: "Structural consistency repair",
      intro:
        "A narrow structural repair is required before this record can be re-submitted for formal verification.",
      conflicts: [
        {
          code: "evidence_lock_broken",
          label: "The current verification view is no longer aligned with the issued receipt chain.",
          fix: "Return to the receipt and restore the correct proof chain.",
        },
      ],
      minimalRepair: {
        code: "evidence_lock_broken",
        label: "Restore receipt-proof alignment",
        action: "Return to the receipt and restore the correct proof chain.",
      },
    };
  }

  if (!consistencyCheck || consistencyCheck.passed) {
    return null;
  }

  return {
    title: "Structural consistency repair",
    intro:
      "A narrow structural repair is required before this record can be re-submitted for formal verification.",
    conflicts: consistencyCheck.conflicts || [],
    minimalRepair: consistencyCheck.minimalRepair || null,
  };
}

function getMinimalInterventionPoint({
  status,
  weakestDimension = "",
  checks = [],
  isEvidenceLockedConsistent = true,
  consistencyRepairCard = null,
}) {
  if (
    consistencyRepairCard?.minimalRepair &&
    isEvidenceLockedConsistent
  ) {
    return {
      title: "Minimal intervention point",
      action: consistencyRepairCard.minimalRepair.action,
      note: "Repair the narrowest structural inconsistency first before changing anything else.",
    };
  }

  if (!isEvidenceLockedConsistent) {
    return {
      title: "Minimal intervention point",
      action: "Return to the receipt and restore the correct proof chain.",
      note: "This failure is caused by a broken evidence lock, not by the structure itself.",
    };
  }

  const normalizedWeakestDimension = String(weakestDimension || "").toLowerCase();

  if (status === "Verification Ready") {
    return {
      title: "Smallest next action",
      action: "Preserve this proof path and use the formal version only when this decision needs to travel outside the workspace.",
      note: "No structural repair is required. The next step is operational, not corrective.",
    };
  }

  if (status === "Verification Failed") {
    return {
      title: "Minimum repair required for re-submission",
      action: "Return to the last valid structural stage and repair only the broken segment.",
      note: "This is a formal failure condition. Forward optimization is not sufficient. Repair backward from the break point before re-submission.",
    };
  }

  if (normalizedWeakestDimension === "evidence") {
    return {
      title: "Minimal intervention point",
      action: "Add one traceable evidence item to the current record before re-running verification.",
      note: "A single proof-strengthening move is more valuable than rewriting the whole record.",
    };
  }

  if (normalizedWeakestDimension === "boundary") {
    return {
      title: "Minimal intervention point",
      action: "Re-establish one clear role or approval boundary before re-running verification.",
      note: "Repair the structural edge first, then check whether the proof stabilizes.",
    };
  }

  if (normalizedWeakestDimension === "coordination") {
    return {
      title: "Minimal intervention point",
      action: "Assign one owner and one next structural step before re-running verification.",
      note: "Tighten coordination first so the proof stops drifting.",
    };
  }

  const weakChecks = checks.filter(
    (c) => c.status === "warning" || c.status === "failed"
  );

  const weakestCheck = weakChecks[0];

  if (weakestCheck?.label === "Structure completeness") {
    return {
      title: "Minimal intervention point",
      action: "Fill one missing structural field before re-running verification.",
      note: "Do the smallest structural completion first.",
    };
  }

  if (weakestCheck?.label === "Consistency") {
    return {
      title: "Minimal intervention point",
      action: "Align scenario, stage, and RUN into one coherent path before re-running verification.",
      note: "Fix alignment before adding more material.",
    };
  }

  if (weakestCheck?.label === "Continuity") {
    return {
      title: "Minimal intervention point",
      action: "Reconnect one broken case-to-RUN path before re-running verification.",
      note: "Repair the path, not the wording.",
    };
  }

  if (weakestCheck?.label === "Evidence support") {
    return {
      title: "Minimal intervention point",
      action: "Add one supporting signal or proof artifact before re-running verification.",
      note: "A small evidence repair is enough to test whether the result moves out of failed status.",
    };
  }

  return {
    title: "Minimal intervention point",
    action: "Make one smaller structural correction before re-running verification.",
    note: "Keep the repair narrow. The goal is to move the result, not rewrite everything.",
  };
}

function CalibrationCard({
  guidance,
  status,
  weakestDimension,
  checks = [],
  isEvidenceLockedConsistent,
  consistencyRepairCard = null,
}) {
  const [showAlternatives, setShowAlternatives] = useState(false);

  if (!guidance) return null;

  const alternatives = Array.isArray(guidance.alternatives)
    ? guidance.alternatives
    : [];

  const minimalIntervention = getMinimalInterventionPoint({
    status,
    weakestDimension,
    checks,
    isEvidenceLockedConsistent,
    consistencyRepairCard,
  });

  return (
    <section className="mt-4 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <h2 className="text-lg font-semibold mb-2">
        {status === "Verification Failed" ? "Required remediation order" : guidance.title}
      </h2>

      <p className="text-slate-700 mb-4">{guidance.message}</p>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold text-slate-900 mb-3">
          {status === "Verification Failed" ? "Required remediation" : "Main recommendation"}
        </p>

        <ul className="list-disc pl-5 space-y-2 text-xs text-slate-700">
          {guidance.actions.map((action, index) => (
            <li key={index}>{action}</li>
          ))}
        </ul>
      </div>

      {minimalIntervention && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-semibold text-amber-900 mb-2">
            {minimalIntervention.title}
          </p>

          <p className="text-xs font-semibold text-slate-900 leading-6">
            {minimalIntervention.action}
          </p>

          <p className="mt-2 text-xs text-amber-800 leading-6">
            {minimalIntervention.note}
          </p>
        </div>
      )}

      {alternatives.length > 0 && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowAlternatives((prev) => !prev)}
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 transition hover:bg-slate-100"
          >
            {showAlternatives ? "Hide alternative paths" : "Show alternative paths"}
          </button>

          {showAlternatives && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-900 mb-3">
                Alternative paths
              </p>

              <div className="space-y-3">
                {alternatives.map((item, index) => (
                  <div
                    key={`${item.label}-${index}`}
                    className="rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <p className="font-semibold text-slate-900 mb-1">
                      {item.label}
                    </p>
                    <p className="text-xs text-slate-700 leading-6">
                      {item.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function StatusCircleIcon({ status }) {
  const stroke =
    status === "Verification Ready"
      ? "#047857"
      : status === "Verification Warning"
      ? "#B45309"
      : "#C2410C";

  return (
    <svg width="18" height="18" viewBox="0 0 34 34" aria-hidden="true">
      <circle cx="17" cy="17" r="14" fill="#FFFFFF" stroke={stroke} strokeWidth="2.5" />
      {status === "Verification Ready" ? (
        <path
          d="M11 17.5l4 4 8-9"
          fill="none"
          stroke={stroke}
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : status === "Verification Warning" ? (
        <>
          <path
            d="M17 9.5v9"
            fill="none"
            stroke={stroke}
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <circle cx="17" cy="23.5" r="1.7" fill={stroke} />
        </>
      ) : (
        <>
          <path
            d="M13 13l8 8"
            fill="none"
            stroke={stroke}
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <path
            d="M21 13l-8 8"
            fill="none"
            stroke={stroke}
            strokeWidth="2.6"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}

function StatusShieldIcon({ status }) {
  const color =
    status === "Verification Ready"
      ? "#047857"
      : status === "Verification Warning"
      ? "#B45309"
      : "#C2410C";

  return (
    <svg width="40" height="50" viewBox="0 0 44 52" aria-hidden="true">
      <path
        d="M22 4L36 9V22c0 9.5-6.2 17.3-14 21C14.2 39.3 8 31.5 8 22V9l14-5z"
        fill={color}
        stroke={color}
        strokeWidth="2.8"
        strokeLinejoin="round"
      />
      {status === "Verification Ready" ? (
        <path
          d="M16.5 24.5l4.2 4.2 7.8-8.7"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : status === "Verification Warning" ? (
        <>
          <path
            d="M22 15.5v10"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          <circle cx="22" cy="30.5" r="1.9" fill="#FFFFFF" />
        </>
      ) : (
        <>
          <path
            d="M17 18l10 10"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          <path
            d="M27 18L17 28"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}

export default function VerificationPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const verificationViewedLoggedRef = React.useRef(false);
  const verificationResultLoggedRef = React.useRef(false);
  const recoverySectionRef = React.useRef(null);

  const pcMeta = location.state?.pcMeta || {
    pc_id: "PC-001",
    pc_name: "Decision Risk Diagnostic",
  };

  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showRecoveryPanel, setShowRecoveryPanel] = useState(false);
  const [verificationHashCopied, setVerificationHashCopied] = useState(false);
  const [receiptHashCopied, setReceiptHashCopied] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [caseBillingOverride, setCaseBillingOverride] = useState(null);
  const [receiptLedgerRecord, setReceiptLedgerRecord] = useState(null);
  const [receiptLedgerLoading, setReceiptLedgerLoading] = useState(false);
  const [receiptLedgerError, setReceiptLedgerError] = useState(null);

  const routeEnvelope = location.state || null;
  const routeDecision = routeEnvelope?.routeDecision || null;
  const receiptSource = routeEnvelope?.receiptSource || "";
  const rawReceiptMode = routeDecision?.mode || "";

  const receiptMode =
    rawReceiptMode === "case_receipt" || rawReceiptMode === "final_receipt"
      ? rawReceiptMode
      : receiptSource === "pilot_weekly_summary"
      ? "final_receipt"
      : "case_receipt";

  const routeData = routeEnvelope?.verificationPageData || null;
  const storedData = getStoredVerificationData();
  const receiptContext = routeEnvelope?.receiptPageData || null;
  const sharedContract =
    routeEnvelope?.sharedReceiptVerificationContract ||
    getStoredSharedReceiptVerificationContract() ||
    null;
  const evidenceLock = routeEnvelope?.evidenceLock || null;

  const summaryBufferFromRoute = location.state?.summaryBuffer || null;

  const inferredCaseId =
    resolveCaseId({
      caseId:
        location.state?.caseId ||
        location.state?.case_id ||
        location.state?.caseData?.caseId ||
        location.state?.caseData?.id ||
        receiptContext?.caseData?.caseId ||
        receiptContext?.caseData?.id ||
        getCurrentCaseId() ||
        "",
    });
  const caseId = inferredCaseId;

  React.useEffect(() => {
    let cancelled = false;

    async function loadReceiptLedgerForVerification() {
      if (!caseId) return;

      setReceiptLedgerLoading(true);
      setReceiptLedgerError(null);

      try {
        const record = await fetchReceiptLedgerRecord(caseId);

        if (cancelled) return;

        if (record) {
          setReceiptLedgerRecord(record);
        }
      } catch (error) {
        if (!cancelled) {
          console.warn("[verification receipt ledger read failed]", error);
          setReceiptLedgerError(error);
        }
      } finally {
        if (!cancelled) {
          setReceiptLedgerLoading(false);
        }
      }
    }

    loadReceiptLedgerForVerification();

    return () => {
      cancelled = true;
    };
  }, [caseId]);

  const summaryBufferFromStorage =
    !summaryBufferFromRoute ? readSummaryBuffer(inferredCaseId) : null;

  let currentCase = null;

  try {
    currentCase = inferredCaseId ? getCaseById(inferredCaseId) : null;
  } catch (error) {
    console.warn("Failed to read case registry for verification gate", error);
  }

  const verificationFlat =
    sharedContract
      ? flattenSharedReceiptVerificationContract(sharedContract)
      : {};

  const accessMode = getAccessMode(
    verificationFlat?.caseData || receiptContext?.caseData || currentCase
  );
  const isPaid = accessMode === "paid";

  const activeCaseBilling = caseBillingOverride || currentCase?.caseBilling || {};
  const verificationActivated =
    activeCaseBilling?.verificationActivated === true ||
    currentCase?.payment?.verificationActivated === true ||
    currentCase?.isPaid === true;
  const deterministicScoreSource = {
    ...(currentCase ||
      receiptContext?.caseData ||
      verificationFlat?.caseData ||
      routeData?.caseData ||
      storedData?.caseData ||
      {}),
    caseId:
      inferredCaseId ||
      currentCase?.caseId ||
      receiptContext?.caseData?.caseId ||
      verificationFlat?.caseData?.caseId ||
      routeData?.caseData?.caseId ||
      storedData?.caseData?.caseId ||
      "",
    events:
      Array.isArray(currentCase?.events) && currentCase.events.length > 0
        ? currentCase.events
        : Array.isArray(verificationFlat?.eventTimeline) && verificationFlat.eventTimeline.length > 0
        ? verificationFlat.eventTimeline
        : Array.isArray(receiptContext?.eventTimeline) && receiptContext.eventTimeline.length > 0
        ? receiptContext.eventTimeline
        : [],
    capturedEvents:
      Array.isArray(currentCase?.events) && currentCase.events.length > 0
        ? currentCase.events
        : Array.isArray(verificationFlat?.eventTimeline) && verificationFlat.eventTimeline.length > 0
        ? verificationFlat.eventTimeline
        : Array.isArray(receiptContext?.eventTimeline) && receiptContext.eventTimeline.length > 0
        ? receiptContext.eventTimeline
        : [],
    entries:
      Array.isArray(currentCase?.events) && currentCase.events.length > 0
        ? currentCase.events
        : Array.isArray(verificationFlat?.eventTimeline) && verificationFlat.eventTimeline.length > 0
        ? verificationFlat.eventTimeline
        : Array.isArray(receiptContext?.eventTimeline) && receiptContext.eventTimeline.length > 0
        ? receiptContext.eventTimeline
        : [],
    scopeLock:
      currentCase?.scopeLock ||
      receiptContext?.caseData?.scopeLock ||
      verificationFlat?.caseData?.scopeLock ||
      routeData?.caseData?.scopeLock ||
      storedData?.caseData?.scopeLock ||
      {},
    scope:
      currentCase?.scope ||
      receiptContext?.caseData?.scope ||
      verificationFlat?.caseData?.scope ||
      routeData?.caseData?.scope ||
      storedData?.caseData?.scope ||
      {},
    acceptanceChecklist:
      currentCase?.acceptanceChecklist ||
      receiptContext?.caseData?.acceptanceChecklist ||
      verificationFlat?.caseData?.acceptanceChecklist ||
      routeData?.caseData?.acceptanceChecklist ||
      storedData?.caseData?.acceptanceChecklist ||
      {},
    checklist:
      currentCase?.checklist ||
      receiptContext?.caseData?.checklist ||
      verificationFlat?.caseData?.checklist ||
      routeData?.caseData?.checklist ||
      storedData?.caseData?.checklist ||
      {},
  };
  {
    const scoringSource = deterministicScoreSource;
    console.log("[SCORE_INPUT_SOURCE]", {
      page: "VerificationPage",
      caseId: inferredCaseId,
      sourceKeys: scoringSource ? Object.keys(scoringSource) : [],
      source: scoringSource,
    });
  }
  const deterministicScore = calculateDeterministicScore(
    deterministicScoreSource
  );

  console.log("[DETERMINISTIC_SCORE]", {
    page: "VerificationPage",
    caseId: inferredCaseId,
    score: deterministicScore,
    eventCount: deterministicScore.eventCount,
  });

  const access = resolveAccessMode({
    ...(currentCase || {}),
    ...(receiptContext?.caseData || {}),
    ...(verificationFlat?.caseData || {}),
    normalizedScore: deterministicScore.totalScore,
    score: deterministicScore.totalScore,
    eventCount: deterministicScore.eventCount,
    events: deterministicScore.events,
    receiptPaid:
      activeCaseBilling?.receiptActivated === true ||
      currentCase?.payment?.receiptActivated === true ||
      currentCase?.payment?.receiptPaid === true ||
      currentCase?.isPaid === true,
    verificationPaid:
      verificationActivated ||
      currentCase?.payment?.verificationPaid === true,
  });
  const formalWorkspaceCopy = verificationActivated
    ? {
        modalTitle: "Formal workspace active",
        workspaceTitle: "Active workspace",
        workspaceCta: "Continue workspace",
        receiptCta: "Open formal workspace",
        verificationCta: "Open formal workspace",
      }
    : {
        modalTitle: "Preview access",
        workspaceTitle: "Free workspace preview",
        workspaceCta: "Start workspace preview",
        receiptCta: "Activate formal workspace",
        verificationCta: "Activate formal workspace",
      };

  const currentCaseEvents = Array.isArray(currentCase?.events)
    ? currentCase.events
    : [];

  const submittedEvents = currentCaseEvents.length;

  const decisionPathEvents = currentCaseEvents.length;

  const hasEventBackedBaseline =
    Number(submittedEvents || 0) > 0 ||
    Number(decisionPathEvents || 0) > 0;

  const activeSummaryBuffer =
    summaryBufferFromRoute ||
    summaryBufferFromStorage ||
    null;

  const ledgerReceiptHash = getReceiptLedgerRecordHash(receiptLedgerRecord);
  const hasLedgerReceipt = Boolean(ledgerReceiptHash);
  const receiptSourceData =
    receiptLedgerRecord?.data ||
    receiptLedgerRecord?.payload ||
    receiptContext ||
    {};
  const receiptBackedContext = receiptLedgerRecord
    ? {
        ...(receiptContext || {}),
        ...(receiptSourceData || {}),
        receiptHash:
          ledgerReceiptHash ||
          receiptSourceData?.receiptHash ||
          receiptContext?.receiptHash ||
          "",
        caseData:
          receiptSourceData?.caseData ||
          receiptContext?.caseData ||
          currentCase ||
          null,
      }
    : receiptContext;

  const receiptDecisionStatus = receiptContext?.decisionStatus || "";

const receiptAllowsVerification =
  deterministicScore.receiptEligible ||
  access.verificationEligible ||
  currentCase?.receipt?.eligible === true ||
  receiptDecisionStatus === "Eligible for Verification" ||
  receiptDecisionStatus === "READY FOR FORMAL DETERMINATION" ||
  receiptDecisionStatus === "Verified";

  const cameFromIssuedReceipt =
    caseId ||
    receiptLedgerLoading ||
    hasLedgerReceipt ||
    !!currentCase?.receipt ||
    !!receiptContext ||
    !!routeEnvelope?.receiptPageData ||
    !!routeEnvelope?.sharedReceiptVerificationContract ||
    !!sharedContract;
    if (!cameFromIssuedReceipt || !receiptAllowsVerification) {
  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-900 px-6 py-10">
      <div className="max-w-3xl mx-auto">
        <TopRightCasesCapsule />
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <p className="text-xs font-medium text-slate-400 mb-2">
            Verification not available
          </p>
          <h1 className="text-2xl font-bold mb-3">
            This receipt has not been issued for verification
          </h1>
          <p className="text-slate-700 leading-7">
            Verification can only be opened from an issued receipt that is eligible for verification.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to={ROUTES.RECEIPT}
              state={routeEnvelope || {}}
              className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2 text-sm font-semibold text-black border border-black shadow-sm hover:bg-white hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
            >
              Back to Receipt
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

  if (!hasEventBackedBaseline) {
    return (
      <div className="relative min-h-screen bg-slate-50 text-slate-900 px-6 py-10">
        <div className="max-w-3xl mx-auto">
          <TopRightCasesCapsule />
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <p className="text-xs font-medium text-slate-400 mb-2">
              Verification blocked
            </p>
            <h1 className="text-2xl font-bold mb-3">
              Verification not activated
            </h1>
            <p className="text-slate-700 leading-7">
              This record has no event-backed baseline yet. Capture at least one real event before requesting formal verification.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  navigate(ROUTES.RECEIPT, {
                    state: {
                      ...(routeEnvelope || {}),
                      openQuickCapture: true,
                      quickCaptureIntent: "first_event_from_verification",
                      returnToVerification: true,
                      returnToVerificationState: routeEnvelope || {},
                    },
                  })
                }
                className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-[12px] font-medium text-white shadow-sm transition hover:bg-slate-800"
              >
                Capture first event
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const resolvedPayload = resolveVerificationPayload(
    routeEnvelope || {},
    receiptBackedContext,
    routeData,
    storedData,
    sharedContract
  );

  const baseData = normalizeVerificationData(
    resolvedPayload,
    activeSummaryBuffer
  );

  const evaluated = evaluateCaseRecordStatus({
    ...baseData,
    ...verificationFlat,
  });

  const receiptLevelStructurePass =
    receiptDecisionStatus === "Eligible for Verification" ||
    receiptDecisionStatus === "Verified";

  const hasUsableCaseData =
    !!(
      resolvedPayload?.schema ||
      baseData?.caseData ||
      verificationFlat?.caseData ||
      receiptContext?.caseData
    );

  const shouldPromoteVerificationReady =
    receiptLevelStructurePass &&
    hasUsableCaseData;

  const hasVerificationPayload =
    !!(
      (verificationFlat?.receiptId || baseData?.receiptId) &&
      (verificationFlat?.receiptHash || baseData?.receiptHash) &&
      (verificationFlat?.caseData || baseData?.caseData || resolvedPayload?.schema)
    );
   
  const behavioralGroundingCheck = hasVerificationPayload
    ? evaluated.checks.find((check) => check.label === "Behavioral grounding") || null
    : null;

  const data = {
    ...baseData,
    ...verificationFlat,
    receiptHash:
      ledgerReceiptHash ||
      verificationFlat.receiptHash ||
      baseData.receiptHash ||
      resolvedPayload.receiptHash ||
      "",
    caseData: verificationFlat.caseData || baseData.caseData || resolvedPayload.schema || null,
    weakestDimension:
      shouldPromoteVerificationReady &&
      evaluated.verificationStatus === "Verification Failed"
        ? ""
        : verificationFlat.weakestDimension || baseData.weakestDimension || "",

    displayContext:
      activeSummaryBuffer?.displayContext ||
      activeSummaryBuffer?.summaryContext ||
      baseData.displayContext ||
      getCaseSummary(verificationFlat) ||
      getCaseContext(verificationFlat),
    overallStatus:
      hasVerificationPayload && verificationFlat?.resolvedVerificationEligible
        ? "Verification Ready"
        : hasVerificationPayload
        ? access.verificationEligible
          ? "Verification Ready"
          : evaluated.verificationStatus
        : "Verification Warning",
    checks: hasVerificationPayload
      ? evaluated.checks
      : [
          {
            label: "Continuity",
            status: "warning",
            detail: "No live receipt payload is attached, so the continuous path from case context to RUN record cannot be fully confirmed.",
          },
          {
            label: "Consistency",
            status: "warning",
            detail: "Scenario, stage, and RUN alignment cannot be fully confirmed without a live receipt payload.",
          },
          {
            label: "Structure completeness",
            status: "warning",
            detail: "The current verification view is missing part of the structural record.",
          },
          {
            label: "Evidence support",
            status: "warning",
            detail: "Supporting signals, RUN evidence, or receipt proof are incomplete in this preview state.",
          },
          {
            label: "Behavioral grounding",
            status: "warning",
            detail: "Behavioral grounding cannot be confirmed until a live receipt payload is loaded.",
          },
        ],
    eventTimeline: hasVerificationPayload
      ? baseData.eventTimeline
      : [
          {
            time: "Step 1",
            title: "Preview opened",
            detail: "Verification was opened directly without a live receipt payload.",
          },
          {
            time: "Step 2",
            title: "Awaiting receipt context",
            detail: "Scenario, stage, RUN, and case details will appear once this page is opened from Receipt.",
          },
          {
            time: "Step 3",
            title: "Ready for live verification",
            detail: "Return to the recorded flow to load a live verification record.",
          },
    ],
  };

  const caseData = data.caseData || null;
  const verificationCaseSummary =
    receiptLedgerRecord?.payload?.workspace_summary ||
    receiptLedgerRecord?.payload?.workspaceSummary ||
    receiptLedgerRecord?.payload?.baselineSummary ||
    receiptLedgerRecord?.data?.workspace_summary ||
    receiptLedgerRecord?.data?.workspaceSummary ||
    receiptLedgerRecord?.data?.baselineSummary ||
    currentCase?.workspace_summary ||
    currentCase?.workspaceSummary ||
    caseData?.workspace_summary ||
    caseData?.workspaceSummary ||
    null;

  const verificationEventCount =
    Number(
      verificationCaseSummary?.eventCount ??
        verificationCaseSummary?.events?.length ??
        receiptLedgerRecord?.payload?.eventCount ??
        receiptLedgerRecord?.data?.eventCount ??
        currentCase?.events?.length ??
        caseData?.events?.length ??
        0
    );

  const hasVerificationSummary = Boolean(verificationCaseSummary);

const isEvidenceLockedConsistent =
  !evidenceLock
    ? true
    : (
        evidenceLock.receiptId &&
        data.receiptId &&
        evidenceLock.receiptHash &&
        data.receiptHash &&
        evidenceLock.receiptId === data.receiptId &&
        evidenceLock.receiptHash === data.receiptHash &&
        evidenceLock.receiptSource === receiptSource &&
        evidenceLock.receiptMode === receiptMode
      );

const consistencyCheck = verificationFlat?.consistencyCheck || {
  passed: true,
  conflicts: [],
  minimalRepair: null,
};

const finalOverallStatus =
  verificationFlat?.resolvedVerificationEligible === true
    ? "Verification Ready"
    : hasVerificationPayload
    ? "Verification Warning"
    : "Verification Failed";

const consistencyRepairCard = getConsistencyRepairCardData({
  consistencyCheck,
  isEvidenceLockedConsistent,
});

  const guidance = !isEvidenceLockedConsistent
    ? {
        title: "Evidence lock broken",
        message:
          "This verification view is no longer aligned with the issued receipt chain. Return to the receipt layer before taking any further action.",
        actions: [
          "Return to the receipt and confirm the current proof chain before continuing."
        ],
        alternatives: [
          {
            label: "Back to receipt",
            detail:
              "Lowest recovery cost. Best when the issued receipt is still the correct source of truth.",
          },
          {
            label: "Rebuild from pilot",
            detail:
              "Higher effort, but necessary if the receipt no longer reflects the current structural record.",
          },
        ],
      }
    : getCalibrationGuidance({
        status: finalOverallStatus,
        checks: data.checks,
        weakestDimension: data.weakestDimension,
      });

  const safeReceiptId = String(data.receiptId || "NO-RECEIPT").replace(/[^a-zA-Z0-9]/g, "");

  const proofRecordId = data.proofRecordId || ("LBP-" + safeReceiptId);

  const anchorStatus =
    data.anchorStatus || "Anchored";

  const anchoredAt =
    data.anchoredAt ||
    data.verifiedAt ||
    "Not recorded yet";

  const proofReceiptHash =
    getStableHashValue(ledgerReceiptHash) ||
    (!caseId ? getStableHashValue(data.receiptHash) : "") ||
    "Unavailable";

  const resolvedVerificationCaseId =
    resolveCaseId({
      caseId:
        location.state?.caseId ||
        location.state?.case_id ||
        location.state?.caseData?.caseId ||
        location.state?.caseData?.id ||
        data.caseData?.caseId ||
        data.caseData?.id ||
        getCurrentCaseId() ||
        "",
    });

  const handleActivateVerificationForCase = () => {
    const caseIdToActivate = resolvedVerificationCaseId || inferredCaseId;
    if (!caseIdToActivate) return;

    const nextCaseBilling = {
      ...activeCaseBilling,
      receiptActivated: activeCaseBilling?.receiptActivated === true,
      verificationActivated: true,
      activatedAt: new Date().toISOString(),
      source: "local_test",
    };

    try {
      upsertCase({
        caseId: caseIdToActivate,
        caseBilling: nextCaseBilling,
      });
      setCaseBillingOverride(nextCaseBilling);
    } catch (error) {
      console.warn("Failed to activate verification for case", error);
    }
  };

  let persistedCaseVerificationHash = "";

  try {
    persistedCaseVerificationHash = resolvedVerificationCaseId
      ? getCaseById(resolvedVerificationCaseId)?.verification?.verificationHash ||
        getCaseById(resolvedVerificationCaseId)?.verificationHash ||
        ""
      : "";
  } catch (error) {
    console.warn("Failed to read verification hash from case registry:", error);
  }

  const persistedVerificationHash =
    getStableHashValue(persistedCaseVerificationHash) ||
    getStableHashValue(data.verificationHash) ||
    getStoredStableHash(
      resolvedVerificationCaseId || proofReceiptHash
        ? `verificationHash:${resolvedVerificationCaseId || proofReceiptHash}:${proofReceiptHash || "no-receipt"}`
        : ""
    );

  const generatedVerificationHash = generateVerificationHash({
    receiptHash: proofReceiptHash,
    overallStatus: finalOverallStatus,
    weakestDimension: data.weakestDimension,
    checks: data.checks,
  });

  const verificationHash =
    persistedVerificationHash || generatedVerificationHash;

  React.useEffect(() => {
    saveStoredVerificationHash(
      resolvedVerificationCaseId,
      proofReceiptHash,
      verificationHash
    );
    try {
      if (
        resolvedVerificationCaseId &&
        !currentCase?.verification?.verificationHash
      ) {
        upsertCase({
          caseId: resolvedVerificationCaseId,
          verification: {
            eligible: verificationFlat?.resolvedVerificationEligible === true,
            verifiedAt: new Date().toISOString(),
            verificationHash,
          },
        });
      }
    } catch (error) {
      console.warn("Failed to persist verification on case", error);
    }
  }, [resolvedVerificationCaseId, proofReceiptHash, verificationHash]);

  const displayReceiptHash =
    proofReceiptHash && proofReceiptHash !== "Unavailable"
      ? `${proofReceiptHash.slice(0, 10)}闁?{proofReceiptHash.slice(-6)}`
      : proofReceiptHash;

  const hasReceiptHash = hasVerificationPayload
    ? Boolean(ledgerReceiptHash) && (evaluated.hasReceiptHash || Boolean(data.receiptHash))
    : false;
  const hasCompleteStructure = hasVerificationPayload ? evaluated.hasCompleteStructure : false;

  const verdictLine = getVerificationVerdictLine({
    overallStatus: finalOverallStatus,
    weakestDimension: data.weakestDimension || data.caseData?.weakestDimension || "",
  });

  const auditReady =
    hasVerificationPayload &&
    isEvidenceLockedConsistent &&
    finalOverallStatus === "Verification Ready";

  const scopeLock = {
    status:
      isEvidenceLockedConsistent &&
      hasVerificationPayload &&
      finalOverallStatus !== "Verification Failed"
        ? "Locked"
        : "Open",
    receiptMode,
    receiptSource,
    receiptId: data.receiptId || "No live receipt attached",
    receiptHashReady: !!hasReceiptHash,
    structureReady: !!hasCompleteStructure,
    evidenceLockReady: !!isEvidenceLockedConsistent,
  };

  const acceptanceChecklist = [
    {
      label: "Issued receipt attached",
      passed: !!hasVerificationPayload,
      detail: hasVerificationPayload
        ? "A live receipt payload is attached to this verification view."
        : "No live receipt payload is attached yet.",
    },
    {
      label: "Receipt hash available",
      passed: !!hasReceiptHash,
      detail: hasReceiptHash
        ? "The receipt hash is available for proof traceability."
        : "The receipt hash is missing or unavailable.",
    },
    {
      label: "Structure completeness passed",
      passed: !!hasCompleteStructure,
      detail: hasCompleteStructure
        ? "Core structural fields are present and readable."
        : "The structure is still incomplete for stable acceptance.",
    },
    {
      label: "Evidence lock consistent",
      passed: !!isEvidenceLockedConsistent,
      detail: isEvidenceLockedConsistent
        ? "This verification view matches the issued receipt chain."
        : "The verification view no longer matches the issued receipt chain.",
    },
    {
      label: "Behavioral grounding available",
      passed: behavioralGroundingCheck?.status === "passed",
      detail:
        behavioralGroundingCheck?.detail ||
        "Behavioral grounding is not yet strong enough.",
    },
  ];

  const acceptancePassedCount = acceptanceChecklist.filter(
    (item) => item.passed
  ).length;

  const contractVerificationReady =
    currentCase?.verification?.eligible === true ||
    verificationFlat?.resolvedVerificationEligible === true;

  const acceptanceReady =
    finalOverallStatus === "Verification Ready";

  const verificationPass =
    contractVerificationReady && access.verificationEligible;
  const verificationBlock = !verificationPass;
  const canActivateFormalVerification =
    hasLedgerReceipt && verificationPass && access.canRunVerification;
  const canShowSubscriptionOptions = verificationPass;
  
  const verdictTheme =
    finalOverallStatus === "Verification Failed"
    ? {
        cardBg: "#FEF2F2",
        cardBorder: "#FCA5A5",
        titleColor: "#991B1B",
        chipBg: "#991B1B",
        chipText: "#FFFFFF",
      }
    : finalOverallStatus === "Verification Warning"
    ? {
        cardBg: "#FFFBEB",
        cardBorder: "#FDE68A",
        titleColor: "#B45309",
        chipBg: "#B45309",
        chipText: "#FFFFFF",
      }
    : {
        cardBg: "#ECFDF5",
        cardBorder: "#A7F3D0",
        titleColor: "#047857",
        chipBg: "#047857",
        chipText: "#FFFFFF",
      };

  React.useEffect(() => {
    try {
      localStorage.setItem(
        "verificationPageData",
        JSON.stringify({
          ...data,
          verificationHash,
        })
      );
      localStorage.setItem(
        "sharedReceiptVerificationContract",
        JSON.stringify(sharedContract || {})
      );

      if (data.caseData) {
        localStorage.setItem("receiptCaseData", JSON.stringify(data.caseData));
      }
    } catch (error) {
      console.error("Failed to persist verification payload:", error);
    }
  }, [data, sharedContract, verificationHash]);

  React.useEffect(() => {
  const session =
    location.state?.trialSession || getTrialSession() || {};
  const resolvedUserId = session.userId || getStableUserId();
  const stableUserId =
    location.state?.stableUserId ||
    session?.stableUserId ||
    resolvedUserId ||
    "";
  const caseId =
    data.caseData?.caseId ||
    data.caseData?.id ||
    resolvedVerificationCaseId;

    if (!caseId) return;
    if (!cameFromIssuedReceipt || !receiptAllowsVerification) return;
    if (verificationViewedLoggedRef.current) return;

    verificationViewedLoggedRef.current = true;

  logTrialEvent(
    {
      userId: resolvedUserId,
      trialId: session?.trialId || session?.trialSessionId || "",
      sessionId:
        location.state?.session_id ||
        location.state?.sessionId ||
        data.caseData?.sessionId ||
        data.receiptId ||
        "verification_entry",
      caseId,
      eventType: "verification_viewed",
      page: "VerificationPage",
      stableUserId,
      meta: {
        stableUserId,
        source: "funnel_event",
        overallStatus: finalOverallStatus,
        receiptMode,
        receiptSource,
        canActivateFormalVerification,
        canShowSubscriptionOptions,
        evidenceLockStatus: isEvidenceLockedConsistent
          ? "consistent"
          : "broken",
        weakestDimension:
          data.weakestDimension || data.caseData?.weakestDimension || "",
      },
    },
    { once: true }
  ).catch((error) => {
    console.error("verification_viewed log error:", error);
    verificationViewedLoggedRef.current = false;
  });
  }, [
    cameFromIssuedReceipt,
    receiptAllowsVerification,
    location.state,
    data.caseData,
    data.receiptId,
    data.weakestDimension,
    resolvedVerificationCaseId,
    finalOverallStatus,
    receiptMode,
    receiptSource,
    canActivateFormalVerification,
    canShowSubscriptionOptions,
    isEvidenceLockedConsistent,
  ]);
  
  React.useEffect(() => {
  const session =
    location.state?.trialSession || getTrialSession() || {};
  const resolvedUserId = session.userId || getStableUserId();

    if (!session?.userId || !session?.trialId) return;
    if (!cameFromIssuedReceipt || !receiptAllowsVerification) return;

    const finalEventType =
      finalOverallStatus === "Verification Ready"
        ? "verification_passed"
        : finalOverallStatus === "Verification Warning" ||
          finalOverallStatus === "Verification Failed"
        ? "verification_failed"
        : null;

    if (!finalEventType) return;
    if (verificationResultLoggedRef.current) return;

    verificationResultLoggedRef.current = true;

    logTrialEvent(
      {
        userId: resolvedUserId,
        trialId: session.trialId,
        sessionId:
          location.state?.session_id ||
          location.state?.sessionId ||
          data.caseData?.sessionId ||
          data.receiptId ||
          "verification_entry",
        caseId:
          data.caseData?.caseId ||
          data.caseData?.id ||
          resolvedVerificationCaseId,
        eventType: finalEventType,
        page: "VerificationPage",
        meta: {
          overallStatus: finalOverallStatus,
          receiptMode,
          receiptSource,
          canActivateFormalVerification,
          canShowSubscriptionOptions,
          evidenceLockStatus: isEvidenceLockedConsistent
            ? "consistent"
            : "broken",
          weakestDimension:
            data.weakestDimension || data.caseData?.weakestDimension || "",
        },
      },
      { once: true }
    ).catch((error) => {
      console.error(`${finalEventType} log error:`, error);
      verificationResultLoggedRef.current = false;
    });
  }, [
    cameFromIssuedReceipt,
    receiptAllowsVerification,
    location.state,
    data.caseData,
    data.receiptId,
    data.weakestDimension,
    finalOverallStatus,
    receiptMode,
    receiptSource,
    canActivateFormalVerification,
    canShowSubscriptionOptions,
    isEvidenceLockedConsistent,
  ]);

const recommendedPathLabel =
    finalOverallStatus === "Verification Ready"
      ? "Recommended next step"
      : finalOverallStatus === "Verification Warning"
      ? "Fastest path to verification pass"
      : "Fastest recovery path";

  const recommendFormalActivation =
    finalOverallStatus === "Verification Ready";

  const recommendWeeklyAccess =
    finalOverallStatus === "Verification Failed";

  const [modalSource, setModalSource] = useState("verification_cta");

  const handleOpenSubscriptionModal = async (source = "verification_cta") => {
    try {
      if (resolvedVerificationCaseId) {
        updateCase(resolvedVerificationCaseId, {
          acceptanceChecklist: {
            items: acceptanceChecklist || [],
            checkedAt: new Date().toISOString(),
            sourcePage: "VerificationPage",
          },
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.warn("Failed to save acceptanceChecklist to case", error);
    }

    setModalSource(source);
    setShowSubscriptionModal(true);

    const session = location.state?.trialSession || getTrialSession() || {};
    const resolvedUserId = session.userId || getStableUserId();

    if (!resolvedUserId) return;

    try {
      await logTrialEvent({
        userId: resolvedUserId,
        trialId: session.trialId || "trial_unknown",
        caseId: resolvedVerificationCaseId,
        eventType: "pricing_modal_opened",
        page: "VerificationPage",
        meta: {
          source,
          overallStatus: finalOverallStatus,
          canActivateFormalVerification,
          canShowSubscriptionOptions,
          weakestDimension:
            data.weakestDimension || data.caseData?.weakestDimension || "",
        },
      });
    } catch (error) {
      console.error("pricing_modal_opened log error:", error);
    }
  };

  const handleFileUpload = (event) => {
    if (!access.canUploadFiles) {
      handleOpenSubscriptionModal("evidence_upload_locked");
      return;
    }

    const files = Array.from(event.target.files || []);
    setUploadedFiles((prev) => [...prev, ...files]);
  };

  const handleRecoveryPath = async (source = "recovery_cta") => {
    const nextOpen = !showRecoveryPanel;

  const session =
    location.state?.trialSession || getTrialSession() || {};
  const resolvedUserId = session.userId || getStableUserId();

    if (resolvedUserId) {
      try {
        await logTrialEvent({
          userId: resolvedUserId,
          trialId: session.trialId,
          caseId: resolvedVerificationCaseId,
          eventType: nextOpen
            ? "verification_recovery_cta_clicked"
            : "verification_recovery_cta_closed",
          page: "VerificationPage",
          meta: {
            source,
            overallStatus: finalOverallStatus,
            weakestDimension:
              data.weakestDimension || data.caseData?.weakestDimension || "",
          },
       });
      } catch (error) {
        console.error("verification_recovery_cta log error:", error);
      }
    }

    setShowRecoveryPanel((prev) => !prev);
  };

  return (
  <div className="relative min-h-screen bg-slate-50 text-slate-900 px-6 py-10">
    <div className="max-w-3xl mx-auto">
      <TopRightCasesCapsule />
      <div className="space-y-9">
        <div className="bg-white rounded-[28px] border border-slate-200 shadow-sm p-7 md:p-10 space-y-6 overflow-hidden">
          <header className="bg-white p-0">
          <h1 className="text-3xl font-bold mb-3">
            {isPaid ? "Verification Ready" : "Verification Not Activated"}
          </h1>

          <p
            style={{
              margin: "0 0 10px 0",
              fontSize: "13px",
              lineHeight: "1.45",
              color: "#64748B",
              fontWeight: 400,
            }}
          >
            {data.introText ||
              "This page is the verification layer. It does not repeat receipt eligibility. It determines whether the issued record is externally ready, internally reviewable, or still structurally incomplete."}
          </p>

          <div className="text-sm text-slate-500 mt-2">
            Receipt records the decision. Verification checks that the record holds under review.
          </div>

          <p
            style={{
              margin: "0 0 14px 0",
              fontSize: "12px",
              lineHeight: "1.35",
              color: "#94A3B8",
              fontWeight: 400,
            }}
          >
            {data.weakestDimension
              ? `Primary review dimension: ${data.weakestDimension}.`
              : data.caseData
              ? "Primary review dimension not separately identified under the current case schema."
              : "Primary review dimension not available in the current record."}
          </p>

          <div className="mt-3">
            <div
              style={{
                border: "1px solid #CBD5E1",
                borderRadius: "16px",
                padding: "14px 18px",
                backgroundColor: "#F8FAFC",
              }}
            >
              {/* 缂佹鍏涚粩鎾箳閹虹偟绐桰ssuance Status / Receipt ID */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  alignItems: "start",
                  columnGap: "0",
                }}
              >
                <div style={{ padding: "2px 16px 4px 6px" }}>
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#64748B",
                      margin: "0 0 6px 0",
                      lineHeight: 1.2,
                    }}
                  >
                    Issuance Status
                  </p>
              
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <div style={{ flexShrink: 0, lineHeight: 0 }}>
                      <StatusCircleIcon status={finalOverallStatus} />
                    </div>
              
                    <p
                      style={{
                        margin: 0,
                        fontSize: "12px",
                        lineHeight: 1.3,
                        fontWeight: 600,
                        color:
                          finalOverallStatus === "Verification Ready"
                            ? "#047857"
                            : finalOverallStatus === "Verification Warning"
                            ? "#B45309"
                            : "#991B1B",
                      }}
                    >
                      {finalOverallStatus === "Verification Ready"
                        ? "FORMAL VERIFICATION ISSUABLE"
                        : finalOverallStatus === "Verification Warning"
                        ? "FORMAL VERIFICATION NOT YET ISSUABLE"
                        : "FORMAL VERIFICATION BLOCKED"}
                    </p>
                  </div>
                </div>
              
                <div
                  style={{
                    padding: "2px 16px 4px 16px",
                    borderLeft: "1px solid #CBD5E1",
                  }}
                >
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#64748B",
                      margin: "0 0 6px 0",
                      lineHeight: 1.2,
                    }}
                  >
                    Receipt ID
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "12px",
                      lineHeight: 1.3,
                      fontWeight: 600,
                      wordBreak: "break-all",
                      color: "#0F172A",
                    }}
                  >
                    {hasVerificationPayload ? data.receiptId : "No live receipt attached"}
                  </p>
                </div>
              </div>

              {/* 缂佹鍏涚粩鎾箳閹烘垶瀚茬紒妤婂厸缁ㄢ晠骞掗幒宥囶吅闂傚倸顕▓鎴澪熼鍡楁疇 */}
              <div
                style={{
                  margin: "10px 0",
                  height: "1px",
                  backgroundColor: "#CBD5E1",
                }}
              />

              {/* 缂佹鍏涚花鈺呭箳閹虹偟绐梀erification Hash / Verified At */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  alignItems: "start",
                  columnGap: "0",
                }}
              >
                <div
                  style={{
                    padding: "2px 16px 4px 6px",
                  }}
                >
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#64748B",
                      margin: "0 0 6px 0",
                      lineHeight: 1.2,
                    }}
                  >
                    Verification Hash
                  </p>
              
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      flexWrap: "wrap",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: "12px",
                        lineHeight: 1.3,
                        fontWeight: 600,
                        color: "#0F172A",
                        wordBreak: "break-all",
                      }}
                    >
                      {`${verificationHash.slice(0, 10)}...${verificationHash.slice(-6)}`}
                    </p>

                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(verificationHash);
                          setVerificationHashCopied(true);
                          window.setTimeout(() => {
                            setVerificationHashCopied(false);
                          }, 1200);
                        } catch (error) {
                          console.error("Failed to copy verification hash:", error);
                        }
                      }}
                      style={{
                        border: verificationHashCopied
                          ? "1px solid #10B981"
                          : "1px solid #CBD5E1",
                        background: verificationHashCopied ? "#ECFDF5" : "#FFFFFF",
                        borderRadius: "999px",
                        padding: "4px 10px",
                        fontSize: "11px",
                        fontWeight: 600,
                        color: verificationHashCopied ? "#047857" : "#334155",
                        cursor: "pointer",
                        transition: "all 160ms ease",
                      }}
                    >
                      {verificationHashCopied ? "Copied" : "Copy"}
                    </button>
                  </div>

                  <p
                    style={{
                      margin: "4px 0 0 0",
                      fontSize: "10.5px",
                      lineHeight: 1.35,
                      color: "#94A3B8",
                      fontWeight: 400,
                    }}
                  >
                    Derived from the receipt baseline and current verification outcome.
                  </p>
                </div>

                <div
                  style={{
                    padding: "2px 6px 4px 16px",
                    borderLeft: "1px solid #CBD5E1",
                  }}
                >
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#64748B",
                      margin: "0 0 6px 0",
                      lineHeight: 1.2,
                    }}
                  >
                    Verified At
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "12px",
                      lineHeight: 1.3,
                      fontWeight: 600,
                      color: "#0F172A",
                    }}
                  >
                    {data.verifiedAt || "Not recorded yet"}
                  </p>
                </div>
                </div>

                <div
                  style={{
                    margin: "10px 0",
                    height: "1px",
                    backgroundColor: "#CBD5E1",
                  }}
                />

                <div
                  style={{
                    position: "relative",
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    alignItems: "start",
                    columnGap: "0",
                  }}
                >
                  {/* 鐎归潻璁ｇ槐鐧坅se Schema */}
                  <div style={{ padding: "2px 16px 4px 6px" }}>
                    <p style={{ fontSize: "12px", color: "#64748B", margin: "0 0 6px 0" }}>
                      Case Schema
                    </p>
                    <p style={{ fontSize: "12.5px", fontWeight: 600 }}>
                      {data.caseData ? "Attached" : "Not attached"}
                    </p>
                  </div>

                  {/* 闁告瑧顒茬槐鐧坅se tested */}
                  <div
                    style={{
                      padding: "2px 6px 4px 16px",
                      borderLeft: "1px solid #CBD5E1",
                    }}
                  >
                    <p style={{ fontSize: "12px", color: "#64748B", margin: "0 0 6px 0" }}>
                      Case tested
                    </p>
                    {hasVerificationSummary ? (
                      <div className="text-sm leading-6 text-slate-900">
                        <div>鉁?Baseline summary loaded</div>
                        <div>鉁?Events: {verificationEventCount || "recorded"}</div>
                        <div>鉁?Decision path reconstructed</div>
                      </div>
                    ) : (
                      <p style={{ fontSize: "12.5px", fontWeight: 500 }}>
                        {data.displayContext || "No structured summary available."}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
        </header>
        <section
          className="mt-3 p-6 md:p-7 shadow-sm"
          style={{
            width: "100%",
            marginLeft: "0",
  marginRight: "0",
            backgroundColor: verdictTheme.cardBg,
            border:
              finalOverallStatus === "Verification Failed"
                ? "1px solid rgba(153,27,27,0.12)"
                : finalOverallStatus === "Verification Warning"
                ? "1px solid rgba(180,83,9,0.12)"
                : "1px solid rgba(4,120,87,0.12)",
            minHeight: "130px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "26px",
          }}
        >
          <div className="space-y-5">
            <p
              style={{
                margin: 0,
                fontSize: "12px",
                lineHeight: 1.2,
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "#64748B",
              }}
            >
              Verification conclusion
            </p>

            <VerificationTraceBlock
              caseData={data.displayContext}
              events={data.eventTimeline}
              correction={guidance?.actions?.[0]}
              verificationHash={verificationHash}
              weakestDimension={data.weakestDimension}
            />

            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
              }}
            >
              <div style={{ flexShrink: 0, lineHeight: 0, marginTop: "2px" }}>
                <StatusShieldIcon status={finalOverallStatus} />
              </div>

              <div
                style={{
                  maxWidth: "640px",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    color: verdictTheme.titleColor,
                    fontSize: "15px",
                    lineHeight: "1.4",
                    fontWeight: 600,
                  }}
                >
                  {verdictLine}
                </div>

                <div
                  style={{
                    margin: "8px 0 0 0",
                    fontSize: "12px",
                    lineHeight: "1.45",
                    color: "#64748B",
                    fontWeight: 400,
                  }}
                >
                  This determination may be used for internal review, escalation, or audit reference.
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                border:
                  finalOverallStatus === "Verification Ready"
                    ? "1px solid rgba(4,120,87,0.18)"
                    : finalOverallStatus === "Verification Warning"
                    ? "1px solid rgba(180,83,9,0.18)"
                    : "1px solid rgba(153,27,27,0.18)",
                borderRadius: "12px",
                overflow: "hidden",
                width: "fit-content",
                backgroundColor: "transparent",
              }}
            >
              {[
                hasReceiptHash
                  ? "闁?Receipt baseline attached"
                  : "闁?Receipt baseline missing",

                finalOverallStatus === "Verification Ready"
                  ? "闁?Structural sufficiency confirmed"
                  : hasCompleteStructure
                  ? "闁?Structural sufficiency met"
                  : "闁?Structural sufficiency not met",

                auditReady
                  ? "闁?Review condition satisfied"
                  : "闁?Review condition pending",

                isEvidenceLockedConsistent
                  ? "闁?Record chain consistent"
                  : "闁?Record chain inconsistent",
              ].map((text, index, arr) => (
                <React.Fragment key={text}>
      
                  {/* 婵絽绻嬬粩鎾锤?*/}
                  <div
                    style={{
                      padding: "3px 8px",     // 妫ｅ啯鍟?闁告劕绉甸弫瑙勭▔閳ь剟宕烽崼顒傜闂傚牏鍋涢悥鍫曞礂閹惰姤鏆涢柨?
                      fontSize: "10px",     // 妫ｅ啯鍟?闁告劕绉瑰閿嬬▔閳ь剟鎮欓崷顓炰化闁挎稑鐗呯粭澶屾啺娴ｇ儤绾柟?0闁挎稑濂旂槐鐗堝緞椤忓嫬鍙￠柨?
                      lineHeight: "1.2",      // 妫ｅ啯鍟?闁告ê顑囬幓?
                      fontWeight: 500,
                      letterSpacing: "0.01em", // 妫ｅ啯鍟?闁告梻濮崇粩鎾倷閸︻厼浠紒顔藉礃閸ぱ囧箛?
                      color:
                        finalOverallStatus === "Verification Ready"
                          ? "#047857"
                          : finalOverallStatus === "Verification Warning"
                          ? "#B45309"
                          : "#991B1B",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {text}
                  </div>
            
                  {/* 濞戞搩鍙冨Λ璺ㄧ博閺嶎偄娈犻柨娑樼墕閸櫻囨煥椤曞棛绀?*/}
                  {index < arr.length - 1 && (
                    <div
                      style={{
                        width: "1px",
                        height: "14px",                         // 妫ｅ啯鍟?闁哄洤顕悡?
                        backgroundColor:
                          finalOverallStatus === "Verification Ready"
                            ? "rgba(4,120,87,0.25)"
                            : finalOverallStatus === "Verification Warning"
                            ? "rgba(180,83,9,0.25)"
                            : "rgba(153,27,27,0.25)",
                      }}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </section>

        {/* 妫ｅ啯鏉?Supporting Evidence Upload */}
        <section className="mt-8 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between gap-6">
            <div className="max-w-[300px]">
              <p className="text-[10px] font-medium tracking-[0.08em] uppercase text-slate-400 mb-1">
                Evidence-based verification
              </p>

              <h3 className="text-[12px] font-medium text-slate-800 mb-1 leading-[1.35]">
                File upload is available after verification activation
              </h3>

              <p className="text-[11px] text-slate-500 leading-[1.5]">
                Text-only verification can be previewed from the current record. File-based review requires activation before documents are uploaded or processed.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                if (!access.canUploadFiles) {
                  handleOpenSubscriptionModal("evidence_upload_locked");
                  return;
                }
              }}
              style={{
                flexShrink: 0,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "999px",
                backgroundColor: "#ECFDF5",
                color: "#047857",
                border: "1px solid #A7F3D0",
                padding: "8px 20px",
                fontSize: "11px",
                fontWeight: 500,
                lineHeight: 1.2,
                boxShadow: "0 2px 6px rgba(4, 120, 87, 0.08)",
                cursor: "pointer",
              }}
            >
              {access.canUploadFiles ? "File upload unlocked" : "Activate file-based"}
              <br />
              verification
            </button>
          </div>
        </section>
        
        <section className="mt-3 p-0">
          <p className="text-xs font-medium tracking-[0.08em] uppercase text-slate-400 mb-2">
            Next procedural step
          </p>

          <h2
            className={`text-[17px] font-medium mb-2 ${
              finalOverallStatus === "Verification Failed"
                ? "text-red-800"
                : finalOverallStatus === "Verification Warning"
                ? "text-amber-800"
                : "text-emerald-800"
            }`}
          >
            {access.needsEvent
              ? "Capture event before verification"
              : !hasLedgerReceipt
              ? "Receipt ledger required"
              : access.needsScore
              ? "Score not ready for verification"
              : access.verificationEligible && !access.canRunVerification
              ? "Formal verification activation required"
              : canActivateFormalVerification
              ? "Record eligible for formal issuance"
              : !isEvidenceLockedConsistent
              ? "Record chain recovery required"
              : finalOverallStatus === "Verification Warning"
              ? "Pre-issuance correction required"
              : "Re-submission blocked until required remediation is completed"}
          </h2>
        
          <p
            style={{
              margin: 0,
              fontSize: "11.5px",
              lineHeight: "1.45",
              fontWeight: 400,
              color: "#64748B",
            }}
          >
            {access.needsEvent
              ? "Verification requires at least one captured event before this record can move into formal review."
              : !hasLedgerReceipt
              ? receiptLedgerLoading
                ? "Verification is checking for the issued receipt baseline before loading formal controls."
                : receiptLedgerError
                ? "Receipt ledger not found. Generate the case receipt before activating verification."
                : "Receipt ledger not found. Generate the case receipt before activating verification."
              : access.needsScore
              ? "The current score is not high enough for verification eligibility yet."
              : access.verificationEligible && !access.canRunVerification
              ? "The current record is eligible for verification preview. Formal activation is required before verification can run."
              : canActivateFormalVerification
              ? "The current record is sufficient for formal verification issuance when this decision must be carried forward outside the workspace."
              : !isEvidenceLockedConsistent
              ? "The current verification record is no longer aligned with the issued receipt baseline. Restore the source record before further review."
              : finalOverallStatus === "Verification Warning"
              ? "One focused structural correction is required before formal verification can be issued."
              : "This record has received a formal negative determination. Required remediation must be completed before the case can be re-submitted for formal verification."}
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            {verificationPass && hasLedgerReceipt ? (
              <button
                type="button"
                onClick={() => {
                  if (!access.canRunVerification) {
                    handleOpenSubscriptionModal("verification_activation_locked");
                    return;
                  }

                  if (!verificationActivated) {
                    handleActivateVerificationForCase();
                    return;
                  }

                  handleOpenSubscriptionModal("verification_success_cta");
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#047857";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#059669";
                }}
                className="inline-flex items-center justify-center rounded-2xl px-5 py-3 text-xs font-semibold shadow-sm transition"
                style={{
                  backgroundColor: "#059669",
                  color: "#FFFFFF",
                  boxShadow: "0 6px 16px rgba(5,150,105,0.35)",
                }}
              >
                {isPaid ? "Verify Record" : "Activate Verification"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleRecoveryPath("verification_failed_cta")}
                className="inline-flex items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
                style={{
                  boxShadow: "0 3px 8px rgba(245, 158, 11, 0.18)"
                }}
              >
                <span className="flex items-center gap-2">
                  <span>Show recovery path</span>

                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "0",
                      height: "0",
                      borderLeft: "5px solid transparent",
                      borderRight: "5px solid transparent",
                      borderTop: "6px solid #B45309", // amber-700
                      transform: showRecoveryPanel ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s ease",
                    }}
                  />
                </span>
              </button>
            )}
          </div>

          {showRecoveryPanel && !canActivateFormalVerification && (
            <div className="mt-6 space-y-4" ref={recoverySectionRef}>
              {consistencyRepairCard ? (
                <section className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-4 sm:px-5">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700/80">
                    {consistencyRepairCard.title}
                  </div>

                  <h3 className="mt-2 text-xs font-semibold text-neutral-900 sm:text-[15px] leading-6">
                    {consistencyRepairCard.intro}
                  </h3>

                  {Array.isArray(consistencyRepairCard.conflicts) &&
                  consistencyRepairCard.conflicts.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {consistencyRepairCard.conflicts.slice(0, 2).map((item) => (
                        <div
                          key={item.code}
                          className="rounded-xl border border-amber-200/80 bg-white px-3 py-3"
                        >
                          <div className="text-xs font-medium text-neutral-900 leading-6">
                            {item.label}
                          </div>
                          <div className="mt-1 text-[13px] leading-5 text-neutral-600">
                            Recommended repair: {item.fix}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {consistencyRepairCard.minimalRepair ? (
                    <div className="mt-3 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
                        Minimal repair path
                      </div>
                      <div className="mt-1 text-xs font-medium text-neutral-900 leading-6">
                        {consistencyRepairCard.minimalRepair.label}
                      </div>
                      <div className="mt-1 text-[13px] leading-5 text-neutral-600">
                        {consistencyRepairCard.minimalRepair.action}
                      </div>
                    </div>
                  ) : null}
                </section>
              ) : null}

              <CalibrationCard
                guidance={guidance}
                status={finalOverallStatus}
                weakestDimension={data.weakestDimension || data.caseData?.weakestDimension || ""}
                checks={data.checks}
                isEvidenceLockedConsistent={isEvidenceLockedConsistent}
                consistencyRepairCard={consistencyRepairCard}
              />
            </div>
          )}
          </section>

        </div>

        <section className="mt-3 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Aggregated RUN Record</h2>

          <div
            style={{
              backgroundColor: "#F8FAFC",
              border: "1px solid #CBD5E1",
              borderRadius: "20px",
              padding: "12px 16px",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                alignItems: "center",
              }}
            >
              {/* 鐎归潻璁ｇ槐鐧漸mmary */}
              <div
                style={{
                  padding: "2px 18px",
                  borderRight: "1px solid #CBD5E1",
                }}
              >
                <p style={{ fontSize: "10px",   color: "#64748B", marginBottom: "10px" }}>
                  RUN Summary
                </p>
                <p style={{ fontSize: "15px",  fontWeight: 600 }}>
                  {data.runSummaryText || "No aggregated RUN summary available."}
                </p>
              </div>

              {/* 闁告瑧顒茬槐鐧沀N entries */}
              <div style={{ padding: "2px 18px" }}>
                <p style={{ fontSize: "10px",   color: "#64748B", marginBottom: "10px" }}>
                  RUN Signals
                </p>

                {Array.isArray(data.runEntries) && data.runEntries.length > 0 ? (
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    {data.runEntries.map((entry, index) => (
                      <span
                        key={index}
                        style={{
                          padding: "4px 10px",
                          border: "1px solid #CBD5E1",
                          borderRadius: "10px",
                          fontSize: "14px",
                          fontWeight: 500,
                        }}
                      >
                        {entry.runLabel} 閼?{entry.count}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: "#64748B" }}>
                    No aggregated RUN data available.
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {data.caseData ? (
          <section className="mt-4 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Case Schema Snapshot</h2>

            <div
              style={{
                backgroundColor: "#F8FAFC",
                border: "1px solid #CBD5E1",
                borderRadius: "20px",
                padding: "12px 16px",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    padding: "2px 18px",
                    borderRight: "1px solid #CBD5E1",
                  }}
                >
                  <p
                    style={{
                      fontSize: "12px",  
                      color: "#64748B",
                      margin: "0 0 10px 0",
                    }}
                  >
                    Scenario
                  </p>
                  <p
                    style={{
                      fontSize: "15px", 
                      fontWeight: 600,
                      lineHeight: 1,
                      margin: 0,
                    }}
                  >
                    {data.scenarioLabel || data.caseData?.scenarioCode || "No Dominant Scenario"}
                  </p>
                </div>

                <div
                  style={{
                    padding: "2px 18px",
                    borderRight: "1px solid #CBD5E1",
                  }}
                >
                  <p
                    style={{
                      fontSize: "10px",  
                      color: "#64748B",
                      margin: "0 0 10px 0",
                    }}
                  >
                    Stage
                  </p>
                  <p
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      lineHeight: 1,
                      margin: 0,
                    }}
                  >
                    {data.stageLabel || data.caseData?.stage || "S0"}
                  </p>
                </div>

                <div
                  style={{
                    padding: "2px 18px",
                    borderRight: "1px solid #CBD5E1",
                  }}
                >
                  <p
                    style={{
                      fontSize: "10px",  
                      color: "#64748B",
                      margin: "0 0 10px 0",
                    }}
                  >
                    Confidence
                  </p>
                  <p
                    style={{
                      fontSize: "15px", 
                      fontWeight: 600,
                      lineHeight: 1,
                      margin: 0,
                    }}
                  >
                    {data.confidenceLabel}
                  </p>
                </div>

                <div
                  style={{
                    padding: "2px 18px",
                  }}
                >
                  <p
                    style={{
                      fontSize: "10px",  
                      color: "#64748B",
                      margin: "0 0 10px 0",
                    }}
                  >
                    Primary RUN
                  </p>
                  <p
                    style={{
                      fontSize: "15px", 
                      fontWeight: 600,
                      lineHeight: 1,
                      margin: 0,
                    }}
                  >
                    {data.primaryRunLabel || data.runLabel || data.caseData?.fallbackRunCode || "RUN000"}
                  </p>
                </div>
              </div>
            </div>
          </section>
        ) : null}  

        <section className="mt-4 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold mb-4">What was checked</h2>

          <div
            style={{
              marginBottom: "16px",
              padding: "12px 16px",
              backgroundColor: "#F8FAFC",
              border: "1px solid #CBD5E1",
              borderRadius: "16px",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "10px",  
                fontWeight: 600,
                color: "#0F172A",
              }}
            >
              {(() => {
                const warningCount = data.checks.filter((c) => c.status === "warning").length;
                const failedCount = data.checks.filter((c) => c.status === "failed").length;

                if (failedCount > 0) {
                  return `闁?${failedCount} failure${failedCount > 1 ? "s" : ""} detected. Structural issues must be corrected.`;
                }

                if (warningCount > 0) {
                  return `闁?${warningCount} warning${warningCount > 1 ? "s" : ""} detected. Structure is partially complete.`;
                }

                return "闁?All checks passed. Structure is consistent and reviewable.";
              })()}
            </p>

            <p
              style={{
                margin: "6px 0 0 0",
               fontSize: "13px",
                color: "#64748B",
                lineHeight: 1.5,
              }}
            >
              Verification confirms whether the issued case record remains consistent across the receipt and verification layers.
            </p>
          </div>

          <div
            style={{
              backgroundColor: "#F8FAFC",
              border: "1px solid #CBD5E1",
              borderRadius: "16px",
              padding: "12px 0",
            }}
          >
            {data.checks.map((check, index) => (
              <div key={`${check.label}-${index}`} style={{ padding: "12px 16px" }}>
      
                {/* 闁哄秴娲。鐣屾偘?*/}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "6px",
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{check.label}</span>

                  <span
                    style={{
                      fontSize: "11px",
                      padding: "2px 8px",
                      borderRadius: "8px",
                      fontWeight: 500,
                      backgroundColor:
                        check.status === "passed"
                          ? "#ECFDF5"
                          : check.status === "warning"
                          ? "#FFFBEB"
                          : "#FEF2F2",
                      color:
                        check.status === "passed"
                          ? "#047857"
                          : check.status === "warning"
                          ? "#B45309"
                          : "#991B1B",
                      border:
                        check.status === "passed"
                          ? "1px solid #A7F3D0"
                          : check.status === "warning"
                          ? "1px solid #FDE68A"
                          : "1px solid #FCA5A5",
                    }}
                  >
                    {check.status}
                  </span>
                </div>

                {/* 闁硅绻楅崼?*/}
                <p style={{ color: "#475569", lineHeight: 1.6 }}>
                  {check.detail}
                </p>

                {/* 闁哄偆鍘肩槐鎴澪熼鍡楁疇闁挎稑鐗嗛崣褔鏌ㄩ鍡欑 */}
                {index < data.checks.length - 1 && (
                  <div
                    style={{
                      marginTop: "14px",
                      width: "100%",
                      borderTop: "1px solid #CBD5E1",
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-4 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
  
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Verification timeline</h2>

            <button
              type="button"
              onClick={() => setShowTimeline(prev => !prev)}
              className="text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              {showTimeline ? "Hide" : "View"}
            </button>
          </div>

          {showTimeline && (
            <div className="space-y-4">
              {data.eventTimeline.map((item, index) => (
                <div
                  key={`${item.time}-${item.title}-${index}`}
                  className="rounded-xl border border-slate-200 p-4 bg-slate-50"
                >
                  <p className="text-xs text-slate-500 mb-1">{item.time}</p>
                  <h3 className="font-semibold mb-2">{item.title}</h3>
                  <p className="text-slate-700 leading-7">{item.detail}</p>
                </div>
              ))}
            </div>
          )}

        </section>

        <section className="mt-4 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-5 pr-4">
            <div>
              <h2 className="text-lg font-semibold">Ledger-backed proof</h2>
              <p className="mt-1 text-xs text-slate-600">
                This receipt is supported by a backend verification record for traceability and audit readiness.
              </p>
            </div>

            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                height: "26px",
                padding: "0 12px",
                borderRadius: "6px",
                fontSize: "11px",
                lineHeight: 1,
                fontWeight: 600,
                border: anchorStatus === "Anchored"
                  ? "1px solid #A7F3D0"
                  : anchorStatus === "Pending"
                  ? "1px solid #FDE68A"
                  : "1px solid #CBD5E1",
                backgroundColor: anchorStatus === "Anchored"
                  ? "#ECFDF5"
                  : anchorStatus === "Pending"
                  ? "#FFFBEB"
                  : "#F8FAFC",
                color: anchorStatus === "Anchored"
                  ? "#047857"
                  : anchorStatus === "Pending"
                  ? "#B45309"
                  : "#475569",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {anchorStatus}
            </span>
          </div>

          <div
            style={{
              backgroundColor: "#F8FAFC",
              border: "1px solid #CBD5E1",
              borderRadius: "20px",
              padding: "12px 16px",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1.2fr",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  padding: "2px 18px",
                  borderRight: "1px solid #CBD5E1",
                }}
              >
                <p
                  style={{
                    fontSize: "12px",
                    fontWeight: 500,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    color: "#64748B",
                    margin: "0 0 10px 0",
                  }}
                >
                  Proof record ID
                </p>
                <p
                  style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    lineHeight: 1.2,
                    margin: 0,
                    color: "#0F172A",
                    wordBreak: "break-all",
                  }}
                >
                  {proofRecordId}
                </p>
              </div>
          
              <div
                style={{
                  padding: "2px 18px",
                  borderRight: "1px solid #CBD5E1",
                }}
              >
                <p
                  style={{
                    fontSize: "12px",
                    fontWeight: 500,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    color: "#64748B",
                    margin: "0 0 10px 0",
                  }}
                >
                  Anchored at
                </p>
                <p
                  style={{
                    fontSize: "15px", 
                    fontWeight: 600,
                    lineHeight: 1.2,
                    margin: 0,
                    color: "#0F172A",
                  }}
                >
                  {anchoredAt}
                </p>
              </div>
          
              <div
                style={{
                  padding: "2px 18px",
                }}
              >
                <p
                  style={{
                    fontSize: "12px",
                    fontWeight: 500,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    color: "#64748B",
                    margin: "0 0 10px 0",
                  }}
                >
                  Receipt hash
                </p>
           
                <p
                  style={{
                    margin: "4px 0 0 0",
                    fontSize: "10.5px",
                    lineHeight: 1.35,
                    color: "#94A3B8",
                    fontWeight: 400,
                  }}
                >
                  Source baseline for this verification chain.
                </p>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                  }}
                >
                  <p
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      lineHeight: 1.2,
                      margin: 0,
                      color: "#0F172A",
                      wordBreak: "break-all",
                      flex: 1,
                    }}
                  >
                    {displayReceiptHash}
                  </p>

                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(proofReceiptHash);
                        setReceiptHashCopied(true);
                        window.setTimeout(() => {
                          setReceiptHashCopied(false);
                        }, 1200);
                      } catch (error) {
                        console.error("Failed to copy receipt hash:", error);
                      }
                    }}
                    style={{
                      marginLeft: "18px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "999px",
                      border: receiptHashCopied ? "1px solid #10B981" : "1px solid #CBD5E1",
                      backgroundColor: receiptHashCopied ? "#ECFDF5" : "#FFFFFF",
                      padding: "5px 14px",
                      fontSize: "11px",
                      fontWeight: 600,
                      color: receiptHashCopied ? "#047857" : "#334155",
                      whiteSpace: "nowrap",
                      cursor: "pointer",
                      boxShadow: receiptHashCopied
                        ? "0 0 0 3px rgba(16, 185, 129, 0.14)"
                        : "none",
                      transition: "all 160ms ease",
                    }}
                  >
                    {receiptHashCopied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <p className="mt-4 text-xs text-slate-500 leading-6">
            This page does not expose the full ledger. It shows the proof layer linked to the current receipt.
          </p>
        </section>

        <section className="mt-4 bg-blue-50 rounded-2xl border border-blue-200 p-6">
          <h2 className="text-lg font-semibold mb-2">Verification note</h2>
          <p
            className={`leading-7 ${
              finalOverallStatus === "Verification Failed"
                ? "text-red-700"
                : finalOverallStatus === "Verification Warning"
                ? "text-amber-700"
                : "text-emerald-700"
            }`}
          >
            {data.finalNote ||
              "Verification improves trust, portability, and review readiness by checking whether the issued case record remains internally consistent and traceable. It does not replace professional or legal review."}
          </p>
        </section>

        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            to={ROUTES.RECEIPT}
            state={{
              ...(routeEnvelope || {}),
              pcMeta,
            }}
            className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-[12px] font-medium text-slate-900 border border-slate-300 shadow-sm transition hover:bg-slate-100"
          >
            Back to Receipt
          </Link>
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
                boxShadow: "0 24px 80px rgba(15, 23, 42, 0.28)",
                border: "1px solid #E2E8F0",
                padding: "16px",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  alignItems: "center",
                  columnGap: "12px",
                  marginBottom: "16px",
                  paddingLeft: "8px",
                  paddingRight: "8px",
                }}
              >
                <h2
                  style={{
                    fontSize: "22px",
                    fontWeight: 700,
                    color: "#0F172A",
                    margin: 0,
                    flex: 1,
                  }}
                >
                  {verificationActivated
                    ? formalWorkspaceCopy.modalTitle
                    : modalSource === "failed_cta"
                    ? "Choose the fastest recovery path"
                    : modalSource === "warning_cta"
                    ? "Choose the fastest path to verification pass"
                    : "Preview access"}
                </h2>
        
                <button
                  type="button"
                  onClick={() => setShowSubscriptionModal(false)}
                  aria-label="Close"
                  style={{
                    width: "32px",
                    height: "32px",
                    flexShrink: 0,
                    borderRadius: "999px",
                    border: "1px solid #E2E8F0",
                    backgroundColor: "#FFFFFF",
                    color: "#64748B",
                    fontSize: "20px",
                    lineHeight: 1,
                    fontWeight: 500,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                  }}
                >
                  閼?
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
                  <h3 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#0F172A" }}>
                    {formalWorkspaceCopy.workspaceTitle}
                  </h3>

                  <p style={{ margin: "8px 0 0 0", fontSize: "14px", lineHeight: 1.6, color: "#475569" }}>
                    For continuous decision work inside the system.
                  </p>
              
                  <p style={{ margin: "12px 0 0 0", fontSize: "28px", fontWeight: 700, color: "#0F172A" }}>
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
              
                  <div style={{ marginTop: "14px", fontSize: "14px", lineHeight: 1.7, color: "#334155" }}>
                    <div style={{ fontWeight: 700, marginBottom: "4px" }}>Includes</div>
                    <div>鐠?Unlimited pilot sessions</div>
                    <div>鐠?Unlimited result access</div>
                    <div>鐠?Internal case tracking</div>
                    <div>鐠?Analytics and history</div>
                    <div>鐠?Preview of receipt & verification states</div>
                  </div>
              
                  <div style={{ marginTop: "12px", fontSize: "14px", lineHeight: 1.7, color: "#64748B" }}>
                    <div style={{ fontWeight: 700, marginBottom: "4px" }}>Does not include</div>
                    <div>鐠?Formal Receipt issuance</div>
                    <div>鐠?Formal Verification packages</div>
                    <div>鐠?Exportable proof</div>
                  </div>

                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-2xl border border-green-200 bg-green-50 px-5 py-3 text-xs font-semibold text-green-700 shadow-sm transition hover:bg-green-100"
                    style={{ marginTop: "16px" }}
                  >
                    {formalWorkspaceCopy.workspaceCta} 闁?
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
                  <h3 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#0F172A" }}>
                    Formal Receipt
                  </h3>

                  <p style={{ margin: "8px 0 0 0", fontSize: "14px", lineHeight: 1.6, color: "#475569" }}>
                    Turn a case into a formal, stored decision record.
                  </p>

                  <p style={{ margin: "12px 0 0 0", fontSize: "28px", fontWeight: 700, color: "#0F172A" }}>
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

                  <div style={{ marginTop: "14px", fontSize: "14px", lineHeight: 1.7, color: "#334155" }}>
                    <div style={{ fontWeight: 700, marginBottom: "4px" }}>Includes</div>
                    <div>鐠?Official receipt issuance</div>
                    <div>鐠?Locked case snapshot</div>
                    <div>鐠?Persistent storage</div>
                    <div>鐠?Internal documentation use</div>
                  </div>
              
                  <div style={{ marginTop: "12px", fontSize: "14px", lineHeight: 1.7, color: "#64748B" }}>
                    <div style={{ fontWeight: 700, marginBottom: "4px" }}>Best for</div>
              <div>鐠?Recording key decisions</div>
                    <div>鐠?Internal audits</div>
                    <div>鐠?Case archiving</div>
                  </div>

                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-2xl border border-amber-300 bg-amber-50 px-5 py-3 text-xs font-semibold text-amber-800 shadow-sm transition hover:bg-amber-100 hover:border-amber-400"
                    style={{ marginTop: "16px" }}
                  >
                    {formalWorkspaceCopy.receiptCta} 闁?
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
                  <h3 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#0F172A" }}>
                    Formal Verification
                  </h3>

                  <p style={{ margin: "8px 0 0 0", fontSize: "14px", lineHeight: 1.6, color: "#475569" }}>
                    Issue a formal verification outcome based on the locked receipt baseline.
                  </p>

                  <p style={{ margin: "12px 0 0 0", fontSize: "28px", fontWeight: 700, color: "#0F172A" }}>
                    $999 / case
                  </p>

                  <p
                    style={{
                      margin: "4px 0 0 0",
                      fontSize: "13px",
                      color: "#94A3B8",
                      textDecoration: "line-through",
                    }}
                  >
                    $1499
                  </p>

                  <div style={{ marginTop: "14px", fontSize: "14px", lineHeight: 1.7, color: "#334155" }}>
                    <div style={{ fontWeight: 700, marginBottom: "4px" }}>Includes</div>
                    <div>鐠?Formal verification outcome</div>
                    <div>鐠?Rule-consistency judgment</div>
                    <div>鐠?Externally usable decision result</div>
                    <div>鐠?Portable verification record</div>
                  </div>

                  <div style={{ marginTop: "12px", fontSize: "14px", lineHeight: 1.7, color: "#64748B" }}>
                    <div style={{ fontWeight: 700, marginBottom: "4px" }}>Best for</div>
                    <div>鐠?Formal decision confirmation</div>
                    <div>鐠?Compliance / risk review</div>
                    <div>鐠?Decisions that must travel outside the workspace</div>
                  </div>

                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
                    style={{ marginTop: "16px" }}
                  >
                    {formalWorkspaceCopy.verificationCta} 闁?
                  </button>
                </div>
              </div>
                <p
                  style={{
                    width: "100%",
                    margin: "4px 0 0 0",
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
  </div>
);
}
