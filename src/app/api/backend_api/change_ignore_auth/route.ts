import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { backendApis } from "@/db/schema/core";
import { requireAuthWithPermission } from "@/lib/auth/guard";
import { PERM } from "@/lib/rbac/permission-codes";
import { withApi } from "@/lib/http";
import { parseJsonBody } from "@/lib/request";

const schema = z.object({
  backendApiId: z.string().min(1),
  ignoreAuth: z.boolean(),
});

export async function POST(request: Request) {
  return withApi(async () => {
    await requireAuthWithPermission([PERM.sysBackendApiAdmin]);
    const body = await parseJsonBody(request, schema);
    await db
      .update(backendApis)
      .set({
        ignoreAuth: body.ignoreAuth,
        updatedAt: new Date(),
      })
      .where(eq(backendApis.id, body.backendApiId));
    return { success: true };
  });
}
