import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Questionnaire from "./Questionnaire.jsx";
import ResultPage from "./ResultPage.jsx";
import PilotPage from "./PilotPage.jsx"; // 👈 加这一行

export default function App() {
  return (
    <Router>
      <Routes>
        {/* 问卷页 */}
        <Route path="/" element={<Questionnaire />} />

        {/* 结果页 */}
        <Route path="/result" element={<ResultPage />} />

        {/* 🔥 Pilot页 */}
        <Route path="/pilot" element={<PilotPage />} />

        {/* 🔥 下一步（避免报错） */}
        <Route path="/pilot/setup" element={<div>Next Step</div>} />
      </Routes>
    </Router>
  );
}