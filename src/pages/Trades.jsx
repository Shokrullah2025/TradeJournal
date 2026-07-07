import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import {
  Plus,
  Filter,
  Download,
  Upload,
  Search,
  List,
  Calendar as CalendarIcon,
} from "lucide-react";
import { useTrades } from "../context/TradeContext";
import TradeForm from "../components/trades/TradeForm";
import TradeFilters from "../components/trades/TradeFilters";
import TradeCalendar from "../components/trades/TradeCalendar";
import TradeListView from "../components/trades/TradeListView";
import TradePnLSummary from "../components/trades/TradePnLSummary";
import CsvImportModal from "../components/trades/CsvImportModal";
import { MiniLineChart } from "../components/dashboard/MiniCharts";
import { exportToExcel } from "../utils/exportUtils";
import toast from "react-hot-toast";

const tradeDateOf = (t) => t.entryDate || t.entry_date || t.createdAt;

// Cumulative sparkline series (one running total per day, oldest → newest).
const cumulativeSeries = (trades, predicate) => {
  const byDay = {};
  trades.forEach((t) => {
    if (predicate && !predicate(t)) return;
    const key = (tradeDateOf(t) || "").substring(0, 10);
    if (!key) return;
    byDay[key] = (byDay[key] || 0) + 1;
  });
  const sorted = Object.keys(byDay).sort();
  let running = 0;
  const series = sorted.map((k) => (running += byDay[k]));
  // MiniLineChart divides by (length - 1); a lone point would render NaN.
  return series.length < 2 ? [] : series;
};

const StatTile = ({ label, value, valueClass, badge, sparkline, subtitle, testId }) => (
  <div className="card flex flex-col gap-2" data-testid={testId}>
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
        {label}
      </span>
      {badge}
    </div>
    <div className={`text-2xl font-bold ${valueClass}`}>{value}</div>
    {subtitle ? (
      <div className="text-xs text-gray-400 dark:text-gray-500">{subtitle}</div>
    ) : (
      <div className="h-8">{sparkline}</div>
    )}
  </div>
);

// Bordered secondary button with a clear hover state (the global `btn-secondary`
// class is not defined, so style explicitly here).
const SECONDARY_BTN =
  "btn flex items-center gap-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent";

const Trades = () => {
  const { filteredTrades, trades, importTrades, searchTerm, setSearchTerm } =
    useTrades();
  const location = useLocation();
  const [showTradeForm, setShowTradeForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [editingTrade, setEditingTrade] = useState(null);
  // searchTerm/setSearchTerm come from TradeContext so the header search bar
  // and this page's input drive the same filter.
  const [selectedDate, setSelectedDate] = useState(null);
  // A trade clicked from the Dashboard arrives via navigation state. Capture it
  // once into local state so it survives clearing the history entry below.
  const [highlightTradeId, setHighlightTradeId] = useState(
    location.state?.highlightTradeId ?? null,
  );
  // Land on the List view when asked to highlight a specific trade (the row to
  // scroll to lives there, not in the calendar) or when arriving from the
  // header search bar (matches are rows, not calendar days).
  const [activeView, setActiveView] = useState(
    location.state?.highlightTradeId || location.state?.fromHeaderSearch
      ? "list"
      : "calendar",
  );

  // Handle OAuth success message
  useEffect(() => {
    if (location.state?.oauthSuccess) {
      toast.success(`Successfully connected to ${location.state.broker}!`);
      // Clear the state to prevent showing the message again
      window.history.replaceState(null, "");
    }
  }, [location.state]);

  // Consume the highlight request so a manual refresh won't re-trigger it.
  useEffect(() => {
    if (location.state?.highlightTradeId) {
      setHighlightTradeId(location.state.highlightTradeId);
      setActiveView("list");
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

  const filteredAndSearchedTrades = useMemo(
    () =>
      filteredTrades.filter((trade) => {
        if (!searchTerm) return true;
        const searchLower = searchTerm.toLowerCase();
        return (
          trade.instrument.toLowerCase().includes(searchLower) ||
          trade.strategy?.toLowerCase().includes(searchLower) ||
          trade.notes?.toLowerCase().includes(searchLower) ||
          trade.tags?.some((tag) => tag.toLowerCase().includes(searchLower))
        );
      }),
    [filteredTrades, searchTerm],
  );

  // Aggregates for the bottom stat tiles (calendar view).
  const tileStats = useMemo(() => {
    const closed = filteredTrades.filter((t) => t.status === "closed");
    const winners = closed.filter((t) => (t.pnl || 0) > 0).length;
    const losers = closed.filter((t) => (t.pnl || 0) < 0).length;
    const total = filteredTrades.length;
    return {
      total,
      open: filteredTrades.filter((t) => t.status === "open").length,
      winners,
      losers,
      winPct: total ? Math.round((winners / total) * 100) : 0,
      losePct: total ? Math.round((losers / total) * 100) : 0,
      totalSeries: cumulativeSeries(filteredTrades),
      winSeries: cumulativeSeries(filteredTrades, (t) => t.status === "closed" && (t.pnl || 0) > 0),
      loseSeries: cumulativeSeries(filteredTrades, (t) => t.status === "closed" && (t.pnl || 0) < 0),
    };
  }, [filteredTrades]);

  const viewToggle = (
    <div
      className="inline-flex items-center gap-1 rounded-lg bg-gray-100 dark:bg-gray-800 p-1"
      data-testid="trades-view-toggle"
    >
      <button
        onClick={() => setActiveView("calendar")}
        data-testid="trades-calendar-view-btn"
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          activeView === "calendar"
            ? "bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm"
            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        }`}
      >
        <CalendarIcon className="w-4 h-4" />
        <span>Calendar</span>
      </button>
      <button
        onClick={() => setActiveView("list")}
        data-testid="trades-list-view-btn"
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          activeView === "list"
            ? "bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm"
            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        }`}
      >
        <List className="w-4 h-4" />
        <span>List</span>
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Page title */}
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        ZalorTrade
      </h1>

      {/* Toolbar: view toggle (left) + actions (right) */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        {viewToggle}

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowCsvModal(true)}
            className={SECONDARY_BTN}
            data-testid="open-csv-import-btn"
            title="Import trades from a CSV file"
          >
            <Upload className="w-4 h-4" />
            <span>Import</span>
          </button>

          <button
            onClick={handleExport}
            disabled={trades.length === 0}
            className={SECONDARY_BTN}
            title={
              trades.length === 0
                ? "No trades to export yet"
                : "Export all trades to an Excel file"
            }
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>

          <button
            onClick={() => setShowTradeForm(true)}
            className="btn btn-gradient flex items-center gap-2"
            title="Log a new trade"
          >
            <Plus className="w-4 h-4" />
            <span>Add Trade</span>
          </button>
        </div>
      </div>

      {/* Search + filters (filters toggle sits to the right of search) */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search symbol, strategy, notes, tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="trades-search-input"
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            data-testid="trades-filters-toggle-btn"
            title="Filter trades"
            className={
              showFilters
                ? "btn btn-primary flex items-center gap-2"
                : SECONDARY_BTN
            }
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </button>
        </div>

        {showFilters && (
          <div className="mt-3 card">
            <TradeFilters />
          </div>
        )}
      </div>

      {/* Content */}
      {activeView === "calendar" ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            <div className="xl:col-span-3">
              <TradeCalendar
                trades={filteredAndSearchedTrades}
                onAddTrade={handleAddTradeForDate}
                onEditTrade={handleEditTrade}
              />
            </div>
            <div className="xl:col-span-1">
              <div className="xl:sticky xl:top-6">
                <TradePnLSummary
                  trades={filteredAndSearchedTrades}
                  variant="calendar"
                />
              </div>
            </div>
          </div>

          {/* Bottom stat tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatTile
              testId="trades-stat-total"
              label="Total Trades"
              value={tileStats.total}
              valueClass="text-gray-900 dark:text-gray-100"
              badge={
                <span className="px-2 py-0.5 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-[10px] font-medium">
                  all time
                </span>
              }
              sparkline={<MiniLineChart data={tileStats.totalSeries} color="blue" />}
            />
            <StatTile
              testId="trades-stat-open"
              label="Open Positions"
              value={tileStats.open}
              valueClass="text-primary-600 dark:text-primary-400"
              badge={<span className="w-2 h-2 rounded-full bg-primary-500" />}
              subtitle="Live · awaiting close"
            />
            <StatTile
              testId="trades-stat-winning"
              label="Winning"
              value={tileStats.winners}
              valueClass="text-success-600 dark:text-success-400"
              badge={
                <span className="text-[10px] font-medium text-success-600 dark:text-success-400">
                  {tileStats.winPct}%
                </span>
              }
              sparkline={<MiniLineChart data={tileStats.winSeries} color="green" positive />}
            />
            <StatTile
              testId="trades-stat-losing"
              label="Losing"
              value={tileStats.losers}
              valueClass="text-danger-600 dark:text-danger-400"
              badge={
                <span className="text-[10px] font-medium text-danger-600 dark:text-danger-400">
                  {tileStats.losePct}%
                </span>
              }
              sparkline={<MiniLineChart data={tileStats.loseSeries} color="red" />}
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <div className="xl:col-span-3">
            <TradeListView
              trades={filteredAndSearchedTrades}
              onEditTrade={handleEditTrade}
              highlightTradeId={highlightTradeId}
              searchTerm={searchTerm}
            />
          </div>
          <div className="xl:col-span-1">
            <div className="xl:sticky xl:top-6">
              <TradePnLSummary
                trades={filteredAndSearchedTrades}
                variant="list"
              />
            </div>
          </div>
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

      {/* CSV Import Modal */}
      <CsvImportModal
        isOpen={showCsvModal}
        onClose={() => setShowCsvModal(false)}
        onImported={handleTradesImported}
      />
    </div>
  );
};

export default Trades;
