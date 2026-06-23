// Unit tests for the pure billing-status decision logic shared by the
// stripe-webhook Edge Function. These cover the trial → paid conversion mapping
// that drives "charge the customer if they don't cancel".
import { describe, it, expect } from "vitest";
import {
  stripeStatusToDb,
  classifyUpdateEvent,
  classifyDeleteEvent,
} from "../../supabase/functions/stripe-webhook/status.ts";

describe("stripeStatusToDb", () => {
  // Happy path — the states a healthy subscription moves through.
  it("maps active to active", () => {
    expect(stripeStatusToDb("active")).toBe("active");
  });

  it("preserves trialing as its own state (not collapsed into active)", () => {
    expect(stripeStatusToDb("trialing")).toBe("trialing");
  });

  it("maps Stripe 'canceled' to our 'cancelled' spelling", () => {
    expect(stripeStatusToDb("canceled")).toBe("cancelled");
  });

  // Edge — every dunning/incomplete state must read as suspended.
  it.each(["past_due", "incomplete", "incomplete_expired", "unpaid", "paused"])(
    "maps %s to suspended",
    (status) => {
      expect(stripeStatusToDb(status)).toBe("suspended");
    },
  );

  // Error/unknown — an unrecognised status must fail safe to suspended, never active.
  it("maps an unknown status to suspended", () => {
    expect(stripeStatusToDb("some_future_status")).toBe("suspended");
    expect(stripeStatusToDb("")).toBe("suspended");
  });
});

describe("classifyUpdateEvent", () => {
  // Happy path — the auto-charge at trial end flips trialing → active.
  it("logs trial_converted when a trialing sub becomes active", () => {
    expect(classifyUpdateEvent("trialing", "active", false)).toBe("trial_converted");
  });

  it("logs trial_cancelled when a trialing sub is set to cancel at period end", () => {
    expect(classifyUpdateEvent("trialing", "trialing", true)).toBe("trial_cancelled");
  });

  // Edge — updates to non-trialing subscriptions produce no trial event.
  it("returns null when the prior status was not trialing", () => {
    expect(classifyUpdateEvent("active", "active", false)).toBeNull();
    expect(classifyUpdateEvent("suspended", "active", false)).toBeNull();
    expect(classifyUpdateEvent(null, "active", false)).toBeNull();
  });

  // Edge — a trial that is merely updated (still trialing, not cancelling) is a no-op.
  it("returns null for a trialing sub that stays trialing without cancelling", () => {
    expect(classifyUpdateEvent("trialing", "trialing", false)).toBeNull();
  });
});

describe("classifyDeleteEvent", () => {
  // Happy path — trial ended with no usable card ⇒ expired.
  it("logs trial_expired when a trialing sub is deleted for payment_failed", () => {
    expect(classifyDeleteEvent("trialing", "payment_failed")).toBe("trial_expired");
  });

  // Happy path — user cancelled during the trial ⇒ cancelled.
  it("logs trial_cancelled when a trialing sub is deleted for any other reason", () => {
    expect(classifyDeleteEvent("trialing", "cancellation_requested")).toBe("trial_cancelled");
    expect(classifyDeleteEvent("trialing", null)).toBe("trial_cancelled");
  });

  // Edge — deleting an already-paid (non-trialing) subscription is not a trial event.
  it("returns null when the prior status was not trialing", () => {
    expect(classifyDeleteEvent("active", "payment_failed")).toBeNull();
    expect(classifyDeleteEvent(null, null)).toBeNull();
  });
});
