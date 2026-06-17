import { describe, it, expect } from "vitest";
import {
  adminUserUpdateSchema,
  validateAdminUserUpdate,
  USER_ROLES,
  USER_STATUSES,
} from "./adminUser";

describe("adminUserUpdateSchema", () => {
  it("accepts a valid role-only update (happy path)", () => {
    const r = adminUserUpdateSchema.safeParse({ role: "moderator" });
    expect(r.success).toBe(true);
  });

  it("accepts a valid status-only update and both together", () => {
    expect(adminUserUpdateSchema.safeParse({ status: "suspended" }).success).toBe(true);
    expect(adminUserUpdateSchema.safeParse({ role: "admin", status: "active" }).success).toBe(true);
  });

  it("rejects an empty update (edge case)", () => {
    expect(adminUserUpdateSchema.safeParse({}).success).toBe(false);
  });

  it("rejects role/status values outside the allowed set (error case)", () => {
    expect(adminUserUpdateSchema.safeParse({ role: "superuser" }).success).toBe(false);
    expect(adminUserUpdateSchema.safeParse({ status: "banned" }).success).toBe(false);
    // 'deleted' is a valid DB status but intentionally not editable from the UI
    expect(adminUserUpdateSchema.safeParse({ status: "deleted" }).success).toBe(false);
  });

  it("rejects unknown keys so arbitrary columns can't be smuggled in (security)", () => {
    const r = adminUserUpdateSchema.safeParse({ role: "user", failed_login_attempts: 0 });
    expect(r.success).toBe(false);
  });
});

describe("validateAdminUserUpdate", () => {
  it("returns the cleaned payload for valid input", () => {
    expect(validateAdminUserUpdate({ status: "active" })).toEqual({ status: "active" });
  });

  it("throws a friendly error for invalid input", () => {
    expect(() => validateAdminUserUpdate({ role: "root" })).toThrow();
    expect(() => validateAdminUserUpdate({})).toThrow(/no valid fields/i);
  });

  it("keeps the allowed-value lists in sync with the DB CHECK constraints", () => {
    expect(USER_ROLES).toEqual(["user", "moderator", "admin"]);
    expect(USER_STATUSES).toEqual(["active", "inactive", "suspended"]);
  });
});
