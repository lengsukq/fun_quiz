import { desc, ilike } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { permissions } from "@/db/schema/core";
import { requireAuthWithPermission } from "@/lib/auth/guard";
import { PERM } from "@/lib/rbac/permission-codes";
import { withApi } from "@/lib/http";
import { parseJsonBody } from "@/lib/request";

const schema = z.object({
  search: z.string().optional(),
  pageIndex: z.number().int().default(1),
  pageSize: z.number().int().default(20),
});

export async function POST(request: Request) {
  return withApi(async () => {
    await requireAuthWithPermission([PERM.sysPermissionRead]);
    const contentLength = request.headers.get("content-length");
    const body = contentLength && Number(contentLength) > 0 ? await parseJsonBody(request, schema) : schema.parse({});
    const list = body.search
      ? await db.select().from(permissions).where(ilike(permissions.name, `%${body.search}%`)).orderBy(desc(permissions.createdAt))
      : await db.select().from(permissions).orderBy(desc(permissions.createdAt));
    const offset = (body.pageIndex - 1) * body.pageSize;
    return {
      total: list.length,
      list: list.slice(offset, offset + body.pageSize),
    };
  });
}
