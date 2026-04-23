import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { depts } from "@/db/schema/core";
import { requireAuthWithPermission } from "@/lib/auth/guard";
import { PERM } from "@/lib/rbac/permission-codes";
import { createId } from "@/lib/id";
import { withApi } from "@/lib/http";
import { parseJsonBody } from "@/lib/request";

const schema = z.object({
  id: z.string().optional(),
  organizationId: z.string().nullable().optional(),
  parentId: z.string().nullable().optional(),
  name: z.string().min(1),
  seq: z.number().int().default(0),
  enabled: z.boolean().default(true),
});

export async function POST(request: Request) {
  return withApi(async () => {
    await requireAuthWithPermission([PERM.sysDept]);
    const body = await parseJsonBody(request, schema);
    const id = body.id ?? createId();
    const [exists] = await db.select().from(depts).where(eq(depts.id, id)).limit(1);
    if (exists) {
      await db
        .update(depts)
        .set({
          organizationId: body.organizationId ?? null,
          parentId: body.parentId ?? null,
          name: body.name,
          seq: body.seq,
          enabled: body.enabled,
          updatedAt: new Date(),
        })
        .where(eq(depts.id, id));
    } else {
      await db.insert(depts).values({
        id,
        organizationId: body.organizationId ?? null,
        parentId: body.parentId ?? null,
        name: body.name,
        seq: body.seq,
        enabled: body.enabled,
      });
    }
    return { id };
  });
}
