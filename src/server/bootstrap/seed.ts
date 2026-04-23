import { createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { roles, webUsers } from "@/db/schema/core";
import { hashPassword } from "@/lib/auth/password";
import { createId } from "@/lib/id";
import { ensureDefaultRbacSeed } from "@/server/bootstrap/rbac-seed";
import { upsertBuiltinRoles } from "@/server/repositories/role-repository";
import { bindRoleToUser, findWebUserByAccount } from "@/server/repositories/user-repository";

export async function isSystemBootstrapped() {
  const [row] = await db.select({ id: webUsers.id }).from(webUsers).limit(1);
  return Boolean(row);
}

export async function bootstrapSystemData() {
  await upsertBuiltinRoles();
  await ensureDefaultRbacSeed();

  const adminAccount = "admin";
  const initialPassword = randomBytes(9).toString("base64url");
  const salt = createHash("sha256").update(`admin:${Date.now()}`).digest("hex").slice(0, 16);
  const passwordHash = await hashPassword(`${initialPassword}:${salt}`);
  const [superAdmin] = await db.select().from(roles).where(eq(roles.code, "SUPER_ADMIN")).limit(1);
  const exists = await findWebUserByAccount(adminAccount);
  if (exists) {
    if (superAdmin) {
      await bindRoleToUser({
        id: createId(),
        userId: exists.id,
        roleId: superAdmin.id,
      });
    }
    return { adminAccount, created: false };
  }

  const userId = createId();
  await db.insert(webUsers).values({
    id: userId,
    account: adminAccount,
    name: "系统管理员",
    passwordSalt: salt,
    passwordHash,
    enabled: true,
    tryCount: 0,
    resetPassword: false,
  });

  if (superAdmin) {
    await bindRoleToUser({
      id: createId(),
      userId,
      roleId: superAdmin.id,
    });
  }

  return { adminAccount, created: true, initialPassword };
}
