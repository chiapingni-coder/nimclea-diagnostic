import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { upsertCase } from "../utils/caseRegistry";

const API_BASE = "http://localhost:3000";

export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState("Activating your formal receipt...");

  useEffect(() => {
    const caseId = searchParams.get("caseId");
    const sessionId = searchParams.get("session_id");

    if (!caseId) {
      setMessage("Missing case reference. Please return to your case page.");
      return;
    }

    if (!sessionId) {
      setMessage("Missing Stripe session reference. Please retry checkout.");
      return;
    }

    let cancelled = false;

    async function confirmPayment() {
      try {
        setMessage("Confirming payment with Stripe...");

        const response = await fetch(
          `${API_BASE}/api/confirm-checkout-session`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ caseId, sessionId }),
          }
        );

        const payload = await response.json().catch(() => ({}));

        if (!response.ok || payload?.success !== true) {
          throw new Error(
            payload?.message ||
              payload?.error ||
              `Stripe confirmation failed (${response.status})`
          );
        }

        const confirmedCase = payload?.caseRecord || {};
        upsertCase({
          ...confirmedCase,
          caseId,
          caseBilling: {
            ...(confirmedCase.caseBilling || {}),
            receiptActivated: true,
            verificationActivated: false,
            activatedAt: confirmedCase.caseBilling?.activatedAt || new Date().toISOString(),
            source: "stripe_checkout_confirmed",
          },
          receipt: {
            ...(confirmedCase.receipt || {}),
            paid: true,
            receiptActivated: true,
          },
          payment: {
            ...(confirmedCase.payment || {}),
            status: "paid",
            receiptActivated: true,
            verificationActivated: false,
            stripeSessionId: sessionId,
          },
          isPaid: true,
        });

        if (cancelled) return;

        setMessage("Formal receipt activated.");

        window.setTimeout(() => {
          if (!cancelled) {
            navigate(`/receipt?caseId=${encodeURIComponent(caseId)}`);
          }
        }, 800);
      } catch (error) {
        console.error("Payment confirmation failed:", error);

        if (!cancelled) {
          setMessage(
            error?.message ||
              "Unable to confirm payment. Please return to Receipt and retry."
          );
        }
      }
    }

    confirmPayment();

    return () => {
      cancelled = true;
    };
  }, [navigate, searchParams]);

  return (
    <main style={{ maxWidth: 720, margin: "80px auto", padding: 24 }}>
      <h1>Payment successful</h1>
      <p>{message}</p>
    </main>
  );
}
