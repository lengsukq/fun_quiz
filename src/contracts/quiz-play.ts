import { z } from "zod";

import { pageSchema } from "@/contracts/common";

export const quizEntryItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  category: z.string().default("fun"),
});

export const historyItemSchema = z.object({
  id: z.string(),
  quizId: z.string().optional(),
  outcomeCode: z.string().nullable().optional(),
  score: z.number().optional(),
  createdAt: z.string().optional(),
});

export const entryRequestSchema = z.object({
  token: z.string().min(1),
  search: z.string().optional(),
  category: z.string().optional(),
  pageIndex: z.number().int().default(1),
  pageSize: z.number().int().default(20),
});

export const entryQuizzesResponseSchema = pageSchema(quizEntryItemSchema);
export const entryHistoryResponseSchema = pageSchema(historyItemSchema);

export type EntryRequest = z.infer<typeof entryRequestSchema>;
