import React, { useState, useEffect, useRef } from "react";
import { RR_MODES, getDefaultModeForInstrument, getUserRRList, parseRRValue } from "../../utils/rrModes";
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
  ChevronDown,
  Check,
} from "lucide-react";
import { useTrades } from "../../context/TradeContext";
import toast from "react-hot-toast";

// Returns "YYYY-MM-DD" using LOCAL date, not UTC — prevents timezone off-by-one
const toLocalDateStr = (d) => {
  const date = d instanceof Date ? d : new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

// Helper functions
const getUserOptions = (type) => {
  const stored = localStorage.getItem(`tradeForm_${type}`);
  return stored ? JSON.parse(stored) : [];
};

const saveUserOption = (type, value) => {
  if (!value || !value.trim()) return;
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
  const [rrMode, setRrMode] = useState("ratio");
  const [rrListsByMode, setRrListsByMode] = useState(() =>
    Object.fromEntries(Object.keys(RR_MODES).map((m) => [m, getUserRRList(m)]))
  );

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
            ? typeof trade.entryDate === "string" &&
              trade.entryDate.includes("T")
              ? trade.entryDate.split("T")[0]
              : trade.entryDate
            : "",
          exitDate: trade.exitDate
            ? typeof trade.exitDate === "string" && trade.exitDate.includes("T")
              ? trade.exitDate.split("T")[0]
              : trade.exitDate
            : "",
          tags: Array.isArray(trade.tags)
            ? trade.tags.join(", ")
            : trade.tags || "",
          // Pre-populate the R:R dropdown from the stored ratio (e.g. 1.5 → "1:1.5")
          riskReward: trade.riskRewardRatio ? `1:${trade.riskRewardRatio}` : "",
        }
      : {
          entryDate: selectedDate
            ? toLocalDateStr(selectedDate)
            : toLocalDateStr(new Date()),
          entryTime: new Date().toTimeString().slice(0, 5), // Set current time for new trades
          instrumentType: "stocks",
          status: "closed", // Default new manual trades to closed
        },
  });

  const watchedStatus = watch("status");
  const selectedInstrumentType = watch("instrumentType");

  // Auto-switch R:R mode when instrument type changes
  useEffect(() => {
    if (selectedInstrumentType) {
      setRrMode(getDefaultModeForInstrument(selectedInstrumentType));
    }
  }, [selectedInstrumentType]);
  const watchedEntryDate = watch("entryDate");
  const watchedStopLoss = watch("stopLoss");
  const watchedTakeProfit = watch("takeProfit");
  const watchedInstrument = watch("instrument");
  const watchedEntryPrice = watch("entryPrice");
  const watchedQuantity = watch("quantity");
  const watchedTradeType = watch("tradeType");

  // Instrument combobox state
  const [instrumentOpen, setInstrumentOpen] = useState(false);
  const [instrumentSearch, setInstrumentSearch] = useState("");
  const [customInstruments, setCustomInstruments] = useState(() => {
    const stored = localStorage.getItem("tradeForm_customInstruments");
    return stored ? JSON.parse(stored) : {};
  });
  const instrumentRef = useRef(null);

  // Constants
  const instruments = {
    stocks: ["AAPL", "GOOGL", "MSFT", "AMZN", "TSLA", "META", "NVDA", "NFLX"],
    forex: ["EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCAD"],
    crypto: ["BTCUSD", "ETHUSD", "BNBUSD", "ADAUSD", "SOLUSD", "XRPUSD"],
    futures: [
      // E-mini (standard)
      "ES", "NQ", "YM", "RTY",
      // Micro E-mini
      "MES", "MNQ", "MYM", "M2K",
      // Commodities (standard)
      "CL", "GC", "SI", "NG",
      // Micro commodities
      "MCL", "MGC",
    ],
    options: ["SPY", "QQQ", "IWM", "AAPL", "TSLA", "AMC", "GME", "NVDA"],
  };

  // Dollar value per 1 point of price move per 1 contract
  const FUTURES_POINT_VALUES = {
    // E-mini (standard)
    ES: 50, NQ: 20, YM: 5, RTY: 50,
    // Micro E-mini (1/10th of standard)
    MES: 5, MNQ: 2, MYM: 0.5, M2K: 5,
    // Commodities (standard)
    CL: 1000, GC: 100, SI: 5000, NG: 10000,
    // Micro commodities
    MCL: 100, MGC: 10,
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
    console.log(
      "Template defaultRiskProfile field:",
      templateFields.defaultRiskProfile
    );
    console.log("Available settingsRiskProfiles:", settingsRiskProfiles);
    console.log("All template fields:", templateFields);

    // Check for defaultRiskProfile field in template
    if (templateFields.defaultRiskProfile) {
      console.log(
        "Looking for risk profile with name:",
        templateFields.defaultRiskProfile
      );
      // Find the risk profile by name
      selectedRiskProfile = settingsRiskProfiles.find(
        (profile) => profile.name === templateFields.defaultRiskProfile
      );
      console.log("Found matching profile:", selectedRiskProfile);
      if (selectedRiskProfile) {
        riskRewardToApply = `${selectedRiskProfile.riskRatio}:${selectedRiskProfile.rewardRatio}`;
        console.log(
          "Using template's default risk profile:",
          templateFields.defaultRiskProfile,
          "->",
          riskRewardToApply
        );
      } else {
        console.log("ERROR: Risk profile not found in settings!");
        console.log(
          "Available profile names:",
          settingsRiskProfiles.map((p) => p.name)
        );
      }
    } else {
      console.log("No defaultRiskProfile field in template");
      console.log(
        "Template might be using old format, checking legacy fields..."
      );
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
          console.log(
            "Legacy value is a profile name, looking for matching profile"
          );
          const matchingProfile = settingsRiskProfiles.find(
            (profile) => profile.name === legacyValue
          );
          if (matchingProfile) {
            riskRewardToApply = `${matchingProfile.riskRatio}:${matchingProfile.rewardRatio}`;
            console.log(
              `Converted profile name "${legacyValue}" to ratio:`,
              riskRewardToApply
            );
          } else {
            console.log(
              `Profile "${legacyValue}" not found in current profiles`
            );
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
            (profile) => profile.name === legacyValue
          );
          if (matchingProfile) {
            riskRewardToApply = `${matchingProfile.riskRatio}:${matchingProfile.rewardRatio}`;
            console.log(
              `Converted profile name "${legacyValue}" to ratio:`,
              riskRewardToApply
            );
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
            (profile) => profile.name === legacyValue
          );
          if (matchingProfile) {
            riskRewardToApply = `${matchingProfile.riskRatio}:${matchingProfile.rewardRatio}`;
            console.log(
              `Converted profile name "${legacyValue}" to ratio:`,
              riskRewardToApply
            );
          }
        }
      }

      console.log("Template risk reward search (legacy):");
      console.log("- riskReward:", templateFields.riskReward);
      console.log("- riskProfile:", templateFields.riskProfile);
      console.log(
        "- Default Risk Profile:",
        templateFields["Default Risk Profile"]
      );
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
      const availableOptions = settingsRiskProfiles.map(
        (profile) => `${profile.riskRatio}:${profile.rewardRatio}`
      );
      console.log("Available dropdown options:", availableOptions);
      console.log(
        "Does set value match an option?",
        availableOptions.includes(riskRewardToApply)
      );

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

  // Close instrument dropdown when clicking outside
  useEffect(() => {
    if (!instrumentOpen) return;
    const handleClickOutside = (e) => {
      if (instrumentRef.current && !instrumentRef.current.contains(e.target)) {
        setInstrumentOpen(false);
        setInstrumentSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [instrumentOpen]);

  // Reset instrument search when type changes
  useEffect(() => {
    setInstrumentSearch("");
    setInstrumentOpen(false);
  }, [selectedInstrumentType]);

  // Instrument combobox helpers
  const baseInstrumentList = instruments[selectedInstrumentType] || [];
  const savedInstrumentList = customInstruments[selectedInstrumentType] || [];
  const allInstrumentOptions = [...new Set([...baseInstrumentList, ...savedInstrumentList])];
  const filteredInstrumentOptions = allInstrumentOptions.filter((i) =>
    i.toLowerCase().includes(instrumentSearch.toLowerCase())
  );
  const canAddInstrument =
    instrumentSearch.trim().length > 0 &&
    !allInstrumentOptions.some(
      (i) => i.toLowerCase() === instrumentSearch.trim().toLowerCase()
    );

  const handleSelectInstrument = (value) => {
    setValue("instrument", value);
    trigger("instrument");
    setInstrumentOpen(false);
    setInstrumentSearch("");
  };

  const handleAddInstrument = (value) => {
    const type = selectedInstrumentType;
    const updated = {
      ...customInstruments,
      [type]: [...new Set([...(customInstruments[type] || []), value])],
    };
    setCustomInstruments(updated);
    localStorage.setItem("tradeForm_customInstruments", JSON.stringify(updated));
    handleSelectInstrument(value);
  };

  // Live stop-loss / take-profit metrics (distance + dollar value)
  const slTpMetrics = (() => {
    const entry = parseFloat(watchedEntryPrice);
    const sl    = parseFloat(watchedStopLoss);
    const tp    = parseFloat(watchedTakeProfit);
    const qty   = parseFloat(watchedQuantity);
    const inst  = (watchedInstrument || "").toUpperCase();
    const type  = selectedInstrumentType;

    if (!entry || isNaN(entry) || entry <= 0) return null;

    const pipSize = inst.includes("JPY") ? 0.01 : 0.0001;

    const toUnits = (price) => {
      if (!price || isNaN(price)) return null;
      const diff = Math.abs(entry - price);
      if (type === "forex") return { value: diff / pipSize, label: "pips" };
      return { value: diff, label: "pts" };
    };

    // Use qty=1 as fallback so dollar value shows even before quantity is filled
    const effectiveQty = (!qty || isNaN(qty) || qty <= 0) ? 1 : qty;
    const isQtyDefaulted = effectiveQty === 1 && (!qty || isNaN(qty) || qty <= 0);

    const toDollar = (rawDiff) => {
      if (isNaN(rawDiff)) return null;
      const d = Math.abs(rawDiff);
      switch (type) {
        case "futures": return d * (FUTURES_POINT_VALUES[inst] ?? 1) * effectiveQty;
        case "forex":   return (d / pipSize) * 10 * effectiveQty;
        case "options": return d * effectiveQty * 100;
        default:        return d * effectiveQty;
      }
    };

    const hasSL = !isNaN(sl) && sl > 0;
    const hasTP = !isNaN(tp) && tp > 0;

    const slUnits  = hasSL ? toUnits(sl)  : null;
    const tpUnits  = hasTP ? toUnits(tp)  : null;
    const slDollar = hasSL ? toDollar(entry - sl) : null;
    const tpDollar = hasTP ? toDollar(tp - entry) : null;

    // Arrow direction based on price vs entry
    const slArrow = hasSL ? (sl < entry ? "↓" : "↑") : null;
    const tpArrow = hasTP ? (tp > entry ? "↑" : "↓") : null;

    // Actual R:R from live values
    const actualRR =
      slUnits?.value && tpUnits?.value
        ? (tpUnits.value / slUnits.value).toFixed(2)
        : null;

    // Point value label for futures tooltip
    const futuresLabel =
      type === "futures" && FUTURES_POINT_VALUES[inst]
        ? `${inst} = $${FUTURES_POINT_VALUES[inst]}/pt`
        : null;

    return { slUnits, tpUnits, slDollar, tpDollar, slArrow, tpArrow, actualRR, futuresLabel, isQtyDefaulted };
  })();

  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true);

      saveUserOption("strategies", data.strategy);
      saveUserOption("setups", data.setup);
      saveUserOption("marketConditions", data.marketCondition);

      const formattedData = {
        ...data,
        status: data.status || "closed", // Default to closed for manual entry
        entryDate: data.entryDate ? `${data.entryDate}T00:00:00` : null,
        exitDate: data.exitDate ? `${data.exitDate}T00:00:00` : null,
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center">
            <Calendar className="w-6 h-6 mr-2 text-blue-600" />
            {isEditing ? "Edit Trade" : "Add New Trade"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Tab Navigation */}
          <div className="flex space-x-1 mb-6 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveTab("quick")}
              className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md transition-colors ${
                activeTab === "quick"
                  ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm border border-blue-200 dark:border-blue-600"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
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
                  ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm border border-blue-200 dark:border-blue-600"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              }`}
            >
              <Settings className="w-4 h-4 mr-2" />
              Advanced
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {activeTab === "quick" && (
              <div className="space-y-6">
                {/* Template / Trade Setup panel + Entry Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left: template picker (new trade) OR setup summary (editing) */}
                  <div>
                    {isEditing ? (
                      /* ── Edit mode: show what the trade was set up with ── */
                      <div className="bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 rounded-lg p-4 h-full">
                        <div className="flex items-center text-gray-700 dark:text-gray-200 mb-3">
                          <BarChart3 className="w-5 h-5 mr-2 text-blue-500" />
                          <h4 className="font-semibold text-sm">Trade Setup</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                          <div>
                            <span className="text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium">Strategy</span>
                            <div className={`mt-0.5 font-medium ${trade.strategy ? "text-gray-800 dark:text-gray-100" : "text-gray-400 dark:text-gray-500 italic"}`}>
                              {trade.strategy || "No strategy set"}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium">Setup</span>
                            <div className={`mt-0.5 font-medium ${trade.setup ? "text-gray-800 dark:text-gray-100" : "text-gray-400 dark:text-gray-500 italic"}`}>
                              {trade.setup || "No setup set"}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium">Market</span>
                            <div className={`mt-0.5 font-medium ${trade.marketCondition ? "text-gray-800 dark:text-gray-100" : "text-gray-400 dark:text-gray-500 italic"}`}>
                              {trade.marketCondition || "Not recorded"}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium">R:R</span>
                            <div className={`mt-0.5 font-medium ${trade.riskRewardRatio ? "text-gray-800 dark:text-gray-100" : "text-gray-400 dark:text-gray-500 italic"}`}>
                              {trade.riskRewardRatio ? `1:${trade.riskRewardRatio}` : (slTpMetrics?.actualRR ? `1:${slTpMetrics.actualRR} (derived)` : "Not recorded")}
                            </div>
                          </div>
                        </div>
                        {settingsTemplates.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                            <select
                              className="input text-xs py-1"
                              value={selectedTemplateId}
                              onChange={(e) => {
                                const templateId = e.target.value;
                                setSelectedTemplateId(templateId);
                                if (templateId === "clear") setSelectedTemplateId("");
                                else if (templateId) applyTemplate(templateId);
                              }}
                            >
                              <option value="">Re-apply a template…</option>
                              {settingsTemplates.map((t) => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    ) : settingsTemplates.length > 0 ? (
                      /* ── New trade: template picker ── */
                      <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-3">
                          <div className="flex items-center text-green-800 dark:text-green-200">
                            <Target className="w-5 h-5 mr-2" />
                            <h4 className="font-semibold">Use Template</h4>
                          </div>
                          <span className="text-xs text-green-600 dark:text-green-300 bg-green-100 dark:bg-green-800 px-2 py-1 rounded">
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
                              setSelectedTemplateId("");
                            } else if (templateId) {
                              applyTemplate(templateId);
                            }
                          }}
                        >
                          <option value="">Select a trading template...</option>
                          {selectedTemplateId && (
                            <option value="clear">✕ Clear Template Selection</option>
                          )}
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
                    ) : (
                      <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                        <div className="flex items-center text-gray-600 dark:text-gray-400 mb-2">
                          <Target className="w-5 h-5 mr-2" />
                          <h4 className="font-semibold">Templates</h4>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          No templates available. Create templates in Settings for faster trade entry.
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

                {/* Risk/Reward Ratio — mode-aware */}
                <div>
                  <label className="label">Risk/Reward Ratio</label>

                  {/* Mode pills */}
                  <div className="flex flex-wrap gap-1 mb-2">
                    {Object.entries(RR_MODES).map(([key, mode]) => (
                      <button key={key} type="button"
                        onClick={() => setRrMode(key)}
                        className={`px-2 py-0.5 text-xs rounded-full border font-medium transition-colors ${
                          rrMode === key
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-gray-500 border-gray-300 hover:border-blue-400 hover:text-blue-600 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600"
                        }`}
                      >{mode.label}</button>
                    ))}
                  </div>

                  <select
                    {...register("riskReward")}
                    value={watch("riskReward") || ""}
                    className="input"
                    onChange={(e) => {
                      setValue("riskReward", e.target.value);
                      if (e.target.value && !isApplyingTemplate) {
                        const parsed = parseRRValue(e.target.value);
                        const entryPrice = parseFloat(watch("entryPrice"));
                        const tradeType = watch("tradeType");
                        if (parsed && entryPrice > 0) {
                          const { risk: riskRatio, reward: rewardRatio } = parsed;
                          const riskAmount = entryPrice * 0.02;
                          let stopLoss, takeProfit;
                          if (tradeType === "long") {
                            stopLoss = entryPrice - riskAmount;
                            takeProfit = entryPrice + riskAmount * (rewardRatio / riskRatio);
                          } else {
                            stopLoss = entryPrice + riskAmount;
                            takeProfit = entryPrice - riskAmount * (rewardRatio / riskRatio);
                          }
                          setValue("stopLoss", stopLoss.toFixed(2));
                          setValue("takeProfit", takeProfit.toFixed(2));
                          toast.success(`Risk levels set: ${e.target.value}`);
                        }
                      }
                    }}
                  >
                    <option value="">Select {RR_MODES[rrMode].label} ratio</option>
                    {/* Keep any existing stored value selectable */}
                    {watch("riskReward") && !(rrListsByMode[rrMode] || []).includes(watch("riskReward")) && (
                      <option value={watch("riskReward")}>{watch("riskReward")}</option>
                    )}
                    {(rrListsByMode[rrMode] || []).map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {RR_MODES[rrMode].hint} · Auto-calculates stop &amp; target
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
                    {/* Hidden input registers the field with react-hook-form for validation */}
                    <input
                      type="hidden"
                      {...register("instrument", { required: "Instrument is required" })}
                    />
                    <div ref={instrumentRef} className="relative">
                      <button
                        type="button"
                        data-testid="trade-form-instrument-btn"
                        onClick={() => setInstrumentOpen((o) => !o)}
                        className={`input w-full flex items-center justify-between text-left ${
                          !watchedInstrument ? "text-gray-400 dark:text-gray-500" : "text-gray-900 dark:text-gray-100"
                        }`}
                      >
                        <span>{watchedInstrument || "Select instrument…"}</span>
                        <ChevronDown className={`w-4 h-4 shrink-0 text-gray-400 transition-transform ${instrumentOpen ? "rotate-180" : ""}`} />
                      </button>

                      {instrumentOpen && (
                        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl overflow-hidden">
                          {/* Search */}
                          <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                            <input
                              autoFocus
                              type="text"
                              data-testid="trade-form-instrument-search"
                              value={instrumentSearch}
                              onChange={(e) => setInstrumentSearch(e.target.value)}
                              placeholder="Search or type instrument…"
                              className="w-full text-sm px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary-500"
                              onKeyDown={(e) => {
                                if (e.key === "Escape") { setInstrumentOpen(false); setInstrumentSearch(""); }
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  if (filteredInstrumentOptions.length > 0) {
                                    handleSelectInstrument(filteredInstrumentOptions[0]);
                                  } else if (canAddInstrument) {
                                    handleAddInstrument(instrumentSearch.trim().toUpperCase());
                                  }
                                }
                              }}
                            />
                          </div>
                          {/* Options */}
                          <div className="max-h-48 overflow-y-auto">
                            {filteredInstrumentOptions.map((inst) => (
                              <button
                                key={inst}
                                type="button"
                                data-testid={`trade-form-instrument-option-${inst}`}
                                onClick={() => handleSelectInstrument(inst)}
                                className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left transition-colors ${
                                  watchedInstrument === inst
                                    ? "bg-primary-50 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 font-medium"
                                    : "text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
                                }`}
                              >
                                {inst}
                                {watchedInstrument === inst && <Check className="w-3.5 h-3.5" />}
                              </button>
                            ))}
                            {canAddInstrument && (
                              <button
                                type="button"
                                data-testid="trade-form-instrument-add-btn"
                                onClick={() => handleAddInstrument(instrumentSearch.trim().toUpperCase())}
                                className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 border-t border-gray-100 dark:border-gray-700 transition-colors"
                              >
                                <Plus className="w-4 h-4" />
                                <span>Add "{instrumentSearch.trim().toUpperCase()}"</span>
                              </button>
                            )}
                            {filteredInstrumentOptions.length === 0 && !canAddInstrument && (
                              <p className="px-3 py-4 text-sm text-center text-gray-400">No instruments found</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
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
                    <label className="flex items-center justify-center p-2 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-green-50 dark:hover:bg-green-900/20 has-[:checked]:bg-green-100 dark:has-[:checked]:bg-green-900/40 has-[:checked]:border-green-300 dark:has-[:checked]:border-green-600">
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
                    <label className="flex items-center justify-center p-2 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20 has-[:checked]:bg-red-100 dark:has-[:checked]:bg-red-900/40 has-[:checked]:border-red-300 dark:has-[:checked]:border-red-600">
                      <input
                        type="radio"
                        value="short"
                        {...register("tradeType", {
                          required: "Direction is required",
                        })}
                        className="sr-only"
                      />
                      <TrendingDown className="w-4 h-4 text-red-600 mr-1" />
                      <span className="font-medium text-red-700 dark:text-red-300 text-sm">
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

                {/* Stop Loss and Take Profit */}
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
                    {slTpMetrics?.slUnits && (
                      <div className="mt-1 flex items-center flex-wrap gap-x-1 text-xs text-red-600 dark:text-red-400">
                        <span className="font-medium">
                          {slTpMetrics.slArrow} {slTpMetrics.slUnits.value.toFixed(1)} {slTpMetrics.slUnits.label}
                        </span>
                        {slTpMetrics.futuresLabel && (
                          <span className="text-gray-400 dark:text-gray-500">({slTpMetrics.futuresLabel})</span>
                        )}
                        {slTpMetrics.slDollar !== null && (
                          <>
                            <span className="text-gray-300 dark:text-gray-600">·</span>
                            <span className="font-semibold">
                              −${slTpMetrics.slDollar.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                              {slTpMetrics.isQtyDefaulted && <span className="font-normal text-gray-400 dark:text-gray-500"> /contract</span>}
                            </span>
                          </>
                        )}
                      </div>
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
                    {slTpMetrics?.tpUnits && (
                      <div className="mt-1 flex items-center flex-wrap gap-x-1 text-xs text-green-600 dark:text-green-400">
                        <span className="font-medium">
                          {slTpMetrics.tpArrow} {slTpMetrics.tpUnits.value.toFixed(1)} {slTpMetrics.tpUnits.label}
                        </span>
                        {slTpMetrics.tpDollar !== null && (
                          <>
                            <span className="text-gray-300 dark:text-gray-600">·</span>
                            <span className="font-semibold">
                              +${slTpMetrics.tpDollar.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                              {slTpMetrics.isQtyDefaulted && <span className="font-normal text-gray-400 dark:text-gray-500"> /contract</span>}
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* R:R summary bar — shown only when both SL and TP are filled */}
                {slTpMetrics?.actualRR && (
                  <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2 text-xs">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-gray-500 dark:text-gray-400">Actual R:R</span>
                      <span className="font-bold text-gray-800 dark:text-gray-100">1:{slTpMetrics.actualRR}</span>
                      {slTpMetrics.isQtyDefaulted && (
                        <span className="text-gray-400 dark:text-gray-500">(per contract)</span>
                      )}
                    </div>
                    <div className="flex items-center space-x-3">
                      {slTpMetrics.slDollar !== null && (
                        <span className="text-red-600 dark:text-red-400 font-medium">
                          −${slTpMetrics.slDollar.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                        </span>
                      )}
                      {slTpMetrics.slDollar !== null && slTpMetrics.tpDollar !== null && (
                        <span className="text-gray-300 dark:text-gray-600">/</span>
                      )}
                      {slTpMetrics.tpDollar !== null && (
                        <span className="text-green-600 dark:text-green-400 font-medium">
                          +${slTpMetrics.tpDollar.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                        </span>
                      )}
                    </div>
                  </div>
                )}

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
                          className="input bg-gray-50 dark:bg-gray-700"
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
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 pb-2 border-b border-gray-200 dark:border-gray-700">
                      Strategy & Setup
                    </h4>

                    <div>
                      <label className="label">Strategy</label>
                      {settingsStrategies.length > 0 ? (
                        <select {...register("strategy")} className="input">
                          <option value="">Select strategy</option>
                          {settingsStrategies.map((strategy, index) => (
                            <option
                              key={strategy.id || strategy || index}
                              value={strategy.name || strategy}
                            >
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
                            <option
                              key={setup.id || setup || index}
                              value={setup.name || setup}
                            >
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
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 pb-2 border-b border-gray-200 dark:border-gray-700 flex items-center">
                      <Clock className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
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
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 pb-2 border-b border-gray-200 dark:border-gray-700 flex items-center">
                      <BarChart3 className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
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
