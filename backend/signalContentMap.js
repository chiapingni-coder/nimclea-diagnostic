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
      "This often shows up as last-minute clarification, repeated follow-up, or a scramble to reconstruct what happened before something can be approved or delivered."
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
      "This may look like re-explaining the same steps, checking with the same people each time, or getting different results depending on who is involved."
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

  fragmented_evidence: {
    title: "Evidence may exist, but it is fragmented",
    description:
      "Records, rationale, and supporting proof may be present, but they do not appear to form one clear, connected story.",
    whyThisMatters:
      "Fragmented evidence makes it harder to verify decisions, defend outcomes, or move quickly when someone asks, 'Why did we do it this way?'",
    whyYou:
      "Your responses suggest the issue may not be a total lack of evidence, but a lack of cohesion between the pieces.",
    realWorld:
      "This can feel like having bits of proof everywhere, yet still needing to explain the same history again because no one place shows the full picture."
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
      "This often looks like reopening multiple folders, checking different versions, or piecing together proof before a decision can move forward."
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
  },

  manual_coordination_load: {
    title: "Too much coordination may still be happening by hand",
    description:
      "The workflow appears to depend on manual check-ins, reminders, or handoffs to keep things moving.",
    whyThisMatters:
      "Heavy coordination load slows execution and makes progress depend on who is actively pushing, rather than on the system itself.",
    whyYou:
      "Your answers suggest that movement through the workflow may still rely on people nudging the process forward manually.",
    realWorld:
      "This can look like constant follow-ups, status chasing, or needing one person to keep all the moving parts aligned."
  },

  unclear_ownership: {
    title: "Ownership may not be clear enough at key moments",
    description:
      "The workflow may not make it obvious who is responsible for specific decisions, validations, or handoffs.",
    whyThisMatters:
      "When ownership is fuzzy, delays multiply and unresolved questions tend to circle instead of closing.",
    whyYou:
      "Your responses suggest that some steps may proceed, but responsibility is not always explicit when something needs to be confirmed or corrected.",
    realWorld:
      "This often shows up as duplicated effort, approvals waiting in limbo, or people assuming someone else is handling the next step."
  },

  low_traceability_confidence: {
    title: "Traceability may not be strong enough to support confidence",
    description:
      "It may be difficult to move from a result back to the evidence, reasoning, and decisions that produced it.",
    whyThisMatters:
      "Weak traceability makes workflows harder to trust, harder to audit, and more expensive to defend under scrutiny.",
    whyYou:
      "Your answers suggest that outcomes may be visible, but the path behind them is not always easy to verify.",
    realWorld:
      "This can feel like having an answer on the surface, but needing extra detective work to prove where it came from and why it should be trusted."
  }
};

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

function toSentenceCase(text = "") {
  if (!text || typeof text !== "string") return "Signal";
  return text;
}

export function getSignalContent(signalInput = {}) {
  const normalizedKey =
    typeof signalInput === "string"
      ? String(signalInput)
          .trim()
          .toLowerCase()
          .replace(/\s+/g, "_")
          .replace(/-/g, "_")
      : normalizeSignalKey(signalInput);

  const content = signalContentMap[normalizedKey] || {};

  return {
    key: normalizedKey,
    title: content.title || "",
    description: content.description || "",
    whyThisMatters: content.whyThisMatters || "",
    whyYou: content.whyYou || "",
    realWorld: content.realWorld || ""
  };
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
      label: signal.label || toSentenceCase(fallbackTitle)
    };
  });
}

export default signalContentMap;