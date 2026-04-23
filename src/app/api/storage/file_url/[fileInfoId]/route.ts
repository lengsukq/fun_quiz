import { eq } from "drizzle-orm";

import { db } from "@/db";
import { fileInfos } from "@/db/schema/core";
import { requireAuthWithPermission } from "@/lib/auth/guard";
import { PERM } from "@/lib/rbac/permission-codes";
import { withApi } from "@/lib/http";

type Props = {
  params: Promise<{ fileInfoId: string }>;
};

export async function GET(_: Request, props: Props) {
  return withApi(async () => {
    await requireAuthWithPermission([PERM.sysStorage]);
    const { fileInfoId } = await props.params;
    const [row] = await db.select().from(fileInfos).where(eq(fileInfos.id, fileInfoId)).limit(1);
    if (!row) return null;
    return {
      ...row,
      fileUrl: `/${row.storageKey}`,
    };
  });
}
