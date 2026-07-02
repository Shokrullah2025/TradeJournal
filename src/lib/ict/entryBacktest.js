// Honest accuracy for the ENTRY model: replay the full pipeline — daily bias
// gate → 4H order block → rejection close → SMT agreement → entry at the next
// bar open → stop/target simulation — over ~2 years of 1h candles. The
// win-rate and average R shown on the page are the measured outcome of these
// exact rules, with the same conservative conventions as everywhere else
// (both-touched bar = loss).
//
// Lookahead-free by construction: the bias for day D uses daily closes ≤ D−1
// (buildBiasSeries), the OB must be in play as of the candle BEFORE the
// confirmation, and the SMT check reads the sibling's same completed bucket.

import { aggregateTo4hSession } from "../../utils/marketData";
import { buildBiasSeries, biasForTimestamp } from "./bias";
import { buildObTimeline, isRejectionClose } from "./orderBlocks";
import {
  splitForming4h,
  buildBucketIndex,
  checkSmtAgreement,
  buildTradePlan,
  H4_SECONDS,
} from "./entryEngine";

export const MAX_HOLD_BARS = 115; // ≈ 5 trading days × 23 hourly bars

const emptyCohort = () => ({ total: 0, wins: 0, losses: 0, expired: 0, winRate: null, avgR: null });

function cohortOf(trades) {
  const wins = trades.filter((t) => t.outcome === "win").length;
  const losses = trades.filter((t) => t.outcome === "loss").length;
  return {
    total: trades.length,
    wins,
    losses,
    expired: trades.length - wins - losses,
    winRate: wins + losses > 0 ? wins / (wins + losses) : null,
    avgR: trades.length > 0 ? trades.reduce((s, t) => s + t.exitR, 0) / trades.length : null,
  };
}

/**
 * @param oneHourCandles ascending 1h candles (~2y)
 * @param dailyCandles   ascending daily candles (bias)
 * @param opts { siblingDaily, sibling1h, symbol, contract, biasSeries }
 *   biasSeries: optional prebuilt buildBiasSeries result (page shares its memo)
 */
export function backtestEntries(oneHourCandles, dailyCandles, {
  siblingDaily = null,
  sibling1h = null,
  symbol,
  contract = null,
  biasSeries = null,
} = {}) {
  const empty = {
    ...emptyCohort(),
    byDirection: { long: emptyCohort(), short: emptyCohort() },
    smtBlocked: 0,
    firstTime: null,
    lastTime: null,
    trades: [],
  };
  if (!Array.isArray(oneHourCandles) || oneHourCandles.length < 50) return empty;
  if (!Array.isArray(dailyCandles) || dailyCandles.length === 0) return empty;

  const lastH1Time = oneHourCandles[oneHourCandles.length - 1].time;
  const { completed: candles4h } = splitForming4h(aggregateTo4hSession(oneHourCandles), lastH1Time);
  if (candles4h.length < 20) return empty;

  const hasPair = Array.isArray(sibling1h) && sibling1h.length > 0;
  const siblingByTime = hasPair
    ? buildBucketIndex(splitForming4h(aggregateTo4hSession(sibling1h), sibling1h[sibling1h.length - 1].time).completed)
    : null;

  const series = biasSeries ?? buildBiasSeries(dailyCandles, { siblingDaily, symbol });
  const obTimeline = buildObTimeline(candles4h);

  const trades = [];
  let smtBlocked = 0;
  let h1Ptr = 0; // monotonic — total pointer work is O(n)
  let busyUntilTime = -Infinity; // one open simulated trade at a time

  for (let i = 1; i < candles4h.length; i++) {
    const closeTime = candles4h[i].time + H4_SECONDS;

    // The bias lookup uses the CLOSE time: the confirmation exists at the
    // close, and this attributes the 18:00–22:00 bucket (closing past the
    // 20:00 rollover) to the trading day it actually trades into.
    const bias = biasForTimestamp(series, closeTime);
    if (!bias || bias.bias === "neutral") continue;
    const direction = bias.bias;

    // The OB must already have been in play before the confirming candle.
    const obIdx = obTimeline.inPlay[direction][i - 1];
    if (obIdx < 0) continue;
    const ob = obTimeline.obs[obIdx];
    if (!isRejectionClose(candles4h[i], ob)) continue;

    const smt = checkSmtAgreement({
      direction,
      bucketTime: candles4h[i].time,
      siblingByTime,
      hasPair,
    });
    if (smt.status === "disagree" || smt.status === "no-data") {
      smtBlocked += 1;
      continue;
    }

    if (closeTime < busyUntilTime) continue;

    // Entry bar: first 1h candle at/after the confirming close.
    while (h1Ptr < oneHourCandles.length && oneHourCandles[h1Ptr].time < closeTime) h1Ptr++;
    if (h1Ptr >= oneHourCandles.length) break;
    const entryBarIdx = h1Ptr;
    const entryBar = oneHourCandles[entryBarIdx];

    const plan = buildTradePlan({
      direction,
      ob,
      atrAtConfirm: obTimeline.atr14[i],
      entryPrice: entryBar.open,
      entrySource: "1h-open",
      levels: bias.snapshot?.levels ?? null,
      contract,
    });
    if (!plan.ok) continue;

    // Simulate from the entry bar INCLUSIVE — its own extremes count.
    let outcome = "expired";
    let exitR = 0;
    let exitIdx = Math.min(entryBarIdx + MAX_HOLD_BARS - 1, oneHourCandles.length - 1);
    for (let j = entryBarIdx; j <= entryBarIdx + MAX_HOLD_BARS - 1 && j < oneHourCandles.length; j++) {
      const bar = oneHourCandles[j];
      const hitStop = direction === "long" ? bar.low <= plan.stop : bar.high >= plan.stop;
      const hitTarget = direction === "long" ? bar.high >= plan.target : bar.low <= plan.target;
      if (hitStop) {
        // Both touched in one bar → loss (intrabar order unknowable).
        outcome = "loss";
        exitR = -1;
        exitIdx = j;
        break;
      }
      if (hitTarget) {
        outcome = "win";
        exitR = plan.rr;
        exitIdx = j;
        break;
      }
    }
    if (outcome === "expired") {
      const lastClose = oneHourCandles[exitIdx].close;
      exitR = plan.riskPoints > 0
        ? ((direction === "long" ? 1 : -1) * (lastClose - plan.entry)) / plan.riskPoints
        : 0;
    }

    trades.push({
      entryTime: entryBar.time,
      exitTime: oneHourCandles[exitIdx].time,
      direction,
      entry: plan.entry,
      stop: plan.stop,
      target: plan.target,
      targetLabel: plan.targetLabel,
      rr: plan.rr,
      outcome,
      exitR,
      obTime: ob.obTime,
      confirmTime: candles4h[i].time,
      smtStatus: smt.status,
    });
    busyUntilTime = oneHourCandles[exitIdx].time + 3600;
  }

  return {
    ...cohortOf(trades),
    byDirection: {
      long: cohortOf(trades.filter((t) => t.direction === "long")),
      short: cohortOf(trades.filter((t) => t.direction === "short")),
    },
    smtBlocked,
    firstTime: trades.length ? trades[0].entryTime : null,
    lastTime: trades.length ? trades[trades.length - 1].entryTime : null,
    trades,
  };
}

/**
 * The cohort matching the live setup's direction when it has ≥5 decided
 * samples, else overall — labeled by scope. Null when there's no directional
 * setup context to match.
 */
export function setupCohort(results, setup) {
  if (!results || !setup || !setup.direction) return null;
  const byDir = results.byDirection?.[setup.direction];
  if (byDir && byDir.wins + byDir.losses >= 5) {
    return { scope: "direction", ...byDir };
  }
  const { total, wins, losses, expired, winRate, avgR } = results;
  return { scope: "all", total, wins, losses, expired, winRate, avgR };
}
