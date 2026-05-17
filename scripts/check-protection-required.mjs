#!/usr/bin/env node

import { execFileSync } from "node:child_process";

function runGit(args) {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function parseStatusShort(output = "") {
  const files = [];

  for (const line of String(output || "").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const path = trimmed.slice(3).trim();
    if (path) files.push(path);
  }

  return files;
}

function parseDiffNameOnly(output = "") {
  return String(output || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function classifyFile(file = "") {
  const normalized = String(file || "").replace(/\\/g, "/");

  if (
    normalized.startsWith("frontend/pages/") ||
    normalized.startsWith("frontend/utils/") ||
    normalized.startsWith("backend/") ||
    normalized.startsWith("scripts/")
  ) {
    return "core code";
  }

  if (normalized.startsWith("docs/")) {
    return "docs only";
  }

  if (
    normalized.startsWith("supabase/") ||
    normalized.startsWith("migrations/") ||
    normalized === "package.json" ||
    normalized.endsWith(".env") ||
    normalized.startsWith(".env.") ||
    normalized.includes(".env.")
  ) {
    return "config/schema risk";
  }

  return "other";
}

try {
  const statusOutput = runGit(["status", "--short"]);
  const diffOutput = runGit(["diff", "--name-only"]);

  const changedFiles = Array.from(
    new Set([...parseStatusShort(statusOutput), ...parseDiffNameOnly(diffOutput)]),
  ).sort();

  const classifications = changedFiles.map((file) => ({
    file,
    category: classifyFile(file),
  }));

  const hasCoreCode = classifications.some((item) => item.category === "core code");
  const hasConfigRisk = classifications.some(
    (item) => item.category === "config/schema risk",
  );
  const hasDocsOnly =
    classifications.length > 0 &&
    classifications.every((item) => item.category === "docs only");
  const protectionPackMayBeRequired =
    changedFiles.length > 0 && (hasCoreCode || hasConfigRisk || !hasDocsOnly);

  console.log("Changed files:");
  if (changedFiles.length === 0) {
    console.log("- (none)");
  } else {
    for (const { file, category } of classifications) {
      console.log(`- ${file} [${category}]`);
    }
  }

  console.log("");
  console.log(`Protection pack may be required: ${protectionPackMayBeRequired ? "yes" : "no"}`);
  console.log("");
  console.log("Suggested next command:");
  console.log("node scripts/create-protection-pack.mjs");
  console.log("");
  console.log("Suggested validation:");
  console.log("git diff --check");
  console.log("node scripts/check-release-gate.mjs");
} catch (error) {
  console.error(error?.message || error);
  process.exitCode = 1;
}
