import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const PnLChart = ({ trades }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check if dark mode is active
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    };

    checkDarkMode();

    // Listen for theme changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  // Theme-aware colors
  const colors = {
    grid: isDarkMode ? "#374151" : "#f0f0f0",
    axis: isDarkMode ? "#9ca3af" : "#666666",
    wins: isDarkMode ? "#4ade80" : "#22c55e",
    losses: isDarkMode ? "#f87171" : "#ef4444",
  };

  const generatePnLData = () => {
    const completedTrades = trades.filter((trade) => trade.status === "closed");

    if (completedTrades.length === 0) return [];

    // Group trades by P&L ranges
    const ranges = [
      { label: "< -$1000", min: -Infinity, max: -1000, wins: 0, losses: 0 },
      { label: "-$1000 to -$500", min: -1000, max: -500, wins: 0, losses: 0 },
      { label: "-$500 to -$100", min: -500, max: -100, wins: 0, losses: 0 },
      { label: "-$100 to $0", min: -100, max: 0, wins: 0, losses: 0 },
      { label: "$0 to $100", min: 0, max: 100, wins: 0, losses: 0 },
      { label: "$100 to $500", min: 100, max: 500, wins: 0, losses: 0 },
      { label: "$500 to $1000", min: 500, max: 1000, wins: 0, losses: 0 },
      { label: "> $1000", min: 1000, max: Infinity, wins: 0, losses: 0 },
    ];

    completedTrades.forEach((trade) => {
      const pnl = trade.pnl;
      const range = ranges.find((r) => pnl > r.min && pnl <= r.max);
      if (range) {
        if (pnl > 0) {
          range.wins++;
        } else {
          range.losses++;
        }
      }
    });

    return ranges.filter((range) => range.wins > 0 || range.losses > 0);
  };

  const data = generatePnLData();

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const wins = payload.find((p) => p.dataKey === "wins")?.value || 0;
      const losses = payload.find((p) => p.dataKey === "losses")?.value || 0;
      const total = wins + losses;

      return (
        <div className="card border border-gray-200 dark:border-gray-700 shadow-lg p-3">
          <p className="font-medium text-gray-900 dark:text-gray-100 mb-2">
            {label}
          </p>
          <div className="space-y-1">
            <p className="text-sm text-success-600 dark:text-success-400">
              Wins: {wins}
            </p>
            <p className="text-sm text-danger-600 dark:text-danger-400">
              Losses: {losses}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Total: {total}
            </p>
            {total > 0 && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Win Rate: {((wins / total) * 100).toFixed(1)}%
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <p>No closed trades available</p>
          <p className="text-sm mt-1">
            Complete some trades to see P&L distribution
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
          <XAxis
            dataKey="label"
            stroke={colors.axis}
            fontSize={10}
            axisLine={false}
            tickLine={false}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis
            stroke={colors.axis}
            fontSize={12}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="wins"
            stackId="a"
            fill={colors.wins}
            name="Wins"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="losses"
            stackId="a"
            fill={colors.losses}
            name="Losses"
            radius={[0, 0, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PnLChart;
