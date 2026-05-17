import { isSupabaseEnabled, supabase } from "./supabaseClient.js";

const DAY_MS = 24 * 60 * 60 * 1000;

function toDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function normalizeEmail(value) {
  if (typeof value !== "string") {
    return "";
  }

  const normalized = value.trim().toLowerCase();
  return normalized || "";
}

function isSafeEmail(value) {
  return Boolean(value && value.includes("@") && !/\s/.test(value));
}

export function normalizeTrialLifecycleRow(row = {}) {
  const now = new Date();
  const startedAt = toDate(row.started_at);
  const endsAt = toDate(row.ends_at);
  const trialStatus = row.trial_status ?? null;
  const trialActive = trialStatus === "active" && Boolean(endsAt) && now < endsAt;
  const trialEnded = Boolean(endsAt) && now > endsAt;

  let trialDay = null;
  if (trialActive && startedAt) {
    const elapsedDays = Math.floor((now.getTime() - startedAt.getTime()) / DAY_MS) + 1;
    trialDay = Math.min(7, Math.max(1, elapsedDays));
  }

  return {
    customerId: row.customer_id ?? null,
    trialStatus,
    trialActive,
    trialStartedAt: row.started_at ?? null,
    trialEndsAt: row.ends_at ?? null,
    trialDay,
    trialEnded,
    shouldShowTrialStatusBar: trialStatus === "active" || trialEnded,
    source: "supabase_trial_lifecycle",
  };
}

export async function getCustomerByEmail(email) {
  if (!isSupabaseEnabled || !supabase) {
    return null;
  }

  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return null;
  }

  if (!isSafeEmail(normalizedEmail)) {
    return null;
  }

  const { data, error } = await supabase
    .from("customers")
    .select("id, email")
    .eq("email", normalizedEmail)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    return null;
  }

  return data[0];
}

export async function createTrialLifecycle(record = {}) {
  if (!isSupabaseEnabled || !supabase) {
    return { ok: false, skipped: true, error: "Supabase is not enabled" };
  }

  const customerId = record.customerId;
  if (!customerId) {
    return { ok: false, skipped: true, error: "customerId is required" };
  }

  const existingRecord = await getTrialLifecycleByCustomer(customerId);
  if (existingRecord) {
    return { ok: true, existed: true, record: existingRecord };
  }

  const trialStatus = record.trialStatus ?? "not_started";
  const { data, error } = await supabase
    .from("trial_lifecycle")
    .insert({
      customer_id: customerId,
      trial_status: trialStatus,
      started_at: null,
      ends_at: null,
    })
    .select("*")
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, record: normalizeTrialLifecycleRow(data ?? {}) };
}

export async function startTrialLifecycle(record = {}) {
  if (!isSupabaseEnabled || !supabase) {
    return { ok: false, skipped: true, error: "Supabase is not enabled" };
  }

  const customerId = record.customerId;
  if (!customerId) {
    return { ok: false, skipped: true, error: "customerId is required" };
  }

  const startedAt = record.startedAt ? new Date(record.startedAt) : new Date();
  if (Number.isNaN(startedAt.getTime())) {
    return { ok: false, skipped: true, error: "startedAt is invalid" };
  }

  const endsAt = new Date(startedAt.getTime() + 7 * DAY_MS);
  const { data: latestRows, error: latestError } = await supabase
    .from("trial_lifecycle")
    .select("id")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (latestError) {
    return { ok: false, error: latestError.message };
  }

  const latestRow = latestRows?.[0];
  if (!latestRow) {
    return { ok: false, error: "trial_lifecycle_not_found" };
  }

  const { data, error } = await supabase
    .from("trial_lifecycle")
    .update({
      trial_status: "active",
      started_at: startedAt.toISOString(),
      ends_at: endsAt.toISOString(),
    })
    .eq("id", latestRow.id)
    .select("*")
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!data) {
    return { ok: false, error: "trial_lifecycle_not_found" };
  }

  return { ok: true, record: normalizeTrialLifecycleRow(data ?? {}) };
}

export async function getTrialLifecycleByCustomer(customerId) {
  if (!isSupabaseEnabled || !supabase) {
    return null;
  }

  if (!customerId) {
    return null;
  }

  const { data, error } = await supabase
    .from("trial_lifecycle")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    return null;
  }

  return normalizeTrialLifecycleRow(data[0]);
}

// Email lookup is read-only and depends on customers.email.
export async function getTrialLifecycleByEmail(email) {
  const customer = await getCustomerByEmail(email);
  if (!customer) {
    return null;
  }

  return getTrialLifecycleByCustomer(customer.id);
}
