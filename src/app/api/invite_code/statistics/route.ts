import { db } from "@/db";
import { inviteCodes } from "@/db/schema/core";
import { requireAuthWithPermission } from "@/lib/auth/guard";
import { withApi } from "@/lib/http";
import { PERM } from "@/lib/rbac/permission-codes";

export async function GET() {
  return withApi(async () => {
    await requireAuthWithPermission([PERM.sysInvite]);
    const list = await db.select().from(inviteCodes);
    return {
      total: list.length,
      enabledTotal: list.filter((item) => item.enabled).length,
      usedTotal: list.reduce((acc, item) => acc + item.usedTimes, 0),
    };
  });
}
