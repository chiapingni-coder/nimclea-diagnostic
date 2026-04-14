import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { enrichSignals } from "../signalContentMap.js";
import { getSignalAction } from "../signalActionMap.js";
import { getPilotFocusBySignal } from "../pilotFocusMap.js";
import { ROUTES } from "../routes.js";
import StructurePathSection from "./components/StructurePathSection";
import { getRunRouteMeta } from "./runRoutingMap";
import buildResultSeed from "./resultSeedBuilder";
import { patternRegistry } from "../data/patternRegistry";
import { chainRegistry } from "../data/chainRegistry";
import { getRun } from "../data/stageRunMap";
import { resultStageCopy } from "../data/resultStageCopy";
import { logEvent } from "../utils/eventLogger";
import { mapResultToCaseSchema } from "../utils/schemaMapper";

const STORAGE_KEYS = {
  RESULT: "nimclea_result",
  PREVIEW: "nimclea_preview_result",
  SESSION_ID: "nimclea_session_id",
};

const RUN_TO_STAGE = {
  RUN007: "S1",
  RUN042: "S1",
  RUN044: "S2",
  RUN048: "S2",
  RUN050: "S3",
  RUN052: "S4",
  RUN063: "S3",
  RUN064: "S4",
  RUN065: "S5",
};

function getHeroTitle({ scenarioCode = "", stage = "", primarySignalLabel = "" }) {
  if (stage === "S1") {
    return "Your structure looks usable, but untested paths may still be carrying risk you cannot see yet.";
  }

  if (stage === "S4" || stage === "S5" || scenarioCode === "pre_audit_collapse") {
    return "Your decision path is already showing where it will break when pressure demands proof.";
  }

  if (scenarioCode === "boundary_blur") {
    return "Your workflow still works, but unclear boundaries are already weakening trust under pressure.";
  }

  if (scenarioCode === "barely_functional") {
    return "Your workflow is still moving, but decisions are already being shaped without a clear structure to trace or control them.";
  }

  if (scenarioCode === "fully_ready") {
    return "Your decision path is largely clear, but this is the cheapest moment to validate it before scale adds noise.";
  }

  return "Your decision path is visible now. The next step is to test whether it actually holds in a real workflow.";
}

function getHeroSupportLine({
  scenarioCode = "",
  pressureProfileCode = "",
  weakestDimension = "authority"
}) {
  let baseLine =
    "This result shows where the current path becomes harder to execute, explain, or verify once real pressure appears.";

  if (weakestDimension === "evidence") {
    baseLine =
      "The weakest part of this path is evidence support when proof is required.";
  }

  if (weakestDimension === "coordination") {
    baseLine =
      "The weakest part of this path is coordination across real execution steps, handoffs, and follow-through.";
  }

  if (weakestDimension === "boundary") {
    baseLine =
      "The weakest part of this path is boundary clarity across ownership, approval, and decision responsibility.";
  }

  if (weakestDimension === "authority") {
    baseLine =
      "The weakest part of this path is authority clarity in key steps, approvals, or decision ownership.";
  }

  return baseLine;
}

function getPilotCtaLabel({ scenarioCode = "", stage = "", weakestDimension = "authority" }) {

  if (weakestDimension === "evidence") {
    return "Test evidence flow in a 7-day pilot →";
  }

  if (weakestDimension === "coordination") {
    return "Test coordination path in a 7-day pilot →";
  }

  if (weakestDimension === "boundary") {
    return "Test boundary clarity in a 7-day pilot →";
  }

  if (weakestDimension === "authority") {
    return "Test decision authority in a 7-day pilot →";
  }

  return "Start this path in a 7-day pilot →";
}

function inferWeakestDimension({
  scenarioCode = "",
  pressureProfileCode = "",
  signals = [],
}) {
  const labels = (signals || []).map((s) =>
    String(s?.label || "").toLowerCase()
  );

  const hasEvidence = labels.some((l) => l.includes("evidence") || l.includes("retrieval"));
  const hasBoundary = labels.some((l) => l.includes("boundary") || l.includes("ownership"));
  const hasDefinition = labels.some((l) => l.includes("definition") || l.includes("conflict"));
  const hasHandoff = labels.some((l) => l.includes("handoff") || l.includes("coordination"));

  if (scenarioCode === "pre_audit_collapse") {
    if (hasEvidence) return "evidence";
    if (hasHandoff) return "coordination";
    return "boundary";
  }

  if (scenarioCode === "boundary_blur") {
    if (hasBoundary) return "boundary";
    if (hasHandoff) return "coordination";
    return "authority";
  }

  if (scenarioCode === "barely_functional") {
    if (hasHandoff) return "coordination";
    if (hasDefinition) return "boundary";
    return "authority";
  }

  if (scenarioCode === "fully_ready") {
    if (hasEvidence) return "evidence";
    return "authority";
  }

  return "authority";
}

function getPilotRoutingByWeakestDimension(weakestDimension = "authority") {
  if (weakestDimension === "evidence") {
    return {
      pilotFocusKey: "evidence_fragmentation",
      firstGuidedAction: "Trace where evidence currently lives, and make one proof path visible end to end.",
      firstStepLabel: "Start with evidence retrieval",
    };
  }

  if (weakestDimension === "coordination") {
    return {
      pilotFocusKey: "handoff_integrity_risk",
      firstGuidedAction: "Identify where the workflow breaks across handoffs, teams, or execution follow-through.",
      firstStepLabel: "Start with coordination stability",
    };
  }

  if (weakestDimension === "boundary") {
    return {
      pilotFocusKey: "boundary_clarity_weakness",
      firstGuidedAction: "Clarify who owns the decision path, where ownership blurs, and where boundaries must be reset.",
      firstStepLabel: "Start with boundary clarity",
    };
  }

  return {
    pilotFocusKey: "authority_gap",
    firstGuidedAction: "Clarify who has the authority to decide, approve, or finalize the next structural step.",
    firstStepLabel: "Start with authority clarity",
  };
}

function getPilotCtaMicrocopy({ scenarioCode = "", primarySignalLabel = "", weakestDimension = "authority" }) {
  if (scenarioCode === "pre_audit_collapse") {
    return "If this path holds, it will prove itself. If not, this is exactly where future audit pressure turns into real cost.";
  }

  if (scenarioCode === "boundary_blur") {
    if (weakestDimension === "boundary") {
      return "Use one real workflow to see whether ownership, approval, and decision boundaries actually hold under pressure.";
    }

    if (weakestDimension === "coordination") {
      return "Use one real workflow to see whether coordination across steps and handoffs actually holds under pressure.";
    }

    if (weakestDimension === "authority") {
      return "Use one real workflow to see whether authority is clear enough to support real decisions under pressure.";
    }

    return "Use one real workflow to see whether this path truly holds once pressure tests ownership, decisions, and boundaries.";
  }

  if (scenarioCode === "barely_functional") {
    return `Use one real workflow to see whether ${primarySignalLabel || "hidden coordination cost"} is still doing work that structure should be doing.`;
  }

  if (scenarioCode === "fully_ready") {
    return "Use one real workflow to validate this clarity now, before complexity makes verification slower and noisier.";
  }

  return "Use one real workflow to test whether this path actually holds.";
}

function resolveRun({ scenarioCode = "", primarySignalKey = "", intensityLevel = 3 }) {
  const signal = String(primarySignalKey).toLowerCase();
  const scenario = String(scenarioCode).toLowerCase();
  const level = Number(intensityLevel) || 3;

  // ===== Boundary =====
  if (
    signal.includes("boundary") ||
    scenario === "boundary_blur"
  ) {
    if (level >= 5) return "RUN052";
    if (level >= 4) return "RUN052";
    if (level >= 3) return "RUN050";
    if (level >= 2) return "RUN048";
    return "RUN042";
  }

  // ===== Pre-audit collapse（你当前场景）=====
  if (scenario === "pre_audit_collapse") {
    if (level >= 5) return "RUN065"; // ⭐ S5
    if (level >= 4) return "RUN064";
    if (level >= 3) return "RUN063";
    if (level >= 2) return "RUN044";
    return "RUN007";
  }

  // ===== fallback =====
  if (level >= 5) return "RUN065";
  if (level >= 4) return "RUN064";
  if (level >= 3) return "RUN063";
  if (level >= 2) return "RUN044";
  return "RUN007";
}

function safeParse(jsonString) {
  if (!jsonString) return null;
  try {
    return JSON.parse(jsonString);
  } catch {
    return null;
  }
}

function getStoredResult(sessionId = "") {
  if (typeof window === "undefined") return null;

  const bySession = sessionId
    ? safeParse(localStorage.getItem(`nimclea_result_${sessionId}`))
    : null;

  if (bySession) return bySession;

  const globalResult = safeParse(localStorage.getItem(STORAGE_KEYS.RESULT));
  if (globalResult) return globalResult;

  return null;
}

function getStoredPreview(sessionId = "") {
  if (typeof window === "undefined") return null;

  const bySession = sessionId
    ? safeParse(localStorage.getItem(`nimclea_preview_result_${sessionId}`))
    : null;

  if (bySession) return bySession;

  const globalPreview = safeParse(localStorage.getItem(STORAGE_KEYS.PREVIEW));
  if (globalPreview) return globalPreview;

  return null;
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function createReportId(sessionId = "") {
  if (!sessionId) return "NIM-PREVIEW";
  return `NIM-${String(sessionId).replace(/[^a-zA-Z0-9]/g, "").slice(0, 10).toUpperCase()}`;
}

function isValidPreview(preview) {
  return !!(
    preview &&
    typeof preview === "object" &&
    typeof preview.title === "string" &&
    preview.scenario &&
    typeof preview.scenario.label === "string" &&
    preview.intensity &&
    typeof preview.intensity.label === "string" &&
    Array.isArray(preview.summary) &&
    preview.summary.length > 0 &&
    (
      (Array.isArray(preview.top_signals) && preview.top_signals.length > 0) ||
      (Array.isArray(preview.topSignals) && preview.topSignals.length > 0)
    )
  );
}

function generateSignalExplanation({
  signal,
  scenarioCode,
  subtype,
  pressureProfile
}) {
  const label = signal?.label || "";

  if (label.toLowerCase().includes("evidence")) {
    return "Evidence structure strongly shapes how easy it is to retrieve, verify, and explain work across normal workflows.";
  }

  // ===== Governance / Ownership =====
  if (label.toLowerCase().includes("governance") || label.toLowerCase().includes("ownership")) {
    return "Ownership and decision pathways are an important part of how clearly work can move, especially when action or explanation is required.";
  }

  // ===== Pressure Context =====
  if (label.toLowerCase().includes("pressure")) {
    return "Your processes appear manageable in normal conditions, but once you enter high-pressure situations (audits, deadlines), issues surface rapidly.";
  }

  if (label.toLowerCase().includes("complexity")) {
    return "Workflow complexity affects how easily teams can follow, explain, and sustain execution across steps or systems.";
  }

  // ===== Default fallback =====
  return "This signal indicates a structural pattern that contributes to friction, reduced clarity, or increased effort when operating or explaining results.";
}

function normalizeSignal(signal, index, context = {}) {
  const rawScore =
    typeof signal?.score === "number"
      ? signal.score
      : typeof signal?.impact === "number"
      ? signal.impact
      : null;

  const normalizedScore =
    typeof rawScore === "number" && Number.isFinite(rawScore)
      ? Math.max(0, Math.min(5, Math.round(rawScore)))
      : null;

  return {
    id: signal?.id || signal?.key || signal?.code || `signal-${index + 1}`,
    key: signal?.key || signal?.code || "",
    label: signal?.label || "Structural Signal",
    description:
      signal?.description ||
      signal?.shortText ||
      "Some part of the current operating structure may be creating avoidable effort, delay, or uncertainty.",
    whyThisMatters: signal?.whyThisMatters || "",
    insight:
      signal?.insight ||
      (normalizedScore === 0
        ? "→ This appears to be a relative structural strength in your current workflow."
        : "→ This is likely contributing to your current scenario classification."),
    source: signal?.source || "Diagnostic Engine",
    score: normalizedScore,
  };
}

function generateScenarioSummary({ scenarioCode, subtype, pressureProfile }) {
  const isPressureSensitive =
    pressureProfile?.code === "pressure_sensitive";

  // ===== S1：审计前崩溃型 =====
  if (scenarioCode === "pre_audit_collapse") {
    return [
      "Your workflow shows signs of structural breakdown when evidence needs to be retrieved or explained under pressure.",
      "Critical information appears fragmented, making reconstruction slow, manual, and error-prone during review moments.",
      "This pattern often results in last-minute scrambling, rather than a system that can confidently withstand verification."
    ];
  }

  // ===== S2：勉强能用型 =====
  if (scenarioCode === "barely_functional") {
    return [
      "Your workflow is functional, but still relies on manual effort and hidden coordination to hold together.",
      "Evidence, approvals, or ownership are not consistently structured, which creates friction when results need to be explained.",
      "Under pressure, this can lead to repeated patching rather than a stable, repeatable process."
    ];
  }

  // ===== S3 / S4：boundary_blur（分 subtype）=====
  if (scenarioCode === "boundary_blur") {
    if (subtype === "pressure_fragile") {
      return [
        "Your system works under normal conditions, but becomes unstable when pressure increases.",
        "What appears stable is not yet proven to hold under audit, deadlines, or unexpected checks.",
        "This gap often leads to last-minute fixes, hesitation, or duplicated effort."
      ];
    }

  return [
    "Your system appears to be working, but key boundaries and ownership are not fully clear.",
    "Over time, this creates small inconsistencies that reduce confidence in results.",
    "Without correction, these issues can accumulate and surface under pressure."
  ];
}

  // ===== S5：完全准备好型 =====
  if (scenarioCode === "fully_ready") {
    if (isPressureSensitive) {
      return [
        "Your system is generally well-structured, but still shows sensitivity when operating under pressure.",
        "Most workflows are clear and traceable, though some pathways may require reinforcement for high-stress scenarios.",
        "With minor adjustments, this structure can become consistently resilient across both normal and high-pressure conditions."
      ];
    }

    return [
      "Your workflow appears structured, traceable, and consistent across normal operating conditions.",
      "Evidence, ownership, and decision pathways are clear enough to support verification without heavy manual reconstruction.",
      "This structure is already in a strong position to scale while maintaining clarity and confidence."
    ];
  }

  // ===== fallback =====
  return [
    "Your responses suggest a structural pattern that may benefit from improved clarity and traceability.",
    "Some workflows may rely on implicit knowledge rather than explicit structure.",
    "Improving visibility and consistency can help reduce friction and increase confidence in results."
  ];
}

function generatePilotPlan({ scenarioCode, subtype }) {
  if (scenarioCode === "pre_audit_collapse") {
    return {
      entry: "Start with one workflow where evidence is hardest to retrieve under pressure.",
      actions: [
        "List where evidence currently lives across tools, folders, or people.",
        "Identify the point where reconstruction usually starts breaking.",
        "Create a single visible path for that evidence flow."
      ],
      outcome: "You should see a reduction in last-minute reconstruction effort and clearer verification pathways."
    };
  }

  if (scenarioCode === "barely_functional") {
    return {
      entry: "Start with one workflow that requires repeated manual coordination.",
      actions: [
        "Map who owns each step and where decisions are recorded.",
        "Identify steps that rely on implicit knowledge or reminders.",
        "Make ownership and handoffs explicit in one place."
      ],
      outcome: "You should see fewer coordination loops and more predictable execution."
    };
  }

  if (scenarioCode === "boundary_blur") {
    if (subtype === "pressure_fragile") {
      return {
        entry: "Start with one critical workflow that is most likely to break under pressure.",
        actions: [
          "Observe what becomes unclear under pressure (ownership, data, or decisions).",
          "Mark where hesitation or duplication appears.",
          "Stabilize one boundary (ownership or data source)."
        ],
        outcome: "You should see improved stability when pressure or urgency increases."
      };
    }

    return {
      entry: "Start with a workflow that feels 'mostly working' but unclear at the edges.",
      actions: [
        "Identify where boundaries or ownership feel vague.",
        "Document one workflow end-to-end clearly.",
        "Remove one source of ambiguity."
      ],
      outcome: "You should see clearer responsibility and reduced ambiguity over time."
    };
  }

  if (scenarioCode === "fully_ready") {
    return {
      entry: "Start with a workflow you want to scale or replicate.",
      actions: [
        "Validate that evidence and ownership are traceable without explanation.",
        "Check if a new team member can follow the workflow independently.",
        "Reinforce weak points under simulated pressure."
      ],
      outcome: "You should see consistent execution even as scale or complexity increases."
    };
  }

  return {
    entry: "Start with one workflow where clarity or traceability feels inconsistent.",
    actions: [
      "Identify where information is hard to locate or explain.",
      "Map the current flow of decisions and data.",
      "Clarify one unclear step."
    ],
    outcome: "You should see improved clarity and reduced friction."
  };
}

function generateHeroLine({ scenarioCode, pressureProfile }) {
  const isPressureSensitive =
    pressureProfile?.code === "pressure_sensitive" ||
    pressureProfile?.code === "pressure_fragile";

  if (scenarioCode === "pre_audit_collapse") {
    return "Your structure is not failing randomly. It is breaking where evidence, ownership, and explanation need to hold under pressure.";
  }

  if (scenarioCode === "barely_functional") {
    return "Your system can still operate, but too much of the outcome depends on manual coordination and hidden effort.";
  }

  if (scenarioCode === "boundary_blur") {
    return isPressureSensitive
      ? "Your system works in normal conditions, but becomes fragile when pressure reveals unclear boundaries."
      : "Your system appears functional, but important boundaries and responsibilities are still not fully clear.";
  }

  if (scenarioCode === "fully_ready" || scenarioCode === "C4") {
    return "Your workflow appears structurally clear enough to operate with lower friction and stronger trust.";
  }

  if (scenarioCode === "C1") {
    return "Your workflow shows concentrated structural friction in evidence, judgment, and verification.";
  }

  if (scenarioCode === "C2") {
    return "Your workflow is usable, but clear standardization opportunities are still being left on the table.";
  }

  if (scenarioCode === "C3") {
    return "Your workflow is close to a strong pilot entry point, but still needs one sharp structural use case.";
  }

  return "Your responses point to a real structural pattern, but the sharpest improvement path is still emerging.";
}

function generatePressureLine({ scenarioCode, pressureProfile }) {
  const isPressureSensitive =
    pressureProfile?.code === "pressure_sensitive" ||
    pressureProfile?.code === "pressure_fragile";

  // ===== C1 / 崩溃型 =====
  if (scenarioCode === "pre_audit_collapse" || scenarioCode === "C1") {
    return "When someone asks for proof, things can quickly turn into a scramble.";
  }

  // ===== C2 / 勉强能用 =====
  if (scenarioCode === "barely_functional" || scenarioCode === "C2") {
    return "Things work, but explaining them often takes more effort than it should.";
  }

  // ===== C3 / 边界模糊 =====
  if (scenarioCode === "boundary_blur" || scenarioCode === "C3") {
    return isPressureSensitive
      ? "It works day to day, but under pressure, small gaps start to show."
      : "Most things work, but not everything is as clear as it looks.";
  }

  // ===== C4 / fully_ready =====
  if (scenarioCode === "fully_ready" || scenarioCode === "C4") {
    return isPressureSensitive
      ? "Most things are clear, but a few edge cases may still get messy under pressure."
      : "Things are generally clear, and explanations don’t rely on guesswork.";
  }

  // ===== fallback =====
  return "Some parts of your workflow may be harder to explain than expected.";
}

const SCENARIO_LABEL_MAP = {
  pre_audit_collapse: "Pre-Audit Collapse",
  barely_functional: "Barely Functional",
  boundary_blur: "Boundary Blur",
  fully_ready: "Fully Ready",
  audit_ready: "Audit-Ready",

  C0: "Moderate Fit / Wedge Unclear",
  C1: "Judgment + Evidence Pain",
  C2: "Standardization Opportunity",
  C3: "Pilot-Ready Diagnostic Fit",
  C4: "Stable Structure",
};

const PRESSURE_PROFILE_LABEL_MAP = {
  pressure_sensitive: "Pressure-Sensitive",
  pressure_fragile: "Pressure-Fragile",
  pressure_stable: "Pressure-Stable",
  stable: "Stable",
};

function generateSystemMeaning({ scenarioCode, pressureProfile, signals = [] }) {
  const topLabels = signals
    .slice(0, 3)
    .map((s) => s.label)
    .filter(Boolean);

  if (scenarioCode === "pre_audit_collapse" || scenarioCode === "C1") {
    return [
      "These signals are not isolated issues. They point to a workflow that becomes hard to defend when verification pressure rises.",
      "Evidence, ownership, and reconstruction effort appear too loosely connected.",
      "Manual recovery is currently compensating for missing structure."
    ];
  }

  if (scenarioCode === "barely_functional" || scenarioCode === "C2") {
    return [
      "These signals suggest the workflow still functions, but repeatability depends too much on the right people doing extra coordination.",
      "The structure is usable, but not yet cleanly repeatable.",
      "Standardization here would likely reduce hidden effort more than adding more oversight."
    ];
  }

  if (scenarioCode === "boundary_blur") {
    return [
      "These signals point to a system that looks workable, but becomes less reliable when pressure, ambiguity, or cross-team coordination increase.",
      "The issue is not total breakdown. It is that boundaries, ownership, or evidence pathways are still too soft.",
      "That makes the structure vulnerable to drift, hesitation, and repeated clarification."
    ];
  }

  if (scenarioCode === "fully_ready" || scenarioCode === "C4") {
    return [
      "These signals suggest the structure is relatively clear, with lower friction across ownership, evidence, and execution.",
      "The opportunity here is less about repair and more about preserving clarity as complexity grows.",
      "A small pilot can be used to reinforce strengths rather than fix breakdown."
    ];
  }

  return [
    "These signals point to a real structural pattern rather than a one-off inconvenience.",
    "The strongest opportunity is likely to come from clarifying one recurring workflow rather than trying to improve everything at once.",
    "A narrow pilot is the best way to test whether this pattern can be improved quickly."
  ];
}

function normalizePreview(raw) {
  if (!raw || typeof raw !== "object") return null;

  const extraction = raw?.extraction || raw?.preview?.extraction || {};

  const source =
    raw?.preview && typeof raw.preview === "object" ? raw.preview : raw;

  const scenarioSource =
    raw?.scenario && typeof raw.scenario === "object" ? raw.scenario : {};

  if (!source || typeof source !== "object") return null;

  const scenarioCode =
    source.scenario?.code ||
    source.scenarioCode ||
    source.scenario_code ||
    scenarioSource?.scenarioCode ||
    scenarioSource?.scenario_code ||
    scenarioSource?.code ||
    "unknown_scenario";

  const scenarioSubtype =
    raw?.scenarioSubtype ||
    raw?.scenario_subtype ||
    scenarioSource?.scenarioSubtype ||
    null;

  const TITLE_MAP = {
    pre_audit_collapse: "Structural Breakdown Under Pressure",
    barely_functional: "Operational Friction with Hidden Cost",
    boundary_blur: "Emerging Structure with Unclear Boundaries",
    fully_ready: "Structured and Ready to Scale",
    audit_ready: "Structured and Audit-Ready",

    C0: "Moderate Fit with Unclear Entry Point",
    C1: "Severe Structural Breakdown",
    C2: "Standardization Opportunity Emerging",
    C3: "Ready for Pilot Deployment",
    C4: "Stable Structure with Clear Operating Paths",
  };

const title =
  TITLE_MAP[scenarioCode] ||
  "Your Nimclea Structural Diagnostic";

  const pressureProfileCode =
    scenarioSource?.pressureProfile?.code ||
    scenarioSource?.pressure_profile?.code ||
    source.pressureProfile?.code ||
    source.pressure_profile?.code ||
    source.pressureProfileCode ||
    source.pressure_profile_code ||
    "";

  const rawPressureProfileLabel =
    scenarioSource?.pressureProfile?.label ||
    scenarioSource?.pressure_profile?.label ||
    source.pressureProfile?.label ||
    source.pressure_profile?.label ||
    source.pressureProfileLabel ||
    source.pressure_profile_label ||
    "";

  const pressureProfile = {
    code: pressureProfileCode,
    label:
      PRESSURE_PROFILE_LABEL_MAP[pressureProfileCode] ||
      (typeof rawPressureProfileLabel === "string" && /^[\x00-\x7F\s\-\/]+$/.test(rawPressureProfileLabel)
        ? rawPressureProfileLabel
        : ""),
  };

  const rawScenarioLabel =
    source.scenario?.label ||
    source.scenarioLabel ||
    source.scenarioShortLabel ||
    source.scenario ||
    scenarioSource?.scenarioLabel ||
    scenarioSource?.label ||
    "";

  const scenario = {
    code: scenarioCode,
    label:
      SCENARIO_LABEL_MAP[scenarioCode] ||
      (typeof rawScenarioLabel === "string" && /^[\x00-\x7F\s\-\/]+$/.test(rawScenarioLabel)
        ? rawScenarioLabel
        : "No Dominant Scenario"),
  };

  const signalScores =
    source.signals &&
    typeof source.signals === "object" &&
    !Array.isArray(source.signals)
      ? source.signals
      : raw.signals &&
        typeof raw.signals === "object" &&
        !Array.isArray(raw.signals)
      ? raw.signals
      : {};

  const maxSignalScore =
    Object.values(signalScores)
      .filter((value) => typeof value === "number" && Number.isFinite(value))
      .sort((a, b) => b - a)[0] ?? null;

  const rawLevel =
    typeof source.intensity?.level === "number"
      ? source.intensity.level
      : typeof source.intensity === "number"
      ? source.intensity
      : typeof source.intensity_score === "number"
      ? source.intensity_score
      : typeof maxSignalScore === "number"
      ? Math.max(1, Math.min(5, Math.round((maxSignalScore / 6) * 5)))
      : null;

  const boundedLevelFromRaw =
    typeof rawLevel === "number" && Number.isFinite(rawLevel)
      ? Math.max(1, Math.min(5, Math.round(rawLevel)))
      : null;

  const boundedLevel =
    boundedLevelFromRaw ??
    (scenarioCode === "pre_audit_collapse"
      ? 5
      : scenarioCode === "audit_ready"
      ? 1
      : scenarioCode === "barely_functional"
      ? 3
      : null);

  const rawIntensityLabel =
    source.intensity?.label ||
    source.intensityLabel ||
    "";

  const intensity = {
    level: boundedLevel,
    label:
      (typeof rawIntensityLabel === "string" &&
      /^[\x00-\x7F\s\-\/]+$/.test(rawIntensityLabel)
        ? rawIntensityLabel
        : "") ||
      (boundedLevel >= 4
        ? "High Structural Intensity"
        : boundedLevel === 3
        ? "Moderate Structural Intensity"
        : boundedLevel >= 1
        ? "Emerging Structural Intensity"
        : "Unknown Intensity"),
  };

  const summaryFromStrongestTexts = toArray(source.strongestSignalTexts)
    .filter(Boolean)
    .slice(0, 3);

  const summary = toArray(source.summary).filter(Boolean).slice(0, 3);

  const scenarioFallbackSummary =
    scenarioCode === "pre_audit_collapse"
      ? [
          source.explanation ||
            "Your responses point to a workflow that starts breaking down under review pressure, especially when evidence must be retrieved, explained, or reconstructed quickly.",
          source.validationNote ||
            "This pattern usually shows up as last-minute scrambling, fragmented proof paths, and repeated manual reconstruction before an audit, review, or delivery checkpoint.",
          "Nimclea can help stabilize those pathways before pressure turns into operational failure.",
        ]
      : scenarioCode === "audit_ready"
      ? [
          source.explanation ||
            "Your responses suggest the current operating structure is relatively clear, repeatable, and easier to verify than average.",
          source.validationNote ||
            "Evidence, ownership, and process handoffs appear more legible, which lowers the chance of audit stress or repeated manual cleanup.",
          "Nimclea can help preserve that clarity and make the structure even more resilient as complexity grows.",
        ]
      : [
          source.explanation ||
            "Your responses suggest the workflow is usable, but still carries structural friction in how evidence, approvals, or cross-team coordination are handled.",
          source.validationNote ||
            "This usually means the work can get done, but with avoidable effort, patching, or uncertainty when results need to be explained or verified.",
          "Nimclea can help make those pathways more visible, more consistent, and easier to trust.",
        ];

const generatedSummary = generateScenarioSummary({
  scenarioCode,
  subtype: scenarioSubtype,
  pressureProfile
});

const normalizedSummary =
  summary.length > 0
    ? summary
    : generatedSummary;

const rawTopSignals =
  toArray(source.top_signals).length > 0
    ? toArray(source.top_signals)
    : toArray(source.topSignals).length > 0
    ? toArray(source.topSignals)
    : Array.isArray(source.signals)
    ? source.signals
    : toArray(source.strongestSignals).length > 0
    ? toArray(source.strongestSignals)
    : Array.isArray(raw.signals)
    ? raw.signals
    : [];

const topSignals = enrichSignals(
  rawTopSignals
    .filter(Boolean)
    .slice(0, 4)
    .map((signal, index) =>
      normalizeSignal(signal, index, {
        scenarioCode,
        subtype: scenarioSubtype,
        pressureProfile
      })
    )
);

const fallbackSignals =
  scenarioCode === "pre_audit_collapse"
    ? [
        {
          id: "signal-1",
          key: "evidence_fragmentation",
          label: "Evidence Fragmentation",
          description:
            "Critical evidence appears difficult to retrieve, reconstruct, or verify quickly under pressure.",
          insight: "→ This is likely contributing to your current scenario classification.",
          source: "Diagnostic Engine",
          score: boundedLevel || 5,
        },
        {
          id: "signal-2",
          key: "evidence_search_chaos",
          label: "Evidence Search Chaos",
          description:
            "Teams may not share a reliable first place to look when evidence is needed, increasing reconstruction effort.",
          insight: "→ This is likely contributing to your current scenario classification.",
          source: "Diagnostic Engine",
          score: boundedLevel || 5,
        },
        {
          id: "signal-3",
          key: "retrieval_friction",
          label: "Retrieval Friction",
          description:
            "Key evidence may be slow to locate when verification or audit pressure increases.",
          insight: "→ This is likely contributing to your current scenario classification.",
          source: "Diagnostic Engine",
          score: boundedLevel || 4,
        },
      ]
    : scenarioCode === "barely_functional"
    ? [
        {
          id: "signal-1",
          key: "evidence_fragmentation",
          label: "Evidence Fragmentation",
          description:
            "Supporting evidence is still usable, but remains harder to retrieve and align than it should be.",
          insight: "→ This is likely contributing to your current scenario classification.",
          source: "Diagnostic Engine",
          score: boundedLevel || 2,
        },
        {
          id: "signal-2",
          key: "retrieval_friction",
          label: "Retrieval Friction",
          description:
            "Verification and explanation still require avoidable manual effort in day-to-day work.",
          insight: "→ This is likely contributing to your current scenario classification.",
          source: "Diagnostic Engine",
          score: boundedLevel || 2,
        },
        {
          id: "signal-3",
          key: "hidden_process_debt",
          label: "Hidden Process Debt",
          description:
            "Manual workarounds may be masking structural debt in how results are assembled and reviewed.",
          insight: "→ This is likely contributing to your current scenario classification.",
          source: "Diagnostic Engine",
          score: boundedLevel || 2,
        },
      ]
    : scenarioCode === "boundary_blur"
    ? [
        {
          id: "signal-1",
          key: "boundary_clarity_weakness",
          label: "Boundary Clarity Weakness",
          description:
            "Team boundaries and responsibilities may be contributing to coordination ambiguity.",
          insight: "→ This is likely contributing to your current scenario classification.",
          source: "Diagnostic Engine",
          score: boundedLevel || 2,
        },
        {
          id: "signal-2",
          key: "definition_conflict",
          label: "Definition Conflict",
          description:
            "Shared meaning around important outputs may be less stable than it appears.",
          insight: "→ This is likely contributing to your current scenario classification.",
          source: "Diagnostic Engine",
          score: boundedLevel || 2,
        },
        {
          id: "signal-3",
          key: "handoff_integrity_risk",
          label: "Handoff Integrity Risk",
          description:
            "The way work moves across teams may not be clear enough to prevent drift.",
          insight: "→ This is likely contributing to your current scenario classification.",
          source: "Diagnostic Engine",
          score: boundedLevel || 2,
        },
      ]
    : scenarioCode === "fully_ready" || scenarioCode === "C4"
    ? [
        {
          id: "signal-1",
          key: "operational_clarity",
          label: "Operational Clarity",
          description:
            "The current structure appears relatively clear, traceable, and easier to verify across normal operating conditions.",
          insight: "→ This is likely contributing to your current scenario classification.",
          source: "Diagnostic Engine",
          score: 1,
        },
        {
          id: "signal-2",
          key: "stable_ownership_paths",
          label: "Stable Ownership Paths",
          description:
            "Responsibilities and handoffs appear more stable and explicit than average.",
          insight: "→ This is likely contributing to your current scenario classification.",
          source: "Diagnostic Engine",
          score: 1,
        },
        {
          id: "signal-3",
          key: "low_structural_friction",
          label: "Low Structural Friction",
          description:
            "The current workflow appears to require less manual reconstruction and fewer corrective loops.",
          insight: "→ This is likely contributing to your current scenario classification.",
          source: "Diagnostic Engine",
          score: 1,
        },
      ]
    : [
        {
          id: "signal-1",
          key: "structural_friction",
          label: "Structural Friction",
          description:
            "Some part of the current operating structure may be creating avoidable effort, delay, or uncertainty when results need to be explained or verified.",
          insight: "→ This is likely contributing to your current scenario classification.",
          source: "Diagnostic Engine",
          score: boundedLevel || 3,
        },
      ];

const normalizedSignals =
  topSignals.length > 0 ? topSignals : enrichSignals(fallbackSignals);

const actionReadySignals = normalizedSignals.map((signal) => {
  const action = getSignalAction(signal.key || signal.label || "");

  return {
    ...signal,
    recommendedAction: action.recommendedAction,
    whyThisAction: action.whyThisAction,
    expectedShift: action.expectedShift,
    pilotStep: action.pilotStep
  };
});

  const synthesis = generateSystemMeaning({
    scenarioCode,
    pressureProfile,
    signals: actionReadySignals,
  });

  const pilotPlan = generatePilotPlan({
    scenarioCode,
    subtype: scenarioSubtype
  });

  const deliverables = toArray(source.pilot_preview?.deliverables)
    .filter(Boolean)
    .slice(0, 6);

  const pilotSteps = toArray(source.pilot_preview?.next_steps)
    .filter(Boolean)
    .slice(0, 4);

  const pilot_preview = {
    entry: pilotPlan.entry,
    actions: pilotPlan.actions,
    outcome: pilotPlan.outcome,

    deliverables:
      deliverables.length > 0
        ? deliverables
        : [
            "Workflow Visibility Map",
            "Evidence Flow Review",
            "Ownership Friction Scan",
            "Priority Signal Summary",
          ],

    next_steps:
      pilotSteps.length > 0
        ? pilotSteps
        : [
            "Review the strongest structural signals",
            "Clarify where evidence and decisions currently live",
            "Identify one workflow with the highest operational friction",
          ],

    cta_label: source.pilot_preview?.cta_label || "Start my 7-Day Pilot →",
  };

  return {
    title,
    scenario,
    intensity,
    pressureProfile,
    summary: normalizedSummary,
    synthesis,
    top_signals: actionReadySignals,
    pilot_preview,

    extraction,

    // ⭐ Day 5.1 核心（保留链路）
    stage: raw?.stage || source?.stage || null,
    chainId: raw?.chainId || source?.chainId || null,
  };
}

function Card({ children, className = "" }) {
  return (
    <section
      className={`rounded-3xl border border-slate-200/70 bg-white shadow-sm ${className}`}
    >
      {children}
    </section>
  );
}

function SectionTitle({
  title,
  hint,
  right,
  titleClassName = "",
  hintClassName = "",
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2
          className={`text-lg font-semibold tracking-tight text-slate-950 ${titleClassName}`}
        >
          {title}
        </h2>
        {hint ? (
          <p
            className={`mt-1 text-sm leading-6 text-slate-500 ${hintClassName}`}
          >
            {hint}
          </p>
        ) : null}
      </div>
      {right ? <div>{right}</div> : null}
    </div>
  );
}

function CollapsibleCard({
  title,
  hint,
  children,
  defaultOpen = false,
  closedLabel = "Why this result",
  openLabel = "Hide explanation",
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card className="p-6 md:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-950">
            {title}
          </h2>
          {hint ? (
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {hint}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="shrink-0 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          {open ? openLabel : closedLabel}
        </button>
      </div>

      {open ? <div className="mt-6 pb-2">{children}</div> : null}
    </Card>
  );
}

function Pill({ children, dark = false, success = false }) {
  const cls = success
    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
    : dark
    ? "bg-amber-50 text-amber-700 border border-amber-200"
    : "bg-white text-slate-700 border border-slate-200";

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${cls}`}
    >
      {children}
    </span>
  );
}

function IntensityBars({ level }) {
  const safeLevel =
    typeof level === "number" && Number.isFinite(level)
      ? Math.max(1, Math.min(5, level))
      : 3;

  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3, 4, 5].map((item) => (
        <div
          key={item}
          className={`h-2 w-10 rounded-full transition-all md:w-14 ${
            item <= safeLevel ? "bg-slate-950" : "bg-slate-200"
          }`}
        />
      ))}
    </div>
  );
}

function ReportHero({
  result,
  sessionId,
  onStartPilot,
  heroTitle,
  heroSupportLine,
  pilotCtaLabel,
  pilotCtaMicrocopy,
  weakestDimension,
}) {

  const reportId = useMemo(() => createReportId(sessionId), [sessionId]);
  const dateText = useMemo(
    () =>
      new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    []
  );

  const heroLine = useMemo(
    () =>
      generateHeroLine({
        scenarioCode: result?.scenario?.code,
        pressureProfile: result?.pressureProfile,
      }),
    [result]
  );

  const pressureLine = useMemo(
    () =>
      generatePressureLine({
        scenarioCode: result?.scenario?.code,
        pressureProfile: result?.pressureProfile,
      }),
    [result]
  );

  const primarySignalLabel =
    result?.top_signals?.[0]?.label || "Structural Signal";

  const ctaLabel = pilotCtaLabel || result?.pilot_preview?.cta_label || "Start my 7-Day Pilot →";

  return (
    <Card className="overflow-hidden">
      <div className="p-8 md:p-10">
        <div className="flex flex-wrap items-center gap-2">
          <Pill success>Nimclea Diagnostic Preview</Pill>
          {result.scenario?.label ? <Pill>{result.scenario.label}</Pill> : null}
          {result.pressureProfile?.label ? (
            <Pill dark>{result.pressureProfile.label}</Pill>
          ) : result.intensity?.label ? (
            <Pill dark>{result.intensity.label}</Pill>
          ) : null}
        </div>

        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950 md:text-5xl">
          {heroTitle}
        </h1>

        <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-800">
          {heroSupportLine}
        </p>

        <p className="mt-2 text-xs text-slate-500">
          This path is first interpreted through your weakest dimension: {weakestDimension}.
        </p>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          {pressureLine}
        </p>

        <p className="mt-4 max-w-2xl text-sm text-slate-600">
          {pilotCtaMicrocopy}
        </p>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Dominant Scenario
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-900">
              {result?.scenario?.label || "No Dominant Scenario"}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Primary Signal
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-900">
              {primarySignalLabel}
            </div>
          </div>

          <div className="flex flex-col items-start justify-center p-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              NEXT STEP
            </div>

            <button
              type="button"
              onClick={onStartPilot}
              className="mt-3 inline-flex items-center justify-center"
              style={{
                backgroundColor: "#047857",
                color: "#ffffff",
                border: "none",
                borderRadius: "9999px",
                padding: "14px 28px",
                fontSize: "16px",
                fontWeight: 600,
                lineHeight: 1,
                boxShadow: "0 4px 12px rgba(5, 150, 105, 0.22)",
                cursor: "pointer",
                appearance: "none",
                WebkitAppearance: "none"
              }}
            >
              {ctaLabel}
            </button>
          </div>
        </div>

        <div className="mt-8">
          <IntensityBars level={result.intensity?.level} />
          <div className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Intensity Level{" "}
            <span className="text-slate-900">
              {result.intensity?.level || "—"} / 5
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-8 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        <span>Report ID: {reportId}</span>
        <span>Generated on {dateText}</span>
      </div>
    </Card>
  );
}

function SummarySection({ summary }) {
  if (!summary || summary.length === 0) return null;

  return (
    <CollapsibleCard
      title="Why this result shows up"
      hint="This is not just a description of a problem. It shows the path that is now ready to be tested."
      defaultOpen={false}
      closedLabel="See why this matches your situation"
      openLabel="Hide details"
    >
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
        <p className="text-sm leading-7 text-slate-700">
          Your responses do not just describe a problem. They show a repeatable structure that will keep producing the same pressure until it is tested in one real workflow.
        </p>
      </div>
    </CollapsibleCard>
  );
}

function SynthesisSection({ items }) {
  if (!items || items.length === 0) return null;

  return (
    <CollapsibleCard
      title="What this means for your decision path"
      hint="This shows where your current structure will slow you down, break, or become more expensive to defend."
      defaultOpen={false}
      closedLabel="What this means in practice"
      openLabel="Hide details"
    >
      <div className="rounded-2xl border border-violet-200 bg-violet-50 px-5 py-4">
        <p className="text-sm leading-7 text-violet-900">
          This is the point where a 7-day pilot becomes useful: not because you need more analysis, but because you need to see whether this path actually holds in reality.
        </p>
      </div>
    </CollapsibleCard>
  );
}

function SignalScoreBadge({ score }) {
  if (typeof score !== "number") {
    return (
      <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-500">
        Signal
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end">
      <span className="text-lg font-black text-slate-950">{score}</span>
      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
        Impact
      </span>
    </div>
  );
}

function SignalDetailCard({ signal, index, onStartPilot }) {
  const [open, setOpen] = useState(false);

  return (
    <li className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 md:px-5">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-6 rounded-2xl bg-transparent px-2 py-1 text-left"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900">
              {signal.label}
            </h3>
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500">
              Signal {index + 1}
            </span>
          </div>

          <p className="mt-2 text-sm leading-6 text-slate-700">
            {signal.description}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3 self-center">
          <SignalScoreBadge score={signal.score} />
          <span className="inline-flex h-10 items-center justify-center rounded-full border border-slate-300 bg-white px-4 text-[11px] font-semibold text-slate-700">
            {open ? "Hide" : "Open"}
          </span>
        </div>
      </button>

      {open ? (
        <div className="border-t border-slate-200 px-5 pb-5 pt-4">
          {signal.whyYou ? (
            <div className="mt-3 rounded-2xl border border-sky-200 bg-sky-50 px-3 py-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-700">
                What your answers are pointing to
              </div>
              <p className="mt-1 text-xs leading-5 text-sky-800">
                {typeof signal.whyYou === "string" ? (
                  <>Based on how you answered, {signal.whyYou}</>
                ) : (
                  <>
                    Based on how you answered, it looks like {signal.whyYou?.pattern}
                      {signal.whyYou?.contrast ? (
                      <> rather than {signal.whyYou.contrast}</>
                    ) : null}
                    .
                  </>
                )}
              </p>
            </div>
          ) : null}

          {signal.realWorld ? (
            <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-3 py-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                What this looks like in practice
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-700">
                {signal.realWorld}
              </p>
            </div>
          ) : null}

          {signal.whyThisMatters ? (
            <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-700">
                Why this matters
              </div>
              <p className="mt-1 text-xs leading-5 text-amber-800">
                {signal.whyThisMatters}
              </p>
            </div>
          ) : null}

          {signal.recommendedAction ? (
            <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
                Recommended action
              </div>
              <p className="mt-1 text-xs leading-5 text-emerald-800">
                {signal.recommendedAction}
              </p>
            </div>
          ) : null}

          {signal.pilotStep ? (
            <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-3 py-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                Pilot step
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-700">
                {signal.pilotStep}
              </p>
            </div>
          ) : null}

          {signal.pilotMetric ? (
            <div className="mt-3 rounded-2xl border border-fuchsia-200 bg-fuchsia-50 px-3 py-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fuchsia-700">
                Pilot metric
              </div>
              <p className="mt-1 text-xs leading-5 text-fuchsia-800">
                {signal.pilotMetric}
              </p>
            </div>
          ) : null}

          {signal.insight ? (
            <p className="mt-3 text-xs leading-5 text-slate-600">
              {signal.insight}
            </p>
          ) : null}

          <div className="mt-3 text-xs font-medium text-slate-500">
            Source: {signal.source || "Diagnostic Engine"}
          </div>

          {onStartPilot ? (
            <div className="mt-4">
          
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

function SignalsSection({ signals, onStartPilot }) {
  if (!signals || signals.length === 0) return null;

  return (
    <CollapsibleCard
      title="Where this path starts to break"
      hint="These signals show what is already making work harder to retrieve, explain, or verify under real conditions."
      defaultOpen={false}
      closedLabel="See the specific issues"
      openLabel="Hide issues"
    >
      <ul className="mt-6 space-y-4">
        {signals.map((signal, index) => (
          <SignalDetailCard
            key={signal.id || `${signal.label}-${index}`}
            signal={signal}
            index={index}
            onStartPilot={onStartPilot}
          />
        ))}
      </ul>
    </CollapsibleCard>
  );
}

function getPilotTriggerCopy(scenarioCode, weakestDimension) {
  const copyMap = {
    pre_audit_collapse: {
      label: "Act Before Pressure Wins",
      title: weakestDimension === "evidence"
        ? "This path is already showing weak evidence support under pressure."
        : "This structure is already under pressure and needs to be tested in reality.",
      body1:
        "You already have enough signal to know this is not random friction. The structure is showing where it breaks when retrieval, explanation, or proof are required.",
      body2:
        "Use one real workflow in a 7-day pilot now, before this same structure demands more explanation, more repair, and more manual coordination later.",
      footer: "One workflow. 7 days. No rollout. Real validation.",
    },

    barely_functional: {
      label: "Move Before It Drifts",
      title: "This still works, but waiting will make the hidden coordination cost harder to unwind.",
      body1:
        "The workflow is holding together, but too much of that stability may still depend on manual coordination, reminders, or repeated explanation.",
      body2:
        "Run one real workflow through a 7-day pilot now, before hidden effort hardens into a more expensive operating habit.",
      footer: "One workflow. 7 days. No rollout.",
    },

    boundary_blur: {
      label: "Decision Point",
      title: weakestDimension === "boundary"
        ? "Things still work, but boundary clarity across ownership and decisions is already weakening under pressure."
        : weakestDimension === "coordination"
        ? "Things still work, but coordination across steps, handoffs, and execution is already starting to drift."
        : weakestDimension === "authority"
        ? "Things still work, but authority is not yet clear enough to keep the path stable under pressure."
        : "Things still work, but unclear boundaries become more expensive the longer they stay untested.",
      body1:
        "You may find yourself re-explaining decisions, clarifying ownership, or double-checking what should already be clear.",
      body2:
         "Run one real workflow through a 7-day pilot now, while the cost of clarifying ownership, authority, data, and decisions is still low.",
      footer: "Just one workflow. 7 days. No rollout.",
    },

    fully_ready: {
      label: "Pilot Opportunity",
      title: "This is the cheapest moment to validate the path before scale adds more complexity.",
      body1:
        "Your workflow already feels relatively clear and structured. The next step is to confirm it holds under real conditions, not just in theory.",
      body2:
        "Run one real workflow through a 7-day pilot now, before scale makes validation slower, noisier, and more expensive.",
      footer: "Lightweight pilot. 7 days. Real-world validation.",
    },
  };

  return copyMap[scenarioCode] || copyMap.boundary_blur;
}

function PilotTriggerCard({
  onStartPilot,
  scenarioCode,
  ctaState,
  ctaLabel,
  weakestDimension
}) {
  const copy = getPilotTriggerCopy(scenarioCode, weakestDimension);

  return (
    <Card className="border-amber-200 bg-amber-50 p-6 md:p-7">
      <div className="space-y-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
            {copy.label}
          </div>

          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
            {copy.title}
          </h2>

          <p className="mt-3 text-sm leading-7 text-slate-700">
            {copy.body1}
          </p>

          <p className="mt-2 text-sm leading-7 text-slate-700">
            {copy.body2}
          </p>

          <p className="mt-2 text-xs leading-6 text-slate-500">
            {copy.footer}
          </p>
        </div>

        <div className="mt-4">
          <p className="mt-3 text-xs text-slate-500">
            This is not a theoretical suggestion. This is the exact path that will either hold or break in your next real workflow.
          </p>

          <p className="mt-3 max-w-xl text-xs leading-5 text-slate-500">
            Delaying this test usually increases explanation effort, repair work, and coordination cost.
          </p>

          <p className="mt-4 text-xs font-semibold text-amber-700">
            This is the lowest-cost moment to test this.
          </p>

          <button
            type="button"
            onClick={onStartPilot}
            className="mt-5 inline-flex items-center justify-center rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            {ctaLabel || "Test this path in a 7-day pilot →"}
          </button>
        </div>
      </div>
    </Card>
  );
}

function getButtonClass(ctaState) {
  if (ctaState === "ready") {
    return "rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition-all duration-150 hover:bg-emerald-700 hover:scale-[1.04] hover:-translate-y-0.5 hover:shadow-lg";
  }

  if (ctaState === "warm") {
    return "rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition-all duration-150 hover:bg-emerald-600 hover:scale-[1.04] hover:-translate-y-0.5 hover:shadow-lg";
  }

  return "rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition-all duration-150 hover:bg-slate-800 hover:scale-[1.02]";
}

function PilotSection({ pilotPreview, pilotFocus }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="px-8 py-10 md:px-10 md:py-11">
        <SectionTitle
          title="Start a 7-day controlled pilot"
          titleClassName="text-slate-950 text-xl"
          hintClassName="text-slate-500"
          hint="One workflow. Seven days. Controlled test."
        />

        {pilotFocus && (
          <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
              Pilot Focus
            </div>

            <h3 className="mt-2 text-base font-semibold text-emerald-900">
              {pilotFocus.title}
            </h3>

            <ul className="mt-3 space-y-1.5 text-sm leading-6 text-emerald-900">
              {pilotFocus.bullets?.slice(0, 3).map((item, index) => (
                <li key={index}>• {item}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="min-w-0">
            <div className="h-full rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                What this pilot is
              </div>
              <div className="mt-2 text-sm leading-7 text-slate-700">
                A controlled 7-day test using one real workflow.
              </div>
            </div>
          </div>

          <div className="min-w-0">
            <div className="h-full rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                What Nimclea will test
              </div>
              <div className="mt-2 text-sm leading-7 text-slate-700">
                Whether one decision becomes easier to explain, verify, and control.
              </div>
            </div>
          </div>

          <div className="min-w-0">
            <div className="h-full rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                What you are not committing to
              </div>
              <div className="mt-2 text-sm leading-7 text-slate-700">
                Not a rollout. Just one short pilot.
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="min-w-0">
            <div className="h-full rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Where to start
              </div>
              <div className="mt-2 text-sm leading-7 text-slate-900">
                {pilotPreview.entry}
              </div>
           </div>
          </div>

          <div className="min-w-0 md:col-span-2">
            <div className="h-full rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                What to do
              </div>
              <ul className="mt-2 space-y-2 text-sm leading-7 text-slate-700">
                {pilotPreview.actions.map((step, i) => (
                  <li key={i}>• {step}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="min-w-0 md:col-span-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                What you'll see
              </div>
              <div className="mt-2 text-sm leading-7 text-slate-700">
                {pilotPreview.outcome}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <div className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-600">
            Deliverables
          </div>

          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {pilotPreview.deliverables.map((item, index) => (
              <li
                key={`${item}-${index}`}
                className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800"
              >
                <span className="mt-1 inline-block h-2.5 w-2.5 rounded-full bg-slate-900" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <div className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-600">
            Suggested Next Steps
          </div>

          <div className="mt-5 space-y-4">
            {pilotPreview.next_steps.map((step, index) => (
              <div key={`${step}-${index}`} className="flex gap-4">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-700">
                  {index + 1}
                </div>
                <p className="text-sm leading-7 text-slate-700">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function LoadingState() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="h-5 w-44 animate-pulse rounded bg-slate-200" />
            <div className="mt-5 h-10 w-3/4 animate-pulse rounded bg-slate-100" />
            <div className="mt-4 h-4 w-full animate-pulse rounded bg-slate-100" />
            <div className="mt-3 h-4 w-2/3 animate-pulse rounded bg-slate-100" />
            <div className="mt-8 flex gap-2">
              <div className="h-2 w-10 animate-pulse rounded bg-slate-200 md:w-14" />
              <div className="h-2 w-10 animate-pulse rounded bg-slate-200 md:w-14" />
              <div className="h-2 w-10 animate-pulse rounded bg-slate-200 md:w-14" />
              <div className="h-2 w-10 animate-pulse rounded bg-slate-200 md:w-14" />
              <div className="h-2 w-10 animate-pulse rounded bg-slate-200 md:w-14" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="h-40 animate-pulse rounded-3xl border border-slate-200 bg-white shadow-sm" />
            <div className="h-40 animate-pulse rounded-3xl border border-slate-200 bg-white shadow-sm" />
            <div className="h-40 animate-pulse rounded-3xl border border-slate-200 bg-white shadow-sm" />
          </div>

          <div className="h-64 animate-pulse rounded-3xl border border-slate-200 bg-white shadow-sm" />
          <div className="h-72 animate-pulse rounded-3xl border border-slate-200 bg-white shadow-sm" />
        </div>
      </div>
    </main>
  );
}

function ErrorState({ message, onRetry, onRestart }) {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Card className="p-8">
          <h1 className="text-2xl font-semibold text-slate-950">
            We couldn’t load the diagnostic preview
          </h1>

          <p className="mt-3 text-sm leading-7 text-slate-600">{message}</p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onRetry}
              className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Retry
            </button>

            <button
              type="button"
              onClick={onRestart}
              className="rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
            >
              Start again
            </button>
          </div>
        </Card>
      </div>
    </main>
  );
}

function EmptyState({ onRestart }) {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Card className="p-8">
          <h1 className="text-2xl font-semibold text-slate-950">
            No diagnostic result yet
          </h1>

          <p className="mt-3 text-sm leading-7 text-slate-600">
            Complete the questionnaire first, then return here to view your
            structural diagnostic preview.
          </p>

          <div className="mt-6">
            <button
              type="button"
              onClick={onRestart}
              className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Go to questionnaire
            </button>
          </div>
        </Card>
      </div>
    </main>
  );
}

export default function ResultPage({
  result: resultProp = null,
  sessionId: sessionIdProp = "",
  onRestart: onRestartProp,
  onStartPilot: onStartPilotProp,
}) {
  useEffect(() => {
    logEvent("result_viewed");
  }, []);
  
  const navigate = useNavigate();
  const location = useLocation();
  const [ctaState, setCtaState] = useState("default"); // default | warm | ready

  const isLikelyResultPayload = (value) =>
    !!(
      value &&
      typeof value === "object" &&
      (
        (value.preview && value.scenario) ||
        value.preview ||
        value.scenario ||
        value.scenarioCode ||
        value.scenarioTitle ||
        value.strongestSignals ||
        value.signals
      )
    );

  const isLikelyPreviewObject = (value) =>
    !!(
      value &&
      typeof value === "object" &&
      typeof value.title === "string" &&
      value.scenario &&
      typeof value.scenario === "object" &&
      Array.isArray(value.summary) &&
      (
        Array.isArray(value.top_signals) ||
        Array.isArray(value.topSignals)
      )
    );

  const resolvedSessionId =
    sessionIdProp ||
      location.state?.session_id ||
      location.state?.sessionId ||
      (typeof window !== "undefined"
        ? localStorage.getItem(STORAGE_KEYS.SESSION_ID)
        : "") ||
      "";

  const resultFromLocation =
    isLikelyResultPayload(location.state?.result)
      ? location.state.result
      : isLikelyResultPayload(location.state)
      ? location.state
      : null;

  const previewFromLocation =
    isLikelyPreviewObject(location.state?.preview)
      ? location.state.preview
      : isLikelyResultPayload(location.state?.preview)
      ? location.state.preview
      : isLikelyPreviewObject(location.state)
      ? location.state
      : null;

  const initialPreview = useMemo(() => {
    const rawFromProp = resultProp || null;
    const rawFromLocationResult = resultFromLocation || null;
    const rawFromLocationPreview = previewFromLocation || null;
    const rawFromStorageResult = getStoredResult(resolvedSessionId);
    const rawFromStoragePreview = getStoredPreview(resolvedSessionId);

    const raw =
      rawFromProp ||
      rawFromLocationResult ||
      rawFromLocationPreview ||
      rawFromStorageResult ||
      rawFromStoragePreview ||
      null;

    console.log("🔥 raw before normalize:", raw);

    const normalized = normalizePreview(raw);

    console.log("🧠 extraction after normalize:", normalized?.extraction);

    return normalized;
  }, [resultProp, resultFromLocation, previewFromLocation, resolvedSessionId]);

    const [result, setResult] = useState(() =>
      initialPreview && isValidPreview(initialPreview) ? initialPreview : null
    );
    const [error, setError] = useState("");

    const resultSeed = useMemo(() => {
      if (!result) return null;
      return buildResultSeed({ preview: result, result });
    }, [result]);

  const displayResult = useMemo(() => {
  if (!result && !resultSeed) return null;

  const safeResult = result || {};
  const safeSeed =
    safeResult?.resultSeed ||
    safeResult?.extraction ||
    resultSeed ||
    {};

  return {
    ...safeResult,

    title:
      safeResult.title ||
      safeSeed.title ||
      "Your Nimclea Structural Diagnostic",

    scenario:
      safeResult.scenario || {
        code: safeSeed.scenarioKey || "unknown_scenario",
        label: safeSeed.scenarioKey || "No Dominant Scenario",
      },

    intensity:
      safeResult.intensity || {
        level: 3,
        label: "Moderate Structural Intensity",
      },

    pressureProfile:
      safeResult.pressureProfile || {
        code: "",
        label: "",
      },

    summary:
      Array.isArray(safeResult.summary) && safeResult.summary.length > 0
        ? safeResult.summary
        : safeSeed.summary
        ? [safeSeed.summary]
        : [],

    synthesis:
      Array.isArray(safeResult.synthesis) && safeResult.synthesis.length > 0
        ? safeResult.synthesis
        : safeSeed.recommendedAction
        ? [safeSeed.recommendedAction]
        : [],

    top_signals:
      Array.isArray(safeResult.top_signals) && safeResult.top_signals.length > 0
        ? safeResult.top_signals
        : Array.isArray(safeSeed.signals)
        ? safeSeed.signals.map((item, index) => ({
            id: `seed-signal-${index + 1}`,
            key: typeof item === "string" ? item : item?.key || `signal_${index + 1}`,
            label: typeof item === "string" ? item : item?.label || `Signal ${index + 1}`,
            description:
              typeof item === "string"
                ? item
                : item?.description || "Extraction-derived structural signal.",
            source: "Extraction Layer",
          }))
        : [],

    pilot_preview:
      safeResult.pilot_preview || {
        entry:
          safeSeed?.pilot?.entryAction ||
          safeSeed?.recommendedAction ||
          "Start with one workflow where clarity or traceability feels inconsistent.",
        actions: [
          "Clarify the current structure.",
          "Select one workflow to test.",
          "Use the pilot to verify the path.",
        ],
        outcome:
          "This pilot should help confirm whether the issue is structural and repeatable.",
        deliverables: [
          "Workflow Visibility Map",
          "Priority Signal Summary",
        ],
        next_steps: [
          "Review the extraction-derived path",
          "Choose one workflow",
          "Start the pilot",
        ],
        cta_label: "Test This Path in Reality →",
      },

    extraction: safeResult.extraction || safeSeed,
  };
}, [result, resultSeed]);

  useEffect(() => {
  // 20秒后 → warm
  const t1 = setTimeout(() => {
    setCtaState("warm");
  }, 20000);

  // 45秒后 → ready
  const t2 = setTimeout(() => {
    setCtaState("ready");
  }, 45000);

  return () => {
    clearTimeout(t1);
    clearTimeout(t2);
  };
}, []);

useEffect(() => {
  if (initialPreview && isValidPreview(initialPreview)) {
    setResult(initialPreview);
    setError("");
    return;
  }

  setResult(null);
}, [initialPreview]);

const handleRestart = useCallback(() => {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEYS.RESULT);
    localStorage.removeItem(STORAGE_KEYS.PREVIEW);
    localStorage.removeItem(STORAGE_KEYS.SESSION_ID);

    if (resolvedSessionId) {
      localStorage.removeItem(`nimclea_result_${resolvedSessionId}`);
      localStorage.removeItem(`nimclea_preview_result_${resolvedSessionId}`);
    }
  }

  if (typeof onRestartProp === "function") {
    onRestartProp();
    return;
  }

  navigate(ROUTES.HOME);
}, [navigate, onRestartProp, resolvedSessionId]);

const fetchPreview = useCallback(() => {
  try {
    setError("");

    const storedResult = normalizePreview(getStoredResult(resolvedSessionId));
    if (storedResult && isValidPreview(storedResult)) {
      setResult(storedResult);
      setError("");
      return;
    }

    const storedPreview = normalizePreview(getStoredPreview(resolvedSessionId));
    if (storedPreview && isValidPreview(storedPreview)) {
      setResult(storedPreview);
      setError("");
      return;
    }

    if (!resolvedSessionId) {
      setResult(null);
      setError("No session_id was found for this result page.");
      return;
    }

    setResult(null);
    setError("No diagnostic preview was found for this session.");
  } catch (err) {
    setResult(null);
    setError(
      err instanceof Error
        ? err.message
        : "Something went wrong while loading the preview."
    );
  }
}, [resolvedSessionId]);

useEffect(() => {
  if (result && isValidPreview(result)) {
    setError("");
    return;
  }

  fetchPreview();
}, [result, resolvedSessionId, fetchPreview]);

const handleRetry = useCallback(async () => {
  await fetchPreview();
}, [fetchPreview]);

const SCENARIO_TO_PATTERN_ID = {
  barely_functional: "PATTERN-001",
  boundary_blur: "PATTERN-002",
  pre_audit_collapse: "PATTERN-003",
  fully_ready: "PATTERN-001",
};

const SCENARIO_TO_CHAIN_ID = {
  barely_functional: "CHAIN-001",
  boundary_blur: "CHAIN-002",
  pre_audit_collapse: "CHAIN-003",
  fully_ready: "CHAIN-001",
};

const resolvedPath = useMemo(() => {
  const scenarioCode = displayResult?.scenario?.code || "";
  const primarySignalKey =
    displayResult?.top_signals?.[0]?.key ||
    displayResult?.top_signals?.[0]?.signalKey ||
    "";
  const intensityLevel = displayResult?.intensity?.level || 3;

  const fallbackRunCode = resolveRun({
    scenarioCode,
    primarySignalKey,
    intensityLevel,
  });

  const patternId =
    SCENARIO_TO_PATTERN_ID[scenarioCode] || "PATTERN-001";
  const chainId =
    SCENARIO_TO_CHAIN_ID[scenarioCode] || "CHAIN-001";

  const patternData = patternRegistry[patternId] || null;
  const chainData = chainRegistry[chainId] || null;

  const pattern =
    patternData?.patternName || "Operational Friction";
  const chain =
    chainData?.chainName || "Reality Control Recovery";

  const stage =
    RUN_TO_STAGE[fallbackRunCode] ||
    chainData?.defaultStage ||
    "S1";

  const mappedRunCode = getRun(chainId, stage) || fallbackRunCode;

  return {
    scenarioCode,
    primarySignalKey,
    intensityLevel,

    patternId,
    chainId,

    pattern,
    chain,

    patternDescription: patternData?.description || "",
    chainDescription: chainData?.description || "",
    registryDefaultStage: chainData?.defaultStage || "",

    runCode: mappedRunCode,
    stage,

    routeMeta: getRunRouteMeta(mappedRunCode),
  };
}, [displayResult]);

const enrichedResult = useMemo(() => {
  if (!displayResult) return null;

  return {
    ...displayResult,
    stage: resolvedPath?.stage || displayResult?.stage || "S1",
    chainId: resolvedPath?.chainId || "CHAIN-001",
  };
  }, [displayResult, resolvedPath]);

const runMeta = useMemo(() => {
  const runCode =
    resolvedPath?.runCode ||
    resolvedPath?.run ||
    displayResult?.runCode ||
    displayResult?.run ||
    "";

  if (!runCode) return null;

  return getRunRouteMeta(runCode) || null;
}, [resolvedPath, displayResult]);

const weakestDimension = useMemo(() => {
  return inferWeakestDimension({
    scenarioCode: displayResult?.scenario?.code || "",
    pressureProfileCode: displayResult?.pressureProfile?.code || "",
    signals: displayResult?.top_signals || [],
  });
}, [displayResult]);

const pilotRouting = useMemo(() => {
  return getPilotRoutingByWeakestDimension(weakestDimension);
}, [weakestDimension]);

const scenarioCode = enrichedResult?.scenario?.code || "";

const pilotFocus = useMemo(() => {
  const primarySignalKey =
    displayResult?.top_signals?.[0]?.key ||
    displayResult?.top_signals?.[0]?.signalKey ||
    resolvedPath?.primarySignalKey ||
    "";

  const focusKey =
    pilotRouting?.pilotFocusKey ||
    primarySignalKey ||
    "";

  if (!focusKey) return null;

  return getPilotFocusBySignal(focusKey) || null;
}, [displayResult, resolvedPath, pilotRouting]);

const stageCopy = useMemo(() => {
  const currentStage = resolvedPath?.stage || "S1";
  return resultStageCopy[currentStage] || resultStageCopy.S1;
}, [resolvedPath]);

const heroTitle = useMemo(() => {
  return getHeroTitle({
    scenarioCode: displayResult?.scenario?.code || "",
    stage: resolvedPath?.stage || "",
    primarySignalLabel: displayResult?.top_signals?.[0]?.label || "",
  });
}, [displayResult, resolvedPath]);

const heroSupportLine = useMemo(() => {
  return getHeroSupportLine({
    scenarioCode: displayResult?.scenario?.code || "",
    pressureProfileCode: displayResult?.pressureProfile?.code || "",
    weakestDimension,
  });
}, [displayResult, weakestDimension]);

const pilotCtaLabel = useMemo(() => {
  return getPilotCtaLabel({
    scenarioCode: displayResult?.scenario?.code || "",
    stage: resolvedPath?.stage || "",
  });
}, [displayResult, resolvedPath]);

const pilotCtaMicrocopy = useMemo(() => {
  return getPilotCtaMicrocopy({
    scenarioCode: displayResult?.scenario?.code || "",
    primarySignalLabel: displayResult?.top_signals?.[0]?.label || "",
  });
}, [displayResult]);

const handleStartPilot = useCallback(
  (signal = null) => {
    if (!enrichedResult || !isValidPreview(enrichedResult)) {
      console.error("invalid result, pilot not started");
      return;
    }

    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.PREVIEW, JSON.stringify(enrichedResult));

      if (resolvedSessionId) {
        localStorage.setItem(STORAGE_KEYS.SESSION_ID, resolvedSessionId);
        localStorage.setItem(
          `nimclea_preview_result_${resolvedSessionId}`,
          JSON.stringify(enrichedResult)
        );
      }
    }

    const primarySignalKey =
      signal?.key ||
      signal?.signalKey ||
      enrichedResult?.top_signals?.[0]?.key ||
      enrichedResult?.top_signals?.[0]?.signalKey ||
      "";

    const effectiveWeakestDimension = weakestDimension || "structure";

    const effectivePilotFocusKey =
      signal?.key ||
      signal?.signalKey ||
      pilotRouting?.pilotFocusKey ||
      primarySignalKey ||
      "";

    const firstGuidedAction =
      pilotRouting?.firstGuidedAction ||
      "Start with the first place where this workflow becomes harder to explain, verify, or sustain.";

    const firstStepLabel =
      pilotRouting?.firstStepLabel ||
      "Start with the weakest structural point";

    const caseSchema = mapResultToCaseSchema({
      ...enrichedResult,
      weakestDimension: effectiveWeakestDimension,
      pilotFocusKey: effectivePilotFocusKey,
      firstGuidedAction,
      firstStepLabel,
      stage:
        enrichedResult?.stage ||
        resolvedPath?.stage ||
        "S1",
      chainId:
        enrichedResult?.chainId ||
        resolvedPath?.chainId ||
        "CHAIN-001",
      fallbackRunCode:
        enrichedResult?.fallbackRunCode ||
        resolvedPath?.runCode ||
        "",
      patternId:
        enrichedResult?.patternId ||
        resolvedPath?.patternId ||
        "",
      scenarioCode:
        enrichedResult?.scenario?.code || "",
      eventContext:
        Array.isArray(enrichedResult?.summary)
          ? enrichedResult.summary.join(" ")
          : "",
      meta: {
        ...(enrichedResult?.meta || {}),
        source: "result_page_start_pilot",
      },
    });

    logEvent("pilot_started", {
      sessionId: resolvedSessionId || "",
      pattern: enrichedResult?.patternId || "",
      chain: enrichedResult?.chainId || "",
      stage: enrichedResult?.stage || "",
      run: enrichedResult?.runId || "",
      scenarioCode: enrichedResult?.scenario?.code || "",
      primarySignalKey,
      weakestDimension: effectiveWeakestDimension,
      pilotFocusKey: effectivePilotFocusKey,
    });

    if (typeof onStartPilotProp === "function") {
      onStartPilotProp({
        sessionId: resolvedSessionId,
        sourceInput: enrichedResult,
        preview: enrichedResult,
        result: enrichedResult,
        caseSchema,
        scenarioCode: enrichedResult?.scenario?.code || "",
        primarySignalKey,
        weakestDimension: effectiveWeakestDimension,
        pilotFocusKey: effectivePilotFocusKey,
        firstGuidedAction,
        firstStepLabel,
        stage: enrichedResult?.stage || resolvedPath?.stage || "S1",
        chainId: enrichedResult?.chainId || resolvedPath?.chainId || "CHAIN-001",
      });
      return;
    }

    navigate(ROUTES.PILOT, {
      state: {
        sessionId: resolvedSessionId,
        session_id: resolvedSessionId,

        sourceInput: enrichedResult,
        preview: enrichedResult,
        result: enrichedResult,
        caseSchema,

        stage:
          enrichedResult?.stage ||
          resolvedPath?.stage ||
          "S1",
        chainId:
          enrichedResult?.chainId ||
          resolvedPath?.chainId ||
          "CHAIN-001",

        extraction: enrichedResult?.extraction || {},
        resultSeed:
          enrichedResult?.resultSeed ||
          enrichedResult?.extraction ||
          {},

        scenarioCode: enrichedResult?.scenario?.code || "",
        primarySignalKey,

        weakestDimension: effectiveWeakestDimension,
        pilotFocusKey: effectivePilotFocusKey,
        firstGuidedAction,
        firstStepLabel,
      },
    });
  },
  [
    navigate,
    onStartPilotProp,
    enrichedResult,
    resolvedSessionId,
    weakestDimension,
    pilotRouting,
    resolvedPath,
  ]
);

if (error && !result) {
  return (
    <ErrorState
      message={error}
      onRetry={handleRetry}
      onRestart={handleRestart}
    />
  );
}

if (!result) {
  return <EmptyState onRestart={handleRestart} />;
}

if (!isValidPreview(result)) {
  return <EmptyState onRestart={handleRestart} />;
}

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-6 py-10 md:py-12">
        <div className="space-y-6">
          <ReportHero
            result={enrichedResult}
            sessionId={resolvedSessionId}
            onStartPilot={handleStartPilot}
            heroTitle={heroTitle}
            heroSupportLine={heroSupportLine}
            pilotCtaLabel={pilotCtaLabel}
            pilotCtaMicrocopy={pilotCtaMicrocopy}
            weakestDimension={weakestDimension}
          />

          {runMeta?.microNote && (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
              {runMeta.microNote}
            </div>
          )}

          <StructurePathSection data={resolvedPath} />

          <div className="rounded-2xl border border-sky-200 bg-sky-50 px-5 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">
              Current Stage
            </div>
            <h3 className="mt-2 text-lg font-semibold text-slate-900">
              {stageCopy.title}
            </h3>
            <p className="mt-2 text-sm leading-7 text-slate-800">
              {stageCopy.description}
            </p>
            <p className="mt-2 text-sm leading-7 text-slate-700">
              {stageCopy.action}
            </p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
              Why act now
            </div>
            <p className="mt-2 text-sm leading-7 text-slate-800">
              Most teams stop here. The ones who move next are the ones who actually reduce cost.
            </p>
            <p className="mt-2 text-sm leading-7 text-slate-700">
              If this structure is already showing pressure, the cheapest moment to test it is now, before the next real deadline, audit, or review forces the issue.
            </p>
          </div>
          
          <SummarySection summary={enrichedResult.summary} />

          <SynthesisSection items={enrichedResult.synthesis || []} />

          <SignalsSection
            signals={enrichedResult.top_signals}
            onStartPilot={handleStartPilot}
          />

          <PilotTriggerCard
            onStartPilot={handleStartPilot}
            scenarioCode={enrichedResult?.scenario?.code || ""}
            ctaState={ctaState}
            ctaLabel={pilotCtaLabel}
            weakestDimension={weakestDimension}
          />

          <PilotSection
            pilotPreview={{
              ...enrichedResult.pilot_preview,
              firstGuidedAction: pilotRouting?.firstGuidedAction || "",
              firstStepLabel: pilotRouting?.firstStepLabel || "",
              weakestDimension,
            }}
            pilotFocus={pilotFocus}
          />
        <div className="mt-10 text-center text-sm text-slate-500">
          End of diagnostic preview · The next useful step is to test one real workflow
        </div>
        
        </div>
      </div>
    </main>
  );
}