import { z } from "zod";

import { requireAuthWithPermission } from "@/lib/auth/guard";
import { PERM } from "@/lib/rbac/permission-codes";
import { withApi } from "@/lib/http";
import { parseJsonBody } from "@/lib/request";
import { generateQuizDefinitionFromAi } from "@/server/services/quiz-ai-generate-service";
import { editQuiz, saveOutcomes, saveQuestions } from "@/server/services/quiz-service";

const requestSchema = z.object({
  prompt: z.string().min(1).max(20000),
  quizType: z.enum(["score", "vector", "branch", "random"]).optional(),
  persist: z.boolean().optional(),
});

export async function POST(request: Request) {
  return withApi(async () => {
    await requireAuthWithPermission([PERM.quizAiGenerate]);
    const body = await parseJsonBody(request, requestSchema);
    const envelope = await generateQuizDefinitionFromAi({
      prompt: body.prompt,
      quizType: body.quizType,
    });

    if (body.persist) {
      const saved = await editQuiz(envelope.definition.quiz);
      await saveQuestions(saved.id, envelope.definition.questions);
      await saveOutcomes(saved.id, envelope.definition.outcomes);
      return {
        definition: envelope.definition,
        quiz_id: saved.id,
      };
    }

    return {
      definition: envelope.definition,
      quiz_id: null as string | null,
    };
  });
}
