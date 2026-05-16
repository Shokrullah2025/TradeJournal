import React, {
  useCallback,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const PAD     = { left: 36, right: 6, top: 8, bottom: 30 };

const fmtDate = (d, fmt) => {
  if (!d) return '';
  const m  = String(d.getMonth() + 1).padStart(2, '0');
  const dy = String(d.getDate()).padStart(2, '0');
  if (fmt === 'MMM D') return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
  if (fmt === 'D MMM') return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return `${m}/${dy}`;
};

const fmtK = (v) => {
  const s = v >= 0 ? '+' : '';
  if (Math.abs(v) >= 1000)
    return `${s}${(v / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return `${s}${Math.round(v)}`;
};

/**
 * Cumulative P&L line chart.
 *
 * Props
 *   data        number[]   — cumulative running totals, one per trading day
 *   dates       Date[]     — matching Date objects (same length as data)
 *   minSpacing  number     — minimum px between x-axis date labels (default 60)
 *   dateFmt     string     — 'MM/DD' | 'MMM D' | 'D MMM'
 */
const CumulativePnLChart = ({
  data = [],
  dates = [],
  minSpacing = 60,
  dateFmt = 'MM/DD',
}) => {
  const uid     = useId().replace(/:/g, '_');
  const wrapRef = useRef(null);
  const [size, setSize] = useState({ w: 400, h: 200 });

  // Measure both width AND height so the SVG fills the flex-1 container exactly.
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setSize({
        w: Math.max(60,  Math.round(r.width)),
        h: Math.max(80,  Math.round(r.height)),
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n      = data.length;
  const W      = size.w;
  const H      = size.h;
  const chartW = Math.max(1, W - PAD.left - PAD.right);
  const chartH = Math.max(20, H - PAD.top - PAD.bottom);

  // Domain always includes 0 so zero line is always visible.
  const domainMin = useMemo(() => Math.min(...data, 0), [data]);
  const domainMax = useMemo(() => Math.max(...data, 0), [data]);
  const range     = useMemo(() => domainMax - domainMin || 1, [domainMax, domainMin]);

  const px = useCallback(
    (i) => PAD.left + (n > 1 ? i / (n - 1) : 0.5) * chartW,
    [n, chartW]
  );
  const py = useCallback(
    (v) => PAD.top + (1 - (v - domainMin) / range) * chartH,
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
    const bottom = (PAD.top + chartH).toFixed(1);
    const pts = data
      .map((v, i) => `${i === 0 ? 'M' : 'L'}${px(i).toFixed(1)},${py(v).toFixed(1)}`)
      .join(' ');
    return `${pts} L${px(n - 1).toFixed(1)},${bottom} L${px(0).toFixed(1)},${bottom} Z`;
  }, [data, n, px, py, chartH]);

  // Date-label indices: start from step (never index 0), always show last.
  // Minimum step of 2 guarantees at least one session gap between every label.
  const labelIndices = useMemo(() => {
    if (n < 2) return [];
    const maxLabels = Math.max(2, Math.floor(chartW / minSpacing));
    const step      = Math.max(2, Math.ceil((n - 1) / (maxLabels - 1)));
    const set       = new Set();
    for (let i = step; i < n; i += step) set.add(i);
    set.add(n - 1);
    return [...set].sort((a, b) => a - b);
  }, [n, chartW, minSpacing]);

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

  const aboveH = Math.max(0, zeroY - PAD.top);
  const belowH = Math.max(0, PAD.top + chartH - zeroY);

  return (
    // flex-1 min-h-0 fills the remaining space inside the card's flex column.
    <div
      ref={wrapRef}
      className="flex-1 min-h-0 w-full"
      data-testid="cumulative-pnl-chart"
    >
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: 'block', overflow: 'visible' }}
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
            <rect x={PAD.left} y={PAD.top} width={chartW} height={aboveH} />
          </clipPath>
          {/* Clip below the zero line */}
          <clipPath id={`cb_${uid}`}>
            <rect
              x={PAD.left}
              y={zeroY.toFixed(1)}
              width={chartW}
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
                x1={PAD.left}
                x2={PAD.left + chartW}
                y1={y.toFixed(1)}
                y2={y.toFixed(1)}
                stroke={isZero ? '#d1d5db' : '#f3f4f6'}
                strokeWidth="1"
                strokeDasharray={isZero ? '4,3' : undefined}
              />
              <text
                x={PAD.left - 5}
                y={y}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize="9.5"
                fill={v > 0 ? '#16a34a' : v < 0 ? '#ef4444' : '#aaa'}
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

        {/* Date labels — 45° rotated, never at index 0, always show last */}
        {labelIndices.map((i) => {
          const x  = px(i);
          const ly = PAD.top + chartH + 14;
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
                fill="#b0b8c4"
                fontFamily="inherit"
              >
                {fmtDate(dates[i], dateFmt)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default CumulativePnLChart;
