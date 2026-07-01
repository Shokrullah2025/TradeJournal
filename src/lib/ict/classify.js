// ICT candle classification — works on any timeframe's OHLC (daily and weekly
// here). Pure: candle + prior candle + a reference range in, classification out.

/**
 * Classifies a candle relative to its predecessor, ICT-style.
 *
 * Evaluation order (first match wins):
 *   1. consolidation — inside bar, or range < 0.6 × refRange
 *   2. reversal      — swept the prior extreme and closed back through the
 *                      middle in the opposite direction (sweep + displace)
 *   3. expansion     — range ≥ 1.15 × refRange with body ≥ 50% of range
 *   4. retracement   — everything else (default bucket)
 *
 * @param {{open,high,low,close}} c   the candle to classify
 * @param {{open,high,low,close}} p   the prior candle
 * @param {number} refRange           typical range (daily: ATR14; weekly: SMA8 of ranges)
 */
export function classifyCandle(c, p, refRange) {
  const range = c.high - c.low;
  const body = Math.abs(c.close - c.open);
  const mid = (c.high + c.low) / 2;

  // Body direction, tie-broken by close vs prior close.
  let direction = "none";
  if (c.close > c.open) direction = "up";
  else if (c.close < c.open) direction = "down";
  else if (c.close > p.close) direction = "up";
  else if (c.close < p.close) direction = "down";

  const tookPriorHigh = c.high > p.high;
  const tookPriorLow = c.low < p.low;
  const failedPriorHigh = tookPriorHigh && c.close < p.high;
  const failedPriorLow = tookPriorLow && c.close > p.low;

  let closeLocation = "middle";
  if (range > 0) {
    if (c.close >= c.low + (2 / 3) * range) closeLocation = "upper";
    else if (c.close <= c.low + (1 / 3) * range) closeLocation = "lower";
  }

  const hasRef = Number.isFinite(refRange) && refRange > 0;
  const rangeVsRef = hasRef ? range / refRange : null;
  const bodyPct = range > 0 ? body / range : 0;

  const insideBar = c.high <= p.high && c.low >= p.low;

  let type;
  let typeDirection = direction;
  if (insideBar || (hasRef && range < 0.6 * refRange)) {
    type = "consolidation";
  } else if (tookPriorLow && c.close > c.open && c.close > mid) {
    // Swept sell-side liquidity, closed strong in the upper half. An outside
    // bar lands here too, resolved by its close — a sweep-then-displace day
    // is a reversal in ICT terms.
    type = "reversal";
    typeDirection = "up";
  } else if (tookPriorHigh && c.close < c.open && c.close < mid) {
    type = "reversal";
    typeDirection = "down";
  } else if (hasRef && range >= 1.15 * refRange && bodyPct >= 0.5) {
    type = "expansion";
  } else {
    type = "retracement";
  }

  const pct = (v) => (v == null ? "n/a" : `${Math.round(v * 100)}%`);
  const detail =
    type === "consolidation"
      ? insideBar
        ? "Inside bar — held within the prior candle's range"
        : `Narrow range (${pct(rangeVsRef)} of typical)`
      : type === "reversal"
        ? typeDirection === "up"
          ? "Swept the prior low, closed back in the upper half"
          : "Swept the prior high, closed back in the lower half"
        : type === "expansion"
          ? `Expansion ${typeDirection}: range ${pct(rangeVsRef)} of typical, body ${pct(bodyPct)} of range`
          : `Retracement ${typeDirection === "none" ? "" : typeDirection} — traded back inside recent range`;

  return {
    type,
    direction: type === "reversal" ? typeDirection : direction,
    range,
    bodyPct,
    rangeVsRef,
    closeLocation,
    tookPriorHigh,
    tookPriorLow,
    failedPriorHigh,
    failedPriorLow,
    detail,
  };
}

/**
 * The dealing range: highest high / lowest low over the trailing `lookback`
 * candles ending at index i, with the 50% equilibrium. ICT premium/discount:
 * longs are favored below equilibrium (discount), shorts above (premium).
 * A ±5% band around equilibrium counts as neutral.
 * Returns null when there isn't enough history.
 */
export function dealingRange(candles, i, lookback = 20) {
  if (!Array.isArray(candles) || i < lookback - 1 || i >= candles.length) return null;
  let high = -Infinity;
  let low = Infinity;
  for (let k = i - lookback + 1; k <= i; k++) {
    high = Math.max(high, candles[k].high);
    low = Math.min(low, candles[k].low);
  }
  const span = high - low;
  const eq = (high + low) / 2;
  const close = candles[i].close;
  let position = "equilibrium";
  if (span > 0 && Math.abs(close - eq) > 0.05 * span) {
    position = close > eq ? "premium" : "discount";
  }
  return {
    high,
    low,
    eq,
    position,
    pctInRange: span > 0 ? (close - low) / span : 0.5,
  };
}
