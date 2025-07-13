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

const saveUserOption = (type, value) => {
  if (!value.trim()) return;
  const existing = getUserOptions(type);
  if (!existing.includes(value)) {
    const updated = [...existing, value];
    localStorage.setItem(`tradeForm_${type}`, JSON.stringify(updated));
  }
};

const TradeForm = ({ trade, onClose, selectedDate }) => {
  const { addTrade, updateTrade } = useTrades();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);
  const [activeTab, setActiveTab] = useState("quick");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [lastAppliedTemplate, setLastAppliedTemplate] = useState(null);
  const [exitPriceMode, setExitPriceMode] = useState("stopLoss"); // "stopLoss", "takeProfit", "custom"

  // Get settings from localStorage
  const [settingsTemplates, setSettingsTemplates] = useState(() => {
    const stored = localStorage.getItem("tradeJournalTemplates");
    return stored ? JSON.parse(stored) : [];
  });

  const [settingsRiskProfiles, setSettingsRiskProfiles] = useState(() => {
    const stored = localStorage.getItem("tradeJournalRiskProfiles");
    return stored ? JSON.parse(stored) : [];
  });

  const [settingsStrategies, setSettingsStrategies] = useState(() => {
    const stored = localStorage.getItem("tradeJournalStrategies");
    return stored ? JSON.parse(stored) : [];
  });

  const [settingsSetups, setSettingsSetups] = useState(() => {
    const stored = localStorage.getItem("tradeJournalSetups");
    return stored ? JSON.parse(stored) : [];
  });

  const isEditing = !!trade;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    trigger,
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
          entryTime: new Date().toTimeString().slice(0, 5), // Set current time for new trades
          instrumentType: "stocks",
          status: "closed", // Default new manual trades to closed
        },
  });

  const watchedStatus = watch("status");
  const selectedInstrumentType = watch("instrumentType");
  const watchedEntryDate = watch("entryDate");
  const watchedStopLoss = watch("stopLoss");
  const watchedTakeProfit = watch("takeProfit");

  // Constants
  const instruments = {
    stocks: ["AAPL", "GOOGL", "MSFT", "AMZN", "TSLA", "META", "NVDA", "NFLX"],
    forex: ["EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCAD"],
    crypto: ["BTCUSD", "ETHUSD", "BNBUSD", "ADAUSD", "SOLUSD", "XRPUSD"],
    futures: ["ES", "NQ", "YM", "RTY", "CL", "GC", "SI", "NG"],
    options: ["SPY", "QQQ", "IWM", "AAPL", "TSLA", "AMC", "GME", "NVDA"],
  };

  // Use strategies and setups from settings by default, with fallback to localStorage and hardcoded defaults
  const strategies =
    settingsStrategies.length > 0
      ? settingsStrategies.map((s) => s.name || s) // Handle both object and string formats
      : getUserOptions("strategies").concat([
          "Breakout",
          "Scalping", 
          "Swing Trading",
          "Day Trading",
          "Momentum",
          "Mean Reversion",
        ]);

  const setups =
    settingsSetups.length > 0
      ? settingsSetups.map((s) => s.name || s) // Handle both object and string formats
      : getUserOptions("setups").concat([
          "Flag",
          "Pennant",
          "Triangle", 
          "Cup and Handle",
          "Support/Resistance",
          "Trendline Break",
        ]);

  const marketConditions = getUserOptions("marketConditions").concat([
    "Trending Up",
    "Trending Down",
    "Ranging",
    "Volatile",
    "Low Volume",
    "High Volume",
  ]);

  // Listen for localStorage changes to update templates in real-time
  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem("tradeJournalTemplates");
      const templates = stored ? JSON.parse(stored) : [];
      setSettingsTemplates(templates);
    };

    // Listen for storage events (when localStorage is updated in another tab/component)
    window.addEventListener("storage", handleStorageChange);

    // Also check for updates periodically (in case updates happen in same tab)
    const interval = setInterval(() => {
      const stored = localStorage.getItem("tradeJournalTemplates");
      const templates = stored ? JSON.parse(stored) : [];
      if (JSON.stringify(templates) !== JSON.stringify(settingsTemplates)) {
        setSettingsTemplates(templates);
      }
    }, 1000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, [settingsTemplates]);

  // Listen for localStorage changes to update strategies in real-time
  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem("tradeJournalStrategies");
      const strategies = stored ? JSON.parse(stored) : [];
      setSettingsStrategies(strategies);
    };

    // Listen for storage events
    window.addEventListener("storage", handleStorageChange);

    // Also check for updates periodically
    const interval = setInterval(() => {
      const stored = localStorage.getItem("tradeJournalStrategies");
      const strategies = stored ? JSON.parse(stored) : [];
      if (JSON.stringify(strategies) !== JSON.stringify(settingsStrategies)) {
        setSettingsStrategies(strategies);
      }
    }, 1000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, [settingsStrategies]);

  // Listen for localStorage changes to update setups in real-time
  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem("tradeJournalSetups");
      const setups = stored ? JSON.parse(stored) : [];
      setSettingsSetups(setups);
    };

    // Listen for storage events
    window.addEventListener("storage", handleStorageChange);

    // Also check for updates periodically
    const interval = setInterval(() => {
      const stored = localStorage.getItem("tradeJournalSetups");
      const setups = stored ? JSON.parse(stored) : [];
      if (JSON.stringify(setups) !== JSON.stringify(settingsSetups)) {
        setSettingsSetups(setups);
      }
    }, 1000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, [settingsSetups]);

  // Template application function
  const applyTemplate = (templateId) => {
    // Convert templateId to number since template IDs are created with Date.now()
    const numericTemplateId = parseInt(templateId);
    const template = settingsTemplates.find((t) => t.id === numericTemplateId);

    console.log("Applying template:", template);
    console.log("Template fields:", template?.fields);
    console.log("Template included fields:", template?.includedFields);
    console.log("Available risk profiles:", settingsRiskProfiles);

    if (!template) {
      console.log("Template not found!");
      return;
    }

    setIsApplyingTemplate(true);
    setLastAppliedTemplate(template); // Save template for reapplication when switching tabs

    // Access fields from template.fields object
    const templateFields = template.fields || {};

    // Get the list of fields that should be included in the template
    // For backward compatibility, if includedFields doesn't exist, apply all non-empty fields
    const includedFields =
      template.includedFields ||
      Object.keys(templateFields).filter(
        (key) =>
          templateFields[key] !== undefined &&
          templateFields[key] !== "" &&
          templateFields[key] !== null
      );

    console.log("Fields to apply from template:", includedFields);

    // Apply only the included template fields
    includedFields.forEach((field) => {
      if (
        templateFields[field] !== undefined &&
        templateFields[field] !== "" &&
        templateFields[field] !== null
      ) {
        let value = templateFields[field];

        // Debug logging for specific fields
        if (field === "setup") {
          console.log("Applying setup field:", value);
          console.log("Current setup settings:", settingsSetups);
        }

        // Debug logging for riskReward field
        // if (field === "riskReward") {
        //   console.log("Template riskReward value:", value);
        //   console.log("Available risk profiles:", settingsRiskProfiles);
        //   console.log("Template fields all:", templateFields);
        // }

        // Normalize values to match form expectations
        if (field === "tradeType") {
          value = value.toLowerCase(); // Convert "Long"/"Short" to "long"/"short"
        }
        if (field === "instrumentType") {
          value = value.toLowerCase(); // Convert "Stocks" to "stocks"
        }

        console.log(`Setting field ${field} to:`, value);
        setValue(field, value);
      }
    });

    // Apply default risk/reward ratio from template's default risk profile
    let riskRewardToApply;
    let selectedRiskProfile;

    console.log("=== Risk Profile Lookup Debug ===");
    console.log("Template defaultRiskProfile field:", templateFields.defaultRiskProfile);
    console.log("Available settingsRiskProfiles:", settingsRiskProfiles);
    console.log("All template fields:", templateFields);

    // Check for defaultRiskProfile field in template
    if (templateFields.defaultRiskProfile) {
      console.log("Looking for risk profile with name:", templateFields.defaultRiskProfile);
      // Find the risk profile by name
      selectedRiskProfile = settingsRiskProfiles.find(
        profile => profile.name === templateFields.defaultRiskProfile
      );
      console.log("Found matching profile:", selectedRiskProfile);
      if (selectedRiskProfile) {
        riskRewardToApply = `${selectedRiskProfile.riskRatio}:${selectedRiskProfile.rewardRatio}`;
        console.log("Using template's default risk profile:", templateFields.defaultRiskProfile, "->", riskRewardToApply);
      } else {
        console.log("ERROR: Risk profile not found in settings!");
        console.log("Available profile names:", settingsRiskProfiles.map(p => p.name));
      }
    } else {
      console.log("No defaultRiskProfile field in template");
      console.log("Template might be using old format, checking legacy fields...");
    }

    // Fallback to legacy field names for backward compatibility
    if (!riskRewardToApply) {
      console.log("Checking legacy fields...");
      
      // Check if template has direct riskReward value (old format)
      if (templateFields.riskReward) {
        const legacyValue = templateFields.riskReward;
        console.log("Found legacy riskReward:", legacyValue);
        
        // If it's in "1:2" format, use it directly
        if (legacyValue.includes(":")) {
          riskRewardToApply = legacyValue;
          console.log("Legacy value is already in ratio format");
        } else {
          // If it's a profile name like "Conservative", find the matching profile
          console.log("Legacy value is a profile name, looking for matching profile");
          const matchingProfile = settingsRiskProfiles.find(
            profile => profile.name === legacyValue
          );
          if (matchingProfile) {
            riskRewardToApply = `${matchingProfile.riskRatio}:${matchingProfile.rewardRatio}`;
            console.log(`Converted profile name "${legacyValue}" to ratio:`, riskRewardToApply);
          } else {
            console.log(`Profile "${legacyValue}" not found in current profiles`);
          }
        }
      } else if (templateFields.riskProfile) {
        const legacyValue = templateFields.riskProfile;
        console.log("Found legacy riskProfile:", legacyValue);
        
        // Handle same way as riskReward
        if (legacyValue.includes(":")) {
          riskRewardToApply = legacyValue;
        } else {
          const matchingProfile = settingsRiskProfiles.find(
            profile => profile.name === legacyValue
          );
          if (matchingProfile) {
            riskRewardToApply = `${matchingProfile.riskRatio}:${matchingProfile.rewardRatio}`;
            console.log(`Converted profile name "${legacyValue}" to ratio:`, riskRewardToApply);
          }
        }
      } else if (templateFields["Default Risk Profile"]) {
        const legacyValue = templateFields["Default Risk Profile"];
        console.log("Found legacy 'Default Risk Profile':", legacyValue);
        
        // Handle same way as others
        if (legacyValue.includes(":")) {
          riskRewardToApply = legacyValue;
        } else {
          const matchingProfile = settingsRiskProfiles.find(
            profile => profile.name === legacyValue
          );
          if (matchingProfile) {
            riskRewardToApply = `${matchingProfile.riskRatio}:${matchingProfile.rewardRatio}`;
            console.log(`Converted profile name "${legacyValue}" to ratio:`, riskRewardToApply);
          }
        }
      }

      console.log("Template risk reward search (legacy):");
      console.log("- riskReward:", templateFields.riskReward);
      console.log("- riskProfile:", templateFields.riskProfile);
      console.log("- Default Risk Profile:", templateFields["Default Risk Profile"]);
      console.log("- Final legacy value:", riskRewardToApply);
    }

    console.log("Template risk reward search:");
    console.log("- defaultRiskProfile:", templateFields.defaultRiskProfile);
    console.log("- Selected profile:", selectedRiskProfile);
    console.log("- Final value:", riskRewardToApply);

    // If template doesn't have risk/reward, use first available risk profile
    if (!riskRewardToApply && settingsRiskProfiles.length > 0) {
      const firstProfile = settingsRiskProfiles[0];
      riskRewardToApply = `${firstProfile.riskRatio}:${firstProfile.rewardRatio}`;
      console.log("Using first available profile:", riskRewardToApply);
    }

    // Fallback to 1:1.5 if still no value and create a default profile for this session
    if (!riskRewardToApply) {
      riskRewardToApply = "1:1.5";
      console.log("Using fallback 1:1.5");

      // Create a temporary risk profile for this session if none exist
      if (settingsRiskProfiles.length === 0) {
        const tempProfile = {
          id: Date.now(),
          name: "Default (1:1.5)",
          riskRatio: 1,
          rewardRatio: 1.5,
          pointRisk: 50,
          pointProfit: 75,
          usePercentage: true,
          accountPercentage: 2,
        };
        setSettingsRiskProfiles([tempProfile]);
        console.log("Created temporary risk profile");
      }
    }

    // Always apply the risk/reward ratio
    if (riskRewardToApply) {
      setValue("riskReward", riskRewardToApply);
      console.log("Setting riskReward to:", riskRewardToApply);
      console.log("Form value after setting:", watch("riskReward"));
      
      // Verify that the value matches one of the dropdown options
      const availableOptions = settingsRiskProfiles.map(profile => 
        `${profile.riskRatio}:${profile.rewardRatio}`
      );
      console.log("Available dropdown options:", availableOptions);
      console.log("Does set value match an option?", availableOptions.includes(riskRewardToApply));
      
      // Force trigger to update the form state
      trigger("riskReward");
    } else {
      console.log("ERROR: No riskRewardToApply value found!");
    }

    toast.success(`Template "${template.name}" applied successfully!`);

    // Force calculation after template application
    setTimeout(() => {
      setIsApplyingTemplate(false);

      // Force re-render by triggering watch
      const currentRiskReward = getValues("riskReward");
      console.log("Final riskReward value in form:", currentRiskReward);

      // Get current form values and force calculation
      const formValues = getValues();
      // console.log("Template applied, current form values:", formValues);

      // Force trigger calculation if we have required fields
      if (
        formValues.entryPrice &&
        formValues.riskReward &&
        formValues.tradeType
      ) {
        // console.log("Forcing calculation with values:", {
        //   entryPrice: formValues.entryPrice,
        //   riskReward: formValues.riskReward,
        //   tradeType: formValues.tradeType
        // });

        // Force trigger the calculation by updating the entryPrice field
        const currentEntry = formValues.entryPrice;
        setValue("entryPrice", "");
        setTimeout(() => {
          setValue("entryPrice", currentEntry);
        }, 50);
      }
    }, 200);
  };

  // Auto-calculation effect
  useEffect(() => {
    if (isApplyingTemplate) return;

    const subscription = watch((value, { name }) => {
      // Only trigger calculation on specific field changes, not on every change
      if (
        name === "entryPrice" ||
        name === "tradeType" ||
        name === "riskReward" ||
        name === "instrumentType"
      ) {
        const entryPrice = parseFloat(value.entryPrice);
        const tradeType = value.tradeType;
        const riskReward = value.riskReward;

        // Debounce the calculation to prevent excessive calls
        const timeoutId = setTimeout(() => {
          // If entry price is empty or invalid, clear stop loss and take profit
          if (!entryPrice || entryPrice <= 0 || isNaN(entryPrice)) {
            setValue("stopLoss", "");
            setValue("takeProfit", "");
            return;
          }

          // Check if we have minimum required fields for calculation
          if (entryPrice && entryPrice > 0) {
            // If we have entry price, try to auto-populate missing fields with defaults
            if (!tradeType) {
              setValue("tradeType", "long"); // Default to long
              return; // Exit and let the next watch event handle the calculation
            }
            if (!riskReward && settingsRiskProfiles.length > 0) {
              // Use first available risk profile or 1:1.5 default
              const defaultProfile =
                settingsRiskProfiles.find(
                  (p) => `${p.riskRatio}:${p.rewardRatio}` === "1:1.5"
                ) || settingsRiskProfiles[0];

              if (defaultProfile) {
                setValue(
                  "riskReward",
                  `${defaultProfile.riskRatio}:${defaultProfile.rewardRatio}`
                );
                return; // Exit and let the next watch event handle the calculation
              }
            }
          }

          if (entryPrice && entryPrice > 0 && tradeType && riskReward) {
            const [riskRatio, rewardRatio] = riskReward
              .split(":")
              .map((num) => parseFloat(num));

            if (riskRatio && rewardRatio) {
              const selectedProfile = settingsRiskProfiles.find(
                (profile) =>
                  `${profile.riskRatio}:${profile.rewardRatio}` === riskReward
              );

              let stopLoss, takeProfit;

              if (selectedProfile) {
                // Use the risk profile's specific settings
                const instrumentType = value.instrumentType || "stocks";

                if (instrumentType === "futures") {
                  // For futures, use points/ticks from the risk profile
                  const riskPoints = selectedProfile.pointRisk || 50;
                  const profitPoints = selectedProfile.pointProfit || 100;

                  if (tradeType === "long") {
                    stopLoss = entryPrice - riskPoints;
                    takeProfit = entryPrice + profitPoints;
                  } else {
                    stopLoss = entryPrice + riskPoints;
                    takeProfit = entryPrice - profitPoints;
                  }
                } else {
                  // For stocks/forex/crypto, use percentage-based calculation
                  let riskAmount;

                  if (selectedProfile.usePercentage) {
                    const riskPercent =
                      (selectedProfile.accountPercentage ||
                        selectedProfile.maxRiskPerTrade ||
                        2) / 100;
                    riskAmount = entryPrice * riskPercent;
                  } else {
                    riskAmount = selectedProfile.riskPerTradeAmount || 100;
                  }

                  if (tradeType === "long") {
                    stopLoss = entryPrice - riskAmount;
                    takeProfit =
                      entryPrice + riskAmount * (rewardRatio / riskRatio);
                  } else {
                    stopLoss = entryPrice + riskAmount;
                    takeProfit =
                      entryPrice - riskAmount * (rewardRatio / riskRatio);
                  }
                }
              } else {
                // Fallback calculation if no profile found
                const instrumentType = value.instrumentType || "stocks";

                if (instrumentType === "futures") {
                  const defaultRiskPoints = 50;
                  const defaultProfitPoints = 100;

                  if (tradeType === "long") {
                    stopLoss = entryPrice - defaultRiskPoints;
                    takeProfit = entryPrice + defaultProfitPoints;
                  } else {
                    stopLoss = entryPrice + defaultRiskPoints;
                    takeProfit = entryPrice - defaultProfitPoints;
                  }
                } else {
                  const defaultRiskPercent = 0.02;
                  const riskAmount = entryPrice * defaultRiskPercent;

                  if (tradeType === "long") {
                    stopLoss = entryPrice - riskAmount;
                    takeProfit =
                      entryPrice + riskAmount * (rewardRatio / riskRatio);
                  } else {
                    stopLoss = entryPrice + riskAmount;
                    takeProfit =
                      entryPrice - riskAmount * (rewardRatio / riskRatio);
                  }
                }
              }

              // Set the calculated values with proper validation
              if (
                stopLoss !== undefined &&
                !isNaN(stopLoss) &&
                isFinite(stopLoss)
              ) {
                setValue("stopLoss", stopLoss.toFixed(2));
              }
              if (
                takeProfit !== undefined &&
                !isNaN(takeProfit) &&
                isFinite(takeProfit)
              ) {
                setValue("takeProfit", takeProfit.toFixed(2));
              }
            }
          }
        }, 100); // 100ms debounce

        return () => clearTimeout(timeoutId);
      }
    });

    return () => subscription.unsubscribe();
  }, [watch, setValue, settingsRiskProfiles, isApplyingTemplate]);

  // Sync exit date with entry date when entry date changes
  useEffect(() => {
    if (watchedEntryDate && watchedStatus === "closed") {
      setValue("exitDate", watchedEntryDate);
    }
  }, [watchedEntryDate, watchedStatus, setValue]);

  // Update exit price when stop loss or take profit changes and mode is set to those values
  useEffect(() => {
    if (watchedStatus === "closed") {
      if (exitPriceMode === "stopLoss" && watchedStopLoss) {
        setValue("exitPrice", parseFloat(watchedStopLoss));
      } else if (exitPriceMode === "takeProfit" && watchedTakeProfit) {
        setValue("exitPrice", parseFloat(watchedTakeProfit));
      }
    }
  }, [
    watchedStopLoss,
    watchedTakeProfit,
    exitPriceMode,
    watchedStatus,
    setValue,
  ]);

  // Reapply template values when switching tabs to ensure all fields are populated
  useEffect(() => {
    if (lastAppliedTemplate && !isApplyingTemplate) {
      console.log("Tab switched to:", activeTab, "Reapplying template values");
      const templateFields = lastAppliedTemplate.fields || {};
      const includedFields =
        lastAppliedTemplate.includedFields ||
        Object.keys(templateFields).filter(
          (key) =>
            templateFields[key] !== undefined &&
            templateFields[key] !== "" &&
            templateFields[key] !== null
        );

      // Apply template values with a small delay to ensure DOM elements are rendered
      setTimeout(() => {
        includedFields.forEach((field) => {
          if (
            templateFields[field] !== undefined &&
            templateFields[field] !== "" &&
            templateFields[field] !== null
          ) {
            let value = templateFields[field];

            // Normalize values to match form expectations
            if (field === "tradeType") {
              value = value.toLowerCase();
            }
            if (field === "instrumentType") {
              value = value.toLowerCase();
            }

            console.log(`Reapplying field ${field} to:`, value);
            setValue(field, value);
          }
        });
      }, 100);
    }
  }, [activeTab, lastAppliedTemplate, setValue, isApplyingTemplate]);

  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true);

      saveUserOption("strategies", data.strategy);
      saveUserOption("setups", data.setup);
      saveUserOption("marketConditions", data.marketCondition);

      const formattedData = {
        ...data,
        status: data.status || "closed", // Default to closed for manual entry
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
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
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
                {/* Template Selection and Entry Date - Side by side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Side - Template Selection */}
                  <div>
                    {settingsTemplates.length > 0 ? (
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
                          className="input mb-2"
                          value={selectedTemplateId}
                          onChange={(e) => {
                            const templateId = e.target.value;
                            setSelectedTemplateId(templateId);
                            if (templateId === "clear") {
                              // Clear template selection but keep form values
                              setSelectedTemplateId("");
                            } else if (templateId) {
                              applyTemplate(templateId);
                            }
                          }}
                        >
                          <option value="">Select a trading template...</option>
                          {selectedTemplateId && (
                            <option value="clear">
                              ✕ Clear Template Selection
                            </option>
                          )}
                          {settingsTemplates.map((template) => (
                            <option key={template.id} value={template.id}>
                              {template.name}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-green-600">
                          Templates auto-fill strategy, risk settings, and trade
                          parameters
                        </p>
                      </div>
                    ) : (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center text-gray-600 mb-2">
                          <Target className="w-5 h-5 mr-2" />
                          <h4 className="font-semibold">Templates</h4>
                        </div>
                        <p className="text-sm text-gray-500">
                          No templates available. Create templates in Settings
                          for faster trade entry.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Right Side - Entry Date */}
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

                {/* Risk/Reward Ratio - Below Template and Entry Date */}
                <div>
                  <label className="label">Risk/Reward Ratio</label>
                  {settingsRiskProfiles.length > 0 ? (
                    <select
                      {...register("riskReward")}
                      value={watch("riskReward") || ""}
                      className="input"
                      onChange={(e) => {
                        setValue("riskReward", e.target.value);

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
                            const selectedProfile = settingsRiskProfiles.find(
                              (profile) =>
                                `${profile.riskRatio}:${profile.rewardRatio}` ===
                                e.target.value
                            );

                            const defaultRiskPercent =
                              selectedProfile?.riskPercent || 0.02;
                            const riskAmount = entryPrice * defaultRiskPercent;

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

                            setValue("stopLoss", stopLoss.toFixed(2));
                            setValue("takeProfit", takeProfit.toFixed(2));

                            toast.success(
                              `Risk levels calculated for ${riskRatio}:${rewardRatio} ratio`
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
                    <div className="input bg-gray-50 text-gray-500 flex items-center text-sm">
                      No risk profiles available - Create them in Settings
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Auto-calculates stop loss and take profit levels
                  </p>
                </div>

                {/* Type and Instrument - Swapped positions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      {instruments[selectedInstrumentType]?.map(
                        (instrument) => (
                          <option key={instrument} value={instrument} />
                        )
                      )}
                    </datalist>
                    {errors.instrument && (
                      <p className="text-danger-600 text-xs mt-1">
                        {errors.instrument.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Direction Selection - Made smaller (50% width max) */}
                <div className="max-w-md mx-auto">
                  <label className="label">Direction *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center justify-center p-2 border rounded-lg cursor-pointer hover:bg-green-50 has-[:checked]:bg-green-100 has-[:checked]:border-green-300">
                      <input
                        type="radio"
                        value="long"
                        {...register("tradeType", {
                          required: "Direction is required",
                        })}
                        className="sr-only"
                      />
                      <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                      <span className="font-medium text-green-700 text-sm">
                        Long
                      </span>
                    </label>
                    <label className="flex items-center justify-center p-2 border rounded-lg cursor-pointer hover:bg-red-50 has-[:checked]:bg-red-100 has-[:checked]:border-red-300">
                      <input
                        type="radio"
                        value="short"
                        {...register("tradeType", {
                          required: "Direction is required",
                        })}
                        className="sr-only"
                      />
                      <TrendingDown className="w-4 h-4 text-red-600 mr-1" />
                      <span className="font-medium text-red-700 text-sm">
                        Short
                      </span>
                    </label>
                  </div>
                  {errors.tradeType && (
                    <p className="text-danger-600 text-xs mt-1">
                      {errors.tradeType.message}
                    </p>
                  )}
                </div>

                {/* Entry Price and Quantity - Moved below Direction */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                {/* Stop Loss and Take Profit - Moved below Entry Price/Quantity */}
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

                {/* Exit Info - Only if trade is being edited as closed */}
                {watchedStatus === "closed" && (
                  <div className="border-t pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="label">Exit Date</label>
                        <input
                          type="date"
                          {...register("exitDate")}
                          className="input"
                          defaultValue={watchedEntryDate || ""}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Defaults to entry date
                        </p>
                      </div>
                      <div>
                        <label className="label">Exit Price</label>
                        <div className="space-y-2">
                          <select
                            value={exitPriceMode}
                            onChange={(e) => {
                              const mode = e.target.value;
                              setExitPriceMode(mode);

                              // Auto-populate exit price based on selection
                              if (mode === "stopLoss" && watchedStopLoss) {
                                setValue(
                                  "exitPrice",
                                  parseFloat(watchedStopLoss)
                                );
                              } else if (
                                mode === "takeProfit" &&
                                watchedTakeProfit
                              ) {
                                setValue(
                                  "exitPrice",
                                  parseFloat(watchedTakeProfit)
                                );
                              }
                            }}
                            className="input"
                          >
                            <option value="stopLoss">
                              Stop Loss ({watchedStopLoss || "0.00"})
                            </option>
                            <option value="takeProfit">
                              Take Profit ({watchedTakeProfit || "0.00"})
                            </option>
                            <option value="custom">Custom Price</option>
                          </select>
                          <input
                            type="number"
                            step="0.01"
                            {...register("exitPrice")}
                            className="input"
                            placeholder="0.00"
                            disabled={exitPriceMode !== "custom"}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Select preset or enter custom exit price
                        </p>
                      </div>
                      <div>
                        <label className="label">P&L</label>
                        <input
                          type="number"
                          step="0.01"
                          {...register("pnl")}
                          className="input bg-gray-50"
                          placeholder="Auto-calculated"
                          readOnly
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "advanced" && (
              <div className="space-y-6">
                {/* All the detailed fields */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Strategy & Setup */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-gray-900 pb-2 border-b">
                      Strategy & Setup
                    </h4>

                    <div>
                      <label className="label">Strategy</label>
                      {settingsStrategies.length > 0 ? (
                        <select {...register("strategy")} className="input">
                          <option value="">Select strategy</option>
                          {settingsStrategies.map((strategy, index) => (
                            <option key={strategy.id || strategy || index} value={strategy.name || strategy}>
                              {strategy.name || strategy}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          list="strategies-list"
                          {...register("strategy")}
                          className="input"
                          placeholder="e.g., Breakout, Scalping"
                        />
                      )}
                      {settingsStrategies.length === 0 && (
                        <datalist id="strategies-list">
                          {strategies.map((strategy) => (
                            <option key={strategy} value={strategy} />
                          ))}
                        </datalist>
                      )}
                    </div>

                    <div>
                      <label className="label">Setup</label>
                      {settingsSetups.length > 0 ? (
                        <select {...register("setup")} className="input">
                          <option value="">Select setup</option>
                          {settingsSetups.map((setup, index) => (
                            <option key={setup.id || setup || index} value={setup.name || setup}>
                              {setup.name || setup}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          list="setups-list"
                          {...register("setup")}
                          className="input"
                          placeholder="e.g., Flag, Triangle"
                        />
                      )}
                      {settingsSetups.length === 0 && (
                        <datalist id="setups-list">
                          {setups.map((setup) => (
                            <option key={setup} value={setup} />
                          ))}
                        </datalist>
                      )}
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
                        placeholder="Current time"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Defaults to current time for new trades
                      </p>
                    </div>

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
                          <option value="5">5x</option>
                          <option value="10">10x</option>
                          <option value="20">20x</option>
                          <option value="50">50x</option>
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
                          placeholder="Time when trade was closed"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Set when the trade was actually closed
                        </p>
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

            {/* Form Actions */}
            <div className="flex justify-between items-center pt-6 border-t">
              <div className="text-sm text-gray-500">
                <p>
                  💡 <strong>Tip:</strong> Use templates for faster entry •
                  Switch to Advanced for detailed settings
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-secondary text-sm px-4 py-1.5"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary text-sm px-4 py-1.5"
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
