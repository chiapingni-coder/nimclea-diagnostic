const signalContentMap = {
  external_pressure_exposure: {
    title: "Pressure is exposing weak spots in the workflow",
    description:
      "When deadlines, audits, or cross-team requests increase, the workflow appears to lose clarity and becomes harder to explain or defend.",
    whyThisMatters:
      "This usually means the process is not failing randomly. It is struggling when pressure reveals missing structure, unclear ownership, or weak traceability.",
    whyYou:
      "Your answers suggest that the workflow may look workable in normal moments, but becomes harder to trust when the stakes rise.",
    realWorld:
      "This often shows up as last-minute clarification, repeated follow-up, or a scramble to reconstruct what happened before something can be approved or delivered.",
    recommendedAction:
    "Stress-test the weakest pressure point before the next real escalation.",
    pilotStep:
    "Take one recent high-pressure case, identify where the scramble began, and add one checkpoint or ownership rule to prevent that breakdown.",
    pilotMetric:
    "Reduction in last-minute clarification or rework under pressure"
  },

  workflow_repeatability_gap: {
    title: "The workflow may not be repeatable without extra manual coordination",
    description:
      "The same task likely depends on memory, side conversations, or individual judgment rather than a path another person could follow cleanly.",
    whyThisMatters:
      "A workflow that only works when the right person is holding it together becomes fragile, slow to scale, and difficult to audit.",
    whyYou:
      "Your responses point to a pattern where execution still works, but consistency depends too much on manual intervention.",
    realWorld:
      "This may look like re-explaining the same steps, checking with the same people each time, or getting different results depending on who is involved.",
    recommendedAction:
      "Standardize one recurring workflow into a minimum repeatable path.",
    pilotStep:
      "Pick one weekly workflow, document the current steps, remove one manual dependency, and test if another person can run it independently.",
    pilotMetric:
      "Consistency of output across different operators"
  },

  evidence_search_chaos: {
    title: "Evidence is likely scattered across too many places",
    description:
      "Supporting records do not seem to live in one dependable path, so validation may require searching across folders, messages, tools, or old threads.",
    whyThisMatters:
      "When evidence is hard to trace, every explanation takes longer and confidence drops right when speed and clarity matter most.",
    whyYou:
      "Your answers suggest that documentation and proof may exist, but not in a form that is easy to retrieve consistently.",
    realWorld:
      "This often feels like reopening old chats, searching several versions of a file, or asking teammates again for information that should already be easy to find."
  },

  hidden_process_debt: {
    title: "Manual effort may be hiding deeper process debt",
    description:
      "The workflow may appear functional on the surface, but only because people are repeatedly filling structural gaps by hand.",
    whyThisMatters:
      "This kind of hidden debt quietly consumes time, creates inconsistency, and makes the system look healthier than it really is.",
    whyYou:
      "Your responses suggest that day-to-day execution is being kept alive through extra effort rather than clean process design.",
    realWorld:
      "This can show up as patching spreadsheets, rewriting summaries, chasing approvals manually, or stitching together outputs that should already connect."
  },

  reconstruction_burden: {
    title: "Final outputs may require too much manual reconstruction",
    description:
      "Instead of flowing cleanly from prior steps, final deliverables appear to require extra assembly, interpretation, or cleanup before they are usable.",
    whyThisMatters:
      "The more reconstruction required at the end, the more time, ambiguity, and hidden cost get injected into every cycle.",
    whyYou:
      "Your answers suggest that important outputs may not be generated from a clean chain of evidence, but from a late-stage effort to piece things together.",
    realWorld:
      "This often looks like rebuilding context before a meeting, manually combining inputs from several places, or polishing results that should have arrived in a more complete form."
  },

  evidence_fragmentation: {
    title: "Evidence is fragmented across too many places",
    description:
      "Important supporting records appear to be spread across multiple locations or storage patterns rather than connected through one reliable path.",
    whyThisMatters:
      "When evidence is fragmented, verification slows down and confidence drops right when pressure increases.",
    whyYou:
      "Your answers suggest that evidence exists, but is scattered and needs to be reassembled when it matters most.",
    realWorld:
      "This often looks like reopening multiple folders, checking different versions, or piecing together proof before a decision can move forward.",
    recommendedAction:
      "Create one minimum evidence pathway for a single workflow.",
    pilotStep:
      "Choose one workflow, define 3–5 required proof points, and store them in one consistent place.",
    pilotMetric:
      "Time required to reconstruct one decision"
  },

  unstable_decision_structure: {
    title: "Decision logic may depend too much on judgment in the moment",
    description:
      "Important choices do not yet appear to follow a stable path that others could review, repeat, or trust without extra explanation.",
    whyThisMatters:
      "When decision structure is unstable, quality becomes harder to predict and accountability becomes harder to defend.",
    whyYou:
      "Your answers suggest that decisions may still rely on interpretation, escalation, or context held in people rather than in a visible structure.",
    realWorld:
      "This often appears as inconsistent approvals, uncertainty about who should decide, or needing to explain the same reasoning from scratch each time."
  }
};

console.log("✅ FRONTEND signalContentMap loaded", Object.keys(signalContentMap));

function normalizeSignalKey(signal = {}) {
  const rawKey =
    signal.key ||
    signal.signalKey ||
    signal.name ||
    signal.label ||
    "";

  return String(rawKey)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
}

export function enrichSignals(signals = []) {
  if (!Array.isArray(signals)) return [];

  return signals.map((signal, index) => {
    if (!signal || typeof signal !== "object") return signal;

    const normalizedKey = normalizeSignalKey(signal);
    const content = signalContentMap[normalizedKey] || {};

    const fallbackTitle =
      signal.title ||
      signal.label ||
      signal.name ||
      `Signal ${index + 1}`;

    const fallbackDescription =
      signal.description ||
      "This signal appears to be contributing to the current structural pattern.";

    const fallbackWhyThisMatters =
      signal.whyThisMatters ||
      "This is worth validating because repeated friction usually points to a structural issue, not just a one-time inconvenience.";

    return {
      ...signal,
      key: signal.key || normalizedKey,
      title: content.title || fallbackTitle,
      description: content.description || fallbackDescription,
      whyThisMatters: content.whyThisMatters || fallbackWhyThisMatters,
      whyYou:
        signal.whyYou ||
        content.whyYou ||
        "Your responses suggest this pattern is showing up often enough to influence the overall result.",
      realWorld:
        signal.realWorld ||
        content.realWorld ||
        "In practice, this usually appears as extra manual effort, repeated clarification, or delays in getting to a trusted result.",
      recommendedAction:
        signal.recommendedAction ||
        content.recommendedAction ||
        "Run one small structural improvement test on the strongest friction point.",
      pilotStep:
        signal.pilotStep ||
        content.pilotStep ||
        "Choose one live workflow, identify the most repeated friction point, and test one small structural change.",
      pilotMetric:
        signal.pilotMetric ||
        content.pilotMetric ||
        "Reduction in manual clarification, rework, or decision recovery time"
    };
  });
}

export default signalContentMap;