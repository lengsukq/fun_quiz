type QuestionOption = {
  key?: string;
  /** 与 Python/旧 JSON 的 code 一致；无 key 时与提交上来的 option 对齐用 */
  code?: string;
  score?: number;
  nextQuestionSeq?: number;
  outcomeCode?: string;
  dimScores?: Record<string, number>;
};

type Question = {
  seq: number;
  isHidden?: boolean;
  options: QuestionOption[];
};

type Outcome = {
  code: string;
  isSpecial?: boolean;
  isFallback?: boolean;
  matchConfig?: Record<string, unknown>;
};

type CalcInput = {
  quizType: string;
  answers: Record<string, string>;
  questions: Question[];
  outcomes: Outcome[];
  algoConfig: Record<string, unknown>;
  specialRules: Array<Record<string, unknown>>;
};

type CalcResult = {
  outcomeCode: string;
  score: number | null;
  calcResult: Record<string, unknown>;
};

function findFallback(outcomes: Outcome[]) {
  return outcomes.find((item) => Boolean(item.isFallback));
}

function checkSpecialRules(answers: Record<string, string>, specialRules: Array<Record<string, unknown>>) {
  for (const rule of specialRules) {
    if (rule.condition_type !== "option_selected") continue;
    const questionSeq = String(rule.question_seq ?? "");
    const optionKey = String(rule.option_key ?? "");
    if (answers[questionSeq] === optionKey) {
      return String(rule.trigger_outcome_code ?? "");
    }
  }
  return null;
}

function calculateScoreMode(input: CalcInput): CalcResult {
  let totalScore = 0;
  for (const question of input.questions) {
    if (question.isHidden) continue;
    const selected = answersToOption(input.answers, question);
    if (selected) {
      totalScore += Number(selected.score ?? 0);
    }
  }
  const normalOutcomes = input.outcomes.filter((item) => !item.isSpecial && !item.isFallback);
  const matched = normalOutcomes.find((item) => {
    const min = Number(item.matchConfig?.score_min ?? Number.NEGATIVE_INFINITY);
    const max = Number(item.matchConfig?.score_max ?? Number.POSITIVE_INFINITY);
    return totalScore >= min && totalScore <= max;
  });
  const fallback = findFallback(input.outcomes);
  const outcomeCode = matched?.code ?? fallback?.code;
  if (!outcomeCode) {
    throw new Error("score mode has no matched outcome");
  }
  const totalMax = Number(input.algoConfig.total_max ?? 100);
  const scorePct = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;
  return {
    outcomeCode,
    score: scorePct,
    calcResult: { totalScore },
  };
}

function calculateVectorMode(input: CalcInput): CalcResult {
  const dimensions = Array.isArray(input.algoConfig.dimensions) ? input.algoConfig.dimensions : [];
  const dimCodes = dimensions
    .slice()
    .sort((a, b) => Number(a?.sort_order ?? 0) - Number(b?.sort_order ?? 0))
    .map((item) => String(item?.code ?? ""));
  const dimScores: Record<string, number> = {};
  for (const code of dimCodes) dimScores[code] = 0;

  for (const question of input.questions) {
    if (question.isHidden) continue;
    const selected = answersToOption(input.answers, question);
    if (!selected?.dimScores) continue;
    for (const [code, value] of Object.entries(selected.dimScores)) {
      if (code in dimScores) {
        dimScores[code] += Number(value ?? 0);
      }
    }
  }

  const archive = (raw: number) => {
    if (raw <= 3) return 1;
    if (raw === 4) return 2;
    return 3;
  };
  const userVector = dimCodes.map((code) => archive(dimScores[code] ?? 2));
  const normalOutcomes = input.outcomes.filter((item) => !item.isSpecial && !item.isFallback);
  let best: Outcome | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;
  let bestHits = -1;
  const maxDistance = userVector.length * 2;

  for (const outcome of normalOutcomes) {
    const targetVectorRaw = outcome.matchConfig?.dim_vector;
    if (!Array.isArray(targetVectorRaw) || targetVectorRaw.length !== userVector.length) continue;
    const targetVector = targetVectorRaw.map((value) => Number(value ?? 2));
    const distance = userVector.reduce((acc, item, index) => acc + Math.abs(item - targetVector[index]), 0);
    const hits = userVector.reduce((acc, item, index) => acc + (item === targetVector[index] ? 1 : 0), 0);
    if (distance < bestDistance || (distance === bestDistance && hits > bestHits)) {
      bestDistance = distance;
      bestHits = hits;
      best = outcome;
    }
  }

  const similarity = maxDistance > 0 ? Math.round((1 - bestDistance / maxDistance) * 100) : 100;
  const threshold = Number(input.algoConfig.similarity_threshold ?? 60);
  const fallback = findFallback(input.outcomes);
  const outcomeCode = similarity < threshold ? fallback?.code : best?.code ?? fallback?.code;
  if (!outcomeCode) {
    throw new Error("vector mode has no matched outcome");
  }
  return {
    outcomeCode,
    score: similarity,
    calcResult: { dimScores, dimVector: userVector },
  };
}

function calculateBranchMode(input: CalcInput): CalcResult {
  const questionMap = new Map<number, Question>();
  for (const item of input.questions) {
    questionMap.set(item.seq, item);
  }
  let currentSeq = 1;
  const path: number[] = [currentSeq];
  let outcomeCode: string | null = null;
  const maxSteps = input.questions.length + 5;

  for (let step = 0; step < maxSteps; step += 1) {
    const question = questionMap.get(currentSeq);
    if (!question) break;
    const selected = answersToOption(input.answers, question);
    if (!selected) break;
    const nextSeq = Number(selected.nextQuestionSeq ?? 0);
    if (nextSeq === -1) {
      outcomeCode = selected.outcomeCode ?? null;
      break;
    }
    currentSeq = nextSeq;
    path.push(currentSeq);
  }

  if (!outcomeCode) {
    outcomeCode = findFallback(input.outcomes)?.code ?? null;
  }
  if (!outcomeCode) {
    throw new Error("branch mode has no matched outcome");
  }
  return {
    outcomeCode,
    score: null,
    calcResult: { path },
  };
}

function calculateRandomMode(input: CalcInput): CalcResult {
  const normalOutcomes = input.outcomes.filter((item) => !item.isSpecial && !item.isFallback);
  if (!normalOutcomes.length) {
    throw new Error("random mode has no outcomes");
  }
  const weighted: Array<{ outcome: Outcome; weight: number }> = normalOutcomes.map((item) => ({
    outcome: item,
    weight: Number(item.matchConfig?.weight ?? 1),
  }));
  const total = weighted.reduce((acc, item) => acc + item.weight, 0);
  let cursor = Math.random() * (total || 1);
  let selected = weighted[0]?.outcome;
  for (const item of weighted) {
    cursor -= item.weight;
    if (cursor <= 0) {
      selected = item.outcome;
      break;
    }
  }
  return {
    outcomeCode: selected?.code ?? findFallback(input.outcomes)?.code ?? "",
    score: null,
    calcResult: {},
  };
}

function answersToOption(answers: Record<string, string>, question: Question): QuestionOption | null {
  const answerKey = answers[String(question.seq)];
  if (!answerKey) return null;
  return (
    question.options.find((item) => {
      if (item.key === answerKey) return true;
      if (item.code != null && String(item.code) === answerKey) return true;
      return false;
    }) ?? null
  );
}

export function calculateQuizResult(input: CalcInput): CalcResult {
  const specialOutcomeCode = checkSpecialRules(input.answers, input.specialRules);
  if (specialOutcomeCode && input.outcomes.some((item) => item.code === specialOutcomeCode)) {
    return {
      outcomeCode: specialOutcomeCode,
      score: null,
      calcResult: { triggeredBy: "special_rule" },
    };
  }

  if (input.quizType === "vector") return calculateVectorMode(input);
  if (input.quizType === "branch") return calculateBranchMode(input);
  if (input.quizType === "random") return calculateRandomMode(input);
  return calculateScoreMode(input);
}
