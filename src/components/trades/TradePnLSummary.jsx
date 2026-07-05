import React, { useMemo } from "react";
import PropTypes from "prop-types";
import { TrendingUp } from "lucide-react";

// Shared right-hand summary panel for the Trades page (Calendar + List views).
// Renders the headline realised P&L with a cumulative sparkline, the win/loss
// breakdown, a win-rate bar, and two compact stat cards beneath it.

const fmtMoney = (v) =>
  `${v < 0 ? "-" : ""}$${Math.abs(v).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const fmtSigned = (v) => `${v >= 0 ? "+" : "-"}$${Math.abs(v).toLocaleString()}`;

const tradeDate = (t) =>
  t.exitDate || t.exit_date || t.entryDate || t.entry_date || t.createdAt;

// Full-width cumulative-P&L area chart. Green when net positive, red otherwise.
const SummarySparkline = ({ data, positive }) => {
  if (!data || data.length < 2) {
    return <div className="h-20" data-testid="pnl-summary-sparkline-empty" />;
  }

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const stroke = positive ? "#16a34a" : "#ef4444";
  const gradId = positive ? "pnl-summary-grad-pos" : "pnl-summary-grad-neg";

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="h-20" data-testid="pnl-summary-sparkline">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={`0,100 ${points} 100,100`} fill={`url(#${gradId})`} />
        <polyline
          points={points}
          fill="none"
          stroke={stroke}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

SummarySparkline.propTypes = {
  data: PropTypes.arrayOf(PropTypes.number),
  positive: PropTypes.bool,
};

const StatRow = ({ label, value, valueClass, testId }) => (
  <div className="flex items-center justify-between">
    <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
    <span
      className={`text-sm font-semibold ${valueClass}`}
      data-testid={testId}
    >
      {value}
    </span>
  </div>
);

StatRow.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.node.isRequired,
  valueClass: PropTypes.string,
  testId: PropTypes.string,
};

const TradePnLSummary = ({ trades, variant }) => {
  const stats = useMemo(() => {
    const closed = trades.filter((t) => t && t.status === "closed");
    const winners = closed.filter((t) => (t.pnl || 0) > 0);
    const losers = closed.filter((t) => (t.pnl || 0) < 0);

    const total = closed.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const avgWin =
      winners.length > 0
        ? winners.reduce((sum, t) => sum + t.pnl, 0) / winners.length
        : 0;
    const avgLoss =
      losers.length > 0
        ? losers.reduce((sum, t) => sum + t.pnl, 0) / losers.length
        : 0;
    const decided = winners.length + losers.length;
    const winRate = decided > 0 ? (winners.length / decided) * 100 : 0;

    // Cumulative realised P&L over closed trades, oldest → newest.
    const cumulative = [];
    let running = 0;
    [...closed]
      .sort((a, b) => new Date(tradeDate(a)) - new Date(tradeDate(b)))
      .forEach((t) => {
        running += t.pnl || 0;
        cumulative.push(running);
      });
    if (cumulative.length > 0) cumulative.unshift(0); // anchor at zero baseline

    // Current-month realised P&L.
    const now = new Date();
    const monthlyPnL = closed.reduce((sum, t) => {
      const d = new Date(tradeDate(t));
      if (
        !isNaN(d.getTime()) &&
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth()
      ) {
        return sum + (t.pnl || 0);
      }
      return sum;
    }, 0);

    return {
      total,
      winners: winners.length,
      losers: losers.length,
      avgWin,
      avgLoss,
      winRate,
      cumulative,
      monthlyPnL,
      openPositions: trades.filter((t) => t && t.status === "open").length,
      totalTrades: trades.length,
    };
  }, [trades]);

  const positive = stats.total >= 0;

  return (
    <div className="space-y-4" data-testid="trade-pnl-summary">
      {/* Headline summary card */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            P&amp;L Summary
          </h3>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success-50 dark:bg-success-900/30 text-success-700 dark:text-success-400 text-xs font-medium">
            <TrendingUp className="w-3 h-3" />
            this month
          </span>
        </div>

        <div
          className={`text-lg font-bold tracking-tight tabular-nums ${
            positive
              ? "text-success-600 dark:text-success-400"
              : "text-danger-600 dark:text-danger-400"
          }`}
          data-testid="pnl-summary-total-value"
        >
          {fmtMoney(stats.total)}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Total realised P&amp;L
        </div>

        <div className="my-4">
          <SummarySparkline data={stats.cumulative} positive={positive} />
        </div>

        <div className="space-y-2.5">
          <StatRow
            label="Winning Trades"
            value={stats.winners}
            valueClass="text-success-600 dark:text-success-400"
            testId="pnl-summary-winning-value"
          />
          <StatRow
            label="Losing Trades"
            value={stats.losers}
            valueClass="text-danger-600 dark:text-danger-400"
            testId="pnl-summary-losing-value"
          />
          <StatRow
            label="Avg Win"
            value={fmtMoney(stats.avgWin)}
            valueClass="text-success-600 dark:text-success-400"
            testId="pnl-summary-avg-win-value"
          />
          <StatRow
            label="Avg Loss"
            value={fmtMoney(stats.avgLoss)}
            valueClass="text-danger-600 dark:text-danger-400"
            testId="pnl-summary-avg-loss-value"
          />
        </div>

        {/* Win rate + progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Win Rate
            </span>
            <span
              className="text-sm font-semibold text-gray-900 dark:text-gray-100"
              data-testid="pnl-summary-win-rate-value"
            >
              {stats.winRate.toFixed(1)}%
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-success-400 to-success-600 transition-all duration-500"
              style={{ width: `${Math.min(stats.winRate, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Two compact stat cards */}
      <div className="grid grid-cols-2 gap-4">
        {variant === "list" ? (
          <div className="card text-center" data-testid="pnl-summary-open-card">
            <div className="text-base font-bold tabular-nums text-primary-600 dark:text-primary-400">
              {stats.openPositions}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Open Positions
            </div>
          </div>
        ) : (
          <div className="card text-center" data-testid="pnl-summary-total-card">
            <div className="text-base font-bold tabular-nums text-gray-900 dark:text-gray-100">
              {stats.totalTrades}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Total Trades
            </div>
          </div>
        )}

        <div className="card text-center" data-testid="pnl-summary-monthly-card">
          <div
            className={`text-base font-bold tabular-nums ${
              stats.monthlyPnL >= 0
                ? "text-success-600 dark:text-success-400"
                : "text-danger-600 dark:text-danger-400"
            }`}
          >
            {fmtSigned(stats.monthlyPnL)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Monthly P&amp;L
          </div>
        </div>
      </div>
    </div>
  );
};

TradePnLSummary.propTypes = {
  trades: PropTypes.array.isRequired,
  variant: PropTypes.oneOf(["calendar", "list"]),
};

TradePnLSummary.defaultProps = {
  variant: "calendar",
};

export default TradePnLSummary;
