// validateAnswers.js
import questions from "./questions.js";

// 20题列表
const REQUIRED_QUESTIONS = Array.from({ length: 20 }, (_, i) => `Q${i + 1}`);

// 每题允许的 value（⚠️ 先做“最小严格版”，后面可以再细化）
const ALLOWED_VALUES = Object.fromEntries(
  questions.map((question) => [
    question.id,
    Array.isArray(question.options)
      ? question.options.map((option) => option.value)
      : []
  ])
);

export function validateAnswersPayload(body) {
  // 1️ body 基础检查
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      ok: false,
      error: "Invalid payload",
      details: "request body must be an object"
    };
  }

  const answers = body.answers;

  // 2️ answers 基础检查
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
    return {
      ok: false,
      error: "Invalid payload",
      details: "answers must be an object"
    };
  }

  // 3️ 缺题检查
  const missing = REQUIRED_QUESTIONS.filter(q => !(q in answers));
  if (missing.length > 0) {
    return {
      ok: false,
      error: "Missing required questions",
      details: { missing }
    };
  }

  // 4️ 每题校验
  for (const q of REQUIRED_QUESTIONS) {
  const value = answers[q];

  // 每题都按单选 string 校验
  if (typeof value !== "string") {
    return {
      ok: false,
      error: "Invalid type",
      details: { question: q, expected: "string", received: typeof value }
    };
  }

    if (!ALLOWED_VALUES[q].includes(value)) {
      return {
        ok: false,
        error: "Invalid value",
        details: { question: q, received: value }
      };
    }
  }

  // ✅ 全部通过
  return { ok: true };
}