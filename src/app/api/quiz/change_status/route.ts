import { z } from "zod";

import { requireAuthWithPermission } from "@/lib/auth/guard";
import { PERM } from "@/lib/rbac/permission-codes";
import { withApi } from "@/lib/http";
import { parseJsonBody } from "@/lib/request";
import { detailQuiz, editQuiz } from "@/server/services/quiz-service";

const schema = z.object({
  quizId: z.string().min(1),
  status: z.string().min(1),
});

export async function POST(request: Request) {
  return withApi(async () => {
    await requireAuthWithPermission([PERM.quizPublish]);
    const body = await parseJsonBody(request, schema);
    const current = await detailQuiz(body.quizId);
    await editQuiz({
      ...current,
      id: body.quizId,
      status: body.status,
    });
    return { success: true };
  });
}
