import "dotenv/config";
import { createClient } from "../backend/node_modules/@supabase/supabase-js/dist/index.mjs";
import crypto from "node:crypto";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

const FIXTURE_EMAIL = "smoke+cases-existing-001@nimclea.test";

const FIXTURE_CASE_ID = "00000000-0000-4000-8000-000000009401";

async function main() {
  console.log("=== Nimclea v0.9-4G fixture seed ===");

  let customerId = null;

  const { data: existingCustomer, error: customerLookupError } =
    await supabase
      .from("customers")
      .select("customer_id,email")
      .eq("email", FIXTURE_EMAIL)
      .maybeSingle();

  if (customerLookupError) {
    console.error("Customer lookup failed:");
    console.error(customerLookupError.message);
    process.exit(1);
  }

  if (existingCustomer?.customer_id) {
    customerId = existingCustomer.customer_id;

    console.log("Existing fixture customer found:");
    console.log(customerId);
  } else {
    customerId = crypto.randomUUID();

    const { error: insertCustomerError } = await supabase
      .from("customers")
      .insert({
        customer_id: customerId,
        email: FIXTURE_EMAIL,
        display_name: "Nimclea Production Smoke Fixture",
        customer_status: "active",
        source: "v0_9_4g_fixture_seed",
        is_authority_record: true,
      });

    if (insertCustomerError) {
      console.error("Customer insert failed:");
      console.error(insertCustomerError.message);
      process.exit(1);
    }

    console.log("Fixture customer created:");
    console.log(customerId);
  }

  const { error: caseUpsertError } = await supabase
    .from("cases")
    .upsert(
      {
        case_id: FIXTURE_CASE_ID,
        customer_id: customerId,
        case_status: "fixture_ready",
        case_type: "production_readonly_smoke_fixture",
        lifecycle_stage: "fixture_seeded",
        source: "v0_9_4g_fixture_seed",
        is_authority_record: true,
      },
      {
        onConflict: "case_id",
      }
    );

  if (caseUpsertError) {
    console.error("Case upsert failed:");
    console.error(caseUpsertError.message);
    process.exit(1);
  }

  console.log("");
  console.log("Fixture seed PASS");
  console.log("customer_id:", customerId);
  console.log("case_id:", FIXTURE_CASE_ID);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});