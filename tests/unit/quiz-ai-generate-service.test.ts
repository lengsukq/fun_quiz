import { afterEach, describe, expect, it, vi } from "vitest";

describe("generateQuizDefinitionFromAi", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("未配置 LLM_API_KEY 时拒绝生成", async () => {
    vi.stubEnv("LLM_API_KEY", "");
    vi.resetModules();
    const { generateQuizDefinitionFromAi } = await import("@/server/services/quiz-ai-generate-service");
    await expect(generateQuizDefinitionFromAi({ prompt: "随便写个测验" })).rejects.toThrow(/LLM/);
  });
});
