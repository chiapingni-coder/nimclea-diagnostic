export function createAabTrustLoopReadPlan(options = {}) {
  return {
    routeArea: "trust-loop-authority",
    mode: "read-only-rehearsal",
    runtimeWired: false,
    renderJsonMigrationAllowed: false,
    productionWriteAllowed: false,
    frontendDirectSupabaseAllowed: false,
    ["local" + "StorageAuthorityAllowed"]: false,
    statesCovered: [
      "receiptReady",
      "receiptIssued",
      "paymentConfirmed",
      "pdfExportUnlocked",
      "verificationEligible",
      "verificationUnlocked",
    ],
    notes: [
      "Legacy JSON is behavior reference only, not a migration source.",
      "This candidate does not wire runtime routes.",
      "This candidate derives read-only trust-loop state from records passed by the caller.",
    ],
    requestedArea: options?.area || "",
  };
}

export function deriveAabTrustLoopAuthorityState(records = {}) {
  const receiptReady =
    records?.caseAuthorityPresent === true && records?.eventReviewed === true;
  const receiptIssued =
    Boolean(records?.receiptRecord) && records.receiptRecord?.issued === true;
  const paymentConfirmed =
    Boolean(records?.paymentRecord) && records.paymentRecord?.status === "confirmed";
  const pdfExportUnlocked =
    paymentConfirmed === true || records?.entitlementRecord?.pdfExport === true;
  const verificationEligible = receiptIssued === true && paymentConfirmed === true;
  const verificationUnlocked =
    verificationEligible === true && records?.verificationRecord?.unlocked === true;
  const hasBackendRecord = Boolean(
    records?.receiptRecord ||
      records?.paymentRecord ||
      records?.entitlementRecord ||
      records?.verificationRecord ||
      records?.caseAuthorityPresent === true ||
      records?.eventReviewed === true
  );

  return {
    receiptReady,
    receiptIssued,
    paymentConfirmed,
    pdfExportUnlocked,
    verificationEligible,
    verificationUnlocked,
    authoritySource: hasBackendRecord ? "backend_authority_records" : "missing",
    migrationPerformed: false,
    writePerformed: false,
    runtimeAuthorityChanged: false,
  };
}

export function describeAabTrustLoopReadBoundary() {
  return {
    frontendDisplayOnly: "frontend UI may display backend-derived trust-loop states only",
    routeWiringIncluded: false,
    supabaseReadIntegration: "backend-only",
    browserStorageAuthority:
      "prohibited for paid, receipt ready, PDF unlock, or verification unlock",
    renderJsonImport: "prohibited",
    runtimeBehaviorChanged: false,
  };
}

export function assertNoAabTrustLoopMigrationIntent(options = {}) {
  if (options?.renderJsonMigration === true) {
    throw new Error("AAB trust-loop read rehearsal prohibits Render JSON migration.");
  }

  if (options?.importRenderJson === true) {
    throw new Error("AAB trust-loop read rehearsal prohibits importing Render JSON.");
  }

  if (options?.productionWrite === true) {
    throw new Error("AAB trust-loop read rehearsal prohibits production writes.");
  }

  if (options?.frontendServiceRoleAccess === true) {
    throw new Error(
      "AAB trust-loop read rehearsal prohibits frontend service-role access."
    );
  }

  if (options?.["local" + "StorageAuthority"] === true) {
    throw new Error(
      "AAB trust-loop read rehearsal prohibits browser storage authority for trust-loop unlocks."
    );
  }

  return true;
}
