import React, { useCallback, useId, useLayoutEffect, useMemo, useRef, useState } from "react";

const PAD_LEFT   = 38;
const PAD_RIGHT  = 12;
const PAD_TOP    = 18;
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

/**
 * Cumulative P&L line chart.
 *
 * Props
 *   data        number[]   — cumulative running totals, one per trading day
 *   dates       Date[]     — matching Date objects (same length as data)
 *   minSpacing  number     — minimum px between x-axis date labels (default 60)
 */
const CumulativePnLChart = ({
  data = [],
  dates = [],
  minSpacing = 60,
}) => {
  const uid     = useId().replace(/:/g, '_');
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
    return data
      .map((v, i) => `${i === 0 ? 'M' : 'L'}${px(i).toFixed(1)},${py(v).toFixed(1)}`)
      .join(' ');
  }, [data, n, px, py]);

  // Area closes at chart bottom — clipPaths handle the green/red colour split.
  const areaPath = useMemo(() => {
    if (n < 2) return '';
    const bottom = (PAD_TOP + chartH).toFixed(1);
    const pts = data
      .map((v, i) => `${i === 0 ? 'M' : 'L'}${px(i).toFixed(1)},${py(v).toFixed(1)}`)
      .join(' ');
    return `${pts} L${px(n - 1).toFixed(1)},${bottom} L${px(0).toFixed(1)},${bottom} Z`;
  }, [data, n, px, py, chartH]);

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

  const handleMouseMove = useCallback((e) => {
    const el = wrapRef.current;
    if (!el || n < 2) return;
    const rect         = el.getBoundingClientRect();
    const relX         = e.clientX - rect.left;
    const relY         = e.clientY - rect.top;
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
  const hovered = hover.idx !== null ? { v: data[hover.idx], d: dates[hover.idx] } : null;

  return (
    <div
      ref={wrapRef}
      className="relative flex-1 min-h-0 w-full"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      data-testid="cumulative-pnl-chart"
    >
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
          {/* Green fill — fades from top */}
          <linearGradient id={`cpg_${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#16a34a" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#16a34a" stopOpacity="0.02" />
          </linearGradient>
          {/* Red fill — fades to bottom */}
          <linearGradient id={`crg_${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#ef4444" stopOpacity="0.02" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.20" />
          </linearGradient>
          {/* Clip above the zero line — 2px headroom so the stroke at the
              domain max isn't shaved in half by the clip edge */}
          <clipPath id={`ca_${uid}`}>
            <rect x={PAD_LEFT} y={PAD_TOP - 2} width={chartW} height={aboveH + 2} />
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
              2px above PAD_TOP to match the above-zero clip headroom */}
          <clipPath id={`cm_${uid}`}>
            <rect x={PAD_LEFT} y={PAD_TOP - 2} width={chartW} height={chartH + 2} />
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
                stroke={isZero ? '#d1d5db' : '#f3f4f6'}
                strokeWidth="1"
                strokeDasharray={isZero ? '4,3' : undefined}
                mask={`url(#gm_${uid})`}
              />
              <text
                x={Math.round(PAD_LEFT / 2)}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="9.5"
                fill="#374151"
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
        <g clipPath={`url(#cm_${uid})`}>
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
          <path
            d={linePath}
            fill="none"
            stroke="#16a34a"
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            clipPath={`url(#ca_${uid})`}
          />
          <path
            d={linePath}
            fill="none"
            stroke="#ef4444"
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            clipPath={`url(#cb_${uid})`}
          />

          {/* Hover indicator — vertical rule + dot */}
          {hover.idx !== null && (() => {
            const ix  = px(hover.idx);
            const iy  = py(data[hover.idx]);
            const pos = data[hover.idx] >= 0;
            return (
              <g>
                <line
                  x1={ix.toFixed(1)} x2={ix.toFixed(1)}
                  y1={PAD_TOP} y2={PAD_TOP + chartH}
                  stroke="#9ca3af"
                  strokeWidth="1"
                  strokeDasharray="3,2"
                />
                <circle
                  cx={ix.toFixed(1)}
                  cy={iy.toFixed(1)}
                  r="3.5"
                  fill={pos ? "#16a34a" : "#ef4444"}
                  stroke="white"
                  strokeWidth="1.5"
                />
              </g>
            );
          })()}
        </g>

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
                fontSize="9.5"
                fill="#374151"
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
          className="absolute pointer-events-none z-20 px-2.5 py-1.5 rounded-lg bg-gray-900 dark:bg-gray-50 text-white dark:text-gray-900 shadow-xl text-xs whitespace-nowrap"
          data-testid="cumulative-pnl-chart-tooltip"
          style={{
            left: hover.x,
            top: hover.y - 10,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div
            className={
              hovered.v >= 0
                ? "font-semibold text-green-400 dark:text-green-600"
                : "font-semibold text-red-400 dark:text-red-600"
            }
            data-testid="cumulative-pnl-chart-tooltip-value"
          >
            {fmtFull(hovered.v)}
          </div>
          {hovered.d && (
            <div className="opacity-75 mt-0.5">
              {hovered.d.toLocaleDateString("en-US", { weekday: "short" })},{" "}
              {fmtDate(hovered.d)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CumulativePnLChart;
