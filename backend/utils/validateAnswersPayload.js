import { questions } from "../data/questions.js";
import QUESTION_VALUES from "../data/questionValues.js";

/**
 * Nimclea Diagnostic
 * validateAnswersPayload.js
 *
 * 作用：
 * 1. 校验 payload 是否合法
 * 2. 校验 answers 是否为对象
 * 3. 按 questions.js 中的 type 校验答案类型
 * 4. 按 QUESTION_VALUES 校验答案值是否合法
 *
 * 返回：
 * - [] 表示通过
 * - [ { code, questionId?, value?, message } ] 表示有错误
 */

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeAllowedValues(rawAllowedValues) {
  if (Array.isArray(rawAllowedValues)) {
    return rawAllowedValues;
  }
  return [];
}

function buildQuestionMap(questionList) {
  return Object.fromEntries(questionList.map((question) => [question.id, question]));
}

const QUESTION_MAP = buildQuestionMap(questions);

function validateSingleSelect(question, value, allowedValues, errors) {
  if (typeof value !== "string" || value.trim() === "") {
    errors.push({
      code: "INVALID_ANSWER_TYPE",
      questionId: question.id,
      value,
      message: `${question.id} must be a valid selected string value`
    });
    return;
  }

  if (!allowedValues.includes(value)) {
    errors.push({
      code: "INVALID_ANSWER_VALUE",
      questionId: question.id,
      value,
      message: `${question.id} has an unsupported value`
    });
  }
}

function validateMultiSelect(question, value, allowedValues, errors) {
  if (!Array.isArray(value)) {
    errors.push({
      code: "INVALID_ANSWER_TYPE",
      questionId: question.id,
      value,
      message: `${question.id} must be an array`
    });
    return;
  }

  if (value.length === 0) {
    errors.push({
      code: "INVALID_ANSWER_VALUE",
      questionId: question.id,
      value,
      message: `${question.id} must contain at least one selected value`
    });
    return;
  }

  const nonStringItems = value.filter((item) => typeof item !== "string" || item.trim() === "");
  if (nonStringItems.length > 0) {
    errors.push({
      code: "INVALID_ANSWER_TYPE",
      questionId: question.id,
      value: nonStringItems,
      message: `${question.id} must contain only non-empty strings`
    });
    return;
  }

  const invalidValues = value.filter((item) => !allowedValues.includes(item));
  if (invalidValues.length > 0) {
    errors.push({
      code: "INVALID_ANSWER_VALUE",
      questionId: question.id,
      value: invalidValues,
      message: `${question.id} contains unsupported values`
    });
  }
}

function validateUnknownQuestionIds(answers, errors) {
  for (const answerKey of Object.keys(answers)) {
    if (!QUESTION_MAP[answerKey]) {
      errors.push({
        code: "UNKNOWN_QUESTION_ID",
        questionId: answerKey,
        value: answers[answerKey],
        message: `${answerKey} is not a recognized question id`
      });
    }
  }
}

/**
 * 校验 payload
 * @param {object} payload - 预期结构：{ answers: { Q1: ..., Q2: ... } }
 * @returns {Array<object>} errors
 */
export function validateAnswersPayload(payload) {
  const errors = [];

  if (!isPlainObject(payload)) {
    return [
      {
        code: "INVALID_PAYLOAD",
        message: "Payload must be a plain object"
      }
    ];
  }

  const { answers } = payload;

  if (!isPlainObject(answers)) {
    return [
      {
        code: "INVALID_ANSWERS_OBJECT",
        message: "answers must be a plain object"
      }
    ];
  }

  validateUnknownQuestionIds(answers, errors);

  for (const question of questions) {
    const { id, type } = question;

    // 未回答的题先跳过
    // 这样前端可以分阶段提交，不会因为未完成所有题而被整体拦截
    if (!Object.prototype.hasOwnProperty.call(answers, id)) {
      continue;
    }

    const value = answers[id];

    // null / undefined 直接视为未回答，跳过
    if (
      value === null ||
      value === undefined ||
      (typeof value === "string" && value.trim() === "")
    ) {
      continue;
    }

    const allowedValues = normalizeAllowedValues(QUESTION_VALUES[id]);

    if (allowedValues.length === 0) {
      errors.push({
        code: "MISSING_ALLOWED_VALUES",
        questionId: id,
        value,
        message: `${id} is missing allowed values configuration`
      });
      continue;
    }

    if (type === "single_select") {
      validateSingleSelect(question, value, allowedValues, errors);
      continue;
    }

    if (type === "multi_select") {
      validateMultiSelect(question, value, allowedValues, errors);
      continue;
    }

    errors.push({
      code: "UNSUPPORTED_QUESTION_TYPE",
      questionId: id,
      value,
      message: `${id} has unsupported question type: ${type}`
    });
  }

  return errors;
}

export default validateAnswersPayload;