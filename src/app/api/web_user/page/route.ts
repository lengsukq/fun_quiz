import { desc, ilike } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { webUsers } from "@/db/schema/core";
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
    await requireAuthWithPermission([PERM.sysUser]);
    const contentLength = request.headers.get("content-length");
    const body = contentLength && Number(contentLength) > 0 ? await parseJsonBody(request, schema) : schema.parse({});
    const query = db
      .select({
        id: webUsers.id,
        account: webUsers.account,
        name: webUsers.name,
        enabled: webUsers.enabled,
        createdAt: webUsers.createdAt,
      })
      .from(webUsers);
    const rows = body.search
      ? await query.where(ilike(webUsers.name, `%${body.search}%`)).orderBy(desc(webUsers.createdAt))
      : await query.orderBy(desc(webUsers.createdAt));
    const offset = (body.pageIndex - 1) * body.pageSize;
    return {
      total: rows.length,
      list: rows.slice(offset, offset + body.pageSize),
    };
  });
}
