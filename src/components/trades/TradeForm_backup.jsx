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
    useState("crypto");

  // Get templates from Settings (localStorage)
  const getSettingsTemplates = () => {
    const stored = localStorage.getItem("tradeJournalTemplates");
    return stored ? JSON.parse(stored) : [];
  };

  // Get risk profiles from Settings (localStorage)
  const getSettingsRiskProfiles = () => {
    const stored = localStorage.getItem("tradeJournalRiskProfiles");
    return stored ? JSON.parse(stored) : [];
  };

  const [settingsTemplates, setSettingsTemplates] = useState(
    getSettingsTemplates()
  );
  const [settingsRiskProfiles, setSettingsRiskProfiles] = useState(
    getSettingsRiskProfiles()
  );
  const [appliedTemplate, setAppliedTemplate] = useState(null);
  const [appliedRiskProfile, setAppliedRiskProfile] = useState(null);
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false); // Add flag to track template application

  // Process trade data for editing to ensure correct formats
  const getDefaultValues = () => {
    if (!trade) {
      // Use selectedDate if provided, otherwise use current date
      const defaultDate = selectedDate
        ? selectedDate.toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0];

      return {
        instrumentType: "crypto",
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
      instrumentType: trade.instrumentType || "crypto",
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
    setSelectedInstrumentType(watchedInstrumentType || "crypto");
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
        riskReward: data.riskReward
          ? parseFloat(data.riskReward) || null
          : null,
        leverage: data.leverage ? parseFloat(data.leverage) || null : null,
        tags,
      };

      // Save new values to localStorage for future suggestions (strategies and setups are now managed centrally)
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

  // Get user-managed strategies and setups from localStorage
  const getUserManagedStrategies = () => {
    const stored = localStorage.getItem("tradeJournalStrategies");
    return stored
      ? JSON.parse(stored)
      : ["Day Trading", "Swing Trading", "Scalp Trading"];
  };

  const getUserManagedSetups = () => {
    const stored = localStorage.getItem("tradeJournalSetups");
    return stored
      ? JSON.parse(stored)
      : ["Breakout", "Support Bounce", "Pullback"];
  };

  // Get strategies from both user-managed list and templates
  const getStrategiesFromTemplates = () => {
    const templateStrategies = settingsTemplates
      .map((template) => template.fields.strategy)
      .filter((strategy) => strategy && strategy.trim());
    return [...new Set(templateStrategies)]; // Remove duplicates
  };

  const userManagedStrategies = getUserManagedStrategies();
  const templateStrategies = getStrategiesFromTemplates();
  const strategies = [
    ...new Set([...userManagedStrategies, ...templateStrategies]),
  ]; // Combine and remove duplicates

  const instrumentTypes = {
    crypto: "Crypto",
    forex: "Forex",
    futures: "Futures",
    options: "Options",
    stocks: "Stocks",
  };

  const instrumentsByType = {
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
  };

  // Get setups from both user-managed list and templates
  const getSetupsFromTemplates = () => {
    const templateSetups = settingsTemplates
      .map((template) => template.fields.setup)
      .filter((setup) => setup && setup.trim());
    return [...new Set(templateSetups)]; // Remove duplicates
  };

  const userManagedSetups = getUserManagedSetups();
  const templateSetups = getSetupsFromTemplates();
  const setups = [...new Set([...userManagedSetups, ...templateSetups])]; // Combine and remove duplicates

  // Get market conditions from both user options and templates
  const getMarketConditionsFromTemplates = () => {
    const templateConditions = settingsTemplates
      .map((template) => template.fields.marketCondition)
      .filter((condition) => condition && condition.trim());
    return [...new Set(templateConditions)]; // Remove duplicates
  };

  const userMarketConditions = getUserOptions("marketConditions");
  const templateMarketConditions = getMarketConditionsFromTemplates();
  const marketConditions = [
    ...new Set([...userMarketConditions, ...templateMarketConditions]),
  ]; // Combine and remove duplicates

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

  // Update settings templates when localStorage changes
  React.useEffect(() => {
    setSettingsTemplates(getSettingsTemplates());
    setSettingsRiskProfiles(getSettingsRiskProfiles());
  }, []);

  // Refresh template-derived data when templates change
  React.useEffect(() => {
    // Force component re-render when templates change to update strategies, setups, and market conditions
    // This ensures the datalist options include the latest template values
  }, [settingsTemplates]);

  // Convert settings templates to form templates
  const convertSettingsTemplateToFormTemplate = (template) => {
    return {
      name: template.name,
      data: {
        instrumentType:
          template.fields.instrumentType?.toLowerCase() || "crypto",
        tradeType: template.fields.tradeType?.toLowerCase() || "long",
        strategy: template.fields.strategy || "",
        setup: template.fields.setup || "",
        marketCondition: template.fields.marketCondition || "",
        contractType: template.fields.contractType || "",
        tags: template.fields.tags || "",
        riskReward: template.fields.riskReward || "",
        stopLoss: template.fields.stopLoss || "",
        takeProfit: template.fields.takeProfit || "",
        entryPrice: template.fields.entryPrice || "",
        quantity: template.fields.quantity || "",
        riskProfile: template.fields.riskProfile || "", // Add risk profile
        status: "open",
      },
      isDefault: false,
    };
  };

  const formTemplates = settingsTemplates.map(
    convertSettingsTemplateToFormTemplate
  );

  // Apply template to form
  const applyQuickFill = (template) => {
    setIsApplyingTemplate(true); // Set flag to prevent auto-calculation
    
    Object.entries(template.data).forEach(([key, value]) => {
      setValue(key, value);
    });
    setAppliedTemplate(template.name);

    // Also apply risk profile if template has one
    if (template.data.riskProfile) {
      const profile = settingsRiskProfiles.find(
        (p) => p.name === template.data.riskProfile
      );
      if (profile) {
        // Apply the risk profile after a short delay to ensure form fields are updated
        setTimeout(() => {
          applyRiskProfile(profile);
        }, 100);
      }
    }

    toast.success(`Applied "${template.name}" template`, {
      icon: "📋",
      duration: 3000,
    });

    // Clear applied template indicator and flag after 3 seconds
    setTimeout(() => {
      setAppliedTemplate(null);
      setIsApplyingTemplate(false); // Reset flag
    }, 3000);
  };

  // Apply risk profile to form with enhanced futures/forex support
  const applyRiskProfile = (riskProfile) => {
    if (!riskProfile) return;

    // Calculate risk/reward ratio string
    const ratio = `${riskProfile.riskRatio}:${riskProfile.rewardRatio}`;
    setValue("riskReward", ratio);

    // Auto-calculate stop loss and take profit if entry price is available
    const entryPrice = watch("entryPrice");
    const tradeType = watch("tradeType");
    const instrumentType = watch("instrumentType");

    if (entryPrice && parseFloat(entryPrice) > 0) {
      const entry = parseFloat(entryPrice);

      // Use profile-specific risk parameters
      const pointRisk = riskProfile.pointRisk || 10;
      const pointProfit = riskProfile.pointProfit || 20;

      // Calculate based on instrument type and trade type
      if (
        instrumentType === "forex" ||
        riskProfile.instrumentType === "forex"
      ) {
        // Forex calculations using pips
        const pipValue = 0.0001; // Standard pip value for most pairs
        if (tradeType === "long") {
          const stopLoss = entry - pointRisk * pipValue;
          const takeProfit = entry + pointProfit * pipValue;
          setValue("stopLoss", stopLoss.toFixed(5));
          setValue("takeProfit", takeProfit.toFixed(5));
        } else if (tradeType === "short") {
          const stopLoss = entry + pointRisk * pipValue;
          const takeProfit = entry - pointProfit * pipValue;
          setValue("stopLoss", stopLoss.toFixed(5));
          setValue("takeProfit", takeProfit.toFixed(5));
        }
      } else if (
        instrumentType === "futures" ||
        riskProfile.instrumentType === "futures"
      ) {
        // Futures calculations using points
        if (tradeType === "long") {
          const stopLoss = entry - pointRisk;
          const takeProfit = entry + pointProfit;
          setValue("stopLoss", stopLoss.toFixed(2));
          setValue("takeProfit", takeProfit.toFixed(2));
        } else if (tradeType === "short") {
          const stopLoss = entry + pointRisk;
          const takeProfit = entry - pointProfit;
          setValue("stopLoss", stopLoss.toFixed(2));
          setValue("takeProfit", takeProfit.toFixed(2));
        }
      } else {
        // Default percentage-based calculation for other instruments
        const riskPercent = (riskProfile.maxRiskPerTrade || 2) / 100;
        if (tradeType === "long") {
          const stopLoss = entry - entry * riskPercent;
          const takeProfit =
            entry +
            entry *
              riskPercent *
              (riskProfile.rewardRatio / riskProfile.riskRatio);
          setValue("stopLoss", stopLoss.toFixed(2));
          setValue("takeProfit", takeProfit.toFixed(2));
        } else if (tradeType === "short") {
          const stopLoss = entry + entry * riskPercent;
          const takeProfit =
            entry -
            entry *
              riskPercent *
              (riskProfile.rewardRatio / riskProfile.riskRatio);
          setValue("stopLoss", stopLoss.toFixed(2));
          setValue("takeProfit", takeProfit.toFixed(2));
        }
      }

      toast.success(
        `Applied "${riskProfile.name}" with auto-calculated ${
          riskProfile.instrumentType || "default"
        } levels`,
        {
          icon: "🎯",
          duration: 4000,
        }
      );
    } else {
      toast.success(`Applied "${riskProfile.name}" risk profile`, {
        icon: "🎯",
        duration: 3000,
      });
    }

    setAppliedRiskProfile(riskProfile.name);

    // Clear applied profile indicator after 4 seconds
    setTimeout(() => {
      setAppliedRiskProfile(null);
    }, 4000);
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

  // Auto-fill exit date when status changes to "closed"
  React.useEffect(() => {
    if (watchedStatus === "closed") {
      const currentExitDate = watch("exitDate");
      // Only auto-fill if exit date is empty
      if (!currentExitDate) {
        const today = new Date().toISOString().split("T")[0];
        setValue("exitDate", today);
        toast.success("Exit date set to today", {
          icon: "📅",
          duration: 2000,
        });
      }
    }
  }, [watchedStatus, setValue, watch]);

  // Auto-recalculate stop loss and take profit when entry price changes with enhanced support
  const watchedEntryPrice = watch("entryPrice");
  React.useEffect(() => {
    if (
      appliedRiskProfile &&
      watchedEntryPrice &&
      parseFloat(watchedEntryPrice) > 0
    ) {
      // Find the applied risk profile
      const profile = settingsRiskProfiles.find(
        (p) => p.name === appliedRiskProfile
      );
      if (profile) {
        const entry = parseFloat(watchedEntryPrice);
        const tradeType = watch("tradeType");
        const instrumentType = watch("instrumentType");

        // Use profile-specific risk parameters
        const pointRisk = profile.pointRisk || 10;
        const pointProfit = profile.pointProfit || 20;

        // Calculate based on instrument type and trade type
        if (instrumentType === "forex" || profile.instrumentType === "forex") {
          // Forex calculations using pips
          const pipValue = 0.0001; // Standard pip value for most pairs
          if (tradeType === "long") {
            const stopLoss = entry - pointRisk * pipValue;
            const takeProfit = entry + pointProfit * pipValue;
            setValue("stopLoss", stopLoss.toFixed(5));
            setValue("takeProfit", takeProfit.toFixed(5));
          } else if (tradeType === "short") {
            const stopLoss = entry + pointRisk * pipValue;
            const takeProfit = entry - pointProfit * pipValue;
            setValue("stopLoss", stopLoss.toFixed(5));
            setValue("takeProfit", takeProfit.toFixed(5));
          }
        } else if (
          instrumentType === "futures" ||
          profile.instrumentType === "futures"
        ) {
          // Futures calculations using points
          if (tradeType === "long") {
            const stopLoss = entry - pointRisk;
            const takeProfit = entry + pointProfit;
            setValue("stopLoss", stopLoss.toFixed(2));
            setValue("takeProfit", takeProfit.toFixed(2));
          } else if (tradeType === "short") {
            const stopLoss = entry + pointRisk;
            const takeProfit = entry - pointProfit;
            setValue("stopLoss", stopLoss.toFixed(2));
            setValue("takeProfit", takeProfit.toFixed(2));
          }
        } else {
          // Default percentage-based calculation
          const riskPercent = (profile.maxRiskPerTrade || 2) / 100;
          if (tradeType === "long") {
            const stopLoss = entry - entry * riskPercent;
            const takeProfit =
              entry +
              entry * riskPercent * (profile.rewardRatio / profile.riskRatio);
            setValue("stopLoss", stopLoss.toFixed(2));
            setValue("takeProfit", takeProfit.toFixed(2));
          } else if (tradeType === "short") {
            const stopLoss = entry + entry * riskPercent;
            const takeProfit =
              entry -
              entry * riskPercent * (profile.rewardRatio / profile.riskRatio);
            setValue("stopLoss", stopLoss.toFixed(2));
            setValue("takeProfit", takeProfit.toFixed(2));
          }
        }
      }
    }
  }, [
    watchedEntryPrice,
    appliedRiskProfile,
    settingsRiskProfiles,
    watch,
    setValue,
  ]);

  // Auto-calculate stop loss and take profit when entry price or risk/reward ratio changes
  const watchedRiskReward = watch("riskReward");
  const watchedTradeType = watch("tradeType");
  React.useEffect(() => {
    // Don't auto-calculate if we're applying a template
    if (isApplyingTemplate) return;
    
    const entryPrice = parseFloat(watchedEntryPrice);
    const riskRewardRatio = watchedRiskReward;
    
    if (entryPrice && entryPrice > 0 && riskRewardRatio && riskRewardRatio.includes(':')) {
      const [riskRatio, rewardRatio] = riskRewardRatio.split(':').map(num => parseFloat(num));
      
      if (riskRatio && rewardRatio) {
        // Find the selected profile for additional settings
        const selectedProfile = settingsRiskProfiles.find(
          profile => `${profile.riskRatio}:${profile.rewardRatio}` === riskRewardRatio
        );
        
        // Use profile-specific risk settings or default to 2%
        const riskPercent = selectedProfile?.riskPercent || 0.02;
        const riskAmount = entryPrice * riskPercent;
        
        // Calculate stop loss and take profit based on trade type
        let stopLoss, takeProfit;
        
        if (watchedTradeType === "long") {
          stopLoss = entryPrice - riskAmount;
          takeProfit = entryPrice + (riskAmount * (rewardRatio / riskRatio));
        } else if (watchedTradeType === "short") {
          stopLoss = entryPrice + riskAmount;
          takeProfit = entryPrice - (riskAmount * (rewardRatio / riskRatio));
        }
        
        if (stopLoss && takeProfit) {
          setValue("stopLoss", stopLoss.toFixed(2));
          setValue("takeProfit", takeProfit.toFixed(2));
        }
      }
    }
  }, [
    watchedEntryPrice,
    watchedRiskReward,
    watchedTradeType,
    settingsRiskProfiles,
    setValue,
    isApplyingTemplate, // Add dependency on template flag
  ]);

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

          {/* Template Selection */}
          {!isEditing && formTemplates.length > 0 && (
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {appliedTemplate && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center">
                    <svg
                      className="w-3 h-3 mr-1"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {appliedTemplate} applied
                  </span>
                )}
                <select
                  value={appliedTemplate || ""}
                  onChange={(e) => {
                    if (e.target.value) {
                      const template = formTemplates.find(
                        (t) => t.name === e.target.value
                      );
                      if (template) {
                        applyQuickFill(template);
                      }
                    } else {
                      setAppliedTemplate(null);
                    }
                  }}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[200px] transition-all duration-200"
                >
                  <option value="">📋 Select a template...</option>
                  {formTemplates.map((template) => (
                    <option key={template.name} value={template.name}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

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
                              Mini: {futuresContractTypes[watch("instrument")].mini}
                            </p>
                            <p>
                              Micro: {futuresContractTypes[watch("instrument")].micro}
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
                          const [riskRatio, rewardRatio] = e.target.value.split(':').map(num => parseFloat(num));
                          const entryPrice = parseFloat(watch("entryPrice"));
                          const tradeType = watch("tradeType");
                          
                          if (entryPrice && entryPrice > 0 && riskRatio && rewardRatio) {
                            // Find the selected profile for additional settings
                            const selectedProfile = settingsRiskProfiles.find(
                              profile => `${profile.riskRatio}:${profile.rewardRatio}` === e.target.value
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
                            
                            // Show success message
                            toast.success(`Stop Loss and Take Profit calculated for ${riskRatio}:${rewardRatio} ratio`);
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
                {watch("riskReward") && watch("entryPrice") && watch("quantity") && watch("stopLoss") && (
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <h5 className="text-sm font-semibold text-blue-900 mb-3 flex items-center">
                      <DollarSign className="w-4 h-4 mr-2" />
                      Potential Profit & Loss
                    </h5>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                        <div className="text-xs text-red-600 font-medium">MAXIMUM RISK</div>
                        <div className="text-lg font-bold text-red-700">
                          ${(() => {
                            const entryPrice = parseFloat(watch("entryPrice")) || 0;
                            const stopLoss = parseFloat(watch("stopLoss")) || 0;
                            const quantity = parseFloat(watch("quantity")) || 0;
                            const risk = Math.abs(entryPrice - stopLoss) * quantity;
                            return risk.toFixed(2);
                          })()}
                        </div>
                        <div className="text-xs text-red-600">
                          {(() => {
                            const entryPrice = parseFloat(watch("entryPrice")) || 0;
                            const stopLoss = parseFloat(watch("stopLoss")) || 0;
                            const riskPercent = entryPrice > 0 ? Math.abs((entryPrice - stopLoss) / entryPrice * 100) : 0;
                            return `${riskPercent.toFixed(2)}% risk`;
                          })()}
                        </div>
                      </div>
                      <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                        <div className="text-xs text-green-600 font-medium">POTENTIAL REWARD</div>
                        <div className="text-lg font-bold text-green-700">
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
                        <div className="text-xs text-green-600">
                          {(() => {
                            const riskReward = watch("riskReward");
                            if (!riskReward) return "";
                            const [risk, reward] = riskReward.split(":").map(num => parseFloat(num));
                            const entryPrice = parseFloat(watch("entryPrice")) || 0;
                            const stopLoss = parseFloat(watch("stopLoss")) || 0;
                            const riskPercent = entryPrice > 0 ? Math.abs((entryPrice - stopLoss) / entryPrice * 100) : 0;
                            const rewardPercent = riskPercent * (reward / risk);
                            return `${rewardPercent.toFixed(2)}% reward`;
                          })()}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 text-center">
                      <div className="text-sm text-blue-700 font-medium">
                        Risk/Reward Ratio: {watch("riskReward") || "Not selected"}
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
          </form>
        </div>
      </div>
    </div>
  );
};

export default TradeForm;
                  <select 
                    {...register("riskReward")} 
                    className="input"
                    onChange={(e) => {
                      // Update the form field
                      setValue("riskReward", e.target.value);
                      
                      // Auto-calculate stop loss and take profit when ratio is selected
                      if (e.target.value) {
                        const [riskRatio, rewardRatio] = e.target.value.split(':').map(num => parseFloat(num));
                        const entryPrice = parseFloat(watch("entryPrice"));
                        const tradeType = watch("tradeType");
                        
                        if (entryPrice && entryPrice > 0 && riskRatio && rewardRatio) {
                          // Find the selected profile for additional settings
                          const selectedProfile = settingsRiskProfiles.find(
                            profile => `${profile.riskRatio}:${profile.rewardRatio}` === e.target.value
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
                          
                          // Show success message
                          toast.success(`Stop Loss and Take Profit calculated for ${riskRatio}:${rewardRatio} ratio`);
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
                  <div className="input bg-gray-50 text-gray-500 flex items-center text-sm">
                    No risk profiles available
                  </div>
                )}
              </div>
            </div>

            {/* Second Row - Strategy & Setup */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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

            {/* Third Row - Price & Timing */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
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
                      ? "Contracts"
                      : selectedInstrumentType === "forex"
                      ? "Lot size"
                      : selectedInstrumentType === "crypto"
                      ? "Amount"
                      : "Shares"
                  }
                />
                {errors.quantity && (
                  <p className="text-danger-600 text-sm mt-1">
                    {errors.quantity.message}
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
            </div>

            {/* Fourth Row - Risk Management */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
            </div>

            {/* Conditional Fields for Closed Trades */}
            {watchedStatus === "closed" && (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
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

                <div>
                  <label className="label">P&L</label>
                  <input
                    type="number"
                    step="0.01"
                    {...register("pnl")}
                    className="input"
                    placeholder="0.00"
                  />
                </div>
              </div>
            )}

            {/* Potential P&L Display */}
            {watch("riskReward") && watch("entryPrice") && watch("quantity") && watch("stopLoss") && (
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <h5 className="text-sm font-semibold text-blue-900 mb-3 flex items-center">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Potential Profit & Loss
                </h5>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                    <div className="text-xs text-red-600 font-medium">MAXIMUM RISK</div>
                    <div className="text-lg font-bold text-red-700">
                      ${(() => {
                        const entryPrice = parseFloat(watch("entryPrice")) || 0;
                        const stopLoss = parseFloat(watch("stopLoss")) || 0;
                        const quantity = parseFloat(watch("quantity")) || 0;
                        const risk = Math.abs(entryPrice - stopLoss) * quantity;
                        return risk.toFixed(2);
                      })()}
                    </div>
                    <div className="text-xs text-red-600">
                      {(() => {
                        const entryPrice = parseFloat(watch("entryPrice")) || 0;
                        const stopLoss = parseFloat(watch("stopLoss")) || 0;
                        const riskPercent = entryPrice > 0 ? Math.abs((entryPrice - stopLoss) / entryPrice * 100) : 0;
                        return `${riskPercent.toFixed(2)}% risk`;
                      })()}
                    </div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                    <div className="text-xs text-green-600 font-medium">POTENTIAL REWARD</div>
                    <div className="text-lg font-bold text-green-700">
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
                    <div className="text-xs text-green-600">
                      {(() => {
                        const riskReward = watch("riskReward");
                        if (!riskReward) return "";
                        const [risk, reward] = riskReward.split(":").map(num => parseFloat(num));
                        const entryPrice = parseFloat(watch("entryPrice")) || 0;
                        const stopLoss = parseFloat(watch("stopLoss")) || 0;
                        const riskPercent = entryPrice > 0 ? Math.abs((entryPrice - stopLoss) / entryPrice * 100) : 0;
                        const rewardPercent = riskPercent * (reward / risk);
                        return `${rewardPercent.toFixed(2)}% reward`;
                      })()}
                    </div>
                  </div>
                </div>
                <div className="mt-3 text-center">
                  <div className="text-sm text-blue-700 font-medium">
                    Risk/Reward Ratio: {watch("riskReward") || "Not selected"}
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Section - Notes and Tags */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="label">Tags</label>
                <input
                  {...register("tags")}
                  className="input"
                  placeholder="comma, separated, tags"
                />
              </div>

              <div>
                <label className="label">Notes</label>
                <textarea
                  {...register("notes")}
                  rows={3}
                  className="input resize-none"
                  placeholder="Trade notes, analysis, lessons learned..."
                />
              </div>
            </div>
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
            </div>

            {/* Status Field */}
            <div>
              <label className="label">Status</label>
              <select {...register("status")} className="input">
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            {/* Exit Fields for Closed Trades */}
            {watchedStatus === "closed" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
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
              </div>
            )}

            {/* Bottom Section - Notes and Tags */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
              </div>
            </div>

            {/* Risk Management Section */}
            <div className="space-y-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
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
                        if (e.target.value) {
                          const [riskRatio, rewardRatio] = e.target.value.split(':').map(num => parseFloat(num));
                          const entryPrice = parseFloat(watch("entryPrice"));
                          const tradeType = watch("tradeType");
                          
                          if (entryPrice && entryPrice > 0 && riskRatio && rewardRatio) {
                            // Find the selected profile for additional settings
                            const selectedProfile = settingsRiskProfiles.find(
                              profile => `${profile.riskRatio}:${profile.rewardRatio}` === e.target.value
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
                            
                            // Show success message
                            toast.success(`Stop Loss and Take Profit calculated for ${riskRatio}:${rewardRatio} ratio`);
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
                {watch("riskReward") && watch("entryPrice") && watch("quantity") && watch("stopLoss") && (
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <h5 className="text-sm font-semibold text-blue-900 mb-3 flex items-center">
                      <DollarSign className="w-4 h-4 mr-2" />
                      Potential Profit & Loss
                    </h5>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                        <div className="text-xs text-red-600 font-medium">MAXIMUM RISK</div>
                        <div className="text-lg font-bold text-red-700">
                          ${(() => {
                            const entryPrice = parseFloat(watch("entryPrice")) || 0;
                            const stopLoss = parseFloat(watch("stopLoss")) || 0;
                            const quantity = parseFloat(watch("quantity")) || 0;
                            const risk = Math.abs(entryPrice - stopLoss) * quantity;
                            return risk.toFixed(2);
                          })()}
                        </div>
                        <div className="text-xs text-red-600">
                          {(() => {
                            const entryPrice = parseFloat(watch("entryPrice")) || 0;
                            const stopLoss = parseFloat(watch("stopLoss")) || 0;
                            const riskPercent = entryPrice > 0 ? Math.abs((entryPrice - stopLoss) / entryPrice * 100) : 0;
                            return `${riskPercent.toFixed(2)}% risk`;
                          })()}
                        </div>
                      </div>
                      <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                        <div className="text-xs text-green-600 font-medium">POTENTIAL REWARD</div>
                        <div className="text-lg font-bold text-green-700">
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
                        <div className="text-xs text-green-600">
                          {(() => {
                            const riskReward = watch("riskReward");
                            if (!riskReward) return "";
                            const [risk, reward] = riskReward.split(":").map(num => parseFloat(num));
                            const entryPrice = parseFloat(watch("entryPrice")) || 0;
                            const stopLoss = parseFloat(watch("stopLoss")) || 0;
                            const riskPercent = entryPrice > 0 ? Math.abs((entryPrice - stopLoss) / entryPrice * 100) : 0;
                            const rewardPercent = riskPercent * (reward / risk);
                            return `${rewardPercent.toFixed(2)}% reward`;
                          })()}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 text-center">
                      <div className="text-sm text-blue-700 font-medium">
                        Risk/Reward Ratio: {watch("riskReward") || "Not selected"}
                      </div>
                    </div>
                  </div>
                )}

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
