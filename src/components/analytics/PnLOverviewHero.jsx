import React, { useMemo } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

const formatMoney = (value, decimals = 2) => {
  const sign = value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
};

const formatK = (value) => {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1000) {
    const k = abs / 1000;
    return `${sign}$${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
  }
  return `${sign}$${abs.toLocaleString()}`;
};

const PnLOverviewHero = ({ trades = [], timeLabel = "All Time" }) => {
  const data = useMemo(() => {
    const closed = trades.filter((t) => t.status === "closed");
    const sorted = [...closed]
      .filter((t) => t.exitDate || t.entryDate)
      .sort(
        (a, b) =>
          new Date(a.exitDate || a.entryDate) -
          new Date(b.exitDate || b.entryDate)
      );

    let running = 0;
    const series = sorted.map((t) => {
      running += t.pnl || 0;
      return running;
    });

    const netPnL = closed.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const wins = closed.filter((t) => (t.pnl || 0) > 0);
    const losses = closed.filter((t) => (t.pnl || 0) < 0);
    const winRate = closed.length ? (wins.length / closed.length) * 100 : 0;

    const grossProfit = wins.reduce((s, t) => s + t.pnl, 0);
    const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : wins.length ? Infinity : 0;

    // Best day by calendar date
    const dayMap = {};
    closed.forEach((t) => {
      const d = new Date(t.exitDate || t.entryDate);
      if (isNaN(d)) return;
      const key = d.toISOString().slice(0, 10);
      dayMap[key] = (dayMap[key] || 0) + (t.pnl || 0);
    });
    const bestDay = Object.values(dayMap).length
      ? Math.max(...Object.values(dayMap))
      : 0;

    return {
      series,
      netPnL,
      completed: closed.length,
      winRate,
      profitFactor,
      bestDay,
    };
  }, [trades]);

  const positive = data.netPnL >= 0;
  const toneColor = positive ? "#22c55e" : "#ef4444";

  // Build equity curve SVG paths
  const { line, area, dotX, dotY } = useMemo(() => {
    const N = data.series.length;
    const W = 680;
    const H = 132;
    const pad = 12;
    if (N === 0) return { line: "", area: "", dotX: 0, dotY: 0 };

    const mn = Math.min(...data.series, 0);
    const mx = Math.max(...data.series, 0);
    const X = (i) => (N === 1 ? W : (i / (N - 1)) * W);
    const Y = (v) => pad + (1 - (v - mn) / (mx - mn || 1)) * (H - 2 * pad);

    let d = `M ${X(0).toFixed(1)} ${Y(data.series[0]).toFixed(1)}`;
    for (let i = 1; i < N; i++) d += ` L ${X(i).toFixed(1)} ${Y(data.series[i]).toFixed(1)}`;
    if (N === 1) d += ` L ${W} ${Y(data.series[0]).toFixed(1)}`;

    const areaPath = `${d} L ${W} ${H} L 0 ${H} Z`;
    return {
      line: d,
      area: areaPath,
      dotX: X(N - 1),
      dotY: Y(data.series[N - 1]),
    };
  }, [data.series]);

  const hasCurve = data.series.length > 0;

  return (
    <section
      className="relative overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm px-6 py-5"
      data-test-id="analytics-pnl-hero"
    >
      <div className="flex flex-wrap items-center gap-x-8 gap-y-6">
        {/* Left: headline + mini stats */}
        <div className="min-w-[230px]">
          <div className="text-[11px] font-semibold uppercase tracking-[1.2px] text-gray-400 dark:text-gray-500 font-mono">
            Net P&amp;L · {timeLabel}
          </div>
          <div
            className={`font-mono text-[42px] font-bold leading-none tracking-tight mt-1.5 mb-1 ${
              positive
                ? "text-success-600 dark:text-success-400"
                : "text-danger-600 dark:text-danger-400"
            }`}
            data-test-id="analytics-net-pnl-value"
          >
            {formatMoney(data.netPnL)}
          </div>
          <div className="text-[13px] text-gray-500 dark:text-gray-400">
            Across {data.completed} completed trades
          </div>

          <div className="flex flex-wrap gap-6 mt-4">
            <div>
              <div className="font-mono text-[19px] font-bold text-gray-900 dark:text-gray-100">
                {data.winRate.toFixed(2)}%
              </div>
              <div className="text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500 mt-px">
                Win Rate
              </div>
            </div>
            <div className="w-px bg-gray-200 dark:bg-gray-700" />
            <div>
              <div className="font-mono text-[19px] font-bold text-success-600 dark:text-success-400">
                {Number.isFinite(data.profitFactor)
                  ? data.profitFactor.toFixed(2)
                  : "∞"}
              </div>
              <div className="text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500 mt-px">
                Profit Factor
              </div>
            </div>
            <div className="w-px bg-gray-200 dark:bg-gray-700" />
            <div>
              <div
                className={`font-mono text-[19px] font-bold ${
                  data.bestDay >= 0
                    ? "text-success-600 dark:text-success-400"
                    : "text-danger-600 dark:text-danger-400"
                }`}
              >
                {formatK(data.bestDay)}
              </div>
              <div className="text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500 mt-px">
                Best Day
              </div>
            </div>
          </div>
        </div>

        {/* Right: equity curve */}
        <div className="flex-1 min-w-[300px]">
          <div className="flex justify-between mb-2">
            <span className="text-[11px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-mono">
              Equity Curve
            </span>
            <span
              className={`text-[11px] font-mono flex items-center gap-1.5 ${
                positive
                  ? "text-success-600 dark:text-success-400"
                  : "text-danger-600 dark:text-danger-400"
              }`}
            >
              {positive ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {positive ? "trending up" : "trending down"}
            </span>
          </div>
          {hasCurve ? (
            <svg
              viewBox="0 0 680 132"
              preserveAspectRatio="none"
              className="w-full h-32 block"
              style={{ color: toneColor }}
            >
              <defs>
                <linearGradient id="heroEqGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={area} fill="url(#heroEqGradient)" />
              <path
                d={line}
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <circle cx={dotX} cy={dotY} r="4" fill="currentColor" />
              <circle cx={dotX} cy={dotY} r="8" fill="currentColor" opacity="0.18" />
            </svg>
          ) : (
            <div className="h-32 grid place-items-center text-sm text-gray-400 dark:text-gray-500">
              No completed trades yet
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default PnLOverviewHero;
