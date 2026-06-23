import React, { useMemo } from "react";
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine,
} from "recharts";
import { format } from "date-fns";
import { TrendingDown, BarChart3, Info } from "lucide-react";

// Shared visual language with the Overview (PnLOverviewHero / DistributionAnalysis).
const POS = "#22c55e";
const PRIMARY = "#0ea5e9";
const GRID = "#eef1f6";

// Full-precision currency, matching PerformanceMetrics / PnLOverviewHero.
const formatMoney = (value, decimals = 2) => {
  const sign = value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
};

// Compact axis labels that keep small, real values legible (no "$0k" collapse).
const formatK = (value) => {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1000) {
    const k = abs / 1000;
    return `${sign}$${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
  }
  return `${sign}$${abs.toLocaleString()}`;
};

// Small "ⓘ" affordance next to a chart title; reveals the explanatory text on
// hover/focus so it no longer overflows the bottom of the card.
const InfoTip = ({ text, testId }) => (
  <span className="relative inline-flex group">
    <button
      type="button"
      data-testid={testId}
      aria-label="Chart explanation"
      className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
    >
      <Info className="w-3.5 h-3.5" />
    </button>
    <span
      role="tooltip"
      className="pointer-events-none absolute left-0 top-full z-20 mt-2 w-64 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-[11px] leading-snug text-gray-500 dark:text-gray-400 shadow-lg opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
    >
      {text}
    </span>
  </span>
);

const slug = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const SectionHeader = ({ icon: Icon, tone, title, subtitle, info, right }) => {
  const toneClasses = {
    pos: "bg-success-50 dark:bg-success-900/20 text-success-600 dark:text-success-400",
    neg: "bg-danger-50 dark:bg-danger-900/20 text-danger-600 dark:text-danger-400",
    neutral:
      "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400",
  };
  return (
    <div className="flex items-start justify-between mb-5">
      <div className="flex items-center gap-3">
        <div
          className={`w-9 h-9 rounded-lg grid place-items-center ${toneClasses[tone]}`}
        >
          <Icon className="w-[18px] h-[18px]" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-[15px] font-bold text-gray-900 dark:text-gray-100">
              {title}
            </span>
            {info && <InfoTip text={info} testId={`${slug(title)}-info-btn`} />}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {subtitle}
          </div>
        </div>
      </div>
      {right}
    </div>
  );
};

const DrawdownChart = ({ trades = [] }) => {
  const { drawdownData, peak, maxDrawdown } = useMemo(() => {
    // Match the Overview: only closed trades contribute to the equity curve.
    const sortedTrades = trades
      .filter((trade) => trade.status === "closed" && trade.exitDate)
      .sort((a, b) => new Date(a.exitDate) - new Date(b.exitDate));

    let runningPnL = 0;
    let runningPeak = 0;
    let maxDD = 0;

    const data = sortedTrades.map((trade, index) => {
      runningPnL += trade.pnl || 0;
      if (runningPnL > runningPeak) runningPeak = runningPnL;

      const currentDrawdown = runningPeak - runningPnL;
      if (currentDrawdown > maxDD) maxDD = currentDrawdown;

      return {
        date: trade.exitDate,
        displayDate: format(new Date(trade.exitDate), "MMM dd"),
        runningPnL,
        peak: runningPeak,
        drawdown: currentDrawdown,
        drawdownPercent: runningPeak !== 0 ? (currentDrawdown / runningPeak) * 100 : 0,
        tradeIndex: index + 1,
      };
    });

    return { drawdownData: data, peak: runningPeak, maxDrawdown: maxDD };
  }, [trades]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1.5">
            {format(new Date(data.date), "MMM dd, yyyy")}
          </p>
          <div className="space-y-1">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Running P&L:
              <span
                className={`ml-1 font-mono font-semibold ${
                  data.runningPnL >= 0
                    ? "text-success-600 dark:text-success-400"
                    : "text-danger-600 dark:text-danger-400"
                }`}
              >
                {formatMoney(data.runningPnL)}
              </span>
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Drawdown:
              <span className="ml-1 font-mono font-semibold text-danger-600 dark:text-danger-400">
                {formatMoney(-data.drawdown)} ({data.drawdownPercent.toFixed(1)}%)
              </span>
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              Trade #{data.tradeIndex}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  if (drawdownData.length === 0) {
    return (
      <div className="card text-center py-12" data-testid="drawdown-empty-state">
        <TrendingDown className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          No drawdown data available
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Close some trades to track your equity curve and risk exposure.
        </p>
      </div>
    );
  }

  const currentValue = drawdownData[drawdownData.length - 1]?.runningPnL || 0;
  const maxDrawdownPct = peak !== 0 ? (maxDrawdown / peak) * 100 : 0;

  return (
    <div className="space-y-4" data-testid="drawdown-analysis">
      <section className="card" data-testid="drawdown-chart">
        <SectionHeader
          icon={TrendingDown}
          tone="neg"
          title="Portfolio Drawdown Analysis"
          subtitle="Cumulative equity curve and its running peak over time"
          info="The green area is your cumulative P&L after each closed trade; the dashed line marks the running peak. The gap between them is your drawdown — how far you sit below your best equity point."
          right={
            <div className="text-right">
              <div className="text-[15px] font-bold font-mono text-danger-600 dark:text-danger-400">
                {formatMoney(-maxDrawdown)}
              </div>
              <div className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
                Max DD ({maxDrawdownPct.toFixed(1)}%)
              </div>
            </div>
          }
        />

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={drawdownData}
              margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
            >
              <defs>
                <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={POS} stopOpacity={0.32} />
                  <stop offset="95%" stopColor={POS} stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
              <XAxis
                dataKey="displayDate"
                stroke="#9ca3af"
                fontSize={11}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#6b7280", fontFamily: "monospace" }}
                minTickGap={40}
              />
              <YAxis
                stroke="#9ca3af"
                fontSize={11}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => formatK(value)}
                tick={{ fill: "#6b7280", fontFamily: "monospace" }}
                width={56}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="#d1d5db" strokeWidth={1} />
              <Area
                type="monotone"
                dataKey="runningPnL"
                stroke={POS}
                strokeWidth={2}
                fill="url(#pnlGradient)"
                name="Running P&L"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="peak"
                stroke={PRIMARY}
                strokeWidth={1.5}
                strokeDasharray="5 5"
                dot={false}
                name="Peak"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="card" data-testid="drawdown-metrics">
        <SectionHeader
          icon={BarChart3}
          tone="neutral"
          title="Key Performance Metrics"
          subtitle="Snapshot of your equity and risk"
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div
            data-testid="drawdown-current-value"
            className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700"
          >
            <div className="text-xl font-mono font-bold text-gray-900 dark:text-gray-100">
              {formatMoney(currentValue)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Current Portfolio Value
            </div>
          </div>
          <div
            data-testid="drawdown-all-time-high"
            className="text-center p-4 bg-success-50 dark:bg-success-900/20 rounded-lg border border-success-200 dark:border-success-800"
          >
            <div className="text-xl font-mono font-bold text-success-600 dark:text-success-400">
              {formatMoney(peak)}
            </div>
            <div className="text-xs text-success-700 dark:text-success-400 mt-1">
              All-Time High
            </div>
          </div>
          <div
            data-testid="drawdown-max-drawdown"
            className="text-center p-4 bg-danger-50 dark:bg-danger-900/20 rounded-lg border border-danger-200 dark:border-danger-800"
          >
            <div className="text-xl font-mono font-bold text-danger-600 dark:text-danger-400">
              {maxDrawdownPct.toFixed(1)}%
            </div>
            <div className="text-xs text-danger-700 dark:text-danger-400 mt-1">
              Maximum Drawdown
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DrawdownChart;
