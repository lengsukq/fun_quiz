import { z } from "zod";
import { randomBytes } from "node:crypto";

import { requireAuthWithPermission } from "@/lib/auth/guard";
import { PERM } from "@/lib/rbac/permission-codes";
import { hashPassword } from "@/lib/auth/password";
import { withApi } from "@/lib/http";
import { parseJsonBody } from "@/lib/request";
import { findWebUserById, updateWebUser } from "@/server/repositories/user-repository";

const schema = z.object({
  userId: z.string().min(1),
  newPassword: z.string().min(6).optional(),
});

export async function POST(request: Request) {
  return withApi(async () => {
    await requireAuthWithPermission([PERM.sysUser]);
    const body = await parseJsonBody(request, schema);
    const user = await findWebUserById(body.userId);
    if (!user) throw new Error("user not found");
    const plainPassword = body.newPassword ?? randomBytes(6).toString("base64url");
    const passwordHash = await hashPassword(`${plainPassword}:${user.passwordSalt}`);
    await updateWebUser(body.userId, {
      passwordHash,
      resetPassword: false,
    });
    return { password: plainPassword };
  });
}
