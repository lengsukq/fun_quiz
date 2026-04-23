import { requireAuthWithPermission } from "@/lib/auth/guard";
import { PERM } from "@/lib/rbac/permission-codes";
import { withApi } from "@/lib/http";
import { findWebUserById, queryRoleCodesByUserId } from "@/server/repositories/user-repository";

type Props = {
  params: Promise<{
    userId: string;
  }>;
};

export async function GET(_: Request, props: Props) {
  return withApi(async () => {
    await requireAuthWithPermission([PERM.sysUser]);
    const { userId } = await props.params;
    const user = await findWebUserById(userId);
    if (!user) return null;
    const roleCodes = await queryRoleCodesByUserId(user.id);
    return {
      id: user.id,
      account: user.account,
      name: user.name,
      enabled: user.enabled,
      resetPassword: user.resetPassword,
      tryCount: user.tryCount,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roleCodes,
    };
  });
}
