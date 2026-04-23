import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { permissions } from "@/db/schema/core";
import { requireAuthWithPermission } from "@/lib/auth/guard";
import { PERM } from "@/lib/rbac/permission-codes";
import { withApi } from "@/lib/http";
import { parseJsonBody } from "@/lib/request";

const schema = z.object({
  permissionId: z.string().min(1),
  enabled: z.boolean(),
});

export async function POST(request: Request) {
  return withApi(async () => {
    await requireAuthWithPermission([PERM.sysPermissionAdmin]);
    const body = await parseJsonBody(request, schema);
    await db
      .update(permissions)
      .set({
        enabled: body.enabled,
        updatedAt: new Date(),
      })
      .where(eq(permissions.id, body.permissionId));
    return { success: true };
  });
}
