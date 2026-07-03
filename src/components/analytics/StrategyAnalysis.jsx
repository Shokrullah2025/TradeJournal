import React, { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ReferenceLine,
} from "recharts";
import {
  Target,
  PieChart as PieIcon,
  Trophy,
  BarChart3,
  Info,
} from "lucide-react";

// Shared visual language with the Overview (PnLOverviewHero / DistributionAnalysis).
const POS = "#22c55e";
const NEG = "#ef4444";
const GRID = "#eef1f6";

const COLORS = [
  "#2a9d8f", // Brand teal
  "#22c55e", // Success green
  "#f59e0b", // Warning amber
  "#ef4444", // Danger red
  "#8b5cf6", // Purple
  "#06b6d4", // Cyan
  "#84cc16", // Lime
  "#f97316", // Orange
  "#ec4899", // Pink
  "#6366f1", // Indigo
];

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

const formatPF = (pf) => (Number.isFinite(pf) ? pf.toFixed(2) : "∞");

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

// The hover banner. Rendered as our own overlay (not Recharts' Tooltip) so it
// only appears when the cursor is actually over the bar, not anywhere in the
// row band.
const TooltipBox = ({ data }) => (
  <div className="bg-white dark:bg-gray-800 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg whitespace-nowrap">
    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1.5">
      {data.name}
    </p>
    <div className="space-y-1">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Total P&L:
        <span
          className={`ml-1 font-mono font-semibold ${
            data.totalPnL >= 0
              ? "text-success-600 dark:text-success-400"
              : "text-danger-600 dark:text-danger-400"
          }`}
        >
          {formatMoney(data.totalPnL)}
        </span>
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Win Rate:
        <span className="ml-1 font-mono font-semibold text-gray-900 dark:text-gray-100">
          {data.winRate.toFixed(1)}%
        </span>
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Total Trades:
        <span className="ml-1 font-mono font-semibold text-gray-900 dark:text-gray-100">
          {data.totalTrades}
        </span>
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Profit Factor:
        <span className="ml-1 font-mono font-semibold text-gray-900 dark:text-gray-100">
          {formatPF(data.profitFactor)}
        </span>
      </p>
    </div>
  </div>
);

// Absolutely-positioned highlight + banner for the hovered bar. The banner is
// pinned a few px above the bar's top edge.
const ChartTooltipOverlay = ({ hovered }) => (
  <>
    <div
      className="pointer-events-none absolute z-0 rounded bg-gray-400/10"
      style={{
        left: hovered.rectX - 6,
        top: hovered.rectTop - 6,
        width: hovered.rectW + 12,
        height: hovered.rectH + 12,
      }}
    />
    <div
      className="pointer-events-none absolute z-10 [transform:translate(-50%,calc(-100%_-_14px))]"
      style={{ left: hovered.cx, top: hovered.rectTop }}
    >
      <TooltipBox data={hovered.data} />
    </div>
  </>
);

const StrategyAnalysis = ({ trades = [], detailed = false }) => {
  // Hovered bar, captured from the Bar's own mouse events (fire only over the
  // rectangle) so the banner never shows over empty parts of a row.
  const [hovered, setHovered] = useState(null);
  const handleBarHover = (d) => {
    if (typeof d?.y !== "number") return;
    const rectTop = Math.min(d.y, d.y + d.height);
    setHovered({
      cx: d.x + d.width / 2,
      rectTop,
      rectX: d.x,
      rectW: d.width,
      rectH: Math.abs(d.height),
      data: d.payload,
    });
  };
  const clearHover = () => setHovered(null);

  const strategyData = useMemo(() => {
    const completedTrades = trades.filter((trade) => trade.status === "closed");
    const strategyStats = {};

    completedTrades.forEach((trade) => {
      const strategy = (trade.strategy || "").trim() || "No Strategy";
      const pnl = trade.pnl || 0;

      if (!strategyStats[strategy]) {
        strategyStats[strategy] = {
          name: strategy,
          totalTrades: 0,
          wins: 0,
          losses: 0,
          totalPnL: 0,
          grossProfit: 0,
          grossLoss: 0,
          winRate: 0,
          avgWin: 0,
          avgLoss: 0,
          profitFactor: 0,
        };
      }

      const stats = strategyStats[strategy];
      stats.totalTrades++;
      stats.totalPnL += pnl;

      if (pnl > 0) {
        stats.wins++;
        stats.grossProfit += pnl;
      } else if (pnl < 0) {
        stats.losses++;
        stats.grossLoss += Math.abs(pnl);
      }
    });

    // Derive metrics using the same definitions the Overview uses.
    Object.values(strategyStats).forEach((stats) => {
      stats.winRate =
        stats.totalTrades > 0 ? (stats.wins / stats.totalTrades) * 100 : 0;
      stats.avgWin = stats.wins > 0 ? stats.grossProfit / stats.wins : 0;
      stats.avgLoss = stats.losses > 0 ? stats.grossLoss / stats.losses : 0;
      stats.profitFactor =
        stats.grossLoss > 0
          ? stats.grossProfit / stats.grossLoss
          : stats.grossProfit > 0
          ? Infinity
          : 0;
    });

    return Object.values(strategyStats).sort((a, b) => b.totalPnL - a.totalPnL);
  }, [trades]);

  const totalTradeCount = useMemo(
    () => strategyData.reduce((sum, s) => sum + s.totalTrades, 0),
    [strategyData]
  );

  const PieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const share = totalTradeCount
        ? ((data.totalTrades / totalTradeCount) * 100).toFixed(1)
        : "0.0";
      return (
        <div className="bg-white dark:bg-gray-800 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {data.name}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
            {data.totalTrades} {data.totalTrades === 1 ? "trade" : "trades"} (
            {share}%)
          </p>
        </div>
      );
    }
    return null;
  };

  if (strategyData.length === 0) {
    return (
      <div
        className="card text-center py-12"
        data-testid="strategy-empty-state"
      >
        <Target className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          No strategy data available
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Close some trades with a strategy assigned to see how each one
          performs.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="strategy-analysis">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="card" data-testid="strategy-pnl-chart">
        <SectionHeader
          icon={Target}
          tone="neutral"
          title="Strategy Performance Analysis"
          subtitle="Net P&L contributed by each of your trading strategies"
          info="Bars to the right of $0 are net-profitable strategies; bars to the left are net losers. Hover any bar for win rate, trade count and profit factor."
          right={
            <span className="text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 px-2.5 py-1 rounded-full whitespace-nowrap">
              {strategyData.length}{" "}
              {strategyData.length === 1 ? "strategy" : "strategies"}
            </span>
          }
        />

        <div className="relative" style={{ height: Math.min(360, Math.max(240, strategyData.length * 40 + 30)) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={strategyData}
              barCategoryGap="30%"
              margin={{ top: 8, right: 48, left: 8, bottom: 8 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={GRID}
                horizontal={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                stroke="#9ca3af"
                fontSize={12}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#6b7280" }}
                width={130}
              />
              <XAxis
                type="number"
                stroke="#9ca3af"
                fontSize={11}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => formatK(value)}
                tick={{ fill: "#6b7280", fontFamily: "monospace" }}
              />
              <ReferenceLine x={0} stroke="#d1d5db" strokeWidth={1} />
              <Bar
                dataKey="totalPnL"
                radius={[0, 5, 5, 0]}
                maxBarSize={28}
                onMouseEnter={handleBarHover}
                onMouseLeave={clearHover}
              >
                {strategyData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.totalPnL >= 0 ? POS : NEG}
                    fillOpacity={0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {hovered && <ChartTooltipOverlay hovered={hovered} />}
        </div>
        </section>

        <section className="card" data-testid="strategy-distribution-chart">
          <SectionHeader
            icon={PieIcon}
            tone="neutral"
            title="Strategy Distribution"
            subtitle="Proportion of trades across your strategies"
          />
          <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={strategyData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="totalTrades"
                    >
                      {strategyData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
          </div>
        </section>
      </div>

      {detailed && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <section className="card" data-testid="strategy-rankings">
              <SectionHeader
                icon={Trophy}
                tone="pos"
                title="Strategy Rankings"
                subtitle="Ranked by net P&L contribution"
              />
              <div className="space-y-3">
                {strategyData.map((strategy, index) => (
                  <div
                    key={strategy.name}
                    data-testid={`strategy-rank-row-${index}`}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{
                          backgroundColor: COLORS[index % COLORS.length],
                        }}
                      />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {strategy.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {strategy.totalTrades} trades •{" "}
                          {strategy.winRate.toFixed(1)}% win rate
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`font-mono font-semibold ${
                          strategy.totalPnL >= 0
                            ? "text-success-600 dark:text-success-400"
                            : "text-danger-600 dark:text-danger-400"
                        }`}
                      >
                        {strategy.totalPnL >= 0 ? "+" : ""}
                        {formatMoney(strategy.totalPnL)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                        PF: {formatPF(strategy.profitFactor)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

          <section className="card" data-testid="strategy-metrics-table">
            <SectionHeader
              icon={BarChart3}
              tone="neutral"
              title="Detailed Strategy Metrics"
              subtitle="Key performance indicators for each strategy"
            />
            <div className="space-y-3">
              {strategyData.map((strategy) => (
                <div
                  key={strategy.name}
                  data-testid={`strategy-metrics-row-${strategy.name}`}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {strategy.name}
                    </div>
                    <div className="text-xs font-mono mt-0.5">
                      <span className="text-success-600 dark:text-success-400">
                        Avg Win {formatMoney(strategy.avgWin)}
                      </span>
                      <span className="text-gray-400 dark:text-gray-500"> • </span>
                      <span className="text-danger-600 dark:text-danger-400">
                        Avg Loss {formatMoney(-strategy.avgLoss)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`font-mono font-semibold ${
                        strategy.totalPnL >= 0
                          ? "text-success-600 dark:text-success-400"
                          : "text-danger-600 dark:text-danger-400"
                      }`}
                    >
                      {strategy.totalPnL >= 0 ? "+" : ""}
                      {formatMoney(strategy.totalPnL)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                      {strategy.totalTrades} trades • {strategy.winRate.toFixed(1)}% • PF{" "}
                      {formatPF(strategy.profitFactor)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default StrategyAnalysis;
