import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, getHours, getDay } from "date-fns";

const TimeAnalysis = ({ trades, detailed = false }) => {
  const analyzeByHour = () => {
    const completedTrades = trades.filter(
      (trade) => trade.status === "closed" && trade.entryTime
    );
    const hourlyStats = {};

    // Initialize all hours
    for (let hour = 0; hour < 24; hour++) {
      hourlyStats[hour] = {
        hour,
        displayHour: `${hour.toString().padStart(2, "0")}:00`,
        totalTrades: 0,
        wins: 0,
        losses: 0,
        totalPnL: 0,
        winRate: 0,
      };
    }

    completedTrades.forEach((trade) => {
      const hour = parseInt(trade.entryTime.split(":")[0]);
      if (hourlyStats[hour]) {
        hourlyStats[hour].totalTrades++;
        hourlyStats[hour].totalPnL += trade.pnl;

        if (trade.pnl > 0) {
          hourlyStats[hour].wins++;
        } else if (trade.pnl < 0) {
          hourlyStats[hour].losses++;
        }

        hourlyStats[hour].winRate =
          hourlyStats[hour].totalTrades > 0
            ? (hourlyStats[hour].wins / hourlyStats[hour].totalTrades) * 100
            : 0;
      }
    });

    return Object.values(hourlyStats).filter((stat) => stat.totalTrades > 0);
  };

  const analyzeByDayOfWeek = () => {
    const completedTrades = trades.filter((trade) => trade.status === "closed");
    const dayStats = {};
    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    // Initialize all days
    dayNames.forEach((name, index) => {
      dayStats[index] = {
        day: index,
        name,
        totalTrades: 0,
        wins: 0,
        losses: 0,
        totalPnL: 0,
        winRate: 0,
      };
    });

    completedTrades.forEach((trade) => {
      const day = getDay(new Date(trade.entryDate));
      dayStats[day].totalTrades++;
      dayStats[day].totalPnL += trade.pnl;

      if (trade.pnl > 0) {
        dayStats[day].wins++;
      } else if (trade.pnl < 0) {
        dayStats[day].losses++;
      }

      dayStats[day].winRate =
        dayStats[day].totalTrades > 0
          ? (dayStats[day].wins / dayStats[day].totalTrades) * 100
          : 0;
    });

    return Object.values(dayStats).filter((stat) => stat.totalTrades > 0);
  };

  const analyzeByMonth = () => {
    const completedTrades = trades.filter((trade) => trade.status === "closed");
    const monthlyStats = {};

    completedTrades.forEach((trade) => {
      const monthKey = format(new Date(trade.entryDate), "yyyy-MM");
      const monthDisplay = format(new Date(trade.entryDate), "MMM yyyy");

      if (!monthlyStats[monthKey]) {
        monthlyStats[monthKey] = {
          month: monthKey,
          displayMonth: monthDisplay,
          totalTrades: 0,
          wins: 0,
          losses: 0,
          totalPnL: 0,
          winRate: 0,
        };
      }

      monthlyStats[monthKey].totalTrades++;
      monthlyStats[monthKey].totalPnL += trade.pnl;

      if (trade.pnl > 0) {
        monthlyStats[monthKey].wins++;
      } else if (trade.pnl < 0) {
        monthlyStats[monthKey].losses++;
      }

      monthlyStats[monthKey].winRate =
        monthlyStats[monthKey].totalTrades > 0
          ? (monthlyStats[monthKey].wins / monthlyStats[monthKey].totalTrades) *
            100
          : 0;
    });

    return Object.values(monthlyStats).sort((a, b) =>
      a.month.localeCompare(b.month)
    );
  };

  const hourlyData = analyzeByHour();
  const dailyData = analyzeByDayOfWeek();
  const monthlyData = analyzeByMonth();

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

  if (trades.length === 0) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Time Analysis
        </h3>
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">
            No time data available
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hourly Analysis */}
      {hourlyData.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
            Hourly Performance
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="displayHour"
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
                <Bar dataKey="totalPnL" fill="#0ea5e9" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Daily Analysis */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
          Day of Week Performance
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="name"
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
              <Bar dataKey="totalPnL" fill="#22c55e" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {detailed && (
        <>
          {/* Monthly Analysis */}
          {monthlyData.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
                Monthly Performance
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="displayMonth"
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
                    <Bar
                      dataKey="totalPnL"
                      fill="#f59e0b"
                      radius={[2, 2, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Time Insights */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Time-Based Insights
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Best Trading Hours */}
              {hourlyData.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                    Best Trading Hours
                  </h4>
                  <div className="space-y-2">
                    {hourlyData
                      .sort((a, b) => b.totalPnL - a.totalPnL)
                      .slice(0, 3)
                      .map((hour, index) => (
                        <div
                          key={hour.hour}
                          className="flex items-center justify-between p-2 bg-success-50 dark:bg-success-900/20 rounded"
                        >
                          <span className="text-sm font-medium text-success-700 dark:text-success-400">
                            #{index + 1} {hour.displayHour}
                          </span>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-success-800 dark:text-success-300">
                              ${hour.totalPnL.toLocaleString()}
                            </div>
                            <div className="text-xs text-success-600 dark:text-success-500">
                              {hour.totalTrades} trades,{" "}
                              {hour.winRate.toFixed(1)}% win
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Best Trading Days */}
              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                  Best Trading Days
                </h4>
                <div className="space-y-2">
                  {dailyData
                    .sort((a, b) => b.totalPnL - a.totalPnL)
                    .slice(0, 3)
                    .map((day, index) => (
                      <div
                        key={day.day}
                        className="flex items-center justify-between p-2 bg-primary-50 dark:bg-primary-900/20 rounded"
                      >
                        <span className="text-sm font-medium text-primary-700 dark:text-primary-400">
                          #{index + 1} {day.name}
                        </span>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-primary-800 dark:text-primary-300">
                            ${day.totalPnL.toLocaleString()}
                          </div>
                          <div className="text-xs text-primary-600 dark:text-primary-500">
                            {day.totalTrades} trades, {day.winRate.toFixed(1)}%
                            win
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Trading Patterns */}
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                Trading Patterns
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
                <div>
                  <strong>Most Active Day:</strong>{" "}
                  {
                    dailyData.reduce(
                      (max, day) =>
                        day.totalTrades > max.totalTrades ? day : max,
                      { totalTrades: 0, name: "None" }
                    ).name
                  }
                </div>
                <div>
                  <strong>Most Profitable Day:</strong>{" "}
                  {
                    dailyData.reduce(
                      (max, day) => (day.totalPnL > max.totalPnL ? day : max),
                      { totalPnL: 0, name: "None" }
                    ).name
                  }
                </div>
                {hourlyData.length > 0 && (
                  <>
                    <div>
                      <strong>Most Active Hour:</strong>{" "}
                      {
                        hourlyData.reduce(
                          (max, hour) =>
                            hour.totalTrades > max.totalTrades ? hour : max,
                          { totalTrades: 0, displayHour: "None" }
                        ).displayHour
                      }
                    </div>
                    <div>
                      <strong>Most Profitable Hour:</strong>{" "}
                      {
                        hourlyData.reduce(
                          (max, hour) =>
                            hour.totalPnL > max.totalPnL ? hour : max,
                          { totalPnL: 0, displayHour: "None" }
                        ).displayHour
                      }
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TimeAnalysis;
