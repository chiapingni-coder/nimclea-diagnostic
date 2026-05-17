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
runInlineNodeCheck(
  "import('./backend/utils/supabaseCoreAuthorityStore.js').then(m=>{const expected=['getCaseEventsByCaseId','getCaseRecordByCaseId','getReceiptRecordByReceiptId','insertCaseEvent','isSupabaseCoreAuthorityEnabled','upsertCaseRecord','upsertReceiptRecord'].sort(); const actual=Object.keys(m).sort(); const missing=expected.filter(k=>!actual.includes(k)); const extra=actual.filter(k=>!expected.includes(k)); if(missing.length || extra.length){console.error({missing, extra, actual}); process.exit(1);} console.log('PASS supabase core authority store exports');})",
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
