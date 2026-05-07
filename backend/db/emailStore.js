import getPool from "./pool.js";

function normalizeEmail(value = "") {
  return String(value || "").trim().toLowerCase();
}

function cleanText(value = "") {
  return typeof value === "string" ? value.trim() : "";
}

export async function persistEmailRecord(payload = {}) {
  const email = normalizeEmail(payload?.email || payload?.to);

  if (!email) {
    throw new Error("email is required");
  }

  const name = cleanText(payload?.name);
  const company = cleanText(payload?.company);
  const caseId = cleanText(payload?.caseId || payload?.case_id);
  const source = cleanText(payload?.source || payload?.emailType);
  const rawPayload = payload?.raw_payload || payload;
  const pool = getPool();

  const userResult = await pool.query(
    `
      insert into public.users (email, name, company)
      values ($1, nullif($2, ''), nullif($3, ''))
      on conflict (email) do update set
        name = coalesce(nullif(excluded.name, ''), public.users.name),
        company = coalesce(nullif(excluded.company, ''), public.users.company)
      returning user_id
    `,
    [email, name, company]
  );

  const userId = userResult.rows?.[0]?.user_id || null;

  await pool.query(
    `
      insert into public.email_logs (
        email,
        user_id,
        case_id,
        source,
        name,
        company,
        raw_payload
      )
      values ($1, $2, nullif($3, ''), nullif($4, ''), nullif($5, ''), nullif($6, ''), $7::jsonb)
    `,
    [email, userId, caseId, source, name, company, JSON.stringify(rawPayload)]
  );

  return {
    email,
    userId,
  };
}
