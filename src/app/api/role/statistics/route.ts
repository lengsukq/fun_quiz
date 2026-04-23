import { db } from "@/db";
import { roles } from "@/db/schema/core";
import { requireAuthWithPermission } from "@/lib/auth/guard";
import { PERM } from "@/lib/rbac/permission-codes";
import { withApi } from "@/lib/http";

export async function GET() {
  return withApi(async () => {
    await requireAuthWithPermission([PERM.sysRoleRead]);
    const list = await db.select().from(roles);
    return {
      total: list.length,
      enabledTotal: list.filter((item) => item.enabled).length,
      disabledTotal: list.filter((item) => !item.enabled).length,
    };
  });
}
