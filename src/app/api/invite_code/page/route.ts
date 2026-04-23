import { desc } from "drizzle-orm";

import { db } from "@/db";
import { inviteCodes } from "@/db/schema/core";
import { requireAuthWithPermission } from "@/lib/auth/guard";
import { PERM } from "@/lib/rbac/permission-codes";
import { withApi } from "@/lib/http";

export async function POST() {
  return withApi(async () => {
    await requireAuthWithPermission([PERM.sysInvite]);
    const list = await db.select().from(inviteCodes).orderBy(desc(inviteCodes.createdAt));
    return {
      total: list.length,
      list,
    };
  });
}
