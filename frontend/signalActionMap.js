const signalActionMap = {
  retrieval_friction: {
    recommendedAction: "Create one faster retrieval path for high-use evidence",
    whyThisAction:
      "If key evidence is slow to locate, the next leverage point is reducing retrieval delay, not asking people to search harder.",
    expectedShift:
      "This should reduce avoidable waiting, speed up verification, and lower the manual effort required before reviews or approvals.",
    pilotStep:
      "Pick one frequently needed evidence type and define exactly where it lives, how it is named, and who maintains it."
  },

  boundary_clarity_weakness: {
    recommendedAction: "Clarify workflow boundaries at the points where coordination gets fuzzy",
    whyThisAction:
      "When boundaries are weak, people compensate with extra coordination instead of relying on structure.",
    expectedShift:
      "This should reduce ambiguity, lower duplicated effort, and make handoffs easier to trust.",
    pilotStep:
      "Map one cross-team workflow and mark where responsibility or scope becomes unclear."
  },

  definition_conflict: {
    recommendedAction: "Standardize the meaning of one high-value output",
    whyThisAction:
      "If people are working from slightly different definitions, misalignment will keep resurfacing even when effort is high.",
    expectedShift:
      "This should reduce rework, improve alignment, and make outputs easier to evaluate consistently.",
    pilotStep:
      "Choose one recurring deliverable and write one shared definition for what 'done' and 'correct' mean."
  },

  handoff_integrity_risk: {
    recommendedAction: "Tighten one fragile handoff with explicit readiness rules",
    whyThisAction:
      "When handoffs drift, downstream work becomes harder to trust and more expensive to repair.",
    expectedShift:
      "This should reduce dropped context, improve continuity, and make the workflow feel more stable across steps.",
    pilotStep:
      "Pick one handoff that often causes confusion and define what must be present before it can move forward."
  },

  operational_clarity: {
    recommendedAction: "Preserve the current clarity with one lightweight operating standard",
    whyThisAction:
      "When a workflow is already relatively clear, the best move is to lock in what is working before complexity erodes it.",
    expectedShift:
      "This should help maintain consistency, reduce drift over time, and support smoother scaling.",
    pilotStep:
      "Choose one well-functioning workflow and document the current path so it can be repeated without extra explanation."
  },

  stable_ownership_paths: {
    recommendedAction: "Protect strong ownership paths by documenting them explicitly",
    whyThisAction:
      "Stable ownership is valuable, but it becomes fragile if it only lives in habit or team memory.",
    expectedShift:
      "This should keep accountability clear as the workflow grows or changes hands.",
    pilotStep:
      "Write down the owner, trigger, and expected output for the 3 clearest ownership moments in one workflow."
  },

  low_structural_friction: {
    recommendedAction: "Use one low-friction workflow as the reference model",
    whyThisAction:
      "The best way to improve noisier workflows is often to copy patterns from one that already moves cleanly.",
    expectedShift:
      "This should reveal which structural habits are worth reusing elsewhere.",
    pilotStep:
      "Select one workflow that feels smooth today and identify the 2 or 3 structural features that make it easier to run."
  },

  structural_friction: {
    recommendedAction: "Focus on the single friction point that repeats most often",
    whyThisAction:
      "Broad friction is easiest to reduce when you narrow it to one visible and repeated bottleneck.",
    expectedShift:
      "This should turn a vague pattern into one practical improvement path and make the next fix more measurable.",
    pilotStep:
      "Review one live workflow, identify the most repeated source of delay or confusion, and test one structural change there first."
  },

  evidence_fragmentation: {
    recommendedAction: "Create one traceable evidence path for a single workflow",
    whyThisAction:
      "When evidence is scattered, the fastest leverage is not collecting more proof. It is reducing the number of places people must check.",
    expectedShift:
      "This should reduce reconstruction time, make verification faster, and increase confidence during review or audit moments.",
    pilotStep:
      "Choose one recurring workflow and define one source-of-truth path for records, rationale, and final output."
  },

  evidence_search_chaos: {
    recommendedAction: "Standardize how evidence is named, stored, and retrieved",
    whyThisAction:
      "If people must search across folders, chats, and versions, the bottleneck is retrieval discipline, not effort.",
    expectedShift:
      "This should shorten search time, reduce repeated clarification, and make evidence easier to defend under pressure.",
    pilotStep:
      "Pick one evidence type and create a simple naming rule plus one fixed retrieval location for the next 2 weeks."
  },

  hidden_process_debt: {
    recommendedAction: "Identify the top 3 manual patches keeping the workflow alive",
    whyThisAction:
      "Hidden process debt usually stays invisible because people are compensating for it every day. Exposing the patches is the first step to removing them.",
    expectedShift:
      "This should reveal where time is leaking, reduce repeated manual rescue work, and clarify which process gaps are structural.",
    pilotStep:
      "List the 3 most common manual workarounds in one live workflow and mark which step each one is compensating for."
  },

  workflow_repeatability_gap: {
    recommendedAction: "Turn one judgment-heavy workflow into a repeatable checklist",
    whyThisAction:
      "If a workflow only works when the same person holds it together, the next leverage point is repeatability, not scale.",
    expectedShift:
      "This should reduce dependency on individual memory and make outcomes more consistent across people and runs.",
    pilotStep:
      "Document one workflow as a step-by-step checklist that another person could follow without extra verbal explanation."
  },

  external_pressure_exposure: {
    recommendedAction: "Stress-test the workflow at one high-pressure checkpoint",
    whyThisAction:
      "Pressure is revealing weak spots that may stay hidden in normal operations. Testing the pressure point directly gives the clearest signal.",
    expectedShift:
      "This should show where ownership, traceability, or evidence flow breaks first when stakes rise.",
    pilotStep:
      "Take one recent deadline, audit, or review event and map exactly where the workflow slowed, fragmented, or required rescue."
  },

  reconstruction_burden: {
    recommendedAction: "Reduce late-stage assembly by defining upstream output format",
    whyThisAction:
      "If final outputs need heavy reconstruction, the upstream steps are not producing reusable artifacts in the right form.",
    expectedShift:
      "This should reduce cleanup time at the end and make deliverables feel more complete before the final step.",
    pilotStep:
      "Choose one output that often needs rework and define the minimum format upstream contributors must provide."
  },

  unstable_decision_structure: {
    recommendedAction: "Make decision points explicit with owner, trigger, and rule",
    whyThisAction:
      "When decision logic lives in the moment, people cannot reliably repeat or defend the outcome.",
    expectedShift:
      "This should increase decision consistency, reduce escalation ambiguity, and make reviews easier to explain.",
    pilotStep:
      "For one workflow, write down the top 3 decision points and assign each a clear owner, trigger, and decision rule."
  },

  manual_coordination_load: {
    recommendedAction: "Reduce hand-carried coordination in one workflow lane",
    whyThisAction:
      "Heavy coordination load means progress depends on reminders and follow-ups instead of system structure.",
    expectedShift:
      "This should reduce status chasing, lower dependency on one coordinator, and improve flow reliability.",
    pilotStep:
      "Pick one recurring handoff and define what must be present before it moves forward, without requiring a separate reminder."
  },

  unclear_ownership: {
    recommendedAction: "Clarify ownership at the 3 moments where work stalls most",
    whyThisAction:
      "When ownership is fuzzy, delays multiply because no one feels fully accountable for closing the loop.",
    expectedShift:
      "This should reduce limbo states, duplicate effort, and uncertainty about who moves the workflow next.",
    pilotStep:
      "Review one stalled workflow and assign explicit owners to the 3 steps where responsibility is currently assumed but not stated."
  },

  low_traceability_confidence: {
    recommendedAction: "Link outputs back to evidence and reasoning in one visible chain",
    whyThisAction:
      "Weak traceability does not always mean missing data. It often means the chain between evidence, reasoning, and outcome is invisible.",
    expectedShift:
      "This should make results easier to trust, explain, and defend when questions arise.",
    pilotStep:
      "For one result, create a simple chain showing evidence source → reasoning step → decision/output."
  }
};

export function getSignalAction(signalKey = "") {
  const normalizedKey = String(signalKey)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");

  return (
    signalActionMap[normalizedKey] || {
      recommendedAction: "Run a small pilot on the strongest structural friction point",
      whyThisAction:
        "The goal is to turn the strongest recurring friction into one visible improvement path.",
      expectedShift:
        "This should clarify whether the issue is structural, repeatable, and worth addressing first.",
      pilotStep:
        "Choose one live workflow, identify the most repeated friction point, and test one small structural change."
    }
  );
}

export default signalActionMap;