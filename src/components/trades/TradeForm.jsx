import React, { useState, useEffect, useRef } from "react";
import { RR_MODES, QUICK_MODES, ADVANCED_RR_MODES, getDefaultModeForInstrument, getUserRRList, parseRRValue } from "../../utils/rrModes";
import { useTemplates } from "../../hooks/useTemplates";
import { useUserSettings } from "../../hooks/useUserSettings";
import TradeImageUploader from "./TradeImageUploader";
import { useForm } from "react-hook-form";
import {
  X,
  TrendingUp,
  TrendingDown,
  Plus,
  BarChart3,
  Zap,
  Settings,
  Clock,
  ChevronDown,
  Check,
  Camera,
  Image as ImageIcon,
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
  const { addTrade, updateTrade, saveTradeImage, deleteTradeImage, updateTradeImageOrder, refreshTrades } = useTrades();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);
  const [activeTab, setActiveTab] = useState("quick");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [lastAppliedTemplate, setLastAppliedTemplate] = useState(null);
  const [exitPriceMode, setExitPriceMode] = useState("stopLoss"); // "stopLoss", "takeProfit", "custom"
  const [rrUnit, setRrUnit] = useState("points"); // Risk/Reward hub display unit: "points" | "ticks"
  const [rrMode, setRrMode] = useState(() => getDefaultModeForInstrument("stocks"));
  const [rrListsByMode, setRrListsByMode] = useState(() =>
    Object.fromEntries(Object.keys(RR_MODES).map((m) => [m, getUserRRList(m)]))
  );

  // Templates fetched from Supabase — persisted across devices and cache clears
  const { templates: settingsTemplates } = useTemplates();
  const { strategies: settingsStrategies, setups: settingsSetups, riskProfiles: settingsRiskProfiles } = useUserSettings();

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

  // Auto-switch R:R mode when instrument type changes (Quick Entry context)
  useEffect(() => {
    if (selectedInstrumentType && activeTab === "quick") {
      setRrMode(getDefaultModeForInstrument(selectedInstrumentType));
    }
  }, [selectedInstrumentType]); // eslint-disable-line react-hooks/exhaustive-deps

  // When switching tabs, keep the mode valid for that tab
  useEffect(() => {
    const quickModes = QUICK_MODES[selectedInstrumentType] || ["dollar"];
    if (activeTab === "quick" && !quickModes.includes(rrMode)) {
      setRrMode(quickModes[0]);
    } else if (activeTab === "advanced" && !ADVANCED_RR_MODES.includes(rrMode)) {
      setRrMode("account_pct");
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps
  const watchedEntryDate = watch("entryDate");
  const watchedStopLoss = watch("stopLoss");
  const watchedTakeProfit = watch("takeProfit");
  const watchedInstrument = watch("instrument");
  const watchedEntryPrice = watch("entryPrice");
  const watchedQuantity = watch("quantity");
  const watchedTradeType = watch("tradeType");
  const watchedExitPrice = watch("exitPrice");

  // Instrument combobox state
  const [instrumentOpen, setInstrumentOpen] = useState(false);
  const [instrumentSearch, setInstrumentSearch] = useState("");
  const [customInstruments, setCustomInstruments] = useState(() => {
    const stored = localStorage.getItem("tradeForm_customInstruments");
    return stored ? JSON.parse(stored) : {};
  });
  const instrumentRef = useRef(null);

  const SLOT_LABELS = ["Chart", "Entry", "Exit", "Notes"];

  // Screenshots feature — always available in the form
  const [tradeImages, setTradeImages] = useState(() =>
    isEditing && trade?.images ? trade.images : []
  );
  const [showImageUploader, setShowImageUploader] = useState(false);
  const [activeSlotIndex, setActiveSlotIndex] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [dragOverSlot, setDragOverSlot] = useState(null);
  const [brokenSlots, setBrokenSlots] = useState(new Set());
  const slotFileInputRef = useRef(null);
  const draggedSlotRef = useRef(null);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      tradeImages.forEach((img) => {
        if (img.isNew && img.previewUrl) URL.revokeObjectURL(img.previewUrl);
      });
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset broken-image tracking whenever the image list changes
  useEffect(() => {
    setBrokenSlots(new Set());
  }, [tradeImages.length]);

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

  // Smallest price increment per futures contract — powers the Ticks/Points toggle
  const FUTURES_TICK_SIZES = {
    ES: 0.25, NQ: 0.25, YM: 1, RTY: 0.1,
    MES: 0.25, MNQ: 0.25, MYM: 1, M2K: 0.1,
    CL: 0.01, GC: 0.1, SI: 0.005, NG: 0.001,
    MCL: 0.01, MGC: 0.1,
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


  // Auto-detect the template that was applied to this trade when editing
  useEffect(() => {
    if (!isEditing || !trade || settingsTemplates.length === 0 || selectedTemplateId) return;
    const match = settingsTemplates.find((t) => {
      const f = t.fields || {};
      const strategyMatch = f.strategy ? f.strategy === trade.strategy : true;
      const setupMatch    = f.setup    ? f.setup    === trade.setup    : true;
      return strategyMatch && setupMatch && (f.strategy || f.setup);
    });
    if (match) setSelectedTemplateId(String(match.id));
  }, [isEditing, trade, settingsTemplates]); // eslint-disable-line react-hooks/exhaustive-deps


  // Template application function
  const applyTemplate = (templateId) => {
    const template = settingsTemplates.find((t) => t.id === templateId);

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

  // ── Risk / Reward hub (right hero panel) ──────────────────────────────
  // Live ratio, dollar values, verdict, and ladder proportions derived from
  // the entry / stop / target the user is editing. Pure render-time compute.
  const rrHub = (() => {
    const entry = parseFloat(watchedEntryPrice);
    const stop = parseFloat(watchedStopLoss);
    const tp = parseFloat(watchedTakeProfit);
    const qty = parseFloat(watchedQuantity);
    const inst = (watchedInstrument || "").toUpperCase();
    const type = selectedInstrumentType;
    const isLong = watchedTradeType !== "short";

    const hasEntry = !isNaN(entry) && entry > 0;
    const hasStop = !isNaN(stop) && stop > 0;
    const hasTP = !isNaN(tp) && tp > 0;

    const pipSize = inst.includes("JPY") ? 0.01 : 0.0001;
    const tickSize = FUTURES_TICK_SIZES[inst] || null;

    const riskRaw = hasEntry && hasStop ? Math.abs(entry - stop) : 0;
    const rewardRaw = hasEntry && hasTP ? Math.abs(tp - entry) : 0;

    const toDisplay = (raw) => {
      if (type === "forex") return raw / pipSize;
      if (type === "futures" && rrUnit === "ticks" && tickSize) return raw / tickSize;
      return raw;
    };
    const unitLabel =
      type === "forex"
        ? "pips"
        : type === "futures" && rrUnit === "ticks"
          ? "ticks"
          : "pts";

    const rr = riskRaw ? rewardRaw / riskRaw : 0;
    const rrText =
      riskRaw && rewardRaw
        ? Number.isInteger(rr)
          ? String(rr)
          : rr.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")
        : "—";

    let verdict = "Balanced";
    if (rr >= 2) verdict = "Excellent";
    else if (rr >= 1.5) verdict = "Strong";
    else if (rr > 0 && rr < 1) verdict = "Poor";

    const total = riskRaw + rewardRaw || 1;
    const rewardPct = Math.round((rewardRaw / total) * 100);

    const fmtMoney = (v) =>
      v == null || isNaN(v) ? null : `$${Math.round(Math.abs(v)).toLocaleString("en-US")}`;

    const pv = type === "futures" ? FUTURES_POINT_VALUES[inst] ?? null : null;

    return {
      isLong,
      hasStop,
      hasTP,
      riskDisp: toDisplay(riskRaw),
      rewardDisp: toDisplay(rewardRaw),
      unitLabel,
      rrText,
      rrValue: riskRaw && rewardRaw ? rr : null,
      verdict,
      rewardPct,
      riskPct: 100 - rewardPct,
      riskUsdStr: fmtMoney(slTpMetrics?.slDollar),
      rewardUsdStr: fmtMoney(slTpMetrics?.tpDollar),
      entry: hasEntry ? entry : null,
      stop: hasStop ? stop : null,
      tp: hasTP ? tp : null,
      qty: !isNaN(qty) && qty > 0 ? qty : null,
      inst,
      ptLabel: pv ? `${inst} = $${pv}/pt` : type === "forex" ? "$10 / pip" : "",
    };
  })();

  // Apply a target R-multiple to take-profit, based on entry & stop distance.
  const applyTargetRatio = (R) => {
    const entry = parseFloat(watchedEntryPrice);
    const stop = parseFloat(watchedStopLoss);
    if (isNaN(entry) || entry <= 0 || isNaN(stop) || stop <= 0) {
      toast.error("Enter an entry price and stop loss first");
      return;
    }
    const isLong = watchedTradeType !== "short";
    const risk = Math.abs(entry - stop);
    const target = isLong ? entry + R * risk : entry - R * risk;
    setValue("takeProfit", target.toFixed(2), { shouldValidate: true });
    toast.success(`Target set to 1:${R}`);
  };

  // Live realized P&L preview for the optional Exit section — mirrors the
  // save-time formula so the chip matches what gets stored.
  const exitPnlPreview = (() => {
    const entry = parseFloat(watchedEntryPrice);
    const exit = parseFloat(watchedExitPrice);
    const qty = parseFloat(watchedQuantity);
    if (isNaN(entry) || isNaN(exit) || !exit || isNaN(qty)) return null;
    const isLong = watchedTradeType !== "short";
    return isLong ? (exit - entry) * qty : (entry - exit) * qty;
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

      let savedTradeId;
      if (isEditing) {
        await updateTrade(trade.id, formattedData);
        savedTradeId = trade.id;
        toast.success("Trade updated successfully!");
      } else {
        const saved = await addTrade(formattedData);
        savedTradeId = saved?.id;
        toast.success("Trade added successfully!");
      }

      // Handle image changes, then await the full context refresh before closing
      // so the trade list has fresh data the moment the user reopens this trade.
      const newImages      = tradeImages.filter((img) => img.isNew && !img.toDelete);
      const deletedImages  = tradeImages.filter((img) => !img.isNew && img.toDelete);
      const changedImages  = tradeImages.filter((img) => !img.isNew && !img.toDelete);

      const hasImageWork = newImages.length > 0 || deletedImages.length > 0;
      // Always persist sort-order for existing images so drag-and-drop reorders survive saves.
      const hasSortWork  = changedImages.length > 0;

      if (savedTradeId && (hasImageWork || hasSortWork)) {
        await Promise.all([
          ...newImages.map((img, i) =>
            saveTradeImage(savedTradeId, img.file, img.sortOrder ?? i)
          ),
          ...deletedImages.map((img) =>
            deleteTradeImage(img.id)
          ),
          ...changedImages.map((img) =>
            updateTradeImageOrder(img.id, img.sortOrder)
          ),
        ]);

        // Await the refresh so context is up-to-date before the modal closes
        await refreshTrades();
      }

      onClose();
    } catch (error) {
      console.error("Error saving trade:", error);
      toast.error("Failed to save trade. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const visibleImages = tradeImages.filter((i) => !i.toDelete).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  const handleSlotClick = (slotIndex, img) => {
    if (img?.previewUrl) {
      setLightboxImage({ previewUrl: img.previewUrl, label: SLOT_LABELS[slotIndex] });
    } else {
      setActiveSlotIndex(slotIndex);
      slotFileInputRef.current?.click();
    }
  };

  const handleSlotDeleteClick = (e, img) => {
    e.stopPropagation();
    setTradeImages((prev) => {
      const updated = img.isNew
        ? prev.filter((i) => i.id !== img.id)
        : prev.map((i) => i.id === img.id ? { ...i, toDelete: true } : i);
      // Compact sortOrders so remaining images fill from slot 0 with no gaps
      const remaining = updated
        .filter((i) => !i.toDelete)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      const orderMap = Object.fromEntries(remaining.map((i, idx) => [i.id, idx]));
      return updated.map((i) =>
        !i.toDelete && orderMap[i.id] !== undefined
          ? { ...i, sortOrder: orderMap[i.id] }
          : i
      );
    });
  };

  const handleSlotDragStart = (e, slotIndex, img) => {
    if (!img?.previewUrl) { e.preventDefault(); return; }
    draggedSlotRef.current = slotIndex;
    e.dataTransfer.effectAllowed = "move";
  };

  const handleSlotDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleSlotDropEvent = (e, slotIndex) => {
    e.preventDefault();
    const fromIndex = draggedSlotRef.current;
    draggedSlotRef.current = null;
    // Internal slot-to-slot drag — swap sortOrders, ignore dataTransfer.files
    if (fromIndex !== null) {
      if (fromIndex === slotIndex) return;
      setTradeImages((prev) => {
        const fromImg = prev.find((i) => !i.toDelete && (i.sortOrder ?? 0) === fromIndex);
        const toImg = prev.find((i) => !i.toDelete && (i.sortOrder ?? 0) === slotIndex);
        return prev.map((i) => {
          if (fromImg && i.id === fromImg.id) return { ...i, sortOrder: slotIndex };
          if (toImg && i.id === toImg.id) return { ...i, sortOrder: fromIndex };
          return i;
        });
      });
      return;
    }
    // External file drop
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleSlotDrop(slotIndex, e.dataTransfer.files);
    }
  };

  const handleSlotFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || activeSlotIndex === null) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      toast.error("Only JPEG, PNG, WebP, or GIF allowed");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error("File must be under 4MB");
      return;
    }
    // Compress via canvas → WebP
    const compressed = await new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const scale = Math.min(1, 1200 / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" }));
        }, "image/webp", 0.8);
      };
      img.src = url;
    });
    const previewUrl = URL.createObjectURL(compressed);
    setTradeImages((prev) => {
      const next = prev.filter((i) => !i.toDelete);
      // Replace slot if something already occupies that sort order
      const withoutSlot = next.filter((i) => (i.sortOrder ?? 0) !== activeSlotIndex);
      return [
        ...withoutSlot,
        {
          id: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          file: compressed,
          previewUrl,
          storagePath: null,
          sortOrder: activeSlotIndex,
          isNew: true,
          toDelete: false,
        },
      ];
    });
    setActiveSlotIndex(null);
  };

  const handleSlotDrop = async (slotIndex, files) => {
    const file = files?.[0];
    if (!file) return;
    setActiveSlotIndex(slotIndex);
    // Reuse the file-change handler by temporarily triggering it
    // Directly process to avoid ref tricks
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      toast.error("Only JPEG, PNG, WebP, or GIF allowed");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error("File must be under 4MB");
      return;
    }
    const compressed = await new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const scale = Math.min(1, 1200 / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" }));
        }, "image/webp", 0.8);
      };
      img.src = url;
    });
    const previewUrl = URL.createObjectURL(compressed);
    setTradeImages((prev) => {
      const next = prev.filter((i) => !i.toDelete);
      const withoutSlot = next.filter((i) => (i.sortOrder ?? 0) !== slotIndex);
      return [
        ...withoutSlot,
        {
          id: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          file: compressed,
          previewUrl,
          storagePath: null,
          sortOrder: slotIndex,
          isNew: true,
          toDelete: false,
        },
      ];
    });
    setActiveSlotIndex(null);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        data-testid="trade-entry-modal"
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col border border-gray-200 dark:border-gray-700 overflow-hidden"
      >
        {/* HEADER */}
        <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
              {isEditing ? "Edit Trade" : "Add New Trade"}
            </h2>
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 truncate">
              {watchedInstrument || "—"} ·{" "}
              {selectedInstrumentType
                ? selectedInstrumentType[0].toUpperCase() + selectedInstrumentType.slice(1)
                : "—"}{" "}
              · {watchedTradeType === "short" ? "Short" : "Long"}
            </p>
          </div>

          <div className="ml-auto flex items-center gap-3">
            {/* Tab switch */}
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1 gap-0.5">
              <button
                type="button"
                onClick={() => setActiveTab("quick")}
                data-testid="trade-form-tab-quick"
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                  activeTab === "quick"
                    ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              >
                <Zap className="w-4 h-4" />
                Quick Entry
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("advanced")}
                data-testid="trade-form-tab-advanced"
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                  activeTab === "advanced"
                    ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              >
                <Settings className="w-4 h-4" />
                Advanced
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              data-testid="modal-close-btn"
              className="w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-y-auto md:overflow-hidden">
          {/* LEFT: form fields */}
          <form
            id="trade-entry-form"
            data-testid="trade-entry-form"
            onSubmit={handleSubmit(onSubmit)}
            className="flex-1 min-w-0 md:overflow-y-auto p-4 md:p-6 space-y-6"
          >
            {activeTab === "quick" && (
              <div className="space-y-6">
                {/* ── 1 · Setup ── */}
                <section>
                  <div className="flex items-center gap-2 mb-3 text-[11px] font-extrabold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                    <span className="w-5 h-5 rounded-md bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      1
                    </span>
                    Setup
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Type */}
                    <div>
                      <label className="label">Type *</label>
                      <select
                        {...register("instrumentType", { required: "Type is required" })}
                        className="input"
                        data-testid="trade-form-type-select"
                      >
                        <option value="stocks">Stocks</option>
                        <option value="forex">Forex</option>
                        <option value="crypto">Crypto</option>
                        <option value="futures">Futures</option>
                        <option value="options">Options</option>
                      </select>
                    </div>

                    {/* Instrument (searchable combobox) */}
                    <div>
                      <label className="label">Instrument *</label>
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
                            !watchedInstrument
                              ? "text-gray-400 dark:text-gray-500"
                              : "text-gray-900 dark:text-gray-100"
                          }`}
                        >
                          <span>{watchedInstrument || "Select instrument…"}</span>
                          <ChevronDown
                            className={`w-4 h-4 shrink-0 text-gray-400 transition-transform ${
                              instrumentOpen ? "rotate-180" : ""
                            }`}
                          />
                        </button>

                        {instrumentOpen && (
                          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl overflow-hidden">
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
                                  if (e.key === "Escape") {
                                    setInstrumentOpen(false);
                                    setInstrumentSearch("");
                                  }
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
                                <p className="px-3 py-4 text-sm text-center text-gray-400">
                                  No instruments found
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      {errors.instrument && (
                        <p className="text-danger-600 text-xs mt-1">{errors.instrument.message}</p>
                      )}
                    </div>

                    {/* Direction */}
                    <div>
                      <label className="label">Direction *</label>
                      <input
                        type="hidden"
                        {...register("tradeType", { required: "Direction is required" })}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          data-testid="trade-form-direction-long-btn"
                          onClick={() => setValue("tradeType", "long", { shouldValidate: true })}
                          className={`flex items-center justify-center gap-1.5 h-11 rounded-xl text-sm font-bold border transition-colors ${
                            watchedTradeType !== "short"
                              ? "bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-600 text-green-600 dark:text-green-400"
                              : "bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-400 hover:border-green-300"
                          }`}
                        >
                          <TrendingUp className="w-4 h-4" />
                          Long
                        </button>
                        <button
                          type="button"
                          data-testid="trade-form-direction-short-btn"
                          onClick={() => setValue("tradeType", "short", { shouldValidate: true })}
                          className={`flex items-center justify-center gap-1.5 h-11 rounded-xl text-sm font-bold border transition-colors ${
                            watchedTradeType === "short"
                              ? "bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-600 text-red-600 dark:text-red-400"
                              : "bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-400 hover:border-red-300"
                          }`}
                        >
                          <TrendingDown className="w-4 h-4" />
                          Short
                        </button>
                      </div>
                      {errors.tradeType && (
                        <p className="text-danger-600 text-xs mt-1">{errors.tradeType.message}</p>
                      )}
                    </div>

                    {/* Entry Date */}
                    <div>
                      <label className="label">Entry Date *</label>
                      <input
                        type="date"
                        {...register("entryDate", { required: "Entry date is required" })}
                        className="input"
                      />
                      {errors.entryDate && (
                        <p className="text-danger-600 text-xs mt-1">{errors.entryDate.message}</p>
                      )}
                    </div>
                  </div>
                </section>

                {/* ── 2 · Position ── */}
                <section>
                  <div className="flex items-center gap-2 mb-3 text-[11px] font-extrabold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                    <span className="w-5 h-5 rounded-md bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      2
                    </span>
                    Position
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Entry Price *</label>
                      <input
                        type="number"
                        step="0.01"
                        data-testid="trade-form-entry-price-input"
                        {...register("entryPrice", { required: "Entry price is required" })}
                        className="input"
                        placeholder="0.00"
                      />
                      {errors.entryPrice && (
                        <p className="text-danger-600 text-xs mt-1">{errors.entryPrice.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="label">Quantity *</label>
                      <input
                        type="number"
                        data-testid="trade-form-quantity-input"
                        {...register("quantity", { required: "Quantity is required" })}
                        className="input"
                        placeholder="100"
                      />
                      {errors.quantity && (
                        <p className="text-danger-600 text-xs mt-1">{errors.quantity.message}</p>
                      )}
                    </div>
                  </div>
                </section>

                {/* ── 3 · Exit (optional) ── */}
                {watchedStatus === "closed" && (
                  <section>
                    <div className="flex items-center gap-2 mb-3 text-[11px] font-extrabold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                      <span className="w-5 h-5 rounded-md bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        3
                      </span>
                      Exit
                      <span className="font-semibold normal-case tracking-normal text-gray-300 dark:text-gray-600">
                        — optional
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                      <div>
                        <label className="label">Exit Date</label>
                        <input
                          type="date"
                          {...register("exitDate")}
                          className="input"
                          defaultValue={watchedEntryDate || ""}
                        />
                      </div>
                      <div>
                        <label className="label">Exit Price</label>
                        <select
                          value={exitPriceMode}
                          onChange={(e) => {
                            const mode = e.target.value;
                            setExitPriceMode(mode);
                            if (mode === "stopLoss" && watchedStopLoss)
                              setValue("exitPrice", parseFloat(watchedStopLoss));
                            else if (mode === "takeProfit" && watchedTakeProfit)
                              setValue("exitPrice", parseFloat(watchedTakeProfit));
                            else if (mode === "breakeven" && watchedEntryPrice)
                              setValue("exitPrice", parseFloat(watchedEntryPrice));
                          }}
                          className="input mb-2"
                        >
                          <option value="stopLoss">Stop Loss ({watchedStopLoss || "0.00"})</option>
                          <option value="takeProfit">Take Profit ({watchedTakeProfit || "0.00"})</option>
                          <option value="breakeven">Breakeven</option>
                          <option value="custom">Custom</option>
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
                      <div>
                        <label className="label">Realized P&amp;L</label>
                        <div
                          data-testid="trade-form-realized-pnl"
                          className={`h-11 rounded-xl flex items-center px-4 font-mono text-base font-bold border ${
                            exitPnlPreview == null
                              ? "bg-gray-50 dark:bg-gray-700 text-gray-400 border-gray-200 dark:border-gray-600"
                              : exitPnlPreview >= 0
                                ? "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-700"
                                : "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-700"
                          }`}
                        >
                          {exitPnlPreview == null
                            ? "—"
                            : `${exitPnlPreview >= 0 ? "+" : "−"}$${Math.abs(exitPnlPreview).toLocaleString("en-US", { maximumFractionDigits: 2 })}`}
                        </div>
                        <input type="hidden" {...register("pnl")} />
                      </div>
                    </div>
                  </section>
                )}

                {/* ── Attachments ── */}
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                      <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                      Screenshots
                      <span className="font-semibold normal-case tracking-normal text-gray-300 dark:text-gray-600">
                        {visibleImages.length} / 4
                      </span>
                    </div>
                    {settingsTemplates.length > 0 && (
                      <select
                        className="input !h-9 !py-0 text-xs max-w-[180px]"
                        value={selectedTemplateId}
                        onChange={(e) => {
                          const templateId = e.target.value;
                          setSelectedTemplateId(templateId);
                          if (templateId === "clear") setSelectedTemplateId("");
                          else if (templateId) applyTemplate(templateId);
                        }}
                        data-testid="trade-form-template-select"
                      >
                        <option value="">No template</option>
                        {selectedTemplateId && <option value="clear">✕ Clear template</option>}
                        {settingsTemplates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-2.5" data-testid="trade-form-images-panel">
                    {SLOT_LABELS.map((label, slotIndex) => {
                      const img = visibleImages.find(
                        (i) => (i.sortOrder ?? slotIndex) === slotIndex
                      );
                      const isDragOver = dragOverSlot === slotIndex;
                      return (
                        <div key={label} className="flex flex-col items-center gap-1.5">
                          <div
                            className={`w-full h-20 flex flex-col items-center justify-center border-2 border-dashed rounded-xl overflow-hidden relative cursor-pointer group transition-colors ${
                              isDragOver
                                ? "border-blue-400 ring-2 ring-blue-400"
                                : "border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500"
                            }`}
                            draggable={!!img?.previewUrl}
                            onClick={() => handleSlotClick(slotIndex, img)}
                            onDragStart={(e) => handleSlotDragStart(e, slotIndex, img)}
                            onDragOver={(e) => {
                              handleSlotDragOver(e);
                              setDragOverSlot(slotIndex);
                            }}
                            onDragLeave={() => setDragOverSlot(null)}
                            onDrop={(e) => {
                              setDragOverSlot(null);
                              handleSlotDropEvent(e, slotIndex);
                            }}
                            data-testid={`screenshot-slot-${slotIndex}`}
                          >
                            {img?.previewUrl && !brokenSlots.has(slotIndex) ? (
                              <>
                                <img
                                  src={img.previewUrl}
                                  alt={label}
                                  draggable={false}
                                  className="absolute inset-0 w-full h-full object-cover"
                                  onError={() =>
                                    setBrokenSlots((prev) => {
                                      const s = new Set(prev);
                                      s.add(slotIndex);
                                      return s;
                                    })
                                  }
                                />
                                <button
                                  type="button"
                                  onClick={(e) => handleSlotDeleteClick(e, img)}
                                  className="absolute top-1 right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                  data-testid={`screenshot-slot-delete-${slotIndex}`}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </>
                            ) : (
                              <ImageIcon className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                            )}
                          </div>
                          <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500">
                            {label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <input
                    ref={slotFileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={handleSlotFileChange}
                  />
                  <button
                    type="button"
                    onClick={() => setShowImageUploader(true)}
                    className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                    data-testid="screenshot-manage-btn"
                  >
                    Manage screenshots
                  </button>
                </section>
              </div>
            )}

            {activeTab === "advanced" && (
              <div className="space-y-6">

                {/* Account-level risk unit — available in Advanced only */}
                <div className="bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-600 rounded-lg p-4 space-y-3">
                  <div>
                    <label className="label mb-1">Risk / Reward Unit</label>
                    <div className="flex gap-2">
                      {ADVANCED_RR_MODES.map((key) => {
                        const mode = RR_MODES[key];
                        if (!mode) return null;
                        return (
                          <button key={key} type="button"
                            onClick={() => setRrMode(key)}
                            className={`px-3 py-1 text-xs rounded-full border font-medium transition-colors ${
                              rrMode === key
                                ? "bg-blue-600 text-white border-blue-600"
                                : "bg-white text-gray-500 border-gray-300 hover:border-blue-400 hover:text-blue-600 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600"
                            }`}
                          >{mode.label}</button>
                        );
                      })}
                    </div>
                  </div>

                  <select
                    {...register("riskReward")}
                    value={watch("riskReward") || ""}
                    className="input"
                    onChange={(e) => {
                      setValue("riskReward", e.target.value);
                    }}
                  >
                    <option value="">Select {RR_MODES[rrMode]?.label} amount</option>
                    {watch("riskReward") && !(rrListsByMode[rrMode] || []).includes(watch("riskReward")) && (
                      <option value={watch("riskReward")}>{watch("riskReward")}</option>
                    )}
                    {(rrListsByMode[rrMode] || []).map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {RR_MODES[rrMode]?.hint}
                  </p>
                </div>

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

          </form>

          {/* RIGHT: Risk / Reward hero */}
          <div className="w-full md:w-[360px] flex-shrink-0 bg-gradient-to-b from-slate-800 to-slate-900 dark:from-slate-900 dark:to-black p-5 flex flex-col gap-4 md:overflow-y-auto">
            {/* header row */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
                Risk / Reward
              </span>
              <div className="flex bg-white/5 border border-white/10 rounded-lg p-0.5 gap-0.5">
                <button
                  type="button"
                  onClick={() => setRrUnit("ticks")}
                  data-testid="rr-unit-ticks-btn"
                  className={`px-3 py-1 rounded-md text-[11px] font-bold transition-colors ${
                    rrUnit === "ticks" ? "bg-white/15 text-white" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Ticks
                </button>
                <button
                  type="button"
                  onClick={() => setRrUnit("points")}
                  data-testid="rr-unit-points-btn"
                  className={`px-3 py-1 rounded-md text-[11px] font-bold transition-colors ${
                    rrUnit === "points" ? "bg-white/15 text-white" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Points
                </button>
              </div>
            </div>

            {/* Big ratio */}
            <div className="flex items-baseline gap-2.5">
              <div
                className="font-mono text-5xl font-bold text-white leading-none tracking-tight"
                data-testid="rr-ratio-value"
              >
                {rrHub.rrText}
                <span className="text-2xl text-slate-500 font-semibold"> : 1</span>
              </div>
              {rrHub.rrValue != null && (
                <span
                  className={`text-[11px] font-bold px-2 py-1 rounded-md border ${
                    rrHub.verdict === "Excellent" || rrHub.verdict === "Strong"
                      ? "text-green-400 bg-green-500/10 border-green-500/25"
                      : rrHub.verdict === "Poor"
                        ? "text-red-400 bg-red-500/10 border-red-500/25"
                        : "text-amber-400 bg-amber-500/10 border-amber-500/25"
                  }`}
                >
                  {rrHub.verdict}
                </span>
              )}
            </div>

            {/* Target ratio chips */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-400">Target ratio</span>
                <span className="text-[11px] text-slate-500">auto-sets take profit</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[1, 1.5, 2, 3].map((R) => {
                  const active = rrHub.rrValue != null && Math.abs(rrHub.rrValue - R) < 0.05;
                  return (
                    <button
                      key={R}
                      type="button"
                      onClick={() => applyTargetRatio(R)}
                      data-testid={`rr-ratio-${R}-btn`}
                      className={`h-8 rounded-lg font-mono text-xs font-bold border transition-colors ${
                        active
                          ? "bg-blue-500/20 text-blue-300 border-blue-500/50"
                          : "bg-white/5 text-slate-400 border-white/10 hover:border-blue-400/40 hover:text-blue-300"
                      }`}
                    >
                      1:{R}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SL / TP inputs + ladder */}
            <div className="flex gap-4">
              <div className="flex-1 flex flex-col gap-3">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-red-400 mb-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    Stop Loss
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={watchedStopLoss || ""}
                    onChange={(e) => setValue("stopLoss", e.target.value, { shouldValidate: true })}
                    placeholder="0.00"
                    data-testid="rr-stop-loss-input"
                    className="w-full h-10 px-3 rounded-lg border border-red-500/30 bg-red-500/10 font-mono text-base font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-500/20"
                  />
                  {rrHub.hasStop && (
                    <div className="font-mono text-[11px] text-red-400 font-semibold mt-1">
                      −{rrHub.riskDisp.toLocaleString("en-US", { maximumFractionDigits: 2 })}{" "}
                      {rrHub.unitLabel}
                      {rrHub.riskUsdStr && <span> · −{rrHub.riskUsdStr}</span>}
                    </div>
                  )}
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-green-400 mb-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    Take Profit
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={watchedTakeProfit || ""}
                    onChange={(e) => setValue("takeProfit", e.target.value, { shouldValidate: true })}
                    placeholder="0.00"
                    data-testid="rr-take-profit-input"
                    className="w-full h-10 px-3 rounded-lg border border-green-500/30 bg-green-500/10 font-mono text-base font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-500/20"
                  />
                  {rrHub.hasTP && (
                    <div className="font-mono text-[11px] text-green-400 font-semibold mt-1">
                      +{rrHub.rewardDisp.toLocaleString("en-US", { maximumFractionDigits: 2 })}{" "}
                      {rrHub.unitLabel}
                      {rrHub.rewardUsdStr && <span> · +{rrHub.rewardUsdStr}</span>}
                    </div>
                  )}
                </div>
              </div>

              {/* Ladder */}
              <div className="w-24 flex-shrink-0 flex gap-2">
                <div className="w-3 h-[176px] rounded-full overflow-hidden flex flex-col bg-white/5">
                  <div
                    className="bg-gradient-to-b from-green-400 to-green-500"
                    style={{ height: `${rrHub.rewardPct}%` }}
                  />
                  <div
                    className="bg-gradient-to-b from-red-400 to-red-500"
                    style={{ height: `${rrHub.riskPct}%` }}
                  />
                </div>
                <div className="flex-1 relative h-[176px] font-mono">
                  <div className="absolute top-0 left-0 -translate-y-1">
                    <div className="text-[9px] text-green-400 font-bold tracking-wide">TARGET</div>
                    <div className="text-xs text-white font-bold">{rrHub.tp ?? "—"}</div>
                  </div>
                  <div
                    className="absolute left-0 -translate-y-1/2"
                    style={{ top: `${rrHub.rewardPct}%` }}
                  >
                    <div className="text-[9px] text-slate-500 font-bold tracking-wide">ENTRY</div>
                    <div className="text-xs text-slate-300 font-bold">{rrHub.entry ?? "—"}</div>
                  </div>
                  <div className="absolute bottom-0 left-0 translate-y-1">
                    <div className="text-[9px] text-red-400 font-bold tracking-wide">STOP</div>
                    <div className="text-xs text-white font-bold">{rrHub.stop ?? "—"}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Reward / Risk $ cards */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3">
                <div className="text-[11px] font-bold text-green-400 uppercase tracking-wide mb-1">
                  Reward
                </div>
                <div
                  className="font-mono text-xl font-bold text-white leading-none"
                  data-testid="rr-reward-value"
                >
                  {rrHub.rewardUsdStr ? `+${rrHub.rewardUsdStr}` : "—"}
                </div>
                <div className="font-mono text-[11px] text-green-300 font-semibold mt-1.5">
                  {rrHub.hasTP
                    ? `+${rrHub.rewardDisp.toLocaleString("en-US", { maximumFractionDigits: 1 })} ${rrHub.unitLabel}`
                    : ""}
                </div>
              </div>
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                <div className="text-[11px] font-bold text-red-400 uppercase tracking-wide mb-1">
                  Risk
                </div>
                <div
                  className="font-mono text-xl font-bold text-white leading-none"
                  data-testid="rr-risk-value"
                >
                  {rrHub.riskUsdStr ? `−${rrHub.riskUsdStr}` : "—"}
                </div>
                <div className="font-mono text-[11px] text-red-300 font-semibold mt-1.5">
                  {rrHub.hasStop
                    ? `−${rrHub.riskDisp.toLocaleString("en-US", { maximumFractionDigits: 1 })} ${rrHub.unitLabel}`
                    : ""}
                </div>
              </div>
            </div>

            {/* footer line */}
            <div className="mt-auto flex items-center justify-between text-[11px] text-slate-500 font-medium pt-3 border-t border-white/5">
              <span className="font-mono">
                {rrHub.qty ?? "—"} × {rrHub.inst || "—"}
              </span>
              <span className="font-mono">{rrHub.ptLabel}</span>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
          <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 font-medium">
            <Camera className="w-4 h-4" />
            <span data-testid="trade-form-photo-count">Photos {visibleImages.length}/4</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-11 px-5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-200 text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-60"
              data-testid="trade-form-cancel-btn"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="trade-entry-form"
              disabled={isSubmitting}
              className="h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-colors disabled:opacity-60"
              data-testid="trade-form-submit-btn"
            >
              {isSubmitting ? (
                "Saving..."
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {isEditing ? "Update Trade" : "Add Trade"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Image uploader modal */}
      {showImageUploader && (
        <TradeImageUploader
          images={tradeImages}
          onSave={(images) => setTradeImages(images)}
          onClose={() => setShowImageUploader(false)}
        />
      )}

      {/* Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[70] bg-black/80 flex flex-col items-center justify-center"
          onClick={() => setLightboxImage(null)}
          data-testid="screenshot-lightbox"
        >
          <button
            type="button"
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 w-9 h-9 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors"
            data-testid="screenshot-lightbox-close-btn"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={lightboxImage.previewUrl}
            alt={lightboxImage.label}
            className="max-h-[90vh] max-w-[90vw] object-contain rounded shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            data-testid="screenshot-lightbox-image"
          />
          <span className="mt-3 text-white/80 text-sm font-semibold tracking-wide">
            {lightboxImage.label}
          </span>
        </div>
      )}
    </div>
  );
};

export default TradeForm;
