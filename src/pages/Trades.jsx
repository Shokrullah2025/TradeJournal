import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  Plus,
  Filter,
  Download,
  Search,
  List,
  Calendar as CalendarIcon,
  TrendingUp,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useTrades } from "../context/TradeContext";
import { useBroker } from "../context/BrokerContext";
import TradeForm from "../components/trades/TradeForm";
import TradeList from "../components/trades/TradeList";
import TradeFilters from "../components/trades/TradeFilters";
import TradeCalendar from "../components/trades/TradeCalendar";
import BrokerModal from "../components/trades/BrokerModal";
import { exportToExcel } from "../utils/exportUtils";
import toast from "react-hot-toast";

const Trades = () => {
  const { filteredTrades, trades, importTrades } = useTrades();
  const { isConnected, selectedBroker, brokers } = useBroker();
  const location = useLocation();
  const [showTradeForm, setShowTradeForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showBrokerModal, setShowBrokerModal] = useState(false);
  const [editingTrade, setEditingTrade] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);
  const [activeView, setActiveView] = useState("calendar"); // Add back view state

  // Handle OAuth success message
  useEffect(() => {
    if (location.state?.oauthSuccess) {
      toast.success(`Successfully connected to ${location.state.broker}!`);
      // Clear the state to prevent showing the message again
      window.history.replaceState(null, "");
    }
  }, [location.state]);

  const handleExport = () => {
    try {
      exportToExcel(trades, "trade-journal-export");
      toast.success("Trades exported successfully!");
    } catch (error) {
      toast.error("Failed to export trades");
      console.error("Export error:", error);
    }
  };

  const handleTradesImported = (importedTrades) => {
    importTrades(importedTrades);
  };

  const handleEditTrade = (trade) => {
    setEditingTrade(trade);
    setShowTradeForm(true);
  };

  const handleCloseForm = () => {
    setShowTradeForm(false);
    setEditingTrade(null);
    setSelectedDate(null);
  };

  const handleAddTradeForDate = (date) => {
    setSelectedDate(date);
    setShowTradeForm(true);
  };

  const filteredAndSearchedTrades = filteredTrades.filter((trade) => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();
    return (
      trade.instrument.toLowerCase().includes(searchLower) ||
      trade.strategy.toLowerCase().includes(searchLower) ||
      trade.notes?.toLowerCase().includes(searchLower) ||
      trade.tags?.some((tag) => tag.toLowerCase().includes(searchLower))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trade Journal</h1>
          <p className="text-gray-600 mt-1">
            Manage and track all your trades in one place
          </p>
        </div>

        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          {/* Broker Connection Status Button */}
          <button
            onClick={() => setShowBrokerModal(true)}
            className={`btn flex items-center space-x-2 ${
              isConnected ? "btn-secondary" : "btn-primary"
            }`}
          >
            {isConnected ? (
              <>
                <Wifi className="w-4 h-4" />
                <span>{brokers[selectedBroker]?.name}</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4" />
                <span>Connect Broker</span>
              </>
            )}
          </button>

          <button
            onClick={handleExport}
            disabled={trades.length === 0}
            className="btn btn-secondary flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>

          <button
            onClick={() => setShowTradeForm(true)}
            className="btn btn-primary flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Trade</span>
          </button>
        </div>
      </div>

      {/* Summary Stats - Horizontal Layout */}
      <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
        <div className="col-span-2 bg-white rounded-lg p-3 border border-gray-200">
          <div className="text-lg font-bold text-gray-900">
            {filteredTrades.length}
          </div>
          <div className="text-xs text-gray-600">Total Trades</div>
        </div>

        <div className="col-span-2 bg-white rounded-lg p-3 border border-gray-200">
          <div className="text-lg font-bold text-blue-600">
            {filteredTrades.filter((t) => t.status === "open").length}
          </div>
          <div className="text-xs text-gray-600">Open Positions</div>
        </div>

        <div className="col-span-2 bg-white rounded-lg p-3 border border-gray-200">
          <div className="text-lg font-bold text-success-600">
            {filteredTrades.filter((t) => t.pnl > 0).length}
          </div>
          <div className="text-xs text-gray-600">Winning Trades</div>
        </div>

        <div className="col-span-2 bg-white rounded-lg p-3 border border-gray-200">
          <div className="text-lg font-bold text-danger-600">
            {filteredTrades.filter((t) => t.pnl < 0).length}
          </div>
          <div className="text-xs text-gray-600">Losing Trades</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search trades..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent w-64"
              />
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`btn ${
                showFilters ? "btn-primary" : "btn-secondary"
              } flex items-center space-x-2`}
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </button>
          </div>

          <div className="text-sm text-gray-600">
            Showing {filteredAndSearchedTrades.length} of {trades.length} trades
          </div>
        </div>

        {showFilters && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <TradeFilters />
          </div>
        )}
      </div>

      {/* View Toggle Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveView("calendar")}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeView === "calendar"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center space-x-2">
              <CalendarIcon className="w-4 h-4" />
              <span>Calendar View</span>
            </div>
          </button>
          <button
            onClick={() => setActiveView("list")}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeView === "list"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center space-x-2">
              <List className="w-4 h-4" />
              <span>List View</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Content Area */}
      {activeView === "calendar" ? (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Calendar Section - Takes 3/4 of the width */}
          <div className="xl:col-span-3">
            <TradeCalendar
              trades={filteredAndSearchedTrades}
              onAddTrade={handleAddTradeForDate}
              onEditTrade={handleEditTrade}
            />
          </div>

          {/* P&L Summary Panel - Takes 1/4 of the width */}
          <div className="xl:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden sticky top-6">
              {/* Header */}
              <div
                className="border-b border-gray-200 p-4"
                style={{ backgroundColor: "rgb(2, 132, 199)" }}
              >
                <h3 className="text-lg font-semibold text-white">
                  P&L Summary
                </h3>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4">
                {/* Total P&L */}
                <div className="text-center">
                  <div
                    className={`text-3xl font-bold ${
                      filteredAndSearchedTrades.reduce(
                        (sum, trade) => sum + (trade.pnl || 0),
                        0
                      ) >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    $
                    {filteredAndSearchedTrades
                      .reduce((sum, trade) => sum + (trade.pnl || 0), 0)
                      .toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Total P&L</div>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-200"></div>

                {/* Stats Grid */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Win Rate</span>
                    <span className="font-semibold">
                      {filteredAndSearchedTrades.length > 0
                        ? `${(
                            (filteredAndSearchedTrades.filter((t) => t.pnl > 0)
                              .length /
                              filteredAndSearchedTrades.length) *
                            100
                          ).toFixed(1)}%`
                        : "0%"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      Winning Trades
                    </span>
                    <span className="font-semibold text-green-600">
                      {
                        filteredAndSearchedTrades.filter((t) => t.pnl > 0)
                          .length
                      }
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Losing Trades</span>
                    <span className="font-semibold text-red-600">
                      {
                        filteredAndSearchedTrades.filter((t) => t.pnl < 0)
                          .length
                      }
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Avg Win</span>
                    <span className="font-semibold text-green-600">
                      $
                      {filteredAndSearchedTrades.filter((t) => t.pnl > 0)
                        .length > 0
                        ? (
                            filteredAndSearchedTrades
                              .filter((t) => t.pnl > 0)
                              .reduce((sum, t) => sum + t.pnl, 0) /
                            filteredAndSearchedTrades.filter((t) => t.pnl > 0)
                              .length
                          ).toFixed(2)
                        : "0.00"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Avg Loss</span>
                    <span className="font-semibold text-red-600">
                      $
                      {filteredAndSearchedTrades.filter((t) => t.pnl < 0)
                        .length > 0
                        ? (
                            filteredAndSearchedTrades
                              .filter((t) => t.pnl < 0)
                              .reduce((sum, t) => sum + t.pnl, 0) /
                            filteredAndSearchedTrades.filter((t) => t.pnl < 0)
                              .length
                          ).toFixed(2)
                        : "0.00"}
                    </span>
                  </div>
                </div>

                {/* Visual Progress Bar for Win Rate */}
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Win Rate</span>
                    <span>
                      {filteredAndSearchedTrades.length > 0
                        ? `${(
                            (filteredAndSearchedTrades.filter((t) => t.pnl > 0)
                              .length /
                              filteredAndSearchedTrades.length) *
                            100
                          ).toFixed(1)}%`
                        : "0%"}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${
                          filteredAndSearchedTrades.length > 0
                            ? (filteredAndSearchedTrades.filter(
                                (t) => t.pnl > 0
                              ).length /
                                filteredAndSearchedTrades.length) *
                              100
                            : 0
                        }%`,
                      }}
                    ></div>
                  </div>
                </div>

                {/* Monthly Performance */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">
                    This Month
                  </h4>
                  <div className="space-y-2">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-xl font-bold text-gray-900">
                        {filteredAndSearchedTrades.length}
                      </div>
                      <div className="text-sm text-gray-600">Total Trades</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div
                        className={`text-xl font-bold ${
                          filteredAndSearchedTrades.reduce(
                            (sum, trade) => sum + (trade.pnl || 0),
                            0
                          ) >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {filteredAndSearchedTrades.reduce(
                          (sum, trade) => sum + (trade.pnl || 0),
                          0
                        ) >= 0
                          ? "+"
                          : ""}
                        $
                        {filteredAndSearchedTrades
                          .reduce((sum, trade) => sum + (trade.pnl || 0), 0)
                          .toFixed(0)}
                      </div>
                      <div className="text-sm text-gray-600">Monthly P&L</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Enhanced List View with Better Layout */}
          <TradeList
            trades={filteredAndSearchedTrades}
            onEditTrade={handleEditTrade}
            compact={false}
          />
        </div>
      )}

      {/* Trade Form Modal */}
      {showTradeForm && (
        <TradeForm
          trade={editingTrade}
          onClose={handleCloseForm}
          selectedDate={selectedDate}
        />
      )}

      {/* Broker Modal */}
      <BrokerModal
        isOpen={showBrokerModal}
        onClose={() => setShowBrokerModal(false)}
        onTradesImported={handleTradesImported}
      />
    </div>
  );
};

export default Trades;
