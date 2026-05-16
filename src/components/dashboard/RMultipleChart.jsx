import React, {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

// Pixel-based sizing constants.
const PAD_LEFT = 28;
const PAD_RIGHT = 8;
const PAD_TOP = 10;
const PAD_BOTTOM = 20;
const MAX_BAR_WIDTH = 44;
const MIN_BAR_WIDTH = 14;
const BAR_GAP = 8;
const Y_AXIS_FONT = 11;
const X_AXIS_FONT = 11;
const COUNT_FONT = 11;

// R-multiple buckets — outliers clamp into the extreme buckets.
const BUCKET_DEFS = [
  { key: "lte-3", label: "≤-3R", min: -Infinity, max: -2.5 },
  { key: "-2",   label: "-2R",   min: -2.5,      max: -1.5 },
  { key: "-1",   label: "-1R",   min: -1.5,      max: -0.5 },
  { key: "0",    label: "0",     min: -0.5,      max: 0.5  },
  { key: "+1",   label: "+1R",   min: 0.5,       max: 1.5  },
  { key: "+2",   label: "+2R",   min: 1.5,       max: 2.5  },
  { key: "+3",   label: "+3R",   min: 2.5,       max: 3.5  },
  { key: "gte+4", label: "≥+4R", min: 3.5,       max: Infinity },
];

// Extract a usable per-trade risk amount from various possible field names.
const tradeRisk = (trade) => {
  const direct =
    trade.riskAmount ??
    trade.risk_amount ??
    trade.risk;
  if (typeof direct === "number" && isFinite(direct) && direct > 0) {
    return direct;
  }
  const entry =
    trade.entryPrice ?? trade.entry_price ?? trade.entry;
  const stop =
    trade.stopLoss ??
    trade.stop_loss ??
    trade.stop;
  const qty =
    trade.quantity ?? trade.qty ?? trade.size ?? 1;
  if (
    typeof entry === "number" &&
    typeof stop === "number" &&
    typeof qty === "number" &&
    isFinite(entry) &&
    isFinite(stop) &&
    isFinite(qty) &&
    qty > 0
  ) {
    const diff = Math.abs(entry - stop) * qty;
    if (diff > 0) return diff;
  }
  return null;
};

const formatR = (v, digits = 2) => {
  if (!isFinite(v)) return "—";
  const sign = v > 0 ? "+" : v < 0 ? "-" : "";
  const abs = Math.abs(v).toFixed(digits).replace(/\.?0+$/, "");
  return `${sign}${abs}R`;
};

const RMultipleChart = ({ trades = [] }) => {
  const [hover, setHover] = useState({ idx: null, x: 0, y: 0 });
  const [size, setSize] = useState({ w: 320, h: 220 });
  const containerRef = useRef(null);

  // Measure container in real pixels.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      setSize({
        w: Math.max(200, Math.round(rect.width)),
        h: Math.max(120, Math.round(rect.height)),
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 1. Compute per-trade R-multiples.
  // 2. If a trade lacks risk data, fall back to average loss as 1R baseline.
  const { rValues, fallbackUsed, totalTrades } = useMemo(() => {
    const closed = (trades || []).filter(
      (t) => t && t.status === "closed" && typeof t.pnl === "number"
    );
    if (closed.length === 0) {
      return { rValues: [], fallbackUsed: false, totalTrades: 0 };
    }

    const losers = closed.filter((t) => t.pnl < 0);
    const fallbackR =
      losers.length > 0
        ? losers.reduce((s, t) => s + Math.abs(t.pnl), 0) / losers.length
        : 0;

    let usedFallback = false;
    const rs = closed
      .map((t) => {
        const r = tradeRisk(t);
        if (r && r > 0) {
          return t.pnl / r;
        }
        if (fallbackR > 0) {
          usedFallback = true;
          return t.pnl / fallbackR;
        }
        return null;
      })
      .filter((v) => v !== null && isFinite(v));

    return {
      rValues: rs,
      fallbackUsed: usedFallback,
      totalTrades: closed.length,
    };
  }, [trades]);

  const buckets = useMemo(() => {
    const result = BUCKET_DEFS.map((b) => ({ ...b, count: 0 }));
    rValues.forEach((r) => {
      for (let i = 0; i < result.length; i++) {
        if (r > result[i].min && r <= result[i].max) {
          result[i].count++;
          break;
        }
      }
    });
    return result;
  }, [rValues]);

  const stats = useMemo(() => {
    if (rValues.length === 0) {
      return { expectancy: 0, winRate: 0, avgWin: 0, avgLoss: 0, n: 0 };
    }
    const wins = rValues.filter((r) => r > 0);
    const losses = rValues.filter((r) => r < 0);
    const sum = rValues.reduce((s, r) => s + r, 0);
    return {
      expectancy: sum / rValues.length,
      winRate: (wins.length / rValues.length) * 100,
      avgWin: wins.length > 0 ? wins.reduce((s, r) => s + r, 0) / wins.length : 0,
      avgLoss:
        losses.length > 0
          ? losses.reduce((s, r) => s + r, 0) / losses.length
          : 0,
      n: rValues.length,
    };
  }, [rValues]);

  const maxCount = useMemo(
    () => Math.max(1, ...buckets.map((b) => b.count)),
    [buckets]
  );

  // Pixel-based geometry.
  const W = size.w;
  const H = size.h;
  const CHART_W = Math.max(40, W - PAD_LEFT - PAD_RIGHT);
  const CHART_H = Math.max(40, H - PAD_TOP - PAD_BOTTOM);

  // Bar width clamped between MIN and MAX. If the ideal width exceeds MAX,
  // center the bars horizontally so they don't bunch up on the left.
  const { barW, startX } = useMemo(() => {
    const n = buckets.length;
    const idealW = (CHART_W - BAR_GAP * (n - 1)) / n;
    const clampedW = Math.max(MIN_BAR_WIDTH, Math.min(MAX_BAR_WIDTH, idealW));
    const usedWidth = n * clampedW + (n - 1) * BAR_GAP;
    const offset = Math.max(0, (CHART_W - usedWidth) / 2);
    return { barW: clampedW, startX: PAD_LEFT + offset };
  }, [buckets.length, CHART_W]);

  // Y-axis tick values.
  const yTicks = useMemo(() => {
    const top = maxCount;
    if (top <= 1) return [1, 0];
    if (top <= 4) {
      const set = new Set();
      for (let i = top; i >= 0; i--) set.add(i);
      return Array.from(set);
    }
    return [top, Math.round(top * 0.66), Math.round(top * 0.33), 0];
  }, [maxCount]);

  const bucketColor = useCallback((label) => {
    if (label === "0") return { fill: "#cbd5e1", stroke: "#94a3b8" };
    if (label.startsWith("-") || label.startsWith("≤-"))
      return { fill: "#ef4444", stroke: "#dc2626" };
    return { fill: "#22c55e", stroke: "#16a34a" };
  }, []);

  const handleEnter = useCallback((e, idx) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHover({
      idx,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

  const handleLeave = useCallback(() => {
    setHover((h) => (h.idx === null ? h : { idx: null, x: 0, y: 0 }));
  }, []);

  // Empty state
  if (totalTrades === 0 || rValues.length === 0) {
    return (
      <div
        className="h-72 w-full flex items-center justify-center"
        data-testid="r-multiple-chart-empty-state"
      >
        <div className="text-gray-500 dark:text-gray-400 text-center">
          <div className="text-sm font-medium mb-1">
            No trade outcomes yet
          </div>
          <div className="text-xs">
            Close trades with a stop-loss to see your R-multiple edge
          </div>
        </div>
      </div>
    );
  }

  const hoveredBucket = hover.idx !== null ? buckets[hover.idx] : null;
  const hoveredPct =
    hoveredBucket && rValues.length > 0
      ? Math.round((hoveredBucket.count / rValues.length) * 100)
      : 0;

  return (
    <div
      className="h-72 w-full flex flex-col"
      data-testid="r-multiple-chart"
    >
      {/* Stats strip */}
      <div
        className="-mt-1 mb-2 px-0.5 flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400 flex-wrap"
        data-testid="r-multiple-chart-stats"
      >
        <span data-testid="r-multiple-chart-stats-expectancy">
          Expectancy
          <span
            className={
              stats.expectancy >= 0
                ? "font-semibold text-green-600 dark:text-green-400 ml-1"
                : "font-semibold text-red-600 dark:text-red-400 ml-1"
            }
          >
            {formatR(stats.expectancy)}
          </span>
        </span>
        <span data-testid="r-multiple-chart-stats-winrate">
          Win rate
          <span className="font-semibold text-gray-800 dark:text-gray-200 ml-1">
            {Math.round(stats.winRate)}%
          </span>
        </span>
        <span data-testid="r-multiple-chart-stats-avgwin">
          Avg win
          <span className="font-semibold text-green-600 dark:text-green-400 ml-1">
            {formatR(stats.avgWin)}
          </span>
        </span>
        <span data-testid="r-multiple-chart-stats-avgloss">
          Avg loss
          <span className="font-semibold text-red-600 dark:text-red-400 ml-1">
            {formatR(stats.avgLoss)}
          </span>
        </span>
        {fallbackUsed && (
          <span
            className="text-[10px] text-gray-400 dark:text-gray-500 italic"
            data-testid="r-multiple-chart-fallback-note"
            title="Some trades lacked a stop-loss; their R-multiple was estimated using your average losing trade as 1R."
          >
            (est. baseline)
          </span>
        )}
      </div>

      {/* SVG chart (pixel-perfect via ResizeObserver) */}
      <div
        ref={containerRef}
        className="relative flex-1 min-h-0"
        data-testid="r-multiple-chart-svg-container"
        onMouseLeave={handleLeave}
      >
        <svg
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          className="overflow-visible"
          style={{ display: "block" }}
          role="img"
          aria-label={`R-multiple distribution for ${stats.n} trades, expectancy ${formatR(
            stats.expectancy
          )}`}
        >
          {/* Gridlines + y labels */}
          {yTicks.map((t, i) => {
            const y = PAD_TOP + (1 - t / maxCount) * CHART_H;
            return (
              <g key={`yt-${i}`}>
                <line
                  x1={PAD_LEFT}
                  x2={W - PAD_RIGHT}
                  y1={y}
                  y2={y}
                  className="stroke-gray-200 dark:stroke-gray-700"
                  strokeWidth={0.5}
                  strokeDasharray="2 3"
                />
                <text
                  x={PAD_LEFT - 4}
                  y={y + 4}
                  textAnchor="end"
                  fontSize={Y_AXIS_FONT}
                  fontWeight="500"
                  className="fill-gray-400 dark:fill-gray-500"
                >
                  {t}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {buckets.map((b, i) => {
            const colors = bucketColor(b.label);
            const x = startX + i * (barW + BAR_GAP);
            const h = (b.count / maxCount) * CHART_H;
            const y = PAD_TOP + CHART_H - h;
            const isHover = hover.idx === i;
            const dimmed = hover.idx !== null && !isHover;
            return (
              <g key={b.key}>
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={h}
                  rx={3}
                  fill={colors.fill}
                  fillOpacity={dimmed ? 0.4 : 0.85}
                  className="transition-opacity duration-150"
                  data-testid={`r-multiple-chart-bar-${b.key}`}
                />
                {/* Count above bar */}
                {b.count > 0 && (
                  <text
                    x={x + barW / 2}
                    y={y - 4}
                    textAnchor="middle"
                    fontSize={COUNT_FONT}
                    fontWeight="600"
                    fill={colors.stroke}
                  >
                    {b.count}
                  </text>
                )}
                {/* X-axis label */}
                <text
                  x={x + barW / 2}
                  y={H - 6}
                  textAnchor="middle"
                  fontSize={X_AXIS_FONT}
                  fontWeight="500"
                  className="fill-gray-500 dark:fill-gray-400"
                >
                  {b.label}
                </text>
                {/* Hover hit-target */}
                <rect
                  x={x - BAR_GAP / 2}
                  y={PAD_TOP}
                  width={barW + BAR_GAP}
                  height={CHART_H}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={(e) => handleEnter(e, i)}
                  onMouseMove={(e) => handleEnter(e, i)}
                />
              </g>
            );
          })}
        </svg>

        {/* Tooltip */}
        {hoveredBucket && (
          <div
            className="absolute pointer-events-none z-20 px-2.5 py-1.5 rounded-lg bg-gray-900 dark:bg-gray-50 text-white dark:text-gray-900 shadow-xl text-xs whitespace-nowrap"
            data-testid="r-multiple-chart-tooltip"
            style={{
              left: `${hover.x}px`,
              top: `${hover.y - 10}px`,
              transform: "translate(-50%, -100%)",
            }}
          >
            <div
              className={
                hoveredBucket.label === "0"
                  ? "font-semibold text-gray-400 dark:text-gray-600"
                  : hoveredBucket.label.startsWith("-") ||
                    hoveredBucket.label.startsWith("≤-")
                  ? "font-semibold text-red-400 dark:text-red-600"
                  : "font-semibold text-green-400 dark:text-green-600"
              }
              data-testid="r-multiple-chart-tooltip-label"
            >
              {hoveredBucket.label} bucket
            </div>
            <div className="opacity-75 mt-0.5">
              {hoveredBucket.count}{" "}
              {hoveredBucket.count === 1 ? "trade" : "trades"} ·{" "}
              {hoveredPct}% of total
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RMultipleChart;
