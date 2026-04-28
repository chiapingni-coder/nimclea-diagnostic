// frontend/lib/stageMap.js

export const STAGE_MAP = {
  S1: {
    label: "Unstructured Start",
    description: "You are operating without a stable structure."
  },
  S2: {
    label: "Pattern Emerging",
    description: "Early patterns are forming, but not yet reliable."
  },
  S3: {
    label: "Structure Forming",
    description: "A working structure is forming, but still fragile."
  },
  S4: {
    label: "Stabilization Needed",
    description: "Structure works, but needs stabilization before exposure."
  },
  S5: {
    label: "Structure Proven",
    description: "Structure is stable and holds under real-world pressure."
  }
}

// 安全读取（防炸）
export function getStageDisplay(stage) {
  return STAGE_MAP[stage] || {
    label: stage,
    description: ""
  }
}