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
  Zap,
  Settings,
  Target,
  Clock,
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
              <p className="text-danger-600 text-sm mt-1">{errors.name.message}</p>
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
  const [activeTab, setActiveTab] = useState("quick"); // "quick" or "advanced"

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
      "AAPL", "GOOGL", "MSFT", "AMZN", "TSLA", "META", "NVDA", "NFLX", "CRM", "ADBE",
      "PYPL", "INTC", "AMD", "ORCL", "IBM", "BABA", "JNJ", "JPM", "V", "MA",
      "UNH", "HD", "PG", "DIS", "KO", "PFE", "WMT", "BAC", "VZ", "T"
    ],
    forex: [
      "EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCAD", "NZDUSD",
      "EURJPY", "GBPJPY", "EURGBP", "AUDJPY", "EURAUD", "EURCHF", "AUDCAD",
      "GBPAUD", "GBPCAD", "GBPCHF", "CADCHF", "CADJPY", "AUDCHF"
    ],
    crypto: [
      "BTCUSD", "ETHUSD", "BNBUSD", "ADAUSD", "SOLUSD", "XRPUSD", "DOTUSDT",
      "DOGEUSD", "AVAXUSD", "SHIBUSDT", "MATICUSD", "LTCUSD", "LINKUSD",
      "ATOMUSD", "ALGOUSD", "VETUSDT", "XLMUSDT", "FILUSD", "ICPUSD", "HBARUSD"
    ],
    futures: [
      "ES", "NQ", "YM", "RTY", "CL", "GC", "SI", "NG", "ZB", "ZN",
      "ZF", "ZT", "6E", "6B", "6J", "6A", "6C", "6S", "HE", "LE"
    ],
    options: ["SPY", "QQQ", "IWM", "AAPL", "TSLA", "AMC", "GME", "NVDA"]
  };

  const strategies = getUserOptions("strategies").concat([
    "Breakout", "Scalping", "Swing Trading", "Day Trading", "Position Trading",
    "Momentum", "Mean Reversion", "Trend Following", "Counter Trend",
    "Range Trading", "News Trading", "Earnings Play"
  ]);

  const setups = getUserOptions("setups").concat([
    "Flag", "Pennant", "Triangle", "Cup and Handle", "Head and Shoulders",
    "Double Top", "Double Bottom", "Support/Resistance", "Trendline Break",
    "Channel Break", "Wedge", "Rectangle"
  ]);

  const marketConditions = getUserOptions("marketConditions").concat([
    "Trending Up", "Trending Down", "Ranging", "Volatile", "Low Volume",
    "High Volume", "Pre-Market", "After Hours", "News Event", "Earnings"
  ]);

  const futuresContractTypes = {
    ES: { name: "E-mini S&P 500", mini: "$50 per point", micro: "$5 per point" },
    NQ: { name: "E-mini NASDAQ-100", mini: "$20 per point", micro: "$2 per point" },
    YM: { name: "E-mini Dow", mini: "$5 per point", micro: "$0.50 per point" },
    RTY: { name: "E-mini Russell 2000", mini: "$50 per point", micro: "$5 per point" },
  };

  // Template application function
  const applyTemplate = (templateId) => {
    const template = settingsTemplates.find((t) => t.id === templateId);
    if (!template) return;

    setIsApplyingTemplate(true);

    // Apply all template values to form
    const fieldsToApply = [
      'instrumentType', 'instrument', 'tradeType', 'strategy', 'setup', 
      'marketCondition', 'entryPrice', 'quantity', 'stopLoss', 'takeProfit', 'riskReward'
    ];

    fieldsToApply.forEach(field => {
      if (template[field] !== undefined && template[field] !== '') {
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
      if (name === "entryPrice" || name === "tradeType" || name === "riskReward") {
        const entryPrice = parseFloat(value.entryPrice);
        const tradeType = value.tradeType;
        const riskReward = value.riskReward;

        if (entryPrice && entryPrice > 0 && tradeType && riskReward) {
          const [riskRatio, rewardRatio] = riskReward.split(':').map(num => parseFloat(num));
          
          if (riskRatio && rewardRatio) {
            // Find the selected profile for additional settings
            const selectedProfile = settingsRiskProfiles.find(
              profile => `${profile.riskRatio}:${profile.rewardRatio}` === riskReward
            );
            
            // Calculate risk amount as percentage of entry price (default 2%)
            const defaultRiskPercent = selectedProfile?.riskPercent || 0.02;
            const riskAmount = entryPrice * defaultRiskPercent;
            
            // Calculate stop loss and take profit based on trade type
            let stopLoss, takeProfit;
            
            if (tradeType === "long") {
              stopLoss = entryPrice - riskAmount;
              takeProfit = entryPrice + (riskAmount * (rewardRatio / riskRatio));
            } else {
              stopLoss = entryPrice + riskAmount;
              takeProfit = entryPrice - (riskAmount * (rewardRatio / riskRatio));
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
        entryDate: data.entryDate ? new Date(data.entryDate).toISOString() : null,
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
            ? (formattedData.exitPrice - formattedData.entryPrice) * formattedData.quantity
            : (formattedData.entryPrice - formattedData.exitPrice) * formattedData.quantity;
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
          {/* Tab Navigation */}
          <div className="flex space-x-1 mb-6 p-1 bg-gray-100 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveTab("quick")}
              className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md transition-colors ${
                activeTab === "quick"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Zap className="w-4 h-4 mr-2" />
              Quick Entry
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("advanced")}
              className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md transition-colors ${
                activeTab === "advanced"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Settings className="w-4 h-4 mr-2" />
              Advanced
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            {activeTab === "quick" && (
              <div className="space-y-6">
                {/* Quick Entry Tab */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center text-blue-800 mb-2">
                    <Zap className="w-5 h-5 mr-2" />
                    <h3 className="font-semibold">Quick Trade Entry</h3>
                  </div>
                  <p className="text-blue-700 text-sm">
                    Enter essential trade information quickly. Use templates for predefined setups.
                  </p>
                </div>

                {/* Template Selection - Prominent */}
                {settingsTemplates.length > 0 && (
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center text-green-800">
                        <Target className="w-5 h-5 mr-2" />
                        <h4 className="font-semibold">Use Template</h4>
                      </div>
                      <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                        Recommended
                      </span>
                    </div>
                    <select
                      {...register("template")}
                      className="input mb-2"
                      onChange={(e) => {
                        const selectedTemplateId = e.target.value;
                        if (selectedTemplateId) {
                          applyTemplate(selectedTemplateId);
                        }
                      }}
                    >
                      <option value="">Select a trading template...</option>
                      {settingsTemplates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-green-600">
                      Templates auto-fill strategy, risk settings, and trade parameters
                    </p>
                  </div>
                )}

                {/* Essential Fields Only */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Left Side - Trade Basics */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900 border-b pb-2">
                      Trade Information
                    </h4>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label">Instrument *</label>
                        <input
                          list="instruments"
                          {...register("instrument", {
                            required: "Instrument is required",
                          })}
                          className="input"
                          placeholder="e.g., AAPL, EURUSD"
                        />
                        <datalist id="instruments">
                          {instruments[selectedInstrumentType]?.map((instrument) => (
                            <option key={instrument} value={instrument} />
                          ))}
                        </datalist>
                        {errors.instrument && (
                          <p className="text-danger-600 text-xs mt-1">
                            {errors.instrument.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="label">Type *</label>
                        <select
                          {...register("instrumentType", {
                            required: "Type is required",
                          })}
                          className="input"
                        >
                          <option value="stocks">Stocks</option>
                          <option value="forex">Forex</option>
                          <option value="crypto">Crypto</option>
                          <option value="futures">Futures</option>
                          <option value="options">Options</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="label">Direction *</label>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="flex items-center justify-center p-3 border rounded-lg cursor-pointer hover:bg-green-50 has-[:checked]:bg-green-100 has-[:checked]:border-green-300">
                          <input
                            type="radio"
                            value="long"
                            {...register("tradeType", {
                              required: "Direction is required",
                            })}
                            className="sr-only"
                          />
                          <TrendingUp className="w-4 h-4 text-green-600 mr-2" />
                          <span className="font-medium text-green-700">Long</span>
                        </label>
                        <label className="flex items-center justify-center p-3 border rounded-lg cursor-pointer hover:bg-red-50 has-[:checked]:bg-red-100 has-[:checked]:border-red-300">
                          <input
                            type="radio"
                            value="short"
                            {...register("tradeType", {
                              required: "Direction is required",
                            })}
                            className="sr-only"
                          />
                          <TrendingDown className="w-4 h-4 text-red-600 mr-2" />
                          <span className="font-medium text-red-700">Short</span>
                        </label>
                      </div>
                      {errors.tradeType && (
                        <p className="text-danger-600 text-xs mt-1">
                          {errors.tradeType.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Side - Entry Details */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900 border-b pb-2">
                      Entry Details
                    </h4>

                    <div className="grid grid-cols-2 gap-3">
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
                          <p className="text-danger-600 text-xs mt-1">
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
                          placeholder="100"
                        />
                        {errors.quantity && (
                          <p className="text-danger-600 text-xs mt-1">
                            {errors.quantity.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
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
                      <label className="label">Entry Date *</label>
                      <input
                        type="date"
                        {...register("entryDate", {
                          required: "Entry date is required",
                        })}
                        className="input"
                      />
                      {errors.entryDate && (
                        <p className="text-danger-600 text-xs mt-1">
                          {errors.entryDate.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status and Exit Info (if closed) */}
                <div className="border-t pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                          <label className="label">Exit Price</label>
                          <input
                            type="number"
                            step="0.01"
                            {...register("exitPrice")}
                            className="input"
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <label className="label">P&L</label>
                          <input
                            type="number"
                            step="0.01"
                            {...register("pnl")}
                            className="input"
                            placeholder="Auto-calculated"
                            readOnly
                            className="input bg-gray-50"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Quick Notes */}
                <div>
                  <label className="label">Quick Notes</label>
                  <textarea
                    {...register("notes")}
                    rows={2}
                    className="input resize-none"
                    placeholder="Quick trade notes..."
                  />
                </div>
              </div>
            )}

            {activeTab === "advanced" && (
              <div className="space-y-6">
                {/* Advanced Tab */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center text-amber-800 mb-2">
                    <Settings className="w-5 h-5 mr-2" />
                    <h3 className="font-semibold">Advanced Settings</h3>
                  </div>
                  <p className="text-amber-700 text-sm">
                    Additional trade parameters, risk management, and detailed analysis fields.
                  </p>
                </div>

                {/* All the detailed fields from the original form */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Strategy & Setup */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-gray-900 pb-2 border-b">
                      Strategy & Setup
                    </h4>

                    <div>
                      <label className="label">Strategy</label>
                      <input
                        list="strategies-list"
                        {...register("strategy")}
                        className="input"
                        placeholder="e.g., Breakout, Scalping"
                      />
                      <datalist id="strategies-list">
                        {strategies.map((strategy) => (
                          <option key={strategy} value={strategy} />
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label className="label">Setup</label>
                      <input
                        list="setups-list"
                        {...register("setup")}
                        className="input"
                        placeholder="e.g., Flag, Triangle"
                      />
                      <datalist id="setups-list">
                        {setups.map((setup) => (
                          <option key={setup} value={setup} />
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label className="label">Market Condition</label>
                      <input
                        list="market-conditions-list"
                        {...register("marketCondition")}
                        className="input"
                        placeholder="e.g., Trending, Ranging"
                      />
                      <datalist id="market-conditions-list">
                        {marketConditions.map((condition) => (
                          <option key={condition} value={condition} />
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label className="label">Tags</label>
                      <input
                        {...register("tags")}
                        className="input"
                        placeholder="comma, separated, tags"
                      />
                    </div>
                  </div>

                  {/* Timing & Details */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-gray-900 pb-2 border-b flex items-center">
                      <Clock className="w-5 h-5 mr-2 text-blue-600" />
                      Timing & Details
                    </h4>

                    <div>
                      <label className="label">Entry Time</label>
                      <input
                        type="time"
                        {...register("entryTime")}
                        className="input"
                      />
                    </div>

                    {/* Additional instrument-specific fields */}
                    {selectedInstrumentType === "futures" && (
                      <div>
                        <label className="label">Contract Type</label>
                        <select {...register("contractType")} className="input">
                          <option value="">Select contract type</option>
                          <option value="mini">Mini Contract</option>
                          <option value="micro">Micro Contract</option>
                          <option value="standard">Standard Contract</option>
                        </select>
                      </div>
                    )}

                    {selectedInstrumentType === "crypto" && (
                      <div>
                        <label className="label">Leverage</label>
                        <select {...register("leverage")} className="input">
                          <option value="">No leverage</option>
                          <option value="2">2x</option>
                          <option value="3">3x</option>
                          <option value="5">5x</option>
                          <option value="10">10x</option>
                          <option value="20">20x</option>
                          <option value="50">50x</option>
                          <option value="100">100x</option>
                        </select>
                      </div>
                    )}

                    {watchedStatus === "closed" && (
                      <div>
                        <label className="label">Exit Time</label>
                        <input
                          type="time"
                          {...register("exitTime")}
                          className="input"
                        />
                      </div>
                    )}
                  </div>

                  {/* Risk Management */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-gray-900 pb-2 border-b flex items-center">
                      <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
                      Risk Management
                    </h4>

                    <div>
                      <label className="label">Risk/Reward Ratio</label>
                      {settingsRiskProfiles.length > 0 ? (
                        <select 
                          {...register("riskReward")} 
                          className="input"
                          onChange={(e) => {
                            setValue("riskReward", e.target.value);
                            
                            if (e.target.value && !isApplyingTemplate) {
                              const [riskRatio, rewardRatio] = e.target.value.split(':').map(num => parseFloat(num));
                              const entryPrice = parseFloat(watch("entryPrice"));
                              const tradeType = watch("tradeType");
                              
                              if (entryPrice && entryPrice > 0 && riskRatio && rewardRatio) {
                                const selectedProfile = settingsRiskProfiles.find(
                                  profile => `${profile.riskRatio}:${profile.rewardRatio}` === e.target.value
                                );
                                
                                const defaultRiskPercent = selectedProfile?.riskPercent || 0.02;
                                const riskAmount = entryPrice * defaultRiskPercent;
                                
                                let stopLoss, takeProfit;
                                
                                if (tradeType === "long") {
                                  stopLoss = entryPrice - riskAmount;
                                  takeProfit = entryPrice + (riskAmount * (rewardRatio / riskRatio));
                                } else {
                                  stopLoss = entryPrice + riskAmount;
                                  takeProfit = entryPrice - (riskAmount * (rewardRatio / riskRatio));
                                }
                                
                                setValue("stopLoss", stopLoss.toFixed(2));
                                setValue("takeProfit", takeProfit.toFixed(2));
                                
                                toast.success(`Risk levels calculated for ${riskRatio}:${rewardRatio} ratio`);
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
                              {profile.name} ({profile.riskRatio}:{profile.rewardRatio})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="input bg-gray-50 text-gray-500 flex items-center text-sm">
                          No risk profiles available - Create them in Settings
                        </div>
                      )}
                    </div>

                    {/* P&L Calculator */}
                    {watch("riskReward") && watch("entryPrice") && watch("quantity") && watch("stopLoss") && (
                      <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                        <h5 className="text-sm font-semibold text-blue-900 mb-2 flex items-center">
                          <DollarSign className="w-4 h-4 mr-1" />
                          Risk/Reward Calculator
                        </h5>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-red-50 p-2 rounded border">
                            <div className="text-red-600 font-medium">MAX RISK</div>
                            <div className="text-red-700 font-bold">
                              ${(() => {
                                const entryPrice = parseFloat(watch("entryPrice")) || 0;
                                const stopLoss = parseFloat(watch("stopLoss")) || 0;
                                const quantity = parseFloat(watch("quantity")) || 0;
                                const risk = Math.abs(entryPrice - stopLoss) * quantity;
                                return risk.toFixed(2);
                              })()}
                            </div>
                          </div>
                          <div className="bg-green-50 p-2 rounded border">
                            <div className="text-green-600 font-medium">POTENTIAL REWARD</div>
                            <div className="text-green-700 font-bold">
                              ${(() => {
                                const riskReward = watch("riskReward");
                                if (!riskReward) return "0.00";
                                const [risk, reward] = riskReward.split(":").map(num => parseFloat(num));
                                const entryPrice = parseFloat(watch("entryPrice")) || 0;
                                const stopLoss = parseFloat(watch("stopLoss")) || 0;
                                const quantity = parseFloat(watch("quantity")) || 0;
                                const riskAmount = Math.abs(entryPrice - stopLoss) * quantity;
                                const rewardAmount = riskAmount * (reward / risk);
                                return rewardAmount.toFixed(2);
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="label">Detailed Notes</label>
                      <textarea
                        {...register("notes")}
                        rows={4}
                        className="input resize-none"
                        placeholder="Detailed trade analysis, lessons learned, market conditions..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
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
            {/* Form Actions */}
            <div className="flex justify-between items-center pt-6 border-t">
              <div className="text-sm text-gray-500">
                <p>
                  💡 <strong>Tip:</strong> Use templates for faster entry • Switch to Advanced for detailed settings
                </p>
              </div>
              <div className="flex space-x-4">
                {settingsTemplates.length === 0 && activeTab === "quick" && (
                  <button
                    type="button"
                    onClick={() => setIsNewTemplateModalOpen(true)}
                    className="btn bg-green-600 text-white hover:bg-green-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Template
                  </button>
                )}
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
                toast.success(`Template "${newTemplate.name}" created successfully!`);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default TradeForm;
