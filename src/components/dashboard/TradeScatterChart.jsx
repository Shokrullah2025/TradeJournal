import React, { useLayoutEffect, useMemo, useRef, useState } from "react";

const PAD = { l: 34, r: 8, t: 8, b: 22 };
const MAX_POINTS = 150;

const fmtK = (v) => {
  const s = v > 0 ? "+" : v < 0 ? "-" : "";
  const a = Math.abs(v);
  if (a >= 1000) return `${s}${(a / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return `${s}${Math.round(a)}`;
};

const fmtDate = (d) =>
  `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;

const fmtFull = (v) => `${v >= 0 ? "+" : "-"}$${Math.abs(v).toLocaleString()}`;

const niceCeil = (v) => {
  if (!isFinite(v) || v <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  const nice = n < 1.5 ? 1.5 : n < 3 ? 3 : n < 7 ? 7 : 10;
  return nice * pow;
};

/**
 * Scatter of individual trade outcomes — one dot per closed trade,
 * x = exit time, y = P&L. Shows consistency, outliers, and whether
 * losses are capped at a glance.
 */
const TradeScatterChart = ({ trades = [] }) => {
  const wrapRef = useRef(null);
  const [dims, setDims] = useState(null);
  const [hover, setHover] = useState(null); // { idx, x, y }

  const points = useMemo(() => {
    return (trades || [])
      .filter((t) => t && t.status === "closed")
      .map((t) => {
        const raw = t.exitDate || t.exit_date || t.createdAt || t.created_at;
        if (!raw) return null;
        const d = new Date(raw);
        if (isNaN(d.getTime())) return null;
        return { date: d, pnl: t.pnl || 0, instrument: t.instrument || "" };
      })
      .filter(Boolean)
      .sort((a, b) => a.date - b.date)
      .slice(-MAX_POINTS);
  }, [trades]);

  const hasData = points.length >= 2;

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setDims({
        w: Math.max(120, Math.round(r.width)),
        h: Math.max(80, Math.round(r.height)),
      });
    };
    measure();
    const raf = requestAnimationFrame(() => requestAnimationFrame(measure));
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [hasData]); // eslint-disable-line react-hooks/exhaustive-deps

  const chartW = (dims ? dims.w : 300) - PAD.l - PAD.r;
  const chartH = (dims ? dims.h : 200) - PAD.t - PAD.b;

  const { maxAbs, minT, spanT } = useMemo(() => {
    if (!hasData) return { maxAbs: 1, minT: 0, spanT: 1 };
    const maxAbs = niceCeil(Math.max(...points.map((p) => Math.abs(p.pnl)), 1));
    const minT = points[0].date.getTime();
    const spanT = Math.max(1, points[points.length - 1].date.getTime() - minT);
    return { maxAbs, minT, spanT };
  }, [points, hasData]);

  const px = (p) => PAD.l + ((p.date.getTime() - minT) / spanT) * chartW;
  const py = (p) => PAD.t + (1 - (p.pnl + maxAbs) / (2 * maxAbs)) * chartH;

  if (!hasData) {
    return (
      <div
        className="h-52 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm text-center"
        data-testid="trade-scatter-empty-state"
      >
        <div>
          <div className="font-medium mb-1">No trading data yet</div>
          <div className="text-xs">Add closed trades to see your outcomes</div>
        </div>
      </div>
    );
  }

  const hovered = hover !== null ? points[hover.idx] : null;
  // X labels: first, middle, last point dates
  const xLabelIdx = [0, Math.floor((points.length - 1) / 2), points.length - 1];

  return (
    <div
      ref={wrapRef}
      className="relative h-52 w-full"
      onMouseLeave={() => setHover(null)}
      data-testid="trade-scatter-chart"
    >
      {dims && (
        <svg
          className="absolute inset-0 w-full h-full block overflow-hidden"
          role="img"
          aria-label="Scatter chart of individual trade outcomes over time"
        >
          {/* Y grid: max, zero (dashed), -max */}
          {[maxAbs, 0, -maxAbs].map((v, i) => {
            const y = PAD.t + (1 - (v + maxAbs) / (2 * maxAbs)) * chartH;
            return (
              <g key={i}>
                <line
                  x1={PAD.l}
                  x2={PAD.l + chartW}
                  y1={y.toFixed(1)}
                  y2={y.toFixed(1)}
                  stroke={v === 0 ? "#d1d5db" : "#f3f4f6"}
                  strokeWidth="1"
                  strokeDasharray={v === 0 ? "4,3" : undefined}
                />
                <text
                  x={Math.round(PAD.l / 2)}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="9.5"
                  fill="#374151"
                  fontFamily="inherit"
                >
                  {fmtK(v)}
                </text>
              </g>
            );
          })}

          {/* Dots */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={px(p).toFixed(1)}
              cy={py(p).toFixed(1)}
              r={hover?.idx === i ? 4.5 : 3}
              fill={p.pnl >= 0 ? "#16a34a" : "#ef4444"}
              opacity={hover !== null && hover.idx !== i ? 0.35 : 0.8}
              stroke={hover?.idx === i ? "#fff" : "none"}
              strokeWidth="1.5"
              className="cursor-pointer transition-opacity duration-100"
              onMouseEnter={(e) => {
                const rect = wrapRef.current?.getBoundingClientRect();
                if (!rect) return;
                setHover({ idx: i, x: e.clientX - rect.left, y: e.clientY - rect.top });
              }}
              data-testid={`trade-scatter-dot-${i}`}
            />
          ))}

          {/* X labels */}
          {xLabelIdx.map((i, k) => (
            <text
              key={k}
              x={px(points[i]).toFixed(1)}
              y={PAD.t + chartH + 13}
              textAnchor={k === 0 ? "start" : k === 2 ? "end" : "middle"}
              fontSize="9.5"
              fill="#374151"
              fontFamily="inherit"
            >
              {fmtDate(points[i].date)}
            </text>
          ))}
        </svg>
      )}

      {hovered && (
        <div
          className="absolute pointer-events-none z-20 px-2.5 py-1.5 rounded-lg bg-gray-900 dark:bg-gray-50 text-white dark:text-gray-900 shadow-xl text-xs whitespace-nowrap"
          style={{ left: hover.x, top: hover.y - 10, transform: "translate(-50%, -100%)" }}
          data-testid="trade-scatter-tooltip"
        >
          <div
            className={
              hovered.pnl >= 0
                ? "font-semibold text-green-400 dark:text-green-600"
                : "font-semibold text-red-400 dark:text-red-600"
            }
          >
            {fmtFull(hovered.pnl)}
          </div>
          <div className="opacity-75 mt-0.5">
            {hovered.instrument && `${hovered.instrument} · `}
            {fmtDate(hovered.date)}
          </div>
        </div>
      )}
    </div>
  );
};

export default TradeScatterChart;
