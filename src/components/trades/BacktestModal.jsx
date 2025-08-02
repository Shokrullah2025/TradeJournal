import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { X, Info, Calendar, ArrowRight } from "lucide-react";
import { useBacktest } from "../../context/BacktestContext";
import { format } from "date-fns";
import toast from "react-hot-toast";

const BacktestModal = ({ isOpen, onClose }) => {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: `Backtest Session ${format(new Date(), "yyyy-MM-dd")}`,
      dateRange: {
        start: format(
          new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          "yyyy-MM-dd"
        ), // 90 days ago
        end: format(new Date(), "yyyy-MM-dd"), // Today
      },
      instruments: ["SPY"],
      strategies: ["Moving Average Crossover"],
      parameters: {
        startingCapital: 10000,
        riskPerTrade: 2, // Percentage
        tradesPerDay: 1.5,
        winRate: 55, // For simulation
        avgProfit: 2.5, // Percentage
        avgLoss: 1.5, // Percentage
      },
    },
  });

  const { createSession, runSimulation, isSimulating } = useBacktest();
  const [customInstrument, setCustomInstrument] = useState("");
  const [customStrategy, setCustomStrategy] = useState("");
  const [step, setStep] = useState(1);

  const watchInstruments = watch("instruments");
  const watchStrategies = watch("strategies");

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
    }
  }, [isOpen]);

  // Predefined options
  const instrumentOptions = [
    "SPY",
    "QQQ",
    "AAPL",
    "MSFT",
    "GOOGL",
    "TSLA",
    "BTC",
    "ETH",
    "EUR/USD",
    "Gold",
  ];
  const strategyOptions = [
    "Moving Average Crossover",
    "RSI Overbought/Oversold",
    "MACD Signal",
    "Bollinger Band Breakout",
    "Trend Following",
    "Support/Resistance",
    "Mean Reversion",
    "Breakout Strategy",
  ];

  const handleAddInstrument = () => {
    if (customInstrument && !watchInstruments.includes(customInstrument)) {
      register(`instruments.${watchInstruments.length}`, {
        value: customInstrument,
      });
      setCustomInstrument("");
    }
  };

  const handleAddStrategy = () => {
    if (customStrategy && !watchStrategies.includes(customStrategy)) {
      register(`strategies.${watchStrategies.length}`, {
        value: customStrategy,
      });
      setCustomStrategy("");
    }
  };

  const onSubmit = async (data) => {
    try {
      // Create the session
      const sessionId = createSession({
        name: data.name,
        dateRange: data.dateRange,
        instruments: data.instruments,
        strategies: data.strategies,
        parameters: {
          startingCapital: parseFloat(data.parameters.startingCapital),
          riskPerTrade: parseFloat(data.parameters.riskPerTrade) / 100,
          tradesPerDay: parseFloat(data.parameters.tradesPerDay),
          winRate: parseFloat(data.parameters.winRate) / 100,
          avgProfit: parseFloat(data.parameters.avgProfit),
          avgLoss: parseFloat(data.parameters.avgLoss),
        },
      });

      // Run the simulation
      toast.success("Backtesting session created successfully!");

      // Close modal
      onClose();

      // Run simulation (this could be optional and happen later)
      toast.promise(runSimulation(sessionId), {
        loading: "Running simulation...",
        success: "Simulation completed successfully!",
        error: "Failed to run simulation",
      });
    } catch (error) {
      console.error("Failed to create backtest session:", error);
      toast.error("Failed to create backtest session");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {step === 1
              ? "Create Backtest Session"
              : "Configure Simulation Parameters"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {step === 1 ? (
            <>
              {/* Step 1: Basic Settings */}
              <div className="space-y-4">
                {/* Session Name */}
                <div>
                  <label htmlFor="name" className="label">
                    Session Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    className="input"
                    {...register("name", {
                      required: "Session name is required",
                    })}
                  />
                  {errors.name && (
                    <p className="text-red-600 text-sm mt-1">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="dateStart" className="label">
                      Start Date
                    </label>
                    <div className="relative">
                      <Calendar
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400"
                        size={16}
                      />
                      <input
                        id="dateStart"
                        type="date"
                        className="input pl-10"
                        {...register("dateRange.start", {
                          required: "Start date is required",
                        })}
                      />
                      {errors.dateRange?.start && (
                        <p className="text-red-600 text-sm mt-1">
                          {errors.dateRange.start.message}
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <label htmlFor="dateEnd" className="label">
                      End Date
                    </label>
                    <div className="relative">
                      <Calendar
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400"
                        size={16}
                      />
                      <input
                        id="dateEnd"
                        type="date"
                        className="input pl-10"
                        {...register("dateRange.end", {
                          required: "End date is required",
                        })}
                      />
                      {errors.dateRange?.end && (
                        <p className="text-red-600 text-sm mt-1">
                          {errors.dateRange.end.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Instruments */}
                <div>
                  <label className="label">
                    Instruments (Select or add your own)
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {instrumentOptions.map((instrument) => (
                      <label
                        key={instrument}
                        className="inline-flex items-center px-3 py-1.5 rounded-full text-sm bg-gray-100 dark:bg-gray-700 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          value={instrument}
                          className="mr-1.5 form-checkbox h-4 w-4 text-primary-600 dark:text-primary-500"
                          {...register("instruments")}
                        />
                        {instrument}
                      </label>
                    ))}
                  </div>
                  <div className="flex mt-2">
                    <input
                      type="text"
                      className="input flex-1"
                      placeholder="Add custom instrument"
                      value={customInstrument}
                      onChange={(e) => setCustomInstrument(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={handleAddInstrument}
                      className="btn btn-secondary ml-2"
                      disabled={!customInstrument}
                    >
                      Add
                    </button>
                  </div>
                  <div className="mt-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                      <Info className="w-4 h-4 mr-1" /> Selected:{" "}
                      {watchInstruments?.join(", ") || "None"}
                    </p>
                  </div>
                </div>

                {/* Strategies */}
                <div>
                  <label className="label">
                    Strategies (Select or add your own)
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {strategyOptions.map((strategy) => (
                      <label
                        key={strategy}
                        className="inline-flex items-center px-3 py-1.5 rounded-full text-sm bg-gray-100 dark:bg-gray-700 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          value={strategy}
                          className="mr-1.5 form-checkbox h-4 w-4 text-primary-600 dark:text-primary-500"
                          {...register("strategies")}
                        />
                        {strategy}
                      </label>
                    ))}
                  </div>
                  <div className="flex mt-2">
                    <input
                      type="text"
                      className="input flex-1"
                      placeholder="Add custom strategy"
                      value={customStrategy}
                      onChange={(e) => setCustomStrategy(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={handleAddStrategy}
                      className="btn btn-secondary ml-2"
                      disabled={!customStrategy}
                    >
                      Add
                    </button>
                  </div>
                  <div className="mt-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                      <Info className="w-4 h-4 mr-1" /> Selected:{" "}
                      {watchStrategies?.join(", ") || "None"}
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Step 2: Advanced Parameters */}
              <div className="space-y-4">
                {/* Starting Capital */}
                <div>
                  <label htmlFor="startingCapital" className="label">
                    Starting Capital ($)
                  </label>
                  <input
                    id="startingCapital"
                    type="number"
                    className="input"
                    min="100"
                    step="100"
                    {...register("parameters.startingCapital", {
                      required: "Starting capital is required",
                      min: {
                        value: 100,
                        message: "Minimum starting capital is $100",
                      },
                    })}
                  />
                  {errors.parameters?.startingCapital && (
                    <p className="text-red-600 text-sm mt-1">
                      {errors.parameters.startingCapital.message}
                    </p>
                  )}
                </div>

                {/* Risk Per Trade */}
                <div>
                  <label htmlFor="riskPerTrade" className="label">
                    Risk Per Trade (% of Capital)
                  </label>
                  <input
                    id="riskPerTrade"
                    type="number"
                    className="input"
                    min="0.1"
                    max="10"
                    step="0.1"
                    {...register("parameters.riskPerTrade", {
                      required: "Risk percentage is required",
                      min: { value: 0.1, message: "Minimum risk is 0.1%" },
                      max: { value: 10, message: "Maximum risk is 10%" },
                    })}
                  />
                  {errors.parameters?.riskPerTrade && (
                    <p className="text-red-600 text-sm mt-1">
                      {errors.parameters.riskPerTrade.message}
                    </p>
                  )}
                </div>

                {/* Trades Per Day (for simulation) */}
                <div>
                  <label htmlFor="tradesPerDay" className="label">
                    Average Trades Per Day (for simulation)
                  </label>
                  <input
                    id="tradesPerDay"
                    type="number"
                    className="input"
                    min="0.1"
                    max="10"
                    step="0.1"
                    {...register("parameters.tradesPerDay", {
                      required: "Trades per day is required",
                      min: {
                        value: 0.1,
                        message: "Minimum is 0.1 trades per day",
                      },
                      max: {
                        value: 10,
                        message: "Maximum is 10 trades per day",
                      },
                    })}
                  />
                  {errors.parameters?.tradesPerDay && (
                    <p className="text-red-600 text-sm mt-1">
                      {errors.parameters.tradesPerDay.message}
                    </p>
                  )}
                </div>

                {/* Win Rate (for simulation) */}
                <div>
                  <label htmlFor="winRate" className="label">
                    Simulated Win Rate (%)
                  </label>
                  <input
                    id="winRate"
                    type="number"
                    className="input"
                    min="1"
                    max="99"
                    step="1"
                    {...register("parameters.winRate", {
                      required: "Win rate is required",
                      min: { value: 1, message: "Minimum win rate is 1%" },
                      max: { value: 99, message: "Maximum win rate is 99%" },
                    })}
                  />
                  {errors.parameters?.winRate && (
                    <p className="text-red-600 text-sm mt-1">
                      {errors.parameters.winRate.message}
                    </p>
                  )}
                </div>

                {/* Average Profit % */}
                <div>
                  <label htmlFor="avgProfit" className="label">
                    Average Profit (% per winning trade)
                  </label>
                  <input
                    id="avgProfit"
                    type="number"
                    className="input"
                    min="0.1"
                    step="0.1"
                    {...register("parameters.avgProfit", {
                      required: "Average profit is required",
                      min: { value: 0.1, message: "Minimum profit is 0.1%" },
                    })}
                  />
                  {errors.parameters?.avgProfit && (
                    <p className="text-red-600 text-sm mt-1">
                      {errors.parameters.avgProfit.message}
                    </p>
                  )}
                </div>

                {/* Average Loss % */}
                <div>
                  <label htmlFor="avgLoss" className="label">
                    Average Loss (% per losing trade)
                  </label>
                  <input
                    id="avgLoss"
                    type="number"
                    className="input"
                    min="0.1"
                    step="0.1"
                    {...register("parameters.avgLoss", {
                      required: "Average loss is required",
                      min: { value: 0.1, message: "Minimum loss is 0.1%" },
                    })}
                  />
                  {errors.parameters?.avgLoss && (
                    <p className="text-red-600 text-sm mt-1">
                      {errors.parameters.avgLoss.message}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </form>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <div className="flex space-x-2">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="btn btn-secondary"
              >
                Back
              </button>
            )}
            {step < 2 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="btn btn-primary flex items-center"
              >
                Next <ArrowRight className="ml-1 w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit(onSubmit)}
                className="btn btn-primary"
                disabled={isSimulating}
              >
                {isSimulating ? "Creating..." : "Create Session"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BacktestModal;
