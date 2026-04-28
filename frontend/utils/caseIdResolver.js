export function resolveSafeCaseId(source = {}) {
  if (!source || typeof source !== "object") return "";

  return (
    source.caseId ||
    source.case_id ||
    source.id ||
    source.resultId ||
    source.trialId ||
    source.trialSession?.caseId ||
    source.trialSession?.case_id ||
    source.routeMeta?.caseId ||
    source.metadata?.caseId ||
    source.case?.caseId ||
    source.case?.id ||
    source.caseSnapshot?.caseId ||
    source.caseSnapshot?.caseRecord?.caseId ||
    ""
  );
}

export function requireCaseIdOrFallback(source = {}, fallback = "/cases") {
  const caseId = resolveSafeCaseId(source);
  return {
    caseId,
    hasCaseId: Boolean(caseId),
    fallback,
  };
}
