// ── Plan usage-limit helpers ────────────────────────────────────────────────
// Pure helpers shared by the trade and backtest gates. The DB convention is
// that a cap of 0 (or null/negative) means "unlimited" — never a hard zero.

// True when a cap means "no limit at all".
export const isUnlimited = (max) => !max || max <= 0;

// True when a fresh create would exceed the cap, given the current count.
export function limitReached(count, max) {
  if (isUnlimited(max)) return false;
  return count >= max;
}

// "3 / 50" style usage label; returns just the count when unlimited.
export function formatUsage(count, max) {
  return isUnlimited(max) ? String(count) : `${count} / ${max}`;
}
