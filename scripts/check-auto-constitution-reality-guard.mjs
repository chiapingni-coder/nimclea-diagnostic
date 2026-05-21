import fs from "node:fs";
import path from "node:path";

const docsDir = "docs";

const enforcementMarker = /Constitutional reality guard:\s*required/i;
const claimWords = /\b(PASS|closure|closed|fixed|stable|implemented|complete|completed|ready)\b/i;

const requiredRealityAnchors = [
  /observation/i,
  /boundary/i,
  /reality signal/i,
];

let failures = 0;
let checked = 0;

for (const file of fs.readdirSync(docsDir)) {
  if (!file.endsWith(".md")) continue;

  const fullPath = path.join(docsDir, file);
  const text = fs.readFileSync(fullPath, "utf8");

  if (!enforcementMarker.test(text)) continue;

  checked += 1;

  if (!claimWords.test(text)) continue;

  const missing = requiredRealityAnchors.filter((rx) => !rx.test(text));

  if (missing.length > 0) {
    failures += 1;
    console.error(
      `FAIL auto constitution reality guard: ${fullPath} has enforcement marker and completion/stability claims but lacks required reality anchors: ${missing.map(String).join(", ")}`
    );
  }
}

if (failures > 0) {
  process.exit(1);
}

console.log(`PASS auto constitution reality guard: checked ${checked} constitution-marked docs`);
