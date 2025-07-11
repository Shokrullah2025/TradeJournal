import React from "react";
import { format } from "date-fns";
import { TrendingUp, TrendingDown, Clock, Eye } from "lucide-react";

const RecentTrades = ({ trades }) => {
  if (trades.length === 0) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Trades
        </h3>
        <div className="text-center py-8">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No trades yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Your recent trades will appear here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Recent Trades</h3>
        <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
          View all
        </button>
      </div>

      <div className="space-y-4">
        {trades.map((trade) => (
          <div
            key={trade.id}
            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200"
          >
            <div className="flex items-center space-x-4">
              <div
                className={`p-2 rounded-lg ${
                  trade.pnl > 0
                    ? "bg-success-100 text-success-600"
                    : "bg-danger-100 text-danger-600"
                }`}
              >
                {trade.pnl > 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
              </div>

              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900">
                    {trade.instrument}
                  </span>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      trade.tradeType === "long"
                        ? "bg-success-100 text-success-700"
                        : "bg-danger-100 text-danger-700"
                    }`}
                  >
                    {trade.tradeType.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                  <span>
                    {format(new Date(trade.entryDate), "MMM dd, yyyy")}
                  </span>
                  <span>Qty: {trade.quantity}</span>
                  <span>Entry: ${trade.entryPrice}</span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <div
                className={`font-semibold ${
                  trade.pnl > 0 ? "text-success-600" : "text-danger-600"
                }`}
              >
                {trade.pnl > 0 ? "+" : ""}${trade.pnl.toLocaleString()}
              </div>
              <div className="flex items-center space-x-1 text-sm text-gray-500 mt-1">
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    trade.status === "open"
                      ? "bg-warning-100 text-warning-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {trade.status}
                </span>
                <button className="p-1 hover:bg-gray-200 rounded">
                  <Eye className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentTrades;
