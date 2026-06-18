import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";

const InstrumentAnalysis = ({ trades = [], detailed = false }) => {
  if (trades.length === 0) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-3">
          🎯 Instrument Performance Analysis
        </h2>
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">
            No instrument data available
          </p>
        </div>
      </div>
    );
  }

  // Group trades by instrument
  const instrumentData = trades.reduce((acc, trade) => {
    const instrument = trade.instrument || "Unknown";
    if (!acc[instrument]) {
      acc[instrument] = {
        name: instrument,
        totalTrades: 0,
        totalPnL: 0,
        winningTrades: 0,
      };
    }

    acc[instrument].totalTrades += 1;
    acc[instrument].totalPnL += trade.pnl || 0;
    if (trade.pnl > 0) {
      acc[instrument].winningTrades += 1;
    }

    return acc;
  }, {});

  const chartData = Object.values(instrumentData)
    .map((item) => ({
      ...item,
      winRate:
        item.totalTrades > 0
          ? (item.winningTrades / item.totalTrades) * 100
          : 0,
    }))
    .sort((a, b) => b.totalPnL - a.totalPnL)
    .slice(0, detailed ? 10 : 5);

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
              Trades:
              <span className="ml-1 font-semibold text-gray-900 dark:text-gray-100">
                {data.totalTrades}
              </span>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Win Rate:
              <span className="ml-1 font-semibold text-gray-900 dark:text-gray-100">
                {data.winRate.toFixed(1)}%
              </span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-3">
            🎯 Instrument Performance Analysis
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Compare profitability across different trading instruments
          </p>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {chartData.length} instruments analyzed
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            barCategoryGap="30%"
            margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" vertical={false} />
            <XAxis
              dataKey="name"
              stroke="#9ca3af"
              fontSize={12}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#374151", fontWeight: 600 }}
            />
            <YAxis
              stroke="#9ca3af"
              fontSize={11}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              tick={{ fill: "#6b7280" }}
              width={48}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(156,163,175,0.08)" }} />
            <ReferenceLine y={0} stroke="#d1d5db" strokeWidth={1.5} />
            <Bar dataKey="totalPnL" radius={[5, 5, 0, 0]} maxBarSize={44}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.totalPnL >= 0 ? "#10b981" : "#ef4444"}
                  fillOpacity={0.8}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {detailed && (
        <div className="mt-6">
          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            📊 Detailed Performance Breakdown
          </h4>
          <div className="space-y-2">
            {chartData.map((instrument, index) => (
              <div
                key={instrument.name}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <div>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {instrument.name}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                      {instrument.totalTrades} trades
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`font-semibold ${
                      instrument.totalPnL >= 0
                        ? "text-success-600 dark:text-success-400"
                        : "text-danger-600 dark:text-danger-400"
                    }`}
                  >
                    {instrument.totalPnL >= 0 ? "+" : ""}${instrument.totalPnL.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {instrument.winRate.toFixed(1)}% win rate
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default InstrumentAnalysis;
