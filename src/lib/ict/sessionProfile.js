// Session breakdown of the daily candle — how Asia, London and New York each
// contributed. Built from 30-minute candles: session boundaries (09:30, 11:30,
// 13:30 ET) don't sit on the 1h grid, and 30m data covers 60 days — far more
// than the 2–3 days displayed.

import { SESSIONS, MARKET_TZ, isInSession, minutesOfDayInTz } from "../signals/sessions";
import { dayKeyInTz } from "../signals/indicators";

export const SESSION_ORDER = ["ASIA", "LONDON", "NY_AM", "LUNCH_DOLDRUMS", "NY_PM"];

// The canonical LONDON window (03:00–11:30) overlaps NY AM, which would fold
// the same bars into two rows and credit New York's highs to London. For the
// profile the windows must partition the day, so London is truncated at the
// 09:30 NY open. Every other window is used as defined.
const PROFILE_SESSIONS = {
  ...SESSIONS,
  LONDON: { ...SESSIONS.LONDON, endMin: 9 * 60 + 30 },
};

/**
 * The trading day a timestamp's analysis belongs to. Bars at/after 20:00 ET
 * (the Asia open) roll forward into the NEXT calendar day: Sunday 20:00 is
 * part of Monday's daily candle formation. The +4h shift cannot cross a DST
 * boundary incorrectly — US transitions happen at 02:00 local time, so a
 * 20:00–23:59 timestamp plus 4h always lands after midnight and before any
 * transition.
 */
export function tradingDayKey(unixSeconds, tz = MARKET_TZ) {
  const m = minutesOfDayInTz(unixSeconds, tz);
  return dayKeyInTz(m >= 20 * 60 ? unixSeconds + 4 * 3600 : unixSeconds, tz);
}

/** Mean daily range over the last `period` completed daily candles. */
export function averageDailyRange(dailyCandles, period = 20) {
  if (!Array.isArray(dailyCandles) || dailyCandles.length < period) return null;
  let sum = 0;
  for (let k = dailyCandles.length - period; k < dailyCandles.length; k++) {
    sum += dailyCandles[k].high - dailyCandles[k].low;
  }
  return sum / period;
}

function newSessionAgg(c) {
  return { open: c.open, high: c.high, low: c.low, close: c.close, bars: 1 };
}

function foldInto(agg, c) {
  agg.high = Math.max(agg.high, c.high);
  agg.low = Math.min(agg.low, c.low);
  agg.close = c.close; // candles ascend, last write wins
  agg.bars += 1;
}

function finalizeSession(agg) {
  if (!agg) return null;
  return {
    ...agg,
    range: agg.high - agg.low,
    direction: agg.close > agg.open ? "up" : agg.close < agg.open ? "down" : "none",
  };
}

/**
 * Builds per-session profiles for the most recent `days` trading days
 * (including the forming one). Missing sessions (holidays, data gaps) are
 * null and annotations degrade to null — never throws.
 *
 * @param m30Candles ascending 30m candles
 * @param dailyCandles ascending 1d candles (for the ADR reference)
 * @returns [{ dayKey, complete, sessions: {ASIA|LONDON|NY_AM|LUNCH_DOLDRUMS|NY_PM: {...}|null},
 *             annotations: { londonSweptAsiaHigh, londonSweptAsiaLow, judas,
 *                            highOfDaySession, lowOfDaySession, asiaConsolidation } }]
 */
export function buildSessionProfiles(m30Candles, dailyCandles, { days = 2 } = {}) {
  if (!Array.isArray(m30Candles) || m30Candles.length === 0) return [];

  // Group bars by trading day, folding each into its session bucket.
  const byDay = new Map(); // dayKey -> { sessions: {}, lastBarMin, dayHigh, dayLow }
  for (const c of m30Candles) {
    const key = tradingDayKey(c.time);
    let day = byDay.get(key);
    if (!day) {
      day = { dayKey: key, sessions: {}, lastBarMin: -1, dayHigh: -Infinity, dayLow: Infinity };
      byDay.set(key, day);
    }
    day.dayHigh = Math.max(day.dayHigh, c.high);
    day.dayLow = Math.min(day.dayLow, c.low);
    // Track the latest bar's ET minutes on the day's own calendar date (bars
    // ≥ 20:00 belong to the coming day; they never mark it complete).
    const m = minutesOfDayInTz(c.time, MARKET_TZ);
    if (m < 20 * 60) day.lastBarMin = Math.max(day.lastBarMin, m);
    for (const id of SESSION_ORDER) {
      if (isInSession(c.time, PROFILE_SESSIONS[id])) {
        if (!day.sessions[id]) day.sessions[id] = newSessionAgg(c);
        else foldInto(day.sessions[id], c);
      }
    }
  }

  const adr20 = averageDailyRange(dailyCandles, 20);
  const keys = [...byDay.keys()].sort().slice(-days);

  return keys.map((key) => {
    const day = byDay.get(key);
    const sessions = {};
    for (const id of SESSION_ORDER) sessions[id] = finalizeSession(day.sessions[id] || null);

    const asia = sessions.ASIA;
    const london = sessions.LONDON;

    const londonSweptAsiaHigh = asia && london ? london.high > asia.high : null;
    const londonSweptAsiaLow = asia && london ? london.low < asia.low : null;

    // Judas swing: London runs one side of the Asia range then closes back
    // inside — the fake move before the real one.
    let judas = null;
    if (asia && london) {
      const bearish = londonSweptAsiaHigh && london.close < asia.high;
      const bullish = londonSweptAsiaLow && london.close > asia.low;
      if (bearish && !bullish) judas = "bearish";
      else if (bullish && !bearish) judas = "bullish";
      // both → ambiguous whipsaw, stays null
    }

    // Which session printed the day's extreme (tie → earliest in SESSION_ORDER).
    let highOfDaySession = null;
    let lowOfDaySession = null;
    for (const id of SESSION_ORDER) {
      const s = sessions[id];
      if (!s) continue;
      if (highOfDaySession === null && s.high === day.dayHigh) highOfDaySession = id;
      if (lowOfDaySession === null && s.low === day.dayLow) lowOfDaySession = id;
    }

    const asiaConsolidation = asia && adr20 != null ? asia.range < 0.3 * adr20 : null;

    return {
      dayKey: key,
      // The RTH close is 16:00 ET; a bar starting at/after 15:30 means the
      // last half-hour printed, so the day's session structure is complete.
      complete: day.lastBarMin >= 15 * 60 + 30,
      sessions,
      annotations: {
        londonSweptAsiaHigh,
        londonSweptAsiaLow,
        judas,
        highOfDaySession,
        lowOfDaySession,
        asiaConsolidation,
      },
    };
  });
}
