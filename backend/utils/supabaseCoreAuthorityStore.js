import { isSupabaseEnabled, supabase } from "./supabaseClient.js";

function normalizeText(value = "") {
  return String(value || "").trim();
}

function disabledResult(reason = "supabase_disabled") {
  return { ok: false, disabled: true, reason };
}

function ensureSupabase() {
  if (!isSupabaseEnabled || !supabase) {
    return null;
  }

  return supabase;
}

function normalizeCaseRecordInput(record = {}) {
  return {
    case_id: normalizeText(record.caseId || record.case_id),
    user_email: normalizeText(record.userEmail || record.user_email),
    customer_id: normalizeText(record.customerId || record.customer_id),
    case_title: normalizeText(record.caseTitle || record.case_title),
    status: normalizeText(record.status) || "draft",
    stage: normalizeText(record.stage || record.caseStage || record.case_stage),
    diagnostic_payload: record.diagnosticPayload || record.diagnostic_payload || {},
    result_payload: record.resultPayload || record.result_payload || {},
    case_metadata: record.caseMetadata || record.case_metadata || {},
    authority_source: normalizeText(record.authoritySource || record.authority_source) ||
      "supabase_core_authority",
    created_at: record.createdAt || record.created_at || null,
    updated_at: record.updatedAt || record.updated_at || null,
  };
}

function normalizeCaseEventInput(record = {}) {
  const rawEvent = record.eventPayload || record.event_payload || {};
  const reviewPayload = record.eventReview || record.event_review || {};
  const authoritySource = normalizeText(record.authoritySource || record.authority_source);
  const source = normalizeText(record.source || record.eventSource || record.event_source) ||
    "supabase_core_authority";

  return {
    case_id: normalizeText(record.caseId || record.case_id),
    event_type: normalizeText(record.eventType || record.event_type),
    actor_type: normalizeText(record.actorType || record.actor_type) || "rehearsal",
    actor_id: normalizeText(
      record.actorId ||
        record.actor_id ||
        record.actorEmail ||
        record.actor_email
    ) || null,
    source,
    raw_event: {
      ...(rawEvent && typeof rawEvent === "object" && !Array.isArray(rawEvent) ? rawEvent : {}),
      ...(authoritySource ? { authority_source: authoritySource } : {}),
    },
    metadata: {
      ...(reviewPayload && typeof reviewPayload === "object" && !Array.isArray(reviewPayload) ? reviewPayload : {}),
      ...(authoritySource ? { authority_source: authoritySource } : {}),
    },
    occurred_at: record.occurredAt || record.occurred_at || record.createdAt || record.created_at || null,
    created_at: record.createdAt || record.created_at || null,
  };
}

function normalizeReceiptRecordInput(record = {}) {
  return {
    case_id: normalizeText(record.caseId || record.case_id),
    receipt_id: normalizeText(record.receiptId || record.receipt_id),
    receipt_status: normalizeText(record.receiptStatus || record.receipt_status) || "not_ready",
    payment_status: normalizeText(record.paymentStatus || record.payment_status) || "pending",
    receipt_payload: record.receiptPayload || record.receipt_payload || {},
    readiness_payload: record.readinessPayload || record.readiness_payload || {},
    payment_payload: record.paymentPayload || record.payment_payload || {},
    export_payload: record.exportPayload || record.export_payload || {},
    authority_source: normalizeText(record.authoritySource || record.authority_source) ||
      "supabase_core_authority",
    issued_at: record.issuedAt || record.issued_at || null,
    created_at: record.createdAt || record.created_at || null,
    updated_at: record.updatedAt || record.updated_at || null,
  };
}

export function isSupabaseCoreAuthorityEnabled() {
  return Boolean(ensureSupabase());
}

export async function upsertCaseRecord(record = {}) {
  const client = ensureSupabase();
  if (!client) return disabledResult();

  const payload = normalizeCaseRecordInput(record);
  if (!payload.case_id) {
    return { ok: false, error: "case_id_required" };
  }

  try {
    const { data, error } = await client
      .from("cases")
      .upsert(payload, { onConflict: "case_id" })
      .select("*")
      .limit(1);

    if (error) {
      return { ok: false, error: error.message || String(error) };
    }

    return { ok: true, data: Array.isArray(data) ? data[0] || null : data || null };
  } catch (error) {
    return { ok: false, error: error?.message || String(error) };
  }
}

export async function insertCaseEvent(record = {}) {
  const client = ensureSupabase();
  if (!client) return disabledResult();

  const payload = normalizeCaseEventInput(record);
  if (!payload.case_id) {
    return { ok: false, error: "case_id_required" };
  }

  if (!payload.event_type) {
    return { ok: false, error: "event_type_required" };
  }

  try {
    const { data, error } = await client.from("case_events").insert(payload).select("*");

    if (error) {
      return { ok: false, error: error.message || String(error) };
    }

    return { ok: true, data: Array.isArray(data) ? data[0] || null : data || null };
  } catch (error) {
    return { ok: false, error: error?.message || String(error) };
  }
}

export async function upsertReceiptRecord(record = {}) {
  const client = ensureSupabase();
  if (!client) return disabledResult();

  const payload = normalizeReceiptRecordInput(record);
  if (!payload.receipt_id) {
    return { ok: false, error: "receipt_id_required" };
  }

  if (!payload.case_id) {
    return { ok: false, error: "case_id_required" };
  }

  try {
    const { data, error } = await client
      .from("receipt_records")
      .upsert(payload, { onConflict: "receipt_id" })
      .select("*")
      .limit(1);

    if (error) {
      return { ok: false, error: error.message || String(error) };
    }

    return { ok: true, data: Array.isArray(data) ? data[0] || null : data || null };
  } catch (error) {
    return { ok: false, error: error?.message || String(error) };
  }
}

export async function getCaseRecordByCaseId(caseId) {
  const client = ensureSupabase();
  if (!client) return disabledResult();

  const safeCaseId = normalizeText(caseId);
  if (!safeCaseId) {
    return { ok: false, error: "case_id_required" };
  }

  try {
    const { data, error } = await client
      .from("cases")
      .select("*")
      .eq("case_id", safeCaseId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      return { ok: false, error: error.message || String(error) };
    }

    const row = Array.isArray(data) ? data[0] || null : data || null;
    return { ok: true, data: row };
  } catch (error) {
    return { ok: false, error: error?.message || String(error) };
  }
}

export async function getCaseEventsByCaseId(caseId) {
  const client = ensureSupabase();
  if (!client) return disabledResult();

  const safeCaseId = normalizeText(caseId);
  if (!safeCaseId) {
    return { ok: false, error: "case_id_required" };
  }

  try {
    const { data, error } = await client
      .from("case_events")
      .select("*")
      .eq("case_id", safeCaseId)
      .order("created_at", { ascending: true });

    if (error) {
      return { ok: false, error: error.message || String(error) };
    }

    return { ok: true, data: Array.isArray(data) ? data : [] };
  } catch (error) {
    return { ok: false, error: error?.message || String(error) };
  }
}

export async function getReceiptRecordByReceiptId(receiptId) {
  const client = ensureSupabase();
  if (!client) return disabledResult();

  const safeReceiptId = normalizeText(receiptId);
  if (!safeReceiptId) {
    return { ok: false, error: "receipt_id_required" };
  }

  try {
    const { data, error } = await client
      .from("receipt_records")
      .select("*")
      .eq("receipt_id", safeReceiptId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      return { ok: false, error: error.message || String(error) };
    }

    const row = Array.isArray(data) ? data[0] || null : data || null;
    return { ok: true, data: row };
  } catch (error) {
    return { ok: false, error: error?.message || String(error) };
  }
}
