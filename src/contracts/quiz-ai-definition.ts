import { z } from "zod";

/** 与 `POST /api/quiz/import` 请求体中的 definition 结构一致 */
export const quizImportDefinitionSchema = z.object({
  quiz: z.record(z.string(), z.unknown()),
  questions: z.array(z.record(z.string(), z.unknown())).default([]),
  outcomes: z.array(z.record(z.string(), z.unknown())).default([]),
});

/** LLM 必须返回的根结构（便于 `response_format: json_object` 约束） */
export const quizAiLlmEnvelopeSchema = z.object({
  definition: quizImportDefinitionSchema,
});

export type QuizImportDefinition = z.infer<typeof quizImportDefinitionSchema>;

export type QuizAiLlmEnvelope = z.infer<typeof quizAiLlmEnvelopeSchema>;
