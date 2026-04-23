import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { depts } from "@/db/schema/core";
import { requireAuthWithPermission } from "@/lib/auth/guard";
import { PERM } from "@/lib/rbac/permission-codes";
import { withApi } from "@/lib/http";
import { parseJsonBody } from "@/lib/request";

const schema = z.object({ deptId: z.string().min(1) });

export async function POST(request: Request) {
  return withApi(async () => {
    await requireAuthWithPermission([PERM.sysDept]);
    const { deptId } = await parseJsonBody(request, schema);
    await db.delete(depts).where(eq(depts.id, deptId));
    return { success: true };
  });
}
