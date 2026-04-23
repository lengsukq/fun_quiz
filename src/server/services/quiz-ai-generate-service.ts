import OpenAI from "openai";

import { type QuizAiLlmEnvelope, quizAiLlmEnvelopeSchema } from "@/contracts/quiz-ai-definition";
import { AppError } from "@/lib/errors";
import { getDeepAnalysisLlmConfig } from "@/lib/llm-env";

function buildSystemPrompt(quizType: string): string {
  return `你是「趣味测验」数据结构生成器，只输出合法 JSON，不要 Markdown、不要代码围栏。
根对象必须严格为：{"definition":{"quiz":{},"questions":[],"outcomes":[]}}。

【definition.quiz】至少包含：
- name（字符串）、code（英文/数字/下划线，唯一感）、quizType（必须为 "${quizType}"）
- status 建议为 "draft"
- description（字符串，可短）
- algoConfig（对象，按题型给合理默认值）
- specialRules（数组，可为空数组）
- resultConfig（对象，可为 {}）
- covers（数组，可为 []）

题型说明：
- score：选项可含 score 数字；结果 matchConfig 可含分数区间，需有 isFallback 为 true 的兜底结果
- vector：algoConfig 含 dimensions（若干 { code, sort_order }）；选项可含 dimScores 对象；结果 matchConfig 可含 dim_vector 数组
- branch：选项含 nextQuestionSeq（下一题序号，-1 表示结束并需 outcomeCode 指向结果 code）；第一题 seq 为 1
- random：结果 matchConfig 可含 weight 正数

【definition.questions】每项含：seq（从 1 递增）、content（题干）、options（数组）、branchConfig（对象，可 {}）、isHidden（布尔，默认 false）。
选项元素含：key 或 code（选项标识）、label 或 text（展示文案）；score 题型用 score 数字；vector 用 dimScores 对象；branch 用 nextQuestionSeq 与 outcomeCode。

【definition.outcomes】每项含：code、name、description（可空串）、matchConfig（对象）、isFallback（布尔）、isSpecial（布尔，默认 false）。

务必包含至少一个 isFallback 为 true 的结果。题目与选项数量与用户需求一致，内容用简体中文。`;
}

function parseLlmJson(content: string | null | undefined): unknown {
  if (content == null || !String(content).trim()) {
    throw new AppError("模型未返回内容", 502);
  }
  const trimmed = String(content).trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    throw new AppError("模型返回非合法 JSON", 502);
  }
}

export async function generateQuizDefinitionFromAi(input: {
  prompt: string;
  quizType?: "score" | "vector" | "branch" | "random";
}): Promise<QuizAiLlmEnvelope> {
  const config = getDeepAnalysisLlmConfig();
  if (!config) {
    throw new AppError("LLM 未配置：请设置环境变量 LLM_API_KEY", 400);
  }

  const quizType = input.quizType ?? "score";
  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  });

  let content: string | null | undefined;
  try {
    const completion = await client.chat.completions.create({
      model: config.model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildSystemPrompt(quizType) },
        {
          role: "user",
          content: `用户需求如下，请生成完整 definition：\n${input.prompt}`,
        },
      ],
    });
    content = completion.choices[0]?.message?.content ?? undefined;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "LLM 请求失败";
    throw new AppError(msg, 502);
  }

  const raw = parseLlmJson(content);
  const parsed = quizAiLlmEnvelopeSchema.safeParse(raw);
  if (!parsed.success) {
    throw new AppError(`模型 JSON 不符合契约：${parsed.error.message}`, 422);
  }
  const q = parsed.data.definition.quiz;
  if (String(q.quizType ?? quizType) !== quizType) {
    q.quizType = quizType;
  }
  return parsed.data;
}
