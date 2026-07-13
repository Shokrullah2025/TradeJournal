import { describe, it, expect } from "vitest";
import {
  resolveAudience,
  deriveEntitlement,
  ENTITLEMENT_GRACE_MS,
  evaluateFlag,
  FEATURE_CATALOG,
  AUDIENCES,
} from "./featureFlags";

describe("resolveAudience", () => {
  it("returns 'admin' for admins regardless of plan (precedence)", () => {
    expect(resolveAudience({ role: "admin" })).toBe("admin");
    expect(resolveAudience({ role: "admin", planSlug: "premium", isTrial: true })).toBe("admin");
  });

  it("returns 'trial' for a trialing non-admin even if a plan is present", () => {
    expect(resolveAudience({ role: "user", planSlug: "premium", isTrial: true })).toBe("trial");
  });

  it("returns the plan slug for paid non-trial users (happy path)", () => {
    // Slugs mirror subscription_plans in Supabase: basic / premium / enterprise.
    expect(resolveAudience({ role: "user", planSlug: "basic" })).toBe("basic");
    expect(resolveAudience({ role: "user", planSlug: "premium" })).toBe("premium");
    expect(resolveAudience({ role: "user", planSlug: "enterprise" })).toBe("enterprise");
  });

  it("falls back to 'free' for unknown plan, no plan, or no args (edge cases)", () => {
    // "pro" is a display name, not a slug — it must NOT resolve to a paid tier.
    expect(resolveAudience({ role: "user", planSlug: "pro" })).toBe("free");
    expect(resolveAudience({ role: "user", planSlug: "mystery" })).toBe("free");
    expect(resolveAudience({ role: "user" })).toBe("free");
    expect(resolveAudience({})).toBe("free");
    expect(resolveAudience()).toBe("free");
  });
});

describe("deriveEntitlement", () => {
  // Fixed clock so every case is deterministic.
  const NOW = new Date("2026-07-11T12:00:00Z").getTime();
  const HOUR = 60 * 60 * 1000;
  const DAY = 24 * HOUR;
  const premium = { subscription_plans: { slug: "premium" } };

  // Happy path — a live trial grants the trial audience, never the paid one.
  it("grants trial (and no plan slug) while a trial is still running", () => {
    const row = {
      status: "trialing",
      trial_end: new Date(NOW + DAY).toISOString(),
      current_period_end: new Date(NOW + DAY).toISOString(),
      ...premium,
    };
    expect(deriveEntitlement(row, NOW)).toEqual({ isTrial: true, planSlug: null });
  });

  // Regression — the production leak: an expired trial whose webhook never
  // landed must resolve to free, not to the trial row's premium plan.
  it("grants nothing for a trialing row past trial_end (expired-trial leak)", () => {
    const row = {
      status: "trialing",
      trial_end: new Date(NOW - HOUR).toISOString(),
      current_period_end: new Date(NOW - HOUR).toISOString(),
      ...premium,
    };
    const ent = deriveEntitlement(row, NOW);
    expect(ent).toEqual({ isTrial: false, planSlug: null });
    expect(resolveAudience({ role: "user", ...ent })).toBe("free");
  });

  // Edge — a trialing row with no trial_end at all can't prove it's live.
  it("does not treat a trialing row without a trial_end as a live trial", () => {
    const row = { status: "trialing", trial_end: null, current_period_end: null, ...premium };
    expect(deriveEntitlement(row, NOW)).toEqual({ isTrial: false, planSlug: null });
  });

  // Happy path — a paid subscription inside its period grants its plan.
  it("grants the plan slug for an active row inside its period", () => {
    const row = {
      status: "active",
      trial_end: null,
      current_period_end: new Date(NOW + 20 * DAY).toISOString(),
      ...premium,
    };
    const ent = deriveEntitlement(row, NOW);
    expect(ent).toEqual({ isTrial: false, planSlug: "premium" });
    expect(resolveAudience({ role: "user", ...ent })).toBe("premium");
  });

  // Edge — webhook lag on renewal: the paid user must keep access within the
  // grace window even though current_period_end has passed.
  it("keeps an active row entitled within the grace window past period end", () => {
    const row = {
      status: "active",
      trial_end: null,
      current_period_end: new Date(NOW - DAY).toISOString(), // 1 day late
      ...premium,
    };
    expect(deriveEntitlement(row, NOW).planSlug).toBe("premium");
  });

  // The auto-charge guarantee's backstop: if a renewal never gets collected
  // (no card, dead webhook), access ends once the grace window closes.
  it("grants nothing once an active row is past period end + grace", () => {
    const row = {
      status: "active",
      trial_end: null,
      current_period_end: new Date(NOW - ENTITLEMENT_GRACE_MS - HOUR).toISOString(),
      ...premium,
    };
    const ent = deriveEntitlement(row, NOW);
    expect(ent).toEqual({ isTrial: false, planSlug: null });
    expect(resolveAudience({ role: "user", ...ent })).toBe("free");
  });

  // Edge — a legacy active row without a period end stays entitled (there is
  // no date to expire against; the status is the only signal).
  it("keeps an active row without current_period_end entitled", () => {
    const row = { status: "active", trial_end: null, current_period_end: null, ...premium };
    expect(deriveEntitlement(row, NOW).planSlug).toBe("premium");
  });

  // Edge — no subscription row at all (new user, or nothing active/trialing).
  it("grants nothing when there is no row", () => {
    expect(deriveEntitlement(null, NOW)).toEqual({ isTrial: false, planSlug: null });
    expect(deriveEntitlement(undefined, NOW)).toEqual({ isTrial: false, planSlug: null });
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
      "trial",
      "basic",
      "premium",
      "enterprise",
      "admin",
    ]);
  });

  it("offers no Free column — there is no free plan to grant features to", () => {
    expect(AUDIENCES.map((a) => a.key)).not.toContain("free");
  });
});
