import { z } from "zod";

import { requireAuthWithPermission } from "@/lib/auth/guard";
import { PERM } from "@/lib/rbac/permission-codes";
import { withApi } from "@/lib/http";
import { parseJsonBody } from "@/lib/request";
import { updateWebUser } from "@/server/repositories/user-repository";
import { revokeUserSessions } from "@/server/services/auth-service";

const schema = z.object({
  userId: z.string().min(1),
  enabled: z.boolean(),
});

export async function POST(request: Request) {
  return withApi(async () => {
    await requireAuthWithPermission([PERM.sysUser]);
    const body = await parseJsonBody(request, schema);
    await updateWebUser(body.userId, { enabled: body.enabled });
    if (!body.enabled) {
      await revokeUserSessions(body.userId);
    }
    return { success: true };
  });
}
