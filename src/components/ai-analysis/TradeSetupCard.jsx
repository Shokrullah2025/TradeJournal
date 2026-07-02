import React from "react";
import PropTypes from "prop-types";
import { Crosshair, AlertTriangle, Check } from "lucide-react";
import { positionSize } from "../../lib/futuresContracts";

const STEPS = [
  { key: "bias", label: "Bias" },
  { key: "ob", label: "Order block" },
  { key: "tap", label: "Tap" },
  { key: "confirm", label: "Confirmation" },
  { key: "entry", label: "Entry" },
];

// How far along the sequence each state is (index into STEPS; -1 = nothing lit).
const STATE_PROGRESS = {
  NO_BIAS: -1,
  WAITING_FOR_OB: 0,
  WAITING_FOR_TAP: 1,
  AWAITING_CONFIRMATION: 2,
  SMT_BLOCKED: 3,
  SETUP_ACTIVE: 4,
};

const STATE_COPY = {
  NO_BIAS:
    "The daily bias is neutral — the ICT model stands down. No setup is hunted until the higher timeframe picks a side.",
  WAITING_FOR_OB:
    "Bias is set, but no valid 4H order block exists in that direction yet. Waiting for a displacement leg to leave one behind.",
  WAITING_FOR_TAP:
    "A 4H order block is in play (zone drawn on the chart). Waiting for price to trade back into it.",
  AWAITING_CONFIRMATION:
    "Price is inside the order block — watching the forming 4H candle. A close back beyond the zone in the bias direction confirms.",
  SMT_BLOCKED: null, // built dynamically from smt.status
  SETUP_ACTIVE: null,
};

const SKIP_COPY = {
  "no-target":
    "A 4H candle confirmed off the zone, but there is no liquidity draw left above the entry — the setup was skipped.",
  "min-rr":
    "A 4H candle confirmed off the zone, but the trade would pay less than 1R to the liquidity draw — the setup was skipped.",
  "bad-stop": "A 4H candle confirmed, but the structural stop sits on the wrong side of the entry — skipped.",
  "no-levels": "A 4H candle confirmed, but the liquidity levels are unavailable — skipped.",
};

const TARGET_LABELS = { pdh: "prior-day high", pdl: "prior-day low", pwh: "prior-week high", pwl: "prior-week low" };

const fmt = (v) =>
  v == null ? "—" : Number(v).toLocaleString(undefined, { maximumFractionDigits: 5 });
const money = (v) =>
  v == null ? "—" : v.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/**
 * The live ICT setup tracker: where price is in the sequence
 * Bias → Order block → Tap → Confirmation → Entry, and — when a setup goes
 * active — the mechanical trade plan with position sizing for the user's
 * account (the Risk Calculator's fixed-fractional math).
 */
const TradeSetupCard = ({ setup, symbol, contract, accountBalance, riskPct, onAccountBalanceChange, onRiskPctChange }) => {
  const state = setup?.state || "NO_BIAS";
  const progress = STATE_PROGRESS[state] ?? -1;
  const plan = state === "SETUP_ACTIVE" ? setup.plan : null;

  const sizing = plan
    ? positionSize({
        accountBalance: parseFloat(accountBalance),
        riskPct: parseFloat(riskPct),
        entry: plan.entry,
        stopLoss: plan.stop,
        tickSize: contract.tickSize,
        tickValue: contract.tickValue,
      })
    : null;

  let copy = STATE_COPY[state];
  if (state === "SMT_BLOCKED") {
    copy =
      setup?.smt?.status === "no-data"
        ? `A 4H candle confirmed off the zone, but ${symbol}'s correlation pair has no data for that candle — blocked (missing data is not confirmation).`
        : `A 4H candle confirmed off the zone, but the correlation pair closed the other way — the pair must signal the same thing, so the setup is blocked.`;
  }

  return (
    <div className="card" data-testid="ai-analysis-setup-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Crosshair className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Trade setup</h3>
        </div>
        <span className="sr-only" data-testid="ai-analysis-setup-state">{state}</span>
      </div>

      {/* Step strip */}
      <div className="flex items-center gap-1 sm:gap-2 mb-4 overflow-x-auto">
        {STEPS.map((step, idx) => {
          const done = idx < progress;
          const current = idx === progress;
          const blocked = state === "SMT_BLOCKED" && step.key === "confirm";
          return (
            <React.Fragment key={step.key}>
              {idx > 0 && <div className="h-px w-3 sm:w-6 bg-gray-300 dark:bg-gray-600 flex-shrink-0" />}
              <span
                data-testid={`ai-analysis-setup-step-${step.key}`}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                  blocked
                    ? "bg-warning-50 dark:bg-warning-900/30 text-warning-700 dark:text-warning-300 border border-warning-100 dark:border-warning-800"
                    : current
                      ? "bg-primary-600 text-white"
                      : done
                        ? "bg-success-50 dark:bg-success-900/30 text-success-700 dark:text-success-300"
                        : "bg-gray-100 dark:bg-gray-700/40 text-gray-500 dark:text-gray-400"
                }`}
              >
                {done && <Check className="w-3 h-3" />}
                {step.label}
              </span>
            </React.Fragment>
          );
        })}
      </div>

      {/* State narrative */}
      {copy && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4" data-testid="ai-analysis-setup-copy">
          {copy}
        </p>
      )}
      {setup?.skipReason && SKIP_COPY[setup.skipReason] && (
        <p
          className="text-sm text-warning-700 dark:text-warning-300 mb-4"
          data-testid="ai-analysis-setup-skip-note"
        >
          {SKIP_COPY[setup.skipReason]}
        </p>
      )}

      {/* Active plan */}
      {plan && (
        <div className="mb-4" data-testid="ai-analysis-setup-plan">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Entry ({setup.direction})</div>
              <div className="text-lg font-bold text-gray-900 dark:text-gray-100" data-testid="ai-analysis-setup-entry-value">
                {fmt(plan.entry)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Stop (beyond OB)</div>
              <div className="text-lg font-semibold text-danger-600 dark:text-danger-400" data-testid="ai-analysis-setup-stop-value">
                {fmt(plan.stop)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Target ({TARGET_LABELS[plan.targetLabel] || plan.targetLabel})
              </div>
              <div className="text-lg font-semibold text-success-600 dark:text-success-400" data-testid="ai-analysis-setup-target-value">
                {fmt(plan.target)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Reward : risk</div>
              <div className="text-lg font-bold text-gray-900 dark:text-gray-100" data-testid="ai-analysis-setup-rr-value">
                {plan.rr.toFixed(2)}R
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
            <span data-testid="ai-analysis-setup-smt-status">
              Correlation pair:{" "}
              {setup.smt?.status === "no-pair" ? "n/a — no correlated pair for this asset" : "agrees"}
            </span>
            {plan.entrySource === "4h-close" && (
              <span data-testid="ai-analysis-setup-entry-source-note">
                Entry shown at the 4H close (15-minute data unavailable — indicative)
              </span>
            )}
            {setup.activeUntil && (
              <span data-testid="ai-analysis-setup-window">
                Window closes {new Date(setup.activeUntil * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Position sizing — inputs always visible, outputs when a plan exists */}
      <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="label" htmlFor="ai-analysis-balance">Account balance ($)</label>
            <input
              id="ai-analysis-balance"
              type="number"
              min="0"
              step="100"
              value={accountBalance}
              onChange={(e) => onAccountBalanceChange(e.target.value)}
              data-testid="ai-analysis-account-balance-input"
              className="input"
              placeholder="10000"
            />
          </div>
          <div>
            <label className="label" htmlFor="ai-analysis-risk-pct">Risk per trade (%)</label>
            <input
              id="ai-analysis-risk-pct"
              type="number"
              min="0.1"
              max="100"
              step="0.1"
              value={riskPct}
              onChange={(e) => onRiskPctChange(e.target.value)}
              data-testid="ai-analysis-risk-pct-input"
              className="input"
              placeholder="1"
            />
          </div>
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-400 mb-3" data-testid="ai-analysis-contract-spec">
          {contract.symbol} · tick {contract.tickSize} = ${contract.tickValue} per contract
        </div>

        {!plan ? (
          <p className="text-sm text-gray-500 dark:text-gray-400" data-testid="ai-analysis-risk-no-signal">
            Contracts are sized the moment a setup goes active.
          </p>
        ) : sizing == null ? (
          <p className="text-sm text-gray-500 dark:text-gray-400" data-testid="ai-analysis-risk-invalid">
            Enter a valid balance and risk percentage to size the trade.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Contracts</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100" data-testid="ai-analysis-contracts-value">
                  {sizing.contracts}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Risk budget</div>
                <div className="font-semibold text-gray-900 dark:text-gray-100" data-testid="ai-analysis-risk-budget-value">
                  {money(sizing.riskAmount)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Max loss at stop</div>
                <div className="font-semibold text-danger-600 dark:text-danger-400" data-testid="ai-analysis-max-loss-value">
                  {money(sizing.maxLoss)}
                </div>
              </div>
            </div>
            {sizing.overRisk && (
              <div
                className="mt-3 p-3 rounded-lg bg-danger-50 dark:bg-danger-900/30 border border-danger-100 dark:border-danger-800 flex items-start gap-2"
                data-testid="ai-analysis-over-risk-warning"
              >
                <AlertTriangle className="w-4 h-4 text-danger-600 dark:text-danger-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-danger-700 dark:text-danger-300">
                  One {contract.symbol} contract risks {money(sizing.riskPerContract)} at this stop —
                  more than your {riskPct}% budget of {money(sizing.riskAmount)}. Consider the micro
                  contract, a wider budget, or skipping the trade.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

TradeSetupCard.propTypes = {
  setup: PropTypes.shape({
    state: PropTypes.oneOf(Object.keys(STATE_PROGRESS)),
    direction: PropTypes.string,
    smt: PropTypes.shape({ status: PropTypes.string }),
    plan: PropTypes.shape({
      entry: PropTypes.number,
      stop: PropTypes.number,
      target: PropTypes.number,
      targetLabel: PropTypes.string,
      rr: PropTypes.number,
      entrySource: PropTypes.string,
    }),
    skipReason: PropTypes.string,
    activeUntil: PropTypes.number,
  }),
  symbol: PropTypes.string.isRequired,
  contract: PropTypes.shape({
    symbol: PropTypes.string.isRequired,
    tickSize: PropTypes.number.isRequired,
    tickValue: PropTypes.number.isRequired,
  }).isRequired,
  accountBalance: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  riskPct: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onAccountBalanceChange: PropTypes.func.isRequired,
  onRiskPctChange: PropTypes.func.isRequired,
};

export default TradeSetupCard;
