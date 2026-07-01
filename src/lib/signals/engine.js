// Deterministic rule-based signal engine. The SAME evaluation powers the live
// signal card and the historical hit-rate replay (backtest.js), which is what
// makes the displayed probability honest: it is the measured outcome of this
// exact rule set on this exact asset + timeframe, not a model's guess.
//
// Candles in → signal out. No randomness, no network, no clock reads except
// computeLiveSignal's forming-bar check.

import { ema, rsi, atr, priorDayLevels, volumeRatio } from "./indicators";
import { SESSIONS, isInSession } from "./sessions";
import { roundToTick } from "../futuresContracts";

export const MIN_CONFLUENCE_PCT = 50; // below this the setup is suppressed → neutral
export const HIGH_CONFLUENCE_PCT = 70;
export const ATR_STOP_MULT = 1.5;
export const ATR_TARGET_MULT = 2.25; // fixed 1.5R target
export const WARMUP_BARS = 60; // covers EMA50 + RSI/ATR Wilder warm-up

const INTRADAY_TIMEFRAMES = new Set(["1m", "5m", "15m", "30m", "1h"]);

/**
 * Computes every indicator array once so evaluateSignalAt is O(1) per bar.
 * Returns index-aligned arrays (null during warm-up).
 */
export function buildIndicatorContext(candles) {
  const closes = candles.map((c) => c.close);
  const { prevDayHigh, prevDayLow } = priorDayLevels(candles);
  return {
    ema20: ema(closes, 20),
    ema50: ema(closes, 50),
    rsi14: rsi(closes, 14),
    atr14: atr(candles, 14),
    volRatio20: volumeRatio(candles, 20),
    prevDayHigh,
    prevDayLow,
  };
}

function factor(key, label, points, maxPoints, passed, detail) {
  return { key, label, points, maxPoints, passed, detail };
}

/**
 * Evaluates the rule set at candle index `i` using precomputed indicators.
 * Pure and deterministic — this exact function is replayed by the backtest.
 *
 * Returns a Signal:
 * { time, direction: 'long'|'short'|'neutral', entry, entryZone, stopLoss,
 *   takeProfit, atr, rTarget, score, maxScore, confluencePct, tier,
 *   factors[], snapshot }
 * Directionless bars return direction:'neutral' with factors for the UI.
 */
export function evaluateSignalAt(candles, i, ctx, timeframe, contract = null) {
  const c = candles[i];
  const e20 = ctx.ema20[i];
  const e50 = ctx.ema50[i];
  const rsiV = ctx.rsi14[i];
  const atrV = ctx.atr14[i];
  const volR = ctx.volRatio20[i];
  const pdh = ctx.prevDayHigh[i];
  const pdl = ctx.prevDayLow[i];

  const base = {
    time: c.time,
    direction: "neutral",
    entry: null,
    entryZone: null,
    stopLoss: null,
    takeProfit: null,
    atr: atrV,
    rTarget: ATR_TARGET_MULT / ATR_STOP_MULT,
    score: 0,
    maxScore: 100,
    confluencePct: 0,
    tier: null,
    factors: [],
    snapshot: {
      close: c.close,
      ema20: e20,
      ema50: e50,
      rsi14: rsiV,
      atr14: atrV,
      volRatio: volR,
      prevDayHigh: pdh,
      prevDayLow: pdl,
      sessions: [],
    },
  };

  if (i < WARMUP_BARS || e20 == null || e50 == null || rsiV == null || atrV == null || atrV <= 0) {
    return base;
  }

  // Directional gate — without trend alignment there is no setup to grade.
  const isLong = e20 > e50 && c.close > e20;
  const isShort = e20 < e50 && c.close < e20;
  if (!isLong && !isShort) return base;
  const dir = isLong ? 1 : -1;

  const useSession = INTRADAY_TIMEFRAMES.has(timeframe);
  const maxScore = useSession ? 100 : 90;
  const factors = [];

  factors.push(factor(
    "trend", "Trend alignment", 25, 25, true,
    isLong ? "EMA20 above EMA50, price above EMA20" : "EMA20 below EMA50, price below EMA20",
  ));

  const spread = (e20 - e50) * dir;
  const strongTrend = spread > 0.25 * atrV;
  factors.push(factor(
    "trendStrength", "Trend strength", strongTrend ? 15 : 0, 15, strongTrend,
    `EMA spread ${(spread / atrV).toFixed(2)}× ATR (needs > 0.25×)`,
  ));

  // Momentum: with-trend RSI scores; overextended RSI penalizes the setup.
  const rsiWithTrend = isLong ? rsiV > 50 && rsiV <= 70 : rsiV < 50 && rsiV >= 30;
  const rsiExtended = isLong ? rsiV > 70 : rsiV < 30;
  const momentumPts = rsiWithTrend ? 15 : rsiExtended ? -10 : 0;
  factors.push(factor(
    "momentum", "Momentum (RSI 14)", momentumPts, 15, rsiWithTrend,
    rsiExtended
      ? `RSI ${rsiV.toFixed(1)} is overextended`
      : `RSI ${rsiV.toFixed(1)} (${isLong ? "50–70 ideal" : "30–50 ideal"})`,
  ));

  const distToEma = Math.abs(c.close - e20);
  const nearEma = distToEma <= 0.5 * atrV;
  factors.push(factor(
    "pullback", "Entry not extended", nearEma ? 15 : 0, 15, nearEma,
    `Price ${(distToEma / atrV).toFixed(2)}× ATR from EMA20 (needs ≤ 0.5×)`,
  ));

  const volOk = volR != null && volR >= 1.2;
  factors.push(factor(
    "volume", "Volume confirmation", volOk ? 10 : 0, 10, volOk,
    volR == null ? "No volume data" : `Volume ${volR.toFixed(2)}× its 20-bar average (needs ≥ 1.2×)`,
  ));

  const levelBroken = isLong ? pdh != null && c.close > pdh : pdl != null && c.close < pdl;
  factors.push(factor(
    "level", isLong ? "Above prior day high" : "Below prior day low",
    levelBroken ? 10 : 0, 10, levelBroken,
    pdh == null && pdl == null
      ? "Prior-day levels not available yet"
      : isLong
        ? `Close vs prior day high ${pdh?.toFixed(2)}`
        : `Close vs prior day low ${pdl?.toFixed(2)}`,
  ));

  let sessionNames = [];
  if (useSession) {
    const active = Object.values(SESSIONS).filter((s) => isInSession(c.time, s));
    sessionNames = active.map((s) => s.label);
    const inKillzone = active.some((s) =>
      s.id === "LONDON" || s.id === "NY_AM" || s.id === "NY_PM",
    );
    const inLunch = active.some((s) => s.id === "LUNCH_DOLDRUMS");
    const sessionPts = inKillzone ? 10 : inLunch ? -10 : 0;
    factors.push(factor(
      "session", "Session timing", sessionPts, 10, inKillzone,
      inKillzone
        ? `Active session: ${sessionNames.join(", ")}`
        : inLunch
          ? "NY lunch — historically low-quality window"
          : "Outside London / New York sessions",
    ));
  }

  const score = Math.max(0, factors.reduce((s, f) => s + f.points, 0));
  const confluencePct = Math.round((100 * score) / maxScore);
  if (confluencePct < MIN_CONFLUENCE_PCT) {
    return {
      ...base,
      score,
      maxScore,
      confluencePct,
      factors,
      snapshot: { ...base.snapshot, sessions: sessionNames },
    };
  }

  const tickSize = contract?.tickSize ?? null;
  const snap = (p) => (tickSize ? roundToTick(p, tickSize) : p);
  const entry = snap(c.close);
  const stopLoss = snap(c.close - dir * ATR_STOP_MULT * atrV);
  const takeProfit = snap(c.close + dir * ATR_TARGET_MULT * atrV);
  // A small zone around the signal close: allow a slightly better fill (with
  // trend pullback) and a small amount of chase.
  const entryZone = isLong
    ? [snap(c.close - 0.25 * atrV), snap(c.close + 0.1 * atrV)]
    : [snap(c.close - 0.1 * atrV), snap(c.close + 0.25 * atrV)];

  return {
    ...base,
    direction: isLong ? "long" : "short",
    entry,
    entryZone,
    stopLoss,
    takeProfit,
    score,
    maxScore,
    confluencePct,
    tier: confluencePct >= HIGH_CONFLUENCE_PCT ? "high" : "medium",
    factors,
    snapshot: { ...base.snapshot, sessions: sessionNames },
  };
}

/**
 * Live signal for the newest COMPLETED bar. Yahoo includes the still-forming
 * candle in intraday responses; evaluating it would repaint on every refresh,
 * so it is dropped when its window extends past `now`.
 */
export function computeLiveSignal(candles, timeframe, contract = null, now = Date.now() / 1000) {
  if (!Array.isArray(candles) || candles.length < 2) return null;
  let series = candles;
  const last = candles[candles.length - 1];
  const intervalSec = candles[1].time - candles[0].time;
  if (last.time + intervalSec > now) {
    series = candles.slice(0, -1);
  }
  if (series.length <= WARMUP_BARS) return null;
  const ctx = buildIndicatorContext(series);
  return evaluateSignalAt(series, series.length - 1, ctx, timeframe, contract);
}
