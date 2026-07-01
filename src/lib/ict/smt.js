// SMT (Smart Money Technique) divergence — a crack in correlation between two
// instruments that normally move together. When one index runs its prior
// high/low and its pair fails to confirm, the unconfirmed move is suspect.
// Indices only for now; other groups can be added to the pair map later.

import { MARKET_TZ } from "../signals/sessions";
import { dayKeyInTz } from "../signals/indicators";
import { weeklyContext, buildWeeksIndex } from "./weekly";

export const SMT_PAIRS = {
  ES: "NQ",
  NQ: "ES",
  YM: "ES",
  RTY: "ES",
  MES: "NQ", // MES tracks ES itself, so its divergence pair is NQ
  MNQ: "ES",
};

export function smtPairFor(symbol) {
  return SMT_PAIRS[symbol] ?? null;
}

/** Day-key → candle map for O(1) date-aligned sibling lookups. */
export function buildDayKeyMap(dailyCandles, tz = MARKET_TZ) {
  const map = new Map();
  for (const c of dailyCandles || []) map.set(dayKeyInTz(c.time, tz), c);
  return map;
}

/**
 * SMT divergence for dailyA[i] against its sibling series.
 *
 * Daily: A takes its prior-day high while B fails to take its own → bearish;
 * A takes its prior-day low while B holds its own → bullish; both fire →
 * null (conflicting). Alignment is by ET day-key, never by array position —
 * one series having a holiday the other traded must not shift the comparison.
 *
 * Weekly: same idea on prior-week extremes via weeklyContext, with B
 * truncated to day-keys ≤ A[i]'s so a backtest replay never sees sibling
 * data from the future.
 *
 * @param dailyA   the analyzed symbol's daily candles (ascending)
 * @param dailyB   sibling's daily candles, or null → { available: false }
 * @param i        index into dailyA of the day being analyzed
 * @param opts.bByKey   optional prebuilt buildDayKeyMap(dailyB)
 * @param opts.aWeekly  optional precomputed weeklyContext(dailyA, i) to reuse
 * @param opts.bIndex   optional buildSmtSiblingIndex(dailyB) — together these
 *                      three make a full-history replay O(n) instead of O(n²)
 */
export function computeSmt(dailyA, dailyB, i, {
  tz = MARKET_TZ, bByKey = null, pairSymbol = null, aWeekly = null, bIndex = null,
} = {}) {
  if (!Array.isArray(dailyB) || dailyB.length === 0) {
    return { available: false, pairSymbol: null, daily: null, weekly: null, detail: null };
  }
  if (!Array.isArray(dailyA) || i < 1 || i >= dailyA.length) {
    return { available: true, pairSymbol, daily: null, weekly: null, detail: null };
  }

  const keyOf = (c) => dayKeyInTz(c.time, tz);
  const bMap = bByKey || buildDayKeyMap(dailyB, tz);

  const a = dailyA[i];
  const aPrev = dailyA[i - 1];
  const b = bMap.get(keyOf(a));
  const bPrev = bMap.get(keyOf(aPrev));

  let daily = null;
  let detail = null;
  if (b && bPrev) {
    const aTookHigh = a.high > aPrev.high;
    const aTookLow = a.low < aPrev.low;
    const bTookHigh = b.high > bPrev.high;
    const bTookLow = b.low < bPrev.low;
    const bearish = aTookHigh && !bTookHigh;
    const bullish = aTookLow && !bTookLow;
    if (bearish && !bullish) daily = "bearish";
    else if (bullish && !bearish) daily = "bullish";
    detail = {
      aHigh: a.high, aPrevHigh: aPrev.high, aLow: a.low, aPrevLow: aPrev.low,
      bHigh: b.high, bPrevHigh: bPrev.high, bLow: b.low, bPrevLow: bPrev.low,
    };
  }

  // Weekly: truncate B to A's analyzed date so replays are lookahead-free.
  // weeklyContext only reads candles[0..idx], so pointing it at the last B
  // index dated ≤ aKey is equivalent to physically slicing the array.
  let weekly = null;
  const aKey = keyOf(a);
  let wB = null;
  if (bIndex) {
    const idxB = lastIndexAtOrBefore(bIndex.keys, aKey);
    if (idxB >= 1) wB = weeklyContext(dailyB, idxB, tz, bIndex.weeksIndex);
  } else {
    const bUpto = dailyB.filter((c) => keyOf(c) <= aKey);
    if (bUpto.length > 1) wB = weeklyContext(bUpto, bUpto.length - 1, tz);
  }
  if (wB) {
    const wA = aWeekly || weeklyContext(dailyA, i, tz);
    if (wA.currentWeek && wB.currentWeek && wA.prevWeek && wB.prevWeek) {
      const bearishW = wA.currentWeek.tookPrevWeekHigh && !wB.currentWeek.tookPrevWeekHigh;
      const bullishW = wA.currentWeek.tookPrevWeekLow && !wB.currentWeek.tookPrevWeekLow;
      if (bearishW && !bullishW) weekly = "bearish";
      else if (bullishW && !bearishW) weekly = "bullish";
    }
  }

  return { available: true, pairSymbol, daily, weekly, detail };
}

/** Prebuilds the sibling-side lookups that make computeSmt O(1) per call. */
export function buildSmtSiblingIndex(dailyB, tz = MARKET_TZ) {
  if (!Array.isArray(dailyB) || dailyB.length === 0) return null;
  return {
    byKey: buildDayKeyMap(dailyB, tz),
    keys: dailyB.map((c) => dayKeyInTz(c.time, tz)), // ascending ISO dates
    weeksIndex: buildWeeksIndex(dailyB, tz),
  };
}

// Largest index whose ISO day-key is ≤ target (keys ascend; string compare is
// date-correct for YYYY-MM-DD). Returns -1 when every key is after the target.
function lastIndexAtOrBefore(keys, target) {
  let lo = 0;
  let hi = keys.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (keys[mid] <= target) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return ans;
}
