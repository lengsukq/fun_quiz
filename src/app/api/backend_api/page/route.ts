import { desc } from "drizzle-orm";

import { db } from "@/db";
import { backendApis } from "@/db/schema/core";
import { requireAuthWithPermission } from "@/lib/auth/guard";
import { PERM } from "@/lib/rbac/permission-codes";
import { withApi } from "@/lib/http";

export async function POST() {
  return withApi(async () => {
    await requireAuthWithPermission([PERM.sysBackendApiAdmin]);
    const list = await db.select().from(backendApis).orderBy(desc(backendApis.createdAt));
    return {
      total: list.length,
      list,
    };
  });
}
