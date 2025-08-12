import React from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Activity,
  Calendar,
  BarChart3,
} from "lucide-react";

const PerformanceMetrics = ({ trades }) => {
  const calculateMetrics = () => {
    const completedTrades = trades.filter((trade) => trade.status === "closed");

    if (completedTrades.length === 0) {
      return {
        totalTrades: 0,
        winRate: 0,
        totalPnL: 0,
        avgWin: 0,
        avgLoss: 0,
        profitFactor: 0,
        maxDrawdown: 0,
        largestWin: 0,
        largestLoss: 0,
        avgHoldTime: 0,
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

    const largestWin = wins.length > 0 ? Math.max(...wins) : 0;
    const largestLoss = losses.length > 0 ? Math.min(...losses) : 0;

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
      winRate: Math.round(winRate * 100) / 100,
      totalPnL: Math.round(totalPnL * 100) / 100,
      avgWin: Math.round(avgWin * 100) / 100,
      avgLoss: Math.round(avgLoss * 100) / 100,
      profitFactor: Math.round(profitFactor * 100) / 100,
      maxDrawdown: Math.round(maxDrawdown * 100) / 100,
      largestWin: Math.round(largestWin * 100) / 100,
      largestLoss: Math.round(largestLoss * 100) / 100,
      expectancy: Math.round(expectancy * 100) / 100,
      sharpeRatio: Math.round(sharpeRatio * 100) / 100,
    };
  };

  const metrics = calculateMetrics();

  const metricCards = [
    {
      title: "Total P&L",
      value: `$${metrics.totalPnL.toLocaleString()}`,
      icon: DollarSign,
      color: metrics.totalPnL >= 0 ? "success" : "danger",
      subtitle: `${metrics.totalTrades} completed trades`,
    },
    {
      title: "Win Rate",
      value: `${metrics.winRate}%`,
      icon: Target,
      color:
        metrics.winRate >= 60
          ? "success"
          : metrics.winRate >= 40
          ? "warning"
          : "danger",
      subtitle: `${Math.round(
        (metrics.winRate / 100) * metrics.totalTrades
      )} winning trades`,
    },
    {
      title: "Profit Factor",
      value: metrics.profitFactor.toFixed(2),
      icon: TrendingUp,
      color:
        metrics.profitFactor >= 1.5
          ? "success"
          : metrics.profitFactor >= 1
          ? "warning"
          : "danger",
      subtitle: "Gross profit / Gross loss",
    },
    {
      title: "Max Drawdown",
      value: `$${metrics.maxDrawdown.toLocaleString()}`,
      icon: TrendingDown,
      color: "danger",
      subtitle: "Peak to trough decline",
    },
    {
      title: "Average Win",
      value: `$${metrics.avgWin.toLocaleString()}`,
      icon: TrendingUp,
      color: "success",
      subtitle: "Per winning trade",
    },
    {
      title: "Average Loss",
      value: `$${metrics.avgLoss.toLocaleString()}`,
      icon: TrendingDown,
      color: "danger",
      subtitle: "Per losing trade",
    },
    {
      title: "Expectancy",
      value: `$${metrics.expectancy.toLocaleString()}`,
      icon: Activity,
      color: metrics.expectancy >= 0 ? "success" : "danger",
      subtitle: "Expected value per trade",
    },
    {
      title: "Sharpe Ratio",
      value: metrics.sharpeRatio.toFixed(2),
      icon: Activity,
      color:
        metrics.sharpeRatio >= 1
          ? "success"
          : metrics.sharpeRatio >= 0.5
          ? "warning"
          : "danger",
      subtitle: "Risk-adjusted return",
    },
  ];

  const colorClasses = {
    success:
      "bg-success-50 dark:bg-success-900/20 text-success-600 dark:text-success-400 border-success-200 dark:border-success-800",
    danger:
      "bg-danger-50 dark:bg-danger-900/20 text-danger-600 dark:text-danger-400 border-danger-200 dark:border-danger-800",
    warning:
      "bg-warning-50 dark:bg-warning-900/20 text-warning-600 dark:text-warning-400 border-warning-200 dark:border-warning-800",
    primary:
      "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 border-primary-200 dark:border-primary-800",
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
          Performance Metrics
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {metricCards.map((metric, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border ${colorClasses[metric.color]}`}
            >
              <div className="flex items-center justify-between mb-2">
                <metric.icon className="w-5 h-5" />
                <span className="text-2xl font-bold">{metric.value}</span>
              </div>
              <div>
                <h3 className="font-medium text-sm">{metric.title}</h3>
                <p className="text-xs opacity-75 mt-1">{metric.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Additional Insights */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Key Insights
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
              Best & Worst Trades
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-success-50 dark:bg-success-900/20 rounded border border-success-200 dark:border-success-800">
                <span className="text-sm text-success-700 dark:text-success-400">
                  Largest Win
                </span>
                <span className="font-semibold text-success-800 dark:text-success-300">
                  ${metrics.largestWin.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 bg-danger-50 dark:bg-danger-900/20 rounded border border-danger-200 dark:border-danger-800">
                <span className="text-sm text-danger-700 dark:text-danger-400">
                  Largest Loss
                </span>
                <span className="font-semibold text-danger-800 dark:text-danger-300">
                  ${Math.abs(metrics.largestLoss).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
              Performance Rating
            </h4>
            <div className="space-y-2">
              {metrics.winRate >= 60 && (
                <div className="p-2 bg-success-50 dark:bg-success-900/20 rounded border border-success-200 dark:border-success-800">
                  <span className="text-sm text-success-700 dark:text-success-400">
                    🎯 Excellent win rate of {metrics.winRate}%
                  </span>
                </div>
              )}

              {metrics.profitFactor >= 1.5 && (
                <div className="p-2 bg-success-50 dark:bg-success-900/20 rounded border border-success-200 dark:border-success-800">
                  <span className="text-sm text-success-700 dark:text-success-400">
                    📈 Strong profit factor of {metrics.profitFactor}
                  </span>
                </div>
              )}

              {metrics.expectancy > 0 && (
                <div className="p-2 bg-success-50 dark:bg-success-900/20 rounded border border-success-200 dark:border-success-800">
                  <span className="text-sm text-success-700 dark:text-success-400">
                    💰 Positive expectancy of ${metrics.expectancy}
                  </span>
                </div>
              )}

              {metrics.winRate < 40 && (
                <div className="p-2 bg-warning-50 dark:bg-warning-900/20 rounded border border-warning-200 dark:border-warning-800">
                  <span className="text-sm text-warning-700 dark:text-warning-400">
                    ⚠️ Consider improving win rate ({metrics.winRate}%)
                  </span>
                </div>
              )}

              {metrics.profitFactor < 1 && (
                <div className="p-2 bg-danger-50 dark:bg-danger-900/20 rounded border border-danger-200 dark:border-danger-800">
                  <span className="text-sm text-danger-700 dark:text-danger-400">
                    🔴 Profit factor below 1.0 ({metrics.profitFactor})
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceMetrics;
