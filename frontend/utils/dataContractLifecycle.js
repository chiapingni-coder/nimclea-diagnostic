const FALLBACK_SOURCE_TOKENS = new Set([
  "receipt_snapshot",
  "local_test",
  "local",
  "preview",
  "cache",
  "snapshot",
]);

const LIFECYCLE_RANKS = {
  draft: 0,
  diagnostic: 1,
  diagnostic_completed: 2,
  result_ready: 3,
  result: 3,
  event_captured: 4,
  receipt_pending: 5,
  receipt_ready: 6,
  ready: 6,
  workspace_active: 6,
  active: 6,
  receipt_checkout_started: 7,
  checkout_created: 7,
  checkout_started: 7,
  receipt_paid: 8,
  paid: 8,
  receipt_activated: 9,
  activated: 9,
  receipt_issued: 10,
  issued: 10,
  verification_ready: 11,
  verification_completed: 12,
  completed: 12,
  verification_issued: 13,
};

function hasFallbackSource(record = {}) {
  const values = [
    record?.source,
    record?.origin,
    record?._source,
    record?.dataSource,
    record?.caseSource,
    record?.receipt?.source,
    record?.verification?.source,
    record?.caseBilling?.source,
    record?.payment?.source,
  ];

  return values.some((value) => {
    const normalized = normalizeLifecycleValue(value);
    if (!normalized) return false;
    if (FALLBACK_SOURCE_TOKENS.has(normalized)) return true;

    return Array.from(FALLBACK_SOURCE_TOKENS).some((token) =>
      normalized.includes(token)
    );
  });
}

function isBackendOwnedSourceValue(value) {
  const normalized = normalizeLifecycleValue(value);
  if (!normalized) return false;

  return (
    normalized.includes("backend") ||
    normalized.includes("canonical") ||
    normalized.includes("stripe") ||
    normalized.includes("confirmed") ||
    normalized.includes("supabase")
  );
}

function hasBackendOwnedReceiptAuthority(record = {}) {
  if (!record || hasFallbackSource(record)) return false;

  const sourceValues = [
    record?.source,
    record?.origin,
    record?._source,
    record?.dataSource,
    record?.authoritySource,
    record?.receiptAuthoritySource,
    record?.caseBilling?.source,
    record?.caseBilling?.authoritySource,
    record?.caseBilling?.receiptAuthoritySource,
    record?.payment?.source,
    record?.payment?.authoritySource,
    record?.payment?.receiptAuthoritySource,
    record?.receipt?.source,
    record?.receipt?.authoritySource,
    record?.receiptRecord?.source,
    record?.receiptRecord?.authoritySource,
  ];

  const authorityFlags = [
    record?.backendOwned === true,
    record?.backendOwnedReceipt === true,
    record?.canonical === true,
    record?.canonicalReceipt === true,
    record?.receipt?.backendOwned === true,
    record?.receipt?.canonical === true,
    record?.receiptRecord?.backendOwned === true,
    record?.receiptRecord?.canonical === true,
    record?.caseBilling?.backendOwnedReceipt === true,
    record?.caseBilling?.canonicalReceipt === true,
  ];

  return Boolean(
    authorityFlags.some(Boolean) ||
      sourceValues.some((value) => isBackendOwnedSourceValue(value))
  );
}

function hasBackendOwnedVerificationPayment(record = {}) {
  if (!record || hasFallbackSource(record)) return false;

  const verificationPaymentStatus = normalizeLifecycleValue(
    record?.verificationPayment?.paymentStatus ||
      record?.verificationPayment?.status ||
      record?.verificationPaymentStatus ||
      record?.payment?.verificationPaymentStatus
  );
  const verificationPaymentSource =
    record?.verificationPayment?.source ||
    record?.payment?.verificationPaymentSource ||
    record?.payment?.source ||
    record?.source;
  const hasTrustedVerificationPaymentSource = isBackendOwnedSourceValue(
    verificationPaymentSource
  );
  const caseBillingVerificationSource =
    record?.caseBilling?.source ||
    record?.caseBilling?.verificationSource ||
    record?.caseBilling?.verificationPaymentSource;

  return Boolean(
    ((record?.verificationPaid === true ||
      record?.verificationActivated === true ||
      record?.verificationPayment?.paid === true ||
      record?.verificationPayment?.activated === true ||
      record?.payment?.verificationPaid === true ||
      record?.payment?.verificationActivated === true ||
      verificationPaymentStatus === "paid" ||
      verificationPaymentStatus === "active" ||
      verificationPaymentStatus === "activated") &&
      hasTrustedVerificationPaymentSource) ||
      (record?.caseBilling?.verificationActivated === true &&
        isBackendOwnedSourceValue(caseBillingVerificationSource))
  );
}

export function normalizeLifecycleValue(value) {
  return String(value || "").trim().toLowerCase();
}

export function getLifecycleRank(value) {
  const normalized = normalizeLifecycleValue(value);
  return LIFECYCLE_RANKS[normalized] ?? -1;
}

export function getStrongestLifecycleValue(record = {}) {
  const candidates = [
    record?.stage,
    record?.status,
    record?.receiptStatus,
    record?.verificationStatus,
    record?.receipt?.stage,
    record?.receipt?.status,
    record?.verification?.stage,
    record?.verification?.status,
    record?.paymentStatus,
    record?.payment?.status,
  ].filter(Boolean);

  return candidates.reduce(
    (strongest, value) =>
      getLifecycleRank(value) > getLifecycleRank(strongest) ? value : strongest,
    ""
  );
}

export function isBackendReceiptReady(record = {}) {
  if (!record || hasFallbackSource(record)) return false;

  const receiptStatus = normalizeLifecycleValue(
    record?.receiptStatus || record?.receipt?.status
  );
  const stage = normalizeLifecycleValue(record?.stage || record?.receipt?.stage);
  const status = normalizeLifecycleValue(record?.status);

  return Boolean(
    record?.receiptEligible === true ||
      record?.caseReceiptEligible === true ||
      record?.receipt_ready === true ||
      record?.receipt?.eligible === true ||
      receiptStatus === "ready" ||
      receiptStatus === "receipt_ready" ||
      receiptStatus === "paid" ||
      receiptStatus === "activated" ||
      receiptStatus === "issued" ||
      stage === "receipt_ready" ||
      stage === "receipt_paid" ||
      stage === "receipt_activated" ||
      stage === "receipt_issued" ||
      stage === "verification_ready" ||
      stage === "verification_issued" ||
      status === "receipt_ready" ||
      status === "receipt_paid" ||
      status === "receipt_activated" ||
      status === "receipt_issued" ||
      status === "verification_ready" ||
      status === "verification_issued"
  );
}

export function isBackendOwnedReceiptReady(record = {}) {
  if (!record || !hasBackendOwnedReceiptAuthority(record)) return false;

  const receiptStatus = normalizeLifecycleValue(
    record?.receiptStatus || record?.receipt?.status || record?.receiptRecord?.status
  );
  const stage = normalizeLifecycleValue(record?.stage || record?.receipt?.stage);
  const status = normalizeLifecycleValue(record?.status);

  return Boolean(
    record?.receiptEligible === true ||
      record?.caseReceiptEligible === true ||
      record?.receipt_ready === true ||
      record?.receipt?.eligible === true ||
      record?.receiptRecord?.eligible === true ||
      receiptStatus === "ready" ||
      receiptStatus === "receipt_ready" ||
      receiptStatus === "paid" ||
      receiptStatus === "activated" ||
      receiptStatus === "issued" ||
      stage === "receipt_ready" ||
      stage === "receipt_paid" ||
      stage === "receipt_activated" ||
      stage === "receipt_issued" ||
      stage === "verification_ready" ||
      stage === "verification_issued" ||
      status === "receipt_ready" ||
      status === "receipt_paid" ||
      status === "receipt_activated" ||
      status === "receipt_issued" ||
      status === "verification_ready" ||
      status === "verification_issued"
  );
}

export function isBackendReceiptPaidOrActivated(record = {}) {
  if (!record || hasFallbackSource(record)) return false;

  const paymentStatus = normalizeLifecycleValue(
    record?.paymentStatus ||
      record?.payment?.status ||
      record?.receipt?.paymentStatus
  );
  const receiptStatus = normalizeLifecycleValue(
    record?.receiptStatus || record?.receipt?.status
  );
  const stage = normalizeLifecycleValue(record?.stage || record?.receipt?.stage);
  const status = normalizeLifecycleValue(record?.status);

  return Boolean(
    record?.receipt_paid === true ||
      record?.paid === true ||
      record?.isPaid === true ||
      record?.receiptPaid === true ||
      record?.paidReceipt === true ||
      record?.receiptActivated === true ||
      record?.formalReceiptUnlocked === true ||
      record?.caseBilling?.receiptActivated === true ||
      record?.payment?.receiptActivated === true ||
      record?.payment?.receiptPaid === true ||
      record?.receipt?.paid === true ||
      record?.receipt?.activated === true ||
      paymentStatus === "paid" ||
      paymentStatus === "activated" ||
      paymentStatus === "issued" ||
      paymentStatus === "succeeded" ||
      receiptStatus === "paid" ||
      receiptStatus === "activated" ||
      receiptStatus === "issued" ||
      stage === "receipt_paid" ||
      stage === "receipt_activated" ||
      stage === "receipt_issued" ||
      status === "receipt_paid" ||
      status === "receipt_activated" ||
      status === "receipt_issued"
  );
}

export function isBackendOwnedReceiptPaidOrActivated(record = {}) {
  if (!record || !hasBackendOwnedReceiptAuthority(record)) return false;

  const paymentStatus = normalizeLifecycleValue(
    record?.paymentStatus ||
      record?.payment?.status ||
      record?.receipt?.paymentStatus ||
      record?.receiptRecord?.paymentStatus
  );
  const receiptStatus = normalizeLifecycleValue(
    record?.receiptStatus || record?.receipt?.status || record?.receiptRecord?.status
  );
  const stage = normalizeLifecycleValue(record?.stage || record?.receipt?.stage);
  const status = normalizeLifecycleValue(record?.status);

  return Boolean(
    record?.receipt_paid === true ||
      record?.paid === true ||
      record?.isPaid === true ||
      record?.receiptPaid === true ||
      record?.paidReceipt === true ||
      record?.receiptActivated === true ||
      record?.formalReceiptUnlocked === true ||
      record?.caseBilling?.receiptActivated === true ||
      record?.payment?.receiptActivated === true ||
      record?.payment?.receiptPaid === true ||
      record?.receipt?.paid === true ||
      record?.receipt?.activated === true ||
      record?.receiptRecord?.paid === true ||
      record?.receiptRecord?.activated === true ||
      paymentStatus === "paid" ||
      paymentStatus === "activated" ||
      paymentStatus === "issued" ||
      paymentStatus === "succeeded" ||
      receiptStatus === "paid" ||
      receiptStatus === "activated" ||
      receiptStatus === "issued" ||
      stage === "receipt_paid" ||
      stage === "receipt_activated" ||
      stage === "receipt_issued" ||
      status === "receipt_paid" ||
      status === "receipt_activated" ||
      status === "receipt_issued"
  );
}

export function isBackendReceiptIssued(record = {}) {
  if (!record || hasFallbackSource(record)) return false;

  const receiptStatus = normalizeLifecycleValue(
    record?.receiptStatus || record?.receipt?.status
  );
  const stage = normalizeLifecycleValue(record?.stage || record?.receipt?.stage);
  const status = normalizeLifecycleValue(record?.status);

  return Boolean(
    record?.receiptIssued === true ||
      record?.receipt?.issued === true ||
      receiptStatus === "issued" ||
      stage === "receipt_issued" ||
      status === "receipt_issued"
  );
}

export function isBackendOwnedReceiptIssued(record = {}) {
  if (!record || !hasBackendOwnedReceiptAuthority(record)) return false;

  const receiptStatus = normalizeLifecycleValue(
    record?.receiptStatus || record?.receipt?.status || record?.receiptRecord?.status
  );
  const stage = normalizeLifecycleValue(record?.stage || record?.receipt?.stage);
  const status = normalizeLifecycleValue(record?.status);

  return Boolean(
    record?.receiptIssued === true ||
      record?.receipt?.issued === true ||
      record?.receiptRecord?.issued === true ||
      receiptStatus === "issued" ||
      stage === "receipt_issued" ||
      status === "receipt_issued"
  );
}

export function isBackendVerificationEligible(record = {}) {
  if (!record || hasFallbackSource(record)) return false;

  return Boolean(
    record?.verificationEligible === true ||
      record?.verification_ready === true ||
      record?.verification?.eligible === true ||
      hasBackendOwnedVerificationPayment(record)
  );
}

export function isBackendVerificationReady(record = {}) {
  if (!record || hasFallbackSource(record)) return false;

  const verificationStatus = normalizeLifecycleValue(
    record?.verificationStatus || record?.verification?.status
  );
  const stage = normalizeLifecycleValue(record?.stage || record?.verification?.stage);
  const status = normalizeLifecycleValue(record?.status);

  return Boolean(
    isBackendVerificationEligible(record) ||
      verificationStatus === "ready" ||
      verificationStatus === "issued" ||
      verificationStatus === "completed" ||
      stage === "verification_ready" ||
      stage === "verification_issued" ||
      status === "verification_ready" ||
      status === "verification_issued"
  );
}

export function isBackendVerificationIssued(record = {}) {
  if (!record || hasFallbackSource(record)) return false;

  const verificationStatus = normalizeLifecycleValue(
    record?.verificationStatus || record?.verification?.status
  );
  const verificationResultStatus = normalizeLifecycleValue(
    record?.verificationResult?.status ||
      record?.verification?.result?.status ||
      record?.verificationResult ||
      record?.verification?.result
  );
  const stage = normalizeLifecycleValue(record?.stage || record?.verification?.stage);
  const status = normalizeLifecycleValue(record?.status);

  return Boolean(
    record?.verification_issued === true ||
      record?.verificationIssued === true ||
      record?.verification?.issued === true ||
      verificationStatus === "issued" ||
      verificationStatus === "completed" ||
      verificationResultStatus === "issued" ||
      verificationResultStatus === "completed" ||
      verificationResultStatus === "pass" ||
      verificationResultStatus === "passed" ||
      stage === "verification_issued" ||
      stage === "verification_completed" ||
      status === "verification_issued" ||
      status === "verification_completed"
  );
}

export function hasBackendOwnedReceiptAccess(record = {}) {
  return Boolean(
    isBackendOwnedReceiptReady(record) ||
      isBackendOwnedReceiptPaidOrActivated(record) ||
      isBackendOwnedReceiptIssued(record) ||
      isBackendVerificationEligible(record) ||
      isBackendVerificationReady(record) ||
      isBackendVerificationIssued(record)
  );
}

export function hasStrictBackendOwnedReceiptAccess(record = {}) {
  return hasBackendOwnedReceiptAccess(record);
}

export function hasBackendOwnedVerificationAccess(record = {}) {
  return Boolean(
    isBackendVerificationEligible(record) ||
      isBackendVerificationReady(record) ||
      isBackendVerificationIssued(record) ||
      ((isBackendReceiptReady(record) || isBackendReceiptIssued(record)) &&
        isBackendReceiptPaidOrActivated(record))
  );
}

export function isLifecycleDowngrade(currentValue, proposedValue) {
  const currentRank = getLifecycleRank(currentValue);
  const proposedRank = getLifecycleRank(proposedValue);

  if (currentRank < 0 || proposedRank < 0) return false;
  return proposedRank < currentRank;
}

export function preserveStrongerLifecycleValue(currentValue, proposedValue) {
  return isLifecycleDowngrade(currentValue, proposedValue)
    ? currentValue
    : proposedValue;
}

export function preserveStrongerLifecycleFields(currentRecord = {}, proposedPatch = {}) {
  const nextPatch = { ...(proposedPatch || {}) };

  ["stage", "status", "receiptStatus", "verificationStatus", "paymentStatus"].forEach(
    (field) => {
      if (nextPatch[field] === undefined) return;
      nextPatch[field] = preserveStrongerLifecycleValue(
        currentRecord?.[field],
        nextPatch[field]
      );
    }
  );

  return nextPatch;
}

export function shouldSkipReceiptReadyPatch(currentRecord = {}) {
  const strongest = getStrongestLifecycleValue(currentRecord);
  return getLifecycleRank(strongest) > getLifecycleRank("receipt_ready");
}

export function buildBackendLifecycleSignals(record = {}) {
  const receiptReady = isBackendReceiptReady(record);
  const receiptPaidOrActivated = isBackendReceiptPaidOrActivated(record);
  const receiptIssued = isBackendReceiptIssued(record);
  const verificationEligible = isBackendVerificationEligible(record);
  const verificationReady = isBackendVerificationReady(record);
  const verificationIssued = isBackendVerificationIssued(record);

  return {
    receiptReady,
    receiptPaidOrActivated,
    receiptIssued,
    verificationEligible,
    verificationReady,
    verificationIssued,
    hasReceiptAccess:
      receiptReady ||
      receiptPaidOrActivated ||
      receiptIssued ||
      verificationEligible ||
      verificationReady ||
      verificationIssued,
    hasVerificationAccess:
      verificationEligible ||
      verificationReady ||
      verificationIssued ||
      ((receiptReady || receiptIssued) && receiptPaidOrActivated),
    strongestLifecycleValue: getStrongestLifecycleValue(record),
  };
}

export function getBackendReceiptHash(record = {}) {
  return (
    record?.receiptHash ||
    record?.receipt?.hash ||
    record?.receipt?.receiptHash ||
    record?.receiptRecord?.receiptHash ||
    record?.receiptRecord?.hash ||
    record?.hashLedger?.receiptHash ||
    ""
  );
}

export function getBackendVerificationHash(record = {}) {
  return (
    record?.verificationHash ||
    record?.hash ||
    record?.data?.verificationHash ||
    record?.payload?.verificationHash ||
    ""
  );
}
