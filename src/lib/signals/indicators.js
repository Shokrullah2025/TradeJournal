// Pure technical indicator functions for the signal engine.
// All functions take candles: [{time, open, high, low, close, volume}],
// ascending by time (unix seconds), and return arrays index-aligned with
// the input (null until the indicator has warmed up). No side effects.

import { calcEMAIndexed } from "../../components/trades/BacktestChart/chartConfig";

/**
 * Exponential moving average as plain numbers (index-aligned, null during warm-up).
 * Wraps the chart-shaped calcEMAIndexed so the engine doesn't depend on
 * {time, value} objects.
 */
export function calcEMA(candles, period) {
  return calcEMAIndexed(candles, period).map((p) => (p ? p.value : null));
}

/**
 * RSI using Wilder's smoothing.
 * @returns {Array<number|null>} index-aligned, null for the first `period` entries
 */
export function calcRSI(candles, period = 14) {
  const out = new Array(candles.length).fill(null);
  if (candles.length <= period) return out;

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff > 0) avgGain += diff;
    else avgLoss -= diff;
  }
  avgGain /= period;
  avgLoss /= period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

/**
 * Average True Range using Wilder's smoothing.
 * @returns {Array<number|null>} index-aligned, null during warm-up
 */
export function calcATR(candles, period = 14) {
  const out = new Array(candles.length).fill(null);
  if (candles.length <= period) return out;

  const trueRange = (i) => {
    const h = candles[i].high;
    const l = candles[i].low;
    const pc = candles[i - 1].close;
    return Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
  };

  let atr = 0;
  for (let i = 1; i <= period; i++) atr += trueRange(i);
  atr /= period;
  out[period] = atr;

  for (let i = period + 1; i < candles.length; i++) {
    atr = (atr * (period - 1) + trueRange(i)) / period;
    out[i] = atr;
  }
  return out;
}

/**
 * Confirmed swing highs/lows. A swing high is a candle whose high exceeds the
 * highs of `lookback` candles on BOTH sides (strictly greater); swing low is
 * the mirror. The last `lookback` candles can never be confirmed swings —
 * deterministic by design (no repainting).
 *
 * @returns {{ highs: Array<{index,time,price}>, lows: Array<{index,time,price}> }}
 */
export function findSwings(candles, lookback = 5) {
  const highs = [];
  const lows = [];
  for (let i = lookback; i < candles.length - lookback; i++) {
    let isHigh = true;
    let isLow = true;
    for (let j = 1; j <= lookback; j++) {
      if (candles[i].high <= candles[i - j].high || candles[i].high <= candles[i + j].high) isHigh = false;
      if (candles[i].low >= candles[i - j].low || candles[i].low >= candles[i + j].low) isLow = false;
      if (!isHigh && !isLow) break;
    }
    if (isHigh) highs.push({ index: i, time: candles[i].time, price: candles[i].high });
    if (isLow) lows.push({ index: i, time: candles[i].time, price: candles[i].low });
  }
  return { highs, lows };
}

/** Most recent swing high strictly before `beforeIndex` (default: any). */
export function lastSwingHigh(swings, beforeIndex = Infinity) {
  for (let i = swings.highs.length - 1; i >= 0; i--) {
    if (swings.highs[i].index < beforeIndex) return swings.highs[i];
  }
  return null;
}

/** Most recent swing low strictly before `beforeIndex` (default: any). */
export function lastSwingLow(swings, beforeIndex = Infinity) {
  for (let i = swings.lows.length - 1; i >= 0; i--) {
    if (swings.lows[i].index < beforeIndex) return swings.lows[i];
  }
  return null;
}
