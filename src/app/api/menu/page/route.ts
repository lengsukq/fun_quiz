import { asc, ilike } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { menus } from "@/db/schema/core";
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
    await requireAuthWithPermission([PERM.sysMenuRead]);
    const contentLength = request.headers.get("content-length");
    const body = contentLength && Number(contentLength) > 0 ? await parseJsonBody(request, schema) : schema.parse({});
    const list = body.search
      ? await db.select().from(menus).where(ilike(menus.name, `%${body.search}%`)).orderBy(asc(menus.seq), asc(menus.createdAt))
      : await db.select().from(menus).orderBy(asc(menus.seq), asc(menus.createdAt));
    const offset = (body.pageIndex - 1) * body.pageSize;
    return {
      total: list.length,
      list: list.slice(offset, offset + body.pageSize),
    };
  });
}
