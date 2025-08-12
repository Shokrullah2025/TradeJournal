import React, { useState } from "react";
import {
  Plus,
  Beaker,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Play,
  BarChart4,
  Calendar,
  Clock,
  X,
} from "lucide-react";
import { useBacktest } from "../../context/BacktestContext";
import BacktestModal from "./BacktestModal";
import { format } from "date-fns";

const BacktestPanel = ({ onSessionSelected, activeSession, onClose }) => {
  const { sessions } = useBacktest();
  const [showBacktestModal, setShowBacktestModal] = useState(false);

  const handleSessionClick = (sessionId) => {
    if (onSessionSelected) {
      onSessionSelected(sessionId);
    }
  };

  const handleNewSession = () => {
    setShowBacktestModal(true);
  };

  const handleSessionCreated = (sessionId) => {
    setShowBacktestModal(false);
    if (onSessionSelected) {
      onSessionSelected(sessionId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0 w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                <Beaker className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Backtesting
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Simulate and analyze trading strategies
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleNewSession}
                className="btn btn-sm btn-primary flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>New Session</span>
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="btn btn-sm btn-secondary p-2"
                  title="Close backtest panel"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          {sessions.length > 0 && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Total Sessions
                </div>
                <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {sessions.length}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Completed
                </div>
                <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {sessions.filter((s) => s.status === "completed").length}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sessions List */}
      <div className="card">
        <div className="p-6">
          <h3 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-4">
            Recent Sessions
          </h3>

          {sessions.length === 0 ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 mb-4">
                <Activity className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                No sessions yet
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-400 max-w-xs mx-auto mb-4">
                Create your first backtesting session to simulate trading
                strategies.
              </p>
              <button
                onClick={handleNewSession}
                className="btn btn-sm btn-primary flex items-center space-x-2 mx-auto"
              >
                <Plus className="w-3 h-3" />
                <span>Create Session</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer transition-all hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-sm ${
                    activeSession === session.id
                      ? "border-primary-500 dark:border-primary-400 bg-primary-50 dark:bg-primary-900/20"
                      : "bg-white dark:bg-gray-800"
                  }`}
                  onClick={() => handleSessionClick(session.id)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {session.name}
                    </h4>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        session.status === "completed"
                          ? "bg-success-100 dark:bg-success-900/30 text-success-800 dark:text-success-300"
                          : session.status === "running"
                          ? "bg-warning-100 dark:bg-warning-900/30 text-warning-800 dark:text-warning-300"
                          : session.status === "failed"
                          ? "bg-danger-100 dark:bg-danger-900/30 text-danger-800 dark:text-danger-300"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300"
                      }`}
                    >
                      {session.status.charAt(0).toUpperCase() +
                        session.status.slice(1)}
                    </span>
                  </div>

                  <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400 mb-3">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {format(new Date(session.createdAt), "MMM dd")}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <BarChart4 className="w-3 h-3" />
                      <span>{session.instruments.slice(0, 2).join(", ")}</span>
                      {session.instruments.length > 2 && (
                        <span>+{session.instruments.length - 2}</span>
                      )}
                    </div>
                  </div>

                  {session.status === "completed" && session.metrics && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-gray-50 dark:bg-gray-900 p-2 rounded">
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          P&L
                        </div>
                        <div
                          className={`text-sm font-semibold ${
                            session.metrics.totalPnL >= 0
                              ? "text-success-600 dark:text-success-400"
                              : "text-danger-600 dark:text-danger-400"
                          }`}
                        >
                          {session.metrics.totalPnL >= 0 ? "+" : ""}$
                          {Math.abs(session.metrics.totalPnL).toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-900 p-2 rounded">
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Win Rate
                        </div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {session.metrics.winRate}%
                        </div>
                      </div>
                    </div>
                  )}

                  {session.status === "running" && (
                    <div className="flex items-center space-x-2 text-xs text-warning-600 dark:text-warning-400">
                      <Play className="w-3 h-3" />
                      <span>Simulation in progress...</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Backtest Modal */}
      <BacktestModal
        isOpen={showBacktestModal}
        onClose={() => setShowBacktestModal(false)}
        onSessionCreated={handleSessionCreated}
      />
    </div>
  );
};

export default BacktestPanel;
