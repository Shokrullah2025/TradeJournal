import React from "react";
import PropTypes from "prop-types";
import { GitCompareArrows } from "lucide-react";

const Badge = ({ value }) => {
  const tone =
    value === "bullish"
      ? "bg-success-50 dark:bg-success-900/30 text-success-700 dark:text-success-300"
      : value === "bearish"
        ? "bg-danger-50 dark:bg-danger-900/30 text-danger-700 dark:text-danger-300"
        : "bg-gray-100 dark:bg-gray-700/40 text-gray-600 dark:text-gray-300";
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${tone}`}>
      {value || "none"}
    </span>
  );
};
Badge.propTypes = { value: PropTypes.string };

/** SMT divergence vs the correlated index — a crack in correlation. */
const SmtCard = ({ smt, symbol }) => (
  <div className="card" data-testid="ai-analysis-smt-card">
    <div className="flex items-center gap-2 mb-4">
      <GitCompareArrows className="w-5 h-5 text-primary-600 dark:text-primary-400" />
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        Correlated market (SMT)
      </h3>
    </div>

    {!smt || !smt.available ? (
      <p className="text-sm text-gray-500 dark:text-gray-400" data-testid="ai-analysis-smt-unavailable">
        SMT not available for this asset yet — divergence pairs currently cover the index futures
        (ES, NQ, YM, RTY and their micros).
      </p>
    ) : (
      <div className="space-y-3 text-sm" data-testid="ai-analysis-smt-value">
        <p className="text-gray-600 dark:text-gray-400">
          {symbol} checked against <span className="font-semibold">{smt.pairSymbol}</span> on
          prior-day and prior-week extremes.
        </p>
        <div className="flex items-center gap-3">
          <span className="w-24 text-gray-600 dark:text-gray-400">Daily</span>
          <Badge value={smt.daily} />
          {smt.daily && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {symbol} {smt.daily === "bearish" ? "made a higher high" : "made a lower low"} that{" "}
              {smt.pairSymbol} didn&apos;t confirm
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="w-24 text-gray-600 dark:text-gray-400">Weekly</span>
          <Badge value={smt.weekly} />
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          When correlated markets disagree at a liquidity level, the unconfirmed move is suspect.
        </p>
      </div>
    )}
  </div>
);

SmtCard.propTypes = {
  smt: PropTypes.shape({
    available: PropTypes.bool,
    pairSymbol: PropTypes.string,
    daily: PropTypes.string,
    weekly: PropTypes.string,
  }),
  symbol: PropTypes.string.isRequired,
};

export default SmtCard;
