import React, { useState } from "react";
import { format } from "date-fns";
import {
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  Eye,
  MoreHorizontal,
} from "lucide-react";
import { useTrades } from "../../context/TradeContext";
import toast from "react-hot-toast";

const TradeList = ({ trades, onEditTrade, compact = false }) => {
  const { deleteTrade } = useTrades();
  const [sortConfig, setSortConfig] = useState({
    key: "createdAt",
    direction: "desc",
  });
  const [selectedTrade, setSelectedTrade] = useState(null);

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const sortedTrades = React.useMemo(() => {
    let sortableTrades = [...trades];
    if (sortConfig.key) {
      sortableTrades.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Handle date sorting
        if (sortConfig.key === "createdAt" || sortConfig.key === "entryDate") {
          aValue = new Date(aValue);
          bValue = new Date(bValue);
        }

        // Handle numeric sorting
        if (typeof aValue === "number" && typeof bValue === "number") {
          return sortConfig.direction === "asc"
            ? aValue - bValue
            : bValue - aValue;
        }

        // Handle string sorting
        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return sortableTrades;
  }, [trades, sortConfig]);

  const handleDelete = async (tradeId) => {
    if (window.confirm("Are you sure you want to delete this trade?")) {
      try {
        deleteTrade(tradeId);
        toast.success("Trade deleted successfully");
      } catch (error) {
        toast.error("Failed to delete trade");
      }
    }
  };

  const getSortIcon = (columnName) => {
    if (sortConfig.key === columnName) {
      return sortConfig.direction === "asc" ? "↑" : "↓";
    }
    return "↕";
  };

  if (trades.length === 0) {
    return (
      <div className="card">
        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto mb-4 text-gray-300">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No trades found
          </h3>
          <p className="text-gray-500 mb-6">
            Get started by adding your first trade or adjust your filters.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={compact ? "" : "card overflow-hidden"}>
      {compact ? (
        // Compact view for sidebar
        <div className="space-y-2 p-4">
          {sortedTrades.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No trades found</p>
            </div>
          ) : (
            sortedTrades.map((trade) => (
              <div
                key={trade.id}
                className="p-3 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow cursor-pointer"
                onClick={() => setSelectedTrade(trade)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">
                      {trade.instrument}
                    </span>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        trade.tradeType === "long"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {trade.tradeType === "long" ? "Long" : "Short"}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditTrade(trade);
                    }}
                    className="p-1 text-gray-400 hover:text-blue-600"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>{new Date(trade.entryDate).toLocaleDateString()}</span>
                  <span
                    className={`font-medium ${
                      trade.pnl > 0
                        ? "text-green-600"
                        : trade.pnl < 0
                        ? "text-red-600"
                        : "text-gray-600"
                    }`}
                  >
                    {trade.pnl > 0 ? "+" : ""}${trade.pnl?.toFixed(2) || "0.00"}
                  </span>
                </div>

                {trade.strategy && (
                  <div className="mt-1 text-xs text-gray-500">
                    {trade.strategy}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        // Full table view
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  onClick={() => handleSort("instrument")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  Instrument {getSortIcon("instrument")}
                </th>
                <th
                  onClick={() => handleSort("tradeType")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  Type {getSortIcon("tradeType")}
                </th>
                <th
                  onClick={() => handleSort("entryPrice")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  Entry {getSortIcon("entryPrice")}
                </th>
                <th
                  onClick={() => handleSort("exitPrice")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  Exit {getSortIcon("exitPrice")}
                </th>
                <th
                  onClick={() => handleSort("quantity")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  Quantity {getSortIcon("quantity")}
                </th>
                <th
                  onClick={() => handleSort("pnl")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  P&L {getSortIcon("pnl")}
                </th>
                <th
                  onClick={() => handleSort("entryDate")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  Date {getSortIcon("entryDate")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedTrades.map((trade) => (
                <tr
                  key={trade.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="font-medium text-gray-900">
                        {trade.instrument}
                      </div>
                      {trade.strategy && (
                        <div className="text-sm text-gray-500 ml-2">
                          {trade.strategy}
                        </div>
                      )}
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {trade.tradeType === "long" ? (
                        <TrendingUp className="w-4 h-4 text-success-600 mr-1" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-danger-600 mr-1" />
                      )}
                      <span
                        className={`text-sm font-medium ${
                          trade.tradeType === "long"
                            ? "text-success-600"
                            : "text-danger-600"
                        }`}
                      >
                        {trade.tradeType.toUpperCase()}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${trade.entryPrice.toLocaleString()}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {trade.exitPrice
                      ? `$${trade.exitPrice.toLocaleString()}`
                      : "-"}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {trade.quantity.toLocaleString()}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div
                      className={`text-sm font-semibold ${
                        trade.pnl > 0
                          ? "text-success-600"
                          : trade.pnl < 0
                          ? "text-danger-600"
                          : "text-gray-500"
                      }`}
                    >
                      {trade.pnl > 0 ? "+" : ""}${trade.pnl.toLocaleString()}
                    </div>
                    {trade.pnl !== 0 && (
                      <div className="text-xs text-gray-500">
                        {(
                          (trade.pnl / (trade.entryPrice * trade.quantity)) *
                          100
                        ).toFixed(2)}
                        %
                      </div>
                    )}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 text-gray-400 mr-1" />
                      {format(new Date(trade.entryDate), "MMM dd, yyyy")}
                    </div>
                    {trade.entryTime && (
                      <div className="text-xs text-gray-500">
                        {trade.entryTime}
                      </div>
                    )}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        trade.status === "open"
                          ? "bg-warning-100 text-warning-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {trade.status}
                    </span>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => setSelectedTrade(trade)}
                        className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => onEditTrade(trade)}
                        className="text-primary-600 hover:text-primary-900 p-1 rounded hover:bg-primary-50"
                        title="Edit Trade"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDelete(trade.id)}
                        className="text-danger-600 hover:text-danger-900 p-1 rounded hover:bg-danger-50"
                        title="Delete Trade"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Trade Details Modal */}
      {selectedTrade && (
        <TradeDetailsModal
          trade={selectedTrade}
          onClose={() => setSelectedTrade(null)}
        />
      )}
    </div>
  );
};

// Trade Details Modal Component
const TradeDetailsModal = ({ trade, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        <div className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-gray-900">
              Trade Details - {trade.instrument}
            </h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">
                  Trade Information
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Instrument:</span>
                    <span className="font-medium">{trade.instrument}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span
                      className={`font-medium ${
                        trade.tradeType === "long"
                          ? "text-success-600"
                          : "text-danger-600"
                      }`}
                    >
                      {trade.tradeType.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Strategy:</span>
                    <span className="font-medium">
                      {trade.strategy || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Setup:</span>
                    <span className="font-medium">{trade.setup || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Market Condition:</span>
                    <span className="font-medium">
                      {trade.marketCondition || "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">
                  Risk Management
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Stop Loss:</span>
                    <span className="font-medium">
                      {trade.stopLoss ? `$${trade.stopLoss}` : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Take Profit:</span>
                    <span className="font-medium">
                      {trade.takeProfit ? `$${trade.takeProfit}` : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Risk/Reward:</span>
                    <span className="font-medium">
                      {trade.riskReward ? `1:${trade.riskReward}` : "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">
                  Execution Details
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Entry Date:</span>
                    <span className="font-medium">
                      {format(new Date(trade.entryDate), "MMM dd, yyyy")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Entry Price:</span>
                    <span className="font-medium">${trade.entryPrice}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Quantity:</span>
                    <span className="font-medium">{trade.quantity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Exit Price:</span>
                    <span className="font-medium">
                      {trade.exitPrice ? `$${trade.exitPrice}` : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fees:</span>
                    <span className="font-medium">${trade.fees || 0}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">
                  Performance
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">P&L:</span>
                    <span
                      className={`font-bold ${
                        trade.pnl > 0
                          ? "text-success-600"
                          : trade.pnl < 0
                          ? "text-danger-600"
                          : "text-gray-600"
                      }`}
                    >
                      {trade.pnl > 0 ? "+" : ""}${trade.pnl.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Return %:</span>
                    <span
                      className={`font-medium ${
                        trade.pnl > 0
                          ? "text-success-600"
                          : trade.pnl < 0
                          ? "text-danger-600"
                          : "text-gray-600"
                      }`}
                    >
                      {trade.pnl !== 0
                        ? `${(
                            (trade.pnl / (trade.entryPrice * trade.quantity)) *
                            100
                          ).toFixed(2)}%`
                        : "0%"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span
                      className={`font-medium ${
                        trade.status === "open"
                          ? "text-warning-600"
                          : "text-gray-600"
                      }`}
                    >
                      {trade.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {trade.tags && trade.tags.length > 0 && (
            <div className="mt-6">
              <h4 className="font-semibold text-gray-900 mb-2">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {trade.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-primary-100 text-primary-800 text-xs rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {trade.notes && (
            <div className="mt-6">
              <h4 className="font-semibold text-gray-900 mb-2">Notes</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {trade.notes}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TradeList;
