import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { roles } from "@/db/schema/core";
import { AppError } from "@/lib/errors";
import { createId } from "@/lib/id";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { getAccessTokenExpiresAt, getRefreshTokenExpiresAt, signAccessToken, signRefreshToken, verifyRefreshToken } from "@/lib/auth/token";
import {
  blacklistToken,
  listSessionsByUnionUserId,
  findSessionByRefreshToken,
  removeSessionByUnionSceneSpace,
  removeSessionsByUnionUserId,
  upsertAuthSession,
} from "@/server/repositories/auth-session-repository";
import {
  bindRoleToUser,
  createWebUser,
  findWebUserByAccount,
  findWebUserById,
  queryRoleCodesByUserId,
} from "@/server/repositories/user-repository";
import { ensureDefaultRbacSeed } from "@/server/bootstrap/rbac-seed";
import { findRoleByCode, upsertBuiltinRoles } from "@/server/repositories/role-repository";

export async function registerWebUser(input: {
  account: string;
  name: string;
  password: string;
}) {
  await upsertBuiltinRoles();
  await ensureDefaultRbacSeed();
  const exists = await findWebUserByAccount(input.account);
  if (exists) {
    throw new AppError("Account already exists", 400);
  }

  const salt = createHash("sha256").update(`${input.account}:${Date.now()}`).digest("hex").slice(0, 16);
  const passwordHash = await hashPassword(`${input.password}:${salt}`);
  const userId = createId();

  await createWebUser({
    id: userId,
    account: input.account,
    name: input.name,
    passwordSalt: salt,
    passwordHash,
  });

  const defaultRole = await findRoleByCode("WEB_USER");
  if (defaultRole) {
    await bindRoleToUser({
      id: createId(),
      roleId: defaultRole.id,
      userId,
    });
  }

  return {
    userId,
  };
}

export async function loginWebUser(input: {
  account: string;
  password: string;
  scene: string;
  space: string;
}) {
  const user = await findWebUserByAccount(input.account);
  if (!user || !user.enabled) {
    throw new AppError("Account or password is invalid", 400);
  }

  const isValid = await verifyPassword(`${input.password}:${user.passwordSalt}`, user.passwordHash);
  if (!isValid) {
    throw new AppError("Account or password is invalid", 400);
  }

  await upsertBuiltinRoles();
  await ensureDefaultRbacSeed();

  const roleCodes = await queryRoleCodesByUserId(user.id);
  const currentRoleCode = roleCodes[0];
  const accessToken = await signAccessToken({
    unionUserId: user.id,
    webUserId: user.id,
    account: user.account,
    roleCodes,
    currentRoleCode,
    scene: input.scene,
    space: input.space,
  });
  const refreshToken = await signRefreshToken({
    unionUserId: user.id,
    webUserId: user.id,
    account: user.account,
    roleCodes,
    currentRoleCode,
    scene: input.scene,
    space: input.space,
  });

  await upsertAuthSession({
    id: createId(),
    unionUserId: user.id,
    scene: input.scene,
    space: input.space,
    accessToken,
    refreshToken,
    currentRoleCode: currentRoleCode ?? null,
    expiresAt: getAccessTokenExpiresAt(),
    refreshExpiresAt: getRefreshTokenExpiresAt(),
  });

  const unionUserInfo = {
    unionUserId: user.id,
    userId: user.id,
    account: user.account,
    name: user.name,
    roleCodeList: roleCodes,
    currentRoleCode,
    accessToken,
    refreshToken,
    scene: input.scene,
    space: input.space,
  };

  return {
    union_user_info: unionUserInfo,
    unionUserInfo,
  };
}

export async function refreshAccessToken(input: {
  refreshToken: string;
  scene: string;
  space: string;
}) {
  const payload = await verifyRefreshToken(input.refreshToken);
  const session = await findSessionByRefreshToken(input.refreshToken);
  if (!session) {
    throw new AppError("Refresh token is invalid", 401);
  }
  if (session.scene !== input.scene || session.space !== input.space) {
    throw new AppError("Refresh token scene/space mismatch", 401);
  }

  const webUser = await findWebUserById(payload.webUserId);
  if (!webUser || !webUser.enabled) {
    throw new AppError("User is unavailable", 401);
  }

  const roleCodes = await queryRoleCodesByUserId(webUser.id);
  const currentRoleCode = session.currentRoleCode && roleCodes.includes(session.currentRoleCode) ? session.currentRoleCode : roleCodes[0];

  const newAccessToken = await signAccessToken({
    unionUserId: webUser.id,
    webUserId: webUser.id,
    account: webUser.account,
    roleCodes,
    currentRoleCode,
    scene: input.scene,
    space: input.space,
  });

  await upsertAuthSession({
    id: session.id,
    unionUserId: webUser.id,
    scene: input.scene,
    space: input.space,
    accessToken: newAccessToken,
    refreshToken: input.refreshToken,
    currentRoleCode: currentRoleCode ?? null,
    expiresAt: getAccessTokenExpiresAt(),
    refreshExpiresAt: session.refreshExpiresAt,
  });

  const unionUserInfo = {
    unionUserId: webUser.id,
    userId: webUser.id,
    account: webUser.account,
    name: webUser.name,
    roleCodeList: roleCodes,
    currentRoleCode,
    accessToken: newAccessToken,
    refreshToken: input.refreshToken,
    scene: input.scene,
    space: input.space,
  };
  return {
    accessToken: newAccessToken,
    refreshToken: input.refreshToken,
    tokenType: "Bearer",
    scene: input.scene,
    space: input.space,
    union_user_info: unionUserInfo,
    unionUserInfo,
  };
}

export async function logoutUser(input: {
  unionUserId: string;
  scene: string;
  space: string;
  accessToken?: string;
  refreshToken?: string;
}) {
  if (input.accessToken) {
    await blacklistToken({
      id: createId(),
      token: input.accessToken,
      tokenType: "access",
      expiresAt: getAccessTokenExpiresAt(),
    });
  }
  if (input.refreshToken) {
    await blacklistToken({
      id: createId(),
      token: input.refreshToken,
      tokenType: "refresh",
      expiresAt: getRefreshTokenExpiresAt(),
    });
  }
  await removeSessionByUnionSceneSpace(input.unionUserId, input.scene, input.space);
}

export async function revokeUserSessions(unionUserId: string) {
  const sessions = await listSessionsByUnionUserId(unionUserId);
  for (const session of sessions) {
    await blacklistToken({
      id: createId(),
      token: session.accessToken,
      tokenType: "access",
      expiresAt: session.expiresAt,
    });
    await blacklistToken({
      id: createId(),
      token: session.refreshToken,
      tokenType: "refresh",
      expiresAt: session.refreshExpiresAt,
    });
  }
  await removeSessionsByUnionUserId(unionUserId);
}

export async function switchCurrentRole(input: {
  unionUserId: string;
  roleCode: string;
  scene: string;
  space: string;
  refreshToken: string;
}) {
  const [role] = await db.select().from(roles).where(eq(roles.code, input.roleCode)).limit(1);
  if (!role) {
    throw new AppError("Role does not exist", 400);
  }

  const webUser = await findWebUserById(input.unionUserId);
  if (!webUser) {
    throw new AppError("User not found", 404);
  }

  const roleCodes = await queryRoleCodesByUserId(webUser.id);
  if (!roleCodes.includes(input.roleCode)) {
    throw new AppError("User does not have this role", 403);
  }

  const accessToken = await signAccessToken({
    unionUserId: webUser.id,
    webUserId: webUser.id,
    account: webUser.account,
    roleCodes,
    currentRoleCode: input.roleCode,
    scene: input.scene,
    space: input.space,
  });

  await upsertAuthSession({
    id: createId(),
    unionUserId: webUser.id,
    scene: input.scene,
    space: input.space,
    accessToken,
    refreshToken: input.refreshToken,
    currentRoleCode: input.roleCode,
    expiresAt: getAccessTokenExpiresAt(),
    refreshExpiresAt: getRefreshTokenExpiresAt(),
  });

  const unionUserInfo = {
    unionUserId: webUser.id,
    userId: webUser.id,
    account: webUser.account,
    name: webUser.name,
    roleCodeList: roleCodes,
    currentRoleCode: input.roleCode,
    accessToken,
    refreshToken: input.refreshToken,
    scene: input.scene,
    space: input.space,
  };
  return {
    accessToken,
    refreshToken: input.refreshToken,
    tokenType: "Bearer",
    currentRoleCode: input.roleCode,
    roleCodeList: roleCodes,
    union_user_info: unionUserInfo,
    unionUserInfo,
  };
}
