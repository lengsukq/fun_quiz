import { requireAuthWithPermission } from "@/lib/auth/guard";
import { PERM } from "@/lib/rbac/permission-codes";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { withApi } from "@/lib/http";
import { seedQuizzesFromPythonGenerated } from "@/server/bootstrap/quiz-seed";

export async function POST() {
  return withApi(async () => {
    const isProd = process.env.NODE_ENV === "production";
    if (isProd && env.BOOTSTRAP_ALLOW_IN_PROD !== "true") {
      throw new AppError("Quiz seed is disabled in production", 403);
    }

    await requireAuthWithPermission([PERM.quizPublish]);
    return seedQuizzesFromPythonGenerated();
  });
}
