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

function jsonValue(value, fallback = null) {
  return value === undefined ? fallback : value;
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
