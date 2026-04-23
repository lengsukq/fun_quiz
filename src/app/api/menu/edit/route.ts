import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { menus } from "@/db/schema/core";
import { requireAuthWithPermission } from "@/lib/auth/guard";
import { PERM } from "@/lib/rbac/permission-codes";
import { createId } from "@/lib/id";
import { withApi } from "@/lib/http";
import { parseJsonBody } from "@/lib/request";

const schema = z.object({
  id: z.string().optional(),
  parentId: z.string().nullable().optional(),
  name: z.string().min(1),
  code: z.string().min(1),
  path: z.string().optional(),
  icon: z.string().optional(),
  seq: z.number().int().default(0),
  enabled: z.boolean().default(true),
});

export async function POST(request: Request) {
  return withApi(async () => {
    await requireAuthWithPermission([PERM.sysMenuAdmin]);
    const body = await parseJsonBody(request, schema);
    const id = body.id ?? createId();
    const [exists] = await db.select().from(menus).where(eq(menus.id, id)).limit(1);
    if (exists) {
      await db
        .update(menus)
        .set({
          parentId: body.parentId ?? null,
          name: body.name,
          code: body.code,
          path: body.path ?? null,
          icon: body.icon ?? null,
          seq: body.seq,
          enabled: body.enabled,
          updatedAt: new Date(),
        })
        .where(eq(menus.id, id));
    } else {
      await db.insert(menus).values({
        id,
        parentId: body.parentId ?? null,
        name: body.name,
        code: body.code,
        path: body.path ?? null,
        icon: body.icon ?? null,
        seq: body.seq,
        enabled: body.enabled,
      });
    }
    return { id };
  });
}
