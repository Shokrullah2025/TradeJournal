import React from "react";
import {
  X,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  DollarSign,
  BarChart3,
  Edit,
  Plus,
} from "lucide-react";
import { format, parseISO } from "date-fns";

const DayDetailModal = ({ isOpen, date, trades, onClose, onEditTrade, onAddTrade }) => {
  if (!isOpen || !date) return null;

  // Calculate day statistics
  const closedTrades = trades.filter((trade) => trade.status === "closed");
  const openTrades = trades.filter((trade) => trade.status === "open");
  const totalPnL = closedTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
  const winningTrades = closedTrades.filter((trade) => trade.pnl > 0);
  const losingTrades = closedTrades.filter((trade) => trade.pnl < 0);
  const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0;

  const formatCurrency = (amount) => {
    return `${amount >= 0 ? '+' : ''}$${amount.toFixed(2)}`;
  };

  const getTradeTypeColor = (tradeType) => {
    return tradeType === "long" ? "text-green-600" : "text-red-600";
  };

  const getPnLColor = (pnl) => {
    if (pnl > 0) return "text-green-600";
    if (pnl < 0) return "text-red-600";
    return "text-gray-600";
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Calendar className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {format(date, "EEEE, MMMM d, yyyy")}
              </h2>
              <p className="text-sm text-gray-600">
                {trades.length} trade{trades.length !== 1 ? "s" : ""} • {closedTrades.length} closed
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onAddTrade(date)}
              className="btn btn-primary flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Trade</span>
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Daily Statistics */}
          <div className="p-6 bg-gray-50 border-b">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
              Daily Performance Summary
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Total P&L */}
              <div className={`p-4 rounded-lg border-2 ${
                totalPnL > 0 
                  ? "bg-green-50 border-green-200" 
                  : totalPnL < 0 
                  ? "bg-red-50 border-red-200" 
                  : "bg-gray-50 border-gray-200"
              }`}>
                <div className="text-sm text-gray-600 mb-1">Total P&L</div>
                <div className={`text-2xl font-bold ${getPnLColor(totalPnL)}`}>
                  {formatCurrency(totalPnL)}
                </div>
              </div>

              {/* Win Rate */}
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-sm text-gray-600 mb-1">Win Rate</div>
                <div className={`text-2xl font-bold ${winRate >= 50 ? "text-green-600" : "text-red-600"}`}>
                  {closedTrades.length > 0 ? `${winRate.toFixed(0)}%` : "N/A"}
                </div>
              </div>

              {/* Winning Trades */}
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="text-sm text-gray-600 mb-1">Winners</div>
                <div className="text-2xl font-bold text-green-600">
                  {winningTrades.length}
                </div>
                {winningTrades.length > 0 && (
                  <div className="text-xs text-green-600 mt-1">
                    {formatCurrency(winningTrades.reduce((sum, trade) => sum + trade.pnl, 0))}
                  </div>
                )}
              </div>

              {/* Losing Trades */}
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <div className="text-sm text-gray-600 mb-1">Losers</div>
                <div className="text-2xl font-bold text-red-600">
                  {losingTrades.length}
                </div>
                {losingTrades.length > 0 && (
                  <div className="text-xs text-red-600 mt-1">
                    {formatCurrency(losingTrades.reduce((sum, trade) => sum + trade.pnl, 0))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Trades List */}
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Trade Details
            </h3>

            {trades.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-4">No trades on this date</p>
                <button
                  onClick={() => onAddTrade(date)}
                  className="btn btn-primary"
                >
                  Add Your First Trade
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {trades.map((trade) => (
                  <div
                    key={trade.id}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                      trade.status === "closed" && trade.pnl > 0
                        ? "bg-green-50 border-green-200 hover:bg-green-100"
                        : trade.status === "closed" && trade.pnl < 0
                        ? "bg-red-50 border-red-200 hover:bg-red-100"
                        : trade.status === "open"
                        ? "bg-blue-50 border-blue-200 hover:bg-blue-100"
                        : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                    }`}
                    onClick={() => onEditTrade(trade)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-semibold text-gray-900">
                            {trade.instrument}
                          </h4>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            trade.tradeType === "long" 
                              ? "bg-green-100 text-green-800" 
                              : "bg-red-100 text-red-800"
                          }`}>
                            {trade.tradeType === "long" ? (
                              <TrendingUp className="w-3 h-3 mr-1" />
                            ) : (
                              <TrendingDown className="w-3 h-3 mr-1" />
                            )}
                            {trade.tradeType?.toUpperCase()}
                          </span>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            trade.status === "open" 
                              ? "bg-blue-100 text-blue-800" 
                              : "bg-gray-100 text-gray-800"
                          }`}>
                            {trade.status?.toUpperCase()}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Entry Price:</span>
                            <div className="font-medium">${trade.entryPrice}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Quantity:</span>
                            <div className="font-medium">{trade.quantity}</div>
                          </div>
                          {trade.entryTime && (
                            <div>
                              <span className="text-gray-600">Time:</span>
                              <div className="font-medium flex items-center">
                                <Clock className="w-3 h-3 mr-1" />
                                {trade.entryTime}
                              </div>
                            </div>
                          )}
                          {trade.status === "closed" && (
                            <div>
                              <span className="text-gray-600">P&L:</span>
                              <div className={`font-bold ${getPnLColor(trade.pnl || 0)}`}>
                                {formatCurrency(trade.pnl || 0)}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Strategy and Setup */}
                        {(trade.strategy || trade.setup) && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {trade.strategy && (
                              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-800">
                                📈 {trade.strategy}
                              </span>
                            )}
                            {trade.setup && (
                              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-indigo-100 text-indigo-800">
                                🎯 {trade.setup}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Notes */}
                        {trade.notes && (
                          <div className="mt-2 text-sm text-gray-600 italic">
                            "{trade.notes.substring(0, 100)}{trade.notes.length > 100 ? '...' : ''}"
                          </div>
                        )}

                        {/* Risk Management */}
                        {(trade.stopLoss || trade.takeProfit) && (
                          <div className="mt-2 grid grid-cols-2 gap-4 text-xs">
                            {trade.stopLoss && (
                              <div>
                                <span className="text-gray-600">Stop Loss:</span>
                                <span className="ml-1 font-medium text-red-600">${trade.stopLoss}</span>
                              </div>
                            )}
                            {trade.takeProfit && (
                              <div>
                                <span className="text-gray-600">Take Profit:</span>
                                <span className="ml-1 font-medium text-green-600">${trade.takeProfit}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditTrade(trade);
                        }}
                        className="ml-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Edit trade"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DayDetailModal;
