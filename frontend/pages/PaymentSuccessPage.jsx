import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { markCaseAsPaid } from "../utils/caseRegistry";

export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState("Activating your formal receipt...");

  useEffect(() => {
    const caseId = searchParams.get("caseId");

    if (!caseId) {
      setMessage("Missing case reference. Please return to your case page.");
      return;
    }

    markCaseAsPaid(caseId);
    setMessage("Formal receipt activated.");

    const timer = window.setTimeout(() => {
      navigate(`/receipt?caseId=${encodeURIComponent(caseId)}`);
    }, 800);

    return () => window.clearTimeout(timer);
  }, [navigate, searchParams]);

  return (
    <main style={{ maxWidth: 720, margin: "80px auto", padding: 24 }}>
      <h1>Payment successful</h1>
      <p>{message}</p>
    </main>
  );
}
