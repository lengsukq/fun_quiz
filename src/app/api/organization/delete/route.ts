import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { organizations } from "@/db/schema/core";
import { requireAuthWithPermission } from "@/lib/auth/guard";
import { PERM } from "@/lib/rbac/permission-codes";
import { withApi } from "@/lib/http";
import { parseJsonBody } from "@/lib/request";

const schema = z.object({ organizationId: z.string().min(1) });

export async function POST(request: Request) {
  return withApi(async () => {
    await requireAuthWithPermission([PERM.sysOrg]);
    const { organizationId } = await parseJsonBody(request, schema);
    await db.delete(organizations).where(eq(organizations.id, organizationId));
    return { success: true };
  });
}
