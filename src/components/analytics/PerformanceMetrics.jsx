import React from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Gauge,
} from "lucide-react";

const formatMoney = (value) => {
  const sign = value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const PerformanceMetrics = ({ trades }) => {
  const calculateMetrics = () => {
    const completedTrades = trades.filter((trade) => trade.status === "closed");

    if (completedTrades.length === 0) {
      return {
        totalTrades: 0,
        winningCount: 0,
        winRate: 0,
        totalPnL: 0,
        avgWin: 0,
        avgLoss: 0,
        profitFactor: 0,
        maxDrawdown: 0,
        expectancy: 0,
        sharpeRatio: 0,
      };
    }

    const pnls = completedTrades.map((trade) => trade.pnl);
    const wins = pnls.filter((pnl) => pnl > 0);
    const losses = pnls.filter((pnl) => pnl < 0);

    const totalPnL = pnls.reduce((sum, pnl) => sum + pnl, 0);
    const winRate = (wins.length / completedTrades.length) * 100;
    const avgWin =
      wins.length > 0
        ? wins.reduce((sum, win) => sum + win, 0) / wins.length
        : 0;
    const avgLoss =
      losses.length > 0
        ? Math.abs(losses.reduce((sum, loss) => sum + loss, 0) / losses.length)
        : 0;
    const profitFactor =
      avgLoss > 0 ? (avgWin * wins.length) / (avgLoss * losses.length) : 0;

    // Calculate expectancy
    const expectancy =
      (winRate / 100) * avgWin - ((100 - winRate) / 100) * avgLoss;

    // Calculate max drawdown
    let runningTotal = 0;
    let peak = 0;
    let maxDrawdown = 0;

    completedTrades.forEach((trade) => {
      runningTotal += trade.pnl;
      if (runningTotal > peak) {
        peak = runningTotal;
      }
      const drawdown = peak - runningTotal;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    });

    // Simple Sharpe ratio calculation (assuming 0% risk-free rate)
    const returns = pnls.map(
      (pnl) =>
        (pnl / (completedTrades[0].entryPrice * completedTrades[0].quantity)) *
        100
    );
    const avgReturn =
      returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const returnStdDev = Math.sqrt(
      returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) /
        returns.length
    );
    const sharpeRatio = returnStdDev > 0 ? avgReturn / returnStdDev : 0;

    return {
      totalTrades: completedTrades.length,
      winningCount: wins.length,
      winRate: Math.round(winRate * 100) / 100,
      totalPnL: Math.round(totalPnL * 100) / 100,
      avgWin: Math.round(avgWin * 100) / 100,
      avgLoss: Math.round(avgLoss * 100) / 100,
      profitFactor: Math.round(profitFactor * 100) / 100,
      maxDrawdown: Math.round(maxDrawdown * 100) / 100,
      expectancy: Math.round(expectancy * 100) / 100,
      sharpeRatio: Math.round(sharpeRatio * 100) / 100,
    };
  };

  const metrics = calculateMetrics();

  const metricCards = [
    {
      title: "Total P&L",
      value: formatMoney(metrics.totalPnL),
      icon: DollarSign,
      tone: metrics.totalPnL >= 0 ? "pos" : "neg",
      subtitle: `${metrics.totalTrades} completed trades`,
      testid: "stats-total-pnl-value",
    },
    {
      title: "Win Rate",
      value: `${metrics.winRate}%`,
      icon: Target,
      tone: "neutral",
      subtitle: `${metrics.winningCount} of ${metrics.totalTrades} winning`,
      bar: metrics.winRate,
      testid: "stats-win-rate-value",
    },
    {
      title: "Profit Factor",
      value: metrics.profitFactor.toFixed(2),
      icon: TrendingUp,
      tone: metrics.profitFactor >= 1 ? "pos" : "neg",
      subtitle: "Gross profit / loss",
      testid: "stats-profit-factor-value",
    },
    {
      title: "Max Drawdown",
      value: formatMoney(-metrics.maxDrawdown),
      icon: TrendingDown,
      tone: "neg",
      subtitle: "Peak to trough",
      testid: "stats-max-drawdown-value",
    },
    {
      title: "Average Win",
      value: formatMoney(metrics.avgWin),
      icon: ArrowUpRight,
      tone: "pos",
      subtitle: "Per winning trade",
      testid: "stats-avg-win-value",
    },
    {
      title: "Average Loss",
      value: formatMoney(-metrics.avgLoss),
      icon: ArrowDownRight,
      tone: "neg",
      subtitle: "Per losing trade",
      testid: "stats-avg-loss-value",
    },
    {
      title: "Expectancy",
      value: formatMoney(metrics.expectancy),
      icon: Activity,
      tone: metrics.expectancy >= 0 ? "pos" : "neg",
      subtitle: "Expected value / trade",
      testid: "stats-expectancy-value",
    },
    {
      title: "Sharpe Ratio",
      value: metrics.sharpeRatio.toFixed(2),
      icon: Gauge,
      tone:
        metrics.sharpeRatio >= 1
          ? "pos"
          : metrics.sharpeRatio >= 0.5
          ? "neutral"
          : "neg",
      subtitle: "Risk-adjusted return",
      testid: "stats-sharpe-ratio-value",
    },
  ];

  const toneStyles = {
    pos: {
      value: "text-success-600 dark:text-success-400",
      chip: "bg-success-50 dark:bg-success-900/20 text-success-600 dark:text-success-400",
      hoverBorder: "hover:border-success-400 dark:hover:border-success-500",
    },
    neg: {
      value: "text-danger-600 dark:text-danger-400",
      chip: "bg-danger-50 dark:bg-danger-900/20 text-danger-600 dark:text-danger-400",
      hoverBorder: "hover:border-danger-400 dark:hover:border-danger-500",
    },
    neutral: {
      value: "text-primary-600 dark:text-primary-400",
      chip: "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400",
      hoverBorder: "hover:border-primary-400 dark:hover:border-primary-500",
    },
  };

  return (
    <div data-testid="performance-metrics">
      <div className="flex items-baseline justify-between mb-3.5 px-0.5">
        <h2 className="text-base font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Performance Metrics
        </h2>
        <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
          {metricCards.length} key indicators
        </span>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(218px,1fr))] gap-3.5">
        {metricCards.map((metric) => {
          const tone = toneStyles[metric.tone];
          return (
            <div
              key={metric.title}
              data-testid={`stats-${metric.title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "")}-card`}
              className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-[14px] p-4 flex flex-col gap-3 shadow-sm transition-all duration-150 hover:-translate-y-[3px] ${tone.hoverBorder}`}
            >
              <div className="flex items-center justify-between">
                <div
                  className={`w-[34px] h-[34px] rounded-[9px] grid place-items-center ${tone.chip}`}
                >
                  <metric.icon className="w-[17px] h-[17px]" />
                </div>
                <div
                  data-testid={metric.testid}
                  className={`font-mono text-[23px] font-bold tracking-tight ${tone.value}`}
                >
                  {metric.value}
                </div>
              </div>
              <div>
                <h3 className="text-[12.5px] font-semibold uppercase tracking-wide text-gray-900 dark:text-gray-100">
                  {metric.title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {metric.subtitle}
                </p>
              </div>
              {metric.bar != null && (
                <div className="h-[5px] rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary-500"
                    style={{ width: `${Math.min(Math.max(metric.bar, 0), 100)}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PerformanceMetrics;
