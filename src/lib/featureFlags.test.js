import { describe, it, expect } from "vitest";
import {
  resolveAudience,
  evaluateFlag,
  FEATURE_CATALOG,
  AUDIENCES,
} from "./featureFlags";

describe("resolveAudience", () => {
  it("returns 'admin' for admins regardless of plan (precedence)", () => {
    expect(resolveAudience({ role: "admin" })).toBe("admin");
    expect(resolveAudience({ role: "admin", planSlug: "pro", isTrial: true })).toBe("admin");
  });

  it("returns 'trial' for a trialing non-admin even if a plan is present", () => {
    expect(resolveAudience({ role: "user", planSlug: "pro", isTrial: true })).toBe("trial");
  });

  it("returns the plan slug for paid non-trial users (happy path)", () => {
    expect(resolveAudience({ role: "user", planSlug: "basic" })).toBe("basic");
    expect(resolveAudience({ role: "user", planSlug: "pro" })).toBe("pro");
    expect(resolveAudience({ role: "user", planSlug: "enterprise" })).toBe("enterprise");
  });

  it("falls back to 'free' for unknown plan, no plan, or no args (edge cases)", () => {
    expect(resolveAudience({ role: "user", planSlug: "mystery" })).toBe("free");
    expect(resolveAudience({ role: "user" })).toBe("free");
    expect(resolveAudience({})).toBe("free");
    expect(resolveAudience()).toBe("free");
  });
});

describe("evaluateFlag", () => {
  it("fails open when there is no flag record (never hide by accident)", () => {
    expect(evaluateFlag(undefined, "free")).toBe(true);
    expect(evaluateFlag(null, "pro")).toBe(true);
  });

  it("is off for everyone when the master switch is disabled", () => {
    expect(evaluateFlag({ enabled: false, audiences: {} }, "admin")).toBe(false);
    expect(evaluateFlag({ enabled: false, audiences: { pro: true } }, "pro")).toBe(false);
  });

  it("blocks only the audiences explicitly set to false (happy path)", () => {
    const flag = { enabled: true, audiences: { free: false, trial: false } };
    expect(evaluateFlag(flag, "free")).toBe(false);
    expect(evaluateFlag(flag, "trial")).toBe(false);
    expect(evaluateFlag(flag, "pro")).toBe(true); // not listed → allowed
    expect(evaluateFlag(flag, "admin")).toBe(true);
  });

  it("allows audiences explicitly set to true and treats missing audiences map as allowed (edge cases)", () => {
    expect(evaluateFlag({ enabled: true, audiences: { free: true } }, "free")).toBe(true);
    expect(evaluateFlag({ enabled: true }, "free")).toBe(true); // no audiences key
  });
});

describe("catalog integrity", () => {
  it("every catalog feature has a unique key and a name", () => {
    const keys = FEATURE_CATALOG.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
    FEATURE_CATALOG.forEach((f) => {
      expect(typeof f.key).toBe("string");
      expect(f.name.length).toBeGreaterThan(0);
    });
  });

  it("exposes the expected audience columns in order", () => {
    expect(AUDIENCES.map((a) => a.key)).toEqual([
      "free",
      "trial",
      "basic",
      "pro",
      "enterprise",
      "admin",
    ]);
  });
});
