import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  X,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  BarChart3,
} from "lucide-react";
import { useTrades } from "../../context/TradeContext";
import toast from "react-hot-toast";

// Helper functions
const getUserOptions = (type) => {
  const stored = localStorage.getItem(`tradeForm_${type}`);
  return stored ? JSON.parse(stored) : [];
};

const getUserTemplates = () => {
  const stored = localStorage.getItem("tradeForm_templates");
  return stored ? JSON.parse(stored) : [];
};

const saveUserOption = (type, value) => {
  if (!value.trim()) return;

  const existing = getUserOptions(type);
  if (!existing.includes(value)) {
    const updated = [...existing, value];
    localStorage.setItem(`tradeForm_${type}`, JSON.stringify(updated));
  }
};

const saveUserTemplate = (template) => {
  // Remove all existing templates before adding the new one
  localStorage.removeItem("tradeForm_templates");
  const updated = [template];
  localStorage.setItem("tradeForm_templates", JSON.stringify(updated));
};

const removeUserTemplate = (templateName) => {
  const existing = getUserTemplates();
  const updated = existing.filter((t) => t.name !== templateName);
  localStorage.setItem("tradeForm_templates", JSON.stringify(updated));
};

// Create Template Modal Component
const CreateTemplateModal = ({ isOpen, onClose, onTemplateCreated }) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  const onSubmit = (data) => {
    const newTemplate = {
      id: Date.now().toString(),
      name: data.name,
      instrumentType: data.instrumentType || "",
      instrument: data.instrument || "",
      tradeType: data.tradeType || "",
      strategy: data.strategy || "",
      setup: data.setup || "",
      marketCondition: data.marketCondition || "",
      entryPrice: data.entryPrice || "",
      quantity: data.quantity || "",
      stopLoss: data.stopLoss || "",
      takeProfit: data.takeProfit || "",
      riskReward: data.riskReward || "",
      createdAt: new Date().toISOString(),
    };

    onTemplateCreated(newTemplate);
    reset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Create Template</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Template Name *</label>
            <input
              {...register("name", { required: "Template name is required" })}
              className="input"
              placeholder="e.g., Scalping Setup"
            />
            {errors.name && (
              <p className="text-danger-600 text-sm mt-1">
                {errors.name.message}
              </p>
            )}
          </div>

          <div>
            <label className="label">Instrument Type</label>
            <select {...register("instrumentType")} className="input">
              <option value="">Select instrument type</option>
              <option value="stocks">Stocks</option>
              <option value="forex">Forex</option>
              <option value="crypto">Crypto</option>
              <option value="futures">Futures</option>
              <option value="options">Options</option>
            </select>
          </div>

          <div>
            <label className="label">Instrument</label>
            <input
              {...register("instrument")}
              className="input"
              placeholder="e.g., AAPL, EURUSD"
            />
          </div>

          <div>
            <label className="label">Trade Type</label>
            <select {...register("tradeType")} className="input">
              <option value="">Select trade type</option>
              <option value="long">Long</option>
              <option value="short">Short</option>
            </select>
          </div>

          <div>
            <label className="label">Strategy</label>
            <input
              {...register("strategy")}
              className="input"
              placeholder="e.g., Breakout, Scalping"
            />
          </div>

          <div>
            <label className="label">Setup</label>
            <input
              {...register("setup")}
              className="input"
              placeholder="e.g., Flag, Triangle"
            />
          </div>

          <div>
            <label className="label">Market Condition</label>
            <input
              {...register("marketCondition")}
              className="input"
              placeholder="e.g., Trending, Ranging"
            />
          </div>

          <div>
            <label className="label">Entry Price</label>
            <input
              type="number"
              step="0.01"
              {...register("entryPrice")}
              className="input"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="label">Quantity</label>
            <input
              type="number"
              {...register("quantity")}
              className="input"
              placeholder="100"
            />
          </div>

          <div>
            <label className="label">Stop Loss</label>
            <input
              type="number"
              step="0.01"
              {...register("stopLoss")}
              className="input"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="label">Take Profit</label>
            <input
              type="number"
              step="0.01"
              {...register("takeProfit")}
              className="input"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="label">Risk/Reward Ratio</label>
            <input
              {...register("riskReward")}
              className="input"
              placeholder="e.g., 1:2"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create Template
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const TradeForm = ({ trade, onClose, selectedDate }) => {
  const { addTrade, updateTrade } = useTrades();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);
  const [isNewTemplateModalOpen, setIsNewTemplateModalOpen] = useState(false);

  // Get settings from localStorage
  const [settingsTemplates, setSettingsTemplates] = useState(() => {
    const stored = localStorage.getItem("settings_templates");
    return stored ? JSON.parse(stored) : [];
  });

  const [settingsRiskProfiles, setSettingsRiskProfiles] = useState(() => {
    const stored = localStorage.getItem("settings_riskProfiles");
    return stored ? JSON.parse(stored) : [];
  });

  const isEditing = !!trade;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: trade
      ? {
          ...trade,
          entryDate: trade.entryDate
            ? new Date(trade.entryDate).toISOString().split("T")[0]
            : "",
          exitDate: trade.exitDate
            ? new Date(trade.exitDate).toISOString().split("T")[0]
            : "",
        }
      : {
          entryDate: selectedDate
            ? new Date(selectedDate).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0],
          status: "open",
          instrumentType: "stocks",
        },
  });

  const watchedStatus = watch("status");
  const selectedInstrumentType = watch("instrumentType");

  // Constants
  const instrumentTypes = {
    stocks: "Stocks",
    forex: "Forex",
    crypto: "Crypto",
    futures: "Futures",
    options: "Options",
  };

  const instruments = {
    stocks: [
      "AAPL",
      "GOOGL",
      "MSFT",
      "AMZN",
      "TSLA",
      "META",
      "NVDA",
      "NFLX",
      "CRM",
      "ADBE",
      "PYPL",
      "INTC",
      "AMD",
      "ORCL",
      "IBM",
      "BABA",
      "JNJ",
      "JPM",
      "V",
      "MA",
      "UNH",
      "HD",
      "PG",
      "DIS",
      "KO",
      "PFE",
      "WMT",
      "BAC",
      "VZ",
      "T",
    ],
    forex: [
      "EURUSD",
      "GBPUSD",
      "USDJPY",
      "USDCHF",
      "AUDUSD",
      "USDCAD",
      "NZDUSD",
      "EURJPY",
      "GBPJPY",
      "EURGBP",
      "AUDJPY",
      "EURAUD",
      "EURCHF",
      "AUDCAD",
      "GBPAUD",
      "GBPCAD",
      "GBPCHF",
      "CADCHF",
      "CADJPY",
      "AUDCHF",
    ],
    crypto: [
      "BTCUSD",
      "ETHUSD",
      "BNBUSD",
      "ADAUSD",
      "SOLUSD",
      "XRPUSD",
      "DOTUSDT",
      "DOGEUSD",
      "AVAXUSD",
      "SHIBUSDT",
      "MATICUSD",
      "LTCUSD",
      "LINKUSD",
      "ATOMUSD",
      "ALGOUSD",
      "VETUSDT",
      "XLMUSDT",
      "FILUSD",
      "ICPUSD",
      "HBARUSD",
    ],
    futures: [
      "ES",
      "NQ",
      "YM",
      "RTY",
      "CL",
      "GC",
      "SI",
      "NG",
      "ZB",
      "ZN",
      "ZF",
      "ZT",
      "6E",
      "6B",
      "6J",
      "6A",
      "6C",
      "6S",
      "HE",
      "LE",
    ],
    options: ["SPY", "QQQ", "IWM", "AAPL", "TSLA", "AMC", "GME", "NVDA"],
  };

  const strategies = getUserOptions("strategies").concat([
    "Breakout",
    "Scalping",
    "Swing Trading",
    "Day Trading",
    "Position Trading",
    "Momentum",
    "Mean Reversion",
    "Trend Following",
    "Counter Trend",
    "Range Trading",
    "News Trading",
    "Earnings Play",
  ]);

  const setups = getUserOptions("setups").concat([
    "Flag",
    "Pennant",
    "Triangle",
    "Cup and Handle",
    "Head and Shoulders",
    "Double Top",
    "Double Bottom",
    "Support/Resistance",
    "Trendline Break",
    "Channel Break",
    "Wedge",
    "Rectangle",
  ]);

  const marketConditions = getUserOptions("marketConditions").concat([
    "Trending Up",
    "Trending Down",
    "Ranging",
    "Volatile",
    "Low Volume",
    "High Volume",
    "Pre-Market",
    "After Hours",
    "News Event",
    "Earnings",
  ]);

  const futuresContractTypes = {
    ES: {
      name: "E-mini S&P 500",
      mini: "$50 per point",
      micro: "$5 per point",
    },
    NQ: {
      name: "E-mini NASDAQ-100",
      mini: "$20 per point",
      micro: "$2 per point",
    },
    YM: { name: "E-mini Dow", mini: "$5 per point", micro: "$0.50 per point" },
    RTY: {
      name: "E-mini Russell 2000",
      mini: "$50 per point",
      micro: "$5 per point",
    },
  };

  // Template application function
  const applyTemplate = (templateId) => {
    const template = settingsTemplates.find((t) => t.id === templateId);
    if (!template) return;

    setIsApplyingTemplate(true);

    // Apply all template values to form
    const fieldsToApply = [
      "instrumentType",
      "instrument",
      "tradeType",
      "strategy",
      "setup",
      "marketCondition",
      "entryPrice",
      "quantity",
      "stopLoss",
      "takeProfit",
      "riskReward",
    ];

    fieldsToApply.forEach((field) => {
      if (template[field] !== undefined && template[field] !== "") {
        setValue(field, template[field]);
      }
    });

    toast.success(`Template "${template.name}" applied successfully!`);

    setTimeout(() => {
      setIsApplyingTemplate(false);
    }, 100);
  };

  // Auto-calculation effect - but skip when applying templates
  useEffect(() => {
    if (isApplyingTemplate) return;

    const subscription = watch((value, { name }) => {
      if (
        name === "entryPrice" ||
        name === "tradeType" ||
        name === "riskReward"
      ) {
        const entryPrice = parseFloat(value.entryPrice);
        const tradeType = value.tradeType;
        const riskReward = value.riskReward;

        if (entryPrice && entryPrice > 0 && tradeType && riskReward) {
          const [riskRatio, rewardRatio] = riskReward
            .split(":")
            .map((num) => parseFloat(num));

          if (riskRatio && rewardRatio) {
            // Find the selected profile for additional settings
            const selectedProfile = settingsRiskProfiles.find(
              (profile) =>
                `${profile.riskRatio}:${profile.rewardRatio}` === riskReward
            );

            // Calculate risk amount as percentage of entry price (default 2%)
            const defaultRiskPercent = selectedProfile?.riskPercent || 0.02;
            const riskAmount = entryPrice * defaultRiskPercent;

            // Calculate stop loss and take profit based on trade type
            let stopLoss, takeProfit;

            if (tradeType === "long") {
              stopLoss = entryPrice - riskAmount;
              takeProfit = entryPrice + riskAmount * (rewardRatio / riskRatio);
            } else {
              stopLoss = entryPrice + riskAmount;
              takeProfit = entryPrice - riskAmount * (rewardRatio / riskRatio);
            }

            // Set the calculated values
            setValue("stopLoss", stopLoss.toFixed(2));
            setValue("takeProfit", takeProfit.toFixed(2));
          }
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [watch, setValue, settingsRiskProfiles, isApplyingTemplate]);

  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true);

      // Save user options to localStorage for future use
      saveUserOption("strategies", data.strategy);
      saveUserOption("setups", data.setup);
      saveUserOption("marketConditions", data.marketCondition);

      // Format dates
      const formattedData = {
        ...data,
        entryDate: data.entryDate
          ? new Date(data.entryDate).toISOString()
          : null,
        exitDate: data.exitDate ? new Date(data.exitDate).toISOString() : null,
        entryPrice: parseFloat(data.entryPrice) || 0,
        quantity: parseFloat(data.quantity) || 0,
        stopLoss: parseFloat(data.stopLoss) || 0,
        takeProfit: parseFloat(data.takeProfit) || 0,
        exitPrice: parseFloat(data.exitPrice) || 0,
        pnl: parseFloat(data.pnl) || 0,
        tags: data.tags ? data.tags.split(",").map((tag) => tag.trim()) : [],
      };

      // Calculate P&L if exit price is provided
      if (formattedData.exitPrice && formattedData.status === "closed") {
        const pnlCalculation =
          formattedData.tradeType === "long"
            ? (formattedData.exitPrice - formattedData.entryPrice) *
              formattedData.quantity
            : (formattedData.entryPrice - formattedData.exitPrice) *
              formattedData.quantity;
        formattedData.pnl = pnlCalculation;
      }

      if (isEditing) {
        await updateTrade(trade.id, formattedData);
        toast.success("Trade updated successfully!");
      } else {
        await addTrade(formattedData);
        toast.success("Trade added successfully!");
      }

      onClose();
    } catch (error) {
      console.error("Error saving trade:", error);
      toast.error("Failed to save trade. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Calendar className="w-6 h-6 mr-2 text-blue-600" />
            {isEditing ? "Edit Trade" : "Add New Trade"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Horizontal Layout - Three Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Basic Trade Info */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900 pb-2 border-b">
                  Trade Details
                </h4>

                <div>
                  <label className="label">Instrument Type *</label>
                  <select
                    {...register("instrumentType", {
                      required: "Instrument type is required",
                    })}
                    className="input"
                  >
                    {Object.entries(instrumentTypes).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                  {errors.instrumentType && (
                    <p className="text-danger-600 text-sm mt-1">
                      {errors.instrumentType.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="label">Instrument *</label>
                  <input
                    list="instruments"
                    {...register("instrument", {
                      required: "Instrument is required",
                    })}
                    className="input"
                    placeholder={`Select ${
                      instrumentTypes[selectedInstrumentType]?.toLowerCase() ||
                      "instrument"
                    }`}
                  />
                  <datalist id="instruments">
                    {instruments[selectedInstrumentType]?.map((instrument) => (
                      <option key={instrument} value={instrument} />
                    ))}
                  </datalist>
                  {errors.instrument && (
                    <p className="text-danger-600 text-sm mt-1">
                      {errors.instrument.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="label">Trade Type *</label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="long"
                        {...register("tradeType", {
                          required: "Trade type is required",
                        })}
                        className="mr-2"
                      />
                      <TrendingUp className="w-4 h-4 text-success-600 mr-1" />
                      Long
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="short"
                        {...register("tradeType", {
                          required: "Trade type is required",
                        })}
                        className="mr-2"
                      />
                      <TrendingDown className="w-4 h-4 text-danger-600 mr-1" />
                      Short
                    </label>
                  </div>
                  {errors.tradeType && (
                    <p className="text-danger-600 text-sm mt-1">
                      {errors.tradeType.message}
                    </p>
                  )}
                </div>

                {/* Templates Section */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="label">Template</label>
                    <button
                      type="button"
                      onClick={() => setIsNewTemplateModalOpen(true)}
                      className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                    >
                      Create Template
                    </button>
                  </div>
                  {settingsTemplates.length > 0 ? (
                    <select
                      {...register("template")}
                      className="input"
                      onChange={(e) => {
                        const selectedTemplateId = e.target.value;
                        if (selectedTemplateId) {
                          applyTemplate(selectedTemplateId);
                        }
                      }}
                    >
                      <option value="">Select a template</option>
                      {settingsTemplates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="input bg-gray-50 text-gray-500 flex items-center justify-between">
                      <span>No templates available</span>
                      <button
                        type="button"
                        onClick={() => setIsNewTemplateModalOpen(true)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Create first template
                      </button>
                    </div>
                  )}
                </div>

                {/* Strategy - Free Form with Suggestions */}
                <div>
                  <label className="label">Strategy</label>
                  <input
                    list="strategies-list"
                    {...register("strategy")}
                    className="input"
                    placeholder="Enter strategy or leave empty"
                  />
                  <datalist id="strategies-list">
                    {strategies.map((strategy) => (
                      <option key={strategy} value={strategy} />
                    ))}
                  </datalist>
                </div>

                {/* Setup - Free Form with Suggestions */}
                <div>
                  <label className="label">Setup</label>
                  <input
                    list="setups-list"
                    {...register("setup")}
                    className="input"
                    placeholder="Enter setup or leave empty"
                  />
                  <datalist id="setups-list">
                    {setups.map((setup) => (
                      <option key={setup} value={setup} />
                    ))}
                  </datalist>
                </div>

                {/* Market Condition - Free Form with Suggestions */}
                <div>
                  <label className="label">Market Condition</label>
                  <input
                    list="market-conditions-list"
                    {...register("marketCondition")}
                    className="input"
                    placeholder="Enter market condition or leave empty"
                  />
                  <datalist id="market-conditions-list">
                    {marketConditions.map((condition) => (
                      <option key={condition} value={condition} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Middle Column - Trade Execution */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900 pb-2 border-b">
                  Trade Execution
                </h4>

                <div>
                  <label className="label">Entry Date *</label>
                  <input
                    type="date"
                    {...register("entryDate", {
                      required: "Entry date is required",
                    })}
                    className="input"
                  />
                  {errors.entryDate && (
                    <p className="text-danger-600 text-sm mt-1">
                      {errors.entryDate.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="label">Entry Time</label>
                  <input
                    type="time"
                    {...register("entryTime")}
                    className="input"
                  />
                </div>

                <div>
                  <label className="label">Entry Price *</label>
                  <input
                    type="number"
                    step="0.01"
                    {...register("entryPrice", {
                      required: "Entry price is required",
                    })}
                    className="input"
                    placeholder="0.00"
                  />
                  {errors.entryPrice && (
                    <p className="text-danger-600 text-sm mt-1">
                      {errors.entryPrice.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="label">Quantity *</label>
                  <input
                    type="number"
                    {...register("quantity", {
                      required: "Quantity is required",
                    })}
                    className="input"
                    placeholder={
                      selectedInstrumentType === "futures"
                        ? "Number of contracts"
                        : selectedInstrumentType === "forex"
                        ? "Lot size (e.g., 0.1, 1.0)"
                        : selectedInstrumentType === "crypto"
                        ? "Amount"
                        : "Number of shares"
                    }
                  />
                  {errors.quantity && (
                    <p className="text-danger-600 text-sm mt-1">
                      {errors.quantity.message}
                    </p>
                  )}

                  {/* Futures Contract Type */}
                  {selectedInstrumentType === "futures" && (
                    <div className="mt-2">
                      <label className="label">Contract Type</label>
                      <select {...register("contractType")} className="input">
                        <option value="">Select contract type</option>
                        <option value="mini">Mini Contract</option>
                        <option value="micro">Micro Contract</option>
                        <option value="standard">Standard Contract</option>
                      </select>
                      {watch("instrument") &&
                        futuresContractTypes[watch("instrument")] && (
                          <div className="mt-1 text-xs text-gray-600">
                            <p>
                              <strong>
                                {futuresContractTypes[watch("instrument")].name}
                              </strong>
                            </p>
                            <p>
                              Mini:{" "}
                              {futuresContractTypes[watch("instrument")].mini}
                            </p>
                            <p>
                              Micro:{" "}
                              {futuresContractTypes[watch("instrument")].micro}
                            </p>
                          </div>
                        )}
                    </div>
                  )}

                  {/* Crypto Leverage */}
                  {selectedInstrumentType === "crypto" && (
                    <div className="mt-2">
                      <label className="label">Leverage (optional)</label>
                      <select {...register("leverage")} className="input">
                        <option value="">No leverage</option>
                        <option value="2">2x</option>
                        <option value="3">3x</option>
                        <option value="5">5x</option>
                        <option value="10">10x</option>
                        <option value="20">20x</option>
                        <option value="25">25x</option>
                        <option value="50">50x</option>
                        <option value="100">100x</option>
                      </select>
                      <p className="text-xs text-gray-600 mt-1">
                        Leverage multiplies both potential profits and losses
                      </p>
                    </div>
                  )}

                  {/* Forex Lot Size Helper */}
                  {selectedInstrumentType === "forex" && (
                    <div className="mt-1 text-xs text-gray-600">
                      <p>Standard lot = 1.0 (100,000 units)</p>
                      <p>Mini lot = 0.1 (10,000 units)</p>
                      <p>Micro lot = 0.01 (1,000 units)</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="label">Stop Loss</label>
                  <input
                    type="number"
                    step="0.01"
                    {...register("stopLoss")}
                    className="input"
                    placeholder="0.00"
                  />
                  {watch("riskReward") && watch("entryPrice") && (
                    <p className="text-xs text-blue-600 mt-1 flex items-center">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-1"></span>
                      Auto-calculated from R/R ratio
                    </p>
                  )}
                </div>

                <div>
                  <label className="label">Take Profit</label>
                  <input
                    type="number"
                    step="0.01"
                    {...register("takeProfit")}
                    className="input"
                    placeholder="0.00"
                  />
                  {watch("riskReward") && watch("entryPrice") && (
                    <p className="text-xs text-blue-600 mt-1 flex items-center">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-1"></span>
                      Auto-calculated from R/R ratio
                    </p>
                  )}
                </div>

                <div>
                  <label className="label">Status</label>
                  <select {...register("status")} className="input">
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                {watchedStatus === "closed" && (
                  <>
                    <div>
                      <label className="label">Exit Date</label>
                      <input
                        type="date"
                        {...register("exitDate")}
                        className="input"
                      />
                    </div>

                    <div>
                      <label className="label">Exit Time</label>
                      <input
                        type="time"
                        {...register("exitTime")}
                        className="input"
                      />
                    </div>

                    <div>
                      <label className="label">Exit Price</label>
                      <input
                        type="number"
                        step="0.01"
                        {...register("exitPrice")}
                        className="input"
                        placeholder="0.00"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Right Column - Risk Management */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900 pb-2 border-b flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
                  Risk Management
                </h4>

                {/* Risk/Reward Ratio */}
                <div>
                  <label className="label">Risk/Reward Ratio</label>
                  {settingsRiskProfiles.length > 0 ? (
                    <select
                      {...register("riskReward")}
                      className="input"
                      onChange={(e) => {
                        // Update the form field
                        setValue("riskReward", e.target.value);

                        // Auto-calculate stop loss and take profit when ratio is selected
                        if (e.target.value && !isApplyingTemplate) {
                          const [riskRatio, rewardRatio] = e.target.value
                            .split(":")
                            .map((num) => parseFloat(num));
                          const entryPrice = parseFloat(watch("entryPrice"));
                          const tradeType = watch("tradeType");

                          if (
                            entryPrice &&
                            entryPrice > 0 &&
                            riskRatio &&
                            rewardRatio
                          ) {
                            // Find the selected profile for additional settings
                            const selectedProfile = settingsRiskProfiles.find(
                              (profile) =>
                                `${profile.riskRatio}:${profile.rewardRatio}` ===
                                e.target.value
                            );

                            // Calculate risk amount as percentage of entry price (default 2%)
                            const defaultRiskPercent =
                              selectedProfile?.riskPercent || 0.02;
                            const riskAmount = entryPrice * defaultRiskPercent;

                            // Calculate stop loss and take profit based on trade type
                            let stopLoss, takeProfit;

                            if (tradeType === "long") {
                              stopLoss = entryPrice - riskAmount;
                              takeProfit =
                                entryPrice +
                                riskAmount * (rewardRatio / riskRatio);
                            } else {
                              stopLoss = entryPrice + riskAmount;
                              takeProfit =
                                entryPrice -
                                riskAmount * (rewardRatio / riskRatio);
                            }

                            // Set the calculated values
                            setValue("stopLoss", stopLoss.toFixed(2));
                            setValue("takeProfit", takeProfit.toFixed(2));

                            // Show success message
                            toast.success(
                              `Stop Loss and Take Profit calculated for ${riskRatio}:${rewardRatio} ratio`
                            );
                          }
                        }
                      }}
                    >
                      <option value="">Select risk/reward ratio</option>
                      {settingsRiskProfiles.map((profile) => (
                        <option
                          key={profile.id}
                          value={`${profile.riskRatio}:${profile.rewardRatio}`}
                        >
                          {profile.name} ({profile.riskRatio}:
                          {profile.rewardRatio})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="input bg-gray-50 text-gray-500 flex items-center">
                      No risk profiles available - Create them in Settings
                    </div>
                  )}
                </div>

                {/* Potential P&L Display */}
                {watch("riskReward") &&
                  watch("entryPrice") &&
                  watch("quantity") &&
                  watch("stopLoss") && (
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                      <h5 className="text-sm font-semibold text-blue-900 mb-3 flex items-center">
                        <DollarSign className="w-4 h-4 mr-2" />
                        Potential Profit & Loss
                      </h5>
                      <div className="grid grid-cols-1 gap-3">
                        <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                          <div className="text-xs text-red-600 font-medium">
                            MAXIMUM RISK
                          </div>
                          <div className="text-lg font-bold text-red-700">
                            $
                            {(() => {
                              const entryPrice =
                                parseFloat(watch("entryPrice")) || 0;
                              const stopLoss =
                                parseFloat(watch("stopLoss")) || 0;
                              const quantity =
                                parseFloat(watch("quantity")) || 0;
                              const risk =
                                Math.abs(entryPrice - stopLoss) * quantity;
                              return risk.toFixed(2);
                            })()}
                          </div>
                          <div className="text-xs text-red-600">
                            {(() => {
                              const entryPrice =
                                parseFloat(watch("entryPrice")) || 0;
                              const stopLoss =
                                parseFloat(watch("stopLoss")) || 0;
                              const riskPercent =
                                entryPrice > 0
                                  ? Math.abs(
                                      ((entryPrice - stopLoss) / entryPrice) *
                                        100
                                    )
                                  : 0;
                              return `${riskPercent.toFixed(2)}% risk`;
                            })()}
                          </div>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                          <div className="text-xs text-green-600 font-medium">
                            POTENTIAL REWARD
                          </div>
                          <div className="text-lg font-bold text-green-700">
                            $
                            {(() => {
                              const riskReward = watch("riskReward");
                              if (!riskReward) return "0.00";
                              const [risk, reward] = riskReward
                                .split(":")
                                .map((num) => parseFloat(num));
                              const entryPrice =
                                parseFloat(watch("entryPrice")) || 0;
                              const stopLoss =
                                parseFloat(watch("stopLoss")) || 0;
                              const quantity =
                                parseFloat(watch("quantity")) || 0;
                              const riskAmount =
                                Math.abs(entryPrice - stopLoss) * quantity;
                              const rewardAmount = riskAmount * (reward / risk);
                              return rewardAmount.toFixed(2);
                            })()}
                          </div>
                          <div className="text-xs text-green-600">
                            {(() => {
                              const riskReward = watch("riskReward");
                              if (!riskReward) return "";
                              const [risk, reward] = riskReward
                                .split(":")
                                .map((num) => parseFloat(num));
                              const entryPrice =
                                parseFloat(watch("entryPrice")) || 0;
                              const stopLoss =
                                parseFloat(watch("stopLoss")) || 0;
                              const riskPercent =
                                entryPrice > 0
                                  ? Math.abs(
                                      ((entryPrice - stopLoss) / entryPrice) *
                                        100
                                    )
                                  : 0;
                              const rewardPercent =
                                riskPercent * (reward / risk);
                              return `${rewardPercent.toFixed(2)}% reward`;
                            })()}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 text-center">
                        <div className="text-sm text-blue-700 font-medium">
                          Risk/Reward Ratio:{" "}
                          {watch("riskReward") || "Not selected"}
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            </div>

            {/* Bottom Section - Notes and Tags */}
            <div className="pt-6 border-t space-y-4">
              <div>
                <label className="label">Tags</label>
                <input
                  {...register("tags")}
                  className="input"
                  placeholder="comma, separated, tags"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Separate multiple tags with commas
                </p>
              </div>

              <div>
                <label className="label">Notes</label>
                <textarea
                  {...register("notes")}
                  rows={4}
                  className="input resize-none"
                  placeholder="Trade notes, analysis, lessons learned..."
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-between items-center pt-6 border-t">
              <div className="text-sm text-gray-500">
                <p>
                  💡 <strong>Tip:</strong> Press{" "}
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">
                    Ctrl+Enter
                  </kbd>{" "}
                  to submit,{" "}
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">
                    Esc
                  </kbd>{" "}
                  to cancel
                </p>
              </div>
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-secondary"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? "Saving..."
                    : isEditing
                    ? "Update Trade"
                    : "Add Trade"}
                </button>
              </div>
            </div>
          </form>

          {/* Create Template Modal */}
          {isNewTemplateModalOpen && (
            <CreateTemplateModal
              isOpen={isNewTemplateModalOpen}
              onClose={() => setIsNewTemplateModalOpen(false)}
              onTemplateCreated={(newTemplate) => {
                setSettingsTemplates([...settingsTemplates, newTemplate]);
                setIsNewTemplateModalOpen(false);
                toast.success(
                  `Template "${newTemplate.name}" created successfully!`
                );
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default TradeForm;
