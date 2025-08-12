import React, { useState, useContext } from "react";
import {
  Plus,
  Edit3,
  Trash2,
  Search,
  Filter,
  Download,
  Upload,
  Eye,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Clock,
  MoreVertical,
  SortAsc,
  SortDesc,
} from "lucide-react";
import { TradeContext } from "../../context/TradeContext";
import toast from "react-hot-toast";

const TradeManagement = () => {
  const { trades, addTrade, updateTrade, deleteTrade } =
    useContext(TradeContext);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [sortConfig, setSortConfig] = useState({
    key: "date",
    direction: "desc",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTrades, setSelectedTrades] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTrade, setEditingTrade] = useState(null);
  const [formData, setFormData] = useState({
    symbol: "",
    instrumentType: "Stocks",
    tradeType: "Long",
    strategy: "",
    setup: "",
    entryDate: "",
    entryTime: "",
    entryPrice: "",
    exitDate: "",
    exitTime: "",
    exitPrice: "",
    quantity: "",
    stopLoss: "",
    takeProfit: "",
    commission: "",
    notes: "",
    status: "Open",
    marketCondition: "",
  });

  // Sample data if no trades exist
  const sampleTrades = [
    {
      id: 1,
      symbol: "AAPL",
      instrumentType: "Stocks",
      tradeType: "Long",
      strategy: "Day Trading",
      setup: "Breakout",
      entryDate: "2025-01-15",
      entryTime: "09:30",
      entryPrice: 185.5,
      exitDate: "2025-01-15",
      exitTime: "15:45",
      exitPrice: 187.25,
      quantity: 100,
      stopLoss: 182.0,
      takeProfit: 190.0,
      commission: 2.0,
      pnl: 175.0,
      pnlPercent: 0.94,
      status: "Closed",
      notes: "Clean breakout above resistance",
      marketCondition: "Trending Up",
    },
    {
      id: 2,
      symbol: "TSLA",
      instrumentType: "Stocks",
      tradeType: "Short",
      strategy: "Swing Trading",
      setup: "Resistance Rejection",
      entryDate: "2025-01-14",
      entryTime: "10:15",
      entryPrice: 245.8,
      exitDate: null,
      exitTime: null,
      exitPrice: null,
      quantity: 50,
      stopLoss: 252.0,
      takeProfit: 235.0,
      commission: 1.5,
      pnl: -125.0,
      pnlPercent: -1.02,
      status: "Open",
      notes: "Strong rejection at weekly resistance",
      marketCondition: "Consolidating",
    },
  ];

  const displayTrades = trades?.length > 0 ? trades : sampleTrades;

  const filters = [
    { value: "all", label: "All Trades" },
    { value: "open", label: "Open" },
    { value: "closed", label: "Closed" },
    { value: "profitable", label: "Profitable" },
    { value: "losses", label: "Losses" },
    { value: "long", label: "Long Trades" },
    { value: "short", label: "Short Trades" },
  ];

  const instrumentTypes = ["Stocks", "Options", "Futures", "Forex", "Crypto"];
  const tradeTypes = ["Long", "Short"];
  // Get user-managed strategies and setups from localStorage
  const getUserManagedStrategies = () => {
    const stored = localStorage.getItem("tradeJournalStrategies");
    return stored
      ? JSON.parse(stored)
      : ["Day Trading", "Swing Trading", "Scalp Trading"];
  };

  const getUserManagedSetups = () => {
    const stored = localStorage.getItem("tradeJournalSetups");
    return stored
      ? JSON.parse(stored)
      : ["Breakout", "Support Bounce", "Pullback"];
  };

  const strategies = getUserManagedStrategies();
  const setups = getUserManagedSetups();
  const statuses = ["Open", "Closed", "Partial"];

  const filteredTrades = displayTrades.filter((trade) => {
    const matchesSearch =
      trade.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trade.strategy.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trade.setup.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = (() => {
      switch (selectedFilter) {
        case "open":
          return trade.status === "Open";
        case "closed":
          return trade.status === "Closed";
        case "profitable":
          return trade.pnl > 0;
        case "losses":
          return trade.pnl < 0;
        case "long":
          return trade.tradeType === "Long";
        case "short":
          return trade.tradeType === "Short";
        default:
          return true;
      }
    })();

    return matchesSearch && matchesFilter;
  });

  const sortedTrades = [...filteredTrades].sort((a, b) => {
    const { key, direction } = sortConfig;
    let aValue = a[key];
    let bValue = b[key];

    if (key === "entryDate") {
      aValue = new Date(a.entryDate + (a.entryTime ? ` ${a.entryTime}` : ""));
      bValue = new Date(b.entryDate + (b.entryTime ? ` ${b.entryTime}` : ""));
    }

    if (direction === "asc") {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleAddTrade = () => {
    setEditingTrade(null);
    setFormData({
      symbol: "",
      instrumentType: "Stocks",
      tradeType: "Long",
      strategy: "",
      setup: "",
      entryDate: "",
      entryTime: "",
      entryPrice: "",
      exitDate: "",
      exitTime: "",
      exitPrice: "",
      quantity: "",
      stopLoss: "",
      takeProfit: "",
      commission: "",
      notes: "",
      status: "Open",
      marketCondition: "",
    });
    setShowForm(true);
  };

  const handleEditTrade = (trade) => {
    setEditingTrade(trade);
    setFormData({ ...trade });
    setShowForm(true);
  };

  const handleSaveTrade = () => {
    if (!formData.symbol || !formData.entryPrice || !formData.quantity) {
      toast.error(
        "Please fill in required fields (Symbol, Entry Price, Quantity)"
      );
      return;
    }

    const calculatedPnL =
      formData.exitPrice && formData.status === "Closed"
        ? (parseFloat(formData.exitPrice) - parseFloat(formData.entryPrice)) *
            parseFloat(formData.quantity) -
          (parseFloat(formData.commission) || 0)
        : 0;

    const tradeData = {
      ...formData,
      id: editingTrade?.id || Date.now(),
      pnl: calculatedPnL,
      pnlPercent: formData.entryPrice
        ? (calculatedPnL /
            (parseFloat(formData.entryPrice) * parseFloat(formData.quantity))) *
          100
        : 0,
    };

    if (editingTrade) {
      updateTrade(tradeData);
      toast.success("Trade updated successfully");
    } else {
      addTrade(tradeData);
      toast.success("Trade added successfully");
    }

    setShowForm(false);
    setEditingTrade(null);
  };

  const handleDeleteTrade = (tradeId) => {
    if (window.confirm("Are you sure you want to delete this trade?")) {
      deleteTrade(tradeId);
      toast.success("Trade deleted successfully");
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatPercent = (percent) => {
    return `${percent >= 0 ? "+" : ""}${percent.toFixed(2)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Trade Management</h2>
          <p className="mt-1 text-gray-600">
            View, add, edit, and analyze your trades
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </button>
          <button
            onClick={handleAddTrade}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Trade
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by symbol, strategy, or setup..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {filters.map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date Range
                </label>
                <div className="flex space-x-2">
                  <input
                    type="date"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                  <input
                    type="date"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  P&L Range
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    placeholder="Min"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Strategy
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                  <option value="">All Strategies</option>
                  {strategies.map((strategy) => (
                    <option key={strategy} value={strategy}>
                      {strategy}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Trades Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort("symbol")}
                    className="flex items-center space-x-1 hover:text-gray-700"
                  >
                    <span>Symbol</span>
                    {sortConfig.key === "symbol" &&
                      (sortConfig.direction === "asc" ? (
                        <SortAsc className="h-3 w-3" />
                      ) : (
                        <SortDesc className="h-3 w-3" />
                      ))}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort("entryDate")}
                    className="flex items-center space-x-1 hover:text-gray-700"
                  >
                    <span>Entry</span>
                    {sortConfig.key === "entryDate" &&
                      (sortConfig.direction === "asc" ? (
                        <SortAsc className="h-3 w-3" />
                      ) : (
                        <SortDesc className="h-3 w-3" />
                      ))}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Exit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort("pnl")}
                    className="flex items-center space-x-1 hover:text-gray-700"
                  >
                    <span>P&L</span>
                    {sortConfig.key === "pnl" &&
                      (sortConfig.direction === "asc" ? (
                        <SortAsc className="h-3 w-3" />
                      ) : (
                        <SortDesc className="h-3 w-3" />
                      ))}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedTrades.map((trade) => (
                <tr key={trade.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {trade.symbol}
                        </div>
                        <div className="text-sm text-gray-500">
                          {trade.strategy}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-1">
                      {trade.tradeType === "Long" ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm text-gray-900">
                        {trade.tradeType}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatCurrency(trade.entryPrice)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {trade.entryDate} {trade.entryTime}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {trade.exitPrice ? formatCurrency(trade.exitPrice) : "-"}
                    </div>
                    <div className="text-sm text-gray-500">
                      {trade.exitDate
                        ? `${trade.exitDate} ${trade.exitTime || ""}`
                        : "-"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {trade.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div
                      className={`text-sm font-medium ${
                        trade.pnl >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {formatCurrency(trade.pnl)}
                    </div>
                    <div
                      className={`text-sm ${
                        trade.pnlPercent >= 0
                          ? "text-green-500"
                          : "text-red-500"
                      }`}
                    >
                      {formatPercent(trade.pnlPercent)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        trade.status === "Open"
                          ? "bg-yellow-100 text-yellow-800"
                          : trade.status === "Closed"
                          ? "bg-gray-100 text-gray-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {trade.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEditTrade(trade)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTrade(trade.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {sortedTrades.length === 0 && (
          <div className="text-center py-12">
            <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No trades found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || selectedFilter !== "all"
                ? "Try adjusting your search or filters."
                : "Get started by adding your first trade."}
            </p>
          </div>
        )}
      </div>

      {/* Trade Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                {editingTrade ? "Edit Trade" : "Add New Trade"}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Trade Info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Symbol *
                  </label>
                  <input
                    type="text"
                    value={formData.symbol}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        symbol: e.target.value.toUpperCase(),
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., AAPL"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Instrument Type
                    </label>
                    <select
                      value={formData.instrumentType}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          instrumentType: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {instrumentTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Trade Type
                    </label>
                    <select
                      value={formData.tradeType}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          tradeType: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {tradeTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Strategy
                    </label>
                    <select
                      value={formData.strategy}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          strategy: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select strategy</option>
                      {strategies.map((strategy) => (
                        <option key={strategy} value={strategy}>
                          {strategy}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Setup
                    </label>
                    <select
                      value={formData.setup}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          setup: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select setup</option>
                      {setups.map((setup) => (
                        <option key={setup} value={setup}>
                          {setup}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        status: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Trade Details */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Entry Date *
                    </label>
                    <input
                      type="date"
                      value={formData.entryDate}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          entryDate: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Entry Time
                    </label>
                    <input
                      type="time"
                      value={formData.entryTime}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          entryTime: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Entry Price *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.entryPrice}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          entryPrice: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      value={formData.quantity}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          quantity: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="100"
                    />
                  </div>
                </div>

                {formData.status === "Closed" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Exit Date
                      </label>
                      <input
                        type="date"
                        value={formData.exitDate}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            exitDate: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Exit Price
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.exitPrice}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            exitPrice: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Stop Loss
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.stopLoss}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          stopLoss: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Take Profit
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.takeProfit}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          takeProfit: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Commission
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.commission}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        commission: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Trade notes and observations..."
                  />
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTrade}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                {editingTrade ? "Update Trade" : "Add Trade"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TradeManagement;
