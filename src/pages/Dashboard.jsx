import React from "react";
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
import { useTrades } from "../context/TradeContext";
import { useAuth } from "../context/AuthContext";
import StatsCard from "../components/dashboard/StatsCard";
import RecentTrades from "../components/dashboard/RecentTrades";
import PerformanceChart from "../components/dashboard/PerformanceChart";
import PnLChart from "../components/dashboard/PnLChart";

const Dashboard = () => {
  const { trades, stats } = useTrades();
  const { user } = useAuth();

  const recentTrades = trades
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

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
      color: "primary",
    },
    {
      title: "Total Trades",
      value: stats.totalTrades.toString(),
      change: "+5",
      changeType: "positive",
      icon: BarChart3,
      color: "warning",
    },
    {
      title: "Profit Factor",
      value: stats.profitFactor.toFixed(2),
      change: stats.profitFactor > 1 ? "+0.3" : "-0.1",
      changeType: stats.profitFactor > 1 ? "positive" : "negative",
      icon: Award,
      color: stats.profitFactor > 1 ? "success" : "danger",
    },
  ];

  return (
    <div className="dashboard space-y-6">
      {/* Header */}
      <div className="dashboard__header flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
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

      {/* Stats Cards */}
      <div className="dashboard__stats grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((card, index) => (
          <StatsCard key={index} {...card} />
        ))}
      </div>

      {/* Charts Section */}
      <div className="dashboard__charts grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Performance Overview
            </h3>
            <select className="select text-sm px-3 py-1">
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
          </div>
          <PerformanceChart trades={trades} />
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              P&L Distribution
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
      </div>

      {/* Recent Activity and Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentTrades trades={recentTrades} />
        </div>

        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Key Metrics
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Average Win</span>
                <span className="font-medium text-success-600 dark:text-success-400">
                  ${stats.avgWin.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Average Loss</span>
                <span className="font-medium text-danger-600 dark:text-danger-400">
                  ${stats.avgLoss.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Max Drawdown</span>
                <span className="font-medium text-danger-600 dark:text-danger-400">
                  ${stats.maxDrawdown.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Sharpe Ratio</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {stats.sharpeRatio.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Trading Insights */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-warning-600 dark:text-warning-400" />
                <span>Insights</span>
              </div>
            </h3>
            <div className="space-y-3">
              <div className="p-3 bg-primary-50 dark:bg-primary-900/30 rounded-lg border border-primary-100 dark:border-primary-800">
                <p className="text-sm text-primary-700 dark:text-primary-300">
                  Your win rate has improved by 5% this month. Keep up the good
                  work!
                </p>
              </div>
              <div className="p-3 bg-warning-50 dark:bg-warning-900/30 rounded-lg border border-warning-100 dark:border-warning-800">
                <p className="text-sm text-warning-700 dark:text-warning-300">
                  Consider reducing position size on high-risk setups to
                  minimize drawdown.
                </p>
              </div>
              <div className="p-3 bg-success-50 dark:bg-success-900/30 rounded-lg border border-success-100 dark:border-success-800">
                <p className="text-sm text-success-700 dark:text-success-300">
                  Your best performing strategy is momentum trading with 75% win
                  rate.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
