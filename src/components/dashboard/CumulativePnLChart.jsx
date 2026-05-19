import React, { useCallback, useId, useLayoutEffect, useMemo, useRef, useState } from "react";

// Fixed viewBox coordinate space — SVG percentage-based layout.
// preserveAspectRatio="none" stretches it to fill the container exactly.
// overflow:"hidden" clips all chart content to the viewBox boundary (no card bleed).
const VB_W       = 800;
const VB_H       = 260;
const PAD_LEFT   = 52;   // enough room for labels like "+18.6K" without going past x=0
const PAD_RIGHT  = 12;
const PAD_TOP    = 10;
const PAD_BOTTOM = 48;   // room for 45° date labels
const CHART_W    = VB_W - PAD_LEFT - PAD_RIGHT;  // 736
const CHART_H    = VB_H - PAD_TOP  - PAD_BOTTOM; // 202

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
  const [dims,  setDims]  = useState({ w: VB_W, h: VB_H });

  const n = data.length;

  // Measure the actual rendered container to compute the corrected label angle
  // and label spacing. viewBox + preserveAspectRatio="none" applies non-uniform
  // scaling, so rotate(-45) in SVG space ≠ 45° on screen unless corrected.
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setDims({ w: Math.max(120, r.width), h: Math.max(80, r.height) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // SVG rotation value that produces true –45° on screen.
  // With preserveAspectRatio="none": scaleX = dims.w/VB_W, scaleY = dims.h/VB_H.
  // To get screen angle –45°: θ_svg = –atan(scaleX / scaleY).
  const labelAngle = useMemo(() => {
    const scaleX = dims.w / VB_W;
    const scaleY = dims.h / VB_H;
    return -(Math.atan(scaleX / scaleY) * 180 / Math.PI);
  }, [dims]);

  // minSpacing is in screen px; convert to viewBox units for label count calculation.
  const minSpacingVB = useMemo(
    () => minSpacing * VB_W / Math.max(dims.w, 1),
    [minSpacing, dims.w]
  );

  const domainMin = useMemo(() => Math.min(...data, 0), [data]);
  const domainMax = useMemo(() => Math.max(...data, 0), [data]);
  const range     = useMemo(() => domainMax - domainMin || 1, [domainMax, domainMin]);

  const px = useCallback(
    (i) => PAD_LEFT + (n > 1 ? i / (n - 1) : 0.5) * CHART_W,
    [n]
  );
  const py = useCallback(
    (v) => PAD_TOP + (1 - (v - domainMin) / range) * CHART_H,
    [domainMin, range]
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
    const bottom = (PAD_TOP + CHART_H).toFixed(1);
    const pts = data
      .map((v, i) => `${i === 0 ? 'M' : 'L'}${px(i).toFixed(1)},${py(v).toFixed(1)}`)
      .join(' ');
    return `${pts} L${px(n - 1).toFixed(1)},${bottom} L${px(0).toFixed(1)},${bottom} Z`;
  }, [data, n, px, py]);

  // Date-label indices: start from step (never index 0), always show last.
  const labelIndices = useMemo(() => {
    if (n < 2) return [];
    const maxLabels = Math.max(2, Math.floor(CHART_W / minSpacingVB));
    const step      = Math.max(2, Math.ceil((n - 1) / (maxLabels - 1)));
    const set       = new Set();
    for (let i = step; i < n; i += step) set.add(i);
    set.add(n - 1);
    return [...set].sort((a, b) => a - b);
  }, [n, minSpacingVB]);

  // Map screen mouse x → data index, accounting for viewBox scaling.
  const handleMouseMove = useCallback((e) => {
    const el = wrapRef.current;
    if (!el || n < 2) return;
    const rect         = el.getBoundingClientRect();
    const relX         = e.clientX - rect.left;
    const relY         = e.clientY - rect.top;
    const scaleX       = rect.width / VB_W;
    const chartStartPx = PAD_LEFT * scaleX;
    const chartEndPx   = (PAD_LEFT + CHART_W) * scaleX;
    if (relX < chartStartPx - 4 || relX > chartEndPx + 4) {
      setHover((h) => (h.idx === null ? h : { idx: null, x: 0, y: 0 }));
      return;
    }
    const t   = Math.max(0, Math.min(1, (relX - chartStartPx) / (chartEndPx - chartStartPx)));
    const idx = Math.round(t * (n - 1));
    setHover({ idx, x: relX, y: relY });
  }, [n]);

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
  const belowH  = Math.max(0, PAD_TOP + CHART_H - zeroY);
  const hovered = hover.idx !== null ? { v: data[hover.idx], d: dates[hover.idx] } : null;

  return (
    // SVG is absolutely positioned to fill the flex-1 div.
    // viewBox maps the fixed coordinate space to whatever size the card gives us.
    // overflow:"hidden" keeps all chart content inside the card boundary.
    <div
      ref={wrapRef}
      className="relative flex-1 min-h-0 w-full"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      data-testid="cumulative-pnl-chart"
    >
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="none"
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
          {/* Clip above the zero line */}
          <clipPath id={`ca_${uid}`}>
            <rect x={PAD_LEFT} y={PAD_TOP} width={CHART_W} height={aboveH} />
          </clipPath>
          {/* Clip below the zero line */}
          <clipPath id={`cb_${uid}`}>
            <rect
              x={PAD_LEFT}
              y={zeroY.toFixed(1)}
              width={CHART_W}
              height={belowH}
            />
          </clipPath>
        </defs>

        {/* Y grid lines + labels — domainMax, 0, domainMin */}
        {[domainMax, 0, ...(domainMin < 0 ? [domainMin] : [])].map((v, i) => {
          const y      = py(v);
          const isZero = v === 0;
          return (
            <g key={i}>
              <line
                x1={PAD_LEFT}
                x2={PAD_LEFT + CHART_W}
                y1={y.toFixed(1)}
                y2={y.toFixed(1)}
                stroke={isZero ? '#d1d5db' : '#f3f4f6'}
                strokeWidth="1"
                strokeDasharray={isZero ? '4,3' : undefined}
              />
              <text
                x={PAD_LEFT - 5}
                y={y}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize="9.5"
                fill="#c0c4cc"
                fontFamily="inherit"
                style={{ fontVariantNumeric: 'tabular-nums' }}
                data-testid={`cumulative-pnl-chart-ylabel-${i}`}
              >
                {fmtK(Math.round(v))}
              </text>
            </g>
          );
        })}

        {/* Area fills — green above zero, red below */}
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

        {/* Line strokes — green above zero, red below */}
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

        {/* Date labels — corrected angle so they appear at true 45° on screen */}
        {labelIndices.map((i) => {
          const x  = px(i);
          const ly = PAD_TOP + CHART_H + 14;
          return (
            <g
              key={i}
              transform={`translate(${x.toFixed(1)},${ly.toFixed(1)}) rotate(${labelAngle.toFixed(2)})`}
            >
              <text
                x={0}
                y={0}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize="9.5"
                fill="#b0b8c4"
                fontFamily="inherit"
              >
                {fmtDate(dates[i])}
              </text>
            </g>
          );
        })}

        {/* Hover indicator — vertical rule + dot */}
        {hover.idx !== null && (() => {
          const ix  = px(hover.idx);
          const iy  = py(data[hover.idx]);
          const pos = data[hover.idx] >= 0;
          return (
            <g>
              <line
                x1={ix.toFixed(1)} x2={ix.toFixed(1)}
                y1={PAD_TOP} y2={PAD_TOP + CHART_H}
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
      </svg>

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
