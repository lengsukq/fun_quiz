import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { permissionAssigns, permissions, roles } from "@/db/schema/core";
import { createId } from "@/lib/id";
import { ADMIN_ROLE_PERMISSION_IDS, BUILTIN_PERMISSION_ROWS } from "@/lib/rbac/permission-codes";

async function upsertBuiltinPermissions() {
  for (const row of BUILTIN_PERMISSION_ROWS) {
    const [exists] = await db.select().from(permissions).where(eq(permissions.id, row.id)).limit(1);
    if (exists) {
      await db
        .update(permissions)
        .set({
          name: row.name,
          code: row.code,
          enabled: true,
          updatedAt: new Date(),
        })
        .where(eq(permissions.id, row.id));
    } else {
      await db.insert(permissions).values({
        id: row.id,
        name: row.name,
        code: row.code,
        menuId: null,
        enabled: true,
      });
    }
  }
}

async function ensureRolePermissionAssigns(roleId: string, permissionIds: string[]) {
  for (const permissionId of permissionIds) {
    const [exists] = await db
      .select()
      .from(permissionAssigns)
      .where(and(eq(permissionAssigns.roleId, roleId), eq(permissionAssigns.permissionId, permissionId)))
      .limit(1);
    if (exists) continue;
    await db.insert(permissionAssigns).values({
      id: createId(),
      roleId,
      permissionId,
    });
  }
}

/**
 * 幂等：写入内置权限定义，并为 SUPER_ADMIN / ADMIN 绑定默认授权。
 * WEB_USER 不写入任何管理权限。
 */
export async function ensureDefaultRbacSeed() {
  await upsertBuiltinPermissions();

  const superAdmin = await db.select().from(roles).where(eq(roles.code, "SUPER_ADMIN")).limit(1).then((r) => r[0]);
  const admin = await db.select().from(roles).where(eq(roles.code, "ADMIN")).limit(1).then((r) => r[0]);

  const allIds = BUILTIN_PERMISSION_ROWS.map((p) => p.id);
  if (superAdmin) {
    await ensureRolePermissionAssigns(superAdmin.id, allIds);
  }
  if (admin) {
    await ensureRolePermissionAssigns(
      admin.id,
      ADMIN_ROLE_PERMISSION_IDS.filter((id) => allIds.includes(id)),
    );
  }
}
