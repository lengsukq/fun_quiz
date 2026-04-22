import { beforeEach, describe, expect, it, vi } from "vitest";

const repo = vi.hoisted(() => ({
  findQuizTokenByValue: vi.fn(),
  listAllowedQuizIdsByTokenId: vi.fn(),
  findQuizById: vi.fn(),
  listQuizQuestions: vi.fn(),
  listQuizOutcomes: vi.fn(),
  findOutcomeByCode: vi.fn(),
  createQuizResultWithTokenUsage: vi.fn(),
  updateQuizTokenUsage: vi.fn(),
  findQuizResultById: vi.fn(),
  updateQuizTokenStatus: vi.fn(),
  listQuizzesByTokenId: vi.fn(),
  listQuizResultsByTokenId: vi.fn(),
  listPublishedQuizzes: vi.fn(),
  listQuizHistoryByTokenId: vi.fn(),
  attachQuizIdsToToken: vi.fn(),
  createQuizToken: vi.fn(),
  deleteQuiz: vi.fn(),
  listQuizzes: vi.fn(),
  listQuizTokens: vi.fn(),
  replaceQuizOutcomes: vi.fn(),
  replaceQuizQuestions: vi.fn(),
  saveQuiz: vi.fn(),
}));

const deepAnalysisMock = vi.hoisted(() => ({
  requestQuizDeepAnalysis: vi.fn().mockResolvedValue({ analysis: "mocked analysis" }),
}));

vi.mock("@/server/repositories/quiz-repository", () => repo);

vi.mock("@/server/services/quiz-deep-analysis", () => ({
  requestQuizDeepAnalysis: deepAnalysisMock.requestQuizDeepAnalysis,
}));

describe("quiz-service integration-like behavior", async () => {
  const service = await import("@/server/services/quiz-service");

  beforeEach(() => {
    vi.clearAllMocks();
    deepAnalysisMock.requestQuizDeepAnalysis.mockResolvedValue({ analysis: "mocked analysis" });
  });

  it("submitQuiz 会校验token授权并扣减次数", async () => {
    repo.findQuizTokenByValue.mockResolvedValue({
      id: "token1",
      status: "active",
      usedCount: 0,
      expiresAt: null,
    });
    repo.listQuizzesByTokenId.mockResolvedValue([{ id: "quiz1", status: "published" }]);
    repo.listAllowedQuizIdsByTokenId.mockResolvedValue(["quiz1"]);
    repo.findQuizById.mockResolvedValue({
      id: "quiz1",
      quizType: "score",
      status: "published",
      algoConfig: { total_max: 10 },
      specialRules: [],
    });
    repo.listQuizQuestions.mockResolvedValue([
      {
        seq: 1,
        isHidden: false,
        options: [{ key: "A", score: 10 }],
      },
    ]);
    repo.listQuizOutcomes.mockResolvedValue([
      { code: "OUTCOME_A", isFallback: false, isSpecial: false, matchConfig: { score_min: 5, score_max: 20 } },
    ]);
    repo.findOutcomeByCode.mockResolvedValue({ id: "outcome_id", code: "OUTCOME_A" });
    repo.createQuizResultWithTokenUsage.mockResolvedValue({ id: "token1", status: "active" });

    const result = await service.submitQuiz({
      token: "abc",
      quizId: "quiz1",
      answers: [{ questionSeq: 1, optionCode: "A" }],
    });

    expect(result.resultId).toBeTruthy();
    expect(repo.createQuizResultWithTokenUsage).toHaveBeenCalledTimes(1);
  });

  it("submitQuiz 在并发耗尽时返回 token exhausted", async () => {
    repo.findQuizTokenByValue.mockResolvedValue({
      id: "token1",
      status: "active",
      usedCount: 0,
      expiresAt: null,
    });
    repo.listQuizzesByTokenId.mockResolvedValue([{ id: "quiz1", status: "published" }]);
    repo.listAllowedQuizIdsByTokenId.mockResolvedValue(["quiz1"]);
    repo.findQuizById.mockResolvedValue({
      id: "quiz1",
      quizType: "score",
      status: "published",
      algoConfig: { total_max: 10 },
      specialRules: [],
    });
    repo.listQuizQuestions.mockResolvedValue([{ seq: 1, isHidden: false, options: [{ key: "A", score: 10 }] }]);
    repo.listQuizOutcomes.mockResolvedValue([{ code: "OUTCOME_A", isFallback: false, isSpecial: false, matchConfig: { score_min: 5, score_max: 20 } }]);
    repo.findOutcomeByCode.mockResolvedValue({ id: "outcome_id", code: "OUTCOME_A" });
    repo.createQuizResultWithTokenUsage.mockResolvedValue(null);

    await expect(
      service.submitQuiz({
        token: "abc",
        quizId: "quiz1",
        answers: [{ questionSeq: 1, optionCode: "A" }],
      }),
    ).rejects.toThrow();
  });

  it("getQuizResult 必须校验结果归属token", async () => {
    repo.findQuizTokenByValue.mockResolvedValue({
      id: "token1",
      status: "active",
      usedCount: 1,
      expiresAt: null,
    });
    repo.listQuizzesByTokenId.mockResolvedValue([{ id: "quiz1", status: "published" }]);
    repo.findQuizResultById.mockResolvedValue({
      id: "result1",
      tokenId: "token2",
      quizId: "quiz1",
      outcomeCode: "OUT_A",
      score: 88,
    });

    await expect(service.getQuizResult("token_value", "result1")).rejects.toThrow();
  });

  it("getQuizResult 返回显式 DTO 且不含 answers / tokenId", async () => {
    repo.findQuizTokenByValue.mockResolvedValue({
      id: "token1",
      status: "active",
      usedCount: 1,
      expiresAt: null,
    });
    repo.listQuizzesByTokenId.mockResolvedValue([{ id: "quiz1", status: "published" }]);
    repo.findQuizResultById.mockResolvedValue({
      id: "result1",
      tokenId: "token1",
      quizId: "quiz1",
      outcomeCode: "OUT_A",
      score: 88,
      calcResult: { path: [1, 2] },
      shareImage: "https://example.com/share.png",
    });
    repo.findQuizById.mockResolvedValue({
      id: "quiz1",
      name: "心理小测",
      quizType: "score",
      resultConfig: { bgColor: "linear-gradient(90deg, #1e1b4b, #4c1d95)" },
    });
    repo.findOutcomeByCode.mockResolvedValue({
      id: "oc1",
      name: "类型A",
      description: "短述\n\n长文分析",
      matchConfig: { tags: ["外向", "果断"], avatarUrl: "https://example.com/a.png" },
    });

    const view = await service.getQuizResult("token_value", "result1");

    expect(view.resultId).toBe("result1");
    expect(view.quizName).toBe("心理小测");
    expect(view.outcomeName).toBe("类型A");
    expect(view.outcomeTags).toEqual(["外向", "果断"]);
    expect(view.outcomeSummary).toBe("短述");
    expect(view.outcomeDetail).toBe("长文分析");
    expect(view.shareImage?.url).toBe("https://example.com/share.png");
    expect(view.outcomeAvatar?.url).toBe("https://example.com/a.png");
    const { isDeepAnalysisLlmConfigured } = await import("@/lib/llm-env");
    expect(view.deepAnalysisAvailable).toBe(isDeepAnalysisLlmConfigured());
    expect(view).not.toHaveProperty("answers");
    expect(view).not.toHaveProperty("tokenId");
  });

  it("analyzeQuizResultDeep 校验结果归属并委托 requestQuizDeepAnalysis", async () => {
    deepAnalysisMock.requestQuizDeepAnalysis.mockResolvedValue({ analysis: "AI 结果" });
    repo.findQuizTokenByValue.mockResolvedValue({
      id: "token1",
      status: "active",
      usedCount: 1,
      expiresAt: null,
    });
    repo.listQuizzesByTokenId.mockResolvedValue([{ id: "quiz1", status: "published" }]);
    repo.findQuizResultById.mockResolvedValue({
      id: "result1",
      tokenId: "token1",
      quizId: "quiz1",
      outcomeCode: "O1",
      score: 80,
      answers: [{ questionSeq: 1, optionCode: "A" }],
    });
    repo.findQuizById.mockResolvedValue({ id: "quiz1", name: "测验", quizType: "score" });
    repo.findOutcomeByCode.mockResolvedValue({ name: "结果1", description: "d\n\nd2", matchConfig: {} });
    repo.listQuizQuestions.mockResolvedValue([
      { seq: 1, content: "你快乐吗？", options: [{ key: "A", label: "快乐" }] },
    ]);

    const out = await service.analyzeQuizResultDeep("token_value", "result1", "warm");
    expect(out.analysis).toBe("AI 结果");
    expect(deepAnalysisMock.requestQuizDeepAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "warm",
        quizName: "测验",
        answers: [{ questionSeq: 1, optionCode: "A" }],
      }),
    );
  });

  it("analyzeQuizResultDeep 拒绝非本人 result", async () => {
    repo.findQuizTokenByValue.mockResolvedValue({
      id: "token1",
      status: "active",
      usedCount: 1,
      expiresAt: null,
    });
    repo.listQuizzesByTokenId.mockResolvedValue([{ id: "quiz1", status: "published" }]);
    repo.findQuizResultById.mockResolvedValue({
      id: "result1",
      tokenId: "token2",
      quizId: "quiz1",
    });

    await expect(service.analyzeQuizResultDeep("t", "result1", "humor")).rejects.toThrow();
    expect(deepAnalysisMock.requestQuizDeepAnalysis).not.toHaveBeenCalled();
  });

  it("getQuizResult 优先使用 matchConfig 中的 summary 与 detail", async () => {
    repo.findQuizTokenByValue.mockResolvedValue({
      id: "token1",
      status: "active",
      usedCount: 1,
      expiresAt: null,
    });
    repo.listQuizzesByTokenId.mockResolvedValue([{ id: "q1", status: "published" }]);
    repo.findQuizResultById.mockResolvedValue({
      id: "r2",
      tokenId: "token1",
      quizId: "q1",
      outcomeCode: "X",
      score: 10,
      calcResult: {},
      shareImage: null,
    });
    repo.findQuizById.mockResolvedValue({
      id: "q1",
      name: "Q",
      quizType: "branch",
      resultConfig: {},
    });
    repo.findOutcomeByCode.mockResolvedValue({
      name: "N",
      description: "ignored",
      matchConfig: { summary: "摘", detail: "详" },
    });

    const view = await service.getQuizResult("t", "r2");
    expect(view.outcomeSummary).toBe("摘");
    expect(view.outcomeDetail).toBe("详");
  });
});
