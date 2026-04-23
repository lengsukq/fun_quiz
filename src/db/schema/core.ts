import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

const id = () => varchar("id", { length: 64 }).primaryKey();
const createdAt = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).defaultNow().notNull();

export const webUsers = pgTable("ct_web_user", {
  id: id(),
  name: varchar("name", { length: 64 }).notNull(),
  account: varchar("account", { length: 64 }).notNull(),
  passwordSalt: varchar("password_salt", { length: 128 }).notNull(),
  passwordHash: varchar("password_hash", { length: 256 }).notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  tryCount: integer("try_count").default(0).notNull(),
  resetPassword: boolean("reset_password").default(false).notNull(),
  avatarFileInfo: varchar("avatar_file_info", { length: 64 }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [uniqueIndex("ct_web_user_account_uidx").on(table.account)]);

export const roles = pgTable("ct_role", {
  id: id(),
  name: varchar("name", { length: 64 }).notNull(),
  code: varchar("code", { length: 64 }).notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  remark: text("remark"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [uniqueIndex("ct_role_code_uidx").on(table.code)]);

export const userRoles = pgTable("ct_user_role", {
  id: id(),
  userId: varchar("user_id", { length: 64 }).notNull(),
  roleId: varchar("role_id", { length: 64 }).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  uniqueIndex("ct_user_role_user_role_uidx").on(table.userId, table.roleId),
  index("ct_user_role_user_idx").on(table.userId),
]);

export const menus = pgTable("ct_menu", {
  id: id(),
  parentId: varchar("parent_id", { length: 64 }),
  name: varchar("name", { length: 100 }).notNull(),
  code: varchar("code", { length: 100 }).notNull(),
  path: varchar("path", { length: 255 }),
  icon: varchar("icon", { length: 100 }),
  seq: integer("seq").default(0).notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [uniqueIndex("ct_menu_code_uidx").on(table.code)]);

export const permissions = pgTable("ct_permission", {
  id: id(),
  name: varchar("name", { length: 100 }).notNull(),
  code: varchar("code", { length: 100 }).notNull(),
  menuId: varchar("menu_id", { length: 64 }),
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [uniqueIndex("ct_permission_code_uidx").on(table.code)]);

export const permissionAssigns = pgTable("ct_permission_assign", {
  id: id(),
  roleId: varchar("role_id", { length: 64 }).notNull(),
  permissionId: varchar("permission_id", { length: 64 }).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [uniqueIndex("ct_permission_assign_role_permission_uidx").on(table.roleId, table.permissionId)]);

export const backendApis = pgTable("ct_backend_api", {
  id: id(),
  name: varchar("name", { length: 150 }).notNull(),
  method: varchar("method", { length: 16 }).notNull(),
  path: varchar("path", { length: 255 }).notNull(),
  ignoreAuth: boolean("ignore_auth").default(false).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const organizations = pgTable("ct_organization", {
  id: id(),
  parentId: varchar("parent_id", { length: 64 }),
  name: varchar("name", { length: 120 }).notNull(),
  seq: integer("seq").default(0).notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const depts = pgTable("ct_dept", {
  id: id(),
  organizationId: varchar("organization_id", { length: 64 }),
  parentId: varchar("parent_id", { length: 64 }),
  name: varchar("name", { length: 120 }).notNull(),
  seq: integer("seq").default(0).notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const inviteCodes = pgTable("ct_invite_code", {
  id: id(),
  code: varchar("code", { length: 64 }).notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  maxUseTimes: integer("max_use_times").default(1).notNull(),
  usedTimes: integer("used_times").default(0).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [uniqueIndex("ct_invite_code_code_uidx").on(table.code)]);

export const quizzes = pgTable("bt_quiz", {
  id: id(),
  name: varchar("name", { length: 120 }).notNull(),
  code: varchar("code", { length: 120 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 32 }).default("fun").notNull(),
  quizType: varchar("quiz_type", { length: 50 }).default("score").notNull(),
  status: varchar("status", { length: 32 }).default("draft").notNull(),
  algoConfig: jsonb("algo_config").$type<Record<string, unknown>>().default({}).notNull(),
  specialRules: jsonb("special_rules").$type<Record<string, unknown>>().default({}).notNull(),
  resultConfig: jsonb("result_config").$type<Record<string, unknown>>().default({}).notNull(),
  covers: jsonb("covers").$type<Array<Record<string, unknown>>>().default([]).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [uniqueIndex("bt_quiz_code_uidx").on(table.code)]);

export const quizQuestions = pgTable("bt_quiz_question", {
  id: id(),
  quizId: varchar("quiz_id", { length: 64 }).notNull(),
  seq: integer("seq").notNull(),
  content: text("content").notNull(),
  options: jsonb("options").$type<Array<Record<string, unknown>>>().default([]).notNull(),
  branchConfig: jsonb("branch_config").$type<Record<string, unknown>>().default({}).notNull(),
  isHidden: boolean("is_hidden").default(false).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [index("bt_quiz_question_quiz_idx").on(table.quizId)]);

export const quizOutcomes = pgTable("bt_quiz_outcome", {
  id: id(),
  quizId: varchar("quiz_id", { length: 64 }).notNull(),
  code: varchar("code", { length: 120 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description"),
  matchConfig: jsonb("match_config").$type<Record<string, unknown>>().default({}).notNull(),
  isFallback: boolean("is_fallback").default(false).notNull(),
  isSpecial: boolean("is_special").default(false).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [index("bt_quiz_outcome_quiz_idx").on(table.quizId)]);

export const quizTokens = pgTable("bt_quiz_token", {
  id: id(),
  token: varchar("token", { length: 128 }).notNull(),
  status: varchar("status", { length: 32 }).default("active").notNull(),
  maxUses: integer("max_uses").default(1).notNull(),
  usedCount: integer("used_count").default(0).notNull(),
  batchCode: varchar("batch_code", { length: 64 }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  extra: jsonb("extra").$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [uniqueIndex("bt_quiz_token_token_uidx").on(table.token)]);

export const quizTokenQuizzes = pgTable("bt_quiz_token_quiz", {
  id: id(),
  tokenId: varchar("token_id", { length: 64 }).notNull(),
  quizId: varchar("quiz_id", { length: 64 }).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [uniqueIndex("bt_quiz_token_quiz_uidx").on(table.tokenId, table.quizId)]);

export const quizResults = pgTable("bt_quiz_result", {
  id: id(),
  tokenId: varchar("token_id", { length: 64 }).notNull(),
  quizId: varchar("quiz_id", { length: 64 }).notNull(),
  answers: jsonb("answers").$type<Array<Record<string, unknown>>>().default([]).notNull(),
  calcResult: jsonb("calc_result").$type<Record<string, unknown>>().default({}).notNull(),
  outcomeCode: varchar("outcome_code", { length: 120 }),
  outcomeId: varchar("outcome_id", { length: 64 }),
  score: integer("score").default(0).notNull(),
  shareImage: text("share_image"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  index("bt_quiz_result_token_idx").on(table.tokenId),
  index("bt_quiz_result_quiz_idx").on(table.quizId),
]);

export const fileInfos = pgTable("ct_file_info", {
  id: id(),
  storageKey: varchar("storage_key", { length: 255 }).notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 120 }),
  size: bigint("size", { mode: "number" }).default(0).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const authSessions = pgTable("ct_auth_session", {
  id: id(),
  unionUserId: varchar("union_user_id", { length: 64 }).notNull(),
  scene: varchar("scene", { length: 32 }).notNull(),
  space: varchar("space", { length: 32 }).notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  currentRoleCode: varchar("current_role_code", { length: 64 }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  refreshExpiresAt: timestamp("refresh_expires_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  uniqueIndex("ct_auth_session_union_scene_space_uidx").on(table.unionUserId, table.scene, table.space),
  index("ct_auth_session_refresh_idx").on(table.refreshToken),
]);

export const tokenBlacklists = pgTable("ct_token_blacklist", {
  id: id(),
  token: text("token").notNull(),
  tokenType: varchar("token_type", { length: 16 }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [uniqueIndex("ct_token_blacklist_token_uidx").on(table.token)]);
