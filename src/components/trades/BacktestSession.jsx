import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  DollarSign,
  ChevronLeft,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  Target,
  RefreshCcw,
  Activity,
  Layers,
  Download,
  FileText,
  BarChart4,
  Play,
  Info,
} from "lucide-react";
import { useBacktest } from "../../context/BacktestContext";
import BacktestChart from "./BacktestChart";
import { format } from "date-fns";
import toast from "react-hot-toast";

const BacktestSession = ({ sessionId, onBack }) => {
  const { getSession, runSimulation, updateSession, isSimulating } =
    useBacktest();
  const [session, setSession] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Check if dark mode is active
  useEffect(() => {
    setIsDarkMode(document.documentElement.classList.contains("dark"));

    // Listen for theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "class") {
          setIsDarkMode(document.documentElement.classList.contains("dark"));
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });

    return () => observer.disconnect();
  }, []);

  // Get session data
  useEffect(() => {
    const sessionData = getSession(sessionId);
    setSession(sessionData);
  }, [sessionId, getSession]);

  // Handle running/re-running the simulation
  const handleRunSimulation = async () => {
    try {
      toast.promise(runSimulation(sessionId), {
        loading: "Running simulation...",
        success: (updatedSession) => {
          setSession(updatedSession);
          return "Simulation completed successfully!";
        },
        error: "Failed to run simulation",
      });
    } catch (error) {
      console.error("Failed to run simulation:", error);
    }
  };

  // Generate mock candle data for the chart based on session data
  const generateMockCandleData = () => {
    if (!session || !session.trades || session.trades.length === 0) return [];

    // Get date range from session
    const startDate = new Date(session.dateRange.start);
    const endDate = new Date(session.dateRange.end);
    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

    // Generate candles (one per day)
    const candles = [];
    const initialPrice = 100; // Starting price
    let currentPrice = initialPrice;

    for (let i = 0; i <= daysDiff; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);

      // Generate random price movement
      const changePercent = (Math.random() * 2 - 1) * 1.5; // -1.5% to +1.5%
      const open = currentPrice;
      const close = open * (1 + changePercent / 100);
      const high = Math.max(open, close) * (1 + (Math.random() * 0.5) / 100);
      const low = Math.min(open, close) * (1 - (Math.random() * 0.5) / 100);

      candles.push({
        time: Math.floor(currentDate.getTime() / 1000), // Lightweight charts uses seconds
        open,
        high,
        low,
        close,
      });

      currentPrice = close;
    }

    return candles;
  };

  if (!session) {
    return (
      <div className="p-6 text-center">
        <div className="animate-pulse">Loading session data...</div>
      </div>
    );
  }

  // Prepare data for charts
  const candleData = generateMockCandleData();
  const { trades, metrics } = session;

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <button
            onClick={onBack}
            className="btn btn-icon btn-sm btn-ghost rounded-full"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {session.name}
          </h2>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              session.status === "completed"
                ? "bg-success-100 dark:bg-success-900/30 text-success-800 dark:text-success-300"
                : session.status === "running"
                ? "bg-warning-100 dark:bg-warning-900/30 text-warning-800 dark:text-warning-300"
                : session.status === "failed"
                ? "bg-danger-100 dark:bg-danger-900/30 text-danger-800 dark:text-danger-300"
                : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300"
            }`}
          >
            {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
            <Calendar className="w-4 h-4 mr-1" />
            <span>
              {format(new Date(session.dateRange.start), "MMM d, yyyy")} -
              {format(new Date(session.dateRange.end), "MMM d, yyyy")}
            </span>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            <span>
              Created: {format(new Date(session.createdAt), "MMM d, yyyy")}
            </span>
          </div>
        </div>
      </div>

      {/* Session Stats Summary */}
      {session.status === "completed" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-4 bg-success-50 dark:bg-success-900/10 border-success-200 dark:border-success-800">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total P&L
              </span>
              <DollarSign className="w-5 h-5 text-success-600 dark:text-success-400" />
            </div>
            <div className="text-2xl font-bold text-success-700 dark:text-success-300">
              ${metrics.totalPnL.toLocaleString()}
            </div>
            <div className="text-xs text-success-600 dark:text-success-500 mt-1">
              {trades.length} trades over{" "}
              {session.dateRange.duration || "period"}
            </div>
          </div>

          <div
            className={`card p-4 ${
              metrics.winRate >= 55
                ? "bg-success-50 dark:bg-success-900/10 border-success-200 dark:border-success-800"
                : metrics.winRate >= 45
                ? "bg-warning-50 dark:bg-warning-900/10 border-warning-200 dark:border-warning-800"
                : "bg-danger-50 dark:bg-danger-900/10 border-danger-200 dark:border-danger-800"
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Win Rate
              </span>
              <Target
                className={`w-5 h-5 ${
                  metrics.winRate >= 55
                    ? "text-success-600 dark:text-success-400"
                    : metrics.winRate >= 45
                    ? "text-warning-600 dark:text-warning-400"
                    : "text-danger-600 dark:text-danger-400"
                }`}
              />
            </div>
            <div
              className={`text-2xl font-bold ${
                metrics.winRate >= 55
                  ? "text-success-700 dark:text-success-300"
                  : metrics.winRate >= 45
                  ? "text-warning-700 dark:text-warning-300"
                  : "text-danger-700 dark:text-danger-300"
              }`}
            >
              {metrics.winRate}%
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {Math.round((metrics.winRate / 100) * trades.length)} winning
              trades
            </div>
          </div>

          <div
            className={`card p-4 ${
              metrics.profitFactor >= 1.5
                ? "bg-success-50 dark:bg-success-900/10 border-success-200 dark:border-success-800"
                : metrics.profitFactor >= 1
                ? "bg-warning-50 dark:bg-warning-900/10 border-warning-200 dark:border-warning-800"
                : "bg-danger-50 dark:bg-danger-900/10 border-danger-200 dark:border-danger-800"
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Profit Factor
              </span>
              <Activity
                className={`w-5 h-5 ${
                  metrics.profitFactor >= 1.5
                    ? "text-success-600 dark:text-success-400"
                    : metrics.profitFactor >= 1
                    ? "text-warning-600 dark:text-warning-400"
                    : "text-danger-600 dark:text-danger-400"
                }`}
              />
            </div>
            <div
              className={`text-2xl font-bold ${
                metrics.profitFactor >= 1.5
                  ? "text-success-700 dark:text-success-300"
                  : metrics.profitFactor >= 1
                  ? "text-warning-700 dark:text-warning-300"
                  : "text-danger-700 dark:text-danger-300"
              }`}
            >
              {metrics.profitFactor}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Gross profit / Gross loss
            </div>
          </div>

          <div className="card p-4 bg-danger-50 dark:bg-danger-900/10 border-danger-200 dark:border-danger-800">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Max Drawdown
              </span>
              <TrendingDown className="w-5 h-5 text-danger-600 dark:text-danger-400" />
            </div>
            <div className="text-2xl font-bold text-danger-700 dark:text-danger-300">
              ${metrics.maxDrawdown.toLocaleString()}
            </div>
            <div className="text-xs text-danger-600 dark:text-danger-500 mt-1">
              Peak to trough decline
            </div>
          </div>
        </div>
      )}

      {/* Simulation Controls */}
      <div className="card p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="font-medium text-gray-900 dark:text-gray-100">
              Simulation Parameters
            </span>
            {session.status === "completed" && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Last run:{" "}
                {format(new Date(session.lastModified), "MMM d, yyyy HH:mm")}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              className="btn btn-sm btn-secondary flex items-center space-x-1"
              onClick={handleRunSimulation}
              disabled={isSimulating}
            >
              {session.status === "completed" ? (
                <>
                  <RefreshCcw className="w-4 h-4" />
                  <span>Re-run</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Run Simulation</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Parameter Display */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Starting Capital
            </span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              $
              {session.parameters?.startingCapital?.toLocaleString() ||
                "10,000"}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Risk Per Trade
            </span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {(session.parameters?.riskPerTrade * 100).toFixed(1)}%
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Instruments
            </span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {session.instruments?.join(", ")}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Strategies
            </span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {session.strategies?.join(", ")}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("overview")}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
              activeTab === "overview"
                ? "border-primary-500 text-primary-600 dark:text-primary-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
            }`}
          >
            <BarChart4 className="w-4 h-4" />
            <span>Overview</span>
          </button>
          <button
            onClick={() => setActiveTab("trades")}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
              activeTab === "trades"
                ? "border-primary-500 text-primary-600 dark:text-primary-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Trades</span>
          </button>
          <button
            onClick={() => setActiveTab("report")}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
              activeTab === "report"
                ? "border-primary-500 text-primary-600 dark:text-primary-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Report</span>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {session.status !== "completed" ? (
          <div className="card p-8 text-center">
            <Info className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              {session.status === "running"
                ? "Simulation in Progress"
                : "Simulation Not Started"}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
              {session.status === "running"
                ? "Please wait while the simulation is running. This may take a few moments."
                : "Run the simulation to see the backtesting results and analyze performance."}
            </p>
            {session.status === "running" && (
              <div className="mt-4 flex justify-center">
                <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
              </div>
            )}
          </div>
        ) : (
          <>
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Main Chart */}
                <div className="card p-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                    Performance Overview
                  </h3>
                  <div className="h-96">
                    <BacktestChart
                      candleData={candleData}
                      equityCurve={metrics.equityCurve}
                      trades={trades}
                      height={380}
                      isDarkMode={isDarkMode}
                    />
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Detailed Metrics */}
                  <div className="card p-6">
                    <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-4">
                      Detailed Metrics
                    </h3>
                    <div className="grid grid-cols-2 gap-y-4">
                      <div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Total Trades
                        </div>
                        <div className="text-base font-medium text-gray-900 dark:text-gray-100">
                          {trades.length}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Win Rate
                        </div>
                        <div className="text-base font-medium text-gray-900 dark:text-gray-100">
                          {metrics.winRate}%
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Average Win
                        </div>
                        <div className="text-base font-medium text-success-600 dark:text-success-400">
                          ${metrics.avgWin.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Average Loss
                        </div>
                        <div className="text-base font-medium text-danger-600 dark:text-danger-400">
                          ${metrics.avgLoss.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Profit Factor
                        </div>
                        <div className="text-base font-medium text-gray-900 dark:text-gray-100">
                          {metrics.profitFactor}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Expectancy
                        </div>
                        <div className="text-base font-medium text-gray-900 dark:text-gray-100">
                          ${metrics.expectancy.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Max Drawdown
                        </div>
                        <div className="text-base font-medium text-gray-900 dark:text-gray-100">
                          ${metrics.maxDrawdown.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Sharpe Ratio
                        </div>
                        <div className="text-base font-medium text-gray-900 dark:text-gray-100">
                          {metrics.sharpeRatio}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Strategy Insights */}
                  <div className="card p-6">
                    <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-4">
                      Strategy Insights
                    </h3>
                    <div className="space-y-3">
                      {metrics.profitFactor >= 1.5 && (
                        <div className="p-3 bg-success-50 dark:bg-success-900/20 rounded-lg border border-success-100 dark:border-success-800">
                          <div className="font-medium text-success-800 dark:text-success-300 mb-1 flex items-center">
                            <TrendingUp className="w-4 h-4 mr-1" />
                            Strong Profit Factor
                          </div>
                          <p className="text-sm text-success-700 dark:text-success-400">
                            Your profit factor of {metrics.profitFactor}{" "}
                            indicates a robust strategy that generates
                            significantly more profits than losses.
                          </p>
                        </div>
                      )}

                      {metrics.winRate >= 60 && (
                        <div className="p-3 bg-success-50 dark:bg-success-900/20 rounded-lg border border-success-100 dark:border-success-800">
                          <div className="font-medium text-success-800 dark:text-success-300 mb-1 flex items-center">
                            <Target className="w-4 h-4 mr-1" />
                            Excellent Win Rate
                          </div>
                          <p className="text-sm text-success-700 dark:text-success-400">
                            Your strategy has an excellent win rate of{" "}
                            {metrics.winRate}%, significantly above market
                            averages.
                          </p>
                        </div>
                      )}

                      {metrics.maxDrawdown > metrics.totalPnL * 0.5 &&
                        metrics.totalPnL > 0 && (
                          <div className="p-3 bg-warning-50 dark:bg-warning-900/20 rounded-lg border border-warning-100 dark:border-warning-800">
                            <div className="font-medium text-warning-800 dark:text-warning-300 mb-1 flex items-center">
                              <TrendingDown className="w-4 h-4 mr-1" />
                              High Drawdown Risk
                            </div>
                            <p className="text-sm text-warning-700 dark:text-warning-400">
                              The maximum drawdown is{" "}
                              {Math.round(
                                (metrics.maxDrawdown / metrics.totalPnL) * 100
                              )}
                              % of total profit, suggesting potential volatility
                              in returns.
                            </p>
                          </div>
                        )}

                      {metrics.profitFactor < 1 && (
                        <div className="p-3 bg-danger-50 dark:bg-danger-900/20 rounded-lg border border-danger-100 dark:border-danger-800">
                          <div className="font-medium text-danger-800 dark:text-danger-300 mb-1 flex items-center">
                            <TrendingDown className="w-4 h-4 mr-1" />
                            Strategy Underperforming
                          </div>
                          <p className="text-sm text-danger-700 dark:text-danger-400">
                            With a profit factor below 1.0, this strategy is
                            losing more than it's making. Consider revising
                            parameters.
                          </p>
                        </div>
                      )}

                      {metrics.avgWin / metrics.avgLoss < 1 &&
                        metrics.avgLoss > 0 && (
                          <div className="p-3 bg-danger-50 dark:bg-danger-900/20 rounded-lg border border-danger-100 dark:border-danger-800">
                            <div className="font-medium text-danger-800 dark:text-danger-300 mb-1 flex items-center">
                              <Info className="w-4 h-4 mr-1" />
                              Risk-Reward Imbalance
                            </div>
                            <p className="text-sm text-danger-700 dark:text-danger-400">
                              Your average loss (${metrics.avgLoss}) is higher
                              than your average win (${metrics.avgWin}).
                              Consider improving your risk management.
                            </p>
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "trades" && (
              <div className="space-y-6">
                {/* Trades List */}
                <div className="card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                          >
                            Date
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                          >
                            Instrument
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                          >
                            Direction
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                          >
                            Strategy
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                          >
                            Entry
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                          >
                            Exit
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                          >
                            P&L
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {trades.map((trade) => (
                          <tr
                            key={trade.id}
                            className="hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                              {format(new Date(trade.entryDate), "yyyy-MM-dd")}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                              {trade.instrument}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  trade.direction === "long"
                                    ? "bg-success-100 dark:bg-success-900/30 text-success-800 dark:text-success-300"
                                    : "bg-danger-100 dark:bg-danger-900/30 text-danger-800 dark:text-danger-300"
                                }`}
                              >
                                {trade.direction === "long" ? "Long" : "Short"}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                              {trade.strategy}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                              ${trade.entryPrice.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                              ${trade.exitPrice.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div
                                className={`text-sm font-medium flex items-center ${
                                  trade.pnl > 0
                                    ? "text-success-600 dark:text-success-400"
                                    : "text-danger-600 dark:text-danger-400"
                                }`}
                              >
                                {trade.pnl > 0 ? (
                                  <ArrowUpRight className="w-4 h-4 mr-1" />
                                ) : (
                                  <ArrowDownRight className="w-4 h-4 mr-1" />
                                )}
                                ${Math.abs(trade.pnl).toFixed(2)}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "report" && (
              <div className="card p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    Backtest Report
                  </h3>
                  <button className="btn btn-sm btn-secondary flex items-center space-x-2">
                    <Download className="w-4 h-4" />
                    <span>Export Report</span>
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                    <h4 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Summary
                    </h4>
                    <p className="text-gray-600 dark:text-gray-400">
                      This backtest simulated trading{" "}
                      {session.instruments.join(", ")} using the{" "}
                      {session.strategies.join(", ")}{" "}
                      {session.strategies.length > 1
                        ? "strategies"
                        : "strategy"}{" "}
                      from{" "}
                      {format(
                        new Date(session.dateRange.start),
                        "MMMM d, yyyy"
                      )}{" "}
                      to{" "}
                      {format(new Date(session.dateRange.end), "MMMM d, yyyy")}.
                    </p>
                  </div>

                  <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                    <h4 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Performance Summary
                    </h4>
                    <div className="text-gray-600 dark:text-gray-400 space-y-1">
                      <p>
                        Starting Capital: $
                        {session.parameters?.startingCapital?.toLocaleString()}
                      </p>
                      <p>
                        Ending Capital: $
                        {(
                          session.parameters?.startingCapital + metrics.totalPnL
                        ).toLocaleString()}
                      </p>
                      <p>
                        Total Return:{" "}
                        {(
                          (metrics.totalPnL /
                            session.parameters?.startingCapital) *
                          100
                        ).toFixed(2)}
                        %
                      </p>
                      <p>Total Trades: {trades.length}</p>
                      <p>Win Rate: {metrics.winRate}%</p>
                    </div>
                  </div>

                  <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                    <h4 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Risk Analysis
                    </h4>
                    <div className="text-gray-600 dark:text-gray-400 space-y-1">
                      <p>
                        Maximum Drawdown: $
                        {metrics.maxDrawdown.toLocaleString()} (
                        {(
                          (metrics.maxDrawdown /
                            session.parameters?.startingCapital) *
                          100
                        ).toFixed(2)}
                        % of initial capital)
                      </p>
                      <p>Profit Factor: {metrics.profitFactor}</p>
                      <p>Sharpe Ratio: {metrics.sharpeRatio}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Recommendations
                    </h4>
                    <div className="space-y-3 text-sm">
                      {metrics.winRate < 45 && (
                        <p className="text-danger-600 dark:text-danger-400">
                          • Consider revising your strategy to improve win rate
                          ({metrics.winRate}%).
                        </p>
                      )}

                      {metrics.profitFactor < 1 && (
                        <p className="text-danger-600 dark:text-danger-400">
                          • This strategy is not profitable with a profit factor
                          of {metrics.profitFactor}. Review and adjust.
                        </p>
                      )}

                      {metrics.profitFactor >= 1.5 && metrics.winRate >= 50 && (
                        <p className="text-success-600 dark:text-success-400">
                          • This strategy shows promise with good profit factor
                          ({metrics.profitFactor}) and win rate (
                          {metrics.winRate}%).
                        </p>
                      )}

                      {metrics.avgWin / metrics.avgLoss < 1 && (
                        <p className="text-warning-600 dark:text-warning-400">
                          • Your risk-reward ratio is suboptimal. Consider
                          adjusting stop losses and profit targets.
                        </p>
                      )}

                      {metrics.sharpeRatio < 0.5 && (
                        <p className="text-warning-600 dark:text-warning-400">
                          • Low Sharpe ratio ({metrics.sharpeRatio}) indicates
                          poor risk-adjusted returns.
                        </p>
                      )}

                      {metrics.sharpeRatio >= 1 && (
                        <p className="text-success-600 dark:text-success-400">
                          • Good risk-adjusted returns with Sharpe ratio of{" "}
                          {metrics.sharpeRatio}.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default BacktestSession;
