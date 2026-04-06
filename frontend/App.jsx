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

export default function App() {
  return (
    <Routes>
      <Route path={ROUTES.HOME} element={<Homepage />} />
      <Route path={ROUTES.DIAGNOSTIC} element={<DiagnosticPage />} />
      <Route path={ROUTES.RESULT} element={<ResultPage />} />
      <Route path={ROUTES.PILOT} element={<PilotPage />} />
      <Route path={ROUTES.PILOT_SETUP} element={<PilotSetupPage />} />
      <Route path={ROUTES.PILOT_RESULT} element={<PilotResultPage />} />
      <Route path={ROUTES.RECEIPT} element={<ReceiptPage />} />
      <Route path={ROUTES.VERIFICATION} element={<VerificationPage />} />
      <Route path={ROUTES.RUN_LEDGER} element={<RunLedgerPage />} />
    </Routes>
  );
}