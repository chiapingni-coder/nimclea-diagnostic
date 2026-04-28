const MOJIBAKE_PATTERN = /[\uFFFD]|\u00e2\u20ac|\u00c3.|\u00c2.|\u951f|\u95b3|\u95c2|\u6fe1|\u95c1|\u95bb/;

const REPLACEMENTS = [
  [/\\r\\n|\\n|\\r|`n/g, " "],
  [/\r\n|\r|\n/g, " "],
  [/\uFFFD+/g, ""],
  [/\u00e2\u20ac[\u2122\u02dc]|\u00c3\u00a2\u00e2\u201a\u00ac[\u00e2\u201e\u00a2\u2039\u0152]/g, "'"],
  [/\u00e2\u20ac[\u0153\ufffd]|\u00c3\u00a2\u00e2\u201a\u00ac[\u00c5\u201c\ufffd]/g, '"'],
  [/\u00e2\u20ac[\u201c\u201d]|\u00c3\u00a2\u00e2\u201a\u00ac\u00e2\u20ac[\u0153\ufffd]/g, "-"],
  [/\u00e2\u20ac\u00a2|\u00c3\u00a2\u00e2\u201a\u00ac\u00c2\u00a2/g, "-"],
  [/\u00c2/g, ""],
  [/\u00c3\u0097/g, "x"],
  [/\u00c3\u00a9/g, "e"],
  [/\u00c3\u00a8/g, "e"],
  [/\u00c3\u00a1/g, "a"],
  [/\u00c3\u0020/g, "a"],
  [/\u00c3\u00b3/g, "o"],
  [/\u00c3\u00bc/g, "u"],
  [/[\u951f\u95b3\u95c2\u6fe1\u95c1\u95bb]+/g, ""],
];

export function hasMojibake(value) {
  const text =
    typeof value === "string" ? value : JSON.stringify(value ?? "");

  return MOJIBAKE_PATTERN.test(text) || /\\[nr]|`n/.test(text);
}

export function sanitizeText(value, fallback = "") {
  if (value === null || value === undefined) return fallback;

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    const text = value
      .map((item) => sanitizeText(item, ""))
      .filter(Boolean)
      .join(" / ");

    return text || fallback;
  }

  if (typeof value === "object") return fallback;

  let text = String(value);

  for (const [pattern, replacement] of REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }

  text = text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\s+([.,!?;:])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  return text || fallback;
}

export function sanitizeDisplayRecord(record = {}) {
  if (Array.isArray(record)) {
    return record.map((item) => sanitizeDisplayRecord(item));
  }

  if (!record || typeof record !== "object") return record;

  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => {
      if (typeof value === "string") {
        return [key, sanitizeText(value)];
      }

      if (Array.isArray(value) || (value && typeof value === "object")) {
        return [key, sanitizeDisplayRecord(value)];
      }

      return [key, value];
    })
  );
}
