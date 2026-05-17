export const AAB_ADAPTER_REHEARSAL_SCOPE = Object.freeze({
  purpose: "AAB backend adapter rehearsal boundary",
  renderJsonMigration: "prohibited",
  backendOnlyAdapterBoundary: true,
  frontendDirectSupabaseWrites: "prohibited",
  localStorageAuthority: {
    payment: "prohibited",
    receipt: "prohibited",
    pdf: "prohibited",
    verification: "prohibited",
  },
  productionWrite: "prohibited until isolated rehearsal is recorded",
  isolatedRehearsalBeforeProductionWrite: true,
});

export function getAabAdapterRehearsalScope() {
  return {
    ...AAB_ADAPTER_REHEARSAL_SCOPE,
    localStorageAuthority: {
      ...AAB_ADAPTER_REHEARSAL_SCOPE.localStorageAuthority,
    },
  };
}

export function assertAabAdapterInput(input = {}) {
  if (input?.renderJsonMigration === true) {
    throw new Error("AAB adapter rehearsal prohibits Render JSON migration into Supabase.");
  }

  if (input?.frontendServiceRoleAccess === true) {
    throw new Error("AAB adapter rehearsal prohibits frontend service_role access.");
  }

  if (input?.localStorageAuthority === true) {
    throw new Error(
      "AAB adapter rehearsal prohibits localStorage authority for payment, receipt, PDF, or verification."
    );
  }

  if (input?.productionWrite === true) {
    throw new Error("AAB adapter rehearsal prohibits production writes before isolated rehearsal.");
  }

  return true;
}

export function describeAabTrustLoopAuthority() {
  return {
    caseAuthority: {
      allowed: ["backend case authority", "isolated Supabase rehearsal case record"],
      disallowed: ["frontend-only state", "localStorage", "Render JSON migration"],
    },
    receiptReady: {
      allowed: ["backend receipt readiness decision", "backend case/receipt authority"],
      disallowed: ["localStorage", "UI step completion", "query params"],
    },
    paymentConfirmed: {
      allowed: ["backend payment record", "payment provider confirmation"],
      disallowed: ["localStorage", "checkout return URL alone", "frontend success screen"],
    },
    pdfExportUnlocked: {
      allowed: ["backend-confirmed payment", "backend-confirmed entitlement"],
      disallowed: ["localStorage", "frontend PDF state", "query params"],
    },
    verificationUnlocked: {
      allowed: ["backend-confirmed receipt authority", "backend-confirmed payment authority"],
      disallowed: ["localStorage", "frontend route state", "checkout return URL alone"],
    },
  };
}

export function isAabWriteRehearsalAllowed(options = {}) {
  return (
    options?.isolated === true &&
    options?.production === false &&
    options?.renderJsonMigration !== true &&
    options?.frontendServiceRoleAccess !== true
  );
}
