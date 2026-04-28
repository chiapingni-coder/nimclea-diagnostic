const GARBLED_REPLACEMENTS = [
  [/闁\?/g, ""],
  [/�/g, ""],
  [/鈥?/g, "'"],
  [/鈥渃/g, '"'],
  [/鈥/g, "'"],
  [/锛?/g, ""],
  [/鏉/g, ""],
  [/妫/g, ""],
  [/閸/g, ""],
  [/鐎/g, ""],
];

export function sanitizeDisplayText(value, fallback = "") {
  if (value === null || value === undefined) return fallback;

  if (typeof value !== "string") {
    return value;
  }

  let text = value;

  for (const [pattern, replacement] of GARBLED_REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }

  text = text
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,!?;:])/g, "$1")
    .trim();

  return text || fallback;
}

export function sanitizeDisplayObject(input) {
  if (Array.isArray(input)) {
    return input.map(sanitizeDisplayObject);
  }

  if (input && typeof input === "object") {
    return Object.fromEntries(
      Object.entries(input).map(([key, value]) => [
        key,
        sanitizeDisplayObject(value),
      ])
    );
  }

  return sanitizeDisplayText(input);
}
