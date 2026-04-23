/** 纯函数：便于单测，与接口层 RBAC 判定一致 */

export function isSuperAdminRole(roleCodes: string[]): boolean {
  return roleCodes.includes("SUPER_ADMIN");
}

export function hasAnyAssignedPermission(grantedCodes: string[], requiredCodes: string[]): boolean {
  if (!requiredCodes.length) return false;
  const set = new Set(grantedCodes);
  return requiredCodes.some((code) => set.has(code));
}
