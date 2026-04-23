import { randomUUID } from "node:crypto";

import { AppError } from "@/lib/errors";
import { isDeepAnalysisLlmConfigured } from "@/lib/llm-env";
import { createId } from "@/lib/id";
import { requestQuizDeepAnalysis } from "@/server/services/quiz-deep-analysis";
import { calculateQuizResult } from "@/server/services/quiz-algorithm-service";
import type { DeepAnalysisStyle, QuizFileRef, QuizResultView, QuizDeepAnalysisView } from "@/types/quiz-play";
import {
  attachQuizIdsToToken,
  createQuizResult,
  createQuizResultWithTokenUsage,
  createQuizToken,
  deleteQuiz,
  findOutcomeByCode,
  findQuizById,
  findQuizResultById,
  findQuizTokenByValue,
  listAllowedQuizIdsByTokenId,
  listPublishedQuizzes,
  listQuizHistoryByTokenId,
  listQuizResultsByTokenId,
  listQuizOutcomes,
  listQuizQuestions,
  listQuizzes,
  listQuizzesByTokenId,
  listQuizTokens,
  publishDraftQuizzes,
  replaceQuizOutcomes,
  replaceQuizQuestions,
  saveQuiz,
  updateQuizTokenStatus,
} from "@/server/repositories/quiz-repository";

type AnswerItem = {
  questionId?: string;
  questionSeq?: number;
  optionCode?: string;
  score?: number;
};

const DEMO_TOKEN_VALUE = "demo";
const DEMO_TOKEN_ID = "system_demo_token";

export async function pageQuizzes() {
  const rows = await listQuizzes();
  return {
    total: rows.length,
    list: rows,
  };
}

export async function editQuiz(input: Record<string, unknown>) {
  const id = String(input.id ?? createId());
  await saveQuiz({
    id,
    name: String(input.name ?? "未命名测验"),
    code: String(input.code ?? `quiz_${Date.now()}`),
    description: String(input.description ?? ""),
    quizType: String(input.quizType ?? "score"),
    status: String(input.status ?? "draft"),
    algoConfig: (input.algoConfig as Record<string, unknown>) ?? {},
    resultConfig: (input.resultConfig as Record<string, unknown>) ?? {},
    specialRules: (input.specialRules as Record<string, unknown>) ?? {},
    covers: Array.isArray(input.covers) ? (input.covers as Array<Record<string, unknown>>) : [],
  });
  return { id };
}

export async function detailQuiz(quizId: string) {
  const quiz = await findQuizById(quizId);
  if (!quiz) throw new AppError("Quiz not found", 404);
  return quiz;
}

export async function removeQuiz(quizId: string) {
  await deleteQuiz(quizId);
}

export async function publishAllDraftQuizzes() {
  const published = await publishDraftQuizzes();
  return { published };
}

export async function saveQuestions(quizId: string, questions: Array<Record<string, unknown>>) {
  await replaceQuizQuestions(
    quizId,
    questions.map((item, index) => ({
      id: String(item.id ?? createId()),
      quizId,
      seq: Number(item.seq ?? index + 1),
      content: String(item.content ?? ""),
      options: Array.isArray(item.options) ? (item.options as Array<Record<string, unknown>>) : [],
      branchConfig: (item.branchConfig as Record<string, unknown>) ?? {},
      isHidden: Boolean(item.isHidden ?? false),
    })),
  );
}

export async function saveOutcomes(quizId: string, outcomes: Array<Record<string, unknown>>) {
  await replaceQuizOutcomes(
    quizId,
    outcomes.map((item, index) => ({
      id: String(item.id ?? createId()),
      quizId,
      code: String(item.code ?? `outcome_${index + 1}`),
      name: String(item.name ?? `结果${index + 1}`),
      description: String(item.description ?? ""),
      matchConfig: (item.matchConfig as Record<string, unknown>) ?? {},
      isFallback: Boolean(item.isFallback ?? false),
      isSpecial: Boolean(item.isSpecial ?? false),
    })),
  );
}

export async function getQuestions(quizId: string) {
  return listQuizQuestions(quizId);
}

export async function getOutcomes(quizId: string) {
  return listQuizOutcomes(quizId);
}

export async function generateQuizToken(input: { maxUses?: number; batchCode?: string; expiresAt?: string; quizIds: string[] }) {
  const tokenId = createId();
  const tokenValue = randomUUID().replaceAll("-", "");
  await createQuizToken({
    id: tokenId,
    token: tokenValue,
    status: "active",
    maxUses: Number(input.maxUses ?? 1),
    usedCount: 0,
    batchCode: input.batchCode ?? null,
    expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    extra: {},
  });
  await attachQuizIdsToToken(tokenId, input.quizIds);
  return { tokenId, token: tokenValue };
}

export async function generateQuizTokens(input: {
  count?: number;
  maxUses?: number;
  batchCode?: string;
  expiresAt?: string;
  quizIds: string[];
}) {
  const count = Math.max(1, Number(input.count ?? 1));
  const tokens: string[] = [];
  const tokenIds: string[] = [];
  const batchCode = input.batchCode ?? `batch_${Date.now()}`;
  for (let i = 0; i < count; i += 1) {
    const generated = await generateQuizToken({
      maxUses: input.maxUses,
      batchCode,
      expiresAt: input.expiresAt,
      quizIds: input.quizIds,
    });
    tokens.push(generated.token);
    tokenIds.push(generated.tokenId);
  }
  return {
    batchCode,
    count,
    tokens,
    tokenIds,
  };
}

export async function pageQuizTokens(input?: { search?: string; pageIndex?: number; pageSize?: number }) {
  const rows = await listQuizTokens();
  const filtered = input?.search
    ? rows.filter((item) => item.token.includes(input.search!) || (item.batchCode ?? "").includes(input.search!))
    : rows;
  const pageIndex = input?.pageIndex ?? 1;
  const pageSize = input?.pageSize ?? 20;
  const offset = (pageIndex - 1) * pageSize;
  return {
    total: filtered.length,
    list: filtered.slice(offset, offset + pageSize),
  };
}

export async function updateTokenQuizIds(tokenId: string, quizIds: string[]) {
  await attachQuizIdsToToken(tokenId, quizIds);
}

export async function getQuizTokenDetail(tokenValue: string) {
  const tokenRow = await findQuizTokenByValue(tokenValue);
  if (!tokenRow) throw new AppError("Token not found", 404);
  const quizList = await listQuizzesByTokenId(tokenRow.id);
  return {
    ...tokenRow,
    quizIds: quizList.map((item) => item.id),
    quizList,
  };
}

async function getTokenByValueOrThrow(tokenValue: string) {
  if (tokenValue.trim().toLowerCase() === DEMO_TOKEN_VALUE) {
    const demoToken = await findQuizTokenByValue(DEMO_TOKEN_VALUE);
    if (demoToken) {
      if (demoToken.status !== "active") {
        await updateQuizTokenStatus(demoToken.id, "active");
        return {
          ...demoToken,
          status: "active",
        };
      }
      return demoToken;
    }

    await createQuizToken({
      id: DEMO_TOKEN_ID,
      token: DEMO_TOKEN_VALUE,
      status: "active",
      maxUses: 1,
      usedCount: 0,
      batchCode: "system_demo",
      expiresAt: null,
      extra: { mode: "demo_unlimited" },
    }).catch(() => undefined);
    const createdDemoToken = await findQuizTokenByValue(DEMO_TOKEN_VALUE);
    if (!createdDemoToken) {
      throw new AppError("Unable to initialize demo token", 500);
    }
    return createdDemoToken;
  }

  const tokenRow = await findQuizTokenByValue(tokenValue);
  if (!tokenRow) throw new AppError("Invalid token", 400);
  if (tokenRow.expiresAt && tokenRow.expiresAt.getTime() < Date.now()) {
    await updateQuizTokenStatus(tokenRow.id, "expired");
    return {
      ...tokenRow,
      status: "expired",
    };
  }
  return tokenRow;
}

function ensureTokenCanPlay(tokenRow: Awaited<ReturnType<typeof getTokenByValueOrThrow>>) {
  if (tokenRow.status === "expired") {
    throw new AppError("Token expired", 400);
  }
  if (tokenRow.status === "exhausted") {
    throw new AppError("Token exhausted", 400);
  }
  if (tokenRow.status !== "active") {
    throw new AppError("Invalid token", 400);
  }
}

export async function quizEntry(tokenValue: string) {
  const tokenRow = await getTokenByValueOrThrow(tokenValue);
  const availableQuizzes = await listQuizzesByTokenId(tokenRow.id);
  return {
    token: tokenRow,
    quizzes: availableQuizzes,
  };
}

export async function quizPlay(tokenValue: string, quizId: string) {
  const entry = await quizEntry(tokenValue);
  ensureTokenCanPlay(entry.token);
  const allowedQuizIds = await listAllowedQuizIdsByTokenId(entry.token.id);
  if (allowedQuizIds.length && !allowedQuizIds.includes(quizId)) {
    throw new AppError("This token cannot access this quiz", 403);
  }
  const quiz = await findQuizById(quizId);
  if (!quiz || quiz.status !== "published") throw new AppError("Quiz not available", 404);
  const questions = await listQuizQuestions(quizId);
  return {
    quiz,
    questions,
  };
}

export async function getEntryHistory(tokenValue: string) {
  const entry = await quizEntry(tokenValue);
  return listQuizResultsByTokenId(entry.token.id);
}

export async function submitQuiz(input: { token: string; quizId: string; answers: AnswerItem[] }) {
  const entry = await quizEntry(input.token);
  ensureTokenCanPlay(entry.token);
  const allowedQuizIds = await listAllowedQuizIdsByTokenId(entry.token.id);
  if (allowedQuizIds.length && !allowedQuizIds.includes(input.quizId)) {
    throw new AppError("This token cannot access this quiz", 403);
  }
  const quiz = await findQuizById(input.quizId);
  if (!quiz || quiz.status !== "published") {
    throw new AppError("Quiz not available", 404);
  }
  const questions = await listQuizQuestions(input.quizId);
  const outcomes = await listQuizOutcomes(input.quizId);
  const answersMap: Record<string, string> = {};
  for (const answer of input.answers) {
    if (answer.questionSeq !== undefined && answer.optionCode) {
      answersMap[String(answer.questionSeq)] = answer.optionCode;
    }
  }
  const calc = calculateQuizResult({
    quizType: quiz.quizType,
    answers: answersMap,
    questions: questions.map((item) => ({
      seq: item.seq,
      isHidden: item.isHidden,
      options: (item.options as Array<Record<string, unknown>>).map((opt) => ({
        // 与 Python / 题面 JSON 一致：多数字段为 code 或仅填其一；无 key 时必须回退到 code 否则匹配度恒为 0
        key: String(opt.key ?? opt.code ?? ""),
        score: Number(opt.score ?? 0),
        nextQuestionSeq: opt.nextQuestionSeq !== undefined ? Number(opt.nextQuestionSeq) : undefined,
        outcomeCode: opt.outcomeCode ? String(opt.outcomeCode) : undefined,
        dimScores: ((opt.dim_scores ?? opt.dimScores) as Record<string, number>) ?? {},
      })),
    })),
    outcomes: outcomes.map((item) => ({
      code: item.code,
      isSpecial: item.isSpecial,
      isFallback: item.isFallback,
      matchConfig: item.matchConfig as Record<string, unknown>,
    })),
    algoConfig: quiz.algoConfig as Record<string, unknown>,
    specialRules: Array.isArray(quiz.specialRules) ? (quiz.specialRules as Array<Record<string, unknown>>) : [],
  });

  const outcomeCode = calc.outcomeCode;
  const outcome = outcomeCode ? await findOutcomeByCode(input.quizId, outcomeCode) : null;
  if (!outcome) {
    throw new AppError("Outcome not found for result", 500);
  }
  const resultId = createId();
  const resultPayload = {
    id: resultId,
    tokenId: entry.token.id,
    quizId: input.quizId,
    answers: input.answers as Array<Record<string, unknown>>,
    calcResult: calc.calcResult,
    outcomeCode: outcomeCode ?? null,
    outcomeId: outcome?.id ?? null,
    score: Number(calc.score ?? 0),
    shareImage: null,
  };
  if (entry.token.token === DEMO_TOKEN_VALUE) {
    await createQuizResult(resultPayload);
    return { resultId };
  }

  const consumed = await createQuizResultWithTokenUsage(resultPayload);
  if (!consumed) {
    throw new AppError("Token exhausted", 400);
  }
  return { resultId };
}

function parseStringFromMatchConfig(
  config: Record<string, unknown> | null | undefined,
  key: string,
): string | null {
  const v = config?.[key];
  return typeof v === "string" ? v : null;
}

function resolveOutcomeNarrative(outcome: { description: string | null; matchConfig: unknown } | null): {
  outcomeSummary: string | null;
  outcomeDetail: string | null;
} {
  if (!outcome) {
    return { outcomeSummary: null, outcomeDetail: null };
  }
  const matchConfig = (outcome.matchConfig as Record<string, unknown>) ?? {};
  const fromSummary = parseStringFromMatchConfig(matchConfig, "summary");
  const fromDetail = parseStringFromMatchConfig(matchConfig, "detail");
  if (fromSummary !== null || fromDetail !== null) {
    return { outcomeSummary: fromSummary, outcomeDetail: fromDetail };
  }
  const text = (outcome.description ?? "").trim();
  if (!text) {
    return { outcomeSummary: null, outcomeDetail: null };
  }
  const splitAt = text.indexOf("\n\n");
  if (splitAt > 0) {
    return {
      outcomeSummary: text.slice(0, splitAt).trim() || null,
      outcomeDetail: text.slice(splitAt + 2).trim() || null,
    };
  }
  return { outcomeSummary: null, outcomeDetail: text };
}

function resolveOutcomeTags(matchConfig: unknown): string[] {
  const tags = (matchConfig as Record<string, unknown> | null)?.tags;
  if (!Array.isArray(tags)) return [];
  return tags.filter((t): t is string => typeof t === "string");
}

function toFileRefFromUrl(maybe: string | null | undefined): QuizFileRef {
  if (!maybe || !String(maybe).trim()) return null;
  return { url: String(maybe).trim() };
}

export async function getQuizResult(tokenValue: string, resultId: string): Promise<QuizResultView> {
  const entry = await quizEntry(tokenValue);
  const result = await findQuizResultById(resultId);
  if (!result || result.tokenId !== entry.token.id) throw new AppError("Result not found or forbidden", 404);
  const quiz = await findQuizById(result.quizId);
  if (!quiz) throw new AppError("Quiz not found", 404);
  const outcome = result.outcomeCode ? await findOutcomeByCode(result.quizId, result.outcomeCode) : null;
  const { outcomeSummary, outcomeDetail } = resolveOutcomeNarrative(outcome);
  const outcomeTags = outcome ? resolveOutcomeTags(outcome.matchConfig) : [];
  const matchConfig = (outcome?.matchConfig as Record<string, unknown>) ?? {};
  const avatarUrl = parseStringFromMatchConfig(matchConfig, "avatarUrl");
  return {
    resultId: result.id,
    quizId: result.quizId,
    quizName: quiz.name,
    quizType: quiz.quizType,
    outcomeCode: result.outcomeCode,
    outcomeName: outcome?.name ?? null,
    score: result.score,
    outcomeSummary,
    outcomeDetail,
    outcomeTags,
    outcomeAvatar: toFileRefFromUrl(avatarUrl),
    shareImage: toFileRefFromUrl(result.shareImage),
    resultConfig: quiz.resultConfig,
    calcResult: result.calcResult,
    deepAnalysisAvailable: isDeepAnalysisLlmConfigured(),
  };
}

export async function analyzeQuizResultDeep(
  tokenValue: string,
  resultId: string,
  style: DeepAnalysisStyle,
): Promise<QuizDeepAnalysisView> {
  const entry = await quizEntry(tokenValue);
  const result = await findQuizResultById(resultId);
  if (!result || result.tokenId !== entry.token.id) {
    throw new AppError("Result not found or forbidden", 404);
  }
  const quiz = await findQuizById(result.quizId);
  if (!quiz) throw new AppError("Quiz not found", 404);
  const outcome = result.outcomeCode ? await findOutcomeByCode(result.quizId, result.outcomeCode) : null;
  const { outcomeSummary, outcomeDetail } = resolveOutcomeNarrative(outcome);
  const questions = await listQuizQuestions(result.quizId);
  return requestQuizDeepAnalysis({
    style,
    quizName: quiz.name,
    quizType: quiz.quizType,
    score: result.score,
    outcomeName: outcome?.name ?? null,
    outcomeSummary,
    outcomeDetail,
    answers: result.answers,
    questions: questions.map((item) => ({
      seq: item.seq,
      content: item.content,
      options: (item.options as Array<Record<string, unknown>>) ?? [],
    })),
  });
}

export async function getEntryQuizzes(input: {
  token: string;
  search?: string;
  pageIndex: number;
  pageSize: number;
}) {
  const entry = await quizEntry(input.token);
  const allowedQuizIds = await listAllowedQuizIdsByTokenId(entry.token.id);
  return listPublishedQuizzes({
    search: input.search,
    pageIndex: input.pageIndex,
    pageSize: input.pageSize,
    allowedIds: allowedQuizIds.length ? allowedQuizIds : undefined,
  });
}

export async function getEntryHistoryPage(input: {
  token: string;
  search?: string;
  pageIndex: number;
  pageSize: number;
}) {
  const entry = await quizEntry(input.token);
  return listQuizHistoryByTokenId({
    tokenId: entry.token.id,
    search: input.search,
    pageIndex: input.pageIndex,
    pageSize: input.pageSize,
  });
}
