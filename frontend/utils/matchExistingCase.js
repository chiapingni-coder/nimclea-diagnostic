export function normalizeMatchText(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value = "") {
  return normalizeMatchText(value)
    .split(" ")
    .filter((word) => word.length >= 4);
}

function unique(items = []) {
  return Array.from(new Set(items));
}

export function scoreCaseMatch(inputText = "", caseRecord = {}) {
  const inputTokens = unique(tokenize(inputText));

  const caseText = [
    caseRecord.caseId,
    caseRecord.title,
    caseRecord.summary,
    caseRecord.description,
    caseRecord.workflow,
    caseRecord.scenarioCode,
    caseRecord.patternId,
    caseRecord.weakestDimension,
    ...(Array.isArray(caseRecord.events)
      ? caseRecord.events.flatMap((event) => [
          event.text,
          event.description,
          event.label,
          event.eventType,
          event.type,
        ])
      : []),
  ]
    .filter(Boolean)
    .join(" ");

  const caseTokens = unique(tokenize(caseText));

  if (inputTokens.length === 0 || caseTokens.length === 0) {
    return {
      caseId: caseRecord.caseId || "",
      score: 0,
      matchedTokens: [],
      reason: "insufficient_text",
    };
  }

  const matchedTokens = inputTokens.filter((token) =>
    caseTokens.includes(token)
  );

  const score = matchedTokens.length / inputTokens.length;

  return {
    caseId: caseRecord.caseId || "",
    score,
    matchedTokens,
    reason:
      score >= 0.5
        ? "strong_token_overlap"
        : score >= 0.25
          ? "weak_token_overlap"
          : "low_overlap",
  };
}

export function matchExistingCase(inputText = "", caseRecords = [], options = {}) {
  const threshold = options.threshold ?? 0.35;

  const scored = caseRecords
    .filter(Boolean)
    .map((caseRecord) => scoreCaseMatch(inputText, caseRecord))
    .sort((a, b) => b.score - a.score);

  const bestMatch = scored[0] || null;

  return {
    matched: Boolean(bestMatch && bestMatch.score >= threshold),
    bestMatch,
    candidates: scored.slice(0, options.limit ?? 3),
    threshold,
  };
}
