import { requireAuthWithPermission } from "@/lib/auth/guard";
import { PERM } from "@/lib/rbac/permission-codes";
import { withApi } from "@/lib/http";
import { publishAllDraftQuizzes } from "@/server/services/quiz-service";

export async function POST() {
  return withApi(async () => {
    await requireAuthWithPermission([PERM.quizPublish]);
    return publishAllDraftQuizzes();
  });
}
