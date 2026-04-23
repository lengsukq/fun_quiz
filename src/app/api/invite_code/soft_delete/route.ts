import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { inviteCodes } from "@/db/schema/core";
import { requireAuthWithPermission } from "@/lib/auth/guard";
import { PERM } from "@/lib/rbac/permission-codes";
import { withApi } from "@/lib/http";
import { parseJsonBody } from "@/lib/request";

const schema = z.object({
  inviteCodeId: z.string().min(1),
});

export async function POST(request: Request) {
  return withApi(async () => {
    await requireAuthWithPermission([PERM.sysInvite]);
    const { inviteCodeId } = await parseJsonBody(request, schema);
    await db
      .update(inviteCodes)
      .set({
        enabled: false,
        updatedAt: new Date(),
      })
      .where(eq(inviteCodes.id, inviteCodeId));
    return { success: true };
  });
}
