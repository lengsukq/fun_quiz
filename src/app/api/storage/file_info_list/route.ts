import { inArray } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { fileInfos } from "@/db/schema/core";
import { requireAuthWithPermission } from "@/lib/auth/guard";
import { PERM } from "@/lib/rbac/permission-codes";
import { withApi } from "@/lib/http";
import { parseJsonBody } from "@/lib/request";

const schema = z.object({
  fileInfoIdList: z.array(z.string()).default([]),
});

export async function POST(request: Request) {
  return withApi(async () => {
    await requireAuthWithPermission([PERM.sysStorage]);
    const { fileInfoIdList } = await parseJsonBody(request, schema);
    if (!fileInfoIdList.length) return [];
    return db.select().from(fileInfos).where(inArray(fileInfos.id, fileInfoIdList));
  });
}
