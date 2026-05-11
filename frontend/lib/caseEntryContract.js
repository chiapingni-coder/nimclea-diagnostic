function normalizeCaseId(value = "") {
  return String(value || "").trim();
}

function normalizeCaseList(cases) {
  return Array.isArray(cases) ? cases.filter(Boolean) : [];
}

function getCaseId(caseItem = {}) {
  if (!caseItem || typeof caseItem !== "object") return "";

  return normalizeCaseId(caseItem.caseId || caseItem.case_id || caseItem.id || "");
}

function toValidDate(value) {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function hasAnyExistingCase(cases) {
  return normalizeCaseList(cases).some((caseItem) => {
    if (typeof caseItem === "string") {
      return normalizeCaseId(caseItem).length > 0;
    }

    return getCaseId(caseItem).length > 0;
  });
}

export function isFirstCaseEntry({ cases, currentCaseId } = {}) {
  const normalizedCurrentCaseId = normalizeCaseId(currentCaseId);
  const existingCases = normalizeCaseList(cases).filter((caseItem) => {
    if (typeof caseItem === "string") {
      return normalizeCaseId(caseItem).length > 0;
    }

    return getCaseId(caseItem).length > 0;
  });

  if (existingCases.length === 0) {
    return true;
  }

  if (!normalizedCurrentCaseId) {
    return existingCases.length <= 1;
  }

  return (
    existingCases.length === 1 &&
    getCaseId(existingCases[0]) === normalizedCurrentCaseId
  );
}

export function getResultPrimaryCtaContract({
  cases,
  currentCaseId,
  hasCompletedDiagnostic,
  isReturningUser,
} = {}) {
  const isFirstEntry = isFirstCaseEntry({ cases, currentCaseId });
  const canShowPilotCta =
    hasCompletedDiagnostic === true &&
    isFirstEntry &&
    isReturningUser !== true;

  if (canShowPilotCta) {
    return {
      ctaKey: "start_7_day_pilot",
      label: "Start 7-day Pilot",
      usesPilotLanguage: true,
      caseIdIsPrimaryIdentity: true,
    };
  }

  return {
    ctaKey: hasCompletedDiagnostic === true ? "continue_case" : "create_new_case",
    label: hasCompletedDiagnostic === true ? "Continue Case" : "Create New Case",
    usesPilotLanguage: false,
    caseIdIsPrimaryIdentity: true,
  };
}

export function getPilotResultSummaryContract({
  trialStartedAt,
  trialEndedAt,
  isRenewed,
  now,
} = {}) {
  const endedAt = toValidDate(trialEndedAt);
  const currentTime = toValidDate(now) || new Date();
  const hasTrialEnded = Boolean(endedAt && endedAt.getTime() <= currentTime.getTime());
  const shouldShowTrialSummary = hasTrialEnded && isRenewed !== true;

  return {
    summaryType: shouldShowTrialSummary ? "trial_summary" : "case_summary",
    showRenewalPrompt: shouldShowTrialSummary,
    showSeparateTrialSummary: shouldShowTrialSummary,
    continueAsNormalCasePlan: isRenewed === true,
    trialStartedAt: trialStartedAt || "",
    trialEndedAt: trialEndedAt || "",
  };
}
