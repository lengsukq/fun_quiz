import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { permissions } from "@/db/schema/core";
import { requireAuthWithPermission } from "@/lib/auth/guard";
import { PERM } from "@/lib/rbac/permission-codes";
import { createId } from "@/lib/id";
import { withApi } from "@/lib/http";
import { parseJsonBody } from "@/lib/request";

const schema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  code: z.string().min(1),
  menuId: z.string().nullable().optional(),
  enabled: z.boolean().default(true),
});

export async function POST(request: Request) {
  return withApi(async () => {
    await requireAuthWithPermission([PERM.sysPermissionAdmin]);
    const body = await parseJsonBody(request, schema);
    const id = body.id ?? createId();
    const [exists] = await db.select().from(permissions).where(eq(permissions.id, id)).limit(1);
    if (exists) {
      await db
        .update(permissions)
        .set({
          name: body.name,
          code: body.code,
          menuId: body.menuId ?? null,
          enabled: body.enabled,
          updatedAt: new Date(),
        })
        .where(eq(permissions.id, id));
    } else {
      await db.insert(permissions).values({
        id,
        name: body.name,
        code: body.code,
        menuId: body.menuId ?? null,
        enabled: body.enabled,
      });
    }
    return { id };
  });
}
