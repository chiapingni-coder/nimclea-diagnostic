import { randomUUID } from "node:crypto";
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
  const source = normalizeText(record.source || record.authoritySource || record.authority_source) ||
    "supabase_clean_authority";
  const caseSchema = record.caseSchema || record.case_schema || record.diagnosticPayload || record.diagnostic_payload || {};
  const metadata = record.metadata ||
    record.caseMetadata ||
    record.case_metadata ||
    record.resultPayload ||
    record.result_payload ||
    {};

  return {
    case_id: normalizeText(record.caseId || record.case_id),
    customer_id: normalizeText(record.customerId || record.customer_id),
    case_status: normalizeText(record.caseStatus || record.status || record.case_status) || "draft",
    case_type: normalizeText(record.caseType || record.case_type || record.caseTitle || record.case_title) || null,
    lifecycle_stage: normalizeText(record.lifecycleStage || record.stage || record.caseStage || record.case_stage) || null,
    source,
    case_schema: caseSchema,
    metadata,
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
  const source = normalizeText(
    record.source ||
      record.receiptSource ||
      record.receipt_source ||
      record.authoritySource ||
      record.authority_source
  ) || "supabase_clean_authority";
  const receiptPayload = {
    ...(record.receiptPayload && typeof record.receiptPayload === "object" && !Array.isArray(record.receiptPayload)
      ? record.receiptPayload
      : record.receipt_payload && typeof record.receipt_payload === "object" && !Array.isArray(record.receipt_payload)
        ? record.receipt_payload
        : {}),
  };
  const metadata = {
    ...(record.metadata && typeof record.metadata === "object" && !Array.isArray(record.metadata)
      ? record.metadata
      : record.receiptMetadata && typeof record.receiptMetadata === "object" && !Array.isArray(record.receiptMetadata)
        ? record.receiptMetadata
        : record.receipt_metadata && typeof record.receipt_metadata === "object" && !Array.isArray(record.receipt_metadata)
          ? record.receipt_metadata
          : {}),
  };
  const authoritySource = normalizeText(record.authoritySource || record.authority_source);
  const paymentStatus = normalizeText(record.paymentStatus || record.payment_status);
  const readinessPayload = record.readinessPayload || record.readiness_payload || {};
  const paymentPayload = record.paymentPayload || record.payment_payload || {};
  const exportPayload = record.exportPayload || record.export_payload || {};

  if (authoritySource) {
    receiptPayload.authority_source = authoritySource;
    metadata.authority_source = authoritySource;
  }

  if (paymentStatus) {
    receiptPayload.payment_status = paymentStatus;
  }

  if (readinessPayload && typeof readinessPayload === "object" && !Array.isArray(readinessPayload)) {
    receiptPayload.readiness_payload = readinessPayload;
  }

  if (paymentPayload && typeof paymentPayload === "object" && !Array.isArray(paymentPayload)) {
    receiptPayload.payment_payload = paymentPayload;
  }

  if (exportPayload && typeof exportPayload === "object" && !Array.isArray(exportPayload)) {
    receiptPayload.export_payload = exportPayload;
  }

  return {
    case_id: normalizeText(record.caseId || record.case_id),
    receipt_id: normalizeText(record.receiptId || record.receipt_id),
    customer_id: normalizeText(record.customerId || record.customer_id),
    payment_id: normalizeText(record.paymentId || record.payment_id) || null,
    receipt_number: normalizeText(record.receiptNumber || record.receipt_number) || null,
    receipt_status: normalizeText(record.receiptStatus || record.receipt_status) || "draft",
    source,
    is_authority_record: record.isAuthorityRecord ?? record.is_authority_record ?? true,
    receipt_payload: receiptPayload,
    metadata,
    issued_at: record.issuedAt || record.issued_at || null,
    voided_at: record.voidedAt || record.voided_at || null,
    created_at: record.createdAt || record.created_at || null,
    updated_at: record.updatedAt || record.updated_at || null,
  };
}

function normalizePaymentRecordInput(record = {}) {
  const source =
    normalizeText(record.source || record.authoritySource || record.authority_source) ||
    "supabase_clean_authority";
  const processor =
    normalizeText(record.processor || record.paymentProcessor || record.payment_processor) ||
    "stripe";
  const stripeEventId = normalizeText(record.stripeEventId || record.stripe_event_id);
  const stripeEventType = normalizeText(record.stripeEventType || record.stripe_event_type);
  const stripeSessionId = normalizeText(record.stripeSessionId || record.stripe_session_id);
  const stripeCustomerId = normalizeText(record.stripeCustomerId || record.stripe_customer_id);
  const stripeSubscriptionId = normalizeText(
    record.stripeSubscriptionId || record.stripe_subscription_id
  );
  const paymentType = normalizeText(record.paymentType || record.payment_type);
  const priceType = normalizeText(record.priceType || record.price_type);
  const paymentScope = normalizeText(record.paymentScope || record.payment_scope);
  const userId = normalizeText(record.userId || record.user_id);
  const receiptId = normalizeText(record.receiptId || record.receipt_id);
  const hash = normalizeText(record.hash);
  const email = normalizeText(record.email);
  const status = normalizeText(record.status || record.paymentStatus || record.payment_status);
  const processorPaymentReference =
    normalizeText(
      record.processorPaymentReference ||
        record.processor_payment_reference ||
        stripeSessionId ||
        stripeSubscriptionId ||
        stripeEventId
    ) || null;
  const amountCentsValue = Number(record.amountCents ?? record.amount_cents ?? record.amount);
  const amountCents = Number.isFinite(amountCentsValue) ? Math.trunc(amountCentsValue) : 0;
  const paymentId =
    normalizeText(record.paymentId || record.payment_id) ||
    processorPaymentReference ||
    randomUUID();

  return {
    payment_id: paymentId,
    customer_id: normalizeText(record.customerId || record.customer_id || stripeCustomerId),
    case_id: normalizeText(record.caseId || record.case_id),
    processor,
    processor_payment_reference: processorPaymentReference,
    amount_cents: amountCents,
    currency: normalizeText(record.currency) || "usd",
    payment_status: normalizeText(record.paymentStatus || record.payment_status || status) || "pending",
    source,
    is_authority_record: record.isAuthorityRecord ?? record.is_authority_record ?? true,
    processor_metadata: {
      ...(record.processorMetadata && typeof record.processorMetadata === "object" && !Array.isArray(record.processorMetadata)
        ? record.processorMetadata
        : {}),
      ...(stripeEventId ? { stripe_event_id: stripeEventId } : {}),
      ...(stripeEventType ? { stripe_event_type: stripeEventType } : {}),
      ...(stripeSessionId ? { stripe_session_id: stripeSessionId } : {}),
      ...(stripeCustomerId ? { stripe_customer_id: stripeCustomerId } : {}),
      ...(stripeSubscriptionId ? { stripe_subscription_id: stripeSubscriptionId } : {}),
    },
    metadata: {
      ...(record.metadata && typeof record.metadata === "object" && !Array.isArray(record.metadata)
        ? record.metadata
        : {}),
      ...(paymentType ? { payment_type: paymentType } : {}),
      ...(priceType ? { price_type: priceType } : {}),
      ...(paymentScope ? { payment_scope: paymentScope } : {}),
      ...(userId ? { user_id: userId } : {}),
      ...(receiptId ? { receipt_id: receiptId } : {}),
      ...(hash ? { hash } : {}),
      ...(email ? { email } : {}),
      ...(status ? { status } : {}),
    },
    settled_at: record.settledAt || record.settled_at || null,
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

  if (!payload.customer_id) {
    return { ok: false, error: "customer_id_required" };
  }

  if (!payload.case_id) {
    return { ok: false, error: "case_id_required" };
  }

  try {
    const { data, error } = await client
      .from("receipts")
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

export async function linkReceiptToPayment(record = {}) {
  const client = ensureSupabase();
  if (!client) return disabledResult();

  const receiptId = normalizeText(record.receiptId || record.receipt_id);
  const paymentId = normalizeText(record.paymentId || record.payment_id);
  const caseId = normalizeText(record.caseId || record.case_id);
  const customerId = normalizeText(record.customerId || record.customer_id);
  const receiptStatus = normalizeText(record.receiptStatus || record.receipt_status) || "paid";
  const source =
    normalizeText(record.source || record.authoritySource || record.authority_source) ||
    "supabase_clean_authority";

  if (!receiptId) {
    return { ok: false, error: "receipt_id_required" };
  }

  if (!paymentId) {
    return { ok: false, error: "payment_id_required" };
  }

  if (!caseId && !customerId) {
    return { ok: false, error: "case_id_or_customer_id_required" };
  }

  try {
    const { data: existingRows, error: readError } = await client
      .from("receipts")
      .select("*")
      .eq("receipt_id", receiptId)
      .limit(1);

    if (readError) {
      return { ok: false, error: readError.message || String(readError) };
    }

    const existing = Array.isArray(existingRows) ? existingRows[0] || null : existingRows || null;

    if (!existing) {
      return { ok: false, error: "receipt_not_found" };
    }

    if (caseId && normalizeText(existing.case_id) && normalizeText(existing.case_id) !== caseId) {
      return { ok: false, error: "case_id_mismatch" };
    }

    if (
      customerId &&
      normalizeText(existing.customer_id) &&
      normalizeText(existing.customer_id) !== customerId
    ) {
      return { ok: false, error: "customer_id_mismatch" };
    }

    const payload = {
      ...existing,
      case_id: normalizeText(existing.case_id || caseId),
      customer_id: normalizeText(existing.customer_id || customerId),
      payment_id: paymentId,
      receipt_status: receiptStatus,
      source: normalizeText(existing.source || source) || source,
      is_authority_record:
        existing.is_authority_record ?? record.isAuthorityRecord ?? record.is_authority_record ?? true,
      receipt_payload: {
        ...((existing.receipt_payload && typeof existing.receipt_payload === "object" && !Array.isArray(existing.receipt_payload))
          ? existing.receipt_payload
          : {}),
        ...((record.receiptPayload && typeof record.receiptPayload === "object" && !Array.isArray(record.receiptPayload))
          ? record.receiptPayload
          : {}),
        ...((record.receipt_payload && typeof record.receipt_payload === "object" && !Array.isArray(record.receipt_payload))
          ? record.receipt_payload
          : {}),
      },
      metadata: {
        ...((existing.metadata && typeof existing.metadata === "object" && !Array.isArray(existing.metadata))
          ? existing.metadata
          : {}),
        ...((record.metadata && typeof record.metadata === "object" && !Array.isArray(record.metadata))
          ? record.metadata
          : {}),
      },
      updated_at: record.updatedAt || record.updated_at || new Date().toISOString(),
    };

    const { data, error } = await client
      .from("receipts")
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

export async function upsertPaymentRecord(record = {}) {
  const client = ensureSupabase();
  if (!client) return disabledResult();

  const payload = normalizePaymentRecordInput(record);
  if (!payload.customer_id) {
    return { ok: false, error: "customer_id_required" };
  }

  if (!payload.case_id) {
    return { ok: false, error: "case_id_required" };
  }

  try {
    const { data, error } = await client
      .from("payments")
      .upsert(payload, { onConflict: "payment_id" })
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

export async function getCaseRecordsByEmail(email) {
  const client = ensureSupabase();
  if (!client) return disabledResult();

  const safeEmail = normalizeText(email).toLowerCase();
  if (!safeEmail) {
    return { ok: false, error: "email_required" };
  }

  try {
    const { data: customerRows, error: customerError } = await client
      .from("customers")
      .select("customer_id")
      .eq("email", safeEmail);

    if (customerError) {
      return { ok: false, error: customerError.message || String(customerError) };
    }

    const customerIds = Array.from(
      new Set(
        (Array.isArray(customerRows) ? customerRows : [])
          .map((row) => normalizeText(row?.customer_id))
          .filter(Boolean)
      )
    );

    if (customerIds.length === 0) {
      return { ok: true, data: [] };
    }

    const { data, error } = await client
      .from("cases")
      .select("*")
      .in("customer_id", customerIds)
      .order("created_at", { ascending: false });

    if (error) {
      return { ok: false, error: error.message || String(error) };
    }

    return { ok: true, data: Array.isArray(data) ? data : [] };
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
