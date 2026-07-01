// ICT top-down daily bias — the product of this page and the directional
// HARD GATE for the entry engine that will be built on top of it: entries may
// only be taken in the bias direction (see biasForTimestamp at the bottom).
//
// Pure and deterministic: candles in → bias out. computeBiasAt(i) only reads
// candles[0..i] and sibling data dated ≤ candles[i]'s day, which is what lets
// biasBacktest.js replay the exact same function over history honestly.

import { atr, dayKeyInTz } from "../signals/indicators";
import { MARKET_TZ, weekdayInTz } from "../signals/sessions";
import { classifyCandle, dealingRange } from "./classify";
import { weeklyContext, buildWeeksIndex } from "./weekly";
import { computeSmt, buildSmtSiblingIndex, smtPairFor } from "./smt";
import { tradingDayKey } from "./sessionProfile";

export const BIAS_THRESHOLD = 25; // |net score| needed to leave neutral
export const WARMUP_DAYS = 21; // ATR14 warm-up (15) and the 20-day dealing range

const factor = (key, label, points, maxPoints, detail) => ({
  key,
  label,
  points,
  maxPoints,
  passed: points !== 0,
  detail,
});

/**
 * Bias as of the close of dailyCandles[i], applying to the NEXT trading day.
 *
 * Factor points are SIGNED: positive = long, negative = short. A factor whose
 * inputs are unavailable is included with points 0 AND maxPoints 0, so the
 * confidence denominator only counts what was actually measurable — the
 * backtest (no session data, maybe no sibling) and the live page share this
 * one function without the score meaning different things.
 *
 * @param opts.atr14        precomputed atr(dailyCandles, 14) array
 * @param opts.siblingDaily SMT pair's daily candles or null
 * @param opts.sessionDay   a buildSessionProfiles entry for candles[i]'s
 *                          trading day (live page only; null in the backtest)
 * @param opts.weeksIndex    optional buildWeeksIndex(dailyCandles) for O(n) replays
 * @param opts.siblingIndex  optional buildSmtSiblingIndex(siblingDaily)
 */
export function computeBiasAt(dailyCandles, i, {
  atr14,
  siblingDaily = null,
  sessionDay = null,
  symbol,
  weeksIndex = null,
  siblingIndex = null,
} = {}) {
  const c = dailyCandles[i];
  const p = i >= 1 ? dailyCandles[i - 1] : null;
  const dayKey = dayKeyInTz(c.time, MARKET_TZ);

  const base = {
    bias: "neutral",
    score: 0,
    maxScore: 0,
    confidencePct: 0,
    reasons: [],
    computedFrom: { dayKey, time: c.time },
    forDayKey: null,
    snapshot: null,
  };
  if (i < WARMUP_DAYS || !p) return base;

  const ref = atr14?.[i] ?? null;
  const cls = ref != null && ref > 0 ? classifyCandle(c, p, ref) : null;
  const dr = dealingRange(dailyCandles, i, 20);
  const weekly = weeklyContext(dailyCandles, i, MARKET_TZ, weeksIndex);
  const smt = computeSmt(dailyCandles, siblingDaily, i, {
    pairSymbol: smtPairFor(symbol) ?? null,
    bByKey: siblingIndex?.byKey ?? null,
    bIndex: siblingIndex,
    aWeekly: weekly,
  });

  const reasons = [];

  // 1. Daily structure — how the last completed candle behaved (max 30)
  if (cls) {
    let pts = 0;
    if ((cls.type === "expansion" || cls.type === "reversal") && cls.direction !== "none") {
      pts = cls.direction === "up" ? 30 : -30;
    } else if (cls.type === "retracement") {
      // A retracement pauses the move; assume continuation of the prior candle.
      const priorDir = p.close > p.open ? 1 : p.close < p.open ? -1 : 0;
      pts = 10 * priorDir;
    }
    reasons.push(factor("dailyStructure", "Daily candle structure", pts, 30, cls.detail));
  } else {
    reasons.push(factor("dailyStructure", "Daily candle structure", 0, 0, "Not enough history for the daily ATR reference"));
  }

  // 2. Close location within the day's range (max 10)
  if (cls) {
    const pts = cls.closeLocation === "upper" ? 10 : cls.closeLocation === "lower" ? -10 : 0;
    reasons.push(factor("closeLocation", "Daily close location", pts, 10, `Closed in the ${cls.closeLocation} third of the day's range`));
  } else {
    reasons.push(factor("closeLocation", "Daily close location", 0, 0, "Unavailable"));
  }

  // 3. Prior-day liquidity: acceptance beyond a level is trend, a failed
  //    sweep points the other way (max 15)
  if (cls) {
    let pts = 0;
    if (cls.tookPriorHigh && c.close > p.high) pts += 15; // acceptance above PDH
    if (cls.failedPriorHigh) pts -= 15; // swept buy-side and rejected
    if (cls.tookPriorLow && c.close < p.low) pts -= 15; // acceptance below PDL
    if (cls.failedPriorLow) pts += 15; // swept sell-side and rejected
    pts = Math.max(-15, Math.min(15, pts));
    const detail = pts > 0
      ? (cls.failedPriorLow ? "Swept the prior day low and rejected it" : "Accepted above the prior day high")
      : pts < 0
        ? (cls.failedPriorHigh ? "Swept the prior day high and rejected it" : "Accepted below the prior day low")
        : "Stayed between the prior day's extremes";
    reasons.push(factor("priorDayLiquidity", "Prior-day liquidity", pts, 15, detail));
  } else {
    reasons.push(factor("priorDayLiquidity", "Prior-day liquidity", 0, 0, "Unavailable"));
  }

  // 4. Premium / discount of the 20-day dealing range (max 15)
  if (dr) {
    const pts = dr.position === "discount" ? 15 : dr.position === "premium" ? -15 : 0;
    reasons.push(factor(
      "premiumDiscount", "Premium / discount", pts, 15,
      `Price at ${Math.round(dr.pctInRange * 100)}% of the 20-day range (${dr.position})`,
    ));
  } else {
    reasons.push(factor("premiumDiscount", "Premium / discount", 0, 0, "Not enough history for the 20-day range"));
  }

  // 5. Previous completed week's structure (max 8)
  if (weekly.prevWeek?.classification) {
    const wc = weekly.prevWeek.classification;
    let pts = 0;
    if ((wc.type === "expansion" || wc.type === "reversal") && wc.direction !== "none") {
      pts = wc.direction === "up" ? 8 : -8;
    }
    reasons.push(factor("weeklyStructure", "Previous week's candle", pts, 8, `${wc.type} ${wc.direction !== "none" ? wc.direction : ""}`.trim()));
  } else {
    reasons.push(factor("weeklyStructure", "Previous week's candle", 0, 0, "Not enough completed weeks"));
  }

  // 6. Current week so far (max 7)
  if (weekly.currentWeek) {
    const cw = weekly.currentWeek;
    const pts = cw.direction === "up" ? 7 : cw.direction === "down" ? -7 : 0;
    reasons.push(factor(
      "weeklySoFar", "Week so far", pts, 7,
      `${cw.daysElapsed} day${cw.daysElapsed === 1 ? "" : "s"} in, trading ${cw.direction === "none" ? "flat" : cw.direction} from the weekly open`,
    ));
  } else {
    reasons.push(factor("weeklySoFar", "Week so far", 0, 0, "Unavailable"));
  }

  // 7. Session profile of the completed day (live only — the daily-history
  //    backtest can't see intraday sessions, disclosed in the UI) (max 10)
  if (sessionDay?.annotations) {
    const j = sessionDay.annotations.judas;
    const pts = j === "bullish" ? 10 : j === "bearish" ? -10 : 0;
    reasons.push(factor(
      "sessionProfile", "Session profile (Judas swing)", pts, 10,
      j ? `London ran the Asia ${j === "bullish" ? "low" : "high"} and reversed` : "No London sweep-and-reverse of the Asia range",
    ));
  } else {
    reasons.push(factor("sessionProfile", "Session profile (Judas swing)", 0, 0, "Intraday session data unavailable"));
  }

  // 8. SMT divergence vs the correlated index (max 15)
  if (smt.available && (smt.daily !== null || smt.weekly !== null)) {
    // Daily wins when both fire; agreement reinforces, conflict cancels.
    let sig = smt.daily ?? smt.weekly;
    if (smt.daily && smt.weekly && smt.daily !== smt.weekly) sig = null;
    const pts = sig === "bullish" ? 15 : sig === "bearish" ? -15 : 0;
    reasons.push(factor(
      "smt", `SMT vs ${smt.pairSymbol}`, pts, 15,
      sig ? `${sig} divergence against ${smt.pairSymbol}` : "Conflicting daily and weekly divergence",
    ));
  } else if (smt.available) {
    reasons.push(factor("smt", `SMT vs ${smt.pairSymbol}`, 0, 15, `No divergence against ${smt.pairSymbol}`));
  } else {
    reasons.push(factor("smt", "SMT divergence", 0, 0, "No correlated pair for this asset yet"));
  }

  const score = reasons.reduce((s, f) => s + f.points, 0);
  const maxScore = reasons.reduce((s, f) => s + f.maxPoints, 0);
  const bias = score >= BIAS_THRESHOLD ? "long" : score <= -BIAS_THRESHOLD ? "short" : "neutral";

  return {
    bias,
    score,
    maxScore,
    confidencePct: maxScore > 0 ? Math.round((100 * Math.abs(score)) / maxScore) : 0,
    reasons,
    computedFrom: { dayKey, time: c.time },
    // The bias applies to the NEXT trading day (Friday close → Monday).
    forDayKey: tradingDayKey(c.time + 24 * 3600 + (dayOfWeekIsFriday(c.time) ? 2 * 24 * 3600 : 0)),
    snapshot: {
      classification: cls,
      dealingRange: dr,
      weekly,
      smt,
      session: sessionDay?.annotations ?? null,
      // The analyzed day's own extremes are the liquidity resting above/below
      // going into the next session — exactly what the backtest grades against.
      levels: {
        pdh: c.high,
        pdl: c.low,
        pwh: weekly.prevWeek?.high ?? null,
        pwl: weekly.prevWeek?.low ?? null,
        eq: dr?.eq ?? null,
      },
    },
  };
}

// Friday check via the cached Intl helper (DST-safe).
function dayOfWeekIsFriday(unixSeconds) {
  return weekdayInTz(unixSeconds, MARKET_TZ) === "Fri";
}

/**
 * Live bias: analyze the newest COMPLETED daily candle. Yahoo includes
 * today's forming daily bar during the session — evaluating it would repaint
 * all day, so a bar whose ET day matches "today" is dropped.
 */
export function computeLiveBias(dailyCandles, opts = {}, now = Date.now() / 1000) {
  if (!Array.isArray(dailyCandles) || dailyCandles.length === 0) return null;
  let series = dailyCandles;
  const last = series[series.length - 1];
  if (dayKeyInTz(last.time, MARKET_TZ) === dayKeyInTz(now, MARKET_TZ)) {
    series = series.slice(0, -1);
  }
  if (series.length <= WARMUP_DAYS) return null;
  const atr14 = opts.atr14 ?? atr(series, 14);
  return computeBiasAt(series, series.length - 1, { ...opts, atr14 });
}

/**
 * Precomputes the bias for every historical day — shared by the backtest and
 * by the future entry engine's hard gate. Aggregations (ATR, weeks, sibling
 * day-key map) are built ONCE so the replay is O(n).
 *
 * @returns { entries: biasResult[], byForDayKey: Map<dayKey, biasResult> }
 */
export function buildBiasSeries(dailyCandles, { siblingDaily = null, symbol } = {}) {
  const entries = [];
  const byForDayKey = new Map();
  if (!Array.isArray(dailyCandles) || dailyCandles.length <= WARMUP_DAYS) {
    return { entries, byForDayKey };
  }
  const atr14 = atr(dailyCandles, 14);
  const weeksIndex = buildWeeksIndex(dailyCandles);
  const siblingIndex = siblingDaily ? buildSmtSiblingIndex(siblingDaily) : null;
  for (let i = WARMUP_DAYS; i < dailyCandles.length; i++) {
    const b = computeBiasAt(dailyCandles, i, {
      atr14, siblingDaily, symbol, weeksIndex, siblingIndex, sessionDay: null,
    });
    entries.push(b);
    if (b.forDayKey) byForDayKey.set(b.forDayKey, b);
  }
  return { entries, byForDayKey };
}

/**
 * THE HARD GATE. The next-stage entry engine calls this with a candle
 * timestamp and only takes trades agreeing with the returned bias.
 * Returns null when no bias was computed for that trading day.
 */
export function biasForTimestamp(series, unixSeconds) {
  if (!series?.byForDayKey) return null;
  return series.byForDayKey.get(tradingDayKey(unixSeconds)) ?? null;
}
