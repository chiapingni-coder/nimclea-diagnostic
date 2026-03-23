/**
 * Nimclea Diagnostic
 * SIGNAL_CALC_TABLE v1.0
 *
 * Question → Answer → Severity → Signals → Group
 */

const SIGNAL_CALC_TABLE = {
  Q1: {
    external_audit: {
      severity: 1,
      primary: "external_pressure",
      secondary: "triggered_review_environment",
      group: "pressure_context_score"
    },
    customer_or_partner_verification_request: {
      severity: 1,
      primary: "external_pressure",
      secondary: "triggered_review_environment",
      group: "pressure_context_score"
    },
    compliance_review_or_regulatory_check: {
      severity: 1,
      primary: "external_pressure",
      secondary: "triggered_review_environment",
      group: "pressure_context_score"
    },
    incident_investigation: {
      severity: 2,
      primary: "external_pressure",
      secondary: "triggered_review_environment",
      group: "pressure_context_score"
    },
    none_of_the_above: {
      severity: 0,
      primary: "external_pressure",
      secondary: "triggered_review_environment",
      group: "pressure_context_score"
    }
  },

  Q2: {
    very_easy: {
      severity: 0,
      primary: "explainability_gap",
      secondary: "change_clarity",
      group: "governance_strength_score"
    },
    somewhat_easy: {
      severity: 1,
      primary: "explainability_gap",
      secondary: "change_clarity",
      group: "governance_strength_score"
    },
    difficult: {
      severity: 2,
      primary: "explainability_gap",
      secondary: "change_clarity",
      group: "governance_strength_score"
    },
    very_difficult: {
      severity: 5,
      primary: "explainability_gap",
      secondary: "change_clarity",
      group: "governance_strength_score"
    }
  },

  Q3: {
    rarely: {
      severity: 0,
      primary: "rule_drift",
      secondary: "metric_volatility",
      group: "complexity_score"
    },
    occasionally: {
      severity: 1,
      primary: "rule_drift",
      secondary: "metric_volatility",
      group: "complexity_score"
    },
    frequently: {
      severity: 2,
      primary: "rule_drift",
      secondary: "metric_volatility",
      group: "complexity_score"
    },
    very_frequently: {
      severity: 5,
      primary: "rule_drift",
      secondary: "metric_volatility",
      group: "complexity_score"
    }
  },

  Q4: {
    immediately: {
     severity: 0,
     primary: "evidence_readiness",
     secondary: "retrieval_friction",
     group: "evidence_fragmentation_score"
    },
    within_same_day: {
     severity: 1,
     primary: "evidence_readiness",
     secondary: "retrieval_friction",
     group: "evidence_fragmentation_score"
    },
    within_a_week: {
     severity: 2,
     primary: "evidence_readiness",
     secondary: "retrieval_friction",
     group: "evidence_fragmentation_score"
    },
    must_be_reconstructed: {
     severity: 4,
     primary: "evidence_readiness",
     secondary: "retrieval_friction",
     group: "evidence_fragmentation_score"
    }
  },

  Q5: {
    fully_traceable: {
      severity: 0,
      primary: "traceability_gap",
      secondary: "approval_auditability",
      group: "governance_strength_score"
    },
    partially_traceable: {
      severity: 1,
      primary: "traceability_gap",
      secondary: "approval_auditability",
      group: "governance_strength_score"
    },
    difficult_to_trace: {
      severity: 2,
      primary: "traceability_gap",
      secondary: "approval_auditability",
      group: "governance_strength_score"
    },
    not_traceable: {
      severity: 5,
      primary: "traceability_gap",
      secondary: "approval_auditability",
      group: "governance_strength_score"
    }
  },

  Q6: {
    one_centralized_system: {
     severity: 0,
     primary: "evidence_fragmentation",
     secondary: "storage_chaos",
     group: "evidence_fragmentation_score"
    },
    a_few_structured_systems: {
     severity: 1,
     primary: "evidence_fragmentation",
     secondary: "storage_chaos",
     group: "evidence_fragmentation_score"
    },
    multiple_spreadsheets: {
     severity: 2,
     primary: "evidence_fragmentation",
     secondary: "storage_chaos",
     group: "evidence_fragmentation_score"
    },
    mixed_documents_emails_folders: {
     severity: 4,
     primary: "evidence_fragmentation",
     secondary: "storage_chaos",
     group: "evidence_fragmentation_score"
    }
  },

  Q7: {
    monthly: {
      severity: 0,
      primary: "verification_cadence",
      secondary: "governance_discipline",
      group: "governance_strength_score"
    },
    quarterly: {
      severity: 1,
      primary: "verification_cadence",
      secondary: "governance_discipline",
      group: "governance_strength_score"
    },
    only_during_audits: {
      severity: 2,
      primary: "verification_cadence",
      secondary: "governance_discipline",
      group: "governance_strength_score"
    },
    rarely: {
      severity: 3,
      primary: "verification_cadence",
      secondary: "governance_discipline",
      group: "governance_strength_score"
    }
  },

  Q8: {
    formal_approval_process: {
      severity: 0,
      primary: "governance_formality",
      secondary: "control_strength",
      group: "governance_strength_score"
    },
    informal_review_by_colleagues: {
      severity: 1,
      primary: "governance_formality",
      secondary: "control_strength",
      group: "governance_strength_score"
    },
    direct_change_without_approval: {
      severity: 2,
      primary: "governance_formality",
      secondary: "control_strength",
      group: "governance_strength_score"
    },
    no_clear_process: {
      severity: 5,
      primary: "governance_formality",
      secondary: "control_strength",
      group: "governance_strength_score"
    }
  },

  Q9: {
    one_team: {
      severity: 0,
      primary: "coordination_complexity",
      secondary: "boundary_density",
      group: "complexity_score"
    },
    two_teams: {
      severity: 1,
      primary: "coordination_complexity",
      secondary: "boundary_density",
      group: "complexity_score"
    },
    multiple_teams: {
      severity: 2,
      primary: "coordination_complexity",
      secondary: "boundary_density",
      group: "complexity_score"
    },
    multiple_organizations: {
      severity: 3,
      primary: "coordination_complexity",
      secondary: "boundary_density",
      group: "complexity_score"
    }
  },

  Q10: {
    defined_system_of_record: {
     severity: 0,
     primary: "first_retrieval_path",
     secondary: "evidence_search_chaos",
     group: "evidence_fragmentation_score"
    },
    shared_internal_drive: {
     severity: 1,
     primary: "first_retrieval_path",
     secondary: "evidence_search_chaos",
     group: "evidence_fragmentation_score"
    },
    spreadsheets: {
     severity: 2,
     primary: "first_retrieval_path",
     secondary: "evidence_search_chaos",
     group: "evidence_fragmentation_score"
    },
    email_chat_personal_files: {
     severity: 4,
     primary: "first_retrieval_path",
     secondary: "evidence_search_chaos",
     group: "evidence_fragmentation_score"
    }
  },

  Q11: {
    rarely: {
      severity: 0,
      primary: "version_drift",
      secondary: "team_misalignment",
      group: "complexity_score"
    },
    sometimes: {
      severity: 1,
      primary: "version_drift",
      secondary: "team_misalignment",
      group: "complexity_score"
    },
    often: {
      severity: 2,
      primary: "version_drift",
      secondary: "team_misalignment",
      group: "complexity_score"
    },
    very_often: {
      severity: 3,
      primary: "version_drift",
      secondary: "team_misalignment",
      group: "complexity_score"
    }
  },

  Q12: {
    almost_none: {
     severity: 0,
     primary: "reconstruction_burden",
     secondary: "hidden_process_debt",
     group: "evidence_fragmentation_score"
    },
    some_manual_consolidation: {
     severity: 1,
     primary: "reconstruction_burden",
     secondary: "hidden_process_debt",
     group: "evidence_fragmentation_score"
    },
    significant_manual_work: {
     severity: 3,
     primary: "reconstruction_burden",
     secondary: "hidden_process_debt",
     group: "evidence_fragmentation_score"
    },
    mostly_rebuilt_by_hand: {
     severity: 4,
     primary: "reconstruction_burden",
     secondary: "hidden_process_debt",
     group: "evidence_fragmentation_score"
    }
  },

  Q13: {
    clearly_assigned_owner: {
      severity: 0,
      primary: "authority_clarity",
      secondary: "ownership_strength",
      group: "governance_strength_score"
    },
    usually_assigned_but_not_always: {
      severity: 1,
      primary: "authority_clarity",
      secondary: "ownership_strength",
      group: "governance_strength_score"
    },
    shared_responsibility: {
      severity: 2,
      primary: "authority_clarity",
      secondary: "ownership_strength",
      group: "governance_strength_score"
    },
    often_unclear: {
      severity: 5,
      primary: "authority_clarity",
      secondary: "ownership_strength",
      group: "governance_strength_score"
    }
  },

  Q14: {
    almost_always: {
      severity: 0,
      primary: "incident_reconstruction",
      secondary: "causal_trace_quality",
      group: "governance_strength_score"
    },
    usually: {
      severity: 1,
      primary: "incident_reconstruction",
      secondary: "causal_trace_quality",
      group: "governance_strength_score"
    },
    sometimes: {
      severity: 2,
      primary: "incident_reconstruction",
      secondary: "causal_trace_quality",
      group: "governance_strength_score"
    },
    rarely: {
      severity: 3,
      primary: "incident_reconstruction",
      secondary: "causal_trace_quality",
      group: "governance_strength_score"
    }
  },

  Q15: {
    documented_and_repeatable: {
      severity: 0,
      primary: "change_governance_maturity",
      secondary: "process_repeatability",
      group: "governance_strength_score"
    },
    partly_documented: {
      severity: 1,
      primary: "change_governance_maturity",
      secondary: "process_repeatability",
      group: "governance_strength_score"
    },
    mostly_informal: {
      severity: 2,
      primary: "change_governance_maturity",
      secondary: "process_repeatability",
      group: "governance_strength_score"
    },
    different_every_time: {
      severity: 3,
      primary: "change_governance_maturity",
      secondary: "process_repeatability",
      group: "governance_strength_score"
    }
  },

  Q16: {
    rarely: {
      severity: 0,
      primary: "semantic_misalignment",
      secondary: "definition_conflict",
      group: "complexity_score"
    },
    occasionally: {
      severity: 1,
      primary: "semantic_misalignment",
      secondary: "definition_conflict",
      group: "complexity_score"
    },
    frequently: {
      severity: 2,
      primary: "semantic_misalignment",
      secondary: "definition_conflict",
      group: "complexity_score"
    },
    constantly: {
      severity: 3,
      primary: "semantic_misalignment",
      secondary: "definition_conflict",
      group: "complexity_score"
    }
  },

  Q17: {
    very_clear: {
      severity: 0,
      primary: "handoff_integrity",
      secondary: "boundary_clarity",
      group: "complexity_score"
    },
    mostly_clear: {
      severity: 1,
      primary: "handoff_integrity",
      secondary: "boundary_clarity",
      group: "complexity_score"
    },
    sometimes_unclear: {
      severity: 2,
      primary: "handoff_integrity",
      secondary: "boundary_clarity",
      group: "complexity_score"
    },
    often_unclear: {
      severity: 3,
      primary: "handoff_integrity",
      secondary: "boundary_clarity",
      group: "complexity_score"
    }
  },

  Q18: {
    rarely: {
      severity: 0,
      primary: "multi_system_coupling",
      secondary: "integration_burden",
      group: "complexity_score"
    },
    sometimes: {
      severity: 1,
      primary: "multi_system_coupling",
      secondary: "integration_burden",
      group: "complexity_score"
    },
    often: {
      severity: 2,
      primary: "multi_system_coupling",
      secondary: "integration_burden",
      group: "complexity_score"
    },
    almost_always: {
      severity: 3,
      primary: "multi_system_coupling",
      secondary: "integration_burden",
      group: "complexity_score"
    }
  },

  Q19: {
    audit_or_assurance_requests: {
      severity: 0,
      primary: "external_pressure",
      secondary: "triggered_review_environment",
      group: "pressure_context_score"
    },
    customer_or_partner_verification: {
      severity: 0,
      primary: "external_pressure",
      secondary: "triggered_review_environment",
      group: "pressure_context_score"
    },
    internal_reporting_deadlines: {
      severity: 2,
      primary: "external_pressure",
      secondary: "triggered_review_environment",
      group: "pressure_context_score"
    },
    incident_or_exception_handling: {
      severity: 3,
      primary: "external_pressure",
      secondary: "triggered_review_environment",
      group: "pressure_context_score"
    }
  },

  Q20: {
    finding_the_right_evidence: {
      severity: 3,
      primary: "dominant_failure_mode",
      secondary: "pressure_revealed_weak_point",
      group: "pressure_context_score"
    },
    confirming_the_correct_version_of_data: {
      severity: 2,
      primary: "dominant_failure_mode",
      secondary: "pressure_revealed_weak_point",
      group: "pressure_context_score"
    },
    coordinating_across_teams: {
      severity: 2,
      primary: "dominant_failure_mode",
      secondary: "pressure_revealed_weak_point",
      group: "pressure_context_score"
    },
    identifying_who_must_approve_changes: {
      severity: 2,
      primary: "dominant_failure_mode",
      secondary: "pressure_revealed_weak_point",
      group: "pressure_context_score"
    }
  }
};

export default SIGNAL_CALC_TABLE;