import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { enrichSignals } from "./signalContentMap.js";
import { getSignalAction } from "./signalActionMap.js";
import { getPilotFocusBySignal } from "./pilotFocusMap";

const STORAGE_KEYS = {
  RESULT: "nimclea_result",
  PREVIEW: "nimclea_preview_result",
  SESSION_ID: "nimclea_session_id",
};

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

    cta_label: source.pilot_preview?.cta_label || "Start Your Pilot",
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
          className="shrink-0 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          {open ? openLabel : closedLabel}
        </button>
      </div>

      {open ? <div className="mt-5">{children}</div> : null}
    </Card>
  );
}

function Pill({ children, dark = false, success = false }) {
  const cls = success
    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
    : dark
    ? "bg-slate-950 text-white border border-slate-950"
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

function ReportHero({ result, sessionId }) {
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
          {result.title}
        </h1>

        <p className="mt-5 max-w-2xl text-base leading-7 text-slate-700">
          {heroLine}
        </p>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          {pressureLine}
        </p>

        <p className="mt-4 max-w-2xl text-sm font-medium text-slate-900">
          You do not need to fix everything first.
          Start with the one workflow that breaks most often under pressure.
        </p>

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
      title="Why This Diagnosis Fits"
      hint="See why this matches the way your workflow is behaving right now."
      defaultOpen={false}
      closedLabel="See why this matches your situation"
      openLabel="Hide details"
    >
      <ul className="space-y-3">
        {summary.map((sentence, index) => (
          <li
            key={`${index}-${sentence.slice(0, 30)}`}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-700"
          >
            {sentence}
          </li>
        ))}
      </ul>
    </CollapsibleCard>
  );
}

function SynthesisSection({ items }) {
  if (!items || items.length === 0) return null;

  return (
    <CollapsibleCard
      title="What This Means for Your System"
      hint="See what this is likely to affect when the work gets real."
      defaultOpen={false}
      closedLabel="What this means in practice"
      openLabel="Hide details"
    >
      <ul className="space-y-3">
        {items.map((sentence, index) => (
          <li
            key={`${index}-${sentence.slice(0, 30)}`}
            className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm leading-7 text-violet-900"
          >
            {sentence}
          </li>
        ))}
      </ul>
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

function SignalDetailCard({ signal, index }) {
  const [open, setOpen] = useState(false);

  return (
    <li className="rounded-2xl border border-slate-200 bg-slate-50">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-start justify-between gap-4 p-5 text-left"
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

        <div className="flex shrink-0 items-start gap-3">
          <SignalScoreBadge score={signal.score} />
          <span className="rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700">
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
        </div>
      ) : null}
    </li>
  );
}

function SignalsSection({ signals }) {
  if (!signals || signals.length === 0) return null;

  return (
    <CollapsibleCard
      title="Top Structural Signals"
      hint="These are the issues that will cause problems when you're under pressure."
      defaultOpen={false}
      closedLabel="See the specific issues"
      openLabel="Hide issues"
    >
      <ul className="space-y-3">
        {signals.map((signal, index) => (
          <SignalDetailCard
            key={signal.id || `${signal.label}-${index}`}
            signal={signal}
            index={index}
          />
        ))}
      </ul>
    </CollapsibleCard>
  );
}

function PilotSection({ pilotPreview, pilotFocus, onStartPilot }) {
  return (
    <Card className="overflow-hidden border-slate-900 bg-slate-950 text-white">
      <div className="grid gap-0 md:grid-cols-[1.2fr_0.8fr]">
        <div className="p-7 md:p-8">
          <SectionTitle
            title="Your 14-day pilot window"
            titleClassName="text-white"
            hintClassName="text-slate-300"
            hint="A small pilot designed to test one structural improvement in one real workflow."
          />

          {pilotFocus && (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
                Pilot Focus
              </div>

              <h3 className="mt-1 text-base font-semibold text-emerald-900">
                {pilotFocus.title}
              </h3>

              <p className="mt-2 text-sm leading-6 text-emerald-800">
                {pilotFocus.intro}
              </p>

              <ul className="mt-3 space-y-1 text-sm text-emerald-900">
                {pilotFocus.bullets?.map((item, index) => (
                  <li key={index}>• {item}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="mt-4 text-sm leading-7 text-slate-300">
            This is not a full transformation plan.
            It is a small, focused test within a 14-day window.

            You are not committing to 14 days of work.
            Most teams complete the initial test in a few days,
            and use the rest of the window to observe whether the change holds.

            The goal is simple:
            make one workflow easier to explain, easier to verify,
            and less dependent on hidden effort.
          </p>

          <div className="mt-6 space-y-4">
            <div>
              <div className="text-xs font-semibold uppercase text-slate-400">
                Where to start
              </div>
              <p className="mt-1 text-sm text-white">{pilotPreview.entry}</p>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase text-slate-400">
                What to do
              </div>
              <ul className="mt-2 space-y-2 text-sm text-slate-200">
                {pilotPreview.actions.map((step, i) => (
                  <li key={i}>• {step}</li>
                ))}
              </ul>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase text-slate-400">
                What you’ll see
              </div>
              <p className="mt-1 text-sm text-slate-200">{pilotPreview.outcome}</p>
            </div>
          </div>

          <ul className="mt-5 grid gap-3 md:grid-cols-2">
            {pilotPreview.deliverables.map((item, index) => (
              <li
                key={`${item}-${index}`}
                className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-100"
              >
                <span className="mt-1 inline-block h-2.5 w-2.5 rounded-full bg-white" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-white/10 bg-white/5 p-7 md:border-l md:border-t-0 md:p-8">
          <div className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-300">
            Suggested Next Steps
          </div>

          <div className="mt-5 space-y-5">
            {pilotPreview.next_steps.map((step, index) => (
              <div key={`${step}-${index}`} className="flex gap-4">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/15 bg-slate-900 text-xs font-bold text-slate-300">
                  {index + 1}
                </div>
                <p className="text-sm leading-6 text-slate-200">{step}</p>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={onStartPilot}
            className="mt-7 w-full rounded-2xl bg-white px-5 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
          >
            {pilotPreview.cta_label}
          </button>

          <p className="mt-4 text-center text-[11px] leading-5 text-slate-400">
            This can be used as the bridge from diagnostic insight to a more
            operational pilot path.
          </p>
        </div>
      </div>
    </Card>
  );
}

function FooterActions({ onRestart, onStartPilot }) {
  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        onClick={onStartPilot}
        className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        Start Your Pilot
      </button>

      <button
        type="button"
        onClick={onRestart}
        className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
      >
        Retake Diagnostic
      </button>
    </div>
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
  const navigate = useNavigate();
  const location = useLocation();

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

    const normalized = normalizePreview(raw);
      return normalized;
    }, [resultProp, resultFromLocation, previewFromLocation, resolvedSessionId]);

    const [result, setResult] = useState(() =>
      initialPreview && isValidPreview(initialPreview) ? initialPreview : null
    );
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

  useEffect(() => {
    if (initialPreview && isValidPreview(initialPreview)) {
      setResult(initialPreview);
      setError("");
      setLoading(false);
      return;
    }

    setLoading(true);
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

  navigate("/");
}, [navigate, onRestartProp, resolvedSessionId]);

const handleStartPilot = useCallback(() => {
  if (!result || !isValidPreview(result)) {
    return;
  }

  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEYS.PREVIEW, JSON.stringify(result));

    if (resolvedSessionId) {
      localStorage.setItem(STORAGE_KEYS.SESSION_ID, resolvedSessionId);
      localStorage.setItem(
        `nimclea_preview_result_${resolvedSessionId}`,
        JSON.stringify(result)
      );
    }
  }

  if (typeof onStartPilotProp === "function") {
    onStartPilotProp(result);
    return;
  }

  navigate(
    resolvedSessionId
      ? `/pilot?session_id=${resolvedSessionId}`
      : "/pilot",
    {
      state: {
        session_id: resolvedSessionId,
        preview: result,
      },
    }
  );
}, [navigate, onStartPilotProp, resolvedSessionId, result]);

    const fetchPreview = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

    const storedResult = normalizePreview(getStoredResult(resolvedSessionId));
      if (storedResult && isValidPreview(storedResult)) {
        setResult(storedResult);
        setError("");
        setLoading(false);
        return;
      }

      const storedPreview = normalizePreview(getStoredPreview(resolvedSessionId));
      if (storedPreview && isValidPreview(storedPreview)) {
        setResult(storedPreview);
        setError("");
        setLoading(false);
        return;
      }

      if (!resolvedSessionId) {
        setResult(null);
        setError("No session_id was found for this result page.");
        setLoading(false);
        return;
      }

      setResult(null);
      setError("No diagnostic preview was found for this session.");
      setLoading(false);
    } catch (err) {
      setResult(null);
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading the preview."
      );
      setLoading(false);
    }
  }, [resolvedSessionId]);

  useEffect(() => {
if (result && isValidPreview(result)) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEYS.PREVIEW, JSON.stringify(result));

    if (resolvedSessionId) {
      localStorage.setItem(STORAGE_KEYS.SESSION_ID, resolvedSessionId);
      localStorage.setItem(
        `nimclea_preview_result_${resolvedSessionId}`,
        JSON.stringify(result)
      );
    }
  }

  setLoading(false);
  setError("");
  return;
}

    fetchPreview();
  }, [result, resolvedSessionId, fetchPreview]);

  const handleRetry = useCallback(async () => {
    await fetchPreview();
  }, [fetchPreview]);

if (loading) {
  return <LoadingState />;
}

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

const primarySignalKey =
  result?.top_signals?.[0]?.key ||
  result?.top_signals?.[0]?.signalKey ||
  "";

const pilotFocus = getPilotFocusBySignal(primarySignalKey);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-6 py-10 md:py-12">
        <div className="space-y-6">
          <ReportHero result={result} sessionId={resolvedSessionId} />

          <SummarySection summary={result.summary} />

          <SynthesisSection items={result.synthesis || []} />

          <SignalsSection signals={result.top_signals} />

          <PilotSection
            pilotPreview={result.pilot_preview}
            pilotFocus={pilotFocus}
            onStartPilot={handleStartPilot}
          />

          <FooterActions
            onRestart={handleRestart}
            onStartPilot={handleStartPilot}
          />
        </div>
      </div>
    </main>
  );
}