import React from "react";
import { Navigate, Routes, Route } from "react-router-dom";

import DiagnosticPage from "./pages/DiagnosticPage.jsx";
import ResultPage from "./pages/ResultPage.jsx";
import PilotPage from "./pages/PilotPage.jsx";
import PilotResultPage from "./pages/PilotResultPage.jsx";
import PilotSetupPage from "./PilotSetupPage.jsx";
import ReceiptPage from "./pages/ReceiptPage.jsx";
import PaymentSuccessPage from "./pages/PaymentSuccessPage.jsx";
import VerificationPage from "./pages/VerificationPage.jsx";
import ROUTES from "./routes";
import RunLedgerPage from "./pages/RunLedgerPage";
import AnalyticsPage from "./pages/AnalyticsPage.jsx";
import CasesPage from "./pages/CasesPage.jsx";
import { getAllCases } from "./utils/caseRegistry.js";

export const PC_META = {
  pc_id: "PC-001",
  pc_name: "Decision Risk Diagnostic"
};

function EntryRedirect() {
  let cases = [];

  try {
    cases = getAllCases?.() || [];
  } catch {
    cases = [];
  }

  if (!cases.length) {
    return <Navigate to={ROUTES.DIAGNOSTIC} replace />;
  }

  const hasRealCase = cases.some(
    (c) => Array.isArray(c?.events) && c.events.length > 0
  );

  if (hasRealCase) {
    return <Navigate to={ROUTES.CASES} replace />;
  }

  const latestCase = cases[cases.length - 1];
  const caseId =
    latestCase?.caseId ||
    latestCase?.id ||
    latestCase?.resultId;

  if (caseId) {
    return (
      <Navigate
        to={`${ROUTES.RESULT}?caseId=${encodeURIComponent(caseId)}&from=case`}
        replace
      />
    );
  }

  return <Navigate to={ROUTES.CASES} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path={ROUTES.HOME} element={<EntryRedirect />} />
      <Route path={ROUTES.CASES} element={<CasesPage pcMeta={PC_META} />} />
      <Route path={ROUTES.DIAGNOSTIC} element={<DiagnosticPage pcMeta={PC_META} />} />
      <Route path={ROUTES.RESULT} element={<ResultPage pcMeta={PC_META} />} />
      <Route path={ROUTES.PILOT} element={<PilotPage pcMeta={PC_META} />} />
      <Route path={ROUTES.PILOT_SETUP} element={<PilotSetupPage pcMeta={PC_META} />} />
      <Route path={ROUTES.PILOT_RESULT} element={<PilotResultPage pcMeta={PC_META} />} />
      <Route path={ROUTES.RECEIPT} element={<ReceiptPage pcMeta={PC_META} />} />
      <Route path={ROUTES.PAYMENT_SUCCESS} element={<PaymentSuccessPage />} />
      <Route path={ROUTES.VERIFICATION} element={<VerificationPage pcMeta={PC_META} />} />
      <Route path={ROUTES.RUN_LEDGER} element={<RunLedgerPage pcMeta={PC_META} />} />
      <Route path={ROUTES.ANALYTICS} element={<AnalyticsPage pcMeta={PC_META} />} />
    </Routes>
  );
}
