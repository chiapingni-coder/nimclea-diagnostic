import {
  createEmptyCaseSchema,
  normalizeCaseInput,
  EVENT_SOURCE,
} from "./caseSchema";

export function mapResultToCaseSchema(result = {}) {
  const base = createEmptyCaseSchema();

  return normalizeCaseInput({
    ...base,

    source: EVENT_SOURCE.DIAGNOSTIC,

    scenarioCode: result.scenarioCode || "",
    intensityLevel: result.intensityLevel || 0,

    summary:
      result.summary ||
      result.summaryContext ||
      result.description ||
      "",
    description: result.description || "",

    eventType: result.eventType || "general",
    eventTitle: result.eventTitle || "",
    eventContext: result.eventContext || "",

    weakestDimension: result.weakestDimension || "",

    patternId: result.patternId || "",
    chainId: result.chainId || "",
    stage: result.stage || "",
    fallbackRunCode: result.fallbackRunCode || "",

    claims: result.claim
      ? [result.claim]
      : Array.isArray(result.claims)
      ? result.claims
      : [],

    risks: Array.isArray(result.riskFlags)
      ? result.riskFlags
      : Array.isArray(result.risks)
      ? result.risks
      : [],

    dimensions: {
      evidence: result.dimensions?.evidence ?? result.evidenceScore ?? 0,
      authority: result.dimensions?.authority ?? result.authorityScore ?? 0,
      coordination: result.dimensions?.coordination ?? result.coordinationScore ?? 0,
      timing: result.dimensions?.timing ?? result.timingScore ?? 0,
    },

    signals: {
      externalPressure: Boolean(result.signals?.externalPressure),
      explainabilityGap: Boolean(result.signals?.explainabilityGap),
      ruleDrift: Boolean(result.signals?.ruleDrift),
      metricVolatility: Boolean(result.signals?.metricVolatility),
      evidenceReadiness: Boolean(result.signals?.evidenceReadiness),
      retrievalFriction: Boolean(result.signals?.retrievalFriction),
      governanceDiscipline: Boolean(result.signals?.governanceDiscipline),
      ownershipStrength: Boolean(result.signals?.ownershipStrength),
    },

    meta: {
      tags: Array.isArray(result.tags) ? result.tags : [],
      notes: result.notes || "",
      rawInput: result,
    },
  });
}

export function mapPilotInputToCaseSchema(input = {}, prevSchema = {}) {
  return normalizeCaseInput({
    ...prevSchema,

    source: EVENT_SOURCE.PILOT,

    summary:
      input.summary ||
      input.summaryContext ||
      prevSchema.summary ||
      "",

    description:
      input.description ||
      prevSchema.description ||
      "",

    eventType:
      input.eventType ||
      prevSchema.eventType ||
      "general",

    eventTitle:
      input.eventTitle ||
      prevSchema.eventTitle ||
      "",

    eventContext:
      input.eventContext ||
      input.context ||
      prevSchema.eventContext ||
      "",

    claims: Array.isArray(input.claims)
      ? input.claims
      : input.claim
      ? [input.claim]
      : prevSchema.claims || [],

    evidenceItems: Array.isArray(input.evidenceItems)
      ? input.evidenceItems
      : prevSchema.evidenceItems || [],

    parties: Array.isArray(input.parties)
      ? input.parties
      : prevSchema.parties || [],

    actions: Array.isArray(input.actions)
      ? input.actions
      : prevSchema.actions || [],

    risks: Array.isArray(input.risks)
      ? input.risks
      : Array.isArray(input.riskFlags)
      ? input.riskFlags
      : prevSchema.risks || [],

    weakestDimension:
      input.weakestDimension ||
      prevSchema.weakestDimension ||
      "",

    dimensions: {
      evidence:
        input.dimensions?.evidence ??
        prevSchema.dimensions?.evidence ??
        0,
      authority:
        input.dimensions?.authority ??
        prevSchema.dimensions?.authority ??
        0,
      coordination:
        input.dimensions?.coordination ??
        prevSchema.dimensions?.coordination ??
        0,
      timing:
        input.dimensions?.timing ??
        prevSchema.dimensions?.timing ??
        0,
    },

    meta: {
      ...(prevSchema.meta || {}),
      rawInput: input,
    },

    structure: {
      hasActor: Array.isArray(input.parties) && input.parties.length > 0,
      hasAction: Array.isArray(input.actions) && input.actions.length > 0,
      hasEvidence: Array.isArray(input.evidenceItems) && input.evidenceItems.length > 0,
    },

    structureScore:
      (Array.isArray(input.parties) && input.parties.length > 0 ? 1 : 0) +
      (Array.isArray(input.actions) && input.actions.length > 0 ? 1 : 0) +
      (Array.isArray(input.evidenceItems) && input.evidenceItems.length > 0 ? 1 : 0),

    structureStatus:
      (Array.isArray(input.parties) && input.parties.length > 0) ||
      (Array.isArray(input.actions) && input.actions.length > 0)
        ? "partial"
        : "empty",
      });
    }

export function appendEventToSchema(schema = {}, eventEntry = {}) {
  const normalized = normalizeCaseInput(schema);
  const prevEvents = Array.isArray(normalized.meta?.events)
    ? normalized.meta.events
    : [];

  return normalizeCaseInput({
    ...normalized,
    meta: {
      ...(normalized.meta || {}),
      events: [...prevEvents, eventEntry],
      rawInput: normalized.meta?.rawInput || schema,
    },
  });
}