function normalizeAccessLifecycleValue(value) {
  return String(value ?? "").trim().toLowerCase();
}

function hasBackendReceiptReadySignal(caseData = {}) {
  const receiptStatus = normalizeAccessLifecycleValue(caseData.receiptStatus);
  const status = normalizeAccessLifecycleValue(caseData.status);
  const stage = normalizeAccessLifecycleValue(caseData.stage);
  const readyValues = new Set([
    "ready",
    "receipt_ready",
    "issued",
    "activated",
    "paid",
    "receipt_paid",
  ]);

  return Boolean(
    caseData.explicitReceiptReady === true ||
      caseData.explicitBackendReady === true ||
      caseData.backendReceiptReady === true ||
      caseData.receiptEligible === true ||
      caseData.caseReceiptEligible === true ||
      caseData.receipt_ready === true ||
      caseData.receipt?.eligible === true ||
      readyValues.has(receiptStatus) ||
      readyValues.has(status) ||
      readyValues.has(stage)
  );
}

function hasBackendVerificationEligibleSignal(caseData = {}) {
  const verificationStatus = normalizeAccessLifecycleValue(caseData.verificationStatus);
  const verificationPaymentStatus = normalizeAccessLifecycleValue(
    caseData.verificationPaymentStatus
  );
  const readyValues = new Set([
    "ready",
    "active",
    "activated",
    "issued",
    "paid",
  ]);

  return Boolean(
    caseData.verificationEligible === true ||
      caseData.verification_ready === true ||
      caseData.verification?.eligible === true ||
      caseData.verificationPaid === true ||
      caseData.payment?.verificationPaid === true ||
      readyValues.has(verificationStatus) ||
      readyValues.has(verificationPaymentStatus)
  );
}

export function resolveAccessMode(caseData = {}) {
  const normalizedScore = Number(
    caseData.normalizedScore ??
      caseData.score ??
      caseData.receiptScore ??
      0
  );

  const eventCount = Number(
    caseData.eventCount ??
      caseData.events?.length ??
      caseData.capturedEvents?.length ??
      0
  );

  const receiptPaid = Boolean(
    caseData.receiptPaid ??
      caseData.payment?.receiptPaid ??
      caseData.paid?.receipt ??
      false
  );

  const verificationPaid = Boolean(
    caseData.verificationPaid ??
      caseData.payment?.verificationPaid ??
      caseData.paid?.verification ??
      false
  );

  const backendReceiptReady = hasBackendReceiptReadySignal(caseData);
  const backendVerificationEligible =
    hasBackendVerificationEligibleSignal(caseData);
  const receiptEligible = backendReceiptReady || normalizedScore >= 3.0;
  const verificationEligible =
    backendVerificationEligible || (receiptEligible && eventCount > 0);

  let mode = "trial";

  if (receiptPaid && verificationPaid) {
    mode = "paid_full";
  } else if (receiptPaid) {
    mode = "paid_receipt";
  }

  return {
    mode,

    normalizedScore,
    eventCount,

    receiptEligible,
    verificationEligible,

    receiptPaid,
    verificationPaid,

    canViewReceipt: receiptEligible,
    canViewFullReceipt: receiptPaid,

    canViewVerification: verificationEligible,
    canRunVerification: verificationPaid,

    canExportPDF: receiptPaid,
    canUploadFiles: verificationPaid,

    needsScore: !(
      receiptEligible ||
      backendReceiptReady ||
      backendVerificationEligible
    ),
    needsEvent: eventCount <= 0,
    isTrial: mode === "trial",
    isPaidReceipt: mode === "paid_receipt",
    isPaidFull: mode === "paid_full",
  };
}
