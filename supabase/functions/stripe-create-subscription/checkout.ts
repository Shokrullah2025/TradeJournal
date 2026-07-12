// Pure, dependency-free checkout-outcome logic shared by the
// stripe-create-subscription Edge Function (Deno) and the Vitest unit suite
// (Node). Keep this module free of Deno/esm/Stripe imports so it can be
// imported from both runtimes.

export interface CheckoutInvoice {
  amount_due?: number | null;
  status?: string | null;
  payment_intent?: { client_secret?: string | null } | string | null;
}

export interface CheckoutSubscription {
  status: string;
  latest_invoice?: CheckoutInvoice | string | null;
  pending_setup_intent?: { client_secret?: string | null } | string | null;
}

export interface CheckoutOutcome {
  ok: boolean;
  /** First invoice was $0 (100%-off coupon) — Stripe activated with no charge. */
  paidInFull: boolean;
  /** PaymentIntent secret — confirm to charge the first invoice now. */
  clientSecret: string | null;
  /**
   * SetupIntent secret — present on the paidInFull path. Nothing is due today,
   * but the card MUST still be collected or the subscription has no payment
   * method and every renewal invoice will fail: the customer would never be
   * charged after month 1. Stripe supplies `pending_setup_intent` on
   * `default_incomplete` subscriptions whose first invoice needs no payment
   * exactly for this; confirming it (with save_default_payment_method:
   * "on_subscription") saves the card as the subscription default.
   */
  setupClientSecret: string | null;
}

// An expanded sub-object may still arrive as a bare id string if the expand
// param is dropped — treat that the same as absent rather than crashing.
function asObject<T>(value: T | string | null | undefined): T | null {
  return value && typeof value === "object" ? value : null;
}

/**
 * Decide what the browser must confirm for a subscription just created with
 * `payment_behavior: "default_incomplete"`.
 *
 * - Normal checkout: a PaymentIntent exists → return its client_secret.
 * - $0 first invoice (100%-off coupon): no PaymentIntent; the invoice is paid
 *   out of band and the subscription is already active → paidInFull, and the
 *   pending SetupIntent's secret is returned so the card is still collected
 *   for renewals.
 * - Anything else (missing secret, unpaid non-zero invoice with no intent) is
 *   a hard failure — never let a checkout proceed without something for the
 *   renewal cycle to charge.
 */
export function resolveCheckoutOutcome(sub: CheckoutSubscription): CheckoutOutcome {
  const invoice = asObject(sub.latest_invoice);
  const paymentIntent = asObject(invoice?.payment_intent);
  const setupIntent = asObject(sub.pending_setup_intent);

  if (paymentIntent?.client_secret) {
    return {
      ok: true,
      paidInFull: false,
      clientSecret: paymentIntent.client_secret,
      setupClientSecret: null,
    };
  }

  const paidInFull =
    !paymentIntent &&
    (invoice?.amount_due ?? 0) === 0 &&
    (invoice?.status === "paid" || sub.status === "active");

  if (paidInFull) {
    return {
      ok: true,
      paidInFull: true,
      clientSecret: null,
      setupClientSecret: setupIntent?.client_secret ?? null,
    };
  }

  // A PaymentIntent without a secret, or a non-zero invoice with no intent at
  // all — nothing the browser could confirm, so fail the checkout.
  return { ok: false, paidInFull: false, clientSecret: null, setupClientSecret: null };
}
