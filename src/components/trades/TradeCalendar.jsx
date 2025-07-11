import React, { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar as CalendarIcon,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
} from "date-fns";

const TradeCalendar = ({ trades, onAddTrade, onEditTrade }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hoveredDate, setHoveredDate] = useState(null);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const days = [];
    let day = startDate;

    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }

    return days;
  }, [currentDate]);

  // Group trades by date
  const tradesByDate = useMemo(() => {
    const groups = {};
    trades.forEach((trade) => {
      if (trade.entryDate) {
        const dateKey = format(parseISO(trade.entryDate), "yyyy-MM-dd");
        if (!groups[dateKey]) {
          groups[dateKey] = [];
        }
        groups[dateKey].push(trade);
      }
    });
    return groups;
  }, [trades]);

  // Get trades for a specific date
  const getTradesForDate = (date) => {
    const dateKey = format(date, "yyyy-MM-dd");
    return tradesByDate[dateKey] || [];
  };

  // Calculate day statistics
  const getDayStats = (dayTrades) => {
    const closedTrades = dayTrades.filter((trade) => trade.status === "closed");
    const totalPnL = closedTrades.reduce(
      (sum, trade) => sum + (trade.pnl || 0),
      0
    );
    const winCount = closedTrades.filter((trade) => trade.pnl > 0).length;
    const lossCount = closedTrades.filter((trade) => trade.pnl < 0).length;

    return {
      totalTrades: dayTrades.length,
      closedTrades: closedTrades.length,
      openTrades: dayTrades.length - closedTrades.length,
      totalPnL,
      winCount,
      lossCount,
      winRate:
        closedTrades.length > 0 ? (winCount / closedTrades.length) * 100 : 0,
    };
  };

  const handlePreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const handleDateClick = (date) => {
    const dayTrades = getTradesForDate(date);
    if (dayTrades.length === 1) {
      onEditTrade(dayTrades[0]);
    }
  };

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Calendar Header */}
      <div
        style={{ backgroundColor: "rgb(2, 132, 199)" }}
        className="text-white p-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h3 className="text-xl font-semibold">
              {format(currentDate, "MMMM yyyy")}
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePreviousMonth}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1 text-sm bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
            >
              Today
            </button>
            <button
              onClick={handleNextMonth}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Week Headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {weekDays.map((day) => (
            <div
              key={day}
              className="text-center text-sm font-medium text-gray-500 py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((day, index) => {
            const dayTrades = getTradesForDate(day);
            const stats = getDayStats(dayTrades);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isHovered = hoveredDate && isSameDay(day, hoveredDate);
            const hasTrades = dayTrades.length > 0;

            return (
              <div
                key={index}
                className={`
                  relative min-h-24 p-2 border border-gray-100 rounded-lg cursor-pointer
                  transition-all duration-200 group hover:shadow-md hover:border-blue-300
                  ${isCurrentMonth ? "bg-white" : "bg-gray-50"}
                  ${
                    isToday(day)
                      ? "ring-2 ring-blue-500 ring-opacity-50 bg-blue-50"
                      : ""
                  }
                  ${
                    hasTrades && stats.closedTrades > 0
                      ? stats.totalPnL > 0
                        ? "bg-green-50 border-green-200 hover:bg-green-100"
                        : stats.totalPnL < 0
                        ? "bg-red-50 border-red-200 hover:bg-red-100"
                        : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                      : hasTrades
                      ? "bg-blue-50 border-blue-200 hover:bg-blue-100"
                      : "hover:bg-gray-50"
                  }
                `}
                onMouseEnter={() => setHoveredDate(day)}
                onMouseLeave={() => setHoveredDate(null)}
                onClick={() => handleDateClick(day)}
              >
                {/* Date Number */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`
                    text-sm font-medium
                    ${isCurrentMonth ? "text-gray-900" : "text-gray-400"}
                    ${isToday(day) ? "text-blue-600 font-bold" : ""}
                  `}
                  >
                    {format(day, "d")}
                  </span>

                  {/* Plus Button on Hover */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddTrade(day);
                    }}
                    className={`
                      w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center
                      transition-all duration-200 hover:bg-blue-700 hover:scale-110
                      opacity-0 group-hover:opacity-100 invisible group-hover:visible
                      shadow-md hover:shadow-lg
                    `}
                    title="Add trade for this date"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Trade Indicators */}
                {hasTrades && (
                  <div className="space-y-1">
                    {/* Trade Count and P&L - Combined for better space usage */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 font-medium">
                        {stats.totalTrades} trade{stats.totalTrades !== 1 ? "s" : ""}
                      </span>
                      {stats.openTrades > 0 && (
                        <span className="bg-yellow-100 text-yellow-800 px-1 rounded text-xs font-medium">
                          {stats.openTrades} open
                        </span>
                      )}
                    </div>

                    {/* P&L Display - More prominent */}
                    {stats.closedTrades > 0 && (
                      <div
                        className={`
                        text-sm font-bold flex items-center justify-center
                        px-1 py-1 rounded-md
                        ${
                          stats.totalPnL > 0
                            ? "text-green-700 bg-green-100"
                            : stats.totalPnL < 0
                            ? "text-red-700 bg-red-100"
                            : "text-gray-700 bg-gray-100"
                        }
                      `}
                      >
                        {stats.totalPnL > 0 ? "+" : ""}
                        ${Math.abs(stats.totalPnL).toFixed(0)}
                      </div>
                    )}

                    {/* Win/Loss Count - Compact */}
                    {stats.closedTrades > 0 && (
                      <div className="flex items-center justify-center space-x-1 text-xs">
                        {stats.winCount > 0 && (
                          <span className="text-green-600 font-medium">
                            {stats.winCount}W
                          </span>
                        )}
                        {stats.winCount > 0 && stats.lossCount > 0 && (
                          <span className="text-gray-400">|</span>
                        )}
                        {stats.lossCount > 0 && (
                          <span className="text-red-600 font-medium">
                            {stats.lossCount}L
                          </span>
                        )}
                      </div>
                    )}

                    {/* Trade Preview (for multiple trades) */}
                    {dayTrades.length > 1 && (
                      <div className="text-xs text-gray-500 truncate">
                        {dayTrades
                          .slice(0, 2)
                          .map((trade) => trade.instrument)
                          .join(", ")}
                        {dayTrades.length > 2 && "..."}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Calendar Footer with Summary */}
      <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div>
            Total trades this month:{" "}
            {Object.values(tradesByDate)
              .filter((dayTrades) =>
                dayTrades.some((trade) =>
                  isSameMonth(parseISO(trade.entryDate), currentDate)
                )
              )
              .reduce((sum, dayTrades) => sum + dayTrades.length, 0)}
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-blue-100 rounded"></div>
              <span>Has trades</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>Today</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradeCalendar;
