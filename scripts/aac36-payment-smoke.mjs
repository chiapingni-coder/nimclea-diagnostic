import dotenv from "dotenv";
import {
  isSupabaseCoreAuthorityEnabled,
  upsertPaymentRecord,
} from "../backend/utils/supabaseCoreAuthorityStore.js";
import { supabase } from "../backend/utils/supabaseClient.js";

dotenv.config({ path: "./backend/.env" });

const paymentId = "00000000-0000-4000-8000-000000000036";
const customerId = "00000000-0000-4000-8000-000000000023";
const caseId = "00000000-0000-4000-8000-000000000024";
const now = new Date().toISOString();

async function main() {
  if (!isSupabaseCoreAuthorityEnabled()) {
    console.log(JSON.stringify({ ok: false, reason: "supabase_disabled" }, null, 2));
    process.exit(2);
  }

  const write = await upsertPaymentRecord({
    paymentId,
    customerId,
    caseId,
    processor: "stripe",
    processorPaymentReference: "aac36_stripe_reference",
    amountCents: 2900,
    currency: "usd",
    paymentStatus: "paid",
    source: "aac36_payment_smoke",
    processorMetadata: {
      aac: "AAC36",
      smoke: true,
      controlled: true,
      executedAt: now,
      stripe_marker: "aac36",
    },
    metadata: {
      aac: "AAC36",
      smoke: true,
      controlled: true,
      executedAt: now,
      payment_marker: "aac36",
    },
    settledAt: now,
    createdAt: now,
    updatedAt: now,
  });

  console.log(
    JSON.stringify(
      {
        writeOk: write.ok,
        writeError: write.error || null,
        writtenPaymentId: write.data?.payment_id || null,
      },
      null,
      2
    )
  );

  if (!write.ok) {
    process.exit(3);
  }

  if (!supabase) {
    console.log(JSON.stringify({ ok: false, reason: "supabase_client_unavailable" }, null, 2));
    process.exit(4);
  }

  const read = await supabase.from("payments").select("*").eq("payment_id", paymentId).limit(1);
  const row = Array.isArray(read.data) ? read.data[0] : null;

  console.log(
    JSON.stringify(
      {
        readError: read.error?.message || null,
        readCount: Array.isArray(read.data) ? read.data.length : 0,
        readPaymentId: row?.payment_id || null,
        readCustomerId: row?.customer_id || null,
        readCaseId: row?.case_id || null,
        readStatus: row?.payment_status || null,
        readSource: row?.source || null,
        readAac: row?.metadata?.aac || null,
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
