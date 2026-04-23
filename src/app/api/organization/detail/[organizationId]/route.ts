import { eq } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/core";
import { requireAuthWithPermission } from "@/lib/auth/guard";
import { PERM } from "@/lib/rbac/permission-codes";
import { withApi } from "@/lib/http";

type Props = {
  params: Promise<{ organizationId: string }>;
};

export async function GET(_: Request, props: Props) {
  return withApi(async () => {
    await requireAuthWithPermission([PERM.sysOrg]);
    const { organizationId } = await props.params;
    const [row] = await db.select().from(organizations).where(eq(organizations.id, organizationId)).limit(1);
    return row ?? null;
  });
}
