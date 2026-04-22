import { describe, expect, it } from "vitest";

import {
  buildAnswerNarrativeLines,
  buildDeepAnalysisSystemPrompt,
  buildDeepAnalysisUserPrompt,
} from "@/server/services/quiz-deep-analysis";

describe("buildAnswerNarrativeLines", () => {
  it("maps answers to question text and option label", () => {
    const lines = buildAnswerNarrativeLines(
      [{ questionSeq: 1, optionCode: "A" }],
      [
        {
          seq: 1,
          content: "第一题？",
          options: [{ key: "A", label: "选我" }],
        },
      ],
    );
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("第一题？");
    expect(lines[0]).toContain("选我");
  });

  it("sorts by questionSeq and marks missing questions", () => {
    const lines = buildAnswerNarrativeLines(
      [
        { questionSeq: 2, optionCode: "X" },
        { questionSeq: 1, optionCode: "Y" },
      ],
      [{ seq: 1, content: "仅第一题", options: [{ key: "Y", label: "Y值" }] }],
    );
    expect(lines[0]).toContain("仅第一题");
    expect(lines[1]).toContain("未找到");
  });
});

describe("buildDeepAnalysisUserPrompt", () => {
  it("includes quiz context and answer lines", () => {
    const text = buildDeepAnalysisUserPrompt({
      quizName: "小测",
      quizType: "score",
      score: 90,
      outcomeName: "类型A",
      outcomeSummary: "摘",
      outcomeDetail: "详",
      answerLines: ["- 第1题：…"],
    });
    expect(text).toContain("小测");
    expect(text).toContain("类型A");
    expect(text).toContain("第1题");
  });
});

describe("buildDeepAnalysisSystemPrompt", () => {
  it("encodes three distinct style instructions", () => {
    const humor = buildDeepAnalysisSystemPrompt("humor");
    const warm = buildDeepAnalysisSystemPrompt("warm");
    const rational = buildDeepAnalysisSystemPrompt("rational");
    expect(humor).toContain("幽默诙谐");
    expect(warm).toContain("温暖共情");
    expect(rational).toContain("理性客观");
    expect(new Set([humor, warm, rational]).size).toBe(3);
  });

  it("asks for plain text, not markdown headings", () => {
    const p = buildDeepAnalysisSystemPrompt("humor");
    expect(p).toContain("纯文本");
    expect(p).not.toMatch(/^##\s/m);
  });
});
