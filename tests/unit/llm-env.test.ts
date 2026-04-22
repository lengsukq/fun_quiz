import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getDeepAnalysisLlmConfig, isDeepAnalysisLlmConfigured } from "@/lib/llm-env";

const LLM_ENV_KEYS = ["LLM_API_KEY", "LLM_BASE_URL", "LLM_MODEL"] as const;

describe("llm-env (deep analysis)", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    for (const k of LLM_ENV_KEYS) {
      vi.stubEnv(k, "");
    }
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns null when no API key is set", () => {
    expect(getDeepAnalysisLlmConfig()).toBeNull();
    expect(isDeepAnalysisLlmConfigured()).toBe(false);
  });

  it("reads LLM_API_KEY, LLM_BASE_URL, and LLM_MODEL", () => {
    vi.stubEnv("LLM_API_KEY", "k-llm");
    vi.stubEnv("LLM_BASE_URL", "https://llm.example/v1");
    vi.stubEnv("LLM_MODEL", "qwen-turbo");

    const c = getDeepAnalysisLlmConfig()!;
    expect(c.apiKey).toBe("k-llm");
    expect(c.baseURL).toBe("https://llm.example/v1");
    expect(c.model).toBe("qwen-turbo");
  });

  it("default model gpt-4o-mini when LLM_MODEL is unset", () => {
    vi.stubEnv("LLM_API_KEY", "k");
    expect(getDeepAnalysisLlmConfig()!.model).toBe("gpt-4o-mini");
  });
});
