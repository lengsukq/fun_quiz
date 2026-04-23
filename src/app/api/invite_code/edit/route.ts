import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { inviteCodes } from "@/db/schema/core";
import { requireAuthWithPermission } from "@/lib/auth/guard";
import { PERM } from "@/lib/rbac/permission-codes";
import { createId } from "@/lib/id";
import { withApi } from "@/lib/http";
import { parseJsonBody } from "@/lib/request";

const schema = z.object({
  id: z.string().optional(),
  code: z.string().min(1),
  enabled: z.boolean().default(true),
  maxUseTimes: z.number().int().default(1),
  expiresAt: z.string().optional(),
});

export async function POST(request: Request) {
  return withApi(async () => {
    await requireAuthWithPermission([PERM.sysInvite]);
    const body = await parseJsonBody(request, schema);
    const id = body.id ?? createId();
    const [exists] = await db.select().from(inviteCodes).where(eq(inviteCodes.id, id)).limit(1);
    if (exists) {
      await db
        .update(inviteCodes)
        .set({
          code: body.code,
          enabled: body.enabled,
          maxUseTimes: body.maxUseTimes,
          expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
          updatedAt: new Date(),
        })
        .where(eq(inviteCodes.id, id));
    } else {
      await db.insert(inviteCodes).values({
        id,
        code: body.code,
        enabled: body.enabled,
        maxUseTimes: body.maxUseTimes,
        usedTimes: 0,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      });
    }
    return { id };
  });
}
