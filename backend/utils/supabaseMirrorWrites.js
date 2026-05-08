import crypto from "node:crypto";
import { isSupabaseEnabled, supabase } from "./supabaseClient.js";

function normalizeCaseId(record = {}) {
  return String(record?.caseId || record?.case_id || record?.id || "").trim();
}

function normalizeEmail(value = "") {
  return String(value || "").trim().toLowerCase();
}

function cleanText(value = "") {
  return typeof value === "string" ? value.trim() : "";
}

function nullableUuid(value) {
  const text = cleanText(value);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)
    ? text
    : null;
}

function jsonValue(value, fallback = null) {
  return value === undefined ? fallback : value;
}

function stableHash(value) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(value || {}))
    .digest("hex")
    .slice(0, 24);
}

export async function mirrorCaseToSupabase(caseRecord = {}) {
  if (!isSupabaseEnabled || !supabase) {
    console.warn("[supabase:case] skipped, env missing");
    return { ok: false, skipped: true };
  }

  const caseId = normalizeCaseId(caseRecord);

  if (!caseId) {
    console.warn("[supabase:case] skipped, missing case_id");
    return { ok: false, skipped: true };
  }

  try {
    const now = new Date().toISOString();
    const payload = {
      case_id: caseId,
      email: normalizeEmail(caseRecord?.email),
      name: cleanText(caseRecord?.name || caseRecord?.lead?.name),
      company: cleanText(caseRecord?.company || caseRecord?.lead?.company),
      status: cleanText(caseRecord?.status),
      stage: cleanText(caseRecord?.stage || caseRecord?.currentStep),
      source: cleanText(caseRecord?.source),
      result: jsonValue(caseRecord?.result || caseRecord?.preview),
      case_data: jsonValue(
        caseRecord?.caseData ||
          caseRecord?.caseSchema ||
          caseRecord?.caseSnapshot
      ),
      raw_record: caseRecord,
      created_at: caseRecord?.createdAt || caseRecord?.created_at || now,
      updated_at: caseRecord?.updatedAt || caseRecord?.updated_at || now,
    };

    const { error } = await supabase
      .from("cases")
      .upsert(payload, { onConflict: "case_id" });

    if (error) throw error;

    console.log(`[supabase:case] mirrored case ${caseId}`);
    return { ok: true };
  } catch (error) {
    console.warn("[supabase:case] failed but ignored:", error?.message || error);
    return { ok: false, error };
  }
}

export async function mirrorDiagnosticRecordToSupabase(payload = {}) {
  if (!isSupabaseEnabled || !supabase) {
    console.warn("[supabase:diagnostic] skipped, env missing");
    return { ok: false, skipped: true };
  }

  const caseId = normalizeCaseId(payload);

  if (!caseId) {
    console.warn("[supabase:diagnostic] skipped, missing case_id");
    return { ok: false, skipped: true };
  }

  try {
    const record = {
      case_id: caseId,
      email: normalizeEmail(payload?.email),
      source: cleanText(payload?.source),
      answers: jsonValue(payload?.answers),
      result: jsonValue(payload?.result || payload?.preview),
      case_schema: jsonValue(payload?.caseSchema),
      case_data: jsonValue(payload?.caseData),
      raw_record: payload?.rawRecord || payload,
      created_at: payload?.createdAt || payload?.created_at || new Date().toISOString(),
    };

    const { error } = await supabase
      .from("diagnostic_records")
      .insert(record);

    if (error) throw error;

    console.log(`[supabase:diagnostic] mirrored diagnostic record ${caseId}`);
    return { ok: true };
  } catch (error) {
    console.warn("[supabase:diagnostic] failed but ignored:", error?.message || error);
    return { ok: false, error };
  }
}

export async function mirrorCaseResultToSupabase(payload = {}) {
  if (!isSupabaseEnabled || !supabase) {
    console.warn("[supabase:case-result] skipped, env missing");
    return { ok: false, skipped: true };
  }

  const rawRecord = payload?.rawRecord || payload || {};
  const caseId = normalizeCaseId(payload) || normalizeCaseId(rawRecord);

  if (!caseId) {
    console.warn("[supabase:case-result] missing caseId");
    return { ok: false, skipped: true };
  }

  try {
    const score = Number(
      payload?.score ??
        payload?.totalScore ??
        rawRecord?.score ??
        rawRecord?.totalScore ??
        0
    );
    const eventCount = Number(
      payload?.eventCount ??
        rawRecord?.eventCount ??
        rawRecord?.events?.length ??
        rawRecord?.eventLogs?.length ??
        0
    );
    const receiptEligible = Boolean(
      payload?.receiptEligible ??
        rawRecord?.receiptEligible ??
        rawRecord?.caseReceiptEligible ??
        false
    );
    const verificationEligible = Boolean(
      payload?.verificationEligible ??
        rawRecord?.verificationEligible ??
        false
    );
    const record = {
      case_id: caseId,
      user_id: nullableUuid(payload?.userId || payload?.user_id || rawRecord?.userId || rawRecord?.user_id),
      email: normalizeEmail(payload?.email || rawRecord?.email),
      result_status: cleanText(payload?.status || rawRecord?.status || "result_ready"),
      score,
      event_count: eventCount,
      receipt_eligible: receiptEligible,
      verification_eligible: verificationEligible,
      created_at: payload?.createdAt || rawRecord?.createdAt || new Date().toISOString(),
      summary_payload: jsonValue({
        result: payload?.result || rawRecord?.result || null,
        preview: payload?.preview || rawRecord?.preview || null,
        caseSchema: payload?.caseSchema || rawRecord?.caseSchema || null,
        caseData: payload?.caseData || rawRecord?.caseData || null,
        summary: payload?.summary || rawRecord?.summary || "",
        title: payload?.title || rawRecord?.title || "",
      }),
      scoring_payload: jsonValue({
        score,
        structureScore:
          payload?.structureScore ??
          payload?.structureScoreFromCase ??
          payload?.caseData?.structureScore ??
          rawRecord?.structureScore ??
          rawRecord?.structureScoreFromCase ??
          rawRecord?.caseData?.structureScore ??
          null,
        structureStatus:
          payload?.structureStatus ||
          payload?.structureStatusFromCase ||
          payload?.caseData?.structureStatus ||
          rawRecord?.structureStatus ||
          rawRecord?.structureStatusFromCase ||
          rawRecord?.caseData?.structureStatus ||
          "",
        routeDecision:
          payload?.routeDecision ||
          payload?.routeDecisionFromCase ||
          payload?.caseData?.routeDecision ||
          rawRecord?.routeDecision ||
          rawRecord?.routeDecisionFromCase ||
          rawRecord?.caseData?.routeDecision ||
          null,
        receiptEligible,
        verificationEligible,
        eventCount,
      }),
      raw_payload: jsonValue(rawRecord),
    };

    const { error } = await supabase
      .from("case_result_records")
      .insert(record);

    if (error) throw error;

    console.log(`[supabase:case-result] mirrored case result ${caseId}`);
    return { ok: true };
  } catch (error) {
    console.warn("[supabase:case-result] failed but ignored:", error?.message || error);
    return { ok: false, error };
  }
}

export async function mirrorCasePlanToSupabase(payload = {}) {
  if (!isSupabaseEnabled || !supabase) {
    console.warn("[supabase:case-plan] skipped, env missing");
    return { ok: false, skipped: true };
  }

  const rawRecord = payload?.rawRecord || {};
  const caseId = normalizeCaseId(payload) || normalizeCaseId(rawRecord);

  if (!caseId) {
    console.warn("[supabase:case-plan] skipped, missing case_id");
    return { ok: false, skipped: true };
  }

  try {
    const workflow =
      payload?.workflow ||
      payload?.caseData?.workflow ||
      rawRecord?.workflow ||
      rawRecord?.caseData?.workflow ||
      rawRecord?.pilot_setup?.workflow ||
      null;
    const planData = {
      workflow,
      scopeLock:
        payload?.scopeLock ||
        payload?.caseData?.scopeLock ||
        rawRecord?.scopeLock ||
        rawRecord?.caseData?.scopeLock ||
        null,
      acceptanceChecklist:
        payload?.acceptanceChecklist ||
        payload?.caseData?.acceptanceChecklist ||
        rawRecord?.acceptanceChecklist ||
        rawRecord?.caseData?.acceptanceChecklist ||
        null,
      pilot_setup: payload?.pilot_setup || rawRecord?.pilot_setup || null,
      routeMeta: payload?.routeMeta || rawRecord?.routeMeta || null,
    };
    const now = new Date().toISOString();
    const record = {
      case_id: caseId,
      email: normalizeEmail(payload?.email || rawRecord?.email),
      source: cleanText(payload?.source || rawRecord?.source || "case_plan"),
      workflow,
      plan_data: planData,
      case_data: jsonValue(payload?.caseData || rawRecord?.caseData),
      raw_record: payload,
      created_at: payload?.createdAt || rawRecord?.createdAt || now,
      updated_at: now,
    };

    const { error } = await supabase
      .from("case_plan_records")
      .upsert(record, { onConflict: "case_id" });

    if (error) throw error;

    console.log(`[supabase:case-plan] mirrored case plan ${caseId}`);
    return { ok: true };
  } catch (error) {
    console.warn("[supabase:case-plan] failed but ignored:", error?.message || error);
    return { ok: false, error };
  }
}

export async function mirrorEventLogToSupabase(eventRecord = {}) {
  if (!isSupabaseEnabled || !supabase) {
    console.warn("[supabase:event] skipped, env missing");
    return { ok: false, skipped: true };
  }

  try {
    const eventId =
      cleanText(eventRecord?.eventId || eventRecord?.event_id || eventRecord?.id) ||
      `evt_${stableHash(eventRecord)}`;
    const record = {
      event_id: eventId,
      case_id: cleanText(eventRecord?.caseId || eventRecord?.case_id || eventRecord?.meta?.caseId),
      user_id: nullableUuid(eventRecord?.userId || eventRecord?.user_id),
      trial_id: cleanText(eventRecord?.trialId || eventRecord?.trial_id),
      event_type: cleanText(eventRecord?.eventType || eventRecord?.event_type || eventRecord?.type),
      page: cleanText(eventRecord?.page),
      source: cleanText(eventRecord?.source),
      meta: jsonValue(eventRecord?.meta, {}),
      raw_record: eventRecord,
      created_at: eventRecord?.createdAt || eventRecord?.created_at || new Date().toISOString(),
    };

    const { error } = await supabase
      .from("event_logs")
      .upsert(record, { onConflict: "event_id" });

    if (error) throw error;

    console.log(`[supabase:event] mirrored event ${eventId || record.case_id || "unknown"}`);
    return { ok: true };
  } catch (error) {
    console.warn("[supabase:event] failed but ignored:", error?.message || error);
    return { ok: false, error };
  }
}

export async function mirrorReceiptRecordToSupabase(receiptRecord = {}) {
  if (!isSupabaseEnabled || !supabase) {
    console.warn("[supabase:receipt] skipped, env missing");
    return { ok: false, skipped: true };
  }

  try {
    const caseId = cleanText(receiptRecord?.caseId || receiptRecord?.case_id);
    const receiptHash = cleanText(
      receiptRecord?.hash ||
        receiptRecord?.receiptHash ||
        receiptRecord?.receipt_hash ||
        receiptRecord?.caseSnapshotHash
    );

    if (!caseId) {
      console.warn("[supabase:receipt] skipped, missing case_id");
      return { ok: false, skipped: true };
    }

    const record = {
      case_id: caseId,
      receipt_hash: receiptHash,
      hash: receiptHash,
      payment_status: cleanText(receiptRecord?.paymentStatus || receiptRecord?.payment_status),
      verification_status: cleanText(receiptRecord?.verificationStatus || receiptRecord?.verification_status),
      paid: receiptRecord?.paid === true,
      source: cleanText(receiptRecord?.source),
      case_snapshot: jsonValue(receiptRecord?.caseSnapshot),
      raw_record: receiptRecord,
      raw_payload: receiptRecord,
      created_at: receiptRecord?.createdAt || receiptRecord?.created_at || new Date().toISOString(),
      updated_at: receiptRecord?.updatedAt || receiptRecord?.updated_at || new Date().toISOString(),
    };

    const { error } = await supabase
      .from("receipt_records")
      .upsert(record, { onConflict: "case_id" });

    if (error) throw error;

    console.log(`[supabase:receipt] mirrored receipt ${record.case_id || "unknown"}`);
    return { ok: true };
  } catch (error) {
    console.warn("[supabase:receipt] failed but ignored:", error?.message || error);
    return { ok: false, error };
  }
}
