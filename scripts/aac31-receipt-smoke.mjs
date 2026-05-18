import dotenv from "dotenv";
import { isSupabaseCoreAuthorityEnabled, upsertReceiptRecord } from "../backend/utils/supabaseCoreAuthorityStore.js";
import { supabase } from "../backend/utils/supabaseClient.js";

dotenv.config({ path: "./backend/.env" });

const receiptId = "00000000-0000-4000-8000-000000000031";
const caseId = "00000000-0000-4000-8000-000000000024";
const customerId = "00000000-0000-4000-8000-000000000023";
const now = new Date().toISOString();

async function main() {
  if (!isSupabaseCoreAuthorityEnabled()) {
    console.log(JSON.stringify({ ok: false, reason: "supabase_disabled" }, null, 2));
    process.exit(2);
  }

  const write = await upsertReceiptRecord({
    receiptId,
    caseId,
    customerId,
    receiptStatus: "draft",
    source: "aac31_receipt_smoke",
    receiptPayload: {
      aac: "AAC31",
      smoke: true,
      controlled: true,
      executedAt: now,
    },
    metadata: {
      aac: "AAC31",
      smoke: true,
      controlled: true,
      executedAt: now,
    },
    issuedAt: now,
    createdAt: now,
    updatedAt: now,
  });

  console.log(
    JSON.stringify(
      {
        writeOk: write.ok,
        writeError: write.error || null,
        writtenReceiptId: write.data?.receipt_id || null,
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

  const read = await supabase.from("receipts").select("*").eq("receipt_id", receiptId).limit(1);
  const row = Array.isArray(read.data) ? read.data[0] : null;

  console.log(
    JSON.stringify(
      {
        readError: read.error?.message || null,
        readCount: Array.isArray(read.data) ? read.data.length : 0,
        readReceiptId: row?.receipt_id || null,
        readCaseId: row?.case_id || null,
        readCustomerId: row?.customer_id || null,
        readStatus: row?.receipt_status || null,
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
