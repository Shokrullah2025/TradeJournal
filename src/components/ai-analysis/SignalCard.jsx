import React from "react";
import PropTypes from "prop-types";
import { TrendingUp, TrendingDown, Minus, Check, X } from "lucide-react";

const DIRECTION_STYLES = {
  long: {
    badge: "bg-success-50 dark:bg-success-900/30 text-success-700 dark:text-success-300 border-success-100 dark:border-success-800",
    Icon: TrendingUp,
    label: "Long bias",
  },
  short: {
    badge: "bg-danger-50 dark:bg-danger-900/30 text-danger-700 dark:text-danger-300 border-danger-100 dark:border-danger-800",
    Icon: TrendingDown,
    label: "Short bias",
  },
  neutral: {
    badge: "bg-gray-50 dark:bg-gray-700/40 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600",
    Icon: Minus,
    label: "No setup",
  },
};

const fmt = (v) => (v == null ? "—" : Number(v).toLocaleString(undefined, { maximumFractionDigits: 5 }));

/** The computed signal: direction, confluence score breakdown, and levels. */
const SignalCard = ({ signal, symbol }) => {
  const dir = signal?.direction || "neutral";
  const { badge, Icon, label } = DIRECTION_STYLES[dir];

  return (
    <div className="card" data-testid="ai-analysis-signal-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Signal</h3>
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm font-semibold ${badge}`}
          data-testid="ai-analysis-direction-value"
        >
          <Icon className="w-4 h-4" />
          {label}
        </span>
      </div>

      {dir === "neutral" ? (
        <p className="text-sm text-gray-500 dark:text-gray-400" data-testid="ai-analysis-no-setup">
          The rules don&apos;t line up for {symbol} on this timeframe right now — no trade is
          suggested. Waiting for trend, momentum and location to agree beats forcing an entry.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Confluence</div>
              <div
                className="text-xl font-bold text-gray-900 dark:text-gray-100"
                data-testid="ai-analysis-confluence-value"
              >
                {signal.confluencePct}%
                <span className="ml-1 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  {signal.tier}
                </span>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Entry zone</div>
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-1" data-testid="ai-analysis-entry-value">
                {fmt(signal.entryZone?.[0])} – {fmt(signal.entryZone?.[1])}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Stop loss</div>
              <div className="text-sm font-semibold text-danger-600 dark:text-danger-400 mt-1" data-testid="ai-analysis-stop-value">
                {fmt(signal.stopLoss)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Take profit ({signal.rTarget}R)
              </div>
              <div className="text-sm font-semibold text-success-600 dark:text-success-400 mt-1" data-testid="ai-analysis-target-value">
                {fmt(signal.takeProfit)}
              </div>
            </div>
          </div>
        </>
      )}

      {signal?.factors?.length > 0 && (
        <div className="space-y-1.5" data-testid="ai-analysis-factors-list">
          {signal.factors.map((f) => (
            <div key={f.key} className="flex items-start gap-2 text-sm">
              {f.passed ? (
                <Check className="w-4 h-4 mt-0.5 text-success-600 dark:text-success-400 flex-shrink-0" />
              ) : (
                <X className="w-4 h-4 mt-0.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
              )}
              <span className="text-gray-700 dark:text-gray-300">{f.label}</span>
              <span className="ml-auto text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {f.points > 0 ? `+${f.points}` : f.points} / {f.maxPoints}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

SignalCard.propTypes = {
  signal: PropTypes.shape({
    direction: PropTypes.oneOf(["long", "short", "neutral"]),
    confluencePct: PropTypes.number,
    tier: PropTypes.string,
    entry: PropTypes.number,
    entryZone: PropTypes.arrayOf(PropTypes.number),
    stopLoss: PropTypes.number,
    takeProfit: PropTypes.number,
    rTarget: PropTypes.number,
    factors: PropTypes.arrayOf(
      PropTypes.shape({
        key: PropTypes.string,
        label: PropTypes.string,
        points: PropTypes.number,
        maxPoints: PropTypes.number,
        passed: PropTypes.bool,
        detail: PropTypes.string,
      }),
    ),
  }),
  symbol: PropTypes.string.isRequired,
};

export default SignalCard;
