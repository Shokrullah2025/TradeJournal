import React, { useState, useMemo, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { format } from "date-fns";
import { TrendingUp, TrendingDown } from "lucide-react";
import { tagColor } from "../../utils/tagColor";

// Dense, grouped-by-day trade list with an "Open positions" lead group, a
// win/loss/open filter, and pagination. Designed to sit beside the P&L summary.

const PAGE_SIZE = 30;

const TABS = [
  { key: "all", label: "All" },
  { key: "wins", label: "Wins" },
  { key: "losses", label: "Losses" },
  { key: "open", label: "Open" },
];

const fmtSigned = (v) =>
  `${v >= 0 ? "+" : "-"}$${Math.abs(v).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })}`;

const fmtPrice = (v) =>
  v || v === 0 ? Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—";

const tradeDate = (t) => t.entryDate || t.entry_date || t.createdAt;

const initials = (symbol) =>
  String(symbol || "?")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 2)
    .toUpperCase() || "?";

const TradeRow = ({ trade, onEditTrade, flash, rowRef }) => {
  const isOpen = trade.status === "open";
  const isLong = trade.tradeType === "long";
  const isWin = (trade.pnl || 0) > 0;
  const { bg, text } = tagColor(trade.instrument || "?");

  let badge;
  if (isOpen) {
    badge = {
      label: "Open",
      cls: "bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 ring-primary-200 dark:ring-primary-800",
    };
  } else if (isWin) {
    badge = {
      label: "Win",
      cls: "bg-success-50 dark:bg-success-900/25 text-success-600 dark:text-success-400 ring-success-200 dark:ring-success-800",
    };
  } else {
    badge = {
      label: "Loss",
      cls: "bg-danger-50 dark:bg-danger-900/25 text-danger-600 dark:text-danger-400 ring-danger-200 dark:ring-danger-800",
    };
  }

  return (
    <div
      ref={rowRef}
      role="button"
      tabIndex={0}
      onClick={() => onEditTrade?.(trade)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onEditTrade?.(trade);
        }
      }}
      data-test-id={`trade-row-${trade.id}`}
      className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors focus:outline-none ${
        flash
          ? "bg-primary-100 dark:bg-primary-900/40 ring-2 ring-inset ring-primary-400"
          : "hover:bg-gray-50 dark:hover:bg-gray-700/40"
      }`}
    >
      {/* Avatar */}
      <div
        className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold"
        style={{ backgroundColor: bg, color: text }}
        aria-hidden="true"
      >
        {initials(trade.instrument)}
      </div>

      {/* Symbol + strategy */}
      <div className="min-w-0 w-28 sm:w-32">
        <div
          className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate"
          data-test-id={`trade-row-instrument-${trade.id}`}
        >
          {trade.instrument}
        </div>
        {trade.strategy && (
          <div className="text-xs text-gray-400 dark:text-gray-500 truncate">
            {trade.strategy}
          </div>
        )}
      </div>

      {/* Direction */}
      <div className="hidden sm:flex items-center gap-1 w-20">
        {isLong ? (
          <TrendingUp className="w-3.5 h-3.5 text-success-500" />
        ) : (
          <TrendingDown className="w-3.5 h-3.5 text-danger-500" />
        )}
        <span className="text-sm text-gray-600 dark:text-gray-300">
          {isLong ? "Long" : "Short"}
        </span>
      </div>

      {/* Entry → Exit */}
      <div className="hidden md:block w-36 text-sm text-gray-500 dark:text-gray-400 tabular-nums">
        {fmtPrice(trade.entryPrice)} <span className="mx-1">→</span>{" "}
        {isOpen ? "—" : fmtPrice(trade.exitPrice)}
      </div>

      {/* Quantity */}
      <div className="hidden lg:block w-16 text-sm text-gray-500 dark:text-gray-400 tabular-nums">
        {trade.quantity ?? "—"}
      </div>

      {/* P&L */}
      <div
        className={`flex-1 text-right text-sm font-semibold tabular-nums ${
          isOpen
            ? (trade.pnl || 0) >= 0
              ? "text-success-600 dark:text-success-400"
              : "text-danger-600 dark:text-danger-400"
            : isWin
            ? "text-success-600 dark:text-success-400"
            : "text-danger-600 dark:text-danger-400"
        }`}
        data-test-id={`trade-row-pnl-${trade.id}`}
      >
        {fmtSigned(trade.pnl || 0)}
      </div>

      {/* Status badge */}
      <div className="w-16 flex justify-end">
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium ring-1 ${badge.cls}`}
        >
          {badge.label}
        </span>
      </div>
    </div>
  );
};

TradeRow.propTypes = {
  trade: PropTypes.object.isRequired,
  onEditTrade: PropTypes.func,
  flash: PropTypes.bool,
  rowRef: PropTypes.func,
};

const GroupHeader = ({ title, subtitle, total, testId }) => (
  <div
    className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700"
    data-test-id={testId}
  >
    <div className="text-sm">
      <span className="font-semibold text-gray-900 dark:text-gray-100">
        {title}
      </span>
      {subtitle && (
        <span className="text-gray-400 dark:text-gray-500"> · {subtitle}</span>
      )}
    </div>
    <span
      className={`text-sm font-semibold tabular-nums ${
        total >= 0
          ? "text-success-600 dark:text-success-400"
          : "text-danger-600 dark:text-danger-400"
      }`}
    >
      {fmtSigned(total)}
    </span>
  </div>
);

GroupHeader.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  total: PropTypes.number.isRequired,
  testId: PropTypes.string,
};

const TradeListView = ({ trades, onEditTrade, highlightTradeId }) => {
  const [activeTab, setActiveTab] = useState("all");
  const [page, setPage] = useState(1);

  // Highlight + scroll-to a trade opened from the Dashboard.
  const rowRefs = useRef({});
  const [flashId, setFlashId] = useState(null);

  useEffect(() => {
    if (!highlightTradeId) return;
    if (!trades.some((t) => t.id === highlightTradeId)) return;
    setFlashId(highlightTradeId);
    const el = rowRefs.current[highlightTradeId];
    if (el?.scrollIntoView) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    const timer = setTimeout(() => setFlashId(null), 2600);
    return () => clearTimeout(timer);
  }, [highlightTradeId, trades]);

  // Reset to first page whenever the filter or underlying data changes.
  useEffect(() => {
    setPage(1);
  }, [activeTab, trades]);

  const filtered = useMemo(() => {
    switch (activeTab) {
      case "wins":
        return trades.filter((t) => t.status === "closed" && (t.pnl || 0) > 0);
      case "losses":
        return trades.filter((t) => t.status === "closed" && (t.pnl || 0) < 0);
      case "open":
        return trades.filter((t) => t.status === "open");
      default:
        return trades;
    }
  }, [trades, activeTab]);

  // Open positions lead the list, then closed trades newest-first.
  const ordered = useMemo(() => {
    const open = filtered
      .filter((t) => t.status === "open")
      .sort((a, b) => new Date(tradeDate(b)) - new Date(tradeDate(a)));
    const closed = filtered
      .filter((t) => t.status !== "open")
      .sort((a, b) => new Date(tradeDate(b)) - new Date(tradeDate(a)));
    return [...open, ...closed];
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(ordered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageSlice = ordered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  // Split the current page into the open group + day groups (closed).
  const { openOnPage, dayGroups } = useMemo(() => {
    const openOnPage = pageSlice.filter((t) => t.status === "open");
    const closedOnPage = pageSlice.filter((t) => t.status !== "open");
    const map = new Map();
    closedOnPage.forEach((t) => {
      const key = (tradeDate(t) || "").substring(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(t);
    });
    const dayGroups = [...map.entries()].sort((a, b) =>
      b[0].localeCompare(a[0]),
    );
    return { openOnPage, dayGroups };
  }, [pageSlice]);

  const setRowRef = (id) => (el) => {
    rowRefs.current[id] = el;
  };

  return (
    <div data-test-id="trade-list-view" className="space-y-4">
      {/* Header: title + tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            All Trades
          </h2>
          <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-xs font-medium text-gray-500 dark:text-gray-400">
            {trades.length} total
          </span>
        </div>
        <div
          className="flex items-center gap-4 text-sm"
          data-test-id="trade-list-tabs"
        >
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              data-test-id={`trade-list-tab-${tab.key}-btn`}
              className={`font-medium transition-colors ${
                activeTab === tab.key
                  ? "text-primary-600 dark:text-primary-400"
                  : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {ordered.length === 0 ? (
        <div className="card text-center py-12" data-test-id="trades-empty-state">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No trades found
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Try a different filter or add your first trade.
          </p>
        </div>
      ) : (
        <>
          {/* Open positions group */}
          {openOnPage.length > 0 && (
            <div className="card !p-0 overflow-hidden">
              <GroupHeader
                title="Open positions"
                subtitle="live · unrealized"
                total={openOnPage.reduce((s, t) => s + (t.pnl || 0), 0)}
                testId="trade-list-open-group-header"
              />
              <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {openOnPage.map((trade) => (
                  <TradeRow
                    key={trade.id}
                    trade={trade}
                    onEditTrade={onEditTrade}
                    flash={flashId === trade.id}
                    rowRef={setRowRef(trade.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Day groups */}
          {dayGroups.map(([dateKey, dayTrades]) => {
            const dayTotal = dayTrades.reduce((s, t) => s + (t.pnl || 0), 0);
            const parsed = new Date(`${dateKey}T12:00:00`);
            return (
              <div key={dateKey} className="card !p-0 overflow-hidden">
                <GroupHeader
                  title={format(parsed, "EEE, MMM d")}
                  subtitle={`${dayTrades.length} trade${
                    dayTrades.length !== 1 ? "s" : ""
                  }`}
                  total={dayTotal}
                  testId={`trade-list-day-group-${dateKey}`}
                />
                <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
                  {dayTrades.map((trade) => (
                    <TradeRow
                      key={trade.id}
                      trade={trade}
                      onEditTrade={onEditTrade}
                      flash={flashId === trade.id}
                      rowRef={setRowRef(trade.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Pagination */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Showing{" "}
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {pageSlice.length}
              </span>{" "}
              of {ordered.length} trades
            </span>
            {totalPages > 1 && (
              <div
                className="flex items-center gap-1"
                data-test-id="trade-list-pagination"
              >
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  data-test-id="trade-list-prev-btn"
                  className="px-2.5 py-1 rounded-md text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ‹
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    data-test-id={`trade-list-page-${p}-btn`}
                    className={`min-w-[28px] px-2 py-1 rounded-md text-sm font-medium transition-colors ${
                      p === safePage
                        ? "bg-primary-600 text-white"
                        : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  data-test-id="trade-list-next-btn"
                  className="px-2.5 py-1 rounded-md text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ›
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

TradeListView.propTypes = {
  trades: PropTypes.array.isRequired,
  onEditTrade: PropTypes.func,
  highlightTradeId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default TradeListView;
