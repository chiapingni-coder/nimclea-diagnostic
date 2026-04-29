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
export const PC_META = {
  pc_id: "PC-001",
  pc_name: "Decision Risk Diagnostic"
};

function EntryRedirect() {
  return <Navigate to={ROUTES.ACCESS} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path={ROUTES.HOME} element={<EntryRedirect />} />
      <Route
        path={ROUTES.ACCESS}
        element={<CasesPage pcMeta={PC_META} entryMode="access" />}
      />

      <Route
        path={ROUTES.CASES}
        element={<CasesPage pcMeta={PC_META} entryMode="cases" />}
      />
      
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
      <Route path="/receipt" element={<ReceiptPage />} />
    </Routes>
  );
}
