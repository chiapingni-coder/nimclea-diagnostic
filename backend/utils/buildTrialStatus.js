const DAY_MS = 24 * 60 * 60 * 1000;

const SAFE_DEFAULT = Object.freeze({
  trialActive: false,
  trialStartedAt: null,
  trialEndsAt: null,
  trialDay: null,
  trialEnded: false,
  casesCreatedDuringTrial: 0,
  pilotSummaryAvailable: false,
  pilotSummaryPaid: false,
  shouldShowTrialStatusBar: false,
  shouldShowPilotSummaryEntry: false,
  source: "none",
});

const WORKSPACE_CONTINUATION_SCOPES = new Set([
  "pilot_extension",
  "workspace_renewal",
  "workspace_subscription",
  "trial_continuation",
  "pilot_summary",
]);

const EXCLUDED_PAYMENT_SCOPES = new Set([
  "receipt_activation",
  "formal_receipt",
  "formal_verification",
  "verification",
]);

const PAID_STATUSES = new Set([
  "active",
  "complete",
  "completed",
  "paid",
  "succeeded",
]);

function safeDefault() {
  return { ...SAFE_DEFAULT };
}

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function getRecordEmail(record = {}) {
  return normalizeEmail(record.email || record.userEmail || record.contactEmail);
}

function getRecordUserId(record = {}) {
  return normalizeText(record.userId || record.user_id || record.customerId);
}

function getRecordTrialId(record = {}) {
  return normalizeText(record.trialId || record.trial_id || record.trialSession?.trialId);
}

function parseTime(value) {
  const raw = normalizeText(value);
  if (!raw) return null;

  const date = new Date(raw);
  const time = date.getTime();

  if (!Number.isFinite(time)) return null;

  return date;
}

function toIso(date) {
  return date instanceof Date && Number.isFinite(date.getTime())
    ? date.toISOString()
    : null;
}

function normalizeNow(value) {
  const parsed = parseTime(value);
  return parsed || new Date();
}

function hasUserIdMatch(record = {}, targetUserId = "") {
  return Boolean(targetUserId && getRecordUserId(record) === targetUserId);
}

function hasEmailMatch(record = {}, targetEmail = "") {
  return Boolean(targetEmail && getRecordEmail(record) === targetEmail);
}

function isRelatedRecord(record = {}, selectedTrial = {}, targetUserId = "", targetEmail = "") {
  const selectedTrialId = getRecordTrialId(selectedTrial);
  const recordTrialId = getRecordTrialId(record);

  if (selectedTrialId && recordTrialId && selectedTrialId === recordTrialId) {
    return true;
  }

  if (hasUserIdMatch(record, targetUserId)) {
    return true;
  }

  if (hasEmailMatch(record, targetEmail)) {
    return true;
  }

  return false;
}

function hasStartedTrial(record = {}) {
  return Boolean(parseTime(record.startedAt || record.trialStartedAt));
}

function getStartDate(record = {}) {
  return parseTime(record.startedAt || record.trialStartedAt);
}

function getEndDate(record = {}, startDate = null) {
  const explicitEnd = parseTime(record.expiresAt || record.trialEndsAt);

  if (explicitEnd) return explicitEnd;
  if (!startDate) return null;

  return new Date(startDate.getTime() + 7 * DAY_MS);
}

function getOrderingTime(record = {}) {
  // createdAt is ordering fallback only; it is never trial start authority.
  return (
    parseTime(record.startedAt || record.trialStartedAt)?.getTime() ??
    parseTime(record.createdAt)?.getTime() ??
    0
  );
}

function selectTrialRecord({
  trialRecords = [],
  email = "",
  userId = "",
  nowDate,
}) {
  const records = Array.isArray(trialRecords) ? trialRecords : [];
  const targetEmail = normalizeEmail(email);
  const targetUserId = normalizeText(userId);

  if (!targetEmail && !targetUserId) return null;

  const userMatchedRecords = records.filter((record) => {
    if (!record || typeof record !== "object") return false;

    return hasUserIdMatch(record, targetUserId);
  });
  const emailMatchedRecords = records.filter((record) => {
    if (!record || typeof record !== "object") return false;

    return hasEmailMatch(record, targetEmail);
  });
  const matchingRecords =
    targetUserId && userMatchedRecords.length > 0
      ? userMatchedRecords
      : emailMatchedRecords;

  const trustedRecords = matchingRecords.filter(hasStartedTrial);

  if (trustedRecords.length === 0) return null;

  const recordsWithWindow = trustedRecords.map((record) => {
    const startDate = getStartDate(record);
    const endDate = getEndDate(record, startDate);
    const status = normalizeText(record.status).toLowerCase();
    const active =
      startDate &&
      endDate &&
      nowDate.getTime() >= startDate.getTime() &&
      nowDate.getTime() < endDate.getTime() &&
      status !== "expired" &&
      status !== "ended";

    return {
      record,
      active: Boolean(active),
      orderingTime: getOrderingTime(record),
    };
  });

  const activeRecords = recordsWithWindow
    .filter((item) => item.active)
    .sort((a, b) => b.orderingTime - a.orderingTime);

  if (activeRecords.length > 0) return activeRecords[0].record;

  return recordsWithWindow.sort((a, b) => b.orderingTime - a.orderingTime)[0]?.record || null;
}

function isArchivedOrDeleted(record = {}) {
  const status = normalizeText(record.status).toLowerCase();
  const lifecycle = normalizeText(record.lifecycleStatus).toLowerCase();

  return (
    record.archived === true ||
    record.deleted === true ||
    record.discarded === true ||
    status === "archived" ||
    status === "deleted" ||
    status === "discarded" ||
    lifecycle === "archived" ||
    lifecycle === "deleted" ||
    lifecycle === "discarded"
  );
}

function countCasesDuringTrial({
  caseRecords = [],
  selectedTrial,
  email = "",
  userId = "",
  startDate,
  endDate,
}) {
  const records = Array.isArray(caseRecords) ? caseRecords : [];
  const targetEmail = normalizeEmail(email);
  const targetUserId = normalizeText(userId);
  const relatedCases = records.filter(
    (record) =>
      record &&
      typeof record === "object" &&
      !isArchivedOrDeleted(record) &&
      isRelatedRecord(record, selectedTrial, targetUserId, targetEmail)
  );

  if (!startDate || !endDate) return relatedCases.length;

  const timestampedCases = relatedCases.filter((record) => {
    const createdAt = parseTime(record.createdAt || record.savedAt || record.updatedAt);

    return (
      createdAt &&
      createdAt.getTime() >= startDate.getTime() &&
      createdAt.getTime() <= endDate.getTime()
    );
  });

  if (timestampedCases.length > 0) return timestampedCases.length;

  return relatedCases.length;
}

function hasSummaryAvailable(record = {}) {
  // PilotResultPage must not be authority for pilot-level summary availability.
  return (
    record.pilotSummaryAvailable === true ||
    record.summaryAvailable === true ||
    record.pilotSummaryReady === true ||
    record.summaryReady === true
  );
}

function getPaymentScope(record = {}) {
  return normalizeText(
    record.paymentType ||
      record.priceType ||
      record.productType ||
      record.paymentScope ||
      record.type ||
      record.scope ||
      record.subscription?.paymentType ||
      record.subscription?.priceType
  ).toLowerCase();
}

function hasPaidStatus(record = {}) {
  const statusValues = [
    record.status,
    record.paymentStatus,
    record.subscriptionStatus,
    record.pilotExtensionPaymentStatus,
    record.subscription?.status,
    record.subscription?.paymentStatus,
    record.subscription?.subscriptionStatus,
  ].map((value) => normalizeText(value).toLowerCase());

  return (
    record.pilotExtensionPaid === true ||
    record.subscription?.pilotExtensionPaid === true ||
    statusValues.some((status) => PAID_STATUSES.has(status))
  );
}

function isWorkspaceContinuationPayment(record = {}) {
  // Payment scope must be explicit; generic paid fields are not enough.
  const scope = getPaymentScope(record);

  if (!scope || EXCLUDED_PAYMENT_SCOPES.has(scope)) return false;

  return WORKSPACE_CONTINUATION_SCOPES.has(scope);
}

function isPilotSummaryPaid({
  paymentRecords = [],
  subscriptionRecords = [],
  selectedTrial,
  email = "",
  userId = "",
}) {
  const targetEmail = normalizeEmail(email);
  const targetUserId = normalizeText(userId);
  const records = [
    ...(Array.isArray(paymentRecords) ? paymentRecords : []),
    ...(Array.isArray(subscriptionRecords) ? subscriptionRecords : []),
  ];

  return records.some(
    (record) =>
      record &&
      typeof record === "object" &&
      isRelatedRecord(record, selectedTrial, targetUserId, targetEmail) &&
      isWorkspaceContinuationPayment(record) &&
      hasPaidStatus(record)
  );
}

export function buildTrialStatus({
  email,
  userId,
  trialRecords = [],
  caseRecords = [],
  paymentRecords = [],
  subscriptionRecords = [],
  now = new Date(),
} = {}) {
  // This helper is read-only: it only normalizes supplied inputs.
  const nowDate = normalizeNow(now);
  const targetEmail = normalizeEmail(email);
  const targetUserId = normalizeText(userId);
  const selectedTrial = selectTrialRecord({
    trialRecords,
    email: targetEmail,
    userId: targetUserId,
    nowDate,
  });

  if (!selectedTrial) return safeDefault();

  const startDate = getStartDate(selectedTrial);
  const endDate = getEndDate(selectedTrial, startDate);

  if (!startDate || !endDate) return safeDefault();

  const nowMs = nowDate.getTime();
  const startMs = startDate.getTime();
  const endMs = endDate.getTime();

  if (!Number.isFinite(nowMs) || !Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    return safeDefault();
  }

  const futureTrial = nowMs < startMs;
  const trialActive = !futureTrial && nowMs < endMs;
  const trialEnded = nowMs >= endMs;
  const elapsedDays = Math.floor((Math.max(nowMs, startMs) - startMs) / DAY_MS) + 1;
  const boundedTrialDay = Math.max(1, Math.min(7, elapsedDays));
  const trialDay = trialActive || trialEnded ? boundedTrialDay : null;
  const pilotSummaryAvailable = hasSummaryAvailable(selectedTrial);
  const pilotSummaryPaid = isPilotSummaryPaid({
    paymentRecords,
    subscriptionRecords,
    selectedTrial,
    email: targetEmail,
    userId: targetUserId,
  });
  const shouldShowPilotSummaryEntry =
    pilotSummaryAvailable === true &&
    pilotSummaryPaid !== true &&
    (trialEnded || trialDay === 7);
  const shouldShowTrialStatusBar =
    trialActive === true &&
    trialDay !== null &&
    shouldShowPilotSummaryEntry !== true;
  const casesCreatedDuringTrial = countCasesDuringTrial({
    caseRecords,
    selectedTrial,
    email: targetEmail,
    userId: targetUserId,
    startDate,
    endDate,
  });

  const sourceParts = ["backend_trial_record"];

  if (casesCreatedDuringTrial > 0) sourceParts.push("with_cases");
  if (pilotSummaryPaid) sourceParts.push("with_payment");

  return {
    trialActive,
    trialStartedAt: toIso(startDate),
    trialEndsAt: toIso(endDate),
    trialDay,
    trialEnded,
    casesCreatedDuringTrial,
    pilotSummaryAvailable,
    pilotSummaryPaid,
    shouldShowTrialStatusBar,
    shouldShowPilotSummaryEntry,
    source: sourceParts.join("_"),
  };
}

export default buildTrialStatus;
