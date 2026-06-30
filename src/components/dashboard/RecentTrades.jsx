import React from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { TrendingUp, TrendingDown, Clock, Eye } from "lucide-react";

// Percentage return on the position's notional, guarding divide-by-zero.
const returnPct = (trade) => {
  const notional = (trade.entryPrice || 0) * (trade.quantity || 0);
  if (!notional) return null;
  return ((trade.pnl || 0) / notional) * 100;
};

const fmtPrice = (v) =>
  v || v === 0 ? `$${Number(v).toLocaleString()}` : "—";

const RecentTrades = ({ trades }) => {
  const navigate = useNavigate();

  // Open the Trades page and ask it to highlight this specific trade.
  const openTrade = (id) =>
    navigate("/trades", { state: { highlightTradeId: id } });

  if (trades.length === 0) {
    return (
      <div className="card w-full flex-1 flex flex-col" data-test-id="recent-trades-card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Recent Trades
        </h3>
        <div className="text-center py-8" data-test-id="recent-trades-empty-state">
          <Clock className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No trades yet</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            Your recent trades will appear here
          </p>
        </div>
      </div>
    );
  }

  return (
    // w-full + flex-1 so the card fills the full 2-column span inside the flex
    // wrapper — its right edge lines up with the Cumulative P&L card above.
    <div
      className="card w-full flex-1 flex flex-col"
      data-test-id="recent-trades-card"
    >
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-5">
        Recent Trades
      </h3>

      {/* Card tiles — one per trade, accent-tinted by win/loss. Tiles keep
          their natural size; the card stretches to align its bottom with the
          AI Insights card, leaving empty space below like the other cards. */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        data-test-id="recent-trades-list"
      >
        {trades.map((trade) => {
          const isWin = trade.pnl > 0;
          const isLong = trade.tradeType === "long";
          const isOpen = trade.status === "open";
          const pct = returnPct(trade);
          return (
            <div
              key={trade.id}
              role="button"
              tabIndex={0}
              onClick={() => openTrade(trade.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openTrade(trade.id);
                }
              }}
              data-test-id={`trade-row-${trade.id}`}
              className={`group relative flex flex-col rounded-xl border p-4 cursor-pointer transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-400 ${
                isWin
                  ? "border-success-200 dark:border-success-800/60 bg-success-50/50 dark:bg-success-900/15"
                  : "border-danger-200 dark:border-danger-800/60 bg-danger-50/50 dark:bg-danger-900/15"
              }`}
            >
              {/* Header: direction chip + instrument + status */}
              <div className="flex items-center gap-3">
                <div
                  className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
                    isWin
                      ? "bg-success-100 dark:bg-success-900/40 text-success-600 dark:text-success-400"
                      : "bg-danger-100 dark:bg-danger-900/40 text-danger-600 dark:text-danger-400"
                  }`}
                >
                  {isLong ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {trade.instrument}
                    </span>
                    <span
                      className={`text-[10px] font-medium uppercase tracking-wide ${
                        isLong
                          ? "text-success-600 dark:text-success-400"
                          : "text-danger-600 dark:text-danger-400"
                      }`}
                    >
                      {trade.tradeType}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {format(new Date(trade.entryDate), "MMM dd, yyyy")}
                  </div>
                </div>
                <span
                  className={`flex-shrink-0 px-2 py-0.5 text-[10px] font-medium rounded-full ${
                    isOpen
                      ? "bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-300"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                  }`}
                >
                  {trade.status}
                </span>
              </div>

              {/* P&L headline + return % */}
              <div className="mt-3 flex items-baseline justify-between">
                <span
                  className={`text-xl font-bold ${
                    isWin
                      ? "text-success-600 dark:text-success-400"
                      : "text-danger-600 dark:text-danger-400"
                  }`}
                  data-test-id={`trade-row-pnl-${trade.id}`}
                >
                  {isWin ? "+" : ""}${trade.pnl.toLocaleString()}
                </span>
                {pct !== null && (
                  <span
                    className={`text-xs font-medium ${
                      isWin
                        ? "text-success-600 dark:text-success-400"
                        : "text-danger-600 dark:text-danger-400"
                    }`}
                  >
                    {pct > 0 ? "+" : ""}
                    {pct.toFixed(2)}%
                  </span>
                )}
              </div>

              {/* Footer details: entry / exit / qty */}
              <div className="mt-3 pt-3 border-t border-gray-200/70 dark:border-gray-700/70 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <div className="text-gray-400 dark:text-gray-500">Entry</div>
                  <div className="font-medium text-gray-700 dark:text-gray-300">
                    {fmtPrice(trade.entryPrice)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400 dark:text-gray-500">Exit</div>
                  <div className="font-medium text-gray-700 dark:text-gray-300">
                    {fmtPrice(trade.exitPrice)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400 dark:text-gray-500">Qty</div>
                  <div className="font-medium text-gray-700 dark:text-gray-300">
                    {trade.quantity ?? "—"}
                  </div>
                </div>
              </div>

              {/* View affordance — appears on hover */}
              <Eye className="absolute top-3 right-3 w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          );
        })}
      </div>
    </div>
  );
};

RecentTrades.propTypes = {
  trades: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      instrument: PropTypes.string,
      tradeType: PropTypes.string,
      status: PropTypes.string,
      pnl: PropTypes.number,
      entryDate: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      entryPrice: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      exitPrice: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      quantity: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    }),
  ).isRequired,
};

export default RecentTrades;
