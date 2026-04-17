import React from "react";
import { Routes, Route } from "react-router-dom";

import Homepage from "./pages/Homepage.jsx";
import DiagnosticPage from "./pages/DiagnosticPage.jsx";
import ResultPage from "./pages/ResultPage.jsx";
import PilotPage from "./pages/PilotPage.jsx";
import PilotResultPage from "./pages/PilotResultPage.jsx";
import PilotSetupPage from "./PilotSetupPage.jsx";
import ReceiptPage from "./pages/ReceiptPage.jsx";
import VerificationPage from "./pages/VerificationPage.jsx";
import ROUTES from "./routes";
import RunLedgerPage from "./pages/RunLedgerPage";
import AnalyticsPage from "./pages/AnalyticsPage.jsx";

export const PC_META = {
  pc_id: "PC-001",
  pc_name: "Decision Risk Diagnostic"
};

export default function App() {
  return (
    <Routes>
      <Route path={ROUTES.HOME} element={<Homepage />} />
      <Route path={ROUTES.DIAGNOSTIC} element={<DiagnosticPage pcMeta={PC_META} />} />
      <Route path={ROUTES.RESULT} element={<ResultPage pcMeta={PC_META} />} />
      <Route path={ROUTES.PILOT} element={<PilotPage pcMeta={PC_META} />} />
      <Route path={ROUTES.PILOT_SETUP} element={<PilotSetupPage pcMeta={PC_META} />} />
      <Route path={ROUTES.PILOT_RESULT} element={<PilotResultPage pcMeta={PC_META} />} />
      <Route path={ROUTES.RECEIPT} element={<ReceiptPage pcMeta={PC_META} />} />
      <Route path={ROUTES.VERIFICATION} element={<VerificationPage pcMeta={PC_META} />} />
      <Route path={ROUTES.RUN_LEDGER} element={<RunLedgerPage pcMeta={PC_META} />} />
      <Route path={ROUTES.ANALYTICS} element={<AnalyticsPage pcMeta={PC_META} />} />
    </Routes>
  );
}