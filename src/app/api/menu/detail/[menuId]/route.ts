import { eq } from "drizzle-orm";

import { db } from "@/db";
import { menus } from "@/db/schema/core";
import { requireAuthWithPermission } from "@/lib/auth/guard";
import { PERM } from "@/lib/rbac/permission-codes";
import { withApi } from "@/lib/http";

type Props = {
  params: Promise<{ menuId: string }>;
};

export async function GET(_: Request, props: Props) {
  return withApi(async () => {
    await requireAuthWithPermission([PERM.sysMenuRead]);
    const { menuId } = await props.params;
    const [row] = await db.select().from(menus).where(eq(menus.id, menuId)).limit(1);
    return row ?? null;
  });
}
