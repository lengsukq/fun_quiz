import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { AppError } from "@/lib/errors";
import { editQuiz, saveOutcomes, saveQuestions } from "@/server/services/quiz-service";
import { listQuizzes } from "@/server/repositories/quiz-repository";

type PythonQuizDefinition = {
  meta?: {
    name?: string;
    code?: string;
    quiz_type?: string;
    share_desc?: string;
    category?: string;
    result_config?: Record<string, unknown>;
    fallback_outcome_code?: string;
  };
  algo_config?: Record<string, unknown>;
  special_rules?: Array<Record<string, unknown>>;
  questions?: Array<Record<string, unknown>>;
  outcomes?: Array<Record<string, unknown>>;
};

type SeedSummary = {
  total: number;
  imported: number;
  skipped: number;
  failed: Array<{ file: string; reason: string }>;
};

function mapQuestionOptions(options: unknown) {
  if (!Array.isArray(options)) return [];
  return options.map((option) => {
    const row = (option ?? {}) as Record<string, unknown>;
    return {
      key: String(row.key ?? row.code ?? ""),
      label: String(row.label ?? ""),
      score: row.score !== undefined ? Number(row.score) : undefined,
      dimScores: (row.dim_scores ?? row.dimScores ?? {}) as Record<string, number>,
      nextQuestionSeq: row.next_question_seq !== undefined ? Number(row.next_question_seq) : row.nextQuestionSeq,
      outcomeCode: row.outcome_code ?? row.outcomeCode,
    };
  });
}

async function resolveQuizJsonDirWithFiles(): Promise<string> {
  const dir = path.join(process.cwd(), "seed", "quiz-generated");
  try {
    await access(dir);
  } catch {
    throw new Error("未找到仓库内目录 seed/quiz-generated（请将题库 JSON 放在该目录并纳入 Git 后再执行导入）");
  }
  const names = await readdir(dir);
  if (!names.some((item) => item.toLowerCase().endsWith(".json"))) {
    throw new Error("seed/quiz-generated 中没有任何 .json 文件，请先添加题库 JSON 后再导入");
  }
  return dir;
}

export async function seedQuizzesFromPythonGenerated(): Promise<SeedSummary> {
  const failed: Array<{ file: string; reason: string }> = [];
  let generatedDir: string;
  let generatedFiles: string[];
  try {
    generatedDir = await resolveQuizJsonDirWithFiles();
    generatedFiles = (await readdir(generatedDir))
      .filter((item) => item.toLowerCase().endsWith(".json"))
      .sort((a, b) => a.localeCompare(b));
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown error";
    throw new AppError(`题库导入失败：${reason}`, 500);
  }

  const existing = await listQuizzes();
  const quizCodeMap = new Map(existing.map((item) => [item.code.trim(), item.id]));
  let imported = 0;
  let skipped = 0;

  for (const fileName of generatedFiles) {
    try {
      const filePath = path.join(generatedDir, fileName);
      const raw = await readFile(filePath, "utf8");
      const payload = JSON.parse(raw) as PythonQuizDefinition;
      const code = String(payload.meta?.code ?? "").trim();

      if (!code) {
        skipped += 1;
        failed.push({ file: fileName, reason: "缺少 meta.code" });
        continue;
      }

      const saved = await editQuiz({
        id: quizCodeMap.get(code),
        name: payload.meta?.name ?? code,
        code,
        description: payload.meta?.share_desc ?? "",
        category: payload.meta?.category,
        quizType: payload.meta?.quiz_type ?? "score",
        status: "draft",
        algoConfig: payload.algo_config ?? {},
        specialRules: payload.special_rules ?? [],
        resultConfig: payload.meta?.result_config ?? {},
      });

      const fallbackCode = payload.meta?.fallback_outcome_code;
      const mappedQuestions = (payload.questions ?? []).map((item, index) => {
        const row = item as Record<string, unknown>;
        return {
          seq: Number(row.seq ?? index + 1),
          content: String(row.content ?? ""),
          isHidden: Boolean(row.is_hidden ?? row.isHidden ?? false),
          branchConfig: (row.branch_config ?? row.branchConfig ?? {}) as Record<string, unknown>,
          options: mapQuestionOptions(row.options),
        };
      });

      const mappedOutcomes = (payload.outcomes ?? []).map((item, index) => {
        const row = item as Record<string, unknown>;
        const outcomeCode = String(row.code ?? `outcome_${index + 1}`);
        const isFallback = Boolean(row.is_fallback ?? row.isFallback ?? false) || (fallbackCode ? fallbackCode === outcomeCode : false);
        const baseMatch = { ...((row.match_config ?? row.matchConfig ?? {}) as Record<string, unknown>) };
        const summary = row.summary;
        const detail = row.detail;
        if (typeof summary === "string" && summary.length > 0) {
          baseMatch.summary = summary;
        }
        if (typeof detail === "string" && detail.length > 0) {
          baseMatch.detail = detail;
        }
        const tagRow = row.tags;
        if (Array.isArray(tagRow) && tagRow.length > 0) {
          baseMatch.tags = tagRow.map((t) => String(t));
        }
        return {
          code: outcomeCode,
          name: String(row.name ?? `结果 ${index + 1}`),
          description: String(row.summary ?? row.detail ?? ""),
          matchConfig: baseMatch,
          isFallback,
          isSpecial: Boolean(row.is_special ?? row.isSpecial ?? false),
        };
      });

      await saveQuestions(saved.id, mappedQuestions);
      await saveOutcomes(saved.id, mappedOutcomes);
      imported += 1;
      quizCodeMap.set(code, saved.id);
    } catch (error) {
      skipped += 1;
      failed.push({
        file: fileName,
        reason: error instanceof Error ? error.message : "unknown error",
      });
    }
  }

  if (imported === 0 && failed.length > 0) {
    throw new AppError(`题库导入失败：${failed[0]?.reason ?? "未知错误"}`, 500);
  }

  return {
    total: generatedFiles.length,
    imported,
    skipped,
    failed,
  };
}
