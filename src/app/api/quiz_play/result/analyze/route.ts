import { z } from "zod";

import { withApi } from "@/lib/http";
import { parseJsonBody } from "@/lib/request";
import { analyzeQuizResultDeep } from "@/server/services/quiz-service";
import { DEEP_ANALYSIS_STYLES, type DeepAnalysisStyle } from "@/types/quiz-play";

const styleValues = DEEP_ANALYSIS_STYLES.map((s) => s.id) as [DeepAnalysisStyle, ...DeepAnalysisStyle[]];

const schema = z.object({
  token: z.string().min(1),
  resultId: z.string().min(1),
  style: z.enum(styleValues),
});

export async function POST(request: Request) {
  return withApi(async () => {
    const body = await parseJsonBody(request, schema);
    return analyzeQuizResultDeep(body.token, body.resultId, body.style);
  });
}
