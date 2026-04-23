import { eq } from "drizzle-orm";

import { db } from "@/db";
import { depts } from "@/db/schema/core";
import { requireAuthWithPermission } from "@/lib/auth/guard";
import { PERM } from "@/lib/rbac/permission-codes";
import { withApi } from "@/lib/http";

type Props = {
  params: Promise<{ deptId: string }>;
};

export async function GET(_: Request, props: Props) {
  return withApi(async () => {
    await requireAuthWithPermission([PERM.sysDept]);
    const { deptId } = await props.params;
    const [row] = await db.select().from(depts).where(eq(depts.id, deptId)).limit(1);
    return row ?? null;
  });
}
