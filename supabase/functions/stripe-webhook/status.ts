// Pure, dependency-free billing-status helpers shared by the stripe-webhook
// Edge Function (Deno) and the Vitest unit suite (Node). Keep this module free
// of Deno/esm/Stripe imports so it can be imported from both runtimes.

/**
 * Map a Stripe subscription status to our user_subscriptions.status value.
 *
 * Note: `trialing` is preserved as its own state (migration 025 added it to the
 * CHECK constraint). It must NOT be folded into `active`, otherwise trial vs paid
 * subscriptions become indistinguishable and conversion analytics break.
 */
export function stripeStatusToDb(status: string): string {
  switch (status) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "canceled":
      return "cancelled";
    case "past_due":
    case "incomplete":
    case "incomplete_expired":
    case "unpaid":
    case "paused":
      return "suspended";
    default:
      return "suspended";
  }
}

/**
 * Decide which subscription_events row (if any) a `customer.subscription.updated`
 * webhook should log, based on the previous DB status and the new Stripe state.
 *
 * - trialing → active                      ⇒ trial_converted (auto-charge succeeded)
 * - trialing → cancel_at_period_end:true   ⇒ trial_cancelled (user cancelled mid-trial)
 * - anything else                          ⇒ null (no trial-lifecycle event)
 */
export function classifyUpdateEvent(
  oldDbStatus: string | null | undefined,
  newStripeStatus: string,
  cancelAtPeriodEnd: boolean,
): string | null {
  if (oldDbStatus !== "trialing") return null;
  if (stripeStatusToDb(newStripeStatus) === "active") return "trial_converted";
  if (cancelAtPeriodEnd) return "trial_cancelled";
  return null;
}

/**
 * Decide which subscription_events row (if any) a `customer.subscription.deleted`
 * webhook should log. Only meaningful while the subscription was still trialing.
 *
 * - deleted because the trial ended with no usable card ⇒ trial_expired
 * - deleted for any other reason (explicit cancellation) ⇒ trial_cancelled
 */
export function classifyDeleteEvent(
  oldDbStatus: string | null | undefined,
  cancellationReason: string | null | undefined,
): string | null {
  if (oldDbStatus !== "trialing") return null;
  return cancellationReason === "payment_failed" ? "trial_expired" : "trial_cancelled";
}
