// Historical replay of the signal engine — the source of the "how likely does
// this hit" number. Every bar where the rules fire becomes a simulated trade:
// scan forward until stop or target is touched. The win rate reported to the
// user is therefore the measured outcome of the exact live rule set on this
// asset + timeframe, over the candles the page already fetched.

import { buildIndicatorContext, evaluateSignalAt, WARMUP_BARS } from "./engine";

// How many bars a simulated trade may stay open before it expires.
// Roughly: intraday ≈ one to two sessions, 4h ≈ a week, 1d ≈ a month.
export const LOOKAHEAD_BARS = {
  "1m": 120,
  "5m": 96,
  "15m": 64,
  "30m": 48,
  "1h": 48,
  "4h": 30,
  "1d": 20,
};

/**
 * Scans forward from the signal bar and resolves the simulated trade.
 * A bar touching BOTH stop and target counts as a LOSS — intrabar order is
 * unknowable from OHLC, so the worst case is assumed. Stop touch → loss,
 * target touch → win, neither within the lookahead → "expired" scored by its
 * signed exit R at the last scanned close.
 */
export function resolveSignalForward(candles, i, sig, lookahead) {
  const dir = sig.direction === "long" ? 1 : -1;
  const riskPerUnit = Math.abs(sig.entry - sig.stopLoss);
  let outcome = "expired";
  let exitR = 0;
  let resolutionIndex = Math.min(i + lookahead, candles.length - 1);

  for (let j = i + 1; j <= i + lookahead && j < candles.length; j++) {
    const bar = candles[j];
    const hitStop = dir === 1 ? bar.low <= sig.stopLoss : bar.high >= sig.stopLoss;
    const hitTarget = dir === 1 ? bar.high >= sig.takeProfit : bar.low <= sig.takeProfit;
    if (hitStop) {
      // Includes the both-touched bar: assume stop filled first.
      outcome = "loss";
      exitR = -1;
      resolutionIndex = j;
      break;
    }
    if (hitTarget) {
      outcome = "win";
      exitR = riskPerUnit > 0 ? Math.abs(sig.takeProfit - sig.entry) / riskPerUnit : 0;
      resolutionIndex = j;
      break;
    }
  }

  if (outcome === "expired") {
    const exitClose = candles[resolutionIndex].close;
    exitR = riskPerUnit > 0 ? (dir * (exitClose - sig.entry)) / riskPerUnit : 0;
  }

  return { outcome, exitR, resolutionIndex };
}

/**
 * Replays the rule set over `candles` and simulates each fired signal via
 * resolveSignalForward. Samples are non-overlapping: after a trade resolves, scanning resumes past
 * its resolution bar, so one trend doesn't count as ten correlated wins.
 *
 * Returns { total, wins, losses, expired, winRate, avgR, byTier, byDirection,
 *           firstTime, lastTime, trades }.
 * winRate is wins/(wins+losses) and null when nothing resolved.
 */
export function backtestSignals(candles, timeframe, options = {}) {
  const lookahead = options.lookahead ?? LOOKAHEAD_BARS[timeframe] ?? 48;
  const contract = options.contract ?? null;

  const empty = {
    total: 0, wins: 0, losses: 0, expired: 0,
    winRate: null, avgR: null,
    byTier: {}, byDirection: {},
    firstTime: null, lastTime: null,
    trades: [],
  };
  if (!Array.isArray(candles) || candles.length <= WARMUP_BARS + 1) return empty;

  const ctx = buildIndicatorContext(candles);
  const trades = [];

  let i = WARMUP_BARS;
  // The last bar can never resolve forward, so stop one early.
  while (i < candles.length - 1) {
    const sig = evaluateSignalAt(candles, i, ctx, timeframe, contract);
    if (sig.direction === "neutral") {
      i += 1;
      continue;
    }

    const { outcome, exitR, resolutionIndex } = resolveSignalForward(candles, i, sig, lookahead);

    trades.push({
      time: sig.time,
      direction: sig.direction,
      tier: sig.tier,
      confluencePct: sig.confluencePct,
      entry: sig.entry,
      stopLoss: sig.stopLoss,
      takeProfit: sig.takeProfit,
      outcome,
      exitR,
      barsHeld: resolutionIndex - i,
    });

    i = resolutionIndex + 1;
  }

  const wins = trades.filter((t) => t.outcome === "win").length;
  const losses = trades.filter((t) => t.outcome === "loss").length;
  const expired = trades.filter((t) => t.outcome === "expired").length;
  const decided = wins + losses;

  const cohort = (list) => {
    const w = list.filter((t) => t.outcome === "win").length;
    const l = list.filter((t) => t.outcome === "loss").length;
    return {
      total: list.length,
      wins: w,
      losses: l,
      expired: list.length - w - l,
      winRate: w + l > 0 ? w / (w + l) : null,
      avgR: list.length > 0 ? list.reduce((s, t) => s + t.exitR, 0) / list.length : null,
    };
  };

  const byTier = {};
  const byDirection = {};
  for (const t of trades) {
    (byTier[t.tier] ??= []).push(t);
    (byDirection[t.direction] ??= []).push(t);
  }
  for (const k of Object.keys(byTier)) byTier[k] = cohort(byTier[k]);
  for (const k of Object.keys(byDirection)) byDirection[k] = cohort(byDirection[k]);

  return {
    total: trades.length,
    wins,
    losses,
    expired,
    winRate: decided > 0 ? wins / decided : null,
    avgR: trades.length > 0 ? trades.reduce((s, t) => s + t.exitR, 0) / trades.length : null,
    byTier,
    byDirection,
    firstTime: trades.length ? trades[0].time : null,
    lastTime: trades.length ? trades[trades.length - 1].time : null,
    trades,
  };
}

/**
 * The cohort stats that best match a live signal (same direction + tier),
 * falling back to direction-only, then overall. Includes which cohort was
 * used so the UI can label the headline honestly.
 */
export function matchingCohort(results, liveSignal) {
  if (!results || !liveSignal || liveSignal.direction === "neutral") return null;
  const sameDirTier = results.trades.filter(
    (t) => t.direction === liveSignal.direction && t.tier === liveSignal.tier,
  );
  const decidedOf = (list) =>
    list.filter((t) => t.outcome === "win" || t.outcome === "loss").length;

  if (decidedOf(sameDirTier) >= 5) {
    return { scope: "direction+tier", trades: sameDirTier, ...cohortStats(sameDirTier) };
  }
  const sameDir = results.trades.filter((t) => t.direction === liveSignal.direction);
  if (decidedOf(sameDir) >= 5) {
    return { scope: "direction", trades: sameDir, ...cohortStats(sameDir) };
  }
  return { scope: "all", trades: results.trades, ...cohortStats(results.trades) };
}

function cohortStats(list) {
  const wins = list.filter((t) => t.outcome === "win").length;
  const losses = list.filter((t) => t.outcome === "loss").length;
  return {
    total: list.length,
    wins,
    losses,
    expired: list.length - wins - losses,
    winRate: wins + losses > 0 ? wins / (wins + losses) : null,
    avgR: list.length > 0 ? list.reduce((s, t) => s + t.exitR, 0) / list.length : null,
  };
}
