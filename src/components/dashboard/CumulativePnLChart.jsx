import React, { useCallback, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { getChartColors } from "../../utils/chartColors";

// Left/bottom gutters match the Daily P&L chart (PnLChart_simple) so the two
// dashboard charts' plot areas line up.
const PAD_LEFT   = 28;
const PAD_RIGHT  = 12;
const PAD_TOP    = 20;
const PAD_BOTTOM = 36;

const fmtDate = (d) => {
  if (!d) return '';
  const m  = String(d.getMonth() + 1).padStart(2, '0');
  const dy = String(d.getDate()).padStart(2, '0');
  return `${m}/${dy}`;
};

const fmtK = (v) => {
  const s = v >= 0 ? '+' : '';
  if (Math.abs(v) >= 1000)
    return `${s}${(v / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return `${s}${Math.round(v)}`;
};

const fmtFull = (v) =>
  `${v >= 0 ? '+' : '-'}$${Math.abs(v).toLocaleString()}`;

// Monotone cubic (Fritsch–Carlson) path through screen-space points.
// Rounds the day-to-day corners without overshooting the data — unlike a
// plain bezier, the curve can never imply a P&L high or low that never
// happened, which matters on a money chart.
const monotonePath = (xs, ys) => {
  const len = xs.length;
  if (len < 2) return '';
  if (len === 2)
    return `M${xs[0].toFixed(1)},${ys[0].toFixed(1)} L${xs[1].toFixed(1)},${ys[1].toFixed(1)}`;
  const dx = [];
  const m = [];
  for (let i = 0; i < len - 1; i++) {
    dx.push(xs[i + 1] - xs[i]);
    m.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i] || 1));
  }
  // Tangent at each point: 0 at local extrema, weighted harmonic mean elsewhere
  const t = [m[0]];
  for (let i = 1; i < len - 1; i++) {
    if (m[i - 1] * m[i] <= 0) {
      t.push(0);
    } else {
      const w = dx[i - 1] + dx[i];
      t.push((3 * w) / ((w + dx[i]) / m[i - 1] + (w + dx[i - 1]) / m[i]));
    }
  }
  t.push(m[len - 2]);
  let d = `M${xs[0].toFixed(1)},${ys[0].toFixed(1)}`;
  for (let i = 0; i < len - 1; i++) {
    const h = dx[i] / 3;
    d += ` C${(xs[i] + h).toFixed(1)},${(ys[i] + h * t[i]).toFixed(1)} ${(
      xs[i + 1] - h
    ).toFixed(1)},${(ys[i + 1] - h * t[i + 1]).toFixed(1)} ${xs[i + 1].toFixed(1)},${ys[
      i + 1
    ].toFixed(1)}`;
  }
  return d;
};

/**
 * Cumulative P&L line chart.
 *
 * Props
 *   data        number[]   — cumulative running totals, one per trading day
 *   dates       Date[]     — matching Date objects (same length as data)
 *   daily       (number|null)[] — that session's own P&L, parallel to data
 *                (null for the zero-baseline anchor point)
 *   minSpacing  number     — minimum px between x-axis date labels (default 60)
 */
const CumulativePnLChart = ({
  data = [],
  dates = [],
  daily = [],
  minSpacing = 60,
}) => {
  const uid     = useId().replace(/:/g, '_');
  const { isDark } = useTheme();
  const c = getChartColors(isDark);
  // This chart's light theme uses green-600 for the line (slightly deeper than
  // the shared pos color); in dark mode lift it to the shared lighter tint so
  // it doesn't muddy against the near-black card.
  const lineGreen = isDark ? c.pos : "#16a34a";
  const lineRed   = c.neg;
  const wrapRef = useRef(null);
  const [hover, setHover] = useState({ idx: null, x: 0, y: 0 });
  const [dims,  setDims]  = useState(null);

  const n = data.length;

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setDims({
        w: Math.max(120, Math.round(r.width)),
        h: Math.max(80,  Math.round(r.height)),
      });
    };
    measure();
    // Double-rAF: catches stale measurement when dashboard grid settles after first paint (HD/4K fix)
    const raf = requestAnimationFrame(() => requestAnimationFrame(measure));
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  // Re-run when transitioning from empty state (no ref) to chart state (ref attached)
  }, [n > 1]); // eslint-disable-line react-hooks/exhaustive-deps

  const chartW = (dims ? dims.w : 400) - PAD_LEFT - PAD_RIGHT;
  const chartH = (dims ? dims.h : 260) - PAD_TOP  - PAD_BOTTOM;

  const domainMin = useMemo(() => Math.min(...data, 0), [data]);
  const domainMax = useMemo(() => Math.max(...data, 0), [data]);
  const range     = useMemo(() => domainMax - domainMin || 1, [domainMax, domainMin]);

  const px = useCallback(
    (i) => PAD_LEFT + (n > 1 ? i / (n - 1) : 0.5) * chartW,
    [n, chartW]
  );
  const py = useCallback(
    (v) => PAD_TOP + (1 - (v - domainMin) / range) * chartH,
    [domainMin, range, chartH]
  );

  const zeroY = useMemo(() => py(0), [py]);

  const linePath = useMemo(() => {
    if (n < 2) return '';
    const xs = data.map((_, i) => px(i));
    const ys = data.map((v) => py(v));
    return monotonePath(xs, ys);
  }, [data, n, px, py]);

  // Area closes at chart bottom — clipPaths handle the green/red colour split.
  const areaPath = useMemo(() => {
    if (n < 2) return '';
    const bottom = (PAD_TOP + chartH).toFixed(1);
    return `${linePath} L${px(n - 1).toFixed(1)},${bottom} L${px(0).toFixed(1)},${bottom} Z`;
  }, [linePath, n, px, chartH]);

  // Date-label indices: start from step (never index 0), always show last.
  const labelIndices = useMemo(() => {
    if (n < 2) return [];
    const maxLabels = Math.max(2, Math.floor(chartW / minSpacing));
    const step      = Math.max(2, Math.ceil((n - 1) / (maxLabels - 1)));
    const set       = new Set();
    for (let i = step; i < n; i += step) set.add(i);
    set.add(n - 1);
    return [...set].sort((a, b) => a - b);
  }, [n, minSpacing, chartW]);

  const updateHoverFromClient = useCallback((clientX, clientY) => {
    const el = wrapRef.current;
    if (!el || n < 2) return;
    const rect         = el.getBoundingClientRect();
    const relX         = clientX - rect.left;
    const relY         = clientY - rect.top;
    const chartStartPx = PAD_LEFT;
    const chartEndPx   = PAD_LEFT + chartW;
    if (relX < chartStartPx - 4 || relX > chartEndPx + 4) {
      setHover((h) => (h.idx === null ? h : { idx: null, x: 0, y: 0 }));
      return;
    }
    const t   = Math.max(0, Math.min(1, (relX - chartStartPx) / (chartEndPx - chartStartPx)));
    const idx = Math.round(t * (n - 1));
    setHover({ idx, x: relX, y: relY });
  }, [n, chartW]);

  const handleMouseMove = useCallback(
    (e) => updateHoverFromClient(e.clientX, e.clientY),
    [updateHoverFromClient]
  );

  // Touch scrubbing for mobile (no hover) — drag across the line to inspect.
  const handleTouchMove = useCallback(
    (e) => {
      const t = e.touches[0];
      if (t) updateHoverFromClient(t.clientX, t.clientY);
    },
    [updateHoverFromClient]
  );

  const handleMouseLeave = useCallback(
    () => setHover((h) => (h.idx === null ? h : { idx: null, x: 0, y: 0 })),
    []
  );

  if (n < 2) {
    return (
      <div
        className="flex-1 min-h-0 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm text-center"
        data-testid="cumulative-pnl-chart-empty-state"
      >
        <div>
          <div className="font-medium mb-1">No trading data yet</div>
          <div className="text-xs">
            Add closed trades to see your cumulative P&amp;L
          </div>
        </div>
      </div>
    );
  }

  const aboveH  = Math.max(0, zeroY - PAD_TOP);
  const belowH  = Math.max(0, PAD_TOP + chartH - zeroY);
  const hovered =
    hover.idx !== null
      ? { v: data[hover.idx], d: dates[hover.idx], day: daily[hover.idx] ?? null }
      : null;

  return (
    <div
      ref={wrapRef}
      className="relative flex-1 min-h-0 w-full cursor-pointer touch-pan-y"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchMove}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleMouseLeave}
      data-testid="cumulative-pnl-chart"
    >
      {/* Same gentle fade-in as the Daily P&L chart — opacity + slight rise. */}
      <style>{`
        @keyframes chartFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      {dims && <svg
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          display: "block",
          overflow: "hidden",
        }}
        role="img"
        aria-label="Cumulative P&L over time"
      >
        <defs>
          {/* Green fill — a soft wash that dissolves toward zero (3 stops so
              the fade reads silky instead of a flat tinted block) */}
          <linearGradient id={`cpg_${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={lineGreen} stopOpacity="0.18" />
            <stop offset="55%"  stopColor={lineGreen} stopOpacity="0.07" />
            <stop offset="100%" stopColor={lineGreen} stopOpacity="0" />
          </linearGradient>
          {/* Red fill — mirrors the green wash, deepening toward the bottom */}
          <linearGradient id={`crg_${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={lineRed} stopOpacity="0" />
            <stop offset="45%"  stopColor={lineRed} stopOpacity="0.07" />
            <stop offset="100%" stopColor={lineRed} stopOpacity="0.18" />
          </linearGradient>
          {/* Clip above the zero line — 6px headroom so the stroke AND the
              hover dot (r 3.5 + 1.5 ring ≈ 4.25px above the line) at the
              domain max aren't shaved flat by the clip edge */}
          <clipPath id={`ca_${uid}`}>
            <rect x={PAD_LEFT} y={PAD_TOP - 6} width={chartW} height={aboveH + 6} />
          </clipPath>
          {/* Clip below the zero line */}
          <clipPath id={`cb_${uid}`}>
            <rect
              x={PAD_LEFT}
              y={zeroY.toFixed(1)}
              width={chartW}
              height={belowH}
            />
          </clipPath>
          {/* Master chart area clip — prevents right-edge overflow; extends
              6px above PAD_TOP to match the above-zero clip headroom */}
          <clipPath id={`cm_${uid}`}>
            <rect x={PAD_LEFT} y={PAD_TOP - 6} width={chartW} height={chartH + 6} />
          </clipPath>
          {/* Hides grid lines where the trend area sits, so they read as
              behind the chart instead of showing through the translucent fill */}
          <mask id={`gm_${uid}`}>
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <path d={areaPath} fill="black" />
          </mask>
        </defs>

        {/* Y grid lines + labels — outside master clip so labels stay visible */}
        {[domainMax, 0, ...(domainMin < 0 ? [domainMin] : [])].map((v, i) => {
          const y      = py(v);
          const isZero = v === 0;
          return (
            <g key={i}>
              <line
                x1={PAD_LEFT}
                x2={PAD_LEFT + chartW}
                y1={y.toFixed(1)}
                y2={y.toFixed(1)}
                stroke={isZero ? c.zeroLine : c.grid}
                strokeWidth="1"
                mask={`url(#gm_${uid})`}
              />
              <text
                x={Math.round(PAD_LEFT / 2)}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="10"
                fill={c.tick}
                fontFamily="inherit"
                style={{ fontVariantNumeric: 'tabular-nums' }}
                data-testid={`cumulative-pnl-chart-ylabel-${i}`}
              >
                {fmtK(Math.round(v))}
              </text>
            </g>
          );
        })}

        {/* Area fills + line strokes + hover inside master clip */}
        <g
          clipPath={`url(#cm_${uid})`}
          style={{ animation: "chartFadeIn 0.9s ease-out both" }}
        >
          <path
            d={areaPath}
            fill={`url(#cpg_${uid})`}
            clipPath={`url(#ca_${uid})`}
          />
          <path
            d={areaPath}
            fill={`url(#crg_${uid})`}
            clipPath={`url(#cb_${uid})`}
          />
          {/* Soft under-glow — a wide, faint stroke beneath the 2px line gives
              the curve depth without adding data-weight ink */}
          <path
            d={linePath}
            fill="none"
            stroke={lineGreen}
            strokeWidth="6"
            strokeOpacity="0.10"
            strokeLinejoin="round"
            strokeLinecap="round"
            clipPath={`url(#ca_${uid})`}
          />
          <path
            d={linePath}
            fill="none"
            stroke={lineRed}
            strokeWidth="6"
            strokeOpacity="0.10"
            strokeLinejoin="round"
            strokeLinecap="round"
            clipPath={`url(#cb_${uid})`}
          />
          <path
            d={linePath}
            fill="none"
            stroke={lineGreen}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            clipPath={`url(#ca_${uid})`}
          />
          <path
            d={linePath}
            fill="none"
            stroke={lineRed}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            clipPath={`url(#cb_${uid})`}
          />

        </g>

        {/* Hover indicator — vertical rule + dot. Outside the master clip so
            the dot renders whole at the first/last day and at the domain
            extremes instead of being shaved by the clip edge. */}
        {hover.idx !== null && (() => {
          const ix  = px(hover.idx);
          const iy  = py(data[hover.idx]);
          const pos = data[hover.idx] >= 0;
          return (
            <g>
              <line
                x1={ix.toFixed(1)} x2={ix.toFixed(1)}
                y1={PAD_TOP} y2={PAD_TOP + chartH}
                stroke={c.axis}
                strokeWidth="1"
              />
              <circle
                cx={ix.toFixed(1)}
                cy={iy.toFixed(1)}
                r="4"
                fill={pos ? lineGreen : lineRed}
                stroke={c.dotRing}
                strokeWidth="2"
              />
            </g>
          );
        })()}

        {/* Emphasized endpoint — where the equity curve stands today.
            Rendered outside the master clip so the dot isn't shaved at the
            right edge; a soft halo makes it read without shouting. */}
        {(() => {
          const ex = px(n - 1);
          const ey = py(data[n - 1]);
          const endColor = data[n - 1] >= 0 ? lineGreen : lineRed;
          return (
            <g data-testid="cumulative-pnl-chart-endpoint">
              <circle cx={ex.toFixed(1)} cy={ey.toFixed(1)} r="8" fill={endColor} opacity="0.12" />
              <circle
                cx={ex.toFixed(1)}
                cy={ey.toFixed(1)}
                r="4"
                fill={endColor}
                stroke={c.dotRing}
                strokeWidth="2"
              />
            </g>
          );
        })()}

        {/* Date labels — 45° rotated, outside master clip */}
        {labelIndices.map((i) => {
          const x  = px(i);
          const ly = PAD_TOP + chartH + 14;
          return (
            <g
              key={i}
              transform={`translate(${x.toFixed(1)},${ly}) rotate(-45)`}
            >
              <text
                x={0}
                y={0}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize="10"
                fill={c.tick}
                fontFamily="inherit"
              >
                {fmtDate(dates[i])}
              </text>
            </g>
          );
        })}
      </svg>}

      {/* Hover tooltip */}
      {hovered && (
        <div
          className="absolute pointer-events-none z-20 px-3 py-2 rounded-xl bg-gray-900/95 dark:bg-gray-50 text-white dark:text-gray-900 shadow-xl ring-1 ring-white/10 dark:ring-black/5 backdrop-blur-sm text-xs whitespace-nowrap tabular-nums"
          data-testid="cumulative-pnl-chart-tooltip"
          style={{
            // Anchored to the hovered point on the line (not the cursor):
            // centered on the snapped x, sitting just above the dot. The x is
            // clamped so the tooltip can't spill past the card edges, and
            // points near the bottom edge (deep losses) get extra lift so the
            // banner clears the dot and the x-axis area.
            left: Math.max(70, Math.min((dims?.w ?? 0) - 70, px(hover.idx))),
            top:
              py(data[hover.idx]) -
              (py(data[hover.idx]) > PAD_TOP + chartH - 20 ? 24 : 12),
            transform: "translate(-50%, -100%)",
          }}
        >
          {hovered.d && (
            <div className="opacity-75 mb-0.5">
              {hovered.d.toLocaleDateString("en-US", { weekday: "short" })},{" "}
              {fmtDate(hovered.d)}
            </div>
          )}
          {/* That session's own result — the number users expect to match the
              trades calendar. Baseline anchor point (day === null) skips it. */}
          {hovered.day !== null && (
            <div
              className="flex items-baseline justify-between gap-3"
              data-testid="cumulative-pnl-chart-tooltip-day"
            >
              <span className="opacity-75">Day</span>
              <span
                className={
                  hovered.day >= 0
                    ? "font-semibold text-green-400 dark:text-green-600"
                    : "font-semibold text-red-400 dark:text-red-600"
                }
              >
                {fmtFull(hovered.day)}
              </span>
            </div>
          )}
          {/* Running total up to this session — what the line itself plots */}
          <div className="flex items-baseline justify-between gap-3">
            <span className="opacity-75">Total</span>
            <span
              className={
                hovered.v >= 0
                  ? "font-semibold text-green-400 dark:text-green-600"
                  : "font-semibold text-red-400 dark:text-red-600"
              }
              data-testid="cumulative-pnl-chart-tooltip-value"
            >
              {fmtFull(hovered.v)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CumulativePnLChart;
