import { describe, expect, it } from "vitest";

import { quizAiLlmEnvelopeSchema } from "@/contracts/quiz-ai-definition";

describe("quizAiLlmEnvelopeSchema", () => {
  it("接受合法 envelope", () => {
    const raw = {
      definition: {
        quiz: { name: "T", code: "t1", quizType: "score" },
        questions: [{ seq: 1, content: "?", options: [] }],
        outcomes: [{ code: "a", name: "A", description: "", matchConfig: {}, isFallback: true, isSpecial: false }],
      },
    };
    const r = quizAiLlmEnvelopeSchema.safeParse(raw);
    expect(r.success).toBe(true);
  });

  it("拒绝缺少 definition", () => {
    const r = quizAiLlmEnvelopeSchema.safeParse({ quiz: {} });
    expect(r.success).toBe(false);
  });
});
