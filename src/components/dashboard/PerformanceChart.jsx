import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, subDays, eachDayOfInterval } from "date-fns";

const PerformanceChart = ({ trades }) => {
  // Generate data for the last 30 days
  const generateChartData = () => {
    const endDate = new Date();
    const startDate = subDays(endDate, 30);
    const dateRange = eachDayOfInterval({ start: startDate, end: endDate });

    let cumulativePnL = 0;
    const data = [];

    dateRange.forEach((date) => {
      const dayTrades = trades.filter((trade) => {
        const tradeDate = new Date(trade.entryDate);
        return (
          tradeDate.toDateString() === date.toDateString() &&
          trade.status === "closed"
        );
      });

      const dayPnL = dayTrades.reduce((sum, trade) => sum + trade.pnl, 0);
      cumulativePnL += dayPnL;

      data.push({
        date: format(date, "MMM dd"),
        value: cumulativePnL,
        dailyPnL: dayPnL,
        trades: dayTrades.length,
      });
    });

    return data;
  };

  const data = generateChartData();

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          <p
            className={`text-sm ${
              data.value >= 0 ? "text-success-600" : "text-danger-600"
            }`}
          >
            Cumulative P&L: ${data.value.toLocaleString()}
          </p>
          <p className="text-sm text-gray-600">
            Daily P&L: ${data.dailyPnL.toLocaleString()}
          </p>
          <p className="text-sm text-gray-600">Trades: {data.trades}</p>
        </div>
      );
    }
    return null;
  };

  if (trades.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <p>No trading data available</p>
          <p className="text-sm mt-1">
            Start logging trades to see your performance
          </p>
        </div>
      </div>
    );
  }

  return (
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
            dataKey="value"
            stroke="#0ea5e9"
            strokeWidth={2}
            dot={{ fill: "#0ea5e9", strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: "#0ea5e9", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PerformanceChart;
