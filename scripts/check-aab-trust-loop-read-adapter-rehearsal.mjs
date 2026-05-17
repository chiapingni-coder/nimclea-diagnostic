#!/usr/bin/env node

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertNoAabTrustLoopMigrationIntent,
  createAabTrustLoopReadPlan,
  deriveAabTrustLoopAuthorityState,
  describeAabTrustLoopReadBoundary,
} from "../backend/utils/aabTrustLoopReadAdapterRehearsal.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const utilityPath = path.join(
  repoRoot,
  "backend",
  "utils",
  "aabTrustLoopReadAdapterRehearsal.js"
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

function checkNoWrites(state, message) {
  check(
    state.migrationPerformed === false &&
      state.writePerformed === false &&
      state.runtimeAuthorityChanged === false,
    message
  );
}

try {
  console.log("Nimclea AAB Trust-Loop Read Adapter Rehearsal Guard v0.1");
  console.log("");

  check(
    typeof createAabTrustLoopReadPlan === "function",
    "createAabTrustLoopReadPlan export exists"
  );
  check(
    typeof deriveAabTrustLoopAuthorityState === "function",
    "deriveAabTrustLoopAuthorityState export exists"
  );
  check(
    typeof describeAabTrustLoopReadBoundary === "function",
    "describeAabTrustLoopReadBoundary export exists"
  );
  check(
    typeof assertNoAabTrustLoopMigrationIntent === "function",
    "assertNoAabTrustLoopMigrationIntent export exists"
  );

  const plan = createAabTrustLoopReadPlan();
  check(plan.runtimeWired === false, "read plan runtimeWired is false");
  check(
    plan.renderJsonMigrationAllowed === false,
    "read plan renderJsonMigrationAllowed is false"
  );
  check(
    plan.localStorageAuthorityAllowed === false,
    "read plan localStorageAuthorityAllowed is false"
  );
  check(
    plan.routeArea === "trust-loop-authority" &&
      plan.mode === "read-only-rehearsal" &&
      plan.productionWriteAllowed === false &&
      plan.frontendDirectSupabaseAllowed === false,
    "read plan contains required trust-loop boundary fields"
  );

  const noReady = deriveAabTrustLoopAuthorityState({
    caseAuthorityPresent: true,
    eventReviewed: false,
  });
  check(noReady.receiptReady === false, "receiptReady requires eventReviewed");
  checkNoWrites(noReady, "partial receipt readiness performs no migration or write");

  const ready = deriveAabTrustLoopAuthorityState({
    caseAuthorityPresent: true,
    eventReviewed: true,
  });
  check(
    ready.receiptReady === true,
    "receiptReady requires both caseAuthorityPresent and eventReviewed"
  );
  checkNoWrites(ready, "receipt readiness performs no migration or write");

  const unpaid = deriveAabTrustLoopAuthorityState({
    paymentRecord: { status: "pending" },
  });
  check(
    unpaid.paymentConfirmed === false,
    "paymentConfirmed rejects non-confirmed payment status"
  );
  checkNoWrites(unpaid, "unconfirmed payment performs no migration or write");

  const paid = deriveAabTrustLoopAuthorityState({
    paymentRecord: { status: "confirmed" },
  });
  check(
    paid.paymentConfirmed === true,
    "paymentConfirmed requires paymentRecord.status confirmed"
  );
  check(
    paid.pdfExportUnlocked === true,
    "pdfExportUnlocked allows confirmed payment"
  );
  checkNoWrites(paid, "confirmed payment performs no migration or write");

  const entitled = deriveAabTrustLoopAuthorityState({
    entitlementRecord: { pdfExport: true },
  });
  check(
    entitled.pdfExportUnlocked === true,
    "pdfExportUnlocked allows backend entitlement"
  );
  checkNoWrites(entitled, "entitlement unlock performs no migration or write");

  const verificationBlocked = deriveAabTrustLoopAuthorityState({
    receiptRecord: { issued: true },
    paymentRecord: { status: "confirmed" },
    verificationRecord: { unlocked: false },
  });
  check(
    verificationBlocked.verificationEligible === true &&
      verificationBlocked.verificationUnlocked === false,
    "verificationUnlocked requires verificationRecord.unlocked"
  );
  checkNoWrites(
    verificationBlocked,
    "blocked verification performs no migration or write"
  );

  const verificationUnlocked = deriveAabTrustLoopAuthorityState({
    receiptRecord: { issued: true },
    paymentRecord: { status: "confirmed" },
    verificationRecord: { unlocked: true },
  });
  check(
    verificationUnlocked.verificationEligible === true &&
      verificationUnlocked.verificationUnlocked === true,
    "verificationUnlocked requires receiptIssued, paymentConfirmed, and unlocked verification record"
  );
  checkNoWrites(
    verificationUnlocked,
    "verification unlock performs no migration or write"
  );

  const missing = deriveAabTrustLoopAuthorityState({});
  check(missing.authoritySource === "missing", "missing records return missing authority source");
  checkNoWrites(missing, "missing authority performs no migration or write");

  const boundary = describeAabTrustLoopReadBoundary();
  check(
    boundary.routeWiringIncluded === false &&
      boundary.supabaseReadIntegration === "backend-only" &&
      boundary.renderJsonImport === "prohibited",
    "read boundary describes backend-only read integration with no route wiring"
  );

  check(
    assertNoAabTrustLoopMigrationIntent({}) === true,
    "safe migration intent returns true"
  );
  checkThrows(
    () => assertNoAabTrustLoopMigrationIntent({ renderJsonMigration: true }),
    "renderJsonMigration intent throws"
  );
  checkThrows(
    () => assertNoAabTrustLoopMigrationIntent({ importRenderJson: true }),
    "importRenderJson intent throws"
  );
  checkThrows(
    () => assertNoAabTrustLoopMigrationIntent({ productionWrite: true }),
    "productionWrite intent throws"
  );
  checkThrows(
    () => assertNoAabTrustLoopMigrationIntent({ frontendServiceRoleAccess: true }),
    "frontendServiceRoleAccess intent throws"
  );
  checkThrows(
    () => assertNoAabTrustLoopMigrationIntent({ localStorageAuthority: true }),
    "localStorageAuthority intent throws"
  );

  const source = readFileSync(utilityPath, "utf8");
  check(!/from\s+["']node:fs["']|from\s+["']fs["']/.test(source), "utility does not import fs");
  check(!source.includes("supabaseClient"), "utility does not import supabaseClient");
  check(!source.includes("service_role"), "utility source does not contain service_role");
  check(!source.includes("localStorage"), "utility source does not contain localStorage");

  console.log("");
  console.log("PASS AAB trust-loop read adapter rehearsal guard passed.");
} catch (error) {
  console.error("");
  console.error(`FAIL ${error?.message || error}`);
  process.exit(1);
}
