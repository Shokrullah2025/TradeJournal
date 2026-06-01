import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";

const HOURS = [9, 10, 11, 12, 13, 14, 15, 16];
const DAYS  = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const PAD   = { l: 30, r: 4, t: 6, b: 18 };

const WhenYouWinChart = ({ trades = [] }) => {
  const wrapRef = useRef(null);
  const [dims,  setDims] = useState(null);

  const { grid, maxAbs } = useMemo(() => {
    const g = {};
    (trades || [])
      .filter((t) => t && t.status === "closed")
      .forEach((trade) => {
        const raw =
          trade.exitDate ||
          trade.exit_date ||
          trade.createdAt ||
          trade.created_at;
        if (!raw) return;
        const d = new Date(raw);
        if (isNaN(d.getTime())) return;
        const dow = d.getDay();
        if (dow === 0 || dow === 6) return;
        const dayIdx = dow - 1;
        const hour = d.getHours();
        if (hour < 9 || hour > 16) return;
        const key = `${dayIdx}-${hour}`;
        if (!g[key]) g[key] = { sum: 0, count: 0 };
        g[key].sum   += trade.pnl || 0;
        g[key].count += 1;
      });

    const avgs = Object.values(g).map((c) => Math.abs(c.sum / c.count));
    return { grid: g, maxAbs: Math.max(...avgs, 1) };
  }, [trades]);

  const hasData = Object.keys(grid).length > 0;

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
    const raf = requestAnimationFrame(() => requestAnimationFrame(measure));
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  // Re-run when transitioning from empty state (no ref) to chart state (ref attached)
  }, [hasData]); // eslint-disable-line react-hooks/exhaustive-deps

  const cellFill = useCallback((dayIdx, hr) => {
    const cell = grid[`${dayIdx}-${hr}`];
    if (!cell) return null;
    const avg   = cell.sum / cell.count;
    const ratio = Math.min(1, Math.abs(avg) / maxAbs);
    const op    = (0.08 + ratio * 0.72).toFixed(2);
    return avg >= 0
      ? `rgba(22,163,74,${op})`
      : `rgba(239,68,68,${op})`;
  }, [grid, maxAbs]);

  if (!hasData) {
    return (
      <div
        className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm text-center"
        data-testid="when-you-win-empty-state"
      >
        <div>
          <div className="font-medium mb-1">No trading data</div>
          <div className="text-xs">Add closed trades with timestamps to see patterns</div>
        </div>
      </div>
    );
  }

  const chartW   = (dims ? dims.w : 400) - PAD.l - PAD.r;
  const chartH   = (dims ? dims.h : 260) - PAD.t - PAD.b;
  const cellSize = Math.floor(Math.min(chartW / HOURS.length, chartH / DAYS.length));
  const cellW    = cellSize;
  const cellH    = cellSize;
  const gridW    = cellSize * HOURS.length;
  const gridH    = cellSize * DAYS.length;
  const offsetX  = (chartW - gridW) / 2;
  const offsetY  = (chartH - gridH) / 2;

  return (
    <div
      ref={wrapRef}
      className="relative flex-1 min-h-0 w-full"
      data-testid="when-you-win-chart"
    >
      {dims && (
        <svg
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
          aria-label="Heatmap of average P&L by day of week and trading hour"
        >
          {DAYS.map((_, dayIdx) =>
            HOURS.map((hr, j) => {
              const x    = PAD.l + offsetX + j * cellW;
              const y    = PAD.t + offsetY + dayIdx * cellH;
              const fill = cellFill(dayIdx, hr);
              return (
                <rect
                  key={`${dayIdx}-${j}`}
                  x={x.toFixed(1)}
                  y={y.toFixed(1)}
                  width={Math.max(1, cellW - 1.5).toFixed(1)}
                  height={Math.max(1, cellH - 1.5).toFixed(1)}
                  rx="3"
                  fill={fill ?? undefined}
                  className={fill ? undefined : "fill-gray-100 dark:fill-gray-800"}
                  data-testid={`when-you-win-cell-${dayIdx}-${hr}`}
                />
              );
            })
          )}

          {/* Day labels — left */}
          {DAYS.map((d, i) => (
            <text
              key={d}
              x={PAD.l + offsetX - 4}
              y={PAD.t + offsetY + i * cellH + cellH / 2}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize="9.5"
              fill="#374151"
              fontFamily="inherit"
            >
              {d}
            </text>
          ))}

          {/* Hour labels — bottom, every other */}
          {HOURS.map((hr, j) => {
            if (j % 2 !== 0) return null;
            return (
              <text
                key={hr}
                x={(PAD.l + offsetX + j * cellW + cellW / 2).toFixed(1)}
                y={PAD.t + offsetY + gridH + 13}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="9.5"
                fill="#374151"
                fontFamily="inherit"
              >
                {hr}
              </text>
            );
          })}
        </svg>
      )}
    </div>
  );
};

export default WhenYouWinChart;
