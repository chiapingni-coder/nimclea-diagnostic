#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const results = [];

function addResult(status, area, detail) {
  results.push({ status, area, detail });
}

function checkDocExists(relativeFile) {
  const absoluteFile = path.join(repoRoot, relativeFile);

  if (existsSync(absoluteFile)) {
    addResult("PASS", `doc: ${relativeFile}`, "required document exists");
  } else {
    addResult("FAIL", `doc: ${relativeFile}`, "required document is missing");
  }
}

function runExistingScript(relativeFile, area) {
  const absoluteFile = path.join(repoRoot, relativeFile);

  if (!existsSync(absoluteFile)) {
    addResult("WARN", area, `${relativeFile} is missing; check skipped`);
    return;
  }

  const result = spawnSync("node", [absoluteFile], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.error) {
    addResult("FAIL", area, `${relativeFile} could not run: ${result.error.message}`);
    return;
  }

  if (result.status === 0) {
    addResult("PASS", area, `${relativeFile} exited 0`);
    return;
  }

  const stderr = (result.stderr || "").trim();
  const stdout = (result.stdout || "").trim();
  const detail = stderr || stdout || `exit code ${result.status}`;
  addResult("FAIL", area, `${relativeFile} failed: ${detail.split(/\r?\n/).slice(-1)[0]}`);
}

function runInlineNodeCheck(script, area) {
  const result = spawnSync("node", ["-e", script], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.error) {
    addResult("FAIL", area, `inline node check could not run: ${result.error.message}`);
    return;
  }

  if (result.status === 0) {
    addResult("PASS", area, "node -e smoke exited 0");
    return;
  }

  const stderr = (result.stderr || "").trim();
  const stdout = (result.stdout || "").trim();
  const detail = stderr || stdout || `exit code ${result.status}`;
  addResult("FAIL", area, `inline node check failed: ${detail.split(/\r?\n/).slice(-1)[0]}`);
}

function checkNoCaseDiagnosticModalGuard() {
  const relativeFile = "frontend/pages/CasesPage.jsx";
  const absoluteFile = path.join(repoRoot, relativeFile);

  if (!existsSync(absoluteFile)) {
    addResult("FAIL", "no-case diagnostic modal guard", `${relativeFile} is missing`);
    return;
  }

  const source = readFileSync(absoluteFile, "utf8");

  if (source.includes("showNoCaseModalForEmpty: !isKnownWorkspaceEmail(email)")) {
    addResult(
      "FAIL",
      "no-case diagnostic modal guard",
      "FAIL guard: no-case diagnostic modal trigger was re-enabled"
    );
    return;
  }

  if (source.includes("showNoCaseModalForEmpty: false")) {
    addResult(
      "PASS",
      "no-case diagnostic modal guard",
      "PASS guard: no-case diagnostic modal remains disabled"
    );
    return;
  }

  addResult(
    "FAIL",
    "no-case diagnostic modal guard",
    "FAIL guard: no-case diagnostic modal trigger was re-enabled"
  );
}

function printResults() {
  console.log("Nimclea Golden Case release gate v0.1");
  console.log("");

  for (const result of results) {
    console.log(`${result.status} ${result.area} - ${result.detail}`);
  }

  const counts = results.reduce(
    (summary, result) => {
      summary[result.status] += 1;
      return summary;
    },
    { PASS: 0, WARN: 0, FAIL: 0 }
  );

  const finalResult = counts.FAIL > 0 ? "FAIL" : counts.WARN > 0 ? "WARN" : "PASS";

  console.log("");
  console.log(`Summary: PASS ${counts.PASS} / WARN ${counts.WARN} / FAIL ${counts.FAIL}`);
  console.log(`Final result: ${finalResult}`);

  return finalResult;
}

const requiredDocs = [
  "docs/NIMCLEA_RELEASE_GATE_ALIGNMENT_V0_1.md",
  "docs/NIMCLEA_PROGRESS_AND_RISK_MAP_V0_1.md",
  "docs/NIMCLEA_GOLDEN_CASE_RELEASE_GATE_EXECUTION_PLAN_V0_1.md",
  "docs/NIMCLEA_GOLDEN_TEST_CASES_V0_1.md",
  "docs/NIMCLEA_GOLDEN_TEST_SMOKE_CHECK_V0_1.md",
  "docs/NIMCLEA_GOLDEN_TEST_EXECUTION_PLAN_V0_1.md",
  "docs/NIMCLEA_READINESS_SCORING_RULE_TABLE_V0_1.md",
  "docs/NIMCLEA_17G5A_RELEASE_STABILITY_STOP_LINE_V0_1.md",
  "docs/NIMCLEA_SCOPE_LOCK_V0_1.md",
  "docs/NIMCLEA_ACCEPTANCE_CHECKLIST_V0_1.md",
  "docs/NIMCLEA_003_004_TRUST_FOUNDATION_NEXT_ACTION_PLAN_V0_1.md",
  "docs/NIMCLEA_003_004_PASSIVE_SKELETON_VERIFICATION_RECORD_V0_1.md",
  "docs/NIMCLEA_003_004_CASE_EVENTS_AUTHORITY_RENAME_RECORD_V0_1.md",
  "docs/NIMCLEA_004_CASE_SCHEMA_SNAPSHOT_FIELD_DECISION_RECORD_V0_1.md",
  "docs/NIMCLEA_SUPABASE_CLEAN_AUTHORITY_MIGRATION_APPLY_PLAN_V0_1.md",
  "docs/NIMCLEA_SUPABASE_CLEAN_AUTHORITY_TARGET_PROJECT_CONFIRMATION_RECORD_V0_1.md",
  "docs/NIMCLEA_SUPABASE_IDENTITY_MAPPING_DECISION_V0_1.md",
  "docs/NIMCLEA_SUPABASE_BACKEND_ONLY_WRITE_BOUNDARY_DECISION_V0_1.md",
  "docs/NIMCLEA_SUPABASE_CLEAN_AUTHORITY_MIGRATION_CANDIDATE_V0_1.md",
  "docs/NIMCLEA_SUPABASE_CLEAN_AUTHORITY_ISOLATED_REHEARSAL_PLAN_V0_1.md",
  "docs/NIMCLEA_SUPABASE_CLEAN_AUTHORITY_ISOLATED_REHEARSAL_RUNBOOK_V0_1.md",
  "docs/NIMCLEA_SUPABASE_ISOLATED_REHEARSAL_TARGET_DECISION_V0_1.md",
  "docs/NIMCLEA_SUPABASE_ISOLATED_REHEARSAL_TARGET_CONFIRMATION_RECORD_V0_1.md",
  "docs/NIMCLEA_SUPABASE_ISOLATED_REHEARSAL_READINESS_REVIEW_V0_1.md",
  "docs/NIMCLEA_SUPABASE_CLEAN_AUTHORITY_ISOLATED_REHEARSAL_PASS_RECORD_V0_1.md",
  "docs/NIMCLEA_SUPABASE_CLEAN_AUTHORITY_EXISTING_PROJECT_REUSE_DECISION_V0_1.md",
  "docs/NIMCLEA_SUPABASE_CORE_TABLES_MIGRATION_CANDIDATE_V0_1.md",
  "docs/NIMCLEA_004_SUPABASE_SCHEMA_AUTHORITY_supabase-schema-authority_PROTECTION_PACK_V0_1.md",
  "docs/NIMCLEA_00A_PROTECTION_PACK_HELPER_create-protection-pack-helper_PROTECTION_PACK_V0_1.md",
  "docs/NIMCLEA_00B_PROTECTION_REQUIRED_HELPER_check-protection-required-helper_PROTECTION_PACK_V0_1.md",
  "docs/NIMCLEA_SUPABASE_CLEAN_AUTHORITY_SQL_REVIEW_PASS_RECORD_V0_1.md",
  "docs/NIMCLEA_SUPABASE_CLEAN_AUTHORITY_SQL_DRAFT_V0_1.md",
  "docs/NIMCLEA_SUPABASE_CLEAN_AUTHORITY_MIGRATION_BLOCKER_RECORD_V0_1.md",
  "docs/NIMCLEA_SUPABASE_SCHEMA_CLEAN_AUTHORITY_SMOKE_PASS_RECORD_V0_1.md",
  "docs/NIMCLEA_CASE_EVENTS_CLEAN_AUTHORITY_PASS_RECORD_V0_1.md",
  "docs/NIMCLEA_CASES_CLEAN_AUTHORITY_PASS_RECORD_V0_1.md",
  "docs/NIMCLEA_RECEIPT_RECORDS_CLEAN_AUTHORITY_PASS_RECORD_V0_1.md",
  "docs/NIMCLEA_SUPABASE_CORE_CLEAN_AUTHORITY_BASELINE_COMPLETE_V0_1.md",
  "docs/NIMCLEA_SUPABASE_CLEAN_AUTHORITY_PUBLIC_SCHEMA_COLLISION_RECORD_V0_1.md",
  "docs/NIMCLEA_AAB_BACKEND_ADAPTER_REHEARSAL_TRUST_LOOP_CONTRACT_V0_1.md",
  "docs/NIMCLEA_AAB_BACKEND_ADAPTER_REHEARSAL_MAP_V0_1.md",
  "docs/NIMCLEA_AAB_TRUST_LOOP_AUTHORITY_OWNERSHIP_MATRIX_V0_1.md",
  "docs/NIMCLEA_AAB_READ_ONLY_ROUTE_WIRING_REHEARSAL_PLAN_V0_1.md",
  "docs/NIMCLEA_AAB_CASE_ROUTE_READ_ONLY_WIRING_DESIGN_RECORD_V0_1.md",
  "docs/NIMCLEA_AAB_CASE_ROUTE_READ_ONLY_WIRING_POST_VERIFICATION_RECORD_V0_1.md",
  "docs/NIMCLEA_AAB18_CASES_ROUTE_READ_ONLY_REHEARSAL_EXECUTION_RECORD_V0_1.md",
  "docs/NIMCLEA_AAB17_CASES_ROUTE_READ_ONLY_REHEARSAL_PLAN_V0_1.md",
  "docs/NIMCLEA_AAB19_CASES_ROUTE_EXISTING_CASE_FIXTURE_DISCOVERY_RECORD_V0_1.md",
  "docs/NIMCLEA_AAB20_EXISTING_CASE_FIXTURE_CREATION_DECISION_RECORD_V0_1.md",
  "docs/NIMCLEA_AAB21_EXISTING_CASE_FIXTURE_CREATION_PLAN_V0_1.md",
  "docs/NIMCLEA_AAB22_EXISTING_CASE_FIXTURE_TARGET_ENVIRONMENT_SELECTION_RECORD_V0_1.md",
  "docs/NIMCLEA_AAB23_EXISTING_CASE_FIXTURE_TARGET_PROJECT_PAYLOAD_PREFLIGHT_RECORD_V0_1.md",
  "docs/NIMCLEA_AAB24_CONTROLLED_EXISTING_CASE_FIXTURE_SQL_CANDIDATE_DRY_RUN_RECORD_V0_1.md",
  "docs/NIMCLEA_AAB25_CONTROLLED_EXISTING_CASE_FIXTURE_INSERT_REVIEW_RECORD_V0_1.md",
  "docs/NIMCLEA_AAB26_CONTROLLED_EXISTING_CASE_FIXTURE_CREATION_EXECUTION_RECORD_V0_1.md",
  "docs/NIMCLEA_AAB26A_TARGET_SCHEMA_ALIGNMENT_DECISION_RECORD_V0_1.md",
  "docs/NIMCLEA_AAB26B_CLEAN_AUTHORITY_ISOLATED_TARGET_CONFIRMATION_CREATION_PLAN_V0_1.md",
  "docs/NIMCLEA_AAB26C_CLEAN_AUTHORITY_TARGET_SCHEMA_VERIFICATION_RECORD_V0_1.md",
  "docs/NIMCLEA_AAB26D_CLEAN_AUTHORITY_ISOLATED_TARGET_CREATION_MIGRATION_APPLY_PLAN_V0_1.md",
  "docs/NIMCLEA_AAB26E_CLEAN_AUTHORITY_ISOLATED_TARGET_CREATION_MIGRATION_APPLY_EXECUTION_RECORD_V0_1.md",
  "docs/NIMCLEA_AAB26F_CLEAN_AUTHORITY_ISOLATED_TARGET_MIGRATION_APPLY_EVIDENCE_SCHEMA_VERIFICATION_PASS_RECORD_V0_1.md",
  "docs/NIMCLEA_AAB26G_CONTROLLED_EXISTING_CASE_FIXTURE_CREATION_EXECUTION_UPDATE_RECORD_V0_1.md",
  "docs/NIMCLEA_AAB27_EXISTING_CASE_READ_ONLY_SMOKE_EXECUTION_RECORD_V0_1.md",
  "docs/NIMCLEA_AAB28_CORE_AUTHORITY_CASE_ROUTE_FIX_POST_GATE_RECORD_V0_1.md",
  "docs/NIMCLEA_AAC01_BACKEND_ONLY_WRITE_BOUNDARY_REHEARSAL_PLAN_V0_1.md",
  "docs/NIMCLEA_AAC02_CASE_EVENTS_CONTROLLED_WRITE_CANDIDATE_RECORD_V0_1.md",
  'docs/NIMCLEA_AAC03_CASE_EVENTS_BACKEND_STORE_BOUNDARY_INSPECTION_RECORD_V0_1.md',
  'docs/NIMCLEA_AAC04_FIXTURE_ONLY_CASE_EVENTS_REHEARSAL_ENDPOINT_CANDIDATE_RECORD_V0_1.md',
  'docs/NIMCLEA_AAC05_FIXTURE_ONLY_CASE_EVENTS_REHEARSAL_ENDPOINT_IMPLEMENTATION_RECORD_V0_1.md',
  'docs/NIMCLEA_AAC05A_RENDER_REHEARSAL_ENDPOINT_NEGATIVE_EXPOSURE_SMOKE_RECORD_V0_1.md',
  'docs/NIMCLEA_AAC05B_POSITIVE_WRITE_SMOKE_TARGET_CONFIRMATION_RECORD_V0_1.md',
  'docs/NIMCLEA_AAC05C_POSITIVE_WRITE_SMOKE_TARGET_UNCONFIRMED_BLOCKER_RECORD_V0_1.md',
  'docs/NIMCLEA_AAC06_POSITIVE_WRITE_SMOKE_TARGET_RESOLUTION_PLAN_V0_1.md',
  'docs/NIMCLEA_AAC07_POSITIVE_WRITE_SMOKE_PREFLIGHT_RECORD_V0_1.md',
  'docs/NIMCLEA_AAC09_POSITIVE_WRITE_SMOKE_BLOCKER_FOLLOW_UP_RECORD_V0_1.md',
  'docs/NIMCLEA_AAC10_POSITIVE_WRITE_CONFIDENCE_PASS_TARGET_RESOLUTION_PLAN_V0_1.md',
  'docs/NIMCLEA_AAC11_POSITIVE_WRITE_CONFIDENCE_CONTROLLED_PASS_EXECUTION_RECORD_V0_1.md',
  'docs/NIMCLEA_AAC12_CASE_EVENTS_SCHEMA_MISMATCH_BLOCKER_RESOLUTION_RECORD_V0_1.md',
  'docs/NIMCLEA_AAC13_CASE_EVENTS_SCHEMA_CONTRACT_DIRECTION_DECISION_RECORD_V0_1.md',
  'docs/NIMCLEA_AAC14_BACKEND_ADAPTER_ALIGNMENT_CANDIDATE_RECORD_V0_1.md',
  'docs/NIMCLEA_AAC15_BACKEND_ADAPTER_ALIGNMENT_IMPLEMENTATION_RECORD_V0_1.md',
  'docs/NIMCLEA_AAC15A_BACKEND_ADAPTER_FIX_TRACEABILITY_NOTE_V0_1.md',
  'docs/NIMCLEA_AAC16_BLOCKER_CLOSURE_SCOPE_RECORD_V0_1.md',
  'docs/NIMCLEA_AAC17_CONTROLLED_BACKEND_WRITE_READBACK_CONFIDENCE_SMOKE_RECORD_V0_1.md',
  'docs/NIMCLEA_AAC18_CONTROLLED_BACKEND_CASE_RECORD_WRITE_READBACK_CONFIDENCE_SMOKE_RECORD_V0_1.md',
  'docs/NIMCLEA_AAC19_CASES_SCHEMA_MISMATCH_BLOCKER_CLASSIFICATION_RECORD_V0_1.md',
  'docs/NIMCLEA_AAC20_CASES_BACKEND_ADAPTER_ALIGNMENT_CANDIDATE_RECORD_V0_1.md',
  'docs/NIMCLEA_AAC21_CASES_BACKEND_ADAPTER_ALIGNMENT_IMPLEMENTATION_SMOKE_RECORD_V0_1.md',
  'docs/NIMCLEA_AAC22_CASES_CASE_METADATA_SCHEMA_MISMATCH_BLOCKER_CLASSIFICATION_RECORD_V0_1.md',
  'docs/NIMCLEA_AAC23_CASES_CASE_METADATA_BACKEND_ADAPTER_ALIGNMENT_CANDIDATE_RECORD_V0_1.md',
  'docs/NIMCLEA_AAC24_CASES_CASE_METADATA_BACKEND_ADAPTER_ALIGNMENT_IMPLEMENTATION_SMOKE_RECORD_V0_1.md',
  'docs/NIMCLEA_WORKFLOW_0_9_FAILURE_ATTRIBUTION_PROTOCOL_V0_1.md',
  'docs/NIMCLEA_AAC25_CASES_BACKEND_WRITE_READBACK_BLOCKER_CLOSURE_SCOPE_RECORD_V0_1.md',
  'docs/NIMCLEA_WORKFLOW_0_9_SCHEMA_CONTRACT_DRIFT_ATTRIBUTION_CLASSIFICATION_V0_1.md',
  'docs/NIMCLEA_AAC26_RECEIPT_RECORDS_BACKEND_WRITE_READBACK_CANDIDATE_RECORD_V0_1.md',
  'docs/NIMCLEA_AAC27_RECEIPT_RECORDS_SCHEMA_AND_BACKEND_ADAPTER_INSPECTION_RECORD_V0_1.md',
  'docs/NIMCLEA_AAC28_RECEIPT_AUTHORITY_CONTRACT_DIRECTION_DECISION_RECORD_V0_1.md',
  'docs/NIMCLEA_AAC29_RECEIPT_BACKEND_ADAPTER_ALIGNMENT_CANDIDATE_RECORD_V0_1.md',
  'docs/NIMCLEA_AAC31_RECEIPTS_BACKEND_WRITE_READBACK_CONFIDENCE_SMOKE_RECORD_V0_1.md',
  'docs/NIMCLEA_AAC32_RECEIPTS_BACKEND_AUTHORITY_CLOSURE_SCOPE_RECORD_V0_1.md',
  'docs/NIMCLEA_AAC33_PAYMENT_AUTHORITY_CONTRACT_DIRECTION_DECISION_RECORD_V0_1.md',
  'docs/NIMCLEA_AAC34_PAYMENT_BACKEND_ADAPTER_INSPECTION_CANDIDATE_RECORD_V0_1.md',
  'docs/NIMCLEA_AAC35_PAYMENT_BACKEND_ADAPTER_IMPLEMENTATION_CANDIDATE_RECORD_V0_1.md',
  'docs/NIMCLEA_AAC36_PAYMENTS_BACKEND_WRITE_READBACK_CONFIDENCE_SMOKE_RECORD_V0_1.md',
  'docs/NIMCLEA_AAC37_PAYMENTS_BACKEND_AUTHORITY_CLOSURE_SCOPE_RECORD_V0_1.md',
  'docs/NIMCLEA_AAC38_RECEIPT_PAYMENT_LINKAGE_AUTHORITY_DECISION_RECORD_V0_1.md',
  'docs/NIMCLEA_AAC39_RECEIPT_PAYMENT_LINKAGE_ADAPTER_CANDIDATE_RECORD_V0_1.md',
  'docs/NIMCLEA_AAC40_RECEIPT_PAYMENT_LINKAGE_IMPLEMENTATION_SMOKE_RECORD_V0_1.md',
  'docs/NIMCLEA_AAC41_RECEIPT_PAYMENT_LINKAGE_CLOSURE_SCOPE_RECORD_V0_1.md',
  'docs/NIMCLEA_V0_9_4A_PRODUCTION_READ_ONLY_FIXTURE_SEED_CANDIDATE_RECORD_V0_1.md',
  'docs/NIMCLEA_V0_9_4B_PRODUCTION_READ_ONLY_FIXTURE_SEED_IMPLEMENTATION_CANDIDATE_RECORD_V0_1.md',
  'docs/NIMCLEA_V0_9_4D_CUSTOMER_ID_CANONICAL_FIXTURE_SEED_PLAN_V0_1.md',
  'docs/NIMCLEA_V0_9_4E_ACTUAL_FIXTURE_SEED_IMPLEMENTATION_RECORD_V0_1.md',
  'docs/NIMCLEA_V0_9_4F_CONTROLLED_FIXTURE_SEED_SCRIPT_IMPLEMENTATION_RECORD_V0_1.md',
];

for (const doc of requiredDocs) {
  checkDocExists(doc);
}

runExistingScript(
  "scripts/check-golden-readiness.mjs",
  "golden readiness smoke"
);
runExistingScript(
  "scripts/check-golden-backend-aggregation.mjs",
  "backend /cases aggregation smoke"
);
runExistingScript(
  "scripts/check-diagnostic-q1-primary-pressure.mjs",
  "Diagnostic Q1 primary pressure wording guard"
);
runExistingScript(
  "scripts/check-receipt-verification-contract.mjs",
  "receipt verification access contract"
);
runExistingScript(
  "scripts/check-verification-locked-contract.mjs",
  "verification locked page contract"
);
runExistingScript(
  "scripts/check-7-day-trial-lifecycle-contract.mjs",
  "7-day trial lifecycle contract"
);
runExistingScript(
  "scripts/check-save-eligibility-boundary.mjs",
  "save eligibility boundary contract"
);
runExistingScript(
  "scripts/check-receipt-readiness-transition-contract.mjs",
  "receipt readiness transition contract"
);
runExistingScript(
  "scripts/check-receipt-readiness-visual-gate.mjs",
  "receipt readiness visual gate"
);
runExistingScript(
  "scripts/check-receipt-pdf-deliverable-trust.mjs",
  "receipt PDF deliverable trust guard"
);
runExistingScript(
  "scripts/check-cases-page-trial-status-bar-contract.mjs",
  "CasesPage trial status bar contract"
);
runExistingScript(
  "scripts/check-backend-trial-status-helper-contract.mjs",
  "backend trial status helper contract"
);
runExistingScript(
  "scripts/check-backend-trial-status-helper-runtime.mjs",
  "backend trial status helper runtime smoke"
);
runExistingScript(
  "scripts/check-backend-trial-status-endpoint-contract.mjs",
  "backend trial status endpoint contract"
);
runExistingScript(
  "scripts/check-backend-trial-status-endpoint-runtime.mjs",
  "backend trial status endpoint runtime smoke"
);
runExistingScript(
  "scripts/check-frontend-trial-status-adapter-contract.mjs",
  "frontend trial status adapter contract"
);
runExistingScript(
  "scripts/check-frontend-trial-status-adapter-runtime.mjs",
  "frontend trial status adapter runtime smoke"
);
runExistingScript(
  "scripts/check-trial-supabase-authority-contract.mjs",
  "trial Supabase authority contract guard"
);
runExistingScript(
  "scripts/check-aab-backend-adapter-rehearsal-skeleton.mjs",
  "AAB backend adapter rehearsal skeleton guard"
);
runExistingScript(
  "scripts/check-aab-case-authority-read-adapter-rehearsal.mjs",
  "AAB case authority read adapter rehearsal guard"
);
runExistingScript(
  "scripts/check-aab-trust-loop-read-adapter-rehearsal.mjs",
  "AAB trust-loop read adapter rehearsal guard"
);
runExistingScript(
  "scripts/check-aab-case-route-read-only-wiring-boundary.mjs",
  "AAB case route read-only wiring boundary guard"
);
runExistingScript(
  "scripts/check-aab-case-route-read-only-wiring-preflight.mjs",
  "AAB case route read-only wiring preflight guard"
);
runExistingScript(
  "scripts/check-aab-case-route-response-shape-exposure.mjs",
  "AAB case route response-shape exposure guard"
);
runInlineNodeCheck(
  "import('./backend/utils/supabaseCoreAuthorityStore.js').then(m=>{const expected=['getCaseEventsByCaseId','getCaseRecordByCaseId','getReceiptRecordByReceiptId','insertCaseEvent','isSupabaseCoreAuthorityEnabled','linkReceiptToPayment','upsertCaseRecord','upsertPaymentRecord','upsertReceiptRecord'].sort(); const actual=Object.keys(m).sort(); const missing=expected.filter(k=>!actual.includes(k)); const extra=actual.filter(k=>!expected.includes(k)); if(missing.length || extra.length){console.error({missing, extra, actual}); process.exit(1);} console.log('PASS supabase core authority store exports');})",
  "supabase core authority store exports smoke"
);
runExistingScript(
  "scripts/check-cases-page-trial-status-bar-guard.mjs",
  "CasesPage 7-day trial status bar guard"
);
runExistingScript(
  "scripts/check-result-review-cta-guard.mjs",
  "ResultPage review CTA guard"
);
runExistingScript(
  "scripts/check-event-review-contract.mjs",
  "20A event review boundary guard"
);
runExistingScript(
  "scripts/check-supabase-clean-authority-migration-draft.mjs",
  "Supabase clean authority migration draft guard"
);
checkNoCaseDiagnosticModalGuard();

addResult("WARN", "receipt readiness UI smoke", "manual-only release area");
addResult("WARN", "verification unlock UI smoke", "manual-only release area");
addResult("WARN", "payment ledger / Stripe dry-run smoke", "manual-only release area");
addResult("WARN", "new vs returning user routing smoke", "manual-only release area");
addResult("WARN", "stale local case naming smoke", "manual-only release area");

const finalResult = printResults();

if (finalResult === "FAIL") {
  process.exit(1);
}
