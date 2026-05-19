import React, {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const BAR_W       = 10;   // px — fixed bar width at every screen size
const BAR_GAP     = 1;    // 1px visual gap between bars
const MAX_BARS    = 120;  // absolute ceiling (enough for 4K cards)
const MIN_SPACING = 44;   // min px between x-axis label centers
const PAD_LEFT    = 28;
const PAD_RIGHT   = 8;
const PAD_TOP     = 10;
const PAD_BOTTOM  = 36;   // room for 45° date labels rendered inside the SVG

const fmtK = (v) => {
  if (v === 0) return "0";
  const sign = v > 0 ? "+" : "-";
  const a    = Math.abs(v);
  if (a >= 1000) {
    const k = a / 1000;
    return `${sign}${k >= 10 ? Math.round(k) : k.toFixed(1)}K`;
  }
  return `${sign}${Math.round(a)}`;
};

const fmtFull = (v) => `${v >= 0 ? "+" : "-"}$${Math.abs(v).toLocaleString()}`;

const fmtDate = (d) => {
  const m  = String(d.getMonth() + 1).padStart(2, "0");
  const dy = String(d.getDate()).padStart(2, "0");
  return `${m}/${dy}`;
};

const niceCeil = (v) => {
  if (!isFinite(v) || v <= 0) return 1;
  const pow  = Math.pow(10, Math.floor(Math.log10(v)));
  const n    = v / pow;
  const nice = n < 1.5 ? 1.5 : n < 3 ? 3 : n < 7 ? 7 : 10;
  return nice * pow;
};

// Bar indices that get a date label.
// Never includes 0. Always includes n-1. Spaced so labels are at least MIN_SPACING px apart.
function labelSet(n) {
  if (n === 0) return [];
  const step = Math.max(1, Math.round(MIN_SPACING / BAR_W));
  const set  = new Set();
  for (let i = step; i < n; i += step) set.add(i);
  if (n > 1) set.add(n - 1);
  return [...set].sort((a, b) => a - b);
}

const PnLChart = ({ trades = [] }) => {
  const [hover, setHover] = useState({ idx: null, x: 0, y: 0 });
  const [size, setSize]   = useState({ w: 400, h: 280 });
  const ref               = useRef(null);

  // Measure the wrapper div — it fills flex-1 of the card so both w and h
  // are driven by the card's available space, not a fixed height class.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setSize({
        w: Math.max(120, Math.round(r.width)),
        h: Math.max(80,  Math.round(r.height)),
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Aggregate closed trades into per-day P&L, keep last MAX_BARS days.
  const data = useMemo(() => {
    const valid = (trades || []).filter((t) => t && t.status === "closed");
    if (!valid.length) return [];

    const byDate = {};
    valid.forEach((trade) => {
      const raw =
        trade.exitDate ||
        trade.exit_date ||
        trade.createdAt ||
        trade.created_at;
      if (!raw) return;
      const parsed = new Date(raw);
      if (isNaN(parsed.getTime())) return;
      const key = parsed.toISOString().split("T")[0];
      byDate[key] = (byDate[key] || 0) + (trade.pnl || 0);
    });

    return Object.entries(byDate)
      .filter(([, pnl]) => pnl !== 0)
      .map(([key, pnl]) => ({
        key,
        pnl,
        // Noon UTC avoids timezone-boundary off-by-one when constructing from "YYYY-MM-DD"
        date: new Date(`${key}T12:00:00Z`),
      }))
      .sort((a, b) => a.date - b.date)
      .slice(-MAX_BARS);
  }, [trades]);

  // Geometry derived from measured container size.
  const { W, H, chartW, chartH, midY } = useMemo(() => {
    const W      = size.w;
    const H      = size.h;
    const chartW = Math.max(1, W - PAD_LEFT - PAD_RIGHT);
    const chartH = Math.max(20, H - PAD_TOP - PAD_BOTTOM);
    const midY   = PAD_TOP + chartH / 2;
    return { W, H, chartW, chartH, midY };
  }, [size]);

  // How many bars fit at BAR_W px each — scales from ~60 at HD to 120 at 4K.
  // Bars pack left; right side is empty when fewer sessions than capacity.
  const showN = Math.min(data.length, Math.min(MAX_BARS, Math.floor(chartW / BAR_W)));

  // Visible slice: most recent showN days.
  const visibleData = useMemo(() => data.slice(-showN), [data, showN]);

  const niceTop = useMemo(() => {
    if (!showN) return 1;
    return niceCeil(Math.max(...visibleData.map((d) => Math.abs(d.pnl)), 1));
  }, [visibleData, showN]);

  const ticks = useMemo(
    () => [niceTop, niceTop / 2, 0, -niceTop / 2, -niceTop],
    [niceTop]
  );

  // Bars pack left from PAD_LEFT — each bar is exactly BAR_W px wide.
  const barX = useCallback((i) => PAD_LEFT + i * BAR_W, []);

  const labels = useMemo(() => labelSet(showN), [showN]);

  const handleEnter = useCallback((e, idx) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    setHover({ idx, x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  const handleLeave = useCallback(
    () => setHover((h) => (h.idx === null ? h : { idx: null, x: 0, y: 0 })),
    []
  );

  if (data.length === 0) {
    return (
      <div
        className="flex-1 min-h-0 w-full flex items-center justify-center"
        data-testid="pnl-chart-empty-state"
      >
        <div className="text-gray-500 dark:text-gray-400 text-center">
          <div className="text-sm font-medium mb-1">No trading data yet</div>
          <div className="text-xs">Add closed trades to see your daily P&amp;L</div>
        </div>
      </div>
    );
  }

  const hovered = hover.idx !== null ? visibleData[hover.idx] : null;

  return (
    // flex-1 min-h-0 lets this div fill whatever vertical space the card gives it.
    // The SVG is absolutely positioned to cover the div exactly — this way the
    // div's size is driven purely by flexbox (w-full), not by the SVG content,
    // so ResizeObserver always measures the true card width.
    <div
      ref={ref}
      className="relative flex-1 min-h-0 w-full"
      onMouseLeave={handleLeave}
      data-testid="pnl-chart"
    >
      <svg
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          display: "block",
          overflow: "visible",
        }}
        role="img"
        aria-label={`Daily P&L for last ${showN} trading sessions`}
      >
        {/* Y grid lines — x2="100%" always spans the full SVG width */}
        {ticks.map((t, i) => {
          const y      = midY - (t / niceTop) * (chartH / 2);
          const isZero = t === 0;
          return (
            <line
              key={`g-${i}`}
              x1={PAD_LEFT}
              x2="100%"
              y1={y}
              y2={y}
              stroke={isZero ? "#e5e7eb" : "#f3f4f6"}
              strokeWidth={isZero ? 1.5 : 1}
            />
          );
        })}

        {/* Y-axis labels */}
        {ticks.map((t, i) => {
          const y = midY - (t / niceTop) * (chartH / 2);
          return (
            <text
              key={`yl-${i}`}
              x={Math.round(PAD_LEFT / 2)}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="9.5"
              fill="#374151"
              fontFamily="inherit"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {fmtK(t)}
            </text>
          );
        })}

        {/* Bars — packed left, touching, each exactly BAR_W px wide */}
        {visibleData.map((d, i) => {
          const x  = barX(i);
          const bh = Math.max(2, (Math.abs(d.pnl) / niceTop) * (chartH / 2));
          const y  = d.pnl >= 0 ? midY - bh : midY;
          const isHover = hover.idx === i;
          const dimmed  = hover.idx !== null && !isHover;
          return (
            <g key={d.key}>
              <rect
                x={x + 0.5}
                y={y}
                width={Math.max(1, BAR_W - BAR_GAP)}
                height={bh}
                rx="1.5"
                fill={d.pnl >= 0 ? "#16a34a" : "#ef4444"}
                opacity={dimmed ? 0.45 : 1}
                className="transition-opacity duration-150"
                data-testid={`pnl-chart-bar-${i}`}
              />
              {/* Invisible hit-target covers the full bar slot */}
              <rect
                x={x}
                y={PAD_TOP}
                width={BAR_W}
                height={chartH}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={(e) => handleEnter(e, i)}
                onMouseMove={(e) => handleEnter(e, i)}
              />
            </g>
          );
        })}

        {/* X-axis date labels — inside SVG, 45° rotated, never at index 0 */}
        {labels.map((i) => {
          const cx = PAD_LEFT + i * BAR_W + BAR_W / 2;
          const ly = PAD_TOP + chartH + 14;
          return (
            <g
              key={`xl-${i}`}
              transform={`translate(${cx.toFixed(1)},${ly}) rotate(-45)`}
            >
              <text
                x={0}
                y={0}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize="9.5"
                fill="#374151"
                fontFamily="inherit"
              >
                {fmtDate(visibleData[i].date)}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Hover tooltip */}
      {hovered && (
        <div
          className="absolute pointer-events-none z-20 px-2.5 py-1.5 rounded-lg bg-gray-900 dark:bg-gray-50 text-white dark:text-gray-900 shadow-xl text-xs whitespace-nowrap"
          data-testid="pnl-chart-tooltip"
          style={{
            left: hover.x,
            top: hover.y - 10,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div
            className={
              hovered.pnl >= 0
                ? "font-semibold text-green-400 dark:text-green-600"
                : "font-semibold text-red-400 dark:text-red-600"
            }
            data-testid="pnl-chart-tooltip-value"
          >
            {fmtFull(hovered.pnl)}
          </div>
          <div className="opacity-75 mt-0.5">
            {hovered.date.toLocaleDateString("en-US", { weekday: "short" })},{" "}
            {fmtDate(hovered.date)}
          </div>
        </div>
      )}
    </div>
  );
};

export default PnLChart;
