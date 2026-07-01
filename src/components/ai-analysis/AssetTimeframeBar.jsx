import React from "react";
import PropTypes from "prop-types";
import { RefreshCw, Clock } from "lucide-react";
import { FUTURES_CONTRACTS } from "../../lib/futuresContracts";

export const TIMEFRAMES = ["5m", "15m", "30m", "1h", "4h", "1d"];

// Group contracts for the <select> (Indices / Energy / Metals / Bonds / FX).
const GROUPS = [...new Set(FUTURES_CONTRACTS.map((c) => c.group))];

const AssetTimeframeBar = ({
  symbol,
  timeframe,
  onSymbolChange,
  onTimeframeChange,
  onRefresh,
  loading,
  lastUpdated,
}) => {
  return (
    <div className="card">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <select
          value={symbol}
          onChange={(e) => onSymbolChange(e.target.value)}
          disabled={loading}
          data-testid="ai-analysis-symbol-select"
          className="select sm:w-64"
          aria-label="Futures contract"
        >
          {GROUPS.map((group) => (
            <optgroup key={group} label={group}>
              {FUTURES_CONTRACTS.filter((c) => c.group === group).map((c) => (
                <option key={c.symbol} value={c.symbol}>
                  {c.symbol} — {c.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        <div
          className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 w-fit"
          role="group"
          aria-label="Timeframe"
        >
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => onTimeframeChange(tf)}
              disabled={loading}
              data-testid={`ai-analysis-timeframe-${tf}-btn`}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                tf === timeframe
                  ? "bg-primary-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 sm:ml-auto">
          {lastUpdated && (
            <span
              className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400"
              data-testid="ai-analysis-last-updated"
            >
              <Clock className="w-3.5 h-3.5" />
              Yahoo data, ~15 min delayed · updated {lastUpdated}
            </span>
          )}
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            data-testid="ai-analysis-refresh-btn"
            className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium flex items-center gap-1 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>
    </div>
  );
};

AssetTimeframeBar.propTypes = {
  symbol: PropTypes.string.isRequired,
  timeframe: PropTypes.oneOf(TIMEFRAMES).isRequired,
  onSymbolChange: PropTypes.func.isRequired,
  onTimeframeChange: PropTypes.func.isRequired,
  onRefresh: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  lastUpdated: PropTypes.string,
};

export default AssetTimeframeBar;
