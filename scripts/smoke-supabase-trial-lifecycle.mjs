import "dotenv/config";

import {
  createTrialLifecycle,
  getTrialLifecycleByCustomer,
  startTrialLifecycle,
} from "../backend/utils/supabaseTrialLifecycleStore.js";
import { isSupabaseEnabled } from "../backend/utils/supabaseClient.js";

const customerId = process.env.SMOKE_TRIAL_CUSTOMER_ID;

if (!isSupabaseEnabled) {
  console.log("Supabase env missing; skipping trial lifecycle smoke.");
  process.exit(0);
}

if (!customerId) {
  console.log("SMOKE_TRIAL_CUSTOMER_ID missing; skipping trial lifecycle smoke.");
  process.exit(0);
}

const createResult = await createTrialLifecycle({ customerId });
const startResult = await startTrialLifecycle({ customerId });
const readResult = await getTrialLifecycleByCustomer(customerId);

console.log(
  JSON.stringify(
    {
      customerId,
      createResult,
      startResult,
      readResult,
    },
    null,
    2,
  ),
);
