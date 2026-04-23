import { headers } from "next/headers";

import { AppError } from "@/lib/errors";
import { getAccessTokenCookie } from "@/lib/auth/session";
import { verifyAccessToken, type JwtPayload } from "@/lib/auth/token";
import { findSessionByAccessToken, isTokenBlacklisted } from "@/server/repositories/auth-session-repository";
import { hasAnyAssignedPermission, isSuperAdminRole } from "@/lib/auth/rbac-check";
import { listPermissionCodesForWebUser } from "@/server/repositories/rbac-repository";

export async function requireAuth(requiredRoleCodes?: string[]): Promise<JwtPayload> {
  const headerStore = await headers();
  const auth = headerStore.get("authorization");
  const scene = headerStore.get("scene") ?? "WEB";
  const space = headerStore.get("space") ?? "WEB";
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
  const cookieToken = await getAccessTokenCookie(space);
  const token = bearer || cookieToken;

  if (!token) {
    throw new AppError("Unauthorized", 401);
  }

  const payload = await verifyAccessToken(token);
  const blacklisted = await isTokenBlacklisted(token);
  if (blacklisted) {
    throw new AppError("Token revoked", 401);
  }

  const session = await findSessionByAccessToken(token);
  if (!session) {
    throw new AppError("Invalid token session", 401);
  }
  if (session.scene !== scene || session.space !== space) {
    throw new AppError("Token scene/space mismatch", 401);
  }

  if (requiredRoleCodes?.length) {
    const hasRole = requiredRoleCodes.some((roleCode) => payload.roleCodes.includes(roleCode));
    if (!hasRole) {
      throw new AppError("Forbidden", 403);
    }
  }

  return payload;
}

/** 已登录 + 任一权限码命中（SUPER_ADMIN 角色跳过库权限校验） */
export async function requireAuthWithPermission(permissionCodes: string[]): Promise<JwtPayload> {
  const payload = await requireAuth();
  if (isSuperAdminRole(payload.roleCodes)) {
    return payload;
  }
  if (!permissionCodes.length) {
    throw new AppError("Forbidden", 403);
  }
  const granted = await listPermissionCodesForWebUser(payload.webUserId);
  if (!hasAnyAssignedPermission(granted, permissionCodes)) {
    throw new AppError("Forbidden", 403);
  }
  return payload;
}

export async function requireSuperAdmin(): Promise<JwtPayload> {
  const payload = await requireAuth();
  if (!payload.roleCodes.includes("SUPER_ADMIN")) {
    throw new AppError("Forbidden", 403);
  }
  return payload;
}
