import React from "react";
import PropTypes from "prop-types";
import { Gauge, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

const pct = (v) => (v == null ? "—" : `${Math.round(v * 100)}%`);
const rr = (v) => (v == null ? "—" : `${v >= 0 ? "+" : ""}${v.toFixed(2)}R`);

const SCOPE_LABELS = {
  direction: (s) => `Past ${s.direction} setups`,
  all: () => "All past setups",
};

/**
 * Measured performance of the ENTRY model: the full pipeline (bias gate → OB →
 * rejection → SMT → entry/stop/target) replayed over ~2 years of hourly data.
 */
const SetupAccuracyCard = ({ results, cohort, setup }) => {
  const decided = cohort ? cohort.wins + cohort.losses : 0;
  const lowSample = setup?.direction && cohort && decided < 20;

  return (
    <div className="card" data-testid="ai-analysis-setup-accuracy-card">
      <div className="flex items-center gap-2 mb-4">
        <Gauge className="w-5 h-5 text-primary-600 dark:text-primary-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Setup accuracy</h3>
      </div>

      {results.total === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400" data-testid="ai-analysis-setup-accuracy-empty">
          The last two years of hourly data produced no qualifying setups for this asset — the
          rules are strict by design.
        </p>
      ) : (
        <>
          {setup?.direction && cohort && (
            <div className="mb-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {SCOPE_LABELS[cohort.scope](setup)}
              </div>
              <div
                className="text-3xl font-bold text-gray-900 dark:text-gray-100"
                data-testid="ai-analysis-setup-winrate-value"
              >
                {pct(cohort.winRate)}
                <span className="ml-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                  reached the target · {cohort.total} setups
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">All setups</div>
              <div className="font-semibold text-gray-900 dark:text-gray-100" data-testid="ai-analysis-setup-overall">
                {pct(results.winRate)} of {results.wins + results.losses} decided
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Avg result</div>
              <div className="font-semibold text-gray-900 dark:text-gray-100" data-testid="ai-analysis-setup-avgr-value">
                {rr(results.avgR)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Long setups</div>
              <div className="font-semibold text-gray-900 dark:text-gray-100" data-testid="ai-analysis-setup-long">
                {pct(results.byDirection?.long?.winRate)} of {results.byDirection?.long?.total ?? 0}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Short setups</div>
              <div className="font-semibold text-gray-900 dark:text-gray-100" data-testid="ai-analysis-setup-short">
                {pct(results.byDirection?.short?.winRate)} of {results.byDirection?.short?.total ?? 0}
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
              data-testid="ai-analysis-setup-low-sample-warning"
            >
              <AlertTriangle className="w-4 h-4 text-warning-600 dark:text-warning-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-warning-700 dark:text-warning-300">
                Only {decided} resolved setups in this cohort — treat the numbers as a rough guide,
                not a statistic.
              </p>
            </div>
          )}

          <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
            Simulated on hourly closes with the exact live rules: daily-bias gate, 4H order block,
            rejection close, correlation-pair agreement, entry at the next hourly open. A bar
            touching both stop and target counts as a loss; trades cap at ~5 days; one simulated
            trade at a time. {results.smtBlocked > 0 ? `${results.smtBlocked} otherwise-valid setups were blocked by the correlation pair. ` : ""}
            Past performance does not predict future results.
          </p>
        </>
      )}
    </div>
  );
};

SetupAccuracyCard.propTypes = {
  results: PropTypes.shape({
    total: PropTypes.number,
    wins: PropTypes.number,
    losses: PropTypes.number,
    expired: PropTypes.number,
    winRate: PropTypes.number,
    avgR: PropTypes.number,
    smtBlocked: PropTypes.number,
    byDirection: PropTypes.shape({ long: PropTypes.object, short: PropTypes.object }),
    firstTime: PropTypes.number,
  }).isRequired,
  cohort: PropTypes.shape({
    scope: PropTypes.oneOf(["direction", "all"]),
    winRate: PropTypes.number,
    wins: PropTypes.number,
    losses: PropTypes.number,
    total: PropTypes.number,
  }),
  setup: PropTypes.shape({
    direction: PropTypes.string,
  }),
};

export default SetupAccuracyCard;
