import { requireAuthWithPermission } from "@/lib/auth/guard";
import { PERM } from "@/lib/rbac/permission-codes";
import { withApi } from "@/lib/http";
import { getOutcomes } from "@/server/services/quiz-service";

type Props = {
  params: Promise<{ quizId: string }>;
};

export async function POST(_: Request, props: Props) {
  return withApi(async () => {
    await requireAuthWithPermission([PERM.quizRead]);
    const { quizId } = await props.params;
    return getOutcomes(quizId);
  });
}
