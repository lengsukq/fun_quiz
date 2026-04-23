import { eq } from "drizzle-orm";

import { db } from "@/db";
import { quizResults } from "@/db/schema/core";
import { requireAuthWithPermission } from "@/lib/auth/guard";
import { PERM } from "@/lib/rbac/permission-codes";
import { withApi } from "@/lib/http";

type Props = {
  params: Promise<{ quizId: string }>;
};

export async function POST(_: Request, props: Props) {
  return withApi(async () => {
    await requireAuthWithPermission([PERM.quizRead]);
    const { quizId } = await props.params;
    const rows = await db.select().from(quizResults).where(eq(quizResults.quizId, quizId));
    const outcomeDistribution: Record<string, number> = {};
    for (const row of rows) {
      const key = row.outcomeCode ?? "UNKNOWN";
      outcomeDistribution[key] = (outcomeDistribution[key] ?? 0) + 1;
    }
    return {
      total_tokens: 0,
      used_tokens: rows.length,
      outcome_distribution: Object.entries(outcomeDistribution).map(([outcome_code, count]) => ({
        outcome_code,
        count,
      })),
    };
  });
}
