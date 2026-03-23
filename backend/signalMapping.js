// signalMapping.js
export const signalMapping = {
  Q1: {
    external_audit: {
      score: 2,
      signals: ["SIG_EXTERNAL_PRESSURE"]
    },
    customer_or_partner_verification_request: {
      score: 2,
      signals: ["SIG_EXTERNAL_PRESSURE"]
    },
    compliance_review_or_regulatory_check: {
      score: 2,
      signals: ["SIG_COMPLIANCE_PRESSURE"]
    },
    incident_investigation: {
      score: 3,
      signals: ["SIG_INCIDENT_PRESSURE"]
    },
    none_of_the_above: {
      score: 0,
      signals: []
    }
  }
};

export default signalMapping;