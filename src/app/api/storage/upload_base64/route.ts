import { z } from "zod";

import { db } from "@/db";
import { fileInfos } from "@/db/schema/core";
import { requireAuthWithPermission } from "@/lib/auth/guard";
import { PERM } from "@/lib/rbac/permission-codes";
import { createId } from "@/lib/id";
import { withApi } from "@/lib/http";
import { parseJsonBody } from "@/lib/request";

const schema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().optional(),
  base64: z.string().min(1),
});

export async function POST(request: Request) {
  return withApi(async () => {
    await requireAuthWithPermission([PERM.sysStorage]);
    const body = await parseJsonBody(request, schema);
    const id = createId();
    const storageKey = `uploads/${id}/${body.fileName}`;
    const size = Buffer.from(body.base64, "base64").byteLength;
    await db.insert(fileInfos).values({
      id,
      storageKey,
      fileName: body.fileName,
      mimeType: body.mimeType ?? null,
      size,
    });
    return {
      fileInfoId: id,
      storageKey,
      fileName: body.fileName,
    };
  });
}
