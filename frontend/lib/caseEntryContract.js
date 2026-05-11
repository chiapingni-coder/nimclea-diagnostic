// 7-day Pilot is a first-case entry experience, not a case type.
//
// 7-day language may appear only in these surfaces:
// 1. Result page:
//    "Start 7-day Pilot" may appear only after the customer completes the first diagnostic and has not created the first case yet.
// 2. Pilot Plan page:
//    The page may show the 7-day Pilot rules, boundary, expiration time, and evidence collection guidance.
// 3. Pilot Result page:
//    "7-Day Pilot Summary" may appear only when the 7-day window has ended and the customer has not renewed or paid.
//
// All other pages should use normal case language.
// CasesPage, ReceiptPage, VerificationPage, event capture, receipt readiness, verification readiness, and payment state must not treat 7-day Pilot as a separate case type.

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
