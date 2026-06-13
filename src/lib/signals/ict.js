// Pure ICT-concept detectors for the signal engine (TTrades / ICT definitions):
// daily bias, daily profile (OLHC/OHLC), Asia+London session read, SMT
// divergence, CISD (change in state of delivery), FVG/order block respect,
// and a choppiness gate via Kaufman efficiency ratio.
// All functions are deterministic — candles + timestamps in, plain objects out.

import { MARKET_TZ, minutesOfDayInTz } from "./sessions";
import { findSwings } from "./indicators";

/** Midnight ET (ICT midnight open) for the day containing `unixSeconds`. */
export function midnightET(unixSeconds) {
  return unixSeconds - minutesOfDayInTz(unixSeconds, MARKET_TZ) * 60;
}

/** Candles within [startUnix, endUnix). */
export function candlesBetween(candles, startUnix, endUnix) {
  return candles.filter((c) => c.time >= startUnix && c.time < endUnix);
}

/** High/low/open/close of a candle slice, or null if empty. */
export function sliceRange(candles) {
  if (!candles.length) return null;
  let high = -Infinity;
  let low = Infinity;
  for (const c of candles) {
    if (c.high > high) high = c.high;
    if (c.low < low) low = c.low;
  }
  return { high, low, open: candles[0].open, close: candles[candles.length - 1].close };
}

/**
 * TTrades-style daily bias from completed daily candles.
 * Continuation: close beyond previous day's range. Reversal: sweep of the
 * previous day's high/low with a close back inside. Wicks ignored for the
 * close logic; sweeps use the wick by definition.
 *
 * @param {Array} dailyCandles ascending daily OHLC
 * @param {number} now unix seconds — used to drop today's forming candle
 * @returns {{bias:'long'|'short'|null, reason:string, target:{price:number,label:string}|null}}
 */
export function dailyBias(dailyCandles, now) {
  if (!dailyCandles || dailyCandles.length < 3) {
    return { bias: null, reason: "Not enough daily history", target: null };
  }
  // Drop the still-forming candle for "today"
  const todayStart = midnightET(now);
  const arr = dailyCandles[dailyCandles.length - 1].time >= todayStart
    ? dailyCandles.slice(0, -1)
    : dailyCandles;
  if (arr.length < 2) return { bias: null, reason: "Not enough daily history", target: null };

  const prev = arr[arr.length - 1]; // last completed day
  const prior = arr[arr.length - 2];

  let bias = null;
  let reason = "Inside day — no clear daily bias";
  if (prev.close > prior.high) {
    bias = "long";
    reason = `Daily close ${prev.close.toFixed(2)} above prior day high ${prior.high.toFixed(2)} — bullish continuation`;
  } else if (prev.close < prior.low) {
    bias = "short";
    reason = `Daily close ${prev.close.toFixed(2)} below prior day low ${prior.low.toFixed(2)} — bearish continuation`;
  } else if (prev.low < prior.low && prev.close >= prior.low) {
    bias = "long";
    reason = `Swept prior day low ${prior.low.toFixed(2)} and closed back inside — bullish reversal`;
  } else if (prev.high > prior.high && prev.close <= prior.high) {
    bias = "short";
    reason = `Swept prior day high ${prior.high.toFixed(2)} and closed back inside — bearish reversal`;
  }

  // Draw on liquidity: nearest unswept daily swing in the bias direction,
  // falling back to the 20-day extreme.
  let target = null;
  if (bias) {
    const swings = findSwings(arr, 2);
    const ref = prev.close;
    if (bias === "long") {
      const above = swings.highs.filter((s) => s.price > ref);
      const nearest = above.length ? above.reduce((a, b) => (b.price < a.price ? b : a)) : null;
      const extreme = Math.max(...arr.slice(-20).map((c) => c.high));
      target = nearest
        ? { price: nearest.price, label: "relevant swing high" }
        : { price: extreme, label: "20-day extreme high" };
    } else {
      const below = swings.lows.filter((s) => s.price < ref);
      const nearest = below.length ? below.reduce((a, b) => (b.price > a.price ? b : a)) : null;
      const extreme = Math.min(...arr.slice(-20).map((c) => c.low));
      target = nearest
        ? { price: nearest.price, label: "relevant swing low" }
        : { price: extreme, label: "20-day extreme low" };
    }
  }
  return { bias, reason, target };
}

/**
 * How today's daily candle is forming: OLHC (low first, then high — bullish
 * profile) vs OHLC (high first, then low — bearish profile).
 */
export function classifyDailyProfile(todayCandles) {
  if (!todayCandles || todayCandles.length < 6) {
    return { profile: null, direction: null, detail: "Too early in the day to classify the profile" };
  }
  let idxHigh = 0;
  let idxLow = 0;
  todayCandles.forEach((c, i) => {
    if (c.high > todayCandles[idxHigh].high) idxHigh = i;
    if (c.low < todayCandles[idxLow].low) idxLow = i;
  });
  const n = todayCandles.length;
  if (idxLow < idxHigh && idxLow <= n / 2) {
    return {
      profile: "OLHC",
      direction: "long",
      detail: "Open → Low formed early, High later — OLHC profile forming (bullish)",
    };
  }
  if (idxHigh < idxLow && idxHigh <= n / 2) {
    return {
      profile: "OHLC",
      direction: "short",
      detail: "Open → High formed early, Low later — OHLC profile forming (bearish)",
    };
  }
  return { profile: null, direction: null, detail: "High/low order unclear — profile not yet defined" };
}

/**
 * Asia (20:00–00:00 ET prior evening) and London KZ (02:00–05:00 ET) read:
 * did London sweep an Asia extreme and reclaim it (manipulation), or expand
 * through it (continuation)?
 */
export function asiaLondonRead(candles, now) {
  const mid = midnightET(now);
  const asiaCandles = candlesBetween(candles, mid - 4 * 3600, mid);
  const asia = sliceRange(asiaCandles);
  const london = candlesBetween(candles, mid + 2 * 3600, mid + 5 * 3600);
  const lon = sliceRange(london);

  const asiaInfo = asia
    ? {
        high: asia.high,
        low: asia.low,
        startTime: asiaCandles[0].time,
        endTime: asiaCandles[asiaCandles.length - 1].time,
      }
    : null;
  const londonInfo = lon
    ? {
        high: lon.high,
        low: lon.low,
        startTime: london[0].time,
        endTime: london[london.length - 1].time,
      }
    : null;

  if (!asia) {
    return { direction: null, detail: "No Asia session data", asia: null, london: null, sweep: null };
  }
  if (!lon) {
    return { direction: null, detail: "London session not formed yet", asia: asiaInfo, london: null, sweep: null };
  }

  // First London candle that took out an Asia extreme (for the chart marker)
  const sweepOf = (side) => {
    const c =
      side === "low"
        ? london.find((k) => k.low < asia.low)
        : london.find((k) => k.high > asia.high);
    return c ? { time: c.time, price: side === "low" ? asia.low : asia.high, side } : null;
  };

  if (lon.low < asia.low && lon.close > asia.low) {
    return {
      direction: "long",
      detail: `London swept Asia low ${asia.low.toFixed(2)} and reclaimed it — bullish manipulation`,
      asia: asiaInfo,
      london: londonInfo,
      sweep: sweepOf("low"),
    };
  }
  if (lon.high > asia.high && lon.close < asia.high) {
    return {
      direction: "short",
      detail: `London swept Asia high ${asia.high.toFixed(2)} and reclaimed it — bearish manipulation`,
      asia: asiaInfo,
      london: londonInfo,
      sweep: sweepOf("high"),
    };
  }
  if (lon.close > asia.high) {
    return {
      direction: "long",
      detail: "London expanded and closed above the Asia high — bullish continuation",
      asia: asiaInfo,
      london: londonInfo,
      sweep: sweepOf("high"),
    };
  }
  if (lon.close < asia.low) {
    return {
      direction: "short",
      detail: "London closed below the Asia low — bearish continuation",
      asia: asiaInfo,
      london: londonInfo,
      sweep: sweepOf("low"),
    };
  }
  return {
    direction: null,
    detail: "London stayed inside the Asia range — no clear read",
    asia: asiaInfo,
    london: londonInfo,
    sweep: null,
  };
}

/**
 * SMT divergence between the traded symbol and one correlated market,
 * compared at TIME-ALIGNED swings — both instruments must have made their
 * swing during the same liquidity event (within a few bars), otherwise the
 * comparison is meaningless.
 *
 * Bullish: symbol sweeps the low (lower low) while the correlated market
 * holds it (higher/equal low). Bearish: symbol makes a higher high while the
 * correlated market fails to make one.
 *
 * @returns {{type, detail, points, kind}} points = the traded symbol's two
 *          swings (for drawing on its chart), kind = 'LL vs HL' | 'HH vs LH'
 */
export function smtDivergence(symCandles, corrCandles, lookback = 3) {
  if (!symCandles || !corrCandles || corrCandles.length < 20) {
    return { type: null, detail: "Correlated market data unavailable", points: null, kind: null };
  }
  const a = findSwings(symCandles, lookback);
  const b = findSwings(corrCandles, lookback);

  // A swing on the correlated market "matches" if it formed within ±5 bars
  const interval = symCandles.length > 1 ? symCandles[1].time - symCandles[0].time : 60;
  const tol = interval * 5;
  const nearest = (list, t) => {
    let best = null;
    for (const s of list) {
      if (Math.abs(s.time - t) <= tol && (!best || Math.abs(s.time - t) < Math.abs(best.time - t))) {
        best = s;
      }
    }
    return best;
  };

  // points = the traded symbol's two diverging swings, for drawing on its chart
  let bullish = null;
  if (a.lows.length >= 2) {
    const [aL1, aL2] = a.lows.slice(-2);
    const bL1 = nearest(b.lows, aL1.time);
    const bL2 = nearest(b.lows, aL2.time);
    if (bL1 && bL2 && bL1 !== bL2 && aL2.price < aL1.price && bL2.price >= bL1.price) {
      bullish = { when: aL2.time, points: [aL1, aL2] };
    }
  }
  let bearish = null;
  if (a.highs.length >= 2) {
    const [aH1, aH2] = a.highs.slice(-2);
    const bH1 = nearest(b.highs, aH1.time);
    const bH2 = nearest(b.highs, aH2.time);
    if (bH1 && bH2 && bH1 !== bH2 && aH2.price > aH1.price && bH2.price <= bH1.price) {
      bearish = { when: aH2.time, points: [aH1, aH2] };
    }
  }

  const bullRes = bullish && {
    type: "long",
    detail: "Swept the low while correlated market held its low (LL vs HL) — bullish SMT",
    points: bullish.points,
    kind: "LL vs HL",
  };
  const bearRes = bearish && {
    type: "short",
    detail: "Higher high not confirmed by correlated market (HH vs LH) — bearish SMT",
    points: bearish.points,
    kind: "HH vs LH",
  };

  if (bullRes && bearRes) {
    // Use whichever divergence is more recent
    return bullish.when > bearish.when ? bullRes : bearRes;
  }
  if (bullRes) return bullRes;
  if (bearRes) return bearRes;
  if (a.lows.length < 2 || b.lows.length < 2) {
    return { type: null, detail: "Not enough swings to compare", points: null, kind: null };
  }
  return { type: null, detail: "Swings aligned at matching times — no SMT divergence", points: null, kind: null };
}

/**
 * TTrades fractal candle model on the higher timeframe.
 * Candle 1 sets the reference range. Candle 2 sweeps candle 1's low (or high)
 * but its BODY closes back inside the range — the swing is formed. Candle 3
 * must respect candle 2's 50% (equilibrium) — a small wick below is tolerated
 * — and then candle 3/4 expand beyond candle 2's extreme. The LTF entry (CISD)
 * is taken in the direction of this model.
 *
 * Stages: 'swept' (swing formed, awaiting candle 3) → 'respecting' (candle 3
 * holding 50% — entry window) → 'expanding' (candle 3/4 expanding).
 *
 * @returns {{direction:'long'|'short'|null, stage:string|null, detail:string,
 *            c2:{high:number,low:number,time:number}|null, mid:number|null}}
 */
export function ttradesFractal(candles, toleranceFrac = 0.15) {
  if (!candles || candles.length < 3) {
    return { direction: null, stage: null, detail: "Not enough higher-timeframe candles", c2: null, mid: null };
  }
  const n = candles.length;
  // Try candle 2 at n-2 (candle 3 is the live candle), then at n-3
  // (candle 3 complete, candle 4 live) — most recent formation wins.
  for (const i of [n - 2, n - 3]) {
    if (i < 1) continue;
    const c1 = candles[i - 1];
    const c2 = candles[i];
    const c3 = i + 1 < n ? candles[i + 1] : null;
    const c4 = i + 2 < n ? candles[i + 2] : null;
    const range2 = c2.high - c2.low;
    if (range2 <= 0) continue;
    const tol = toleranceFrac * range2;

    if (c2.low < c1.low && c2.close > c1.low) {
      const r = fractalStage("long", c2, c3, c4, c2.low + range2 / 2, tol);
      if (r) return r;
    }
    if (c2.high > c1.high && c2.close < c1.high) {
      const r = fractalStage("short", c2, c3, c4, c2.high - range2 / 2, tol);
      if (r) return r;
    }
  }
  return { direction: null, stage: null, detail: "No HTF sweep & reclaim formation", c2: null, mid: null };
}

function fractalStage(direction, c2, c3, c4, mid, tol) {
  const long = direction === "long";
  const base = { direction, c2: { high: c2.high, low: c2.low, time: c2.time }, mid };
  if (!c3) {
    return {
      ...base,
      stage: "swept",
      detail: `Candle 2 swept the ${long ? "low" : "high"} and closed back inside — awaiting candle 3`,
    };
  }
  // Invalidation: candle 3 body closes beyond candle 2's extreme against the setup
  if (long ? c3.close < c2.low : c3.close > c2.high) return null;
  // Invalidation: 50% broken beyond the wick tolerance
  if (long ? c3.low < mid - tol : c3.high > mid + tol) return null;

  const c3exp = long ? c3.close > c2.high : c3.close < c2.low;
  const c4exp = c4 && (long ? c4.close > c2.high : c4.close < c2.low);
  if (c3exp || c4exp) {
    return {
      ...base,
      stage: "expanding",
      detail: `Candle ${c4exp ? "4" : "3"} expanding ${long ? "above" : "below"} candle 2 — trade with the expansion`,
    };
  }
  if (long ? c3.close >= mid : c3.close <= mid) {
    return {
      ...base,
      stage: "respecting",
      detail: `Candle 3 respecting candle 2's 50% (${mid.toFixed(2)}) — look for a ${long ? "bullish" : "bearish"} CISD on the entry timeframe`,
    };
  }
  return {
    ...base,
    stage: "swept",
    detail: "Candle 3 inside candle 2's range — formation intact, awaiting confirmation",
  };
}

/**
 * Kaufman efficiency ratio over the last `n` closes: 1 = perfectly directional,
 * 0 = pure chop. Used as the higher-timeframe "supports expansion" gate.
 */
export function efficiencyRatio(candles, n = 20) {
  if (!candles || candles.length < n + 1) return null;
  const s = candles.slice(-(n + 1));
  let noise = 0;
  for (let i = 1; i < s.length; i++) noise += Math.abs(s[i].close - s[i - 1].close);
  if (noise === 0) return 0;
  return Math.abs(s[s.length - 1].close - s[0].close) / noise;
}

/**
 * Most recent CISD on the given candles (TTrades definition, bodies only):
 * bullish — a candle CLOSES above the opening price of the first candle in
 * the preceding consecutive series of down-close candles; bearish mirrored.
 * Wick pokes don't count.
 *
 * @returns {{direction:'long'|'short', level:number, index:number}|null}
 */
export function detectCISD(candles, scan = 40) {
  if (!candles || candles.length < 5) return null;
  const start = Math.max(2, candles.length - scan);
  let best = null;
  for (let i = candles.length - 1; i >= start; i--) {
    const c = candles[i];
    if (c.close > c.open) {
      // candidate bullish CISD: series of down-closes immediately before i
      let s = i - 1;
      while (s >= 1 && candles[s].close < candles[s].open) s--;
      const seriesLen = i - 1 - s;
      if (seriesLen >= 1) {
        const level = candles[s + 1].open; // open of FIRST candle in the down series
        if (c.close > level) {
          best = {
            direction: "long",
            level,
            index: i,
            time: c.time,
            seriesStartTime: candles[s + 1].time,
          };
          break;
        }
      }
    }
    if (c.close < c.open) {
      let s = i - 1;
      while (s >= 1 && candles[s].close > candles[s].open) s--;
      const seriesLen = i - 1 - s;
      if (seriesLen >= 1) {
        const level = candles[s + 1].open;
        if (c.close < level) {
          best = {
            direction: "short",
            level,
            index: i,
            time: c.time,
            seriesStartTime: candles[s + 1].time,
          };
          break;
        }
      }
    }
  }
  return best;
}

/**
 * Most recent fair value gaps (3-candle imbalance) in each direction, with a
 * respect status:
 *  - 'untested'  — price hasn't returned to the gap yet
 *  - 'respected' — price traded into the gap and closed back out in its direction
 *  - 'violated'  — price closed through the far side of the gap
 */
export function findRecentFVGs(candles, scan = 60) {
  const out = { bullish: null, bearish: null };
  if (!candles || candles.length < 5) return out;
  const start = Math.max(1, candles.length - scan);

  for (let i = candles.length - 2; i >= start; i--) {
    const prevHigh = candles[i - 1].high;
    const nextLow = candles[i + 1].low;
    const prevLow = candles[i - 1].low;
    const nextHigh = candles[i + 1].high;

    if (!out.bullish && nextLow > prevHigh) {
      out.bullish = gradeFVG(candles, i + 1, { side: "buy", priceLow: prevHigh, priceHigh: nextLow, anchorTime: candles[i].time, kind: "FVG" }, "long");
    }
    if (!out.bearish && nextHigh < prevLow) {
      out.bearish = gradeFVG(candles, i + 1, { side: "sell", priceLow: nextHigh, priceHigh: prevLow, anchorTime: candles[i].time, kind: "FVG" }, "short");
    }
    if (out.bullish && out.bearish) break;
  }
  return out;
}

function gradeFVG(candles, formedAt, zone, direction) {
  let status = "untested";
  for (let j = formedAt + 1; j < candles.length; j++) {
    const c = candles[j];
    if (direction === "long") {
      if (c.close < zone.priceLow) { status = "violated"; break; }
      if (c.low <= zone.priceHigh) status = "respected";
    } else {
      if (c.close > zone.priceHigh) { status = "violated"; break; }
      if (c.high >= zone.priceLow) status = "respected";
    }
  }
  return { ...zone, status, direction };
}
