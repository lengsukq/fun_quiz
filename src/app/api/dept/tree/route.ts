import { asc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { depts } from "@/db/schema/core";
import { requireAuthWithPermission } from "@/lib/auth/guard";
import { PERM } from "@/lib/rbac/permission-codes";
import { withApi } from "@/lib/http";
import { parseJsonBody } from "@/lib/request";

const schema = z.object({
  organizationId: z.string().optional(),
});

function buildTree(items: Array<typeof depts.$inferSelect>, parentId: string | null = null): Array<Record<string, unknown>> {
  return items
    .filter((item) => (item.parentId ?? null) === parentId)
    .map((item) => ({
      ...item,
      children: buildTree(items, item.id),
    }));
}

export async function POST(request: Request) {
  return withApi(async () => {
    await requireAuthWithPermission([PERM.sysDept]);
    const { organizationId } = await parseJsonBody(request, schema);
    const all = organizationId
      ? await db.select().from(depts).where(eq(depts.organizationId, organizationId)).orderBy(asc(depts.seq))
      : await db.select().from(depts).orderBy(asc(depts.seq));
    const tree = buildTree(all);
    return {
      total: tree.length,
      list: tree,
    };
  });
}
