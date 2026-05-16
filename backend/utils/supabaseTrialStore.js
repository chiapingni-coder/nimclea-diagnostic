import { isSupabaseEnabled, supabase } from "./supabaseClient.js";

function normalizeText(value = "") {
  return String(value || "").trim();
}

function normalizeEmail(value = "") {
  return normalizeText(value).toLowerCase();
}

function normalizeTrialId(record = {}) {
  return normalizeText(record?.trialId || record?.trial_id);
}

function normalizeUserId(record = {}) {
  return normalizeText(record?.userId || record?.user_id);
}

function toTrialRow(record = {}) {
  const now = new Date().toISOString();

  return {
    trial_id: normalizeTrialId(record),
    user_id: normalizeUserId(record),
    email: normalizeEmail(record?.email),
    user_email: normalizeEmail(record?.userEmail || record?.user_email || record?.email),
    status: normalizeText(record?.status),
    created_at: record?.createdAt || record?.created_at || now,
    started_at: record?.startedAt || record?.started_at || record?.trialStartedAt || null,
    expires_at: record?.expiresAt || record?.expires_at || record?.trialEndsAt || null,
    trial_session_id:
      normalizeText(record?.trialSessionId || record?.trial_session_id) || null,
    entry_point: normalizeText(record?.entryPoint || record?.entry_point),
    pc_code: normalizeText(record?.pcCode || record?.pc_code),
    updated_at: record?.updatedAt || record?.updated_at || now,
  };
}

function fromTrialRow(row = {}) {
  return {
    trialId: row?.trial_id || "",
    userId: row?.user_id || "",
    email: row?.email || "",
    userEmail: row?.user_email || row?.email || "",
    status: row?.status || "",
    createdAt: row?.created_at || "",
    startedAt: row?.started_at || null,
    expiresAt: row?.expires_at || null,
    trialSessionId: row?.trial_session_id || null,
    entryPoint: row?.entry_point || "",
    pcCode: row?.pc_code || "",
    updatedAt: row?.updated_at || "",
    source: "supabase_trial_record",
  };
}

function unavailable(error = null) {
  return { ok: false, available: false, error, records: [] };
}

export async function upsertSupabaseTrial(record = {}) {
  if (!isSupabaseEnabled || !supabase) {
    return { ok: false, skipped: true };
  }

  const row = toTrialRow(record);

  if (!row.trial_id || !row.user_id) {
    return { ok: false, skipped: true, error: "missing_trial_id_or_user_id" };
  }

  try {
    const { data, error } = await supabase
      .from("trials")
      .upsert(row, { onConflict: "trial_id" })
      .select("*")
      .limit(1);

    if (error) throw error;

    return {
      ok: true,
      record: fromTrialRow(Array.isArray(data) ? data[0] : data),
    };
  } catch (error) {
    console.warn("[supabase:trial] upsert failed:", error?.message || error);
    return { ok: false, error };
  }
}

export async function getSupabaseTrial({ trialId = "", userId = "" } = {}) {
  if (!isSupabaseEnabled || !supabase) {
    return { ok: false, skipped: true, record: null };
  }

  const safeTrialId = normalizeText(trialId);
  const safeUserId = normalizeText(userId);

  if (!safeTrialId || !safeUserId) {
    return { ok: false, skipped: true, record: null };
  }

  try {
    const { data, error } = await supabase
      .from("trials")
      .select("*")
      .eq("trial_id", safeTrialId)
      .eq("user_id", safeUserId)
      .limit(1);

    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : null;

    return { ok: true, record: row ? fromTrialRow(row) : null };
  } catch (error) {
    console.warn("[supabase:trial] lookup failed:", error?.message || error);
    return { ok: false, error, record: null };
  }
}

export async function updateSupabaseTrial(record = {}) {
  if (!isSupabaseEnabled || !supabase) {
    return { ok: false, skipped: true };
  }

  const row = toTrialRow(record);

  if (!row.trial_id || !row.user_id) {
    return { ok: false, skipped: true, error: "missing_trial_id_or_user_id" };
  }

  try {
    const { data, error } = await supabase
      .from("trials")
      .update(row)
      .eq("trial_id", row.trial_id)
      .eq("user_id", row.user_id)
      .select("*")
      .limit(1);

    if (error) throw error;

    return {
      ok: true,
      record: fromTrialRow(Array.isArray(data) ? data[0] : data),
    };
  } catch (error) {
    console.warn("[supabase:trial] update failed:", error?.message || error);
    return { ok: false, error };
  }
}

export async function readSupabaseTrialsForStatus({ email = "", userId = "" } = {}) {
  if (!isSupabaseEnabled || !supabase) {
    return unavailable("supabase_disabled");
  }

  const safeEmail = normalizeEmail(email);
  const safeUserId = normalizeText(userId);
  const recordsByTrialId = new Map();

  try {
    const queries = [];

    if (safeEmail) {
      queries.push(supabase.from("trials").select("*").eq("email", safeEmail));
      queries.push(supabase.from("trials").select("*").eq("user_email", safeEmail));
    }

    if (safeUserId) {
      queries.push(supabase.from("trials").select("*").eq("user_id", safeUserId));
    }

    if (queries.length === 0) return { ok: true, available: true, records: [] };

    const results = await Promise.all(queries);

    for (const result of results) {
      if (result.error) throw result.error;

      (Array.isArray(result.data) ? result.data : []).forEach((row) => {
        const record = fromTrialRow(row);
        const key = record.trialId || `${record.userId}:${record.createdAt}`;
        if (key) recordsByTrialId.set(key, record);
      });
    }

    return {
      ok: true,
      available: true,
      records: Array.from(recordsByTrialId.values()),
    };
  } catch (error) {
    console.warn("[supabase:trial] status read failed:", error?.message || error);
    return unavailable(error);
  }
}
