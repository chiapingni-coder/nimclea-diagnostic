import dotenv from "dotenv";
import {
  isSupabaseCoreAuthorityEnabled,
  linkReceiptToPayment,
  upsertPaymentRecord,
  upsertReceiptRecord,
} from "../backend/utils/supabaseCoreAuthorityStore.js";
import { supabase } from "../backend/utils/supabaseClient.js";

dotenv.config({ path: "./backend/.env" });

const receiptId = "00000000-0000-4000-8000-000000000040";
const paymentId = "00000000-0000-4000-8000-000000000040";
const customerId = "00000000-0000-4000-8000-000000000023";
const caseId = "00000000-0000-4000-8000-000000000024";
const now = new Date().toISOString();

async function main() {
  if (!isSupabaseCoreAuthorityEnabled()) {
    console.log(JSON.stringify({ ok: false, reason: "supabase_disabled" }, null, 2));
    process.exit(2);
  }

  const receiptWrite = await upsertReceiptRecord({
    receiptId,
    caseId,
    customerId,
    receiptStatus: "draft",
    source: "aac40_linkage_smoke",
    receiptPayload: {
      aac: "AAC40",
      smoke: true,
      controlled: true,
      step: "receipt_seed",
      executedAt: now,
    },
    metadata: {
      aac: "AAC40",
      smoke: true,
      controlled: true,
      step: "receipt_seed",
      executedAt: now,
    },
    createdAt: now,
    updatedAt: now,
  });

  const paymentWrite = await upsertPaymentRecord({
    paymentId,
    customerId,
    caseId,
    processor: "stripe",
    processorPaymentReference: "aac40_stripe_reference",
    amountCents: 2900,
    currency: "usd",
    paymentStatus: "paid",
    source: "aac40_linkage_smoke",
    processorMetadata: {
      aac: "AAC40",
      smoke: true,
      controlled: true,
      step: "payment_seed",
      executedAt: now,
    },
    metadata: {
      aac: "AAC40",
      smoke: true,
      controlled: true,
      step: "payment_seed",
      executedAt: now,
      receipt_id: receiptId,
    },
    settledAt: now,
    createdAt: now,
    updatedAt: now,
  });

  const linkWrite = await linkReceiptToPayment({
    receiptId,
    paymentId,
    caseId,
    customerId,
    receiptStatus: "paid",
    source: "aac40_linkage_smoke",
    metadata: {
      aac: "AAC40",
      smoke: true,
      controlled: true,
      step: "link",
      executedAt: now,
    },
    receiptPayload: {
      aac: "AAC40",
      smoke: true,
      controlled: true,
      step: "link",
      executedAt: now,
    },
    updatedAt: now,
  });

  console.log(
    JSON.stringify(
      {
        receiptWriteOk: receiptWrite.ok,
        receiptWriteError: receiptWrite.error || null,
        paymentWriteOk: paymentWrite.ok,
        paymentWriteError: paymentWrite.error || null,
        linkWriteOk: linkWrite.ok,
        linkWriteError: linkWrite.error || null,
      },
      null,
      2
    )
  );

  if (!linkWrite.ok) {
    process.exit(3);
  }

  if (!supabase) {
    console.log(JSON.stringify({ ok: false, reason: "supabase_client_unavailable" }, null, 2));
    process.exit(4);
  }

  const read = await supabase.from("receipts").select("*").eq("receipt_id", receiptId).limit(1);
  const row = Array.isArray(read.data) ? read.data[0] : null;

  console.log(
    JSON.stringify(
      {
        readError: read.error?.message || null,
        readCount: Array.isArray(read.data) ? read.data.length : 0,
        receipt_id: row?.receipt_id || null,
        payment_id: row?.payment_id || null,
        case_id: row?.case_id || null,
        customer_id: row?.customer_id || null,
        receipt_status: row?.receipt_status || null,
        source: row?.source || null,
        aac: row?.metadata?.aac || null,
      },
      null,
      2
    )
  );

  if (read.error || !Array.isArray(read.data) || read.data.length !== 1) {
    process.exit(5);
  }
}

main().catch((error) => {
  console.log(
    JSON.stringify(
      {
        ok: false,
        reason: error?.message || String(error),
      },
      null,
      2
    )
  );
  process.exit(1);
});
