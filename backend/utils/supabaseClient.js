import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isSupabaseEnabled = Boolean(supabaseUrl && supabaseServiceRoleKey);

if (!isSupabaseEnabled) {
  console.warn("[supabase] skipped, env missing");
}

export const supabase = isSupabaseEnabled
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;
