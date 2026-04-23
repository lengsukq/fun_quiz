import { z } from "zod";

import { requireAuthWithPermission } from "@/lib/auth/guard";
import { PERM } from "@/lib/rbac/permission-codes";
import { withApi } from "@/lib/http";
import { parseJsonBody } from "@/lib/request";
import { editQuiz } from "@/server/services/quiz-service";

const schema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  code: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  quizType: z.string().optional(),
  status: z.string().optional(),
  algoConfig: z.record(z.string(), z.unknown()).optional(),
  resultConfig: z.record(z.string(), z.unknown()).optional(),
  specialRules: z.record(z.string(), z.unknown()).optional(),
  covers: z.array(z.record(z.string(), z.unknown())).optional(),
});

export async function POST(request: Request) {
  return withApi(async () => {
    await requireAuthWithPermission([PERM.quizWrite]);
    const body = await parseJsonBody(request, schema);
    return editQuiz(body);
  });
}
