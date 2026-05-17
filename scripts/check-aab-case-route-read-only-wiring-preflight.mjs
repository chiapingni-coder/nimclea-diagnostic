#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const requiredFiles = [
  "docs/NIMCLEA_AAB_BACKEND_ADAPTER_REHEARSAL_TRUST_LOOP_CONTRACT_V0_1.md",
  "docs/NIMCLEA_AAB_BACKEND_ADAPTER_REHEARSAL_MAP_V0_1.md",
  "docs/NIMCLEA_AAB_TRUST_LOOP_AUTHORITY_OWNERSHIP_MATRIX_V0_1.md",
  "docs/NIMCLEA_AAB_READ_ONLY_ROUTE_WIRING_REHEARSAL_PLAN_V0_1.md",
  "docs/NIMCLEA_AAB_CASE_ROUTE_READ_ONLY_WIRING_DESIGN_RECORD_V0_1.md",
  "backend/utils/aabBackendAdapterRehearsal.js",
  "backend/utils/aabCaseAuthorityReadAdapterRehearsal.js",
  "backend/routes/caseRoutes.js",
  "scripts/check-aab-case-route-read-only-wiring-boundary.mjs",
];

const caseRoutesPath = path.join(repoRoot, "backend", "routes", "caseRoutes.js");
const adapterPath = path.join(
  repoRoot,
  "backend",
  "utils",
  "aabCaseAuthorityReadAdapterRehearsal.js"
);
const designRecordPath = path.join(
  repoRoot,
  "docs",
  "NIMCLEA_AAB_CASE_ROUTE_READ_ONLY_WIRING_DESIGN_RECORD_V0_1.md"
);

function check(condition, message) {
  if (!condition) {
    throw new Error(message);
  }

  console.log(`PASS ${message}`);
}

function checkMissing(source, needle, message) {
  check(!source.includes(needle), message);
}

function checkIncludes(source, needle, message) {
  check(source.includes(needle), message);
}

function checkAllMissing(source, needles, messagePrefix) {
  for (const needle of needles) {
    checkMissing(source, needle, `${messagePrefix}: ${needle}`);
  }
}

try {
  console.log("Nimclea AAB Case Route Read-Only Wiring Preflight Guard v0.1");
  console.log("");

  for (const relativeFile of requiredFiles) {
    check(existsSync(path.join(repoRoot, relativeFile)), `${relativeFile} exists`);
  }

  const caseRoutesSource = readFileSync(caseRoutesPath, "utf8");
  const adapterSource = readFileSync(adapterPath, "utf8");
  const designRecordSource = readFileSync(designRecordPath, "utf8");

  check(
    /router\.get\(\s*["']\/:caseId["']/.test(caseRoutesSource) ||
      caseRoutesSource.includes("GET /case/:caseId"),
    "caseRoutes.js contains GET /case/:caseId or equivalent caseId route handling"
  );

  checkAllMissing(
    caseRoutesSource,
    [
      "renderJsonMigration",
      "importRenderJson",
      "migrate Render JSON",
      "bulk migration",
      "SUPABASE_SERVICE_ROLE_KEY",
      "service_role",
      "frontendServiceRoleAccess",
      "localStorageAuthority",
      "productionWrite",
      "writeFile",
      "appendFile",
    ],
    "caseRoutes.js forbidden preflight marker absent"
  );

  const adapterImportPresent = caseRoutesSource.includes(
    "aabCaseAuthorityReadAdapterRehearsal"
  );
  const readOnlyFunctionNames = [
    "createAabCaseAuthorityReadPlan",
    "selectAabCaseAuthoritySource",
    "describeAabCaseAuthorityReadBoundary",
    "assertNoAabCaseAuthorityMigrationIntent",
  ];
  const readOnlyFunctionUsed = readOnlyFunctionNames.some((name) =>
    caseRoutesSource.includes(name)
  );
  const isControlledWiringMode = adapterImportPresent || readOnlyFunctionUsed;

  if (!isControlledWiringMode) {
    check(true, "Mode A: caseRoutes.js remains unwired for AAB read adapter");
  } else {
    check(true, "Mode B: controlled read-only AAB route wiring detected");

    const aabFunctionNames = Array.from(
      new Set(caseRoutesSource.match(/\b\w*Aab\w*\b/g) || [])
    );
    const disallowedAabFunctionNames = aabFunctionNames.filter(
      (name) => !readOnlyFunctionNames.includes(name)
    );

    check(
      disallowedAabFunctionNames.length === 0,
      "caseRoutes.js uses only approved AAB read-only functions"
    );
    checkAllMissing(
      caseRoutesSource,
      [
        "confirmAabPayment",
        "paymentConfirmed",
        "confirm-checkout-session",
        "pdfExportUnlocked",
        "pdfExportUnlock",
        "verificationUnlocked",
        "verificationUnlock",
        "createMigration",
        "migration script",
      ],
      "caseRoutes.js controlled preflight write/unlock marker absent"
    );
  }

  checkIncludes(
    adapterSource,
    "export function createAabCaseAuthorityReadPlan",
    "adapter exports createAabCaseAuthorityReadPlan"
  );
  checkIncludes(
    adapterSource,
    "export function selectAabCaseAuthoritySource",
    "adapter exports selectAabCaseAuthoritySource"
  );
  check(
    !/from\s+["']node:fs["']|from\s+["']fs["']/.test(adapterSource),
    "adapter does not import fs"
  );
  checkMissing(adapterSource, "supabaseClient", "adapter does not import supabaseClient");
  checkMissing(adapterSource, "service_role", "adapter does not contain service_role");
  checkMissing(
    adapterSource,
    "SUPABASE_SERVICE_ROLE_KEY",
    "adapter does not contain SUPABASE_SERVICE_ROLE_KEY"
  );
  checkMissing(adapterSource, "writeFile", "adapter does not contain writeFile");
  checkMissing(adapterSource, "appendFile", "adapter does not contain appendFile");

  checkIncludes(
    designRecordSource,
    "GET /case/:caseId",
    "design record mentions GET /case/:caseId"
  );
  checkIncludes(designRecordSource, "read-only", "design record mentions read-only");
  checkIncludes(
    designRecordSource,
    "response shape",
    "design record mentions response shape"
  );
  checkIncludes(designRecordSource, "rollback", "design record mentions rollback");
  checkIncludes(
    designRecordSource,
    "no Render JSON import",
    "design record mentions no Render JSON import"
  );
  checkIncludes(
    designRecordSource,
    "no production Supabase write",
    "design record mentions no production Supabase write"
  );

  console.log("");
  console.log("PASS AAB case route read-only wiring preflight guard passed.");
} catch (error) {
  console.error("");
  console.error(`FAIL ${error?.message || error}`);
  process.exit(1);
}
