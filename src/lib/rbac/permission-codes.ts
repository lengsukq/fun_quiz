/** API / 管理端权限原子（写入 ct_permission.code，与路由校验一致） */
export const PERM = {
  quizRead: "quiz:read",
  quizWrite: "quiz:write",
  quizDelete: "quiz:delete",
  quizPublish: "quiz:publish",
  quizImport: "quiz:import",
  quizAiGenerate: "quiz:ai_generate",
  quizToken: "quiz:token",
  sysUser: "sys:user",
  sysOrg: "sys:org",
  sysDept: "sys:dept",
  sysInvite: "sys:invite",
  sysStorage: "sys:storage",
  sysRoleRead: "sys:role:read",
  sysRoleAdmin: "sys:role:admin",
  sysMenuRead: "sys:menu:read",
  sysMenuAdmin: "sys:menu:admin",
  sysPermissionRead: "sys:permission:read",
  sysPermissionAdmin: "sys:permission:admin",
  sysBackendApiAdmin: "sys:backend_api:admin",
} as const;

export type PermissionCode = (typeof PERM)[keyof typeof PERM];

export type BuiltinPermissionRow = {
  id: string;
  code: PermissionCode;
  name: string;
};

/** 全量内置权限行（种子幂等 upsert） */
export const BUILTIN_PERMISSION_ROWS: BuiltinPermissionRow[] = [
  { id: "perm_quiz_read", code: PERM.quizRead, name: "测验查看" },
  { id: "perm_quiz_write", code: PERM.quizWrite, name: "测验编辑" },
  { id: "perm_quiz_delete", code: PERM.quizDelete, name: "测验删除" },
  { id: "perm_quiz_publish", code: PERM.quizPublish, name: "测验发布/种子" },
  { id: "perm_quiz_import", code: PERM.quizImport, name: "测验导入" },
  { id: "perm_quiz_ai_generate", code: PERM.quizAiGenerate, name: "AI 生成测验" },
  { id: "perm_quiz_token", code: PERM.quizToken, name: "测验 Token 管理" },
  { id: "perm_sys_user", code: PERM.sysUser, name: "人员管理" },
  { id: "perm_sys_org", code: PERM.sysOrg, name: "组织管理" },
  { id: "perm_sys_dept", code: PERM.sysDept, name: "部门管理" },
  { id: "perm_sys_invite", code: PERM.sysInvite, name: "邀请码管理" },
  { id: "perm_sys_storage", code: PERM.sysStorage, name: "文件存储" },
  { id: "perm_sys_role_read", code: PERM.sysRoleRead, name: "角色查看" },
  { id: "perm_sys_role_admin", code: PERM.sysRoleAdmin, name: "角色维护（超管）" },
  { id: "perm_sys_menu_read", code: PERM.sysMenuRead, name: "菜单查看" },
  { id: "perm_sys_menu_admin", code: PERM.sysMenuAdmin, name: "菜单维护（超管）" },
  { id: "perm_sys_permission_read", code: PERM.sysPermissionRead, name: "权限查看" },
  { id: "perm_sys_permission_admin", code: PERM.sysPermissionAdmin, name: "权限维护（超管）" },
  { id: "perm_sys_backend_api_admin", code: PERM.sysBackendApiAdmin, name: "后端 API 元数据（超管）" },
];

/** 管理员角色默认授予（不含仅超管权限） */
export const ADMIN_ROLE_PERMISSION_IDS: string[] = BUILTIN_PERMISSION_ROWS.filter(
  (row) =>
    row.code !== PERM.sysRoleAdmin &&
    row.code !== PERM.sysMenuAdmin &&
    row.code !== PERM.sysPermissionAdmin &&
    row.code !== PERM.sysBackendApiAdmin,
).map((row) => row.id);
