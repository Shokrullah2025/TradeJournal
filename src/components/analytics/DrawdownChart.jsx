import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { format, parseISO } from "date-fns";

const DrawdownChart = ({ trades = [] }) => {
  if (trades.length === 0) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-3">
          📉 Drawdown Analysis
        </h2>
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">
            No drawdown data available
          </p>
        </div>
      </div>
    );
  }

  // Calculate running P&L and drawdown
  const sortedTrades = [...trades]
    .filter((trade) => trade.exitDate)
    .sort((a, b) => new Date(a.exitDate) - new Date(b.exitDate));

  let runningPnL = 0;
  let peak = 0;
  let maxDrawdown = 0;

  const drawdownData = sortedTrades.map((trade, index) => {
    runningPnL += trade.pnl || 0;

    if (runningPnL > peak) {
      peak = runningPnL;
    }

    const currentDrawdown = peak - runningPnL;
    if (currentDrawdown > maxDrawdown) {
      maxDrawdown = currentDrawdown;
    }

    const drawdownPercent = peak !== 0 ? (currentDrawdown / peak) * 100 : 0;

    return {
      date: trade.exitDate,
      displayDate: format(new Date(trade.exitDate), "MMM dd"),
      runningPnL: runningPnL,
      peak: peak,
      drawdown: currentDrawdown,
      drawdownPercent: drawdownPercent,
      tradeIndex: index + 1,
    };
  });

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-gray-100 mb-2">
            {format(new Date(data.date), "MMM dd, yyyy")}
          </p>
          <div className="space-y-1">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Running P&L:
              <span
                className={`ml-1 font-semibold ${
                  data.runningPnL >= 0
                    ? "text-success-600 dark:text-success-400"
                    : "text-danger-600 dark:text-danger-400"
                }`}
              >
                ${data.runningPnL.toLocaleString()}
              </span>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Drawdown:
              <span className="ml-1 font-semibold text-danger-600 dark:text-danger-400">
                ${data.drawdown.toLocaleString()} (
                {data.drawdownPercent.toFixed(1)}%)
              </span>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Trade #{data.tradeIndex}
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
            📉 Portfolio Drawdown Analysis
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Monitor your account equity curve and risk exposure over time
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Maximum Drawdown
          </div>
          <div className="text-lg font-bold text-danger-600 dark:text-danger-400">
            ${maxDrawdown.toLocaleString()}
            <span className="text-sm ml-1">
              ({peak !== 0 ? ((maxDrawdown / peak) * 100).toFixed(1) : 0}%)
            </span>
          </div>
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={drawdownData}>
            <defs>
              <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="drawdownGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.6} />
            <XAxis
              dataKey="displayDate"
              stroke="#6b7280"
              fontSize={12}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              stroke="#6b7280"
              fontSize={12}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `$${value.toLocaleString()}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="runningPnL"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#pnlGradient)"
              name="Running P&L"
            />
            <Line
              type="monotone"
              dataKey="peak"
              stroke="#3b82f6"
              strokeWidth={1}
              strokeDasharray="5 5"
              dot={false}
              name="Peak"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6">
        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          📊 Key Performance Metrics
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
            <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
              $
              {drawdownData[
                drawdownData.length - 1
              ]?.runningPnL.toLocaleString() || "0"}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Current Portfolio Value
            </div>
          </div>
          <div className="text-center p-4 bg-success-50 dark:bg-success-900/20 rounded-lg border border-success-200 dark:border-success-800">
            <div className="text-xl font-bold text-success-600 dark:text-success-400">
              ${peak.toLocaleString()}
            </div>
            <div className="text-sm text-success-700 dark:text-success-400 mt-1">
              All-Time High
            </div>
          </div>
          <div className="text-center p-4 bg-danger-50 dark:bg-danger-900/20 rounded-lg border border-danger-200 dark:border-danger-800">
            <div className="text-xl font-bold text-danger-600 dark:text-danger-400">
              {peak !== 0 ? ((maxDrawdown / peak) * 100).toFixed(1) : 0}%
            </div>
            <div className="text-sm text-danger-700 dark:text-danger-400 mt-1">
              Maximum Drawdown
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DrawdownChart;
