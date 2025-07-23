import React from "react";
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
} from "recharts";

const StrategyAnalysis = ({ trades, detailed = false }) => {
  const analyzeStrategies = () => {
    const completedTrades = trades.filter((trade) => trade.status === "closed");
    const strategyStats = {};

    completedTrades.forEach((trade) => {
      const strategy = trade.strategy || "No Strategy";

      if (!strategyStats[strategy]) {
        strategyStats[strategy] = {
          name: strategy,
          totalTrades: 0,
          wins: 0,
          losses: 0,
          totalPnL: 0,
          winRate: 0,
          avgWin: 0,
          avgLoss: 0,
          profitFactor: 0,
        };
      }

      const stats = strategyStats[strategy];
      stats.totalTrades++;
      stats.totalPnL += trade.pnl;

      if (trade.pnl > 0) {
        stats.wins++;
      } else if (trade.pnl < 0) {
        stats.losses++;
      }
    });

    // Calculate derived metrics
    Object.values(strategyStats).forEach((stats) => {
      stats.winRate =
        stats.totalTrades > 0 ? (stats.wins / stats.totalTrades) * 100 : 0;

      const winningTrades = completedTrades.filter(
        (t) => (t.strategy || "No Strategy") === stats.name && t.pnl > 0
      );
      const losingTrades = completedTrades.filter(
        (t) => (t.strategy || "No Strategy") === stats.name && t.pnl < 0
      );

      stats.avgWin =
        winningTrades.length > 0
          ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) /
            winningTrades.length
          : 0;

      stats.avgLoss =
        losingTrades.length > 0
          ? Math.abs(
              losingTrades.reduce((sum, t) => sum + t.pnl, 0) /
                losingTrades.length
            )
          : 0;

      stats.profitFactor =
        stats.avgLoss > 0 && stats.losses > 0
          ? (stats.avgWin * stats.wins) / (stats.avgLoss * stats.losses)
          : stats.wins > 0
          ? 999
          : 0;
    });

    return Object.values(strategyStats).sort((a, b) => b.totalPnL - a.totalPnL);
  };

  const strategyData = analyzeStrategies();

  const COLORS = [
    "#0ea5e9",
    "#22c55e",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#06b6d4",
    "#84cc16",
    "#f97316",
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-gray-100 mb-2">
            {label}
          </p>
          <div className="space-y-1">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Total P&L:
              <span
                className={`ml-1 font-semibold ${
                  data.totalPnL >= 0
                    ? "text-success-600 dark:text-success-400"
                    : "text-danger-600 dark:text-danger-400"
                }`}
              >
                ${data.totalPnL.toLocaleString()}
              </span>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Win Rate:
              <span className="ml-1 font-semibold text-gray-900 dark:text-gray-100">
                {data.winRate.toFixed(1)}%
              </span>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Total Trades:
              <span className="ml-1 font-semibold text-gray-900 dark:text-gray-100">
                {data.totalTrades}
              </span>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Profit Factor:
              <span className="ml-1 font-semibold text-gray-900 dark:text-gray-100">
                {data.profitFactor.toFixed(2)}
              </span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const PieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-gray-100">
            {data.name}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {data.totalTrades} trades (
            {(
              (data.totalTrades /
                strategyData.reduce((sum, s) => sum + s.totalTrades, 0)) *
              100
            ).toFixed(1)}
            %)
          </p>
        </div>
      );
    }
    return null;
  };

  if (strategyData.length === 0) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Strategy Analysis
        </h3>
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">
            No strategy data available
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
          Strategy Performance
        </h3>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={strategyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="name"
                stroke="#666"
                fontSize={12}
                axisLine={false}
                tickLine={false}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                stroke="#666"
                fontSize={12}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `$${value.toLocaleString()}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="totalPnL" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {detailed && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Strategy Distribution
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={strategyData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="totalTrades"
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
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
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Strategy Rankings
              </h3>
              <div className="space-y-3">
                {strategyData.map((strategy, index) => (
                  <div
                    key={strategy.name}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-3 h-3 rounded-full`}
                        style={{
                          backgroundColor: COLORS[index % COLORS.length],
                        }}
                      ></div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {strategy.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {strategy.totalTrades} trades •{" "}
                          {strategy.winRate.toFixed(1)}% win rate
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`font-semibold ${
                          strategy.totalPnL >= 0
                            ? "text-success-600"
                            : "text-danger-600"
                        }`}
                      >
                        {strategy.totalPnL >= 0 ? "+" : ""}$
                        {strategy.totalPnL.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        PF: {strategy.profitFactor.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Detailed Strategy Metrics
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Strategy
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Trades
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Win Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Total P&L
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Avg Win
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Avg Loss
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Profit Factor
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {strategyData.map((strategy) => (
                    <tr
                      key={strategy.name}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                        {strategy.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {strategy.totalTrades}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {strategy.winRate.toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <span
                          className={
                            strategy.totalPnL >= 0
                              ? "text-success-600 dark:text-success-400"
                              : "text-danger-600 dark:text-danger-400"
                          }
                        >
                          {strategy.totalPnL >= 0 ? "+" : ""}$
                          {strategy.totalPnL.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-success-600 dark:text-success-400">
                        ${strategy.avgWin.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-danger-600 dark:text-danger-400">
                        ${strategy.avgLoss.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {strategy.profitFactor.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default StrategyAnalysis;
