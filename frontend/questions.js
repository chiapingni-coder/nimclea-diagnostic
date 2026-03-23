// Authority-safe version:
// - freezes question ids
// - freezes text / options / sections / branches
// - does NOT invent scoring or preview logic
// - Q1 = single_select
// - Example only on Q2 / Q3 / Q16
// - Rendering rule: for multi_select questions, if an option includes exclusive: true,
//   selecting that option must clear all other selected options;
//   selecting any other option must unselect the exclusive option.

export const questions = [
  // =========================
  // Section A - Operational Pressure
  // =========================
  {
    id: "Q1",
    code: "Q1",
    order: 1,
    section: "operational_pressure",
    sectionLabel: "Operational Pressure",
    branch: null,
    branchLabel: null,
    stage: "core",
    type: "single_select",
    prompt:
      "In the past 12 months, has your organization experienced any of the following?",
    example: null,
    options: [
      { value: "external_audit", label: "External audit" },
      { value: "customer_or_partner_verification_request", label: "Customer or partner verification request" },
      { value: "compliance_review_or_regulatory_check", label: "Compliance review or regulatory check" },
      { value: "incident_investigation", label: "Incident investigation" },
      { value: "none_of_the_above", label: "None of the above", exclusive: true }
    ]
  },
  {
    id: "Q2",
    code: "Q2",
    order: 2,
    section: "operational_pressure",
    sectionLabel: "Operational Pressure",
    branch: null,
    branchLabel: null,
    stage: "core",
    type: "single_select",
    prompt:
      "When a report result changes, how easy is it to explain exactly what changed and why?",
    example:
      "Example: a report number changes because underlying data was corrected.",
    options: [
      { value: "very_easy", label: "Very easy — the reason is clearly documented" },
      { value: "somewhat_easy", label: "Somewhat easy — explanation exists but takes effort" },
      { value: "difficult", label: "Difficult — explanation requires investigation" },
      { value: "very_difficult", label: "Very difficult — changes are hard to trace" }
    ]
  },
  {
    id: "Q3",
    code: "Q3",
    order: 3,
    section: "operational_pressure",
    sectionLabel: "Operational Pressure",
    branch: null,
    branchLabel: null,
    stage: "core",
    type: "single_select",
    prompt:
      "How often do the rules used to calculate your reports change?",
    example:
      'Example: the formula for calculating profit changes from “before tax” to “after tax”.',
    options: [
      { value: "rarely", label: "Rarely (almost never change)" },
      { value: "occasionally", label: "Occasionally (a few times per year)" },
      { value: "frequently", label: "Frequently (several times per quarter)" },
      { value: "very_frequently", label: "Very frequently (constantly evolving)" }
    ]
  },

  // =========================
  // Section B - Evidence & Traceability
  // =========================
  {
    id: "Q4",
    code: "Q4",
    order: 4,
    section: "evidence_traceability",
    sectionLabel: "Evidence & Traceability",
    branch: null,
    branchLabel: null,
    stage: "core",
    type: "single_select",
    prompt:
      "If someone questions a reported result, how quickly can your team locate the supporting evidence?",
    example: null,
    options: [
      { value: "immediately", label: "Immediately" },
      { value: "within_same_day", label: "Within the same day" },
      { value: "within_a_week", label: "Within a week" },
      { value: "must_be_reconstructed", label: "Evidence must be reconstructed" }
    ]
  },
  {
    id: "Q5",
    code: "Q5",
    order: 5,
    section: "evidence_traceability",
    sectionLabel: "Evidence & Traceability",
    branch: null,
    branchLabel: null,
    stage: "core",
    type: "single_select",
    prompt:
      "When a change happens, how easy is it to identify who approved the change and when it occurred?",
    example: null,
    options: [
      { value: "fully_traceable", label: "Fully traceable" },
      { value: "partially_traceable", label: "Partially traceable" },
      { value: "difficult_to_trace", label: "Difficult to trace" },
      { value: "not_traceable", label: "Not traceable" }
    ]
  },
  {
    id: "Q6",
    code: "Q6",
    order: 6,
    section: "evidence_traceability",
    sectionLabel: "Evidence & Traceability",
    branch: null,
    branchLabel: null,
    stage: "core",
    type: "single_select",
    prompt:
      "Where are the records or files supporting important results usually stored?",
    example: null,
    options: [
      { value: "one_centralized_system", label: "One centralized system" },
      { value: "a_few_structured_systems", label: "A few structured systems" },
      { value: "multiple_spreadsheets", label: "Multiple spreadsheets" },
      { value: "mixed_documents_emails_folders", label: "Mixed documents, emails, and folders" }
    ]
  },

  // =========================
  // Section C - Governance Intensity
  // =========================
  {
    id: "Q7",
    code: "Q7",
    order: 7,
    section: "governance_intensity",
    sectionLabel: "Governance Intensity",
    branch: null,
    branchLabel: null,
    stage: "core",
    type: "single_select",
    prompt:
      "How often does your team formally review or verify operational or reporting data?",
    example: null,
    options: [
      { value: "monthly", label: "Monthly" },
      { value: "quarterly", label: "Quarterly" },
      { value: "only_during_audits", label: "Only during audits" },
      { value: "rarely", label: "Rarely" }
    ]
  },
  {
    id: "Q8",
    code: "Q8",
    order: 8,
    section: "governance_intensity",
    sectionLabel: "Governance Intensity",
    branch: null,
    branchLabel: null,
    stage: "core",
    type: "single_select",
    prompt:
      "When someone wants to change an important metric, report, or process, what usually happens?",
    example: null,
    options: [
      { value: "formal_approval_process", label: "Formal approval process" },
      { value: "informal_review_by_colleagues", label: "Informal review by colleagues" },
      { value: "direct_change_without_approval", label: "Direct change without approval" },
      { value: "no_clear_process", label: "No clear process" }
    ]
  },
  {
    id: "Q9",
    code: "Q9",
    order: 9,
    section: "governance_intensity",
    sectionLabel: "Governance Intensity",
    branch: null,
    branchLabel: null,
    stage: "core",
    type: "single_select",
    prompt:
      "How many teams or systems are typically involved in producing the final reported result?",
    example: null,
    options: [
      { value: "one_team", label: "One team" },
      { value: "two_teams", label: "Two teams" },
      { value: "multiple_teams", label: "Multiple teams" },
      { value: "multiple_organizations", label: "Multiple organizations" }
    ]
  },

  // =========================
  // Branch A - Evidence Fragmentation
  // =========================
  {
    id: "Q10",
    code: "Q10",
    order: 10,
    section: "branch_a",
    sectionLabel: "Branch A",
    branch: "A",
    branchLabel: "Evidence Fragmentation",
    stage: "branch",
    type: "single_select",
    prompt:
      "When evidence is needed, where do people usually look first?",
    example: null,
    options: [
      { value: "defined_system_of_record", label: "A defined system of record" },
      { value: "shared_internal_drive", label: "Shared internal drive" },
      { value: "spreadsheets", label: "Spreadsheets" },
      { value: "email_chat_personal_files", label: "Email / chat / personal files" }
    ]
  },
  {
    id: "Q11",
    code: "Q11",
    order: 11,
    section: "branch_a",
    sectionLabel: "Branch A",
    branch: "A",
    branchLabel: "Evidence Fragmentation",
    stage: "branch",
    type: "single_select",
    prompt:
      "How often do different teams work from different versions of the same information?",
    example: null,
    options: [
      { value: "rarely", label: "Rarely" },
      { value: "sometimes", label: "Sometimes" },
      { value: "often", label: "Often" },
      { value: "very_often", label: "Very often" }
    ]
  },
  {
    id: "Q12",
    code: "Q12",
    order: 12,
    section: "branch_a",
    sectionLabel: "Branch A",
    branch: "A",
    branchLabel: "Evidence Fragmentation",
    stage: "branch",
    type: "single_select",
    prompt:
      "When preparing a final report, how much manual consolidation is required?",
    example: null,
    options: [
      { value: "almost_none", label: "Almost none" },
      { value: "some_manual_consolidation", label: "Some manual consolidation" },
      { value: "significant_manual_work", label: "Significant manual work" },
      { value: "mostly_rebuilt_by_hand", label: "Mostly rebuilt by hand" }
    ]
  },

  // =========================
  // Branch B - Governance Weakness
  // =========================
  {
    id: "Q13",
    code: "Q13",
    order: 13,
    section: "branch_b",
    sectionLabel: "Branch B",
    branch: "B",
    branchLabel: "Governance Weakness",
    stage: "branch",
    type: "single_select",
    prompt:
      "Who is responsible for approving important reporting or operational changes?",
    example: null,
    options: [
      { value: "clearly_assigned_owner", label: "Clearly assigned owner" },
      { value: "usually_assigned_but_not_always", label: "Usually assigned but not always" },
      { value: "shared_responsibility", label: "Shared responsibility" },
      { value: "often_unclear", label: "Often unclear" }
    ]
  },
  {
    id: "Q14",
    code: "Q14",
    order: 14,
    section: "branch_b",
    sectionLabel: "Branch B",
    branch: "B",
    branchLabel: "Governance Weakness",
    stage: "branch",
    type: "single_select",
    prompt:
      "When an error is discovered, how consistently can your team determine how it happened?",
    example: null,
    options: [
      { value: "almost_always", label: "Almost always" },
      { value: "usually", label: "Usually" },
      { value: "sometimes", label: "Sometimes" },
      { value: "rarely", label: "Rarely" }
    ]
  },
  {
    id: "Q15",
    code: "Q15",
    order: 15,
    section: "branch_b",
    sectionLabel: "Branch B",
    branch: "B",
    branchLabel: "Governance Weakness",
    stage: "branch",
    type: "single_select",
    prompt:
      "Which statement best describes your current change management process?",
    example: null,
    options: [
      { value: "documented_and_repeatable", label: "Documented and repeatable" },
      { value: "partly_documented", label: "Partly documented" },
      { value: "mostly_informal", label: "Mostly informal" },
      { value: "different_every_time", label: "Different every time" }
    ]
  },

  // =========================
  // Branch C - Cross-Team Complexity
  // =========================
  {
    id: "Q16",
    code: "Q16",
    order: 16,
    section: "branch_c",
    sectionLabel: "Branch C",
    branch: "C",
    branchLabel: "Cross-Team Complexity",
    stage: "branch",
    type: "single_select",
    prompt:
      "How often do different teams use different definitions for the same metric or number?",
    example:
      'Example: HR and Finance use different definitions for “employee count”.',
    options: [
      { value: "rarely", label: "Rarely" },
      { value: "occasionally", label: "Occasionally" },
      { value: "frequently", label: "Frequently" },
      { value: "constantly", label: "Constantly" }
    ]
  },
  {
    id: "Q17",
    code: "Q17",
    order: 17,
    section: "branch_c",
    sectionLabel: "Branch C",
    branch: "C",
    branchLabel: "Cross-Team Complexity",
    stage: "branch",
    type: "single_select",
    prompt:
      "When multiple teams contribute to a final report or output, how clear are the handoffs between them?",
    example: null,
    options: [
      { value: "very_clear", label: "Very clear" },
      { value: "mostly_clear", label: "Mostly clear" },
      { value: "sometimes_unclear", label: "Sometimes unclear" },
      { value: "often_unclear", label: "Often unclear" }
    ]
  },
  {
    id: "Q18",
    code: "Q18",
    order: 18,
    section: "branch_c",
    sectionLabel: "Branch C",
    branch: "C",
    branchLabel: "Cross-Team Complexity",
    stage: "branch",
    type: "single_select",
    prompt:
      "How often does producing the final result require combining data from multiple systems?",
    example: null,
    options: [
      { value: "rarely", label: "Rarely" },
      { value: "sometimes", label: "Sometimes" },
      { value: "often", label: "Often" },
      { value: "almost_always", label: "Almost always" }
    ]
  },

  // =========================
  // Branch D - Pressure Context
  // =========================
  {
    id: "Q19",
    code: "Q19",
    order: 19,
    section: "branch_d",
    sectionLabel: "Branch D",
    branch: "D",
    branchLabel: "Pressure Context",
    stage: "branch",
    type: "single_select",
    prompt:
      "What situation most often creates pressure for your team?",
    example: null,
    options: [
      { value: "audit_or_assurance_requests", label: "Audit or assurance requests" },
      { value: "customer_or_partner_verification", label: "Customer or partner verification" },
      { value: "internal_reporting_deadlines", label: "Internal reporting deadlines" },
      { value: "incident_or_exception_handling", label: "Incident or exception handling" }
    ]
  },
  {
    id: "Q20",
    code: "Q20",
    order: 20,
    section: "branch_d",
    sectionLabel: "Branch D",
    branch: "D",
    branchLabel: "Pressure Context",
    stage: "branch",
    type: "single_select",
    prompt:
      "When pressure increases, what becomes most difficult for your team?",
    example: null,
    options: [
      { value: "finding_the_right_evidence", label: "Finding the right evidence" },
      { value: "confirming_the_correct_version_of_data", label: "Confirming the correct version of data" },
      { value: "coordinating_across_teams", label: "Coordinating across teams" },
      { value: "identifying_who_must_approve_changes", label: "Identifying who must approve changes" }
    ]
  }
];

export const coreQuestionIds = [
  "Q1",
  "Q2",
  "Q3",
  "Q4",
  "Q5",
  "Q6",
  "Q7",
  "Q8",
  "Q9"
];

export const branchQuestionIds = {
  A: ["Q10", "Q11", "Q12"],
  B: ["Q13", "Q14", "Q15"],
  C: ["Q16", "Q17", "Q18"],
  D: ["Q19", "Q20"]
};

export const questionMap = Object.fromEntries(
  questions.map((question) => [question.id, question])
);

export const coreQuestions = coreQuestionIds
  .map((id) => questionMap[id])
  .filter(Boolean);

export const branchQuestionMap = Object.fromEntries(
  Object.entries(branchQuestionIds).map(([branchKey, questionIds]) => [
    branchKey,
    questionIds.map((id) => questionMap[id]).filter(Boolean)
  ])
);

export function getQuestionById(id) {
  return questionMap[id] || null;
}

export default questions;
