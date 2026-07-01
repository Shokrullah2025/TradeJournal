// Honest accuracy for the daily bias: replay the exact bias rules over the
// daily history and grade each non-neutral day against what the NEXT day
// actually did. This is the number shown to the user — a measurement of these
// rules on this asset, not a model's confidence.
//
// The replay cannot see intraday session data, so the session factor scores 0
// with maxPoints 0 in every historical sample (disclosed in the UI).

import { buildBiasSeries, WARMUP_DAYS } from "./bias";

/**
 * Outcome of a bias graded on the following day, against the analyzed day's
 * own high/low (the liquidity resting on either side):
 * - takes the high only → long win / short loss (mirrored for lows)
 * - takes BOTH → counted AGAINST the bias: daily OHLC can't order intrabar
 *   touches, so the conservative reading wins (same convention as the old
 *   engine's both-touched rule)
 * - takes NEITHER (inside day) → graded by the next day's close vs its open —
 *   an inside day still expresses direction; discarding all inside days would
 *   throw out a big slice of the sample and quietly flatter the stat by only
 *   grading trending days. A doji (close === open) carries no direction and
 *   is the only unresolved residue (excluded from winRate).
 */
export function gradeBiasOutcome(bias, analyzedDay, nextDay) {
  const tookHigh = nextDay.high > analyzedDay.high;
  const tookLow = nextDay.low < analyzedDay.low;
  const dir = bias === "long" ? 1 : -1;

  if (tookHigh && tookLow) return "loss";
  if (tookHigh) return dir === 1 ? "win" : "loss";
  if (tookLow) return dir === 1 ? "loss" : "win";
  if (nextDay.close > nextDay.open) return dir === 1 ? "win" : "loss";
  if (nextDay.close < nextDay.open) return dir === 1 ? "loss" : "win";
  return "unresolved";
}

const emptyCohort = () => ({ total: 0, wins: 0, losses: 0, expired: 0, winRate: null, avgR: null });

function cohortOf(samples) {
  const wins = samples.filter((s) => s.outcome === "win").length;
  const losses = samples.filter((s) => s.outcome === "loss").length;
  return {
    total: samples.length,
    wins,
    losses,
    expired: samples.length - wins - losses, // "expired" slot = unresolved (HitRateCard shape)
    winRate: wins + losses > 0 ? wins / (wins + losses) : null,
    avgR: null, // no R without a stop — entries come in the next stage
  };
}

/**
 * @returns { total, wins, losses, expired, winRate, avgR: null,
 *            byBias: { long, short }, firstTime, lastTime, samples }
 */
export function backtestBias(dailyCandles, { siblingDaily = null, symbol } = {}) {
  const empty = {
    ...emptyCohort(),
    byBias: { long: emptyCohort(), short: emptyCohort() },
    firstTime: null,
    lastTime: null,
    samples: [],
  };
  if (!Array.isArray(dailyCandles) || dailyCandles.length <= WARMUP_DAYS + 1) return empty;

  const seriesResult = buildBiasSeries(dailyCandles, { siblingDaily, symbol });
  const samples = [];

  // entries[k] corresponds to dailyCandles[WARMUP_DAYS + k]; the last candle
  // has no next day to grade against.
  for (let k = 0; k < seriesResult.entries.length; k++) {
    const i = WARMUP_DAYS + k;
    if (i + 1 >= dailyCandles.length) break;
    const b = seriesResult.entries[k];
    if (b.bias === "neutral") continue;
    samples.push({
      time: b.computedFrom.time,
      forDayKey: b.forDayKey,
      bias: b.bias,
      score: b.score,
      outcome: gradeBiasOutcome(b.bias, dailyCandles[i], dailyCandles[i + 1]),
    });
  }

  return {
    ...cohortOf(samples),
    byBias: {
      long: cohortOf(samples.filter((s) => s.bias === "long")),
      short: cohortOf(samples.filter((s) => s.bias === "short")),
    },
    firstTime: samples.length ? samples[0].time : null,
    lastTime: samples.length ? samples[samples.length - 1].time : null,
    samples,
  };
}

/**
 * The cohort matching the live bias (same direction) when it has enough
 * decided samples, else the overall stats — labeled by `scope` so the UI can
 * say which one it is. Null for a neutral or missing live bias.
 */
export function biasCohort(results, liveBias) {
  if (!results || !liveBias || liveBias.bias === "neutral") return null;
  const byBias = results.byBias?.[liveBias.bias];
  if (byBias && byBias.wins + byBias.losses >= 5) {
    return { scope: "bias", ...byBias };
  }
  const { total, wins, losses, expired, winRate, avgR } = results;
  return { scope: "all", total, wins, losses, expired, winRate, avgR };
}
