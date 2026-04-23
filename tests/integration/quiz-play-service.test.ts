import { beforeEach, describe, expect, it, vi } from "vitest";

const repo = vi.hoisted(() => ({
  findQuizTokenByValue: vi.fn(),
  findQuizByCode: vi.fn(),
  listAllowedQuizIdsByTokenId: vi.fn(),
  listPublishedQuizzes: vi.fn(),
  listQuizHistoryByTokenId: vi.fn(),
  listQuizzesByTokenId: vi.fn(),
  updateQuizTokenStatus: vi.fn(),
  attachQuizIdsToToken: vi.fn(),
  createQuizResult: vi.fn(),
  createQuizToken: vi.fn(),
  deleteQuiz: vi.fn(),
  findOutcomeByCode: vi.fn(),
  findQuizById: vi.fn(),
  findQuizResultById: vi.fn(),
  listQuizOutcomes: vi.fn(),
  listQuizQuestions: vi.fn(),
  listQuizResultsByTokenId: vi.fn(),
  listQuizzes: vi.fn(),
  listQuizTokens: vi.fn(),
  replaceQuizOutcomes: vi.fn(),
  replaceQuizQuestions: vi.fn(),
  saveQuiz: vi.fn(),
  updateQuizTokenUsage: vi.fn(),
}));

vi.mock("@/server/repositories/quiz-repository", () => repo);

describe("quiz-play service behavior", async () => {
  const service = await import("@/server/services/quiz-service");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getEntryQuizzes returns paged published quizzes", async () => {
    repo.findQuizTokenByValue.mockResolvedValue({
      id: "token_1",
      status: "active",
      usedCount: 0,
      expiresAt: null,
    });
    repo.listQuizzesByTokenId.mockResolvedValue([{ id: "quiz_1" }]);
    repo.listAllowedQuizIdsByTokenId.mockResolvedValue(["quiz_1"]);
    repo.listPublishedQuizzes.mockResolvedValue({
      total: 1,
      list: [{ id: "quiz_1", name: "Q1" }],
    });

    const result = await service.getEntryQuizzes({
      token: "token_value",
      pageIndex: 1,
      pageSize: 10,
      search: "",
    });

    expect(result.total).toBe(1);
    expect(repo.listPublishedQuizzes).toHaveBeenCalledWith({
      search: "",
      category: undefined,
      pageIndex: 1,
      pageSize: 10,
      allowedIds: ["quiz_1"],
    });
  });

  it("getEntryHistoryPage requires valid token", async () => {
    repo.findQuizTokenByValue.mockResolvedValue(null);
    await expect(
      service.getEntryHistoryPage({
        token: "invalid_token",
        pageIndex: 1,
        pageSize: 10,
      }),
    ).rejects.toThrow();
  });

  it("getEntryHistoryPage works when token exhausted", async () => {
    repo.findQuizTokenByValue.mockResolvedValue({
      id: "token_2",
      status: "exhausted",
      usedCount: 1,
      expiresAt: null,
    });
    repo.listQuizzesByTokenId.mockResolvedValue([{ id: "quiz_1" }]);
    repo.listQuizHistoryByTokenId.mockResolvedValue({
      total: 1,
      list: [{ id: "result_1" }],
    });

    const result = await service.getEntryHistoryPage({
      token: "token_exhausted",
      pageIndex: 1,
      pageSize: 10,
    });

    expect(result.total).toBe(1);
    expect(repo.listQuizHistoryByTokenId).toHaveBeenCalledWith({
      tokenId: "token_2",
      search: undefined,
      pageIndex: 1,
      pageSize: 10,
    });
  });
});
