import React from "react";
import PropTypes from "prop-types";
import { Target, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

const pct = (v) => (v == null ? "—" : `${Math.round(v * 100)}%`);

const SCOPE_LABELS = {
  "direction+tier": (sig) => `Signals like this one (${sig.direction} · ${sig.tier} confluence)`,
  direction: (sig) => `Past ${sig.direction} signals`,
  all: () => "All past signals",
};

/**
 * "How likely does this hit?" — the measured outcome of replaying the same
 * rule set over the fetched history. Shows the cohort that matches the live
 * signal plus overall stats, and is explicit about sample size.
 */
const HitRateCard = ({ results, cohort, signal, timeframe }) => {
  const hasSignal = signal && signal.direction !== "neutral";
  const decided = cohort ? cohort.wins + cohort.losses : 0;
  const lowSample = hasSignal && cohort && decided < 20;

  return (
    <div className="card" data-testid="ai-analysis-hitrate-card">
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-5 h-5 text-primary-600 dark:text-primary-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Historical hit rate
        </h3>
      </div>

      {results.total === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400" data-testid="ai-analysis-hitrate-empty">
          Not enough history produced signals on this asset and timeframe yet.
        </p>
      ) : (
        <>
          {hasSignal && cohort && (
            <div className="mb-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {SCOPE_LABELS[cohort.scope](signal)}
              </div>
              <div
                className="text-3xl font-bold text-gray-900 dark:text-gray-100"
                data-testid="ai-analysis-hitrate-value"
              >
                {pct(cohort.winRate)}
                <span className="ml-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                  hit the target first · {cohort.total} samples
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">All signals ({timeframe})</div>
              <div className="font-semibold text-gray-900 dark:text-gray-100" data-testid="ai-analysis-hitrate-overall">
                {pct(results.winRate)} of {results.wins + results.losses} decided
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Avg result</div>
              <div className="font-semibold text-gray-900 dark:text-gray-100" data-testid="ai-analysis-avgr-value">
                {results.avgR == null ? "—" : `${results.avgR >= 0 ? "+" : ""}${results.avgR.toFixed(2)}R`}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Expired unresolved</div>
              <div className="font-semibold text-gray-900 dark:text-gray-100">{results.expired}</div>
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
                Only {decided} resolved samples for this setup — treat the hit rate as a rough
                guide, not a statistic.
              </p>
            </div>
          )}

          <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
            Measured by replaying today&apos;s rules over the loaded history (stop assumed to fill
            first when a bar touches both levels). Past performance does not predict future results.
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
    avgR: PropTypes.number,
    firstTime: PropTypes.number,
  }).isRequired,
  cohort: PropTypes.shape({
    scope: PropTypes.oneOf(["direction+tier", "direction", "all"]),
    winRate: PropTypes.number,
    wins: PropTypes.number,
    losses: PropTypes.number,
    total: PropTypes.number,
  }),
  signal: PropTypes.shape({
    direction: PropTypes.string,
    tier: PropTypes.string,
  }),
  timeframe: PropTypes.string.isRequired,
};

export default HitRateCard;
