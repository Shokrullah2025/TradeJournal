import React, { useEffect, useState } from "react";
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
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check if dark mode is active
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    
    checkDarkMode();
    
    // Listen for theme changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    return () => observer.disconnect();
  }, []);

  // Theme-aware colors
  const colors = {
    grid: isDarkMode ? '#374151' : '#f0f0f0',
    axis: isDarkMode ? '#9ca3af' : '#666666',
    line: isDarkMode ? '#60a5fa' : '#0ea5e9',
    dot: isDarkMode ? '#60a5fa' : '#0ea5e9',
  };

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
        <div className="card border border-gray-200 dark:border-gray-700 shadow-lg p-3">
          <p className="font-medium text-gray-900 dark:text-gray-100 mb-2">{label}</p>
          <p
            className={`text-sm ${
              data.value >= 0 
                ? "text-success-600 dark:text-success-400" 
                : "text-danger-600 dark:text-danger-400"
            }`}
          >
            Cumulative P&L: ${data.value.toLocaleString()}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Daily P&L: ${data.dailyPnL.toLocaleString()}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Trades: {data.trades}</p>
        </div>
      );
    }
    return null;
  };

  if (trades.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
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
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
          <XAxis
            dataKey="date"
            stroke={colors.axis}
            fontSize={12}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            stroke={colors.axis}
            fontSize={12}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => `$${value.toLocaleString()}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={colors.line}
            strokeWidth={2}
            dot={{ fill: colors.dot, strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: colors.line, strokeWidth: 2 }}
          />
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PerformanceChart;
