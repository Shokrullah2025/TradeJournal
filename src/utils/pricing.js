// ── Plan pricing math ──────────────────────────────────────────────────────
// Single source of the annual-price / savings formula, shared by the marketing
// Pricing page and the in-app Billing plan cards so both always show the same
// numbers.

// Annual billing gives 2 months free (pay for 10, get 12) → ~17% off.
export const ANNUAL_FREE_MONTHS = 2;

// A plan's displayed annual price. The amount configured in the admin Pricing
// tab always wins — it's what Stripe actually charges, so the display must
// match it exactly whatever it is. Only when no annual price is configured do
// we fall back to the derived 2-months-free amount.
export function annualPriceFor(monthly, explicit) {
  if (explicit != null && Number(explicit) > 0) return Number(explicit);
  if (!monthly || monthly <= 0) return 0;
  return Math.round(monthly * (12 - ANNUAL_FREE_MONTHS));
}

// Real percentage saved by paying `yearly` instead of 12 × `monthly`, clamped
// at 0 so a non-discounted annual price shows no savings badge rather than a
// negative number.
export function savingsPercent(monthly, yearly) {
  if (!monthly || monthly <= 0 || !yearly || yearly <= 0) return 0;
  return Math.max(0, Math.round((1 - yearly / (monthly * 12)) * 100));
}
