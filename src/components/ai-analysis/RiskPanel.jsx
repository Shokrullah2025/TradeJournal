import React from "react";
import PropTypes from "prop-types";
import { Shield, AlertTriangle } from "lucide-react";
import { positionSize } from "../../lib/futuresContracts";

const money = (v) =>
  v == null
    ? "—"
    : v.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/**
 * Position sizing for the live signal: account balance + risk % in,
 * contracts out — the same fixed-fractional math as the Risk Calculator.
 */
const RiskPanel = ({ signal, contract, accountBalance, riskPct, onAccountBalanceChange, onRiskPctChange }) => {
  const hasSignal = signal && signal.direction !== "neutral";
  const sizing = hasSignal
    ? positionSize({
        accountBalance: parseFloat(accountBalance),
        riskPct: parseFloat(riskPct),
        entry: signal.entry,
        stopLoss: signal.stopLoss,
        tickSize: contract.tickSize,
        tickValue: contract.tickValue,
      })
    : null;

  return (
    <div className="card" data-testid="ai-analysis-risk-panel">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-primary-600 dark:text-primary-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Position size</h3>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
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

      {!hasSignal ? (
        <p className="text-sm text-gray-500 dark:text-gray-400" data-testid="ai-analysis-risk-no-signal">
          Sizing appears when a signal is active.
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
              <div
                className="text-2xl font-bold text-gray-900 dark:text-gray-100"
                data-testid="ai-analysis-contracts-value"
              >
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
              className="mt-4 p-3 rounded-lg bg-danger-50 dark:bg-danger-900/30 border border-danger-100 dark:border-danger-800 flex items-start gap-2"
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
  );
};

RiskPanel.propTypes = {
  signal: PropTypes.shape({
    direction: PropTypes.string,
    entry: PropTypes.number,
    stopLoss: PropTypes.number,
  }),
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

export default RiskPanel;
