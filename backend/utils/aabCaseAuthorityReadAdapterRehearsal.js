export function createAabCaseAuthorityReadPlan(options = {}) {
  return {
    routeArea: "case-authority",
    mode: "read-only-rehearsal",
    runtimeWired: false,
    renderJsonMigrationAllowed: false,
    productionWriteAllowed: false,
    frontendDirectSupabaseAllowed: false,
    readPriority: ["supabase_clean_authority", "legacy_json_reference"],
    notes: [
      "Legacy JSON is behavior reference only, not a migration source.",
      "This candidate does not wire runtime routes.",
      "This candidate does not read Supabase or local JSON files directly.",
    ],
    requestedRoute: options?.route || "",
  };
}

export function selectAabCaseAuthoritySource(candidates = {}) {
  if (candidates?.supabaseCleanAuthorityRecord) {
    return {
      source: "supabase_clean_authority",
      record: candidates.supabaseCleanAuthorityRecord,
      migrationPerformed: false,
      writePerformed: false,
      runtimeAuthorityChanged: false,
    };
  }

  if (candidates?.legacyJsonReferenceRecord) {
    return {
      source: "legacy_json_reference",
      record: candidates.legacyJsonReferenceRecord,
      migrationPerformed: false,
      writePerformed: false,
      runtimeAuthorityChanged: false,
      referenceOnly: true,
    };
  }

  return {
    source: "missing",
    record: null,
    migrationPerformed: false,
    writePerformed: false,
    runtimeAuthorityChanged: false,
  };
}

export function describeAabCaseAuthorityReadBoundary() {
  return {
    frontendApiContractStable: true,
    routeWiringIncluded: false,
    supabaseReadIntegration: "backend-only",
    legacyJsonRole: "reference only",
    renderJsonImport: "prohibited",
    runtimeBehaviorChanged: false,
  };
}

export function assertNoAabCaseAuthorityMigrationIntent(options = {}) {
  if (options?.renderJsonMigration === true) {
    throw new Error("AAB case authority read rehearsal prohibits Render JSON migration.");
  }

  if (options?.importRenderJson === true) {
    throw new Error("AAB case authority read rehearsal prohibits importing Render JSON.");
  }

  if (options?.productionWrite === true) {
    throw new Error("AAB case authority read rehearsal prohibits production writes.");
  }

  if (options?.frontendServiceRoleAccess === true) {
    throw new Error(
      "AAB case authority read rehearsal prohibits frontend service-role access."
    );
  }

  return true;
}
