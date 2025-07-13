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
import DayDetailModal from "./DayDetailModal";

const TradeCalendar = ({ trades, onAddTrade, onEditTrade }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hoveredDate, setHoveredDate] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [showDayDetail, setShowDayDetail] = useState(false);

  // Generate calendar days
  const days = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const daysArray = [];
    let day = startDate;

    while (day <= endDate) {
      daysArray.push(day);
      day = addDays(day, 1);
    }

    return daysArray;
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

  const handlePreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
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
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePreviousMonth}
              className="p-2 hover:bg-blue-600 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-blue-600 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Week day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day) => (
            <div
              key={day}
              className="text-center text-sm font-medium text-gray-600 py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => {
            const dayTrades = tradesByDate[format(day, "yyyy-MM-dd")] || [];
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isHovered = hoveredDate && isSameDay(day, hoveredDate);
            const hasTrades = dayTrades.length > 0;

            // Calculate daily P&L
            const dailyPnL = dayTrades.reduce((acc, trade) => acc + (trade.profit || 0), 0);
            const isProfit = dailyPnL > 0;

            return (
              <div
                key={index}
                className={`
                  relative min-h-28 p-2 border-2 rounded-lg cursor-pointer
                  transition-all duration-200 group hover:shadow-lg hover:scale-[1.02]
                  ${isCurrentMonth ? "bg-white" : "bg-gray-50"}
                  ${
                    isToday(day)
                      ? "ring-2 ring-blue-500 ring-opacity-50 bg-blue-50"
                      : ""
                  }
                  ${
                    hasTrades
                      ? isProfit
                        ? "border-green-300 bg-green-50"
                        : "border-red-300 bg-red-50"
                      : "border-gray-200"
                  }
                  ${isHovered ? "transform scale-105 z-10" : ""}
                `}
                onMouseEnter={() => setHoveredDate(day)}
                onMouseLeave={() => setHoveredDate(null)}
                onClick={() => {
                  if (hasTrades) {
                    setSelectedDay(day);
                    setShowDayDetail(true);
                  } else {
                    onAddTrade(day);
                  }
                }}
              >
                {/* Date number */}
                <div className={`text-sm font-medium mb-1 ${
                  isCurrentMonth ? "text-gray-900" : "text-gray-400"
                }`}>
                  {format(day, "d")}
                </div>

                {/* Trade indicators */}
                {hasTrades && (
                  <div className="space-y-1">
                    {/* Daily P&L */}
                    <div className="text-xs font-medium">
                      {isProfit ? (
                        <span className="text-green-700">
                          +${Math.abs(dailyPnL).toFixed(0)}
                        </span>
                      ) : (
                        <span className="text-red-700">
                          -${Math.abs(dailyPnL).toFixed(0)}
                        </span>
                      )}
                    </div>

                    {/* Trade count */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">
                        {dayTrades.length} trade{dayTrades.length !== 1 ? "s" : ""}
                      </span>
                      
                      {/* Win rate indicator for multiple trades */}
                      {dayTrades.length >= 2 && (() => {
                        const winningTrades = dayTrades.filter(trade => (trade.profit || 0) > 0).length;
                        const winRate = (winningTrades / dayTrades.length) * 100;
                        
                        return (
                          <span className={`text-xs px-1 py-0.5 rounded ${
                            winRate >= 60 
                              ? "bg-green-300 text-green-900" 
                              : "bg-orange-200 text-orange-800"
                          }`}>
                            {winRate.toFixed(0)}% WR
                          </span>
                        );
                      })()}
                    </div>
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
              <div className="w-3 h-3 bg-green-300 rounded"></div>
              <span>Profit</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-red-300 rounded"></div>
              <span>Loss</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-gray-200 rounded"></div>
              <span>No trades</span>
            </div>
          </div>
        </div>
      </div>

      {/* Day Detail Modal */}
      {showDayDetail && selectedDay && (
        <DayDetailModal
          isOpen={showDayDetail}
          onClose={() => setShowDayDetail(false)}
          date={selectedDay}
          trades={tradesByDate[format(selectedDay, "yyyy-MM-dd")] || []}
          onEditTrade={(trade) => {
            setShowDayDetail(false);
            onEditTrade(trade);
          }}
          onAddTrade={(date) => {
            setShowDayDetail(false);
            onAddTrade(date);
          }}
        />
      )}
    </div>
  );
};

export default TradeCalendar;
