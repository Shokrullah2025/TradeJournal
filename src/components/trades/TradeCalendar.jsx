import React, { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
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
} from "date-fns";
import DayDetailModal from "./DayDetailModal";

// Daily P&L formatters for the calendar cells.
// Full value (e.g. +$140) is shown where there's room (>=sm); a compact form
// (e.g. -$1.2k) is used on phones so 4–5 digit values don't overflow the
// ~46px-wide cells.
const fmtPnLFull = (v) => `${v >= 0 ? "+" : "-"}$${Math.abs(v).toFixed(0)}`;
const fmtPnLCompact = (v) => {
  const a = Math.abs(v);
  const sign = v >= 0 ? "+" : "-";
  if (a >= 1000) return `${sign}$${(a / 1000).toFixed(a >= 10000 ? 0 : 1)}k`;
  return `${sign}$${a.toFixed(0)}`;
};

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

  // Group trades by date — use substring(0,10) to avoid timezone shifting
  const tradesByDate = useMemo(() => {
    const groups = {};
    trades.forEach((trade) => {
      if (trade.entryDate) {
        const dateKey = trade.entryDate.substring(0, 10);
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
    <div className="trade-calendar card !p-0 overflow-hidden">
      {/* Calendar Header — light, with month nav + legend */}
      <div className="trade-calendar__header flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {format(currentDate, "MMMM yyyy")}
          </h3>
          <div className="flex items-center space-x-1">
            <button
              onClick={handlePreviousMonth}
              aria-label="Previous month"
              className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextMonth}
              aria-label="Next month"
              className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="hidden sm:flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center space-x-1">
            <div className="w-2.5 h-2.5 bg-success-400 dark:bg-success-500 rounded-sm"></div>
            <span>Profit</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2.5 h-2.5 bg-danger-400 dark:bg-danger-500 rounded-sm"></div>
            <span>Loss</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2.5 h-2.5 bg-gray-200 dark:bg-gray-600 rounded-sm"></div>
            <span>None</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="trade-calendar__grid px-4 pb-2">
        {/* Week day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day) => (
            <div
              key={day}
              className="trade-calendar__weekday text-center text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500 py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1 relative" style={{ isolation: "isolate" }}>
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
                  trade-calendar__day relative min-h-16 sm:min-h-24 p-1 sm:p-2 border rounded-xl cursor-pointer
                  transition-all duration-200 ease-out
                  ${
                    isCurrentMonth
                      ? dayColorClass
                      : "bg-gray-50/60 dark:bg-gray-900/60 border-gray-200 dark:border-gray-700/60"
                  }
                  ${
                    isToday(day)
                      ? "ring-2 ring-primary-500 ring-opacity-70"
                      : ""
                  }
                  ${
                    isHovered
                      ? "shadow-md z-10"
                      : "hover:shadow-sm z-0"
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
                {/* Plus button on hover — every day, so another trade can be
                    added to a day that already has entries without going
                    through the detail modal. stopPropagation keeps the click
                    from also opening the day detail. */}
                {isHovered && (
                  <div
                    className="absolute top-2 right-2 z-40 animate-in fade-in duration-200"
                    style={{ animationFillMode: "both" }}
                  >
                    <button
                      type="button"
                      aria-label={`Add trade on ${format(day, "MMM d, yyyy")}`}
                      data-test-id={`calendar-day-add-btn-${format(day, "yyyy-MM-dd")}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddTrade(day);
                      }}
                      className="w-7 h-7 bg-primary-500 hover:bg-primary-300 dark:bg-primary-600 dark:hover:bg-primary-500 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 border-2 border-white dark:border-gray-800"
                    >
                      <Plus className="w-4 h-4 text-white font-bold" />
                    </button>
                  </div>
                )}
                {/* Date number */}
                <div
                  className={`trade-calendar__date text-xs sm:text-sm font-medium mb-0.5 sm:mb-1 ${
                    isCurrentMonth
                      ? "text-gray-900 dark:text-gray-100"
                      : "text-gray-400 dark:text-gray-500"
                  }`}
                >
                  {format(day, "d")}
                </div>

                {/* Trade indicators — daily P&L centered with a count pill below */}
                {hasTrades && (
                  <div className="trade-calendar__indicators flex flex-col items-center justify-center gap-1 mt-1 sm:mt-2">
                    {(() => {
                      const colorCls =
                        dailyPnL === 0
                          ? "text-gray-500 dark:text-gray-400"
                          : dailyPnL > 0
                          ? "text-success-600 dark:text-success-400"
                          : "text-danger-600 dark:text-danger-400";
                      return (
                        <div
                          className={`text-[11px] sm:text-base font-bold leading-tight text-center ${colorCls}`}
                        >
                          {/* Compact (e.g. -$1.2k) on phones where cells are ~46px wide */}
                          <span className="sm:hidden">
                            {dailyPnL === 0 ? "$0" : fmtPnLCompact(dailyPnL)}
                          </span>
                          {/* Full value on >=sm where there is room */}
                          <span className="hidden sm:inline">
                            {dailyPnL === 0 ? "$0" : fmtPnLFull(dailyPnL)}
                          </span>
                        </div>
                      );
                    })()}

                    {/* Trade count pill (hidden on phones to keep tiny cells legible) */}
                    <span className="hidden sm:inline-block text-[10px] text-gray-500 dark:text-gray-400 bg-white/70 dark:bg-gray-900/50 px-1.5 py-0.5 rounded-full border border-gray-200 dark:border-gray-700">
                      {dayTrades.length} trade
                      {dayTrades.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Calendar Footer with Summary — total trades + best / worst day */}
      <div className="trade-calendar__footer px-4 py-3 border-t border-gray-100 dark:border-gray-700">
        {(() => {
          const monthPrefix = format(currentDate, "yyyy-MM");
          const monthEntries = Object.entries(tradesByDate).filter(([key]) =>
            key.startsWith(monthPrefix),
          );
          const tradeCount = monthEntries.reduce(
            (sum, [, dayTrades]) => sum + dayTrades.length,
            0,
          );
          const dayTotals = monthEntries.map(([, dayTrades]) =>
            dayTrades.reduce((s, t) => s + (parseFloat(t.pnl) || 0), 0),
          );
          const best = dayTotals.length ? Math.max(...dayTotals) : 0;
          const worst = dayTotals.length ? Math.min(...dayTotals) : 0;
          return (
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              <div>
                Total trades this month:{" "}
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  {tradeCount}
                </span>
              </div>
              {dayTotals.length > 0 && (
                <div className="flex items-center gap-3">
                  <span>
                    Best day{" "}
                    <span className="font-semibold text-success-600 dark:text-success-400">
                      {fmtPnLFull(best)}
                    </span>
                  </span>
                  <span className="text-gray-300 dark:text-gray-600">·</span>
                  <span>
                    Worst{" "}
                    <span className="font-semibold text-danger-600 dark:text-danger-400">
                      {fmtPnLFull(worst)}
                    </span>
                  </span>
                </div>
              )}
            </div>
          );
        })()}
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
