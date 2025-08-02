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
    <div className="trade-calendar bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Calendar Header */}
      <div className="trade-calendar__header bg-primary-600 dark:bg-primary-700 text-white p-4">
        <div className="trade-calendar__header-content flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h3 className="text-xl font-semibold">
              {format(currentDate, "MMMM yyyy")}
            </h3>
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePreviousMonth}
              className="p-2 hover:bg-primary-700 dark:hover:bg-primary-600 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-primary-700 dark:hover:bg-primary-600 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="trade-calendar__grid p-4">
        {/* Week day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day) => (
            <div
              key={day}
              className="trade-calendar__weekday text-center text-sm font-medium text-gray-600 dark:text-gray-300 py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1 relative">
          {days.map((day, index) => {
            const dayTrades = tradesByDate[format(day, "yyyy-MM-dd")] || [];
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isHovered = hoveredDate && isSameDay(day, hoveredDate);
            const hasTrades = dayTrades.length > 0;

            // Calculate daily P&L
            const dailyPnL = dayTrades.reduce((acc, trade) => {
              // Handle different possible P&L field names and ensure they're numbers
              let tradeProfit = 0;

              if (trade.pnl !== undefined && trade.pnl !== null) {
                tradeProfit = parseFloat(trade.pnl) || 0;
              } else if (trade.profit !== undefined && trade.profit !== null) {
                tradeProfit = parseFloat(trade.profit) || 0;
              }

              return acc + tradeProfit;
            }, 0);
            // Determine background color based on P&L
            let dayColorClass =
              "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700";

            if (hasTrades) {
              if (dailyPnL > 0) {
                dayColorClass =
                  "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-700";
              } else if (dailyPnL < 0) {
                dayColorClass =
                  "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-700";
              } else {
                dayColorClass =
                  "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700";
              }
            }

            return (
              <div
                key={index}
                className={`
                  trade-calendar__day relative min-h-28 p-2 border-2 rounded-lg cursor-pointer
                  transition-all duration-300 ease-out
                  ${
                    isCurrentMonth
                      ? dayColorClass
                      : "bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                  }
                  ${isToday(day) ? "ring-2 ring-blue-300 ring-opacity-50" : ""}
                  ${
                    isHovered
                      ? "transform scale-110 shadow-2xl"
                      : "hover:shadow-md"
                  }
                `}
                style={{
                  transformOrigin: "center",
                }}
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
                {/* Plus button for empty days on hover */}
                {!hasTrades && isHovered && (
                  <div
                    className="absolute top-2 right-2 z-40 animate-in fade-in duration-200"
                    style={{ animationFillMode: "both" }}
                  >
                    <div className="w-7 h-7 bg-primary-500 hover:bg-primary-300 dark:bg-primary-600 dark:hover:bg-primary-500 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 border-2 border-white dark:border-gray-800">
                      <Plus className="w-4 h-4 text-white font-bold" />
                    </div>
                  </div>
                )}
                {/* Date number */}
                <div
                  className={`trade-calendar__date text-sm font-medium mb-1 ${
                    isCurrentMonth
                      ? "text-gray-900 dark:text-gray-100"
                      : "text-gray-400 dark:text-gray-500"
                  }`}
                >
                  {format(day, "d")}
                </div>

                {/* Trade indicators */}
                {hasTrades && (
                  <div className="trade-calendar__indicators flex flex-col items-center justify-center h-full">
                    {/* Daily P&L - Center */}
                    <div className="flex items-center justify-center mb-11">
                      {dailyPnL === 0 ? (
                        <div className="text-lg font-bold text-gray-500 dark:text-gray-400">
                          $0
                        </div>
                      ) : dailyPnL > 0 ? (
                        <div className="text-lg font-bold text-green-700 dark:text-green-400">
                          +${Math.abs(dailyPnL).toFixed(0)}
                        </div>
                      ) : (
                        <div className="text-lg font-bold text-red-700 dark:text-red-400">
                          -${Math.abs(dailyPnL).toFixed(0)}
                        </div>
                      )}
                    </div>

                    {/* Trade count - Bottom Right */}
                    <div className="absolute bottom-2 right-2">
                      <span className="text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 px-1 py-0.5 rounded shadow-sm">
                        {dayTrades.length} trade
                        {dayTrades.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Calendar Footer with Summary */}
      <div className="trade-calendar__footer bg-gray-50 dark:bg-gray-900 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
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
              <div className="w-3 h-3 bg-green-300 dark:bg-green-600 rounded"></div>
              <span>Profit</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-red-300 dark:bg-red-600 rounded"></div>
              <span>Loss</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-gray-200 dark:bg-gray-600 rounded"></div>
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
