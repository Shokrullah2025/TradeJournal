import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { format } from "date-fns";

const DrawdownChart = ({ trades }) => {
  const calculateDrawdownData = () => {
    const completedTrades = trades
      .filter((trade) => trade.status === "closed")
      .sort((a, b) => new Date(a.entryDate) - new Date(b.entryDate));

    if (completedTrades.length === 0) return [];

    let runningTotal = 0;
    let peak = 0;
    let maxDrawdown = 0;
    let maxDrawdownDate = null;
    const data = [];

    completedTrades.forEach((trade, index) => {
      runningTotal += trade.pnl;

      if (runningTotal > peak) {
        peak = runningTotal;
      }

      const currentDrawdown = peak - runningTotal;
      const drawdownPercent = peak > 0 ? (currentDrawdown / peak) * 100 : 0;

      if (currentDrawdown > maxDrawdown) {
        maxDrawdown = currentDrawdown;
        maxDrawdownDate = trade.entryDate;
      }

      data.push({
        date: format(new Date(trade.entryDate), "MMM dd"),
        fullDate: trade.entryDate,
        balance: runningTotal,
        peak: peak,
        drawdown: currentDrawdown,
        drawdownPercent: drawdownPercent,
        tradeNumber: index + 1,
        tradePnL: trade.pnl,
        instrument: trade.instrument,
      });
    });

    return { data, maxDrawdown, maxDrawdownDate };
  };

  const getDrawdownStats = (data) => {
    if (data.length === 0) return null;

    let currentDrawdownStart = null;
    let currentDrawdownEnd = null;
    let longestDrawdown = 0;
    let currentDrawdownLength = 0;
    let drawdownPeriods = 0;
    let totalDrawdownDays = 0;

    data.forEach((point, index) => {
      if (point.drawdown > 0) {
        if (currentDrawdownStart === null) {
          currentDrawdownStart = index;
          drawdownPeriods++;
        }
        currentDrawdownLength = index - currentDrawdownStart + 1;
        totalDrawdownDays++;
      } else {
        if (currentDrawdownStart !== null) {
          currentDrawdownEnd = index - 1;
          if (currentDrawdownLength > longestDrawdown) {
            longestDrawdown = currentDrawdownLength;
          }
          currentDrawdownStart = null;
          currentDrawdownLength = 0;
        }
      }
    });

    // If still in drawdown
    if (
      currentDrawdownStart !== null &&
      currentDrawdownLength > longestDrawdown
    ) {
      longestDrawdown = currentDrawdownLength;
    }

    const avgDrawdownLength =
      drawdownPeriods > 0 ? totalDrawdownDays / drawdownPeriods : 0;
    const recoveryData = data.filter((point, index) => {
      return index > 0 && data[index - 1].drawdown > 0 && point.drawdown === 0;
    });

    return {
      drawdownPeriods,
      longestDrawdown,
      avgDrawdownLength: Math.round(avgDrawdownLength),
      recoveryTrades: recoveryData.length,
      timeInDrawdown:
        data.length > 0 ? (totalDrawdownDays / data.length) * 100 : 0,
    };
  };

  const { data, maxDrawdown, maxDrawdownDate } = calculateDrawdownData();
  const drawdownStats = getDrawdownStats(data);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-sm text-gray-600">
              Balance:
              <span
                className={`ml-1 font-semibold ${
                  data.balance >= 0 ? "text-success-600" : "text-danger-600"
                }`}
              >
                ${data.balance.toLocaleString()}
              </span>
            </p>
            <p className="text-sm text-gray-600">
              Peak:
              <span className="ml-1 font-semibold text-primary-600">
                ${data.peak.toLocaleString()}
              </span>
            </p>
            <p className="text-sm text-gray-600">
              Drawdown:
              <span className="ml-1 font-semibold text-danger-600">
                ${data.drawdown.toLocaleString()} (
                {data.drawdownPercent.toFixed(1)}%)
              </span>
            </p>
            <p className="text-sm text-gray-600">
              Trade:
              <span className="ml-1 font-medium">
                {data.instrument} ({data.tradePnL >= 0 ? "+" : ""}$
                {data.tradePnL.toLocaleString()})
              </span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  if (data.length === 0) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Drawdown Analysis
        </h3>
        <div className="text-center py-8">
          <p className="text-gray-500">No drawdown data available</p>
          <p className="text-sm text-gray-400 mt-1">
            Complete some trades to see drawdown analysis
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Drawdown Chart */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          Drawdown Analysis
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Balance & Peak Chart */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">
              Account Balance vs Peak
            </h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    stroke="#666"
                    fontSize={12}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#666"
                    fontSize={12}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => `$${value.toLocaleString()}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="peak"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={false}
                    name="Peak Balance"
                  />
                  <Line
                    type="monotone"
                    dataKey="balance"
                    stroke="#0ea5e9"
                    strokeWidth={2}
                    dot={{ fill: "#0ea5e9", strokeWidth: 2, r: 3 }}
                    name="Current Balance"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Drawdown Area Chart */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">
              Drawdown Over Time
            </h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    stroke="#666"
                    fontSize={12}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#666"
                    fontSize={12}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => `${value.toFixed(1)}%`}
                  />
                  <Tooltip
                    formatter={(value) => [`${value.toFixed(2)}%`, "Drawdown"]}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="drawdownPercent"
                    stroke="#ef4444"
                    fill="#ef4444"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Drawdown Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="text-center">
            <div className="text-2xl font-bold text-danger-600">
              ${maxDrawdown.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600 mt-1">Maximum Drawdown</div>
            {maxDrawdownDate && (
              <div className="text-xs text-gray-500 mt-1">
                {format(new Date(maxDrawdownDate), "MMM dd, yyyy")}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="text-center">
            <div className="text-2xl font-bold text-warning-600">
              {data[data.length - 1]?.drawdownPercent.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600 mt-1">Current Drawdown</div>
            <div className="text-xs text-gray-500 mt-1">
              {data[data.length - 1]?.drawdown > 0 ? "In Drawdown" : "At Peak"}
            </div>
          </div>
        </div>

        {drawdownStats && (
          <>
            <div className="card">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary-600">
                  {drawdownStats.longestDrawdown}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Longest Drawdown
                </div>
                <div className="text-xs text-gray-500 mt-1">Trades</div>
              </div>
            </div>

            <div className="card">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {drawdownStats.timeInDrawdown.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Time in Drawdown
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Of trading period
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Drawdown Insights */}
      {drawdownStats && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Drawdown Insights
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">
                Recovery Statistics
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-sm text-gray-600">
                    Drawdown Periods
                  </span>
                  <span className="font-semibold">
                    {drawdownStats.drawdownPeriods}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-sm text-gray-600">Recovery Trades</span>
                  <span className="font-semibold">
                    {drawdownStats.recoveryTrades}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-sm text-gray-600">
                    Avg Drawdown Length
                  </span>
                  <span className="font-semibold">
                    {drawdownStats.avgDrawdownLength} trades
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">
                Risk Assessment
              </h4>
              <div className="space-y-2">
                {maxDrawdown < 1000 && (
                  <div className="p-3 bg-success-50 border border-success-200 rounded">
                    <p className="text-sm text-success-700">
                      ✅ Low drawdown risk - Maximum drawdown under $1,000
                    </p>
                  </div>
                )}

                {maxDrawdown >= 1000 && maxDrawdown < 5000 && (
                  <div className="p-3 bg-warning-50 border border-warning-200 rounded">
                    <p className="text-sm text-warning-700">
                      ⚠️ Moderate drawdown risk - Consider position sizing
                    </p>
                  </div>
                )}

                {maxDrawdown >= 5000 && (
                  <div className="p-3 bg-danger-50 border border-danger-200 rounded">
                    <p className="text-sm text-danger-700">
                      🔴 High drawdown risk - Review risk management strategy
                    </p>
                  </div>
                )}

                {drawdownStats.timeInDrawdown > 50 && (
                  <div className="p-3 bg-warning-50 border border-warning-200 rounded">
                    <p className="text-sm text-warning-700">
                      📊 High time in drawdown (
                      {drawdownStats.timeInDrawdown.toFixed(1)}%) - Consider
                      strategy adjustments
                    </p>
                  </div>
                )}

                {data[data.length - 1]?.drawdown === 0 && (
                  <div className="p-3 bg-success-50 border border-success-200 rounded">
                    <p className="text-sm text-success-700">
                      🎯 Currently at peak performance - Good momentum!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DrawdownChart;
