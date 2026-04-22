const trim = (s: string | undefined): string => (s == null ? "" : String(s).trim());

/**
 * 深度分析：使用 **OpenAI 兼容** Chat Completions 协议，环境变量仅认 `LLM_*`（见
 * `LLM_API_KEY`、可选 `LLM_BASE_URL` / `LLM_MODEL`）。
 */
export function getDeepAnalysisLlmConfig():
    | {
      apiKey: string;
      model: string;
      baseURL: string | undefined;
    }
  | null {
  const apiKey = trim(process.env.LLM_API_KEY);
  if (!apiKey) return null;
  const model = trim(process.env.LLM_MODEL) || "gpt-4o-mini";
  const baseURL = trim(process.env.LLM_BASE_URL) || undefined;
  return {
    apiKey,
    model,
    baseURL: baseURL && baseURL.length > 0 ? baseURL : undefined,
  };
}

export function isDeepAnalysisLlmConfigured(): boolean {
  return getDeepAnalysisLlmConfig() !== null;
}
