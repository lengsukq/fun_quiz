import { z } from "zod";

import { requireAuthWithPermission } from "@/lib/auth/guard";
import { PERM } from "@/lib/rbac/permission-codes";
import { withApi } from "@/lib/http";
import { parseJsonBody } from "@/lib/request";
import { updateWebUser } from "@/server/repositories/user-repository";

const schema = z.object({
  userId: z.string().min(1),
  name: z.string().optional(),
  enabled: z.boolean().optional(),
  avatarFileInfo: z.string().nullable().optional(),
});

export async function POST(request: Request) {
  return withApi(async () => {
    await requireAuthWithPermission([PERM.sysUser]);
    const body = await parseJsonBody(request, schema);
    await updateWebUser(body.userId, {
      name: body.name,
      enabled: body.enabled,
      avatarFileInfo: body.avatarFileInfo ?? null,
    });
    return { success: true };
  });
}
