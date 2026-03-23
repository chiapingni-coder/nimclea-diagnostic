import { generatePreview } from "./previewGenerator.js";

// 👇 模拟一个 scenarioEngine 的输出（最小可跑）
const mockScenarioResult = {
  scenarioId: "scenario_a",
  scenarioCode: "A",
  scenarioLabel: "Localized Control Gap",
  intensity: {
    level: 2,
    label: "Emerging Control Pressure"
  },
  topSignals: [
    {
      key: "retrieval_friction",
      score: 4,
      group: "evidence_fragmentation_score"
    },
    {
      key: "version_drift",
      score: 3,
      group: "evidence_fragmentation_score"
    }
  ],
  primarySignalGroup: "evidence_fragmentation_score",
  primaryGroupScore: 4,
  totalScore: 12,
  triggerQuestions: ["Q3", "Q7"]
};

// 👇 直接生成 preview
const preview = generatePreview({
  scenarioResult: mockScenarioResult
});

console.log("\n=== PREVIEW RESULT ===\n");
console.log(JSON.stringify(preview, null, 2));