import React from "react";
import { useLocation } from "react-router-dom";
import Questionnaire from "./Questionnaire.jsx";

export default function DiagnosticPage({ pcMeta }) {
  const location = useLocation();

  // ✅ 统一口径（主轨 + fallback）
  const resolvedPcMeta = pcMeta || location.state?.pcMeta;
  return <Questionnaire pcMeta={resolvedPcMeta} />;
}
