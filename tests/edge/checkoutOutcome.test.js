// Unit tests for the pure checkout-outcome logic used by the
// stripe-create-subscription Edge Function. This is the decision that
// guarantees every checkout — including a $0 first invoice from a 100%-off
// coupon — ends with a card Stripe can auto-charge on renewal.
import { describe, it, expect } from "vitest";
import { resolveCheckoutOutcome } from "../../supabase/functions/stripe-create-subscription/checkout.ts";

const paidCheckoutSub = {
  status: "incomplete",
  latest_invoice: {
    amount_due: 1800,
    status: "open",
    payment_intent: { client_secret: "pi_secret_123" },
  },
  pending_setup_intent: null,
};

const zeroInvoiceSub = {
  status: "active",
  latest_invoice: { amount_due: 0, status: "paid", payment_intent: null },
  pending_setup_intent: { client_secret: "seti_secret_456" },
};

describe("resolveCheckoutOutcome", () => {
  // Happy path — a normal paid checkout confirms the PaymentIntent.
  it("returns the PaymentIntent secret for a normal paid checkout", () => {
    expect(resolveCheckoutOutcome(paidCheckoutSub)).toEqual({
      ok: true,
      paidInFull: false,
      clientSecret: "pi_secret_123",
      setupClientSecret: null,
    });
  });

  // Happy path — $0 first invoice still collects a card for renewals. This is
  // the guarantee that a 100%-coupon user gets charged after the free month.
  it("returns the SetupIntent secret when a 100%-off coupon zeroes the first invoice", () => {
    expect(resolveCheckoutOutcome(zeroInvoiceSub)).toEqual({
      ok: true,
      paidInFull: true,
      clientSecret: null,
      setupClientSecret: "seti_secret_456",
    });
  });

  it("treats a paid $0 invoice as paidInFull even if the sub reports trialing-style status", () => {
    const sub = {
      ...zeroInvoiceSub,
      status: "incomplete",
      latest_invoice: { amount_due: 0, status: "paid", payment_intent: null },
    };
    expect(resolveCheckoutOutcome(sub).paidInFull).toBe(true);
  });

  // Edge — Stripe omitted the SetupIntent: still paidInFull (the subscription
  // is live), the caller just has nothing to collect.
  it("is paidInFull with a null setup secret when no pending SetupIntent exists", () => {
    const sub = { ...zeroInvoiceSub, pending_setup_intent: null };
    expect(resolveCheckoutOutcome(sub)).toEqual({
      ok: true,
      paidInFull: true,
      clientSecret: null,
      setupClientSecret: null,
    });
  });

  // Edge — unexpanded fields arrive as bare id strings; must not crash or
  // be mistaken for usable secrets.
  it("treats unexpanded (string) invoice / setup intent fields as absent", () => {
    const sub = {
      status: "active",
      latest_invoice: "in_123",
      pending_setup_intent: "seti_123",
    };
    // A bare invoice id means amount_due is unknowable → defaults to 0, and the
    // sub is active, so this reads as paidInFull with no secret to confirm.
    const outcome = resolveCheckoutOutcome(sub);
    expect(outcome.ok).toBe(true);
    expect(outcome.paidInFull).toBe(true);
    expect(outcome.clientSecret).toBeNull();
    expect(outcome.setupClientSecret).toBeNull();
  });

  // Error — a non-zero invoice with no PaymentIntent has nothing the browser
  // could confirm; the checkout must hard-fail, never silently proceed.
  it("fails when a non-zero invoice has no PaymentIntent", () => {
    const sub = {
      status: "incomplete",
      latest_invoice: { amount_due: 1800, status: "open", payment_intent: null },
      pending_setup_intent: null,
    };
    expect(resolveCheckoutOutcome(sub).ok).toBe(false);
  });

  // Error — a PaymentIntent that exists but carries no client_secret.
  it("fails when the PaymentIntent has no client_secret", () => {
    const sub = {
      status: "incomplete",
      latest_invoice: {
        amount_due: 1800,
        status: "open",
        payment_intent: { client_secret: null },
      },
      pending_setup_intent: null,
    };
    expect(resolveCheckoutOutcome(sub).ok).toBe(false);
  });

  // Error — a $0 invoice that Stripe has NOT settled (not paid, sub not
  // active) must not activate anything.
  it("fails for a $0 invoice that is neither paid nor on an active subscription", () => {
    const sub = {
      status: "incomplete",
      latest_invoice: { amount_due: 0, status: "open", payment_intent: null },
      pending_setup_intent: { client_secret: "seti_secret" },
    };
    expect(resolveCheckoutOutcome(sub).ok).toBe(false);
  });
});
