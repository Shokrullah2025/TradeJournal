// Pure, dependency-free indicator math for the signal engine. Every function
// takes ascending-time candles ({time, open, high, low, close, volume}) or a
// plain value array and returns an index-aligned array with `null` during the
// warm-up window, so callers can index by candle position without offset math.

import { MARKET_TZ } from "./sessions";

/** Simple moving average of a value array. */
export function sma(values, period) {
  const out = new Array(values.length).fill(null);
  if (values.length < period || period <= 0) return out;
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

/**
 * Exponential moving average, SMA-seeded with k = 2/(period+1) — the same
 * seeding as calcEMAIndexed in BacktestChart/chartConfig.js, so the engine's
 * numbers match the EMA lines drawn on the chart.
 */
export function ema(values, period) {
  const out = new Array(values.length).fill(null);
  if (values.length < period || period <= 0) return out;
  const k = 2 / (period + 1);
  let e = 0;
  for (let i = 0; i < period; i++) e += values[i];
  e /= period;
  out[period - 1] = e;
  for (let i = period; i < values.length; i++) {
    e = values[i] * k + e * (1 - k);
    out[i] = e;
  }
  return out;
}

/** Relative Strength Index with Wilder smoothing. */
export function rsi(closes, period = 14) {
  const out = new Array(closes.length).fill(null);
  if (closes.length <= period) return out;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

/** Average True Range with Wilder smoothing. */
export function atr(candles, period = 14) {
  const out = new Array(candles.length).fill(null);
  if (candles.length <= period) return out;
  const tr = (i) => {
    if (i === 0) return candles[0].high - candles[0].low;
    const prevClose = candles[i - 1].close;
    return Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - prevClose),
      Math.abs(candles[i].low - prevClose),
    );
  };
  let a = 0;
  for (let i = 1; i <= period; i++) a += tr(i);
  a /= period;
  out[period] = a;
  for (let i = period + 1; i < candles.length; i++) {
    a = (a * (period - 1) + tr(i)) / period;
    out[i] = a;
  }
  return out;
}

// Calendar day key ("YYYY-MM-DD") in a timezone, cached per formatter since
// Intl.DateTimeFormat construction is expensive inside a per-candle loop.
const _dayKeyFmtCache = new Map();
function dayKeyInTz(unixSeconds, tz) {
  let fmt = _dayKeyFmtCache.get(tz);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    _dayKeyFmtCache.set(tz, fmt);
  }
  return fmt.format(new Date(unixSeconds * 1000));
}

/**
 * Previous calendar-day (exchange timezone) high/low for every candle.
 * For intraday series each candle sees the completed prior ET day's extremes;
 * for daily bars this degenerates to the previous candle's high/low.
 * Returns { prevDayHigh: number[]|null[], prevDayLow: number[]|null[] }.
 */
export function priorDayLevels(candles, tz = MARKET_TZ) {
  const n = candles.length;
  const prevDayHigh = new Array(n).fill(null);
  const prevDayLow = new Array(n).fill(null);
  let currentKey = null;
  let curHigh = -Infinity;
  let curLow = Infinity;
  let lastHigh = null;
  let lastLow = null;
  for (let i = 0; i < n; i++) {
    const key = dayKeyInTz(candles[i].time, tz);
    if (key !== currentKey) {
      if (currentKey !== null) {
        lastHigh = curHigh;
        lastLow = curLow;
      }
      currentKey = key;
      curHigh = -Infinity;
      curLow = Infinity;
    }
    prevDayHigh[i] = lastHigh;
    prevDayLow[i] = lastLow;
    curHigh = Math.max(curHigh, candles[i].high);
    curLow = Math.min(curLow, candles[i].low);
  }
  return { prevDayHigh, prevDayLow };
}

/** Volume relative to its SMA — 1.0 means average participation. */
export function volumeRatio(candles, period = 20) {
  const vols = candles.map((c) => c.volume || 0);
  const avg = sma(vols, period);
  return vols.map((v, i) => (avg[i] > 0 ? v / avg[i] : null));
}
