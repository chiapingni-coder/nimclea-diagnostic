import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getTrialSession } from "../lib/trialSession";
import ROUTES from "../routes";
import { evaluateCaseRecordStatus } from "../utils/verificationStatus";
import { normalizeCaseInput } from "../utils/caseSchema";
import { logTrialEvent } from "../lib/trialApi";
import { getStableUserId } from "../utils/eventLogger";

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

function getStoredVerificationData() {
  try {
    const raw = localStorage.getItem("verificationPageData");
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error("Failed to read verificationPageData from localStorage:", error);
    return null;
  }
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

function normalizeVerificationData(input = {}) {
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
    verificationTitle: input.verificationTitle || "Structure Proof Verification",
    overallStatus: input.overallStatus || "Ready for Review",
    receiptId: input.receiptId || "RCPT-DEMO-001",
    verifiedAt: input.verifiedAt || "",
    caseInput: getCaseContext({
      ...input,
      caseData: normalizedCaseData,
    }),

    summaryContext: getCaseSummary({
      ...input,
      caseData: normalizedCaseData,
    }),

    displayContext:
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
      "This page shows whether this receipt is now strong enough to be reviewed, trusted, and carried into real decisions. It confirms that the structure, proof chain, and supporting record can be checked together.",
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
      title: "This proof is ready to carry forward",
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
          title: "Authority gap detected",
          message: "This proof is structurally weak in decision authority.",
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
          message: "This proof is not externally valid due to insufficient supporting evidence.",
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
          message: "This proof is internally reviewable but unstable because role or responsibility boundaries are not structurally clear.",
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
      title: "Structure reviewable, but not stable yet",
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
       title: "Authority failure detected",
        message: "This proof is not externally valid due to unresolved decision authority.",
        actions: [
          "Clarify who owns approval, override, or final decision authority before reissuing this proof."
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
        message: "This proof is not externally valid due to weakness in supporting evidence.",
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
        message: "This proof is not reliable because external pressure is distorting the structural record.",
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
      title: "Structure not eligible for verification",
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
  const raw = normalizedWeakestDimension || "structural";
  const dimensionLabel =
    raw.charAt(0).toUpperCase() + raw.slice(1);

  if (overallStatus === "Verification Ready") {
    return "✓ This proof meets the criteria for external use.";
  }

  if (overallStatus === "Verification Warning") {
    return `⚠ This proof is internally reviewable but unstable due to: ${dimensionLabel}`;
  }

  return `✕ This proof is not externally valid due to weakness in: ${dimensionLabel}`;
  }

function getMinimalInterventionPoint({ status, weakestDimension = "", checks = [], isEvidenceLockedConsistent = true }) {
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
      title: "Minimal intervention point",
      action: "Return to the last valid structural stage and repair only the broken segment.",
      note: "This is a structural failure. Do not optimize forward. Repair backward from the break point.",
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

function CalibrationCard({ guidance, status, weakestDimension, checks = [], isEvidenceLockedConsistent }) {
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
  });

  return (
    <section className="mt-4 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <h2 className="text-lg font-semibold mb-2">
        🔧 {guidance.title}
      </h2>

      <p className="text-slate-700 mb-4">{guidance.message}</p>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-900 mb-3">
          Main recommendation
        </p>

        <ul className="list-disc pl-5 space-y-2 text-sm text-slate-700">
          {guidance.actions.map((action, index) => (
            <li key={index}>{action}</li>
          ))}
        </ul>
      </div>

      {minimalIntervention && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900 mb-2">
            {minimalIntervention.title}
          </p>

          <p className="text-sm font-semibold text-slate-900 leading-6">
            {minimalIntervention.action}
          </p>

          <p className="mt-2 text-sm text-amber-800 leading-6">
            {minimalIntervention.note}
          </p>
        </div>
      )}

      {alternatives.length > 0 && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowAlternatives((prev) => !prev)}
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
          >
            {showAlternatives ? "Hide alternative paths" : "Show alternative paths"}
          </button>

          {showAlternatives && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900 mb-3">
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
                    <p className="text-sm text-slate-700 leading-6">
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

  const receiptDecisionStatus = receiptContext?.decisionStatus || "";

  const receiptAllowsVerification =
  receiptDecisionStatus === "Eligible for Verification" ||
  receiptDecisionStatus === "Verified" ||
  receiptContext?.overallStatus === "Ready for Review" ||
  receiptContext?.overallStatus === "Verified" ||
  sharedContract?.scoring?.receiptEligible === true ||
  sharedContract?.overallStatus === "Ready for Review" ||
  sharedContract?.overallStatus === "Verified";

  const cameFromIssuedReceipt =
    !!receiptContext &&
    (
      (receiptMode === "case_receipt" && receiptSource === "pilot_case_result") ||
      (receiptMode === "final_receipt" && receiptSource === "pilot_weekly_summary")
    );
  if (!cameFromIssuedReceipt || !receiptAllowsVerification) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 px-6 py-10">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <p className="text-sm font-medium text-slate-500 mb-2">
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
              className="inline-flex items-center justify-center rounded-2xl bg-green-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700"
            >
              Back to Receipt
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

  const resolvedPayload = resolveVerificationPayload(
    routeEnvelope || {},
    receiptContext,
    routeData,
    storedData,
    sharedContract
  );
  const baseData = normalizeVerificationData(resolvedPayload);

  const verificationFlat =
    sharedContract
      ? flattenSharedReceiptVerificationContract(sharedContract)
      : {};

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
    caseData: verificationFlat.caseData || baseData.caseData || resolvedPayload.schema || null,
    weakestDimension:
      shouldPromoteVerificationReady &&
      evaluated.verificationStatus === "Verification Failed"
        ? ""
        : verificationFlat.weakestDimension || baseData.weakestDimension || "",
    displayContext:
      getCaseSummary(verificationFlat) ||
      getCaseContext(verificationFlat) ||
      getCaseSummary(baseData) ||
      getCaseContext(baseData),
    overallStatus: hasVerificationPayload
      ? evaluated.verificationStatus
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

const finalOverallStatus =
  !isEvidenceLockedConsistent
    ? "Verification Failed"
    : data.overallStatus;

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
    data.receiptHash ||
    "Unavailable";

  const displayReceiptHash =
    proofReceiptHash && proofReceiptHash !== "Unavailable"
      ? `${proofReceiptHash.slice(0, 10)}…${proofReceiptHash.slice(-6)}`
      : proofReceiptHash;

  const hasReceiptHash = hasVerificationPayload ? evaluated.hasReceiptHash : false;
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

  const acceptanceReady =
    acceptanceChecklist.every((item) => item.passed) &&
    finalOverallStatus === "Verification Ready";

  const verificationPass =
    finalOverallStatus === "Verification Ready" &&
    isEvidenceLockedConsistent &&
    acceptanceReady;

  const verificationBlock = !verificationPass;

  const canActivateFormalVerification = verificationPass;

  const canShowSubscriptionOptions =
    canActivateFormalVerification &&
    isEvidenceLockedConsistent &&
    hasVerificationPayload;
  
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
      localStorage.setItem("verificationPageData", JSON.stringify(data));
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
  }, [data, sharedContract]);

  React.useEffect(() => {
  const session =
    location.state?.trialSession || getTrialSession() || {};
  const resolvedUserId = session.userId || getStableUserId();

    if (!session?.userId || !session?.trialId) return;
    if (!cameFromIssuedReceipt || !receiptAllowsVerification) return;
    if (verificationViewedLoggedRef.current) return;

    verificationViewedLoggedRef.current = true;

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
        data.receiptId ||
        "verification_entry",
      eventType: "verification_viewed",
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
          data.receiptId ||
          "verification_entry",
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
    finalOverallStatus === "Verification Warning" ||
    finalOverallStatus === "Verification Failed";

  const [modalSource, setModalSource] = useState("verification_cta");

  const handleOpenSubscriptionModal = async (source = "verification_cta") => {
  const session =
    location.state?.trialSession || getTrialSession() || {};
  const resolvedUserId = session.userId || getStableUserId();

    if (resolvedUserId) {
      try {
        await logTrialEvent({
          userId: resolvedUserId,
          trialId: session.trialId,
          caseId: data.receiptId || "verification_entry",
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
    }

    setModalSource(source);
    setShowSubscriptionModal(true);
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
          caseId: data.receiptId || "verification_entry",
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
  <div className="min-h-screen bg-slate-50 text-slate-900 px-4 py-8">
    <div className="max-w-5xl mx-auto">
      <div className="bg-white rounded-[28px] border border-slate-200 shadow-sm p-7 md:p-10 space-y-9">
        <header className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-7">
          <h1 className="text-3xl font-bold mb-3">{data.verificationTitle}</h1>

          <p className="text-slate-700 leading-7 mb-5">
            {data.introText ||
               "This page is the verification layer. It does not repeat receipt eligibility. It determines whether the issued record is externally ready, internally reviewable, or still structurally incomplete."}
          </p>

          <p className="text-sm text-slate-500 leading-6 mb-6">
            {data.weakestDimension
              ? `This proof is first interpreted through your weakest dimension: ${data.weakestDimension}.`
              : data.caseData
              ? "This proof is being interpreted through the current case schema, but no dominant weakest dimension is available."
              : "This proof is interpreted through the structural weak point currently exposed in the record."}
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
              {/* 上排 */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
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
                    Verification Status
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "15px",
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
                      ? "READY · Reviewable and externally usable"
                      : finalOverallStatus === "Verification Warning"
                      ? "WARNING · Internally reviewable only"
                      : "FAILED · Correction required"}
                  </p>
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
                      fontSize: "15px",
                      lineHeight: 1.3,
                      fontWeight: 600,
                      wordBreak: "break-all",
                      color: "#0F172A",
                    }}
                  >
                    {hasVerificationPayload ? data.receiptId : "No live receipt attached"}
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
                      fontSize: "15px",
                      lineHeight: 1.3,
                      fontWeight: 600,
                      color: "#0F172A",
                    }}
                  >
                    {data.verifiedAt || "Not recorded yet"}
                  </p>
                </div>
              </div>
          
              {/* 中间只保留长横线，不要极短线 */}
              <div
                style={{
                  margin: "10px 0 10px 0",
                  height: "1px",
                  backgroundColor: "#CBD5E1",
                }}
              />
          
              {/* 下排 */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  alignItems: "start",
                  columnGap: "0",
                }}
              >
                <div style={{ padding: "2px 16px 2px 6px" }}>
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#64748B",
                      margin: "0 0 6px 0",
                      lineHeight: 1.2,
                    }}
                  >
                    Case Schema
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "14px",
                      lineHeight: 1.3,
                      fontWeight: 600,
                      color: "#0F172A",
                    }}
                  >
                    {data.schemaVersion || "Not attached"}
                  </p>
          
                  {typeof data.structureScoreFromCase === "number" ? (
                    <p
                      style={{
                        margin: "8px 0 0 0",
                        fontSize: "11px",
                        lineHeight: 1.25,
                        color: "#64748B",
                      }}
                    >
                      Structure score: {data.structureScoreFromCase.toFixed(2)}
                    </p>
                  ) : null}
          
                  {data.structureStatusFromCase ? (
                    <p
                      style={{
                        margin: "3px 0 0 0",
                        fontSize: "11px",
                        lineHeight: 1.25,
                        color: "#64748B",
                      }}
                    >
                      Structure status: {data.structureStatusFromCase}
                    </p>
                  ) : null}
                </div>
          
                <div
                  style={{
                    padding: "2px 6px 2px 16px",
                    borderLeft: "1px solid #CBD5E1",
                    minHeight: "72px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
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
                    Case tested
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "14px",
                      lineHeight: 1.3,
                      fontWeight: 600,
                      color: "#0F172A",
                    }}
                  >
                    {data.displayContext || "No structured summary available."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>
        <section
          className="mt-3 p-6 md:p-7 shadow-sm"
          style={{
            width: "calc(100% - 48px)",
            marginLeft: "24px",
            marginRight: "24px",
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
            <div
              style={{
                color: verdictTheme.titleColor,
                fontSize: "22px",
                lineHeight: "1.25",
                fontWeight: 700,
              }}
            >
              {verdictLine}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                border: "1px solid #FCA5A5",       // 淡红框（比底色深一点）
                borderRadius: "12px",
                overflow: "hidden",
                width: "fit-content",
                backgroundColor: "transparent",
              }}
            >
              {[
                hasReceiptHash
                  ? "✓ Receipt Hash verified"
                  : "• Receipt Hash unavailable",

                hasCompleteStructure
                  ? "✓ Structure consistent"
                  : "• Structure sufficient",

                auditReady
                  ? "✓ Ready for review"
                  : "• Review pending",

                isEvidenceLockedConsistent
                  ? "✓ Evidence lock consistent"
                  : "• Evidence lock broken",
              ].map((text, index, arr) => (
                <React.Fragment key={text}>
      
                  {/* 每一块 */}
                  <div
                    style={{
                      padding: "6px 14px",
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#991B1B", // 深红字（跟标题一致）
                      whiteSpace: "nowrap",
                    }}
                  >
                    {text}
                  </div>
            
                  {/* 中间竖线（关键） */}
                  {index < arr.length - 1 && (
                    <div
                      style={{
                        width: "1px",
                        height: "18px",
                        backgroundColor: "#FCA5A5",
                      }}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-3 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2
            className={`text-lg font-semibold mb-2 ${
              finalOverallStatus === "Verification Failed"
                ? "text-red-800"
                : finalOverallStatus === "Verification Warning"
                ? "text-amber-800"
                : "text-emerald-800"
            }`}
          >
            {canActivateFormalVerification
              ? "Externally usable version"
              : finalOverallStatus === "Verification Warning"
              ? "Fastest path to verification pass"
              : "Fastest recovery path"}
          </h2>

          <p
            className={`leading-7 ${
              finalOverallStatus === "Verification Failed"
               ? "text-red-700"
                : finalOverallStatus === "Verification Warning"
                ? "text-amber-700"
                : "text-emerald-700"
            }`}
          >
            {canActivateFormalVerification
              ? "This proof is now strong enough to be used outside your system. Activate the formal version when this decision needs to travel beyond the workspace."
              : !isEvidenceLockedConsistent
              ? "This proof is blocked by a broken evidence chain. Return to the receipt and recover the source of truth before trying to activate anything."
              : finalOverallStatus === "Verification Warning"
              ? "One focused structural fix may be enough to move this result into a fully usable state."
              : "This result is still recoverable, but the next move should be a narrow structural repair instead of a full rewrite."}
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            {canActivateFormalVerification ? (
              <button
                type="button"
                onClick={async () => {
                  const session =
                    location.state?.trialSession || getTrialSession();

                  const resolvedUserId =
                    session?.userId || getStableUserId();

                  if (resolvedUserId) {
                    try {
                      await logTrialEvent({
                        userId: resolvedUserId,
                        trialId: session?.trialId,
                        eventType: "verification_cta_clicked",
                        page: "VerificationPage",
                        caseId: data.receiptId || "verification_entry",
                        meta: {
                          overallStatus: finalOverallStatus,
                          canActivateFormalVerification,
                        },
                      });
                    } catch (e) {}
                  }

                  handleOpenSubscriptionModal("formal_verification_cta");
                }}
                className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
              >
                Activate Formal Verification →
              </button>
            ) : finalOverallStatus === "Verification Warning" ? (
              <button
                type="button"
                onClick={() => handleRecoveryPath("warning_cta")}
                className="inline-flex items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-700 shadow-sm transition hover:bg-amber-100"
              >
                Improve Before Activation →
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleRecoveryPath("failed_cta")}
                className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold transition"
                style={{
                  backgroundColor: "#991B1B",
                  color: "#FFFFFF",
                  borderRadius: "9999px",
                  padding: "10px 18px",
                  boxShadow: "0 4px 10px rgba(153,27,27,0.25)"
                }}
              >
                Recover This Proof Path →
              </button>
            )}
          </div>

          {showRecoveryPanel && !canActivateFormalVerification && (
            <div className="mt-6" ref={recoverySectionRef}>
              <CalibrationCard
                guidance={guidance}
                status={finalOverallStatus}
                weakestDimension={data.weakestDimension || data.caseData?.weakestDimension || ""}
                checks={data.checks}
                isEvidenceLockedConsistent={isEvidenceLockedConsistent}
              />
            </div>
          )}
        </section>

        {!isEvidenceLockedConsistent && (
          <section className="bg-red-50 rounded-2xl border border-red-200 p-6">
            <h2 className="text-lg font-semibold mb-2 text-red-800">
              Verification locked to receipt recovery
            </h2>
            <p className="text-red-700 leading-7">
              This verification view has been downgraded because the evidence lock no longer matches the issued receipt chain.
            </p>
            <p className="mt-3 text-red-700 leading-7">
              Return to the receipt layer to recover the current source of truth before using this proof further.
            </p>
          </section>
        )}
      
        <section className="mt-3 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Aggregated RUN Record</h2>

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
              {/* 左：Summary */}
              <div
                style={{
                  padding: "2px 18px",
                  borderRight: "1px solid #CBD5E1",
                }}
              >
                <p style={{ fontSize: "15px", color: "#64748B", marginBottom: "10px" }}>
                  RUN Summary
                </p>
                <p style={{ fontSize: "18px", fontWeight: 600 }}>
                  {data.runSummaryText || "No aggregated RUN summary available."}
                </p>
              </div>

              {/* 右：RUN entries */}
              <div style={{ padding: "2px 18px" }}>
                <p style={{ fontSize: "15px", color: "#64748B", marginBottom: "10px" }}>
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
                        {entry.runLabel} × {entry.count}
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
            <h2 className="text-xl font-semibold mb-4">Case Schema Snapshot</h2>

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
                      fontSize: "15px",
                      color: "#64748B",
                      margin: "0 0 10px 0",
                    }}
                  >
                    Scenario
                  </p>
                  <p
                    style={{
                      fontSize: "18px",
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
                      fontSize: "15px",
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
                      fontSize: "15px",
                      color: "#64748B",
                      margin: "0 0 10px 0",
                    }}
                  >
                    Confidence
                  </p>
                  <p
                    style={{
                      fontSize: "18px",
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
                      fontSize: "15px",
                      color: "#64748B",
                      margin: "0 0 10px 0",
                    }}
                  >
                    Primary RUN
                  </p>
                  <p
                    style={{
                      fontSize: "18px",
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
          <h2 className="text-xl font-semibold mb-4">What was checked</h2>

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
                fontSize: "15px",
                fontWeight: 600,
                color: "#0F172A",
              }}
            >
              {(() => {
                const warningCount = data.checks.filter((c) => c.status === "warning").length;
                const failedCount = data.checks.filter((c) => c.status === "failed").length;

                if (failedCount > 0) {
                  return `✕ ${failedCount} failure${failedCount > 1 ? "s" : ""} detected. Structural issues must be corrected.`;
                }

                if (warningCount > 0) {
                  return `⚠ ${warningCount} warning${warningCount > 1 ? "s" : ""} detected. Structure is partially complete.`;
                }

                return "✓ All checks passed. Structure is consistent and reviewable.";
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
      
                {/* 标题行 */}
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

                {/* 描述 */}
                <p style={{ color: "#475569", lineHeight: 1.6 }}>
                  {check.detail}
                </p>

                {/* 断开横线（关键） */}
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
            <h2 className="text-xl font-semibold">Verification timeline</h2>

            <button
              type="button"
              onClick={() => setShowTimeline(prev => !prev)}
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
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
                  <p className="text-sm text-slate-500 mb-1">{item.time}</p>
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
              <h2 className="text-xl font-semibold">Ledger-backed proof</h2>
              <p className="mt-1 text-sm text-slate-600">
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
                    fontSize: "18px",
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
                    onClick={() => navigator.clipboard.writeText(proofReceiptHash)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "10px",
                      border: "1px solid #CBD5E1",
                      backgroundColor: "#FFFFFF",
                      padding: "6px 12px",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#334155",
                      whiteSpace: "nowrap",
                      cursor: "pointer",
                    }}
                  >
                    Copy full hash
                  </button>
                </div>
              </div>
            </div>
          </div>

          <p className="mt-4 text-sm text-slate-500 leading-6">
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
            className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 border border-slate-300 shadow-sm transition hover:bg-slate-100"
          >
            Back to Receipt
          </Link>
        </div>

        {showSubscriptionModal && canActivateFormalVerification && (
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
                  {modalSource === "failed_cta"
                    ? "Choose the fastest recovery path"
                    : modalSource === "warning_cta"
                    ? "Choose the fastest path to verification pass"
                    : "Choose how to continue"}
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
                  ×
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
                    Pilot Workspace
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
                    <div>· Unlimited pilot sessions</div>
                    <div>· Unlimited result access</div>
                    <div>· Internal case tracking</div>
                    <div>· Analytics and history</div>
                    <div>· Preview of receipt & verification states</div>
                  </div>
              
                  <div style={{ marginTop: "12px", fontSize: "14px", lineHeight: 1.7, color: "#64748B" }}>
                    <div style={{ fontWeight: 700, marginBottom: "4px" }}>Does not include</div>
                    <div>· Formal Receipt issuance</div>
                    <div>· Formal Verification packages</div>
                    <div>· Exportable proof</div>
                  </div>

                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-2xl border border-green-200 bg-green-50 px-5 py-3 text-sm font-semibold text-green-700 shadow-sm transition hover:bg-green-100"
                    style={{ marginTop: "16px" }}
                  >
                    Start Workspace →
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
                    <div>· Official receipt issuance</div>
                    <div>· Locked case snapshot</div>
                    <div>· Persistent storage</div>
                    <div>· Internal documentation use</div>
                  </div>
              
                  <div style={{ marginTop: "12px", fontSize: "14px", lineHeight: 1.7, color: "#64748B" }}>
                    <div style={{ fontWeight: 700, marginBottom: "4px" }}>Best for</div>
              <div>· Recording key decisions</div>
                    <div>· Internal audits</div>
                    <div>· Case archiving</div>
                  </div>

                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-2xl border border-amber-300 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-800 shadow-sm transition hover:bg-amber-100 hover:border-amber-400"
                    style={{ marginTop: "16px" }}
                  >
                    Activate Receipt →
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
                    Unlock the full verified proof package.
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
                    <div>· Verified outcome</div>
                    <div>· Full proof package</div>
                    <div>· External-use ready result</div>
                    <div>· Portable and shareable format</div>
                  </div>

                  <div style={{ marginTop: "12px", fontSize: "14px", lineHeight: 1.7, color: "#64748B" }}>
                    <div style={{ fontWeight: 700, marginBottom: "4px" }}>Best for</div>
                    <div>· External validation</div>
                    <div>· Compliance / risk proof</div>
                    <div>· High-stakes decisions</div>
                  </div>

                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                    style={{ marginTop: "16px" }}
                  >
                    Activate Verification →
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