import { CrosshairMode } from "lightweight-charts";

// TradingView light theme — exact values from TradingView's default "White" theme
export const TV_LIGHT = {
  bg: "#ffffff",
  bgAlt: "#f0f3fa",
  text: "#131722",
  textMuted: "#787b86",
  grid: "#e1ecf2",
  border: "#d1d4dc",
  up: "#089981",
  down: "#f23645",
  upBorder: "#089981",
  downBorder: "#f23645",
  ema20: "#f7a600",
  ema50: "#1E53E5",
  volUp: "rgba(8,153,129,0.3)",
  volDown: "rgba(242,54,69,0.3)",
};

export const TV_DARK = {
  bg: "#131722",
  bgAlt: "#1e222d",
  text: "#d1d4dc",
  textMuted: "#787b86",
  grid: "#2a2e39",
  border: "#363c4e",
  up: "#089981",
  down: "#f23645",
  upBorder: "#089981",
  downBorder: "#f23645",
  ema20: "#f7a600",
  ema50: "#2962ff",
  volUp: "rgba(8,153,129,0.3)",
  volDown: "rgba(242,54,69,0.3)",
};

// Default Fibonacci retracement levels — drawings without a custom `levels`
// array fall back to these. Each level: ratio, line color, visibility.
export const DEFAULT_FIB_LEVELS = [
  { r: 0,     color: "#787b86", visible: true },
  { r: 0.236, color: "#089981", visible: true },
  { r: 0.382, color: "#089981", visible: true },
  { r: 0.5,   color: "#f7a600", visible: true },
  { r: 0.618, color: "#089981", visible: true },
  { r: 0.786, color: "#089981", visible: true },
  { r: 1.0,   color: "#787b86", visible: true },
];

// Builds a smoothed SVG path through raw stroke points (quadratic curves
// through segment midpoints) so brush strokes render as curves, not jagged
// polylines. `pts` = [{x, y}, ...].
export function buildSmoothPath(pts) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2;
    const my = (pts[i].y + pts[i + 1].y) / 2;
    d += ` Q ${pts[i].x} ${pts[i].y} ${mx} ${my}`;
  }
  const last = pts[pts.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

/**
 * Formats a price for display, trimming trailing zero decimals:
 *   27400.00 → "27400", 2799.80 → "2799.8", 291.13 → "291.13"
 * No thousands grouping (matches the chart price axis style).
 */
export function trimPrice(v) {
  if (v == null || !isFinite(v)) return "";
  return Number(v).toFixed(2);
}

/**
 * Generates chart options for TradingView Lightweight Charts
 * @param {object} theme - TV_LIGHT or TV_DARK theme object
 * @returns {object} Chart configuration options
 */
export function getChartOptions(theme) {
  return {
    autoSize: true,
    localization: { priceFormatter: trimPrice },
    layout: {
      background: { color: theme.bg },
      textColor: theme.text,
      fontSize: 11,
      fontFamily: "'Trebuchet MS', Roboto, sans-serif",
    },
    grid: {
      vertLines: { color: theme.grid, style: 0 },
      horzLines: { color: theme.grid, style: 0 },
    },
    crosshair: {
      mode: CrosshairMode.Normal,
      vertLine: { color: "#758696", width: 1, style: 1, labelBackgroundColor: "#2962ff" },
      horzLine: { color: "#758696", width: 1, style: 1, labelBackgroundColor: "#2962ff" },
    },
    rightPriceScale: {
      borderColor: theme.border,
      scaleMargins: { top: 0.08, bottom: 0.25 },
      textColor: theme.textMuted,
      minimumWidth: 50,
    },
    timeScale: {
      borderColor: theme.border,
      timeVisible: true,
      secondsVisible: false,
      barSpacing: 4,
      minBarSpacing: 2,
      rightOffset: 5,
      textColor: theme.textMuted,
    },
    handleScroll: { mouseWheel: true, pressedMouseMove: true },
    handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
  };
}

/**
 * Applies the user's saved chart appearance settings (candle colors + opacity,
 * background, plain background) on top of the active theme. Must be called
 * both when settings change AND right after the chart/series are (re)created —
 * a freshly built chart starts from theme defaults and would otherwise ignore
 * the saved settings until the user touches a color again.
 *
 * @param {object} chart - Lightweight Charts chart instance
 * @param {object} main - Candlestick series
 * @param {object|null} settings - User chart settings (DEFAULT_CHART_SETTINGS shape)
 * @param {boolean} isDark - Whether dark mode is active
 */
export function applyChartSettings(chart, main, settings, isDark) {
  if (!chart || !main) return;
  const T = isDark ? TV_DARK : TV_LIGHT;
  const cs = settings || {};

  const withOpacity = (hex, opKey) => {
    if (!hex) return null;
    const op = cs[opKey] ?? 100;
    if (op >= 100) return hex;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${(op / 100).toFixed(2)})`;
  };

  const upBody   = withOpacity(cs.upBody,   "upBodyOpacity")   || T.up;
  const downBody = withOpacity(cs.downBody, "downBodyOpacity") || T.down;
  const upBorder   = withOpacity(cs.upBorder,   "upBorderOpacity")   || withOpacity(cs.upBody, "upBodyOpacity")   || T.upBorder;
  const downBorder = withOpacity(cs.downBorder, "downBorderOpacity") || withOpacity(cs.downBody, "downBodyOpacity") || T.downBorder;
  const upWick   = withOpacity(cs.upWick,   "upWickOpacity")   || upBody;
  const downWick = withOpacity(cs.downWick, "downWickOpacity") || downBody;
  const bgColor  = cs.plainBg ? "#ffffff" : (withOpacity(cs.bg, "bgOpacity") || T.bg);

  try {
    chart.applyOptions({
      layout: { background: { color: bgColor } },
      grid: cs.plainBg
        ? { vertLines: { visible: false }, horzLines: { visible: false } }
        : { vertLines: { color: T.grid, style: 0 }, horzLines: { color: T.grid, style: 0 } },
    });
    main.applyOptions({
      upColor: upBody, downColor: downBody,
      borderUpColor: upBorder, borderDownColor: downBorder,
      wickUpColor: upWick, wickDownColor: downWick,
    });
  } catch {}
}

/**
 * Calculates exponential moving average for candle data
 * @param {Array} candles - Array of candle objects with {time, close}
 * @param {number} period - EMA period (e.g., 20, 50)
 * @returns {Array} Array of {time, value} objects for EMA values
 */
export function calcEMAIndexed(candles, period) {
  const out = new Array(candles.length).fill(null);
  if (candles.length < period) return out;
  const k = 2 / (period + 1);
  let ema = candles.slice(0, period).reduce((s, c) => s + c.close, 0) / period;
  out[period - 1] = { time: candles[period - 1].time, value: ema };
  for (let i = period; i < candles.length; i++) {
    ema = candles[i].close * k + ema * (1 - k);
    out[i] = { time: candles[i].time, value: ema };
  }
  return out;
}

/**
 * Returns how many candles should fill the default viewport for each timeframe
 * @param {Array} candleData - Array of candle data
 * @returns {number} Number of candles for default viewport
 */
export function defaultWindow(candleData) {
  if (candleData.length < 2) return 150;
  const intervalSec = candleData[1].time - candleData[0].time;
  if (intervalSec <=    60) return 300;  // 1m  → ~5 hours
  if (intervalSec <=   300) return 120;  // 5m  → ~10 hours
  if (intervalSec <=   900) return  80;  // 15m → ~20 hours
  if (intervalSec <=  1800) return  60;  // 30m → ~30 hours
  if (intervalSec <=  3600) return 120;  // 1h  → ~5 days
  if (intervalSec <= 14400) return  84;  // 4h  → ~2 weeks
  return 120;                            // 1d  → ~5 months
}
