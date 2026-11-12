import { describe, expect, it } from "vitest";
import { checkUserChange } from "./rules";

const base = { actorId: "me", targetId: "other", targetCurrentRoles: ["SALES_STAFF"], nextRoles: ["SALES_STAFF"], nextActive: true };

describe("user management guard rails", () => {
  it("admin can manage normal staff", () => {
    expect(checkUserChange({ ...base, actorRoles: ["ADMIN"], nextRoles: ["SALES_MANAGER"] })).toBeNull();
  });

  it("only a super admin can grant super admin", () => {
    expect(checkUserChange({ ...base, actorRoles: ["ADMIN"], nextRoles: ["SUPER_ADMIN"] })).toBe("FORBIDDEN");
    expect(checkUserChange({ ...base, actorRoles: ["SUPER_ADMIN"], nextRoles: ["SUPER_ADMIN"] })).toBeNull();
  });

  it("admin cannot edit or deactivate a super admin", () => {
    expect(
      checkUserChange({ ...base, actorRoles: ["ADMIN"], targetCurrentRoles: ["SUPER_ADMIN"], nextRoles: ["SUPER_ADMIN"], nextActive: false }),
    ).toBe("FORBIDDEN");
  });

  it("nobody can lock themselves out", () => {
    const self = { ...base, targetId: "me", targetCurrentRoles: ["ADMIN"] };
    expect(checkUserChange({ ...self, actorRoles: ["ADMIN"], nextRoles: ["ADMIN"], nextActive: false })).toBe("SELF_LOCKOUT");
    expect(checkUserChange({ ...self, actorRoles: ["ADMIN"], nextRoles: ["SALES_STAFF"] })).toBe("SELF_LOCKOUT");
    expect(checkUserChange({ ...self, actorRoles: ["ADMIN"], nextRoles: ["ADMIN", "ACCOUNTANT"] })).toBeNull();
  });
});
