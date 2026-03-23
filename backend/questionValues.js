/**
 * Nimclea Diagnostic
 * QUESTION_VALUES v1.0
 *
 * 用于 signalEngine 校验答案是否合法
 * 结构：QID -> [value, value, ...]
 */

const QUESTION_VALUES = {

  Q1: [
    "external_audit",
    "customer_or_partner_verification_request",
    "compliance_review_or_regulatory_check",
    "incident_investigation",
    "none_of_the_above"
  ],

  Q2: [
    "very_easy",
    "somewhat_easy",
    "difficult",
    "very_difficult"
  ],

  Q3: [
    "rarely",
    "occasionally",
    "frequently",
    "very_frequently"
  ],

  Q4: [
    "immediately",
    "within_same_day",
    "within_a_week",
    "must_be_reconstructed"
  ],

  Q5: [
    "fully_traceable",
    "partially_traceable",
    "difficult_to_trace",
    "not_traceable"
  ],

  Q6: [
    "one_centralized_system",
    "a_few_structured_systems",
    "multiple_spreadsheets",
    "mixed_documents_emails_folders"
  ],

  Q7: [
    "monthly",
    "quarterly",
    "only_during_audits",
    "rarely"
  ],

  Q8: [
    "formal_approval_process",
    "informal_review_by_colleagues",
    "direct_change_without_approval",
    "no_clear_process"
  ],

  Q9: [
    "one_team",
    "two_teams",
    "multiple_teams",
    "multiple_organizations"
  ],

  Q10: [
    "defined_system_of_record",
    "shared_internal_drive",
    "spreadsheets",
    "email_chat_personal_files"
  ],

  Q11: [
    "rarely",
    "sometimes",
    "often",
    "very_often"
  ],

  Q12: [
    "almost_none",
    "some_manual_consolidation",
    "significant_manual_work",
    "mostly_rebuilt_by_hand"
  ],

  Q13: [
    "clearly_assigned_owner",
    "usually_assigned_but_not_always",
    "shared_responsibility",
    "often_unclear"
  ],

  Q14: [
    "almost_always",
    "usually",
    "sometimes",
    "rarely"
  ],

  Q15: [
    "documented_and_repeatable",
    "partly_documented",
    "mostly_informal",
    "different_every_time"
  ],

  Q16: [
    "rarely",
    "occasionally",
    "frequently",
    "constantly"
  ],

  Q17: [
    "very_clear",
    "mostly_clear",
    "sometimes_unclear",
    "often_unclear"
  ],

  Q18: [
    "rarely",
    "sometimes",
    "often",
    "almost_always"
  ],

  Q19: [
    "audit_or_assurance_requests",
    "customer_or_partner_verification",
    "internal_reporting_deadlines",
    "incident_or_exception_handling"
  ],

  Q20: [
    "finding_the_right_evidence",
    "confirming_the_correct_version_of_data",
    "coordinating_across_teams",
    "identifying_who_must_approve_changes"
  ]

};

export default QUESTION_VALUES;