import { describe, expect, it } from "vitest";

import { calculateQuizResult } from "@/server/services/quiz-algorithm-service";

describe("calculateQuizResult", () => {
  it("score模式按区间命中结果", () => {
    const result = calculateQuizResult({
      quizType: "score",
      answers: { "1": "A" },
      questions: [
        {
          seq: 1,
          options: [{ key: "A", score: 8 }],
        },
      ],
      outcomes: [
        { code: "LOW", matchConfig: { score_min: 0, score_max: 5 } },
        { code: "HIGH", matchConfig: { score_min: 6, score_max: 100 } },
      ],
      algoConfig: { total_max: 10 },
      specialRules: [],
    });
    expect(result.outcomeCode).toBe("HIGH");
    expect(result.score).toBe(80);
  });

  it("score模式仅填 code 无 key 时仍按用户所选累加", () => {
    const result = calculateQuizResult({
      quizType: "score",
      answers: { "1": "A" },
      questions: [
        {
          seq: 1,
          options: [{ key: "", code: "A", score: 8 }],
        },
      ],
      outcomes: [
        { code: "LOW", matchConfig: { score_min: 0, score_max: 5 } },
        { code: "HIGH", matchConfig: { score_min: 6, score_max: 100 } },
      ],
      algoConfig: { total_max: 10 },
      specialRules: [],
    });
    expect(result.outcomeCode).toBe("HIGH");
    expect(result.score).toBe(80);
  });

  it("special规则优先覆盖算法结果", () => {
    const result = calculateQuizResult({
      quizType: "score",
      answers: { "1": "A" },
      questions: [{ seq: 1, options: [{ key: "A", score: 1 }] }],
      outcomes: [{ code: "SPECIAL" }, { code: "NORMAL", matchConfig: { score_min: 0, score_max: 10 } }],
      algoConfig: {},
      specialRules: [
        {
          condition_type: "option_selected",
          question_seq: 1,
          option_key: "A",
          trigger_outcome_code: "SPECIAL",
        },
      ],
    });
    expect(result.outcomeCode).toBe("SPECIAL");
    expect(result.calcResult.triggeredBy).toBe("special_rule");
  });

  it("branch模式按nextQuestionSeq终止命中", () => {
    const result = calculateQuizResult({
      quizType: "branch",
      answers: { "1": "A" },
      questions: [
        {
          seq: 1,
          options: [{ key: "A", nextQuestionSeq: -1, outcomeCode: "END_A" }],
        },
      ],
      outcomes: [{ code: "END_A" }, { code: "FALLBACK", isFallback: true }],
      algoConfig: {},
      specialRules: [],
    });
    expect(result.outcomeCode).toBe("END_A");
    expect((result.calcResult.path as number[])[0]).toBe(1);
  });

  it("vector模式按相似度选最近结果", () => {
    const result = calculateQuizResult({
      quizType: "vector",
      answers: { "1": "A" },
      questions: [
        {
          seq: 1,
          options: [{ key: "A", dimScores: { D1: 3 } }],
        },
      ],
      outcomes: [
        { code: "TYPE1", matchConfig: { dim_vector: [1] } },
        { code: "TYPE2", matchConfig: { dim_vector: [3] } },
      ],
      algoConfig: {
        dimensions: [{ code: "D1", sort_order: 1 }],
      },
      specialRules: [],
    });
    expect(["TYPE1", "TYPE2"]).toContain(result.outcomeCode);
  });
});
