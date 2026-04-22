import OpenAI from "openai";

import { AppError } from "@/lib/errors";
import { getDeepAnalysisLlmConfig } from "@/lib/llm-env";
import type { DeepAnalysisStyle } from "@/types/quiz-play";

export type DeepAnalysisQuestionRow = {
  seq: number;
  content: string;
  options: Array<Record<string, unknown>>;
};

const SYSTEM_PROMPT_BASE = `你是一位专业的测验结果解读助手。请仅根据用户提供的「测验信息、官方结果、各题题目与用户所选选项」进行分析，不要虚构题目或选项。使用简体中文。避免医疗诊断、法律建议或武断评判。

请按以下结构组织输出（用 Markdown 二级标题，每个标题下用简短段落与列表即可）：
## 选择倾向
## 可关注的点
## 轻量建议

总字数宜控制在 800 字以内。若提供的信息不足，可如实说明，仍基于已有内容给出解读。`;

const STYLE_INSTRUCTIONS: Record<DeepAnalysisStyle, string> = {
  humor: `【当前点评风格：幽默诙谐】
语气要轻松、风趣，可适当用生活化比喻、善意「吐槽」或轻段子感，让读者会心一笑，但保持尊重与底线：不低俗、不人身攻击、不阴阳怪气。幽默应服务于帮助用户理解自己，而不是取笑用户。`,

  warm: `【当前点评风格：温暖共情】
像信任的朋友在聊天：多倾听感、多肯定与理解，用柔和、支持性的措辞；可以点出小困扰，但避免说教与否定。强调「这很正常」「你已经很棒」等建设性共情，减轻压力感。`,

  rational: `【当前点评风格：理性客观】
语气平实、克制，以逻辑与事实为主：分点说明、避免煽情与夸张形容词。客观归纳选择背后的可能倾向与可执行的小调整，可适度分析利弊，不贴标签。`,
};

/** 供单测与对照不同风格下的系统提示。 */
export function buildDeepAnalysisSystemPrompt(style: DeepAnalysisStyle): string {
  return `${SYSTEM_PROMPT_BASE}\n\n${STYLE_INSTRUCTIONS[style]}`;
}

function getOptionKey(opt: Record<string, unknown>): string {
  return String(opt.key ?? opt.code ?? "");
}

function formatSelectedOption(matched: Record<string, unknown>, code: string): string {
  const fromLabel = String(
    matched.label ?? matched.text ?? matched.title ?? matched.name ?? "",
  ).trim();
  if (fromLabel) return fromLabel;
  return getOptionKey(matched) || code;
}

/**
 * 将已保存的 answers 与题目表对齐，生成可送入模型的逐题描述（可单测）。
 */
export function buildAnswerNarrativeLines(
  answers: Array<Record<string, unknown>>,
  questions: DeepAnalysisQuestionRow[],
): string[] {
  const bySeq = new Map(questions.map((q) => [q.seq, q]));
  const items = answers
    .map((a) => {
      const raw = a.questionSeq;
      const seq = typeof raw === "number" ? raw : Number(raw);
      return {
        seq: Number.isFinite(seq) && seq > 0 ? seq : 0,
        code: String(a.optionCode ?? "").trim(),
      };
    })
    .filter((a) => a.seq > 0 && a.code)
    .sort((a, b) => a.seq - b.seq);

  const lines: string[] = [];
  for (const { seq, code } of items) {
    const q = bySeq.get(seq);
    if (!q) {
      lines.push(
        `- 第 ${seq} 题：题目在系统中未找到；记录的选择代码：${code}（可能题目已调整）`,
      );
      continue;
    }
    const options = q.options;
    const matched = options.find((o) => getOptionKey(o) === code);
    const display = matched
      ? formatSelectedOption(matched, code)
      : `（未匹配到该选项的文案，代码：${code}）`;
    const questionLine = String(q.content ?? "").trim() || `（第 ${seq} 题，题干为空）`;
    lines.push(`- 第 ${seq} 题：${questionLine}\n  你的选择：${display}`);
  }
  return lines;
}

export function buildDeepAnalysisUserPrompt(input: {
  quizName: string;
  quizType: string;
  score: number;
  outcomeName: string | null;
  outcomeSummary: string | null;
  outcomeDetail: string | null;
  answerLines: string[];
}): string {
  const parts: string[] = [];
  parts.push(`测验名称：${input.quizName}`);
  parts.push(`测验类型：${input.quizType}`);
  parts.push(`系统给出的匹配度：${input.score}%`);
  if (input.outcomeName) parts.push(`系统判定的结果名称：${input.outcomeName}`);
  if (input.outcomeSummary) parts.push(`结果摘要：${input.outcomeSummary}`);
  if (input.outcomeDetail) parts.push(`结果说明：${input.outcomeDetail}`);

  parts.push("");
  parts.push("用户各题选择（以保存记录为准）：");
  if (input.answerLines.length) {
    parts.push(...input.answerLines);
  } else {
    parts.push("（无逐题选择记录，请仅根据上方结果做有限解读。）");
  }
  return parts.join("\n");
}

async function callCompatibleChatCompletions(
  userText: string,
  systemPrompt: string,
): Promise<string> {
  const cfg = getDeepAnalysisLlmConfig();
  if (!cfg) {
    throw new AppError("深度分析未配置：请设置环境变量 LLM_API_KEY", 503);
  }

  const client = new OpenAI({
    apiKey: cfg.apiKey,
    baseURL: cfg.baseURL,
  });

  const completion = await client.chat.completions.create({
    model: cfg.model,
    temperature: 0.65,
    max_tokens: 2_000,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userText },
    ],
  });
  const text = completion.choices[0]?.message?.content?.trim() ?? "";
  if (!text) {
    throw new AppError("深度分析未返回有效内容，请稍后再试", 500);
  }
  return text;
}

/**
 * 组装用户提示并调用大模型。集成测试可 mock 本模块。
 */
export async function requestQuizDeepAnalysis(input: {
  style: DeepAnalysisStyle;
  quizName: string;
  quizType: string;
  score: number;
  outcomeName: string | null;
  outcomeSummary: string | null;
  outcomeDetail: string | null;
  answers: Array<Record<string, unknown>>;
  questions: DeepAnalysisQuestionRow[];
}): Promise<{ analysis: string }> {
  const questionRows: DeepAnalysisQuestionRow[] = input.questions.map((q) => ({
    seq: q.seq,
    content: q.content,
    options: Array.isArray(q.options) ? q.options : [],
  }));
  const answerLines = buildAnswerNarrativeLines(input.answers, questionRows);
  const userPrompt = buildDeepAnalysisUserPrompt({
    quizName: input.quizName,
    quizType: input.quizType,
    score: input.score,
    outcomeName: input.outcomeName,
    outcomeSummary: input.outcomeSummary,
    outcomeDetail: input.outcomeDetail,
    answerLines,
  });
  const systemPrompt = buildDeepAnalysisSystemPrompt(input.style);
  const analysis = await callCompatibleChatCompletions(userPrompt, systemPrompt);
  return { analysis };
}
