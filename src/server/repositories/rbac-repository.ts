import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import { permissionAssigns, permissions, userRoles } from "@/db/schema/core";

export async function listPermissionCodesForWebUser(webUserId: string): Promise<string[]> {
  const roleRows = await db.select().from(userRoles).where(eq(userRoles.userId, webUserId));
  if (!roleRows.length) return [];
  const roleIds = roleRows.map((r) => r.roleId);
  const assignRows = await db.select().from(permissionAssigns).where(inArray(permissionAssigns.roleId, roleIds));
  if (!assignRows.length) return [];
  const permissionIds = [...new Set(assignRows.map((a) => a.permissionId))];
  const permRows = await db
    .select({ code: permissions.code })
    .from(permissions)
    .where(and(inArray(permissions.id, permissionIds), eq(permissions.enabled, true)));
  return [...new Set(permRows.map((p) => p.code))];
}

export async function countPermissions(): Promise<number> {
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(permissions);
  return count ?? 0;
}
