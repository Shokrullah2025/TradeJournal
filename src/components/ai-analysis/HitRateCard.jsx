import React from "react";
import PropTypes from "prop-types";
import { Target, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

const pct = (v) => (v == null ? "—" : `${Math.round(v * 100)}%`);

const SCOPE_LABELS = {
  bias: (b) => `Past ${b.bias}-bias days`,
  all: () => "All past bias days",
};

/**
 * "How often is this bias right?" — the measured outcome of replaying the
 * same bias rules over the daily history: did the next day run the liquidity
 * the bias pointed at? Explicit about sample size and about what the replay
 * cannot see (intraday sessions).
 */
const HitRateCard = ({ results, cohort, bias }) => {
  const hasBias = bias && bias.bias !== "neutral";
  const decided = cohort ? cohort.wins + cohort.losses : 0;
  const lowSample = hasBias && cohort && decided < 20;

  return (
    <div className="card" data-testid="ai-analysis-hitrate-card">
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-5 h-5 text-primary-600 dark:text-primary-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Bias accuracy
        </h3>
      </div>

      {results.total === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400" data-testid="ai-analysis-hitrate-empty">
          The history hasn&apos;t produced any non-neutral bias days for this asset yet.
        </p>
      ) : (
        <>
          {hasBias && cohort && (
            <div className="mb-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {SCOPE_LABELS[cohort.scope](bias)}
              </div>
              <div
                className="text-3xl font-bold text-gray-900 dark:text-gray-100"
                data-testid="ai-analysis-hitrate-value"
              >
                {pct(cohort.winRate)}
                <span className="ml-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                  called the next day correctly · {cohort.total} samples
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">All bias days (1d)</div>
              <div className="font-semibold text-gray-900 dark:text-gray-100" data-testid="ai-analysis-hitrate-overall">
                {pct(results.winRate)} of {results.wins + results.losses} decided
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Long-bias days</div>
              <div className="font-semibold text-gray-900 dark:text-gray-100" data-testid="ai-analysis-hitrate-long">
                {pct(results.byBias?.long?.winRate)} of {results.byBias?.long?.total ?? 0}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Short-bias days</div>
              <div className="font-semibold text-gray-900 dark:text-gray-100" data-testid="ai-analysis-hitrate-short">
                {pct(results.byBias?.short?.winRate)} of {results.byBias?.short?.total ?? 0}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">History window</div>
              <div className="font-semibold text-gray-900 dark:text-gray-100">
                {results.firstTime ? `${format(new Date(results.firstTime * 1000), "MMM d, yyyy")} →` : "—"}
              </div>
            </div>
          </div>

          {lowSample && (
            <div
              className="mt-4 p-3 rounded-lg bg-warning-50 dark:bg-warning-900/30 border border-warning-100 dark:border-warning-800 flex items-start gap-2"
              data-testid="ai-analysis-low-sample-warning"
            >
              <AlertTriangle className="w-4 h-4 text-warning-600 dark:text-warning-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-warning-700 dark:text-warning-300">
                Only {decided} resolved samples for this bias — treat the accuracy as a rough guide,
                not a statistic.
              </p>
            </div>
          )}

          <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
            Measured by replaying today&apos;s bias rules over the daily history: a bias is correct
            when the next day runs the prior day&apos;s high (long) or low (short); a day that takes
            both counts against the bias. The replay cannot see intraday sessions, so the session
            factor is live-only. Past performance does not predict future results.
          </p>
        </>
      )}
    </div>
  );
};

HitRateCard.propTypes = {
  results: PropTypes.shape({
    total: PropTypes.number,
    wins: PropTypes.number,
    losses: PropTypes.number,
    expired: PropTypes.number,
    winRate: PropTypes.number,
    byBias: PropTypes.shape({
      long: PropTypes.object,
      short: PropTypes.object,
    }),
    firstTime: PropTypes.number,
  }).isRequired,
  cohort: PropTypes.shape({
    scope: PropTypes.oneOf(["bias", "all"]),
    winRate: PropTypes.number,
    wins: PropTypes.number,
    losses: PropTypes.number,
    total: PropTypes.number,
  }),
  bias: PropTypes.shape({
    bias: PropTypes.string,
  }),
};

export default HitRateCard;
