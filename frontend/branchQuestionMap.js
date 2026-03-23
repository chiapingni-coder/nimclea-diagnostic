// branchQuestionMap.js
// 👉 作用：把 A/B/C/D → 对应题目对象数组

import questions, { branchQuestionIds } from "./questions";

// 1️⃣ 建立 Q1 → question 对象的字典
const questionDict = Object.fromEntries(
  questions.map((q) => [q.id, q])
);

// 2️⃣ 构建 branch → questions 映射
export const branchQuestionMap = Object.fromEntries(
  Object.entries(branchQuestionIds).map(([branchKey, ids]) => [
    branchKey,
    ids
      .map((id) => questionDict[id])
      .filter(Boolean) // 防止 undefined
  ])
);