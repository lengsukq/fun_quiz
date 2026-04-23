import { describe, expect, it } from "vitest";

import { hasAnyAssignedPermission, isSuperAdminRole } from "@/lib/auth/rbac-check";

describe("rbac-check", () => {
  it("isSuperAdminRole 仅在包含 SUPER_ADMIN 时为真", () => {
    expect(isSuperAdminRole(["ADMIN"])).toBe(false);
    expect(isSuperAdminRole(["SUPER_ADMIN"])).toBe(true);
    expect(isSuperAdminRole(["ADMIN", "SUPER_ADMIN"])).toBe(true);
  });

  it("hasAnyAssignedPermission 在授予与需求有交集时为真", () => {
    expect(hasAnyAssignedPermission(["quiz:read"], ["quiz:read"])).toBe(true);
    expect(hasAnyAssignedPermission(["quiz:read", "sys:user"], ["quiz:write"])).toBe(false);
    expect(hasAnyAssignedPermission(["a"], [])).toBe(false);
    expect(hasAnyAssignedPermission([], ["quiz:read"])).toBe(false);
  });
});
