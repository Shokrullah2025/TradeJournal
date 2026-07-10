// ── Plan pricing math ──────────────────────────────────────────────────────
// Single source of the annual-price / savings formula, shared by the marketing
// Pricing page and the in-app Billing plan cards so both always show the same
// numbers.

// Annual billing gives 2 months free (pay for 10, get 12) → ~17% off.
export const ANNUAL_FREE_MONTHS = 2;

// Derive a plan's annual price from its live monthly price. An explicitly
// configured annual amount (from the admin Pricing tab) wins, but only if it's
// actually cheaper than 12 months — otherwise fall back to the derived amount
// so the "savings" can never go negative.
export function annualPriceFor(monthly, explicit) {
  if (!monthly || monthly <= 0) return 0;
  if (explicit != null && explicit > 0 && explicit < monthly * 12) return explicit;
  return Math.round(monthly * (12 - ANNUAL_FREE_MONTHS));
}

// Real percentage saved by paying `yearly` instead of 12 × `monthly`.
export function savingsPercent(monthly, yearly) {
  if (!monthly || monthly <= 0 || !yearly || yearly <= 0) return 0;
  return Math.round((1 - yearly / (monthly * 12)) * 100);
}
