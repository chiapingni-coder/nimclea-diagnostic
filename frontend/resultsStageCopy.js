// frontend/resultsStageCopy.js

export function getStageCopy(stage) {
  const map = {
    S1: {
      title: "You are in a diffuse / unclear situation",
      description:
        "Your signals suggest unclear boundaries and weak structure. The system cannot anchor a stable decision path yet.",
      next:
        "First step: clarify ownership and define boundaries before taking action.",
    },

    S2: {
      title: "You are under pressure accumulation",
      description:
        "There is growing pressure but no structured release path. This often leads to reactive decisions.",
      next:
        "You need to convert pressure into a controlled execution path.",
    },

    S3: {
      title: "You are at a decision pivot point",
      description:
        "Multiple options exist, but each carries trade-offs. The risk is misaligned judgment.",
      next:
        "The system will guide you to select a path and validate it.",
    },

    S4: {
      title: "You are entering execution stage",
      description:
        "The structure is clear enough to move. Now the risk shifts to execution failure.",
      next:
        "Focus on controlled execution and feedback loops.",
    },

    S5: {
      title: "You are in outcome stabilization",
      description:
        "The decision has been made, but long-term stability is not guaranteed.",
      next:
        "You need verification and audit to lock the result.",
    },
  };

  return map[stage] || map["S1"];
}