import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { menus } from "@/db/schema/core";
import { requireAuthWithPermission } from "@/lib/auth/guard";
import { PERM } from "@/lib/rbac/permission-codes";
import { withApi } from "@/lib/http";
import { parseJsonBody } from "@/lib/request";

const schema = z.object({
  nodes: z.array(
    z.object({
      id: z.string(),
      parentId: z.string().nullable().optional(),
      seq: z.number().int().default(0),
    }),
  ),
});

export async function POST(request: Request) {
  return withApi(async () => {
    await requireAuthWithPermission([PERM.sysMenuAdmin]);
    const { nodes } = await parseJsonBody(request, schema);
    for (const node of nodes) {
      await db
        .update(menus)
        .set({
          parentId: node.parentId ?? null,
          seq: node.seq,
          updatedAt: new Date(),
        })
        .where(eq(menus.id, node.id));
    }
    return { success: true };
  });
}
