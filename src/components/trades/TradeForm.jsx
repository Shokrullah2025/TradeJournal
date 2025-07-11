import React, { useState } from "react";
import { useForm } from "react-hook-form";
import {
  X,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
} from "lucide-react";
import { useTrades } from "../../context/TradeContext";
import toast from "react-hot-toast";

// Helper functions moved to top to avoid hoisting issues
// Helper functions moved outside component to avoid hoisting issues
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

const TradeForm = ({ trade, onClose, selectedDate }) => {
  const { addTrade, updateTrade } = useTrades();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedInstrumentType, setSelectedInstrumentType] =
    useState("stocks");

  // State for managing custom templates
  const [showTemplateCreator, setShowTemplateCreator] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [userTemplates, setUserTemplates] = useState(getUserTemplates());

  // Process trade data for editing to ensure correct formats
  const getDefaultValues = () => {
    if (!trade) {
      // Use selectedDate if provided, otherwise use current date
      const defaultDate = selectedDate
        ? selectedDate.toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0];

      return {
        instrumentType: "stocks",
        instrument: "",
        tradeType: "long",
        strategy: "",
        entryDate: defaultDate,
        entryTime: new Date().toTimeString().slice(0, 5),
        entryPrice: "",
        quantity: "",
        contractType: "",
        leverage: "",
        exitDate: "",
        exitTime: "",
        exitPrice: "",
        stopLoss: "",
        takeProfit: "",
        fees: "",
        status: "open",
        notes: "",
        tags: "",
        riskReward: "",
        setup: "",
        marketCondition: "",
      };
    }

    // Process existing trade data for editing
    return {
      instrumentType: trade.instrumentType || "stocks",
      instrument: trade.instrument || "",
      tradeType: trade.tradeType || "long",
      strategy: trade.strategy || "",
      entryDate: trade.entryDate || "",
      entryTime: trade.entryTime || "",
      entryPrice: trade.entryPrice?.toString() || "",
      quantity: trade.quantity?.toString() || "",
      contractType: trade.contractType || "",
      leverage: trade.leverage?.toString() || "",
      exitDate: trade.exitDate || "",
      exitTime: trade.exitTime || "",
      exitPrice: trade.exitPrice?.toString() || "",
      stopLoss: trade.stopLoss?.toString() || "",
      takeProfit: trade.takeProfit?.toString() || "",
      fees: trade.fees?.toString() || "",
      status: trade.status || "open",
      notes: trade.notes || "",
      tags: Array.isArray(trade.tags)
        ? trade.tags.join(", ")
        : trade.tags || "",
      riskReward: trade.riskReward?.toString() || "",
      setup: trade.setup || "",
      marketCondition: trade.marketCondition || "",
    };
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: getDefaultValues(),
  });

  const watchedStatus = watch("status");
  const watchedInstrumentType = watch("instrumentType");
  const isEditing = !!trade;

  // Update selectedInstrumentType when form value changes
  React.useEffect(() => {
    setSelectedInstrumentType(watchedInstrumentType || "stocks");
  }, [watchedInstrumentType]);

  const onSubmit = async (data) => {
    setIsSubmitting(true);

    try {
      // Process tags
      const tags = data.tags
        ? data.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter((tag) => tag)
        : [];

      // Convert numeric fields safely
      const processedData = {
        ...data,
        entryPrice: parseFloat(data.entryPrice) || 0,
        quantity: parseInt(data.quantity) || 0,
        exitPrice: data.exitPrice ? parseFloat(data.exitPrice) || null : null,
        stopLoss: data.stopLoss ? parseFloat(data.stopLoss) || null : null,
        takeProfit: data.takeProfit
          ? parseFloat(data.takeProfit) || null
          : null,
        fees: data.fees ? parseFloat(data.fees) || 0 : 0,
        riskReward: data.riskReward
          ? parseFloat(data.riskReward) || null
          : null,
        leverage: data.leverage ? parseFloat(data.leverage) || null : null,
        tags,
      };

      // Save new values to localStorage for future suggestions
      if (processedData.strategy && processedData.strategy.trim()) {
        saveUserOption("strategies", processedData.strategy.trim());
      }
      if (processedData.setup && processedData.setup.trim()) {
        saveUserOption("setups", processedData.setup.trim());
      }
      if (
        processedData.marketCondition &&
        processedData.marketCondition.trim()
      ) {
        saveUserOption(
          "marketConditions",
          processedData.marketCondition.trim()
        );
      }

      // Validate required fields
      if (!processedData.instrument) {
        toast.error("Please enter an instrument");
        setIsSubmitting(false);
        return;
      }

      if (processedData.entryPrice <= 0 || processedData.quantity <= 0) {
        toast.error("Entry price and quantity must be greater than 0");
        setIsSubmitting(false);
        return;
      }

      if (isEditing) {
        updateTrade({ ...processedData, id: trade.id });
        toast.success("Trade updated successfully!");
      } else {
        addTrade(processedData);
        toast.success("Trade added successfully!");
      }

      onClose();
    } catch (error) {
      toast.error("Failed to save trade");
      console.error("Form submission error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // No more predefined strategies - users create their own
  const strategies = getUserOptions("strategies");

  const instrumentTypes = {
    stocks: "Stocks",
    forex: "Forex",
    futures: "Futures",
    crypto: "Cryptocurrency",
    options: "Options",
  };

  const instrumentsByType = {
    stocks: [
      "AAPL",
      "GOOGL",
      "MSFT",
      "TSLA",
      "AMZN",
      "NVDA",
      "META",
      "NFLX",
      "SPY",
      "QQQ",
      "IWM",
      "DIA",
      "VTI",
      "VXUS",
      "BRK.B",
      "JPM",
      "JNJ",
      "V",
      "PG",
      "UNH",
      "HD",
      "MA",
      "DIS",
      "PYPL",
      "ADBE",
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
      "NZDCAD",
      "GBPAUD",
      "AUDCAD",
      "CHFJPY",
      "CADJPY",
      "AUDNZD",
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
      "ZC",
      "ZW",
      "ZS",
      "KC",
      "CC",
      "SB",
      "CT",
      "6E",
      "6B",
      "6J",
      "6A",
      "6C",
    ],
    crypto: [
      "BTCUSD",
      "ETHUSD",
      "ADAUSD",
      "SOLUSD",
      "DOTUSD",
      "LINKUSD",
      "MATICUSD",
      "AVAXUSD",
      "ATOMUSD",
      "ALGOUSD",
      "XRPUSD",
      "LTCUSD",
      "BCHUSD",
      "UNIUSD",
      "AAVEUSD",
      "MKRUSD",
      "COMPUSD",
      "YFIUSD",
    ],
    options: [
      "SPY",
      "QQQ",
      "IWM",
      "AAPL",
      "TSLA",
      "AMZN",
      "GOOGL",
      "MSFT",
      "NVDA",
      "META",
      "NFLX",
      "AMD",
      "BABA",
      "DIS",
      "BA",
    ],
  };

  // No more predefined setups - users create their own
  const setups = getUserOptions("setups");

  // No more predefined market conditions - users create their own
  const marketConditions = getUserOptions("marketConditions");

  const futuresContractTypes = {
    ES: {
      name: "E-mini S&P 500",
      mini: "1 contract = $50/point",
      micro: "1 contract = $5/point",
    },
    NQ: {
      name: "E-mini NASDAQ",
      mini: "1 contract = $20/point",
      micro: "1 contract = $2/point",
    },
    YM: {
      name: "E-mini Dow",
      mini: "1 contract = $5/point",
      micro: "1 contract = $0.50/point",
    },
    RTY: {
      name: "E-mini Russell",
      mini: "1 contract = $50/point",
      micro: "1 contract = $5/point",
    },
    CL: {
      name: "Crude Oil",
      mini: "1 contract = 1000 barrels",
      micro: "1 contract = 100 barrels",
    },
    GC: {
      name: "Gold",
      mini: "1 contract = 100 oz",
      micro: "1 contract = 10 oz",
    },
    SI: {
      name: "Silver",
      mini: "1 contract = 5000 oz",
      micro: "1 contract = 1000 oz",
    },
  };

  // Remove user's custom option
  const removeUserOption = (type, value) => {
    const existing = getUserOptions(type);
    const updated = existing.filter((item) => item !== value);
    localStorage.setItem(`tradeForm_${type}`, JSON.stringify(updated));
  };

  // Update user templates when localStorage changes
  React.useEffect(() => {
    setUserTemplates(getUserTemplates());
  }, []);

  // Combined quick fill templates (default + user)
  const defaultTemplates = [
    {
      name: "Day Trade Long",
      data: {
        tradeType: "long",
        strategy: "Breakout",
        setup: "Bull Flag",
        marketCondition: "Bullish",
        status: "closed",
      },
      isDefault: true,
    },
    {
      name: "Day Trade Short",
      data: {
        tradeType: "short",
        strategy: "Pullback",
        setup: "Bear Flag",
        marketCondition: "Bearish",
        status: "closed",
      },
      isDefault: true,
    },
    {
      name: "Swing Trade",
      data: {
        tradeType: "long",
        strategy: "Swing Trading",
        setup: "Support/Resistance",
        marketCondition: "Sideways",
        status: "open",
      },
      isDefault: true,
    },
    {
      name: "Scalp Trade",
      data: {
        tradeType: "long",
        strategy: "Scalping",
        setup: "Momentum",
        marketCondition: "High Volatility",
        status: "closed",
      },
      isDefault: true,
    },
  ];

  const allTemplates = [...defaultTemplates, ...userTemplates];

  // Save current form as template
  const saveCurrentFormAsTemplate = () => {
    if (!newTemplateName.trim()) {
      toast.error("Please enter a template name");
      return;
    }

    const currentValues = watch();
    const template = {
      name: newTemplateName,
      data: {
        instrumentType: currentValues.instrumentType,
        tradeType: currentValues.tradeType,
        strategy: currentValues.strategy,
        setup: currentValues.setup,
        marketCondition: currentValues.marketCondition,
        status: currentValues.status,
      },
      isDefault: false,
    };

    // Clear existing templates and save new one
    saveUserTemplate(template);
    setUserTemplates(getUserTemplates());
    setNewTemplateName("");
    setShowTemplateCreator(false);
    toast.success(`Template "${newTemplateName}" saved! (Previous templates replaced)`);
  };

  // Delete user template
  const deleteTemplate = (templateName) => {
    removeUserTemplate(templateName);
    setUserTemplates(getUserTemplates());
    toast.success(`Template "${templateName}" deleted!`);
  };

  // Auto-focus on first input
  React.useEffect(() => {
    const firstInput = document.querySelector(
      '.trade-form input[type="text"], .trade-form select'
    );
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 100);
    }
  }, []);

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      // Escape key to close
      if (e.key === "Escape" && !isSubmitting) {
        onClose();
      }
      // Ctrl+Enter to submit
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSubmit(onSubmit)();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSubmitting, onClose, handleSubmit, onSubmit]);

  // Quick fill function
  const applyQuickFill = (template) => {
    Object.entries(template.data).forEach(([key, value]) => {
      setValue(key, value);
    });
    toast.success(`Applied ${template.name} template`);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        <div className="inline-block w-full max-w-4xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl trade-form">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-gray-900">
              {isEditing ? "Edit Trade" : "Add New Trade"}
            </h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Quick Fill Templates */}
          {!isEditing && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-semibold text-blue-900">
                  Quick Fill Templates
                </h4>
                <button
                  type="button"
                  onClick={() => setShowTemplateCreator(!showTemplateCreator)}
                  className="text-xs text-blue-700 hover:text-blue-900 underline"
                >
                  {showTemplateCreator ? "Cancel" : "Create New Template"}
                </button>
              </div>

              {showTemplateCreator && (
                <div className="mb-4 p-3 bg-white rounded border border-blue-200">
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                      placeholder="Template name (e.g., 'My Scalp Setup')"
                      className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded"
                    />
                    <button
                      type="button"
                      onClick={saveCurrentFormAsTemplate}
                      className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Save
                    </button>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Fill out the form fields below, then save as a template
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {allTemplates.map((template) => (
                  <div key={template.name} className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => applyQuickFill(template)}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                    >
                      {template.name}
                    </button>
                    {!template.isDefault && (
                      <button
                        type="button"
                        onClick={() => deleteTemplate(template.name)}
                        className="w-4 h-4 text-red-500 hover:text-red-700 text-xs"
                        title="Delete template"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-blue-700 mt-2">
                Click a template to quickly fill common field combinations. You
                can still modify any field after applying.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900 pb-2 border-b">
                  Trade Details
                </h4>

                {/* Instrument Type Selection */}
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

                {/* Dynamic Instrument Selection */}
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
                    {(instrumentsByType[selectedInstrumentType] || []).map(
                      (instrument) => (
                        <option key={instrument} value={instrument} />
                      )
                    )}
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
                        {...register("tradeType")}
                        className="mr-2"
                      />
                      <TrendingUp className="w-4 h-4 text-success-600 mr-1" />
                      Long
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="short"
                        {...register("tradeType")}
                        className="mr-2"
                      />
                      <TrendingDown className="w-4 h-4 text-danger-600 mr-1" />
                      Short
                    </label>
                  </div>
                </div>

                {/* Strategy - Free Form with Suggestions */}
                <div>
                  <label className="label">Strategy</label>
                  <div className="flex space-x-2">
                    <input
                      list="strategies-list"
                      {...register("strategy")}
                      className="input flex-1"
                      placeholder="Enter strategy or leave empty"
                    />
                    <button
                      type="button"
                      onClick={() => setValue("strategy", "")}
                      className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-600"
                      title="Clear strategy"
                    >
                      Clear
                    </button>
                  </div>
                  <datalist id="strategies-list">
                    {strategies.map((strategy) => (
                      <option key={strategy} value={strategy} />
                    ))}
                  </datalist>
                  <p className="text-xs text-gray-500 mt-1">
                    Type to add a new strategy or select from suggestions
                  </p>
                </div>

                {/* Setup - Free Form with Suggestions */}
                <div>
                  <label className="label">Setup</label>
                  <div className="flex space-x-2">
                    <input
                      list="setups-list"
                      {...register("setup")}
                      className="input flex-1"
                      placeholder="Enter setup or leave empty"
                    />
                    <button
                      type="button"
                      onClick={() => setValue("setup", "")}
                      className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-600"
                      title="Clear setup"
                    >
                      Clear
                    </button>
                  </div>
                  <datalist id="setups-list">
                    {setups.map((setup) => (
                      <option key={setup} value={setup} />
                    ))}
                  </datalist>
                  <p className="text-xs text-gray-500 mt-1">
                    Type to add a new setup or select from suggestions
                  </p>
                </div>

                {/* Market Condition - Free Form with Suggestions */}
                <div>
                  <label className="label">Market Condition</label>
                  <div className="flex space-x-2">
                    <input
                      list="market-conditions-list"
                      {...register("marketCondition")}
                      className="input flex-1"
                      placeholder="Enter market condition or leave empty"
                    />
                    <button
                      type="button"
                      onClick={() => setValue("marketCondition", "")}
                      className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-600"
                      title="Clear market condition"
                    >
                      Clear
                    </button>
                  </div>
                  <datalist id="market-conditions-list">
                    {marketConditions.map((condition) => (
                      <option key={condition} value={condition} />
                    ))}
                  </datalist>
                  <p className="text-xs text-gray-500 mt-1">
                    Type to add a new market condition or select from
                    suggestions
                  </p>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900 pb-2 border-b">
                  Trade Execution
                </h4>

                <div className="grid grid-cols-2 gap-4">
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
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                                  {
                                    futuresContractTypes[watch("instrument")]
                                      .name
                                  }
                                </strong>
                              </p>
                              <p>
                                Mini:{" "}
                                {futuresContractTypes[watch("instrument")].mini}
                              </p>
                              <p>
                                Micro:{" "}
                                {
                                  futuresContractTypes[watch("instrument")]
                                    .micro
                                }
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
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                    <div className="grid grid-cols-2 gap-4">
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
            </div>

            {/* Bottom Section */}
            <div className="pt-6 border-t space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Fees/Commission</label>
                  <input
                    type="number"
                    step="0.01"
                    {...register("fees")}
                    className="input"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="label">Risk/Reward Ratio</label>
                  <input
                    type="number"
                    step="0.1"
                    {...register("riskReward")}
                    className="input"
                    placeholder="e.g., 1.5"
                  />
                </div>
              </div>

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
        </div>
      </div>
    </div>
  );
};

export default TradeForm;
