import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { roles } from "@/db/schema/core";
import { requireAuthWithPermission } from "@/lib/auth/guard";
import { PERM } from "@/lib/rbac/permission-codes";
import { withApi } from "@/lib/http";
import { parseJsonBody } from "@/lib/request";

const schema = z.object({
  roleId: z.string().min(1),
  enabled: z.boolean(),
});

export async function POST(request: Request) {
  return withApi(async () => {
    await requireAuthWithPermission([PERM.sysRoleAdmin]);
    const body = await parseJsonBody(request, schema);
    await db
      .update(roles)
      .set({
        enabled: body.enabled,
        updatedAt: new Date(),
      })
      .where(eq(roles.id, body.roleId));
    return { success: true };
  });
}
