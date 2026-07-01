import React from "react";
import PropTypes from "prop-types";
import { TrendingUp, TrendingDown, Minus, ArrowUp, ArrowDown } from "lucide-react";

const BIAS_STYLES = {
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
    label: "Neutral",
  },
};

/**
 * The ICT daily bias: badge, candle classification, and the signed factor
 * checklist. A neutral bias still shows every factor — "the day doesn't line
 * up" is a finding, not an empty state.
 */
const DailyBiasCard = ({ bias, symbol }) => {
  const b = bias?.bias || "neutral";
  const { badge, Icon, label } = BIAS_STYLES[b];
  const cls = bias?.snapshot?.classification;

  return (
    <div className="card" data-testid="ai-analysis-bias-card">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Daily bias</h3>
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm font-semibold ${badge}`}
          data-testid="ai-analysis-bias-value"
        >
          <Icon className="w-4 h-4" />
          {label}
        </span>
      </div>

      {bias?.forDayKey && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          For the {bias.forDayKey} session · from {symbol}&apos;s daily close on {bias.computedFrom.dayKey}
          {bias.maxScore > 0 && (
            <span data-testid="ai-analysis-bias-confidence-value">
              {" "}· conviction {bias.confidencePct}%
            </span>
          )}
        </p>
      )}

      {cls && (
        <p
          className="text-sm text-gray-700 dark:text-gray-300 mb-4"
          data-testid="ai-analysis-bias-classification"
        >
          <span className="font-semibold capitalize">
            {cls.type}
            {cls.direction !== "none" ? ` ${cls.direction}` : ""}
          </span>
          {" — "}
          {cls.detail}. Closed in the {cls.closeLocation} third of the day.
        </p>
      )}

      {bias?.reasons?.length > 0 ? (
        <div className="space-y-1.5" data-testid="ai-analysis-bias-reasons-list">
          {bias.reasons.map((f) => (
            <div key={f.key} className="flex items-start gap-2 text-sm">
              {f.points > 0 ? (
                <ArrowUp className="w-4 h-4 mt-0.5 text-success-600 dark:text-success-400 flex-shrink-0" />
              ) : f.points < 0 ? (
                <ArrowDown className="w-4 h-4 mt-0.5 text-danger-600 dark:text-danger-400 flex-shrink-0" />
              ) : (
                <Minus className="w-4 h-4 mt-0.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
              )}
              <div className="min-w-0">
                <span className="text-gray-700 dark:text-gray-300">{f.label}</span>
                <span className="block text-xs text-gray-500 dark:text-gray-400">{f.detail}</span>
              </div>
              <span className="ml-auto text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {f.maxPoints === 0 && f.points === 0
                  ? "n/a"
                  : `${f.points > 0 ? `+${f.points}` : f.points}`}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400" data-testid="ai-analysis-bias-warmup">
          Not enough daily history yet to compute the bias.
        </p>
      )}
    </div>
  );
};

DailyBiasCard.propTypes = {
  bias: PropTypes.shape({
    bias: PropTypes.oneOf(["long", "short", "neutral"]),
    score: PropTypes.number,
    maxScore: PropTypes.number,
    confidencePct: PropTypes.number,
    forDayKey: PropTypes.string,
    computedFrom: PropTypes.shape({ dayKey: PropTypes.string, time: PropTypes.number }),
    reasons: PropTypes.arrayOf(
      PropTypes.shape({
        key: PropTypes.string,
        label: PropTypes.string,
        points: PropTypes.number,
        maxPoints: PropTypes.number,
        detail: PropTypes.string,
      }),
    ),
    snapshot: PropTypes.object,
  }),
  symbol: PropTypes.string.isRequired,
};

export default DailyBiasCard;
