import React, { useState } from "react";
import {
  BarChart3,
  TrendingUp,
  Calendar,
  Filter,
  Download,
} from "lucide-react";
import { useTrades } from "../context/TradeContext";
import PerformanceMetrics from "../components/analytics/PerformanceMetrics";
import StrategyAnalysis from "../components/analytics/StrategyAnalysis";
import TimeAnalysis from "../components/analytics/TimeAnalysis";
import InstrumentAnalysis from "../components/analytics/InstrumentAnalysis";
import DrawdownChart from "../components/analytics/DrawdownChart";
import { exportAnalyticsReport } from "../utils/exportUtils";
import toast from "react-hot-toast";

const Analytics = () => {
  const { filteredTrades, trades, stats } = useTrades();
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Analytics Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Deep dive into your trading performance and patterns
          </p>
        </div>

        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <button
            onClick={handleExportReport}
            className="btn btn-secondary flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="all">All Time</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
                <option value="1y">Last Year</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <select
                value={analysisType}
                onChange={(e) => setAnalysisType(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="overview">Overview</option>
                <option value="strategy">Strategy Analysis</option>
                <option value="time">Time Analysis</option>
                <option value="instrument">Instrument Analysis</option>
                <option value="drawdown">Drawdown Analysis</option>
              </select>
            </div>
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-400">
            Analyzing {timeFilteredTrades.length} trades
          </div>
        </div>
      </div>

      {/* Analytics Content */}
      {analysisType === "overview" && (
        <div className="space-y-6">
          <PerformanceMetrics trades={timeFilteredTrades} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <StrategyAnalysis trades={timeFilteredTrades} />
            <InstrumentAnalysis trades={timeFilteredTrades} />
          </div>

          <TimeAnalysis trades={timeFilteredTrades} />
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

      {timeFilteredTrades.length === 0 && (
        <div className="card">
          <div className="text-center py-12">
            <BarChart3 className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No Data Available
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              No trades found for the selected time period. Try adjusting your
              filters or add some trades.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
