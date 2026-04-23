import { and, desc, eq, ilike, inArray, lt, or, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  quizOutcomes,
  quizQuestions,
  quizResults,
  quizzes,
  quizTokenQuizzes,
  quizTokens,
} from "@/db/schema/core";

export async function listQuizzes() {
  return db.select().from(quizzes).orderBy(desc(quizzes.updatedAt));
}

export async function listPublishedQuizzes(input: {
  search?: string;
  category?: string;
  pageIndex: number;
  pageSize: number;
  allowedIds?: string[];
}) {
  const conditions = [eq(quizzes.status, "published")];
  if (input.search) {
    conditions.push(or(ilike(quizzes.name, `%${input.search}%`), ilike(quizzes.code, `%${input.search}%`))!);
  }
  if (input.category) {
    conditions.push(eq(quizzes.category, input.category));
  }
  if (input.allowedIds?.length) {
    conditions.push(inArray(quizzes.id, input.allowedIds));
  }
  const whereExpr = and(...conditions);
  const offset = Math.max(0, (input.pageIndex - 1) * input.pageSize);

  const list = await db
    .select()
    .from(quizzes)
    .where(whereExpr)
    .orderBy(desc(quizzes.updatedAt))
    .offset(offset)
    .limit(input.pageSize);
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(quizzes).where(whereExpr);
  return {
    total: count ?? 0,
    list,
  };
}

export async function findQuizById(quizId: string) {
  const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, quizId)).limit(1);
  return quiz ?? null;
}

export async function findQuizByCode(code: string) {
  const [quiz] = await db.select().from(quizzes).where(eq(quizzes.code, code)).limit(1);
  return quiz ?? null;
}

export async function saveQuiz(input: typeof quizzes.$inferInsert) {
  const exists = await findQuizById(input.id);
  if (exists) {
    await db.update(quizzes).set({ ...input, updatedAt: new Date() }).where(eq(quizzes.id, input.id));
    return;
  }
  await db.insert(quizzes).values(input);
}

export async function publishDraftQuizzes() {
  const rows = await db
    .update(quizzes)
    .set({
      status: "published",
      updatedAt: new Date(),
    })
    .where(eq(quizzes.status, "draft"))
    .returning({ id: quizzes.id });
  return rows.length;
}

export async function deleteQuiz(quizId: string) {
  await db.delete(quizQuestions).where(eq(quizQuestions.quizId, quizId));
  await db.delete(quizOutcomes).where(eq(quizOutcomes.quizId, quizId));
  await db.delete(quizTokenQuizzes).where(eq(quizTokenQuizzes.quizId, quizId));
  await db.delete(quizResults).where(eq(quizResults.quizId, quizId));
  await db.delete(quizzes).where(eq(quizzes.id, quizId));
}

export async function listQuizQuestions(quizId: string) {
  return db.select().from(quizQuestions).where(eq(quizQuestions.quizId, quizId));
}

export async function replaceQuizQuestions(quizId: string, rows: Array<typeof quizQuestions.$inferInsert>) {
  await db.delete(quizQuestions).where(eq(quizQuestions.quizId, quizId));
  if (rows.length) {
    await db.insert(quizQuestions).values(rows);
  }
}

export async function listQuizOutcomes(quizId: string) {
  return db.select().from(quizOutcomes).where(eq(quizOutcomes.quizId, quizId));
}

export async function replaceQuizOutcomes(quizId: string, rows: Array<typeof quizOutcomes.$inferInsert>) {
  await db.delete(quizOutcomes).where(eq(quizOutcomes.quizId, quizId));
  if (rows.length) {
    await db.insert(quizOutcomes).values(rows);
  }
}

export async function createQuizToken(row: typeof quizTokens.$inferInsert) {
  await db.insert(quizTokens).values(row);
}

export async function attachQuizIdsToToken(tokenId: string, quizIds: string[]) {
  await db.delete(quizTokenQuizzes).where(eq(quizTokenQuizzes.tokenId, tokenId));
  if (!quizIds.length) return;
  await db.insert(quizTokenQuizzes).values(
    quizIds.map((quizId) => ({
      id: `${tokenId}_${quizId}`,
      tokenId,
      quizId,
    })),
  );
}

export async function listQuizTokens() {
  return db.select().from(quizTokens).orderBy(desc(quizTokens.createdAt));
}

export async function findQuizTokenByValue(token: string) {
  const [row] = await db.select().from(quizTokens).where(eq(quizTokens.token, token)).limit(1);
  return row ?? null;
}

export async function listQuizzesByTokenId(tokenId: string) {
  const mapping = await db.select().from(quizTokenQuizzes).where(eq(quizTokenQuizzes.tokenId, tokenId));
  if (!mapping.length) return [];
  return db.select().from(quizzes).where(inArray(quizzes.id, mapping.map((item) => item.quizId)));
}

export async function listAllowedQuizIdsByTokenId(tokenId: string) {
  const mapping = await db.select().from(quizTokenQuizzes).where(eq(quizTokenQuizzes.tokenId, tokenId));
  return mapping.map((item) => item.quizId);
}

export async function createQuizResult(row: typeof quizResults.$inferInsert) {
  await db.insert(quizResults).values(row);
}

export async function createQuizResultWithTokenUsage(row: typeof quizResults.$inferInsert) {
  const [updated] = await db
    .update(quizTokens)
    .set({
      usedCount: sql`${quizTokens.usedCount} + 1`,
      status: sql`case when ${quizTokens.maxUses} is not null and (${quizTokens.usedCount} + 1) >= ${quizTokens.maxUses} then 'exhausted' else ${quizTokens.status} end`,
      updatedAt: new Date(),
    })
    .where(and(eq(quizTokens.id, row.tokenId), eq(quizTokens.status, "active"), or(sql`${quizTokens.maxUses} is null`, lt(quizTokens.usedCount, quizTokens.maxUses))))
    .returning();
  if (!updated) {
    return null;
  }

  await db.insert(quizResults).values(row);
  return updated;
}

export async function findQuizResultById(resultId: string) {
  const [row] = await db.select().from(quizResults).where(eq(quizResults.id, resultId)).limit(1);
  return row ?? null;
}

export async function listQuizResultsByTokenId(tokenId: string) {
  return db.select().from(quizResults).where(eq(quizResults.tokenId, tokenId)).orderBy(desc(quizResults.createdAt));
}

export async function listQuizHistoryByTokenId(input: {
  tokenId: string;
  search?: string;
  pageIndex: number;
  pageSize: number;
}) {
  const conditions = [eq(quizResults.tokenId, input.tokenId)];
  if (input.search) {
    conditions.push(or(ilike(quizResults.outcomeCode, `%${input.search}%`), ilike(quizResults.quizId, `%${input.search}%`))!);
  }
  const whereExpr = and(...conditions);
  const offset = Math.max(0, (input.pageIndex - 1) * input.pageSize);
  const list = await db
    .select()
    .from(quizResults)
    .where(whereExpr)
    .orderBy(desc(quizResults.createdAt))
    .offset(offset)
    .limit(input.pageSize);
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(quizResults).where(whereExpr);
  return {
    total: count ?? 0,
    list,
  };
}

export async function findOutcomeByCode(quizId: string, code: string) {
  const [row] = await db
    .select()
    .from(quizOutcomes)
    .where(and(eq(quizOutcomes.quizId, quizId), eq(quizOutcomes.code, code)))
    .limit(1);
  return row ?? null;
}

export async function updateQuizTokenUsage(tokenId: string) {
  const [updated] = await db
    .update(quizTokens)
    .set({
      usedCount: sql`${quizTokens.usedCount} + 1`,
      status: sql`case when ${quizTokens.maxUses} is not null and (${quizTokens.usedCount} + 1) >= ${quizTokens.maxUses} then 'exhausted' else ${quizTokens.status} end`,
      updatedAt: new Date(),
    })
    .where(and(eq(quizTokens.id, tokenId), eq(quizTokens.status, "active"), or(sql`${quizTokens.maxUses} is null`, lt(quizTokens.usedCount, quizTokens.maxUses))))
    .returning();
  return updated ?? null;
}

export async function updateQuizTokenStatus(tokenId: string, status: "active" | "exhausted" | "expired") {
  await db
    .update(quizTokens)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(eq(quizTokens.id, tokenId));
}
