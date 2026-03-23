// previewGenerator.js
// Nimclea Diagnostic Preview Generator v1.1
// Deterministic preview assembly for scenario -> preview output

function toSafeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

const TITLE = "Your Nimclea Structural Diagnostic";
const SUBTITLE =
  "Based on your responses, your system shows patterns commonly seen in organizations under structural pressure.";

const SCENARIO_LABELS = {
  scenario_a: "Localized Control Gap",
  scenario_b: "Responsibility Runtime Pressure",
  scenario_c: "Cross-System Drift",
  scenario_d: "Audit-Facing Fragility"
};

const INTENSITY_LABELS = {
  1: "Early Structural Signals",
  2: "Emerging Control Pressure",
  3: "Active Traceability Risk",
  4: "High-Friction Responsibility Environment"
};

// From Preview Copy Library v1.0
const SUMMARY_MATRIX = {
  scenario_a: {
    1: [
      "Your responses suggest that supporting evidence and final outputs may be somewhat harder to locate or align than they should be.",
      "These signals appear early, but they are worth addressing before verification pressure increases.",
      "Organizations in this pattern typically benefit from clarifying how evidence, retrieval, and version control interact."
    ],
    2: [
      "Your responses suggest that supporting evidence and final outputs may be harder to locate, align, or reconstruct than they should be.",
      "The process may still work under normal conditions, but structural friction appears to be increasing when verification is needed.",
      "Organizations in this pattern typically benefit from clarifying how evidence, retrieval, and version control interact."
    ],
    3: [
      "Your responses suggest that evidence pathways are already creating noticeable friction in how results are supported or reconstructed.",
      "These patterns point to active traceability risk, not just early warning signs.",
      "Organizations in this pattern typically benefit from clarifying how evidence, retrieval, and version control interact."
    ],
    4: [
      "Your responses suggest that evidence retrieval, reconstruction, or alignment is creating systemic friction around important outputs.",
      "These patterns suggest a high-friction environment where structural weaknesses are likely affecting speed, confidence, or audit readiness.",
      "Organizations in this pattern typically benefit from clarifying how evidence, retrieval, and version control interact."
    ]
  },
  scenario_b: {
    1: [
      "Your responses suggest that reporting or operational changes may already depend on clearer approval ownership and more repeatable review pathways.",
      "These signals appear early, but they are worth addressing before change pressure increases.",
      "Organizations in this pattern typically benefit from clarifying how approval, review, and accountability interact."
    ],
    2: [
      "Your responses suggest that reporting or operational changes increasingly depend on approval clarity, review discipline, and repeatable change pathways.",
      "The process may still function, but pressure appears to be rising faster than governance is maturing.",
      "Organizations in this pattern typically benefit from clarifying how approval, review, and accountability interact."
    ],
    3: [
      "Your responses suggest that approval ownership, review discipline, or change accountability is already creating visible pressure in day-to-day work.",
      "These patterns suggest active traceability or governance risk, not just early warning signs.",
      "Organizations in this pattern typically benefit from clarifying how approval, review, and accountability interact."
    ],
    4: [
      "Your responses suggest that the current operating model depends on governance pathways that may no longer be clear or repeatable enough for the level of change your team is handling.",
      "These patterns suggest a high-friction environment where structural weaknesses are likely affecting trust, speed, or control.",
      "Organizations in this pattern typically benefit from clarifying how approval, review, and accountability interact."
    ]
  },
  scenario_c: {
    1: [
      "Your responses suggest that multiple teams, definitions, or systems may already be introducing small amounts of drift in how results are produced or interpreted.",
      "These signals appear early, but they are worth addressing before complexity increases.",
      "Organizations in this pattern typically benefit from clarifying how coordination, definitions, and system boundaries interact."
    ],
    2: [
      "Your responses suggest that multiple teams, systems, or definitions may be contributing to drift in how results are produced and interpreted.",
      "This can make final outputs harder to align, especially as coordination complexity increases.",
      "Organizations in this pattern typically benefit from clarifying how coordination, definitions, and system boundaries interact."
    ],
    3: [
      "Your responses suggest that cross-team or cross-system complexity is already creating visible friction in how outputs are assembled, interpreted, or handed off.",
      "These patterns suggest active coordination risk, not just early warning signs.",
      "Organizations in this pattern typically benefit from clarifying how coordination, definitions, and system boundaries interact."
    ],
    4: [
      "Your responses suggest that multiple teams, systems, or semantic definitions are creating systemic drift in how important outputs are produced and understood.",
      "These patterns suggest a high-friction environment where coordination burden is likely affecting reliability and explainability.",
      "Organizations in this pattern typically benefit from clarifying how coordination, definitions, and system boundaries interact."
    ]
  },
  scenario_d: {
    1: [
      "Your responses suggest that structural weaknesses may not always be visible in routine work, but could become more noticeable under audit, deadline, or exception pressure.",
      "These signals appear early, but they are worth addressing before external scrutiny increases.",
      "Organizations in this pattern typically benefit from clarifying how evidence, approvals, and coordination behave under pressure."
    ],
    2: [
      "Your responses suggest that structural weaknesses are most likely to surface when external pressure increases, especially during audit, verification, deadline, or incident-driven conditions.",
      "The issue may be less visible in routine work than in high-pressure moments.",
      "Organizations in this pattern typically benefit from clarifying how evidence, approvals, and coordination behave under pressure."
    ],
    3: [
      "Your responses suggest that external or high-pressure situations are already exposing gaps in evidence, coordination, or approval pathways.",
      "These patterns suggest active risk, not just early warning signs.",
      "Organizations in this pattern typically benefit from clarifying how evidence, approvals, and coordination behave under pressure."
    ],
    4: [
      "Your responses suggest that audit, verification, deadline, or incident pressure is already surfacing structural weaknesses across evidence, approval, or coordination pathways.",
      "These patterns suggest a high-friction environment where pressure is likely amplifying risk faster than the current structure can absorb it.",
      "Organizations in this pattern typically benefit from clarifying how evidence, approvals, and coordination behave under pressure."
    ]
  }
};

// Scenario/group level copy
const GROUP_COPY = {
  evidence_fragmentation_score: {
    label: "Evidence Fragmentation",
    description:
      "Supporting records appear to be distributed across multiple locations, formats, or retrieval paths, which can slow verification and increase reconstruction effort."
  },
  governance_strength_score: {
    label: "Responsibility & Approval Weakness",
    description:
      "Approval ownership, review discipline, or change accountability may not always be explicit enough to keep reporting and operational changes easy to explain."
  },
  complexity_score: {
    label: "Cross-Team / Cross-System Drift",
    description:
      "Multiple teams, definitions, or systems may be contributing to drift in how final results are assembled or interpreted."
  },
  pressure_context_score: {
    label: "Pressure-Revealed Risk",
    description:
      "The most serious structural weaknesses may become visible only when pressure increases, such as during audit requests, deadlines, or incident handling."
  }
};

// Signal-level expression layer, aligned with mapping table + current engine signals
const SIGNAL_COPY = {
  explainability_gap: {
    label: "Change Explainability Risk",
    description:
      "When results change, it may be difficult to explain exactly what changed and why."
  },
  change_clarity: {
    label: "Change Clarity Weakness",
    description:
      "The reasoning behind important changes may not be consistently documented in a way others can quickly follow."
  },
  rule_drift: {
    label: "Rule / Definition Drift",
    description:
      "Calculation rules or operating standards may be changing often enough to create interpretive drift."
  },
  metric_volatility: {
    label: "Metric Volatility",
    description:
      "Frequent changes in underlying rules can make reported results harder to stabilize and compare."
  },
  evidence_readiness: {
    label: "Evidence Retrieval Friction",
    description:
      "Supporting evidence may not be immediately ready when questions arise."
  },
  retrieval_friction: {
    label: "Retrieval Friction",
    description:
      "Key supporting evidence may be slow to locate when verification is needed."
  },
  traceability_gap: {
    label: "Approval & Traceability Weakness",
    description:
      "It may be difficult to reconstruct who approved a change and when that change occurred."
  },
  approval_auditability: {
    label: "Approval Auditability Risk",
    description:
      "Approval pathways may not be explicit enough to support confident reconstruction under review."
  },
  evidence_fragmentation: {
    label: "Evidence Fragmentation",
    description:
      "Important supporting records may be spread across multiple locations or storage patterns."
  },
  storage_chaos: {
    label: "Storage Chaos",
    description:
      "The storage environment for critical records may be too mixed to support fast retrieval."
  },
  verification_cadence: {
    label: "Weak Verification Cadence",
    description:
      "Formal review or verification may happen too infrequently to keep structural drift under control."
  },
  governance_discipline: {
    label: "Review Discipline Weakness",
    description:
      "Governance depends on a level of review discipline that may not be consistently sustained."
  },
  governance_formality: {
    label: "Informal Change Governance",
    description:
      "Important changes may rely on informal reviews instead of a clearly defined control process."
  },
  control_strength: {
    label: "Control Weakness",
    description:
      "The system for controlling important reporting or operational changes may not be strong enough for the pressure it faces."
  },
  coordination_complexity: {
    label: "Coordination Complexity",
    description:
      "Producing final outputs appears to require coordination across multiple boundaries."
  },
  boundary_density: {
    label: "Boundary Density",
    description:
      "The number of teams or systems involved may be increasing the burden of coordination."
  },
  first_retrieval_path: {
    label: "Unclear First Retrieval Path",
    description:
      "When evidence is needed, teams may not share a consistent first place to look."
  },
  evidence_search_chaos: {
    label: "Evidence Search Chaos",
    description:
      "Searching for supporting records may involve too many unstructured paths."
  },
  version_drift: {
    label: "Version Drift Risk",
    description:
      "Different teams may be relying on different versions of the same underlying information."
  },
  team_misalignment: {
    label: "Team Misalignment",
    description:
      "Coordination may be strained because different groups are not working from the same operational base."
  },
  reconstruction_burden: {
    label: "Reconstruction Burden",
    description:
      "Preparing final outputs appears to require significant manual reconstruction."
  },
  hidden_process_debt: {
    label: "Hidden Process Debt",
    description:
      "Manual work may be masking structural debt in how results are assembled."
  },
  authority_clarity: {
    label: "Ownership Ambiguity",
    description:
      "Responsibility for approving important changes may not be consistently clear."
  },
  ownership_strength: {
    label: "Ownership Weakness",
    description:
      "The ownership model around key reporting or operational changes may be too diffuse."
  },
  incident_reconstruction: {
    label: "Incident Reconstruction Weakness",
    description:
      "When problems occur, reconstructing how they happened may not be reliable enough."
  },
  causal_trace_quality: {
    label: "Causal Trace Quality Risk",
    description:
      "The chain of cause and effect behind an issue may be harder to recover than it should be."
  },
  change_governance_maturity: {
    label: "Change Governance Maturity Gap",
    description:
      "Your change management process may not yet be mature enough to remain repeatable under pressure."
  },
  process_repeatability: {
    label: "Process Repeatability Risk",
    description:
      "Important changes may be handled differently from one case to the next."
  },
  semantic_misalignment: {
    label: "Definition Conflict",
    description:
      "Different teams may not be using the same definitions for key metrics or numbers."
  },
  definition_conflict: {
    label: "Definition Conflict",
    description:
      "Shared meaning around the same metric may be less stable than it appears."
  },
  handoff_integrity: {
    label: "Handoff Integrity Risk",
    description:
      "The way work moves across teams may not be clear enough to prevent drift."
  },
  boundary_clarity: {
    label: "Boundary Clarity Weakness",
    description:
      "Team boundaries and responsibilities may be contributing to coordination ambiguity."
  },
  multi_system_coupling: {
    label: "Multi-System Coupling",
    description:
      "Final outputs appear to depend on combining inputs from multiple systems."
  },
  integration_burden: {
    label: "Integration Burden",
    description:
      "Cross-system integration may be creating structural effort before final outputs can be trusted."
  },
  external_pressure: {
    label: "External Pressure Exposure",
    description:
      "External review, audit, customer verification, or incident pressure is part of the operating environment."
  },
  triggered_review_environment: {
    label: "Triggered Review Environment",
    description:
      "The operating model appears to be shaped by moments when outside verification pressure increases."
  },
  dominant_failure_mode: {
    label: "Dominant Failure Mode",
    description:
      "Under pressure, the same weak point may repeatedly become the system’s main source of failure."
  },
  pressure_revealed_weak_point: {
    label: "Pressure-Revealed Risk",
    description:
      "The most visible weakness may emerge only when pressure rises."
  }
};

const TOP_SIGNAL_FALLBACK_BY_GROUP = {
  evidence_fragmentation_score: [
    "Evidence Fragmentation",
    "Retrieval Friction",
    "Version Drift Risk",
    "Reconstruction Burden"
  ],
  governance_strength_score: [
    "Responsibility & Approval Weakness",
    "Approval & Traceability Weakness",
    "Informal Change Governance",
    "Ownership Ambiguity"
  ],
  complexity_score: [
    "Cross-Team / Cross-System Drift",
    "Definition Conflict",
    "Coordination Complexity",
    "Multi-System Coupling"
  ],
  pressure_context_score: [
    "Pressure-Revealed Risk",
    "Audit-Facing Fragility",
    "External Pressure Exposure",
    "Dominant Failure Mode"
  ]
};

const PILOT_CTA = {
  default: {
    header: "If You Run a 14-Day Pilot",
    bullets: [
      "Identity Registry",
      "Authority Map",
      "First Evidence Pack",
      "Drift Findings Report"
    ],
    button: "Start a 14-Day Pilot"
  },
  scenario_a: {
    header: "If You Run a 14-Day Pilot",
    bullets: [
      "First Evidence Pack",
      "Identity Registry",
      "Authority Map",
      "Drift Findings Report"
    ],
    button: "Start a 14-Day Pilot"
  },
  scenario_b: {
    header: "If You Run a 14-Day Pilot",
    bullets: [
      "Authority Map",
      "Identity Registry",
      "First Evidence Pack",
      "Drift Findings Report"
    ],
    button: "Start a 14-Day Pilot"
  },
  scenario_c: {
    header: "If You Run a 14-Day Pilot",
    bullets: [
      "Drift Findings Report",
      "Authority Map",
      "Identity Registry",
      "First Evidence Pack"
    ],
    button: "Start a 14-Day Pilot"
  },
  scenario_d: {
    header: "If You Run a 14-Day Pilot",
    bullets: [
      "Identity Registry",
      "First Evidence Pack",
      "Authority Map",
      "Drift Findings Report"
    ],
    button: "Start a 14-Day Pilot"
  }
};

const FALLBACK = {
  summary: [
    "Your responses suggest emerging structural pressure in how evidence, approvals, or cross-team coordination are handled.",
    "Some part of the current operating structure may be creating avoidable effort, delay, or uncertainty when results need to be explained or verified.",
    "Nimclea can help make those pathways more visible and easier to verify."
  ],
  signal: {
    label: "Structural Friction",
    description:
      "Some part of the current operating structure may be creating avoidable effort, delay, or uncertainty when results need to be explained or verified."
  },
  cta: {
    header: "Explore a 14-Day Pilot",
    bullets: [
      "Identity Registry",
      "Authority Map",
      "First Evidence Pack",
      "Drift Findings Report"
    ],
    button: "Start a 14-Day Pilot"
  }
};

function getScenarioId(scenarioResult) {
  return (
    scenarioResult?.scenarioId ??
    scenarioResult?.scenario_id ??
    scenarioResult?.scenario ??
    null
  );
}

function getScenarioCode(scenarioResult) {
  return (
    scenarioResult?.scenarioCode ??
    scenarioResult?.scenario_code ??
    null
  );
}

function getScenarioLabel(scenarioResult) {
  const code = getScenarioCode(scenarioResult);

  if (scenarioResult?.scenarioLabel) {
    return scenarioResult.scenarioLabel;
  }

  if (code === "pre_audit_collapse") {
    return "Pre-Audit Collapse";
  }

  if (code === "audit_ready") {
    return "Audit-Ready";
  }

  if (code === "barely_functional") {
    return "Barely Functional";
  }

  const id = getScenarioId(scenarioResult);
  return SCENARIO_LABELS[id] || "No Dominant Scenario";
}

function getIntensityLevel(scenarioResult) {
  return toSafeNumber(
    scenarioResult?.intensity?.level ??
    scenarioResult?.intensityLevel
  );
}

function getIntensityLabel(scenarioResult) {
  const level = getIntensityLevel(scenarioResult);
  return (
    scenarioResult?.intensity?.label ||
    scenarioResult?.intensityLabel ||
    INTENSITY_LABELS[level] ||
    "Unknown Intensity"
  );
}

function getPreviewTitle(scenarioResult) {
  const code = getScenarioCode(scenarioResult);

  if (code === "pre_audit_collapse") {
    return "Structural Breakdown Under Pressure";
  }

  if (code === "audit_ready") {
    return "Structured and Audit-Ready";
  }

  if (code === "barely_functional") {
    return "Operational Friction with Hidden Cost";
  }

  return TITLE;
}

function getPreviewSubtitle(scenarioResult) {
  const code = getScenarioCode(scenarioResult);

  if (code === "pre_audit_collapse") {
    return "Your system shows signs of breakdown under audit, review, or delivery pressure.";
  }

  if (code === "audit_ready") {
    return "Your system appears relatively stable, traceable, and ready for audit-facing conditions.";
  }

  if (code === "barely_functional") {
    return "Your system is usable, but it still carries structural friction and hidden operating cost.";
  }

  return SUBTITLE;
}

function getPreviewSummary(scenarioResult) {
  const code = getScenarioCode(scenarioResult);

  if (code === "pre_audit_collapse") {
    return [
      "Your workflow appears to break down under audit, review, or deadline pressure.",
      "Evidence is fragmented, hard to retrieve, and often reconstructed manually when needed.",
      "This creates significant delivery and verification risk before critical checkpoints."
    ];
  }

  if (code === "audit_ready") {
    return [
      "Your current structure appears relatively clear, stable, and verifiable across normal operating conditions.",
      "Evidence, ownership, and workflow paths are easier to trace than average.",
      "This lowers audit stress and reduces the need for repeated manual cleanup."
    ];
  }

  if (code === "barely_functional") {
    return [
      "Your workflow is usable, but it still carries structural friction in evidence, approvals, or coordination.",
      "Manual workarounds, delays, and partial traceability still appear in day-to-day execution.",
      "This creates hidden cost and uncertainty when results need to be explained or verified."
    ];
  }

  return getSummary(scenarioResult);
}

function getSummary(scenarioResult) {
  const scenarioId = getScenarioId(scenarioResult);
  const level = getIntensityLevel(scenarioResult);

  if (
    scenarioId &&
    level &&
    SUMMARY_MATRIX?.[scenarioId]?.[level] &&
    Array.isArray(SUMMARY_MATRIX[scenarioId][level])
  ) {
    return SUMMARY_MATRIX[scenarioId][level];
  }

  return FALLBACK.summary;
}

function getSignalMeta(signalItem) {
  if (!signalItem?.key) return null;
  return SIGNAL_COPY[signalItem.key] || null;
}

function buildTopSignals(scenarioResult) {
  const raw = Array.isArray(scenarioResult?.topSignals)
    ? scenarioResult.topSignals
    : Array.isArray(scenarioResult?.top_signals)
    ? scenarioResult.top_signals
    : [];

  const top = raw
    .slice(0, 3)
    .map((item) => {
      const signalMeta = getSignalMeta(item);
      const groupMeta = GROUP_COPY[item.group] || null;

      return {
        key: item.key ?? null,
        label:
          signalMeta?.label ||
          item.label ||
          groupMeta?.label ||
          FALLBACK.signal.label,
        description:
          signalMeta?.description ||
          groupMeta?.description ||
          FALLBACK.signal.description,
        score: toSafeNumber(item.score),
        group: item.group ?? null
      };
    });

  if (top.length > 0) {
    return top;
  }

  const primaryGroup = scenarioResult?.primarySignalGroup;
  const groupMeta = GROUP_COPY[primaryGroup] || null;
  const fallbackLabels = TOP_SIGNAL_FALLBACK_BY_GROUP[primaryGroup] || [];

  if (fallbackLabels.length > 0) {
    return fallbackLabels.slice(0, 3).map((label) => ({
      key: null,
      label,
      description: groupMeta?.description || FALLBACK.signal.description,
      score: null,
      group: primaryGroup || null
    }));
  }

  return [
    {
      key: null,
      label: FALLBACK.signal.label,
      description: FALLBACK.signal.description,
      score: null,
      group: null
    }
  ];
}

function getPilotPreview(scenarioResult) {
  const scenarioId = getScenarioId(scenarioResult);
  return PILOT_CTA[scenarioId] || PILOT_CTA.default;
}

function buildFallbackPreview(scenarioResult = {}) {
  return {
    title: getPreviewTitle(scenarioResult),
    subtitle: getPreviewSubtitle(scenarioResult),
    scenario: {
      id: getScenarioId(scenarioResult),
      code: getScenarioCode(scenarioResult),
      label: getScenarioLabel(scenarioResult)
    },
    intensity: {
      level: getIntensityLevel(scenarioResult) || null,
      label: getIntensityLabel(scenarioResult)
    },
    summary: getPreviewSummary(scenarioResult),
    top_signals: buildTopSignals(scenarioResult),
    pilot_preview: getPilotPreview(scenarioResult),
    meta: {
      scenario_id: getScenarioId(scenarioResult),
      scenario_code: getScenarioCode(scenarioResult),
      primary_signal_group: scenarioResult?.primarySignalGroup ?? null,
      primary_group_score: toSafeNumber(scenarioResult?.primaryGroupScore),
      total_score: toSafeNumber(
        scenarioResult?.totalScore ?? scenarioResult?.total_score
      ),
      trigger_questions: Array.isArray(scenarioResult?.triggerQuestions)
        ? scenarioResult.triggerQuestions
        : Array.isArray(scenarioResult?.trigger_questions)
        ? scenarioResult.trigger_questions
        : [],
      used_fallback: true
    }
  };
}

export function generatePreview(scenarioResult = {}) {
  if (!isPlainObject(scenarioResult)) {
    return buildFallbackPreview(scenarioResult);
  }

  return {
    title: getPreviewTitle(scenarioResult),
    subtitle: getPreviewSubtitle(scenarioResult),
    scenario: {
      id: getScenarioId(scenarioResult),
      code: getScenarioCode(scenarioResult),
      label: getScenarioLabel(scenarioResult)
    },
    intensity: {
      level: getIntensityLevel(scenarioResult) || null,
      label: getIntensityLabel(scenarioResult)
    },
    summary: getPreviewSummary(scenarioResult),
    top_signals: buildTopSignals(scenarioResult),
    pilot_preview: getPilotPreview(scenarioResult),
    meta: {
      scenario_id: getScenarioId(scenarioResult),
      scenario_code: getScenarioCode(scenarioResult),
      primary_signal_group: scenarioResult?.primarySignalGroup ?? null,
      primary_group_score: toSafeNumber(scenarioResult?.primaryGroupScore),
      total_score: toSafeNumber(
        scenarioResult?.totalScore ?? scenarioResult?.total_score
      ),
      trigger_questions: Array.isArray(scenarioResult?.triggerQuestions)
        ? scenarioResult.triggerQuestions
        : Array.isArray(scenarioResult?.trigger_questions)
        ? scenarioResult.trigger_questions
        : [],
      used_fallback: false
    }
  };
}

export default generatePreview;