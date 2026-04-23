import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { menus } from "@/db/schema/core";
import { requireAuthWithPermission } from "@/lib/auth/guard";
import { PERM } from "@/lib/rbac/permission-codes";
import { withApi } from "@/lib/http";
import { parseJsonBody } from "@/lib/request";

const schema = z.object({
  menuId: z.string().min(1),
});

export async function POST(request: Request) {
  return withApi(async () => {
    await requireAuthWithPermission([PERM.sysMenuAdmin]);
    const { menuId } = await parseJsonBody(request, schema);
    await db.delete(menus).where(eq(menus.id, menuId));
    return { success: true };
  });
}
