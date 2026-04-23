export const QUIZ_CATEGORY_CODES = [
  "personality",
  "emotion",
  "career",
  "wellbeing",
  "lifestyle",
  "fun",
] as const;

export type QuizCategoryCode = (typeof QUIZ_CATEGORY_CODES)[number];

export const DEFAULT_QUIZ_CATEGORY: QuizCategoryCode = "fun";

const LABELS: Record<QuizCategoryCode, string> = {
  personality: "性格人格",
  emotion: "情感关系",
  career: "职场成长",
  wellbeing: "身心状态",
  lifestyle: "生活方式",
  fun: "脑洞趣味",
};

export function isQuizCategory(value: string): value is QuizCategoryCode {
  return (QUIZ_CATEGORY_CODES as readonly string[]).includes(value);
}

export function normalizeQuizCategory(raw: unknown): QuizCategoryCode {
  if (typeof raw !== "string") return DEFAULT_QUIZ_CATEGORY;
  const trimmed = raw.trim();
  if (!trimmed) return DEFAULT_QUIZ_CATEGORY;
  return isQuizCategory(trimmed) ? trimmed : DEFAULT_QUIZ_CATEGORY;
}

export function labelForCategory(code: string): string {
  return isQuizCategory(code) ? LABELS[code] : LABELS[DEFAULT_QUIZ_CATEGORY];
}

export function quizCategoriesForSelect(): Array<{ code: QuizCategoryCode; label: string }> {
  return QUIZ_CATEGORY_CODES.map((code) => ({ code, label: LABELS[code] }));
}
