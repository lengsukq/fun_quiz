import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { roles, userRoles } from "@/db/schema/core";
import { requireAuthWithPermission } from "@/lib/auth/guard";
import { PERM } from "@/lib/rbac/permission-codes";
import { withApi } from "@/lib/http";
import { parseJsonBody } from "@/lib/request";

const schema = z.object({
  roleId: z.string().min(1),
});

export async function POST(request: Request) {
  return withApi(async () => {
    await requireAuthWithPermission([PERM.sysRoleAdmin]);
    const body = await parseJsonBody(request, schema);
    await db.delete(userRoles).where(eq(userRoles.roleId, body.roleId));
    await db.delete(roles).where(eq(roles.id, body.roleId));
    return { success: true };
  });
}
