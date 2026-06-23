import React, { useState } from "react";
import {
  BarChart3,
  Calendar,
  Layers,
  RefreshCw,
  Download,
} from "lucide-react";
import { useTrades } from "../context/TradeContext";
import PnLOverviewHero from "../components/analytics/PnLOverviewHero";
import PerformanceMetrics from "../components/analytics/PerformanceMetrics";
import StrategyAnalysis from "../components/analytics/StrategyAnalysis";
import TimeAnalysis from "../components/analytics/TimeAnalysis";
import InstrumentAnalysis from "../components/analytics/InstrumentAnalysis";
import DistributionAnalysis from "../components/analytics/DistributionAnalysis";
import DrawdownChart from "../components/analytics/DrawdownChart";
import { exportAnalyticsReport } from "../utils/exportUtils";
import toast from "react-hot-toast";

const TIME_OPTIONS = [
  { value: "all", label: "All Time" },
  { value: "1y", label: "This Year" },
  { value: "90d", label: "Last 90 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "7d", label: "Last 7 Days" },
];

const VIEW_OPTIONS = [
  { value: "overview", label: "Overview" },
  { value: "strategy", label: "By Strategy" },
  { value: "instrument", label: "By Instrument" },
  { value: "time", label: "By Time" },
  { value: "drawdown", label: "Drawdown" },
];

const Analytics = () => {
  const { trades, stats, refreshTrades } = useTrades();
  const [timeRange, setTimeRange] = useState("all");
  const [analysisType, setAnalysisType] = useState("overview");

  const handleExportReport = async () => {
    try {
      await exportAnalyticsReport(trades, stats);
      toast.success("Analytics report exported successfully!");
    } catch (error) {
      toast.error("Failed to export report");
      console.error("Export error:", error);
    }
  };

  const handleRefresh = async () => {
    try {
      await refreshTrades();
      toast.success("Analytics refreshed");
    } catch (error) {
      toast.error("Failed to refresh");
      console.error("Refresh error:", error);
    }
  };

  const getFilteredTradesByTime = () => {
    if (timeRange === "all") return trades;

    const now = new Date();
    let startDate;

    switch (timeRange) {
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "1y":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        return trades;
    }

    return trades.filter((trade) => new Date(trade.entryDate) >= startDate);
  };

  const timeFilteredTrades = getFilteredTradesByTime();
  const timeLabel =
    TIME_OPTIONS.find((o) => o.value === timeRange)?.label || "All Time";

  return (
    <div className="space-y-[18px]">
      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Time range */}
        <label className="relative inline-flex items-center">
          <span className="absolute left-3 text-gray-500 dark:text-gray-400 pointer-events-none flex">
            <Calendar className="w-4 h-4" />
          </span>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            data-testid="analytics-timerange-select"
            className="appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm font-semibold pl-10 pr-9 py-2.5 rounded-lg cursor-pointer outline-none focus:border-primary-500"
          >
            {TIME_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <span className="absolute right-3 text-gray-400 pointer-events-none text-[11px]">
            ▼
          </span>
        </label>

        {/* View */}
        <label className="relative inline-flex items-center">
          <span className="absolute left-3 text-gray-500 dark:text-gray-400 pointer-events-none flex">
            <Layers className="w-4 h-4" />
          </span>
          <select
            value={analysisType}
            onChange={(e) => setAnalysisType(e.target.value)}
            data-testid="analytics-view-select"
            className="appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm font-semibold pl-10 pr-9 py-2.5 rounded-lg cursor-pointer outline-none focus:border-primary-500"
          >
            {VIEW_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <span className="absolute right-3 text-gray-400 pointer-events-none text-[11px]">
            ▼
          </span>
        </label>

        <div className="flex-1" />

        {/* Trades analyzed pill */}
        <div className="flex items-center gap-2 bg-primary-50 dark:bg-primary-900/20 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-lg">
          <Layers className="w-4 h-4 text-primary-600 dark:text-primary-400" />
          <span className="text-[12.5px] font-semibold font-mono text-gray-900 dark:text-gray-100">
            {timeFilteredTrades.length} trades
          </span>
          <span className="text-[12.5px] text-gray-500 dark:text-gray-400">
            analyzed
          </span>
        </div>

        {/* Export */}
        <button
          onClick={handleExportReport}
          title="Export report"
          data-testid="analytics-export-btn"
          className="w-[38px] h-[38px] rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 grid place-items-center cursor-pointer hover:text-gray-900 dark:hover:text-gray-100 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
        >
          <Download className="w-[15px] h-[15px]" />
        </button>

        {/* Refresh */}
        <button
          onClick={handleRefresh}
          title="Refresh"
          data-testid="analytics-refresh-btn"
          className="w-[38px] h-[38px] rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 grid place-items-center cursor-pointer hover:text-gray-900 dark:hover:text-gray-100 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
        >
          <RefreshCw className="w-[15px] h-[15px]" />
        </button>
      </div>

      {/* Overview — matches the mockup layout */}
      {analysisType === "overview" && (
        <div className="space-y-[18px]">
          <PnLOverviewHero trades={timeFilteredTrades} timeLabel={timeLabel} />
          <PerformanceMetrics trades={timeFilteredTrades} />
          <DistributionAnalysis trades={timeFilteredTrades} />
        </div>
      )}

      {analysisType === "strategy" && (
        <StrategyAnalysis trades={timeFilteredTrades} detailed={true} />
      )}

      {analysisType === "time" && (
        <TimeAnalysis trades={timeFilteredTrades} detailed={true} />
      )}

      {analysisType === "instrument" && (
        <InstrumentAnalysis trades={timeFilteredTrades} detailed={true} />
      )}

      {analysisType === "drawdown" && (
        <DrawdownChart trades={timeFilteredTrades} />
      )}

      {timeFilteredTrades.length === 0 && analysisType !== "overview" && (
        <div className="card text-center py-16" data-testid="analytics-empty-state">
          <div className="max-w-md mx-auto">
            <BarChart3 className="w-24 h-24 text-gray-300 dark:text-gray-600 mx-auto mb-6" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
              No Trading Data Available
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              No trades found for the selected time period. Start trading or
              adjust your filters to view analytics.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
