import { z } from "zod";

import { quizImportDefinitionSchema } from "@/contracts/quiz-ai-definition";
import { requireAuthWithPermission } from "@/lib/auth/guard";
import { PERM } from "@/lib/rbac/permission-codes";
import { withApi } from "@/lib/http";
import { parseJsonBody } from "@/lib/request";
import { editQuiz, saveOutcomes, saveQuestions } from "@/server/services/quiz-service";

const schema = z.object({
  definition: quizImportDefinitionSchema,
});

export async function POST(request: Request) {
  return withApi(async () => {
    await requireAuthWithPermission([PERM.quizImport]);
    const body = await parseJsonBody(request, schema);
    const saved = await editQuiz(body.definition.quiz);
    await saveQuestions(saved.id, body.definition.questions);
    await saveOutcomes(saved.id, body.definition.outcomes);
    return {
      quiz_id: saved.id,
    };
  });
}
