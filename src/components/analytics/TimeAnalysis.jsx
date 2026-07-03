import React, { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  LabelList,
} from "recharts";
import { format, getHours, getDay } from "date-fns";
import { Clock, TrendingUp, Lightbulb, Info } from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";
import { getChartColors } from "../../utils/chartColors";

// Full-precision currency, matching PerformanceMetrics / PnLOverviewHero.
const formatMoney = (value, decimals = 2) => {
  const sign = value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
};

// Compact axis labels that keep small, real values legible (no "$0k" collapse).
const formatK = (value) => {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1000) {
    const k = abs / 1000;
    return `${sign}$${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
  }
  return `${sign}$${abs.toLocaleString()}`;
};

// Small "ⓘ" affordance next to a chart title; reveals the explanatory text on
// hover/focus so it no longer overflows the bottom of the card.
const InfoTip = ({ text, testId }) => (
  <span className="relative inline-flex group">
    <button
      type="button"
      data-testid={testId}
      aria-label="Chart explanation"
      className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
    >
      <Info className="w-3.5 h-3.5" />
    </button>
    <span
      role="tooltip"
      className="pointer-events-none absolute left-0 top-full z-20 mt-2 w-64 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-[11px] leading-snug text-gray-500 dark:text-gray-400 shadow-lg opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
    >
      {text}
    </span>
  </span>
);

const slug = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const SectionHeader = ({ icon: Icon, tone, title, subtitle, info, right }) => {
  const toneClasses = {
    pos: "bg-success-50 dark:bg-success-900/20 text-success-600 dark:text-success-400",
    neg: "bg-danger-50 dark:bg-danger-900/20 text-danger-600 dark:text-danger-400",
    neutral:
      "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400",
  };
  return (
    <div className="flex items-start justify-between mb-5">
      <div className="flex items-center gap-3">
        <div
          className={`w-9 h-9 rounded-lg grid place-items-center ${toneClasses[tone]}`}
        >
          <Icon className="w-[18px] h-[18px]" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-[15px] font-bold text-gray-900 dark:text-gray-100">
              {title}
            </span>
            {info && <InfoTip text={info} testId={`${slug(title)}-info-btn`} />}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {subtitle}
          </div>
        </div>
      </div>
      {right}
    </div>
  );
};

// The hover banner. Rendered as our own overlay (not Recharts' Tooltip) so it
// only appears when the cursor is actually over the candle, not anywhere in the
// category column.
const TooltipBox = ({ data }) => (
  <div className="bg-white dark:bg-gray-800 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg whitespace-nowrap">
    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1.5">
      {data.displayHour ?? data.displayMonth ?? data.name}
    </p>
    <div className="space-y-1">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Total P&L:
        <span
          className={`ml-1 font-mono font-semibold ${
            data.totalPnL >= 0
              ? "text-success-600 dark:text-success-400"
              : "text-danger-600 dark:text-danger-400"
          }`}
        >
          {formatMoney(data.totalPnL)}
        </span>
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Trades:
        <span className="ml-1 font-mono font-semibold text-gray-900 dark:text-gray-100">
          {data.totalTrades}
        </span>
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Win Rate:
        <span className="ml-1 font-mono font-semibold text-gray-900 dark:text-gray-100">
          {data.winRate.toFixed(1)}%
        </span>
      </p>
    </div>
  </div>
);

// Absolutely-positioned highlight + banner for the hovered candle. The banner
// is always pinned a few px above the candle's top tip (above the zero line for
// loss candles, so it never overlaps the axis labels below).
const ChartTooltipOverlay = ({ hovered }) => (
  <>
    <div
      className="pointer-events-none absolute z-0 rounded bg-gray-400/10"
      style={{
        left: hovered.rectX - 6,
        top: hovered.rectTop - 6,
        width: hovered.rectW + 12,
        height: hovered.rectH + 12,
      }}
    />
    <div
      className="pointer-events-none absolute z-10 [transform:translate(-50%,calc(-100%_-_14px))]"
      style={{ left: hovered.cx, top: hovered.rectTop }}
    >
      <TooltipBox data={hovered.data} />
    </div>
  </>
);

// Floating value label a few px outside each bar's tip (above for gains,
// below for losses) so the number never overlaps the bar.
const ValueLabel = ({ x, y, width, height, value, pos, neg }) => {
  if (!value) return null;
  const cx = x + width / 2;
  const positive = value >= 0;
  // Recharts gives negative bars a negative height, so derive the bar's edges
  // defensively and place the label just outside the candle's outer tip.
  const topEdge = Math.min(y, y + height);
  const bottomEdge = Math.max(y, y + height);
  const ly = positive ? topEdge - 6 : bottomEdge + 16;
  return (
    <text
      x={cx}
      y={ly}
      textAnchor="middle"
      fontSize={11}
      fontWeight={600}
      fontFamily="monospace"
      fill={positive ? pos : neg}
    >
      {formatK(value)}
    </text>
  );
};

const TimeAnalysis = ({ trades = [], detailed = false }) => {
  const { isDark } = useTheme();
  // Shared visual language with the Overview (PnLOverviewHero / DistributionAnalysis).
  const c = getChartColors(isDark);
  // Hovered candle (per chart). Captured from the Bar's own mouse events, which
  // fire only over the actual rectangle — so the banner never shows when the
  // cursor is in the empty part of a column.
  const [hovered, setHovered] = useState(null);
  const makeHoverHandler = (chart) => (d) => {
    if (typeof d?.y !== "number") return;
    const rectTop = Math.min(d.y, d.y + d.height);
    setHovered({
      chart,
      cx: d.x + d.width / 2,
      rectTop,
      rectX: d.x,
      rectW: d.width,
      rectH: Math.abs(d.height),
      data: d.payload,
    });
  };
  const clearHover = () => setHovered(null);

  const completedTrades = useMemo(
    () => trades.filter((trade) => trade.status === "closed"),
    [trades]
  );

  const hourlyData = useMemo(() => {
    const hourlyStats = {};
    for (let hour = 0; hour < 24; hour++) {
      hourlyStats[hour] = {
        hour,
        displayHour: `${hour.toString().padStart(2, "0")}:00`,
        totalTrades: 0,
        wins: 0,
        totalPnL: 0,
        winRate: 0,
      };
    }

    completedTrades.forEach((trade) => {
      // Hour is derived from the entry timestamp — trades have no separate
      // entryTime field, so use the entry_date (TIMESTAMPTZ) instead.
      const date = new Date(trade.entryDate);
      if (isNaN(date)) return;
      const hour = getHours(date);
      const stat = hourlyStats[hour];
      stat.totalTrades++;
      stat.totalPnL += trade.pnl || 0;
      if ((trade.pnl || 0) > 0) stat.wins++;
      stat.winRate =
        stat.totalTrades > 0 ? (stat.wins / stat.totalTrades) * 100 : 0;
    });

    return Object.values(hourlyStats).filter((stat) => stat.totalTrades > 0);
  }, [completedTrades]);

  const dailyData = useMemo(() => {
    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const dayStats = dayNames.map((name, index) => ({
      day: index,
      name,
      totalTrades: 0,
      wins: 0,
      totalPnL: 0,
      winRate: 0,
    }));

    completedTrades.forEach((trade) => {
      const date = new Date(trade.entryDate);
      if (isNaN(date)) return;
      const stat = dayStats[getDay(date)];
      stat.totalTrades++;
      stat.totalPnL += trade.pnl || 0;
      if ((trade.pnl || 0) > 0) stat.wins++;
      stat.winRate =
        stat.totalTrades > 0 ? (stat.wins / stat.totalTrades) * 100 : 0;
    });

    return dayStats.filter((stat) => stat.totalTrades > 0);
  }, [completedTrades]);

  const monthlyData = useMemo(() => {
    const monthlyStats = {};
    completedTrades.forEach((trade) => {
      const date = new Date(trade.entryDate);
      if (isNaN(date)) return;
      const monthKey = format(date, "yyyy-MM");

      if (!monthlyStats[monthKey]) {
        monthlyStats[monthKey] = {
          month: monthKey,
          displayMonth: format(date, "MMM yyyy"),
          totalTrades: 0,
          wins: 0,
          totalPnL: 0,
          winRate: 0,
        };
      }

      const stat = monthlyStats[monthKey];
      stat.totalTrades++;
      stat.totalPnL += trade.pnl || 0;
      if ((trade.pnl || 0) > 0) stat.wins++;
      stat.winRate =
        stat.totalTrades > 0 ? (stat.wins / stat.totalTrades) * 100 : 0;
    });

    return Object.values(monthlyStats).sort((a, b) =>
      a.month.localeCompare(b.month)
    );
  }, [completedTrades]);

  if (completedTrades.length === 0) {
    return (
      <div className="card text-center py-12" data-testid="time-empty-state">
        <Clock className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          No time data available
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Close some trades to see how your performance varies by time.
        </p>
      </div>
    );
  }

  const topHours = [...hourlyData]
    .sort((a, b) => b.totalPnL - a.totalPnL)
    .slice(0, 3);
  const topDays = [...dailyData]
    .sort((a, b) => b.totalPnL - a.totalPnL)
    .slice(0, 3);

  const mostActiveDay = dailyData.reduce(
    (max, day) => (day.totalTrades > max.totalTrades ? day : max),
    { totalTrades: 0, name: "None" }
  );
  const mostProfitableDay = dailyData.reduce(
    (max, day) => (day.totalPnL > max.totalPnL ? day : max),
    { totalPnL: -Infinity, name: "None" }
  );
  const mostActiveHour = hourlyData.reduce(
    (max, hour) => (hour.totalTrades > max.totalTrades ? hour : max),
    { totalTrades: 0, displayHour: "None" }
  );
  const mostProfitableHour = hourlyData.reduce(
    (max, hour) => (hour.totalPnL > max.totalPnL ? hour : max),
    { totalPnL: -Infinity, displayHour: "None" }
  );

  return (
    <div className="space-y-4" data-testid="time-analysis">
      {/* Hourly & monthly performance, side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Hourly Analysis */}
        {hourlyData.length > 0 && (
        <section className="card" data-testid="time-hourly-chart">
          <SectionHeader
            icon={Clock}
            tone="neutral"
            title="Hourly Performance Analysis"
            subtitle="Net P&L by entry hour of day"
            info="Bars above $0 are net-profitable hours; bars below are net losers. Hover any bar for trade count and win rate."
            right={
              <span className="text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 px-2.5 py-1 rounded-full whitespace-nowrap">
                {hourlyData.length} active{" "}
                {hourlyData.length === 1 ? "hour" : "hours"}
              </span>
            }
          />
          <div className="h-64 relative">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={hourlyData}
                barCategoryGap="15%"
                margin={{ top: 24, right: 16, left: 8, bottom: 28 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={c.grid}
                  vertical={false}
                />
                <XAxis
                  dataKey="displayHour"
                  stroke={c.axis}
                  fontSize={11}
                  axisLine={false}
                  tickLine={false}
                  tickMargin={12}
                  tick={{ fill: c.tick, fontFamily: "monospace" }}
                />
                <YAxis
                  stroke={c.axis}
                  fontSize={11}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => formatK(value)}
                  tick={{ fill: c.tick, fontFamily: "monospace" }}
                  width={56}
                />
                <ReferenceLine y={0} stroke={c.zeroLine} strokeWidth={1} />
                <Bar
                  dataKey="totalPnL"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={24}
                  onMouseEnter={makeHoverHandler("hourly")}
                  onMouseLeave={clearHover}
                >
                  {hourlyData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.totalPnL >= 0 ? c.pos : c.neg}
                      fillOpacity={0.85}
                    />
                  ))}
                  <LabelList dataKey="totalPnL" content={<ValueLabel pos={c.pos} neg={c.neg} />} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {hovered?.chart === "hourly" && (
              <ChartTooltipOverlay hovered={hovered} />
            )}
          </div>
        </section>
        )}

        {/* Monthly Analysis */}
        {detailed && monthlyData.length > 0 && (
          <section className="card" data-testid="time-monthly-chart">
              <SectionHeader
                icon={TrendingUp}
                tone="neutral"
                title="Monthly Performance Trends"
                subtitle="How your realised P&L evolves month over month"
                right={
                  <span className="text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 px-2.5 py-1 rounded-full whitespace-nowrap">
                    {monthlyData.length}{" "}
                    {monthlyData.length === 1 ? "month" : "months"}
                  </span>
                }
              />
              <div className="h-64 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthlyData}
                    barCategoryGap="22%"
                    margin={{ top: 24, right: 16, left: 8, bottom: 60 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={c.grid}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="displayMonth"
                      stroke={c.axis}
                      fontSize={11}
                      axisLine={false}
                      tickLine={false}
                      angle={-40}
                      textAnchor="end"
                      interval={0}
                      tickMargin={12}
                      tick={{ fill: c.tick }}
                    />
                    <YAxis
                      stroke={c.axis}
                      fontSize={11}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => formatK(value)}
                      tick={{ fill: c.tick, fontFamily: "monospace" }}
                      width={56}
                    />
                    <ReferenceLine y={0} stroke={c.zeroLine} strokeWidth={1} />
                    <Bar
                      dataKey="totalPnL"
                      radius={[5, 5, 0, 0]}
                      maxBarSize={40}
                      onMouseEnter={makeHoverHandler("monthly")}
                      onMouseLeave={clearHover}
                    >
                      {monthlyData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.totalPnL >= 0 ? c.pos : c.neg}
                          fillOpacity={0.85}
                        />
                      ))}
                      <LabelList dataKey="totalPnL" content={<ValueLabel pos={c.pos} neg={c.neg} />} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                {hovered?.chart === "monthly" && (
                  <ChartTooltipOverlay hovered={hovered} />
                )}
              </div>
            </section>
        )}
      </div>

      {detailed && (
        <>
          {/* Time Insights */}
          <section className="card" data-testid="time-insights">
            <SectionHeader
              icon={Lightbulb}
              tone="pos"
              title="Time-Based Trading Insights"
              subtitle="Key findings from your time-based trading patterns"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Best Trading Hours */}
              {topHours.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
                    Best Trading Hours
                  </h4>
                  <div className="space-y-2">
                    {topHours.map((hour, index) => (
                      <div
                        key={hour.hour}
                        className="flex items-center justify-between p-2.5 bg-success-50 dark:bg-success-900/20 rounded-lg"
                      >
                        <span className="text-sm font-medium text-success-700 dark:text-success-400 font-mono">
                          #{index + 1} {hour.displayHour}
                        </span>
                        <div className="text-right">
                          <div className="text-sm font-mono font-semibold text-success-800 dark:text-success-300">
                            {formatMoney(hour.totalPnL)}
                          </div>
                          <div className="text-xs text-success-600 dark:text-success-500 font-mono">
                            {hour.totalTrades} trades, {hour.winRate.toFixed(1)}%
                            win
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Best Trading Days */}
              {topDays.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
                    Best Trading Days
                  </h4>
                  <div className="space-y-2">
                    {topDays.map((day, index) => (
                      <div
                        key={day.day}
                        className="flex items-center justify-between p-2.5 bg-primary-50 dark:bg-primary-900/20 rounded-lg"
                      >
                        <span className="text-sm font-medium text-primary-700 dark:text-primary-400">
                          #{index + 1} {day.name}
                        </span>
                        <div className="text-right">
                          <div className="text-sm font-mono font-semibold text-primary-800 dark:text-primary-300">
                            {formatMoney(day.totalPnL)}
                          </div>
                          <div className="text-xs text-primary-600 dark:text-primary-500 font-mono">
                            {day.totalTrades} trades, {day.winRate.toFixed(1)}%
                            win
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Trading Patterns */}
            <div className="mt-5 p-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-lg">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
                Trading Patterns
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600 dark:text-gray-400">
                <div>
                  <strong className="text-gray-900 dark:text-gray-100">
                    Most Active Day:
                  </strong>{" "}
                  {mostActiveDay.name}
                </div>
                <div>
                  <strong className="text-gray-900 dark:text-gray-100">
                    Most Profitable Day:
                  </strong>{" "}
                  {mostProfitableDay.name}
                </div>
                {hourlyData.length > 0 && (
                  <>
                    <div>
                      <strong className="text-gray-900 dark:text-gray-100">
                        Most Active Hour:
                      </strong>{" "}
                      <span className="font-mono">
                        {mostActiveHour.displayHour}
                      </span>
                    </div>
                    <div>
                      <strong className="text-gray-900 dark:text-gray-100">
                        Most Profitable Hour:
                      </strong>{" "}
                      <span className="font-mono">
                        {mostProfitableHour.displayHour}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default TimeAnalysis;
