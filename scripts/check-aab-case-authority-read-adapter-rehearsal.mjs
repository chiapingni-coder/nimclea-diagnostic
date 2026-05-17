#!/usr/bin/env node

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertNoAabCaseAuthorityMigrationIntent,
  createAabCaseAuthorityReadPlan,
  describeAabCaseAuthorityReadBoundary,
  selectAabCaseAuthoritySource,
} from "../backend/utils/aabCaseAuthorityReadAdapterRehearsal.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const utilityPath = path.join(
  repoRoot,
  "backend",
  "utils",
  "aabCaseAuthorityReadAdapterRehearsal.js"
);

function check(condition, message) {
  if (!condition) {
    throw new Error(message);
  }

  console.log(`PASS ${message}`);
}

function checkThrows(fn, message) {
  let threw = false;

  try {
    fn();
  } catch (error) {
    threw = error instanceof Error && Boolean(error.message);
  }

  check(threw, message);
}

function checkNoWrites(selection, message) {
  check(
    selection.migrationPerformed === false &&
      selection.writePerformed === false &&
      selection.runtimeAuthorityChanged === false,
    message
  );
}

try {
  console.log("Nimclea AAB Case Authority Read Adapter Rehearsal Guard v0.1");
  console.log("");

  check(
    typeof createAabCaseAuthorityReadPlan === "function",
    "createAabCaseAuthorityReadPlan export exists"
  );
  check(
    typeof selectAabCaseAuthoritySource === "function",
    "selectAabCaseAuthoritySource export exists"
  );
  check(
    typeof describeAabCaseAuthorityReadBoundary === "function",
    "describeAabCaseAuthorityReadBoundary export exists"
  );
  check(
    typeof assertNoAabCaseAuthorityMigrationIntent === "function",
    "assertNoAabCaseAuthorityMigrationIntent export exists"
  );

  const plan = createAabCaseAuthorityReadPlan();
  check(plan.runtimeWired === false, "read plan runtimeWired is false");
  check(
    plan.renderJsonMigrationAllowed === false,
    "read plan renderJsonMigrationAllowed is false"
  );
  check(
    plan.routeArea === "case-authority" &&
      plan.mode === "read-only-rehearsal" &&
      plan.productionWriteAllowed === false &&
      plan.frontendDirectSupabaseAllowed === false,
    "read plan contains required read-only boundary fields"
  );

  const supabaseRecord = { caseId: "CASE-1" };
  const legacyRecord = { caseId: "CASE-2" };
  const supabaseSelection = selectAabCaseAuthoritySource({
    supabaseCleanAuthorityRecord: supabaseRecord,
    legacyJsonReferenceRecord: legacyRecord,
  });
  check(
    supabaseSelection.source === "supabase_clean_authority" &&
      supabaseSelection.record === supabaseRecord,
    "Supabase clean authority candidate wins when both records exist"
  );
  checkNoWrites(supabaseSelection, "Supabase selection performs no migration or write");

  const legacySelection = selectAabCaseAuthoritySource({
    legacyJsonReferenceRecord: legacyRecord,
  });
  check(
    legacySelection.source === "legacy_json_reference" &&
      legacySelection.referenceOnly === true,
    "legacy JSON reference is selected only as reference when Supabase is missing"
  );
  checkNoWrites(legacySelection, "legacy selection performs no migration or write");

  const missingSelection = selectAabCaseAuthoritySource({});
  check(
    missingSelection.source === "missing",
    "missing state returns source missing"
  );
  checkNoWrites(missingSelection, "missing selection performs no migration or write");

  const boundary = describeAabCaseAuthorityReadBoundary();
  check(
    boundary.frontendApiContractStable === true &&
      boundary.routeWiringIncluded === false &&
      boundary.supabaseReadIntegration === "backend-only" &&
      boundary.legacyJsonRole === "reference only" &&
      boundary.renderJsonImport === "prohibited",
    "read boundary describes stable frontend contract and backend-only Supabase integration"
  );

  check(
    assertNoAabCaseAuthorityMigrationIntent({}) === true,
    "safe migration intent returns true"
  );
  checkThrows(
    () => assertNoAabCaseAuthorityMigrationIntent({ renderJsonMigration: true }),
    "renderJsonMigration intent throws"
  );
  checkThrows(
    () => assertNoAabCaseAuthorityMigrationIntent({ importRenderJson: true }),
    "importRenderJson intent throws"
  );
  checkThrows(
    () => assertNoAabCaseAuthorityMigrationIntent({ productionWrite: true }),
    "productionWrite intent throws"
  );
  checkThrows(
    () =>
      assertNoAabCaseAuthorityMigrationIntent({
        frontendServiceRoleAccess: true,
      }),
    "frontendServiceRoleAccess intent throws"
  );

  const source = readFileSync(utilityPath, "utf8");
  check(!/from\s+["']node:fs["']|from\s+["']fs["']/.test(source), "utility does not import fs");
  check(!source.includes("supabaseClient"), "utility does not import supabaseClient");
  check(!source.includes("service_role"), "utility source does not contain service_role");

  console.log("");
  console.log("PASS AAB case authority read adapter rehearsal guard passed.");
} catch (error) {
  console.error("");
  console.error(`FAIL ${error?.message || error}`);
  process.exit(1);
}
