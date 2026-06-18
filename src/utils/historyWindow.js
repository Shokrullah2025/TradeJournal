// Window math for the read-only history-session chart viewer.
//
// A saved backtest session is replayed as a *static* candle window framed on
// where the user actually placed orders. To keep the candle size identical
// across the 15m / 1h / 4h timeframes (and non-zoomable), the viewer always
// shows the same fixed number of bars, centered on the trade cluster — so a
// fit-to-width render produces the same candle width on every timeframe.
//
// All times are unix seconds (matching lightweight-charts and the candle/trade
// `time`/`timestamp`/`exitTime` fields).

// Fixed bar count shown on every timeframe — roughly a 15m futures day, so the
// 15m view looks unchanged and the higher timeframes adopt that same candle size.
export const HISTORY_VIEWER_BARS = 120;

// Earliest entry and latest exit across a session's trades, in seconds.
// Returns null when there are no usable trade timestamps.
function tradeCoreRange(trades) {
  let from = Infinity;
  let to = -Infinity;
  for (const t of trades || []) {
    const entry = t?.timestamp;
    const exit = t?.exitTime ?? t?.timestamp;
    if (typeof entry === "number") from = Math.min(from, entry);
    if (typeof exit === "number") to = Math.max(to, exit);
  }
  if (!isFinite(from) || !isFinite(to)) return null;
  return { from, to };
}

// Index range of the candles spanning the trade cluster. Returns null when the
// trades have no timestamps that fall within the series.
function tradeCoreIndices(candles, core) {
  let iFrom = candles.findIndex((c) => c.time >= core.from);
  if (iFrom === -1) iFrom = candles.length - 1;
  let iTo = iFrom;
  for (let i = candles.length - 1; i >= 0; i--) {
    if (candles[i].time <= core.to) {
      iTo = i;
      break;
    }
  }
  return { iFrom, iTo: Math.max(iTo, iFrom) };
}

/**
 * Return a fixed-size slice of an ascending candle series, centered on the
 * session's trades. Always `targetBars` candles when the series is long enough,
 * so the rendered candle width is the same on every timeframe.
 */
export function sliceCandlesAroundTrades(candles, trades, targetBars = HISTORY_VIEWER_BARS) {
  if (!Array.isArray(candles) || candles.length === 0) return [];
  if (candles.length <= targetBars) return candles.slice();

  const core = tradeCoreRange(trades);
  if (!core) {
    // No trade timestamps — fall back to the most recent bars.
    return candles.slice(candles.length - targetBars);
  }

  const { iFrom, iTo } = tradeCoreIndices(candles, core);
  const center = Math.round((iFrom + iTo) / 2);
  let start = center - Math.floor(targetBars / 2);
  start = Math.max(0, Math.min(start, candles.length - targetBars));
  return candles.slice(start, start + targetBars);
}
