import { eq } from "drizzle-orm";

import { db } from "@/db";
import { inviteCodes } from "@/db/schema/core";
import { requireAuthWithPermission } from "@/lib/auth/guard";
import { withApi } from "@/lib/http";
import { PERM } from "@/lib/rbac/permission-codes";

type Props = {
  params: Promise<{ inviteCodeId: string }>;
};

export async function GET(_: Request, props: Props) {
  return withApi(async () => {
    await requireAuthWithPermission([PERM.sysInvite]);
    const { inviteCodeId } = await props.params;
    const [row] = await db.select().from(inviteCodes).where(eq(inviteCodes.id, inviteCodeId)).limit(1);
    return row ?? null;
  });
}
