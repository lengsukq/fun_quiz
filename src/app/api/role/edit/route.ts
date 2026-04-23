import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { roles } from "@/db/schema/core";
import { requireAuthWithPermission } from "@/lib/auth/guard";
import { PERM } from "@/lib/rbac/permission-codes";
import { createId } from "@/lib/id";
import { withApi } from "@/lib/http";
import { parseJsonBody } from "@/lib/request";

const schema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  code: z.string().min(1),
  enabled: z.boolean().default(true),
  remark: z.string().optional(),
});

export async function POST(request: Request) {
  return withApi(async () => {
    await requireAuthWithPermission([PERM.sysRoleAdmin]);
    const body = await parseJsonBody(request, schema);
    const id = body.id ?? createId();
    const [exists] = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
    if (exists) {
      await db
        .update(roles)
        .set({
          name: body.name,
          code: body.code,
          enabled: body.enabled,
          remark: body.remark ?? null,
          updatedAt: new Date(),
        })
        .where(eq(roles.id, id));
    } else {
      await db.insert(roles).values({
        id,
        name: body.name,
        code: body.code,
        enabled: body.enabled,
        remark: body.remark ?? null,
      });
    }
    return { id };
  });
}
