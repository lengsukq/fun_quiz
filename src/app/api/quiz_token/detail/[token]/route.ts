import { requireAuthWithPermission } from "@/lib/auth/guard";
import { PERM } from "@/lib/rbac/permission-codes";
import { withApi } from "@/lib/http";
import { getQuizTokenDetail } from "@/server/services/quiz-service";

type Props = {
  params: Promise<{ token: string }>;
};

export async function POST(_: Request, props: Props) {
  return withApi(async () => {
    await requireAuthWithPermission([PERM.quizToken]);
    const { token } = await props.params;
    return getQuizTokenDetail(token);
  });
}
