import { z } from "zod";

import { requireAuthWithPermission } from "@/lib/auth/guard";
import { PERM } from "@/lib/rbac/permission-codes";
import { withApi } from "@/lib/http";
import { parseJsonBody } from "@/lib/request";
import { generateQuizTokens } from "@/server/services/quiz-service";

const schema = z.object({
  count: z.number().int().default(1),
  maxUses: z.number().int().default(1),
  batchCode: z.string().optional(),
  expiresAt: z.string().optional(),
  quizIds: z.array(z.string()).default([]),
});

export async function POST(request: Request) {
  return withApi(async () => {
    await requireAuthWithPermission([PERM.quizToken]);
    const body = await parseJsonBody(request, schema);
    return generateQuizTokens(body);
  });
}
