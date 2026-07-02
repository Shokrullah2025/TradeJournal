// The ICT entry model, stage 3: with today's daily bias as the hard gate, a
// 4H candle must trade into a bias-aligned order block and close with a
// rejection; the entry executes on the lower timeframe at the next candle
// open — IF the correlated pair's same 4H candle agrees. Stops live beyond
// the OB (structure), targets at the bias's liquidity draw.
//
// Everything here is pure; computeSetupState is a function of the current
// data and `now`, recomputed on every render — no retained state.

import { MARKET_TZ } from "../signals/sessions";
import { roundToTick } from "../futuresContracts";
import { tradingDayKey } from "./sessionProfile";
import { tapsZone, isRejectionClose } from "./orderBlocks";

export const STOP_ATR_BUFFER = 0.1; // ×ATR14(4H) beyond the zone's far edge
export const MIN_RR = 1.0; // skip setups that don't pay at least 1R
export const ENTRY_WINDOW_15M_BARS = 12; // SETUP_ACTIVE lifetime: 12×15m = 3h
export const H4_SECONDS = 4 * 3600;

export const SETUP_STATES = [
  "NO_BIAS",
  "WAITING_FOR_OB",
  "WAITING_FOR_TAP",
  "AWAITING_CONFIRMATION",
  "SETUP_ACTIVE",
  "SMT_BLOCKED",
];

/**
 * aggregateTo4hSession emits a partial last bucket while the session runs.
 * The OB timeline and confirmations must only ever see COMPLETED buckets;
 * the forming one drives the AWAITING_CONFIRMATION state.
 * A bucket is complete when bucketTime + 4h ≤ (last source bar time + bar).
 */
export function splitForming4h(candles4h, lastSourceBarTime, barSeconds = 3600) {
  if (!Array.isArray(candles4h) || candles4h.length === 0) {
    return { completed: [], forming: null };
  }
  const last = candles4h[candles4h.length - 1];
  const sourceEnd = lastSourceBarTime + barSeconds;
  if (last.time + H4_SECONDS <= sourceEnd) {
    return { completed: candles4h, forming: null };
  }
  return { completed: candles4h.slice(0, -1), forming: last };
}

/** Map from 4H bucket start time → candle, for O(1) sibling alignment. */
export function buildBucketIndex(candles) {
  const map = new Map();
  for (const c of candles || []) map.set(c.time, c);
  return map;
}

/**
 * "The correlation pair signals the same thing": the sibling's SAME 4H
 * bucket (both series ride the same 18:00-ET aggregation grid) must close in
 * the bias direction. Missing bucket blocks the setup — no data is not
 * confirmation. Assets without a pair waive the requirement.
 * @returns { status: 'agree'|'disagree'|'no-data'|'no-pair' }
 */
export function checkSmtAgreement({ direction, bucketTime, siblingByTime, hasPair }) {
  if (!hasPair) return { status: "no-pair" };
  const s = siblingByTime?.get(bucketTime);
  if (!s) return { status: "no-data" };
  const agrees = direction === "long" ? s.close > s.open : s.close < s.open;
  return { status: agrees ? "agree" : "disagree" };
}

/**
 * Entry/stop/target construction. Stop = OB far edge padded by 0.1×ATR;
 * target = the bias's draw on liquidity: prior-day extreme first, prior-week
 * extreme when price already cleared it; skip when nothing is left to draw
 * on or the trade pays less than MIN_RR.
 */
export function buildTradePlan({ direction, ob, atrAtConfirm, entryPrice, entrySource, levels, contract }) {
  if (!levels || !Number.isFinite(entryPrice) || !Number.isFinite(atrAtConfirm)) {
    return { ok: false, skipReason: "no-levels" };
  }
  const tickSize = contract?.tickSize ?? null;
  const snap = (p) => (tickSize ? roundToTick(p, tickSize) : p);

  const stop = snap(
    direction === "long"
      ? ob.zoneLow - STOP_ATR_BUFFER * atrAtConfirm
      : ob.zoneHigh + STOP_ATR_BUFFER * atrAtConfirm,
  );
  if (direction === "long" ? stop >= entryPrice : stop <= entryPrice) {
    return { ok: false, skipReason: "bad-stop" };
  }

  const pick = (first, second) => {
    const beyond = (lvl) =>
      Number.isFinite(lvl) && (direction === "long" ? entryPrice < lvl : entryPrice > lvl);
    if (beyond(first.value)) return first;
    if (beyond(second.value)) return second;
    return null;
  };
  const chosen =
    direction === "long"
      ? pick({ value: levels.pdh, label: "pdh" }, { value: levels.pwh, label: "pwh" })
      : pick({ value: levels.pdl, label: "pdl" }, { value: levels.pwl, label: "pwl" });
  if (!chosen) return { ok: false, skipReason: "no-target" };

  const target = snap(chosen.value);
  const riskPoints = Math.abs(entryPrice - stop);
  const rewardPoints = Math.abs(target - entryPrice);
  const rr = riskPoints > 0 ? rewardPoints / riskPoints : 0;
  if (rr < MIN_RR) return { ok: false, skipReason: "min-rr", rr };

  return {
    ok: true,
    entry: snap(entryPrice),
    stop,
    target,
    targetLabel: chosen.label,
    riskPoints,
    rewardPoints,
    rr,
    entrySource,
  };
}

/**
 * The live setup state machine — where the user is in the sequence
 * Bias → Order block → Tap → Confirmation → Entry.
 *
 * @returns { state, direction, ob, confirm, smt, plan, skipReason, activeUntil }
 */
export function computeSetupState({
  bias,
  candles4h, // completed buckets only
  forming4h, // partial bucket or null
  obTimeline,
  siblingByTime,
  hasPair,
  m15Candles, // or null
  levels,
  contract,
  now,
}) {
  const base = {
    state: "NO_BIAS",
    direction: null,
    ob: null,
    confirm: null,
    smt: null,
    plan: null,
    skipReason: null,
    activeUntil: null,
  };
  if (!bias || bias.bias === "neutral") return base;
  const direction = bias.bias;
  base.direction = direction;

  const n = candles4h?.length ?? 0;
  const obIdx = n > 0 ? obTimeline?.inPlay?.[direction]?.[n - 1] ?? -1 : -1;
  if (obIdx < 0) return { ...base, state: "WAITING_FOR_OB" };
  const ob = obTimeline.obs[obIdx];
  base.ob = ob;

  // Most recent completed 4H candle that rejected off the OB in play, whose
  // close belongs to TODAY's trading day — yesterday's confirmation was
  // approved by yesterday's bias and never carries into today.
  let confirmIdx = -1;
  for (let i = n - 1; i > ob.displacementIndex; i--) {
    if (!isRejectionClose(candles4h[i], ob)) continue;
    const closeTime = candles4h[i].time + H4_SECONDS;
    if (tradingDayKey(closeTime, MARKET_TZ) !== tradingDayKey(now, MARKET_TZ)) break;
    confirmIdx = i;
    break;
  }

  if (confirmIdx >= 0) {
    const confirmCandle = candles4h[confirmIdx];
    const entryTime = confirmCandle.time + H4_SECONDS;
    const confirm = { index: confirmIdx, time: confirmCandle.time, closeTime: entryTime };

    // Entry window: 12×15m after the confirming close, cut short by a 15m
    // close through the stop, a target touch, or the OB dying.
    const windowEnd = entryTime + ENTRY_WINDOW_15M_BARS * 900;

    const smt = checkSmtAgreement({
      direction,
      bucketTime: confirmCandle.time,
      siblingByTime,
      hasPair,
    });

    // Entry price: first 15m open at/after the confirming close.
    let entryPrice = confirmCandle.close;
    let entrySource = "4h-close";
    if (Array.isArray(m15Candles)) {
      const bar = m15Candles.find((c) => c.time >= entryTime);
      if (bar) {
        entryPrice = bar.open;
        entrySource = "15m-open";
      }
    }

    const atrAtConfirm = obTimeline.atr14?.[confirmIdx] ?? null;
    const plan = buildTradePlan({
      direction, ob, atrAtConfirm, entryPrice, entrySource, levels, contract,
    });

    let windowOpen = now < windowEnd;
    if (windowOpen && plan.ok && Array.isArray(m15Candles)) {
      for (const c of m15Candles) {
        if (c.time < entryTime || c.time + 900 > now) continue; // completed bars only
        const stopped = direction === "long" ? c.close < plan.stop : c.close > plan.stop;
        const hitTarget = direction === "long" ? c.high >= plan.target : c.low <= plan.target;
        if (stopped || hitTarget) {
          windowOpen = false;
          break;
        }
      }
    }

    if (windowOpen) {
      if (smt.status === "disagree" || smt.status === "no-data") {
        return { ...base, state: "SMT_BLOCKED", confirm, smt };
      }
      if (plan.ok) {
        return {
          ...base,
          state: "SETUP_ACTIVE",
          confirm,
          smt,
          plan,
          activeUntil: windowEnd,
        };
      }
      // Confirmation fired but the plan was skipped — surface why.
      return {
        ...base,
        state: tapsZoneState(forming4h, ob),
        confirm,
        smt,
        skipReason: plan.skipReason,
      };
    }
  }

  return { ...base, state: tapsZoneState(forming4h, ob) };
}

function tapsZoneState(forming4h, ob) {
  return forming4h && tapsZone(forming4h, ob) ? "AWAITING_CONFIRMATION" : "WAITING_FOR_TAP";
}
