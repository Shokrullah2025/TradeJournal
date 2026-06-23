import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  BarChart3,
  Calendar,
  Award,
  AlertCircle,
} from "lucide-react";

const CUMULATIVE_RANGE_OPTIONS = [
  { value: 30, label: "30D" },
  { value: 60, label: "60D" },
  { value: 365, label: "1Y" },
];

const fmtK = (v) => {
  const s = v >= 0 ? '+' : '';
  if (Math.abs(v) >= 1000)
    return `${s}${(v / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return `${s}${Math.round(v)}`;
};
import { useTrades } from "../context/TradeContext";
import { useAuth } from "../context/AuthContext";
import StatsCard from "../components/dashboard/StatsCard";
import RecentTrades from "../components/dashboard/RecentTrades";
import PnLChart from "../components/dashboard/PnLChart_simple";
import CumulativePnLChart from "../components/dashboard/CumulativePnLChart";
import WhenYouWinChart from "../components/dashboard/WhenYouWinChart";
import PreMarketBriefing from "../components/dashboard/PreMarketBriefing";
import TradeScatterChart from "../components/dashboard/TradeScatterChart";
import AIInsights from "../components/dashboard/AIInsights";
import { MiniLineChart, MiniBarChart, MiniDonutChart, MiniAreaChart, MiniRiskRewardChart, MiniDrawdownChart } from "../components/dashboard/MiniCharts";

const Dashboard = () => {
  const { trades, stats } = useTrades();
  const { user } = useAuth();
  const [cumulativeRange, setCumulativeRange] = useState(60);

  // Pre-aggregate cumulative data so CumulativePnLChart receives clean arrays
  // rather than raw trades — this keeps the chart component stateless and testable.
  const { cumData, cumDates, sessionCount } = useMemo(() => {
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - cumulativeRange);

    const byDate = {};
    (trades || [])
      .filter((t) => t && t.status === 'closed')
      .forEach((trade) => {
        const raw =
          trade.exitDate ||
          trade.exit_date ||
          trade.createdAt ||
          trade.created_at;
        if (!raw) return;
        const parsed = new Date(raw);
        if (isNaN(parsed.getTime()) || parsed < cutoff) return;
        const key = parsed.toISOString().split('T')[0];
        byDate[key] = (byDate[key] || 0) + (trade.pnl || 0);
      });

    const sorted = Object.entries(byDate).sort(([a], [b]) =>
      a.localeCompare(b)
    );
    const sessionCount = sorted.length;
    let cum = 0;
    const cumData  = [];
    const cumDates = [];
    sorted.forEach(([date, daily]) => {
      cum += daily;
      cumData.push(cum);
      // Noon UTC avoids timezone-boundary issues when constructing from date string
      cumDates.push(new Date(`${date}T12:00:00Z`));
    });
    // Prepend a zero baseline so the line always starts at the zero axis
    if (cumData.length > 0) {
      const anchor = new Date(cumDates[0]);
      anchor.setDate(anchor.getDate() - 1);
      cumData.unshift(0);
      cumDates.unshift(anchor);
    }
    return { cumData, cumDates, sessionCount };
  }, [trades, cumulativeRange]);

  // Recent = most recent by entry date, matching the order the Trades page and
  // the DB use (entry_date desc). Sort a copy — never mutate the context array.
  const recentTrades = useMemo(
    () =>
      [...trades]
        .sort(
          (a, b) =>
            new Date(b.entryDate || b.entry_date || 0) -
            new Date(a.entryDate || a.entry_date || 0),
        )
        .slice(0, 4),
    [trades],
  );

  const statsCards = [
    {
      title: "Total P&L",
      value: `$${stats.totalPnL.toLocaleString()}`,
      change: stats.totalPnL >= 0 ? "+12.5%" : "-3.2%",
      changeType: stats.totalPnL >= 0 ? "positive" : "negative",
      icon: DollarSign,
      color: stats.totalPnL >= 0 ? "success" : "danger",
    },
    {
      title: "Win Rate",
      value: `${stats.winRate}%`,
      change: "+2.1%",
      changeType: "positive",
      icon: Target,
      color: stats.winRate >= 60 ? "success" : stats.winRate >= 50 ? "primary" : "danger",
    },
    {
      title: "Max Drawdown",
      value: `$${stats.maxDrawdown.toLocaleString()}`,
      change: stats.maxDrawdown < 1000 ? "-200" : "+150",
      changeType: stats.maxDrawdown < 1000 ? "positive" : "negative",
      icon: AlertCircle,
      color: stats.maxDrawdown < 1000 ? "success" : stats.maxDrawdown < 2000 ? "warning" : "danger",
    },
    {
      title: "Avg Win/Loss",
      value: stats.avgWin > 0 && stats.avgLoss > 0 ? `${(stats.avgWin / stats.avgLoss).toFixed(1)}:1` : "N/A",
      change: stats.avgWin > stats.avgLoss ? "+0.2" : "-0.1",
      changeType: stats.avgWin > stats.avgLoss ? "positive" : "negative",
      icon: Award,
      color: stats.avgWin > stats.avgLoss * 1.5 ? "success" : stats.avgWin > stats.avgLoss ? "primary" : "danger",
    },
  ];

  return (
    <div className="dashboard space-y-6">
      {/* Header */}
      <div className="dashboard__header flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track your trading performance and insights
          </p>
        </div>

        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
            <Calendar className="w-4 h-4" />
            <span>Last updated: {new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Pre-Market Briefing — daily personalized edge summary, dismissible */}
      <PreMarketBriefing trades={trades} user={user} />

      {/* Stats Cards with Mini Charts */}
      <div className="dashboard__stats grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((card, index) => {
          // Generate meaningful data for mini charts based on real trades
          let miniChart = null;

          if (card.title === "Total P&L" && trades.length > 0) {
            // Show last 15 trading days P&L trend
            const dailyPnL = {};
            trades.filter(t => t.status === 'closed').forEach(trade => {
              const rawDate = trade.exitDate || trade.exit_date || trade.createdAt || trade.created_at;
              if (!rawDate) return;
              const parsed = new Date(rawDate);
              if (isNaN(parsed.getTime())) return;
              const date = parsed.toISOString().split('T')[0];
              dailyPnL[date] = (dailyPnL[date] || 0) + (trade.pnl || 0);
            });

            const sortedData = Object.values(dailyPnL).slice(-15);
            if (sortedData.length > 0) {
              // Convert to cumulative for area chart
              let cumulative = 0;
              const cumulativeData = sortedData.map(val => cumulative += val);
              miniChart = <MiniAreaChart
                data={cumulativeData}
                color="green"
                positive={stats.totalPnL >= 0}
              />;
            }
          } else if (card.title === "Win Rate") {
            const percentage = parseFloat(card.value.replace('%', ''));
            miniChart = <MiniDonutChart percentage={percentage} color="blue" />;

          } else if (card.title === "Max Drawdown" && trades.length > 0) {
            // Show drawdown progression over time
            const closedTrades = trades.filter(t => t.status === 'closed')
              .sort((a, b) => {
                const dateA = new Date(a.exitDate || a.exit_date || a.createdAt || a.created_at || 0);
                const dateB = new Date(b.exitDate || b.exit_date || b.createdAt || b.created_at || 0);
                return dateA - dateB;
              });

            if (closedTrades.length > 0) {
              let runningPnL = 0;
              let peak = 0;
              const drawdownData = [];

              closedTrades.forEach(trade => {
                runningPnL += trade.pnl || 0;
                if (runningPnL > peak) peak = runningPnL;
                const drawdown = -(peak - runningPnL); // Negative for underwater curve
                drawdownData.push(drawdown);
              });

              miniChart = <MiniDrawdownChart drawdownData={drawdownData.slice(-15)} color="red" />;
            }

          } else if (card.title === "Avg Win/Loss" && stats.avgWin > 0 && stats.avgLoss > 0) {
            // Show win vs loss amounts comparison
            miniChart = <MiniRiskRewardChart
              winAmount={stats.avgWin}
              lossAmount={stats.avgLoss}
              color="blue"
            />;
          }

          return <StatsCard key={index} {...card} miniChart={miniChart} />;
        })}
      </div>

      {/* Charts Section - 3 columns, each 1/3 width */}
      <div className="dashboard__charts grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* P&L Distribution Chart */}
        <div className="card !pt-3 !pr-2.5 !pb-2 !pl-2 flex flex-col h-[340px]">
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Daily P&L
            </h3>
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <div className="w-3 h-3 bg-success-500 rounded-full"></div>
              <span>Wins</span>
              <div className="w-3 h-3 bg-danger-500 rounded-full"></div>
              <span>Losses</span>
            </div>
          </div>
          <PnLChart trades={trades} />
        </div>

        {/* Cumulative P&L Chart */}
        <div className="card !pt-3 !px-3 !pb-2 flex flex-col h-[340px]">
          {/* Single header row: title + total + session count + period tabs */}
          <div className="flex items-center justify-between mb-2 gap-2">
            <div
              className="flex items-baseline gap-2 min-w-0"
              data-testid="cumulative-pnl-chart-caption-row"
            >
              <span
                className="font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap"
                style={{ fontSize: 14 }}
              >
                Cumulative P&L
              </span>
              <span
                className={`font-semibold whitespace-nowrap ${
                  (cumData[cumData.length - 1] ?? 0) >= 0
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
                style={{ fontSize: 12 }}
                data-testid="cumulative-pnl-chart-caption-total-value"
              >
                {fmtK(cumData[cumData.length - 1] ?? 0)}
              </span>
              <span
                className="text-[11px] text-gray-500 dark:text-gray-400 whitespace-nowrap"
                data-testid="cumulative-pnl-chart-caption-count"
              >
                {sessionCount} sessions
              </span>
            </div>
            <div
              className="flex gap-0.5 rounded-md bg-gray-100 dark:bg-gray-800 p-0.5"
              data-testid="cumulative-pnl-range-toggle"
            >
              {CUMULATIVE_RANGE_OPTIONS.map(({ value, label }) => {
                const active = cumulativeRange === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setCumulativeRange(value)}
                    data-testid={`cumulative-pnl-range-${label}-btn`}
                    className={
                      active
                        ? "text-[10px] font-medium px-2 py-0.5 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm transition-colors"
                        : "text-[10px] font-medium px-2 py-0.5 rounded text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                    }
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          <CumulativePnLChart data={cumData} dates={cumDates} />
        </div>

        {/* When You Win — heatmap of avg P&L by day of week × trading hour */}
        <div className="card !pt-3 !pr-2 !pb-2 !pl-2 flex flex-col h-[340px]">
          <div className="flex items-center justify-between mb-1 px-1">
            <div className="flex items-center gap-1.5">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                When You Win
              </h3>
              <div className="relative group">
                <svg
                  className="w-3.5 h-3.5 text-gray-400 cursor-help flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 text-xs text-white bg-gray-800 dark:bg-gray-700 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-10">
                  Avg P&amp;L by session hour &amp; day of week
                </div>
              </div>
            </div>
            <div
              className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0"
              data-testid="when-you-win-trade-count"
            >
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {trades.filter((t) => t && t.status === "closed").length}
              </span>{" "}
              trades
            </div>
          </div>
          <WhenYouWinChart trades={trades} />
        </div>
      </div>

      {/* Recent Activity and Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex">
          <RecentTrades trades={recentTrades} />
        </div>

        <div className="space-y-6">
          {/* Trade Outcomes scatter — one dot per closed trade */}
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Trade Outcomes
              </h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                1 dot = 1 trade
              </span>
            </div>
            <TradeScatterChart trades={trades} />
          </div>

          {/* Trading Insights — real AI feedback generated from the user's stats */}
          <AIInsights trades={trades} stats={stats} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
