/** 玩家端 `/api/quiz_play/result` 返回结构，与 Python 侧 QuizResultData 对齐 */
export type QuizFileRef = { url: string } | null;

/** 深度分析点评风格（与 `/api/quiz_play/result/analyze` 的 `style` 一致） */
export const DEEP_ANALYSIS_STYLES = [
  { id: "humor" as const, label: "幽默诙谐", hint: "轻松比喻、善意玩梗" },
  { id: "warm" as const, label: "温暖共情", hint: "像朋友般倾听与鼓励" },
  { id: "rational" as const, label: "理性客观", hint: "分点归纳、就事论事" },
] as const;

export type DeepAnalysisStyle = (typeof DEEP_ANALYSIS_STYLES)[number]["id"];

export type QuizResultView = {
  resultId: string;
  quizId: string;
  quizName: string;
  quizType: string;
  outcomeCode: string | null;
  outcomeName: string | null;
  score: number;
  outcomeSummary: string | null;
  outcomeDetail: string | null;
  outcomeTags: string[];
  outcomeAvatar: QuizFileRef;
  shareImage: QuizFileRef;
  resultConfig: Record<string, unknown>;
  calcResult: Record<string, unknown>;
  /** 是否已配置 LLM_API_KEY */
  deepAnalysisAvailable: boolean;
};

/** 玩家端 `/api/quiz_play/result/analyze` 深度分析 */
export type QuizDeepAnalysisView = { analysis: string };
