// Weekly candle aggregation and context, ET-correct. Weeks are Monday–Friday
// in the exchange timezone, keyed by the Monday's calendar day. All weekday /
// day-key math goes through Intl (via sessions.js / indicators.js helpers) so
// DST transitions never shift a bar into the wrong week.

import { MARKET_TZ, weekdayInTz } from "../signals/sessions";
import { dayKeyInTz } from "../signals/indicators";
import { classifyCandle } from "./classify";

// Days to subtract to reach the week's Monday. Sunday-dated bars (Globex open;
// shouldn't come from Yahoo daily data, but guard it) fold FORWARD into the
// following Monday's week; Saturday bars are dropped.
const DAYS_BACK_TO_MONDAY = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sun: -1 };

const DAY_SEC = 24 * 3600;

/** The ET day-key of the Monday of the week this timestamp's trading day belongs to. */
export function weekKeyOf(unixSeconds, tz = MARKET_TZ) {
  const wd = weekdayInTz(unixSeconds, tz);
  const back = DAYS_BACK_TO_MONDAY[wd];
  if (back === undefined) return null; // Saturday
  // Shifting by whole days on a mid-day timestamp can't cross a DST boundary
  // in a way that changes the calendar day (transitions happen at 02:00).
  return dayKeyInTz(unixSeconds - back * DAY_SEC, tz);
}

/**
 * Aggregates ascending daily candles into Mon–Fri weekly candles.
 * @returns [{ weekKey, time, open, high, low, close, days }] ascending
 */
export function aggregateToWeeks(dailyCandles, tz = MARKET_TZ) {
  const weeks = [];
  let cur = null;
  for (const c of dailyCandles) {
    const key = weekKeyOf(c.time, tz);
    if (key == null) continue; // Saturday bar — drop
    if (!cur || cur.weekKey !== key) {
      cur = {
        weekKey: key,
        time: c.time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        days: 1,
      };
      weeks.push(cur);
    } else {
      cur.high = Math.max(cur.high, c.high);
      cur.low = Math.min(cur.low, c.low);
      cur.close = c.close;
      cur.days += 1;
    }
  }
  return weeks;
}

// Reference range for weekly classification: simple mean of the last 8
// completed weekly ranges. Chosen over a weekly ATR to avoid a second Wilder
// warm-up on a short series; 4 completed weeks minimum.
function weeklyRefRange(weeks, uptoExclusive) {
  const ranges = [];
  for (let k = Math.max(0, uptoExclusive - 8); k < uptoExclusive; k++) {
    ranges.push(weeks[k].high - weeks[k].low);
  }
  if (ranges.length < 4) return null;
  return ranges.reduce((s, r) => s + r, 0) / ranges.length;
}

/**
 * Weekly context as of daily index i (uses candles[0..i] only — safe for the
 * bias backtest). `weeksIndex` lets callers pass a pre-aggregated full-series
 * week list plus a weekKey→index map to keep replay O(n); when provided, it
 * MUST have been built from the same candle array.
 *
 * @returns {
 *   prevWeek: { weekKey, high, low, close, classification } | null,
 *   currentWeek: { weekKey, open, high, low, closeSoFar, direction, daysElapsed,
 *                  tookPrevWeekHigh, tookPrevWeekLow,
 *                  failedPrevWeekHigh, failedPrevWeekLow } | null,
 * }
 */
export function weeklyContext(dailyCandles, i, tz = MARKET_TZ, weeksIndex = null) {
  if (!Array.isArray(dailyCandles) || i < 0 || i >= dailyCandles.length) {
    return { prevWeek: null, currentWeek: null };
  }

  const curKey = weekKeyOf(dailyCandles[i].time, tz);
  if (curKey == null) return { prevWeek: null, currentWeek: null };

  let weeks;
  let curIdx;
  if (weeksIndex) {
    weeks = weeksIndex.weeks;
    curIdx = weeksIndex.byKey.get(curKey);
    if (curIdx === undefined) return { prevWeek: null, currentWeek: null };
  } else {
    weeks = aggregateToWeeks(dailyCandles.slice(0, i + 1), tz);
    curIdx = weeks.length - 1;
  }

  // Rebuild the current week from daily bars up to i only — a shared full-series
  // week candle would leak the rest of the week into the backtest.
  let cw = null;
  for (let k = i; k >= 0; k--) {
    const key = weekKeyOf(dailyCandles[k].time, tz);
    if (key == null) continue;
    if (key !== curKey) break;
    const c = dailyCandles[k];
    if (!cw) {
      cw = { weekKey: curKey, open: c.open, high: c.high, low: c.low, closeSoFar: dailyCandles[i].close, days: 1 };
    } else {
      cw.open = c.open; // walking backwards — earliest bar wins the open
      cw.high = Math.max(cw.high, c.high);
      cw.low = Math.min(cw.low, c.low);
      cw.days += 1;
    }
  }

  const prev = curIdx >= 1 ? weeks[curIdx - 1] : null;
  const before = curIdx >= 2 ? weeks[curIdx - 2] : null;

  let prevWeek = null;
  if (prev) {
    const ref = weeklyRefRange(weeks, curIdx - 1);
    prevWeek = {
      weekKey: prev.weekKey,
      high: prev.high,
      low: prev.low,
      close: prev.close,
      classification: before && ref != null ? classifyCandle(prev, before, ref) : null,
    };
  }

  let currentWeek = null;
  if (cw) {
    const direction = cw.closeSoFar > cw.open ? "up" : cw.closeSoFar < cw.open ? "down" : "none";
    currentWeek = {
      weekKey: cw.weekKey,
      open: cw.open,
      high: cw.high,
      low: cw.low,
      closeSoFar: cw.closeSoFar,
      direction,
      daysElapsed: cw.days,
      tookPrevWeekHigh: prev ? cw.high > prev.high : false,
      tookPrevWeekLow: prev ? cw.low < prev.low : false,
      failedPrevWeekHigh: prev ? cw.high > prev.high && cw.closeSoFar < prev.high : false,
      failedPrevWeekLow: prev ? cw.low < prev.low && cw.closeSoFar > prev.low : false,
    };
  }

  return { prevWeek, currentWeek };
}

/** Pre-aggregates the full series once for O(n) backtest replay. */
export function buildWeeksIndex(dailyCandles, tz = MARKET_TZ) {
  const weeks = aggregateToWeeks(dailyCandles, tz);
  const byKey = new Map(weeks.map((w, idx) => [w.weekKey, idx]));
  return { weeks, byKey };
}
