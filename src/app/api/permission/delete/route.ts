import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { permissionAssigns, permissions } from "@/db/schema/core";
import { requireAuthWithPermission } from "@/lib/auth/guard";
import { PERM } from "@/lib/rbac/permission-codes";
import { withApi } from "@/lib/http";
import { parseJsonBody } from "@/lib/request";

const schema = z.object({
  permissionId: z.string().min(1),
});

export async function POST(request: Request) {
  return withApi(async () => {
    await requireAuthWithPermission([PERM.sysPermissionAdmin]);
    const { permissionId } = await parseJsonBody(request, schema);
    await db.delete(permissionAssigns).where(eq(permissionAssigns.permissionId, permissionId));
    await db.delete(permissions).where(eq(permissions.id, permissionId));
    return { success: true };
  });
}
