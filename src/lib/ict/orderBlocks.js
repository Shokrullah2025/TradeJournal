// ICT order blocks on the 4H — the "right place" the user's entry model waits
// for. A bullish OB is the last down-candle before an upward displacement: the
// zone institutions filled from. Pure and deterministic; one O(n) pass builds
// the full validity timeline so the live page and the backtest replay read the
// same history.

import { atr } from "../signals/indicators";

// The impulse leaving the OB must cover at least this many 4H ATRs…
export const DISPLACEMENT_ATR_MULT = 1.0;
// …within this many candles after the OB candle.
export const DISPLACEMENT_WINDOW = 3;
// Bounded per-direction active list — keeps the timeline pass amortized O(n).
export const MAX_ACTIVE_OBS = 8;

/**
 * Detects every order block and tracks which one is "in play" per direction
 * after each candle close.
 *
 * Bullish OB at index j (mirrored for bearish):
 * - candles[j] is bearish (close < open);
 * - some k in (j, j+DISPLACEMENT_WINDOW] CLOSES above high[j] — a body close
 *   beyond the whole range is acceptance; a wick poke is just a liquidity
 *   grab — AND high[k] − close[j] ≥ DISPLACEMENT_ATR_MULT × atr14[j]. The
 *   leg is measured from the OB candle's close (where the displacement
 *   originates) with the ATR taken BEFORE the move, so the displacement
 *   candle can't inflate its own yardstick.
 * - Invalidation: any later candle CLOSES through the far edge (below
 *   zoneLow for longs). A wick through with a close back inside keeps it.
 * - Stillborn: if the far edge is closed through between j and the
 *   displacement candle, the OB never activates.
 *
 * @returns {
 *   atr14,                       // the ATR array used
 *   obs: [{ id, direction, zoneLow, zoneHigh, obIndex, obTime,
 *           displacementIndex, displacementTime, invalidatedIndex }],
 *   inPlay: { long: number[], short: number[] },  // inPlay[dir][i] = index
 * }                              // into obs of the OB in play as of the
 *                                // close of candle i, or -1
 */
export function buildObTimeline(candles4h, { atr14: atrIn } = {}) {
  const n = Array.isArray(candles4h) ? candles4h.length : 0;
  const atr14 = atrIn ?? atr(candles4h || [], 14);
  const obs = [];
  const inPlay = {
    long: new Array(n).fill(-1),
    short: new Array(n).fill(-1),
  };
  if (n === 0) return { atr14, obs, inPlay };

  // Detection pass: find each OB and its displacement index.
  for (let j = 0; j < n - 1; j++) {
    const ref = atr14[j];
    if (ref == null || ref <= 0) continue;
    const c = candles4h[j];

    const bearish = c.close < c.open;
    const bullish = c.close > c.open;
    if (!bearish && !bullish) continue;

    const direction = bearish ? "long" : "short"; // a down-candle seeds a bullish OB
    let displacementIndex = null;
    let stillborn = false;
    for (let k = j + 1; k <= j + DISPLACEMENT_WINDOW && k < n; k++) {
      const d = candles4h[k];
      // Far-edge close before displacement → the zone died before it was born.
      if (direction === "long" ? d.close < c.low : d.close > c.high) {
        stillborn = true;
        break;
      }
      const displaced =
        direction === "long"
          ? d.close > c.high && d.high - c.close >= DISPLACEMENT_ATR_MULT * ref
          : d.close < c.low && c.close - d.low >= DISPLACEMENT_ATR_MULT * ref;
      if (displaced) {
        displacementIndex = k;
        break;
      }
    }
    if (stillborn || displacementIndex == null) continue;

    obs.push({
      id: `${direction}-${candles4h[j].time}`,
      direction,
      zoneLow: c.low,
      zoneHigh: c.high,
      obIndex: j,
      obTime: c.time,
      displacementIndex,
      displacementTime: candles4h[displacementIndex].time,
      invalidatedIndex: null,
    });
  }

  // Timeline pass: per direction, a bounded stack of active OBs. Newest valid
  // wins; when it dies, the next older valid one is back in play.
  const active = { long: [], short: [] };
  const activatesAt = new Map(); // displacementIndex -> obs indexes
  obs.forEach((ob, idx) => {
    const list = activatesAt.get(ob.displacementIndex) || [];
    list.push(idx);
    activatesAt.set(ob.displacementIndex, list);
  });

  for (let i = 0; i < n; i++) {
    const c = candles4h[i];
    for (const dir of ["long", "short"]) {
      const stack = active[dir];
      // Invalidate on far-edge close.
      for (let s = stack.length - 1; s >= 0; s--) {
        const ob = obs[stack[s]];
        const dead = dir === "long" ? c.close < ob.zoneLow : c.close > ob.zoneHigh;
        if (dead && i > ob.displacementIndex) {
          ob.invalidatedIndex = i;
          stack.splice(s, 1);
        }
      }
    }
    // Activate OBs whose displacement candle just closed.
    for (const idx of activatesAt.get(i) || []) {
      const ob = obs[idx];
      const stack = active[ob.direction];
      stack.push(idx);
      if (stack.length > MAX_ACTIVE_OBS) stack.shift();
    }
    inPlay.long[i] = active.long.length ? active.long[active.long.length - 1] : -1;
    inPlay.short[i] = active.short.length ? active.short[active.short.length - 1] : -1;
  }

  return { atr14, obs, inPlay };
}

/** Has this candle traded into the zone? Long: low ≤ zoneHigh. */
export function tapsZone(candle, ob) {
  return ob.direction === "long" ? candle.low <= ob.zoneHigh : candle.high >= ob.zoneLow;
}

/**
 * The confirming candle — classify.js's sweep-and-displace grammar applied to
 * a zone: it dipped in, and closed back beyond the zone in its own bias-side
 * half with a with-bias body.
 */
export function isRejectionClose(candle, ob) {
  if (!tapsZone(candle, ob)) return false;
  const mid = (candle.high + candle.low) / 2;
  return ob.direction === "long"
    ? candle.close > ob.zoneHigh && candle.close > mid && candle.close > candle.open
    : candle.close < ob.zoneLow && candle.close < mid && candle.close < candle.open;
}
