import React, { useState } from "react";
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  AlertTriangle,
} from "lucide-react";

const RiskCalculator = () => {
  const [calculatorType, setCalculatorType] = useState("futures");
  const [formData, setFormData] = useState({
    // Common fields
    accountBalance: "",
    riskPercentage: "2",

    // Futures specific
    entryPrice: "",
    stopLoss: "",
    takeProfit: "",
    tickSize: "0.25",
    tickValue: "12.50",

    // Stock specific
    stockPrice: "",
    stockStopLoss: "",
    stockTakeProfit: "",

    // Forex specific
    forexEntry: "",
    forexStopLoss: "",
    forexTakeProfit: "",
    lotSize: "100000",
    pipValue: "10",
  });

  const [results, setResults] = useState(null);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const calculateFuturesRisk = () => {
    const accountBalance = parseFloat(formData.accountBalance);
    const riskPercentage = parseFloat(formData.riskPercentage);
    const entryPrice = parseFloat(formData.entryPrice);
    const stopLoss = parseFloat(formData.stopLoss);
    const takeProfit = parseFloat(formData.takeProfit);
    const tickSize = parseFloat(formData.tickSize);
    const tickValue = parseFloat(formData.tickValue);

    if (!accountBalance || !entryPrice || !stopLoss) {
      return null;
    }

    const riskAmount = (accountBalance * riskPercentage) / 100;
    const priceRisk = Math.abs(entryPrice - stopLoss);
    const ticksRisk = priceRisk / tickSize;
    const dollarRisk = ticksRisk * tickValue;
    const maxContracts = Math.floor(riskAmount / dollarRisk);

    let rewardAmount = 0;
    let riskRewardRatio = 0;
    let ticksReward = 0;

    if (takeProfit) {
      const priceReward = Math.abs(takeProfit - entryPrice);
      ticksReward = priceReward / tickSize;
      rewardAmount = ticksReward * tickValue * maxContracts;
      riskRewardRatio = rewardAmount / (dollarRisk * maxContracts);
    }

    return {
      riskAmount,
      rewardAmount,
      maxContracts,
      dollarRisk: dollarRisk * maxContracts,
      ticksRisk,
      ticksReward,
      riskRewardRatio,
      breakeven: entryPrice,
      totalCapitalAtRisk: (riskAmount / accountBalance) * 100,
    };
  };

  const calculateStockRisk = () => {
    const accountBalance = parseFloat(formData.accountBalance);
    const riskPercentage = parseFloat(formData.riskPercentage);
    const stockPrice = parseFloat(formData.stockPrice);
    const stopLoss = parseFloat(formData.stockStopLoss);
    const takeProfit = parseFloat(formData.stockTakeProfit);

    if (!accountBalance || !stockPrice || !stopLoss) {
      return null;
    }

    const riskAmount = (accountBalance * riskPercentage) / 100;
    const priceRisk = Math.abs(stockPrice - stopLoss);
    const maxShares = Math.floor(riskAmount / priceRisk);
    const totalPosition = maxShares * stockPrice;

    let rewardAmount = 0;
    let riskRewardRatio = 0;

    if (takeProfit) {
      const priceReward = Math.abs(takeProfit - stockPrice);
      rewardAmount = priceReward * maxShares;
      riskRewardRatio = rewardAmount / (priceRisk * maxShares);
    }

    return {
      riskAmount,
      rewardAmount,
      maxShares,
      totalPosition,
      dollarRisk: priceRisk * maxShares,
      priceRisk,
      riskRewardRatio,
      breakeven: stockPrice,
      totalCapitalAtRisk: (riskAmount / accountBalance) * 100,
    };
  };

  const calculateForexRisk = () => {
    const accountBalance = parseFloat(formData.accountBalance);
    const riskPercentage = parseFloat(formData.riskPercentage);
    const entryPrice = parseFloat(formData.forexEntry);
    const stopLoss = parseFloat(formData.forexStopLoss);
    const takeProfit = parseFloat(formData.forexTakeProfit);
    const lotSize = parseFloat(formData.lotSize);
    const pipValue = parseFloat(formData.pipValue);

    if (!accountBalance || !entryPrice || !stopLoss) {
      return null;
    }

    const riskAmount = (accountBalance * riskPercentage) / 100;
    const priceRisk = Math.abs(entryPrice - stopLoss);
    const pipsRisk = priceRisk * 10000; // Assuming 4-decimal pair
    const dollarRiskPerLot = pipsRisk * pipValue;
    const maxLots = riskAmount / dollarRiskPerLot;

    let rewardAmount = 0;
    let riskRewardRatio = 0;
    let pipsReward = 0;

    if (takeProfit) {
      const priceReward = Math.abs(takeProfit - entryPrice);
      pipsReward = priceReward * 10000;
      rewardAmount = pipsReward * pipValue * maxLots;
      riskRewardRatio = rewardAmount / (dollarRiskPerLot * maxLots);
    }

    return {
      riskAmount,
      rewardAmount,
      maxLots,
      dollarRisk: dollarRiskPerLot * maxLots,
      pipsRisk,
      pipsReward,
      riskRewardRatio,
      breakeven: entryPrice,
      totalCapitalAtRisk: (riskAmount / accountBalance) * 100,
    };
  };

  const handleCalculate = () => {
    let calculationResults;

    switch (calculatorType) {
      case "futures":
        calculationResults = calculateFuturesRisk();
        break;
      case "stocks":
        calculationResults = calculateStockRisk();
        break;
      case "forex":
        calculationResults = calculateForexRisk();
        break;
      default:
        calculationResults = null;
    }

    setResults(calculationResults);
  };

  const resetCalculator = () => {
    setFormData({
      accountBalance: "",
      riskPercentage: "2",
      entryPrice: "",
      stopLoss: "",
      takeProfit: "",
      tickSize: "0.25",
      tickValue: "12.50",
      stockPrice: "",
      stockStopLoss: "",
      stockTakeProfit: "",
      forexEntry: "",
      forexStopLoss: "",
      forexTakeProfit: "",
      lotSize: "100000",
      pipValue: "10",
    });
    setResults(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Risk/Reward Calculator
          </h1>
          <p className="text-gray-600 mt-1">
            Calculate position size and risk/reward ratios for your trades
          </p>
        </div>

        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <button onClick={resetCalculator} className="btn btn-secondary">
            Reset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calculator Form */}
        <div className="card">
          <div className="flex items-center space-x-3 mb-6">
            <Calculator className="w-6 h-6 text-primary-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Position Calculator
            </h2>
          </div>

          {/* Calculator Type Selector */}
          <div className="mb-6">
            <label className="label">Calculator Type</label>
            <div className="flex space-x-4">
              {[
                { value: "futures", label: "Futures" },
                { value: "stocks", label: "Stocks" },
                { value: "forex", label: "Forex" },
              ].map((option) => (
                <label key={option.value} className="flex items-center">
                  <input
                    type="radio"
                    value={option.value}
                    checked={calculatorType === option.value}
                    onChange={(e) => setCalculatorType(e.target.value)}
                    className="mr-2"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          {/* Common Fields */}
          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Account Balance ($)</label>
                <input
                  type="number"
                  value={formData.accountBalance}
                  onChange={(e) =>
                    handleInputChange("accountBalance", e.target.value)
                  }
                  className="input"
                  placeholder="50000"
                />
              </div>

              <div>
                <label className="label">Risk Percentage (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.riskPercentage}
                  onChange={(e) =>
                    handleInputChange("riskPercentage", e.target.value)
                  }
                  className="input"
                  placeholder="2"
                />
              </div>
            </div>
          </div>

          {/* Futures Calculator */}
          {calculatorType === "futures" && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 pb-2 border-b">
                Futures Contract Details
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Entry Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.entryPrice}
                    onChange={(e) =>
                      handleInputChange("entryPrice", e.target.value)
                    }
                    className="input"
                    placeholder="4200.00"
                  />
                </div>

                <div>
                  <label className="label">Stop Loss</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.stopLoss}
                    onChange={(e) =>
                      handleInputChange("stopLoss", e.target.value)
                    }
                    className="input"
                    placeholder="4150.00"
                  />
                </div>
              </div>

              <div>
                <label className="label">Take Profit (Optional)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.takeProfit}
                  onChange={(e) =>
                    handleInputChange("takeProfit", e.target.value)
                  }
                  className="input"
                  placeholder="4300.00"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Tick Size</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.tickSize}
                    onChange={(e) =>
                      handleInputChange("tickSize", e.target.value)
                    }
                    className="input"
                    placeholder="0.25"
                  />
                </div>

                <div>
                  <label className="label">Tick Value ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.tickValue}
                    onChange={(e) =>
                      handleInputChange("tickValue", e.target.value)
                    }
                    className="input"
                    placeholder="12.50"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Stocks Calculator */}
          {calculatorType === "stocks" && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 pb-2 border-b">
                Stock Details
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Stock Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.stockPrice}
                    onChange={(e) =>
                      handleInputChange("stockPrice", e.target.value)
                    }
                    className="input"
                    placeholder="150.00"
                  />
                </div>

                <div>
                  <label className="label">Stop Loss ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.stockStopLoss}
                    onChange={(e) =>
                      handleInputChange("stockStopLoss", e.target.value)
                    }
                    className="input"
                    placeholder="145.00"
                  />
                </div>
              </div>

              <div>
                <label className="label">Take Profit ($) (Optional)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.stockTakeProfit}
                  onChange={(e) =>
                    handleInputChange("stockTakeProfit", e.target.value)
                  }
                  className="input"
                  placeholder="160.00"
                />
              </div>
            </div>
          )}

          {/* Forex Calculator */}
          {calculatorType === "forex" && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 pb-2 border-b">
                Forex Pair Details
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Entry Price</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.forexEntry}
                    onChange={(e) =>
                      handleInputChange("forexEntry", e.target.value)
                    }
                    className="input"
                    placeholder="1.0850"
                  />
                </div>

                <div>
                  <label className="label">Stop Loss</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.forexStopLoss}
                    onChange={(e) =>
                      handleInputChange("forexStopLoss", e.target.value)
                    }
                    className="input"
                    placeholder="1.0800"
                  />
                </div>
              </div>

              <div>
                <label className="label">Take Profit (Optional)</label>
                <input
                  type="number"
                  step="0.0001"
                  value={formData.forexTakeProfit}
                  onChange={(e) =>
                    handleInputChange("forexTakeProfit", e.target.value)
                  }
                  className="input"
                  placeholder="1.0950"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Lot Size</label>
                  <input
                    type="number"
                    value={formData.lotSize}
                    onChange={(e) =>
                      handleInputChange("lotSize", e.target.value)
                    }
                    className="input"
                    placeholder="100000"
                  />
                </div>

                <div>
                  <label className="label">Pip Value ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.pipValue}
                    onChange={(e) =>
                      handleInputChange("pipValue", e.target.value)
                    }
                    className="input"
                    placeholder="10"
                  />
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleCalculate}
            className="btn btn-primary w-full mt-6"
          >
            Calculate Risk & Reward
          </button>
        </div>

        {/* Results */}
        <div className="space-y-6">
          {results ? (
            <>
              {/* Risk Metrics */}
              <div className="card">
                <div className="flex items-center space-x-3 mb-4">
                  <AlertTriangle className="w-5 h-5 text-danger-600" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Risk Analysis
                  </h3>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-danger-50 rounded-lg">
                    <span className="text-sm font-medium text-danger-800">
                      Risk Amount
                    </span>
                    <span className="text-lg font-bold text-danger-900">
                      ${results.riskAmount.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">
                      Capital at Risk
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {results.totalCapitalAtRisk.toFixed(2)}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">
                      Total Dollar Risk
                    </span>
                    <span className="text-sm font-semibold text-danger-600">
                      ${results.dollarRisk.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Position Size */}
              <div className="card">
                <div className="flex items-center space-x-3 mb-4">
                  <Target className="w-5 h-5 text-primary-600" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Position Size
                  </h3>
                </div>

                <div className="space-y-3">
                  {calculatorType === "futures" && (
                    <>
                      <div className="flex items-center justify-between p-3 bg-primary-50 rounded-lg">
                        <span className="text-sm font-medium text-primary-800">
                          Max Contracts
                        </span>
                        <span className="text-2xl font-bold text-primary-900">
                          {results.maxContracts}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium text-gray-700">
                          Ticks at Risk
                        </span>
                        <span className="text-sm font-semibold text-gray-900">
                          {results.ticksRisk.toFixed(0)}
                        </span>
                      </div>
                    </>
                  )}

                  {calculatorType === "stocks" && (
                    <>
                      <div className="flex items-center justify-between p-3 bg-primary-50 rounded-lg">
                        <span className="text-sm font-medium text-primary-800">
                          Max Shares
                        </span>
                        <span className="text-2xl font-bold text-primary-900">
                          {results.maxShares.toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium text-gray-700">
                          Total Position
                        </span>
                        <span className="text-sm font-semibold text-gray-900">
                          ${results.totalPosition.toLocaleString()}
                        </span>
                      </div>
                    </>
                  )}

                  {calculatorType === "forex" && (
                    <>
                      <div className="flex items-center justify-between p-3 bg-primary-50 rounded-lg">
                        <span className="text-sm font-medium text-primary-800">
                          Max Lots
                        </span>
                        <span className="text-2xl font-bold text-primary-900">
                          {results.maxLots.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium text-gray-700">
                          Pips at Risk
                        </span>
                        <span className="text-sm font-semibold text-gray-900">
                          {results.pipsRisk.toFixed(1)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Reward Metrics */}
              {results.rewardAmount > 0 && (
                <div className="card">
                  <div className="flex items-center space-x-3 mb-4">
                    <TrendingUp className="w-5 h-5 text-success-600" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      Reward Analysis
                    </h3>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-success-50 rounded-lg">
                      <span className="text-sm font-medium text-success-800">
                        Potential Reward
                      </span>
                      <span className="text-lg font-bold text-success-900">
                        ${results.rewardAmount.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-700">
                        Risk/Reward Ratio
                      </span>
                      <div className="text-right">
                        <span className="text-lg font-bold text-gray-900">
                          1:{results.riskRewardRatio.toFixed(2)}
                        </span>
                        <div
                          className={`text-xs ${
                            results.riskRewardRatio >= 2
                              ? "text-success-600"
                              : results.riskRewardRatio >= 1.5
                              ? "text-warning-600"
                              : "text-danger-600"
                          }`}
                        >
                          {results.riskRewardRatio >= 2
                            ? "Excellent"
                            : results.riskRewardRatio >= 1.5
                            ? "Good"
                            : "Poor"}
                        </div>
                      </div>
                    </div>

                    {calculatorType === "futures" &&
                      results.ticksReward > 0 && (
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm font-medium text-gray-700">
                            Ticks Reward
                          </span>
                          <span className="text-sm font-semibold text-gray-900">
                            {results.ticksReward.toFixed(0)}
                          </span>
                        </div>
                      )}

                    {calculatorType === "forex" && results.pipsReward > 0 && (
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium text-gray-700">
                          Pips Reward
                        </span>
                        <span className="text-sm font-semibold text-gray-900">
                          {results.pipsReward.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Risk Management Tips */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Risk Management Tips
                </h3>
                <div className="space-y-3">
                  <div
                    className={`p-3 rounded-lg ${
                      results.totalCapitalAtRisk <= 2
                        ? "bg-success-50 border border-success-200"
                        : "bg-danger-50 border border-danger-200"
                    }`}
                  >
                    <p
                      className={`text-sm ${
                        results.totalCapitalAtRisk <= 2
                          ? "text-success-700"
                          : "text-danger-700"
                      }`}
                    >
                      <strong>Risk Level:</strong> You're risking{" "}
                      {results.totalCapitalAtRisk.toFixed(2)}% of your capital.
                      {results.totalCapitalAtRisk <= 2
                        ? " This is within recommended limits."
                        : " Consider reducing position size."}
                    </p>
                  </div>

                  {results.riskRewardRatio > 0 && (
                    <div
                      className={`p-3 rounded-lg ${
                        results.riskRewardRatio >= 1.5
                          ? "bg-success-50 border border-success-200"
                          : "bg-warning-50 border border-warning-200"
                      }`}
                    >
                      <p
                        className={`text-sm ${
                          results.riskRewardRatio >= 1.5
                            ? "text-success-700"
                            : "text-warning-700"
                        }`}
                      >
                        <strong>Risk/Reward:</strong> Your ratio is 1:
                        {results.riskRewardRatio.toFixed(2)}.
                        {results.riskRewardRatio >= 1.5
                          ? " This provides good reward potential."
                          : " Consider wider profit targets or tighter stops."}
                      </p>
                    </div>
                  )}

                  <div className="p-3 bg-primary-50 border border-primary-200 rounded-lg">
                    <p className="text-sm text-primary-700">
                      <strong>Always remember:</strong> Never risk more than you
                      can afford to lose. Use stop losses and stick to your risk
                      management plan.
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="card">
              <div className="text-center py-12">
                <Calculator className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Ready to Calculate
                </h3>
                <p className="text-gray-500">
                  Fill out the form and click calculate to see your risk/reward
                  analysis
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RiskCalculator;
