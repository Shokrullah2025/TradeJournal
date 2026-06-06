import React, { useState, useEffect } from "react";
import { useTemplates } from "../hooks/useTemplates";
import { RR_MODES, getDefaultModeForInstrument, getUserRRList, saveUserRRList } from "../utils/rrModes";
import {
  Settings as SettingsIcon,
  Download,
  Upload,
  Trash2,
  Save,
  Layout,
  Plus,
  Edit3,
  Copy,
  Star,
  StarOff,
  User,
  Database,
  BarChart,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  X,
  Check,
  Shield,
  Target,
  Info,
  TrendingUp,
  Search,
  Zap,
  Paperclip,
} from "lucide-react";
import { useTrades } from "../context/TradeContext";
import { exportToExcel, importFromFile } from "../utils/exportUtils";
import toast from "react-hot-toast";

const Settings = () => {
  const { trades } = useTrades();
  const [activeTab, setActiveTab] = useState("general");

  const tabs = [
    {
      id: "general",
      name: "General",
      icon: SettingsIcon,
      description: "Basic preferences and display settings",
    },
    {
      id: "templates",
      name: "Trade Templates",
      icon: Layout,
      description: "Manage your trade entry templates",
    },
    {
      id: "data",
      name: "Data Management",
      icon: Database,
      description: "Import, export, and backup your data",
    },
  ];

  const [preferences, setPreferences] = useState({
    currency: "USD",
    timezone: "America/New_York",
    dateFormat: "MM/dd/yyyy",
    defaultRiskPercentage: 2,
    notifications: true,
    autoBackup: false,
    theme: "light",
  });

  // Template management — persisted in Supabase, not localStorage
  const {
    templates,
    loading: templatesLoading,
    saveTemplate,
    deleteTemplate: deleteTemplateFromDb,
  } = useTemplates();

  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateFormData, setTemplateFormData] = useState({
    name: "",
    description: "",
    fields: {
      instrumentType: "",
      tradeType: "",
      strategy: "",
      setup: "",
      marketCondition: "",
      riskRewardRatio: "",
      targetProfit: "",
      maxLoss: "",
    },
    visibleFields: {
      instrumentType: true,
      tradeType: true,
      strategy: true,
      setup: true,
      marketCondition: true,
      riskRewardRatio: true,
      targetProfit: false,
      maxLoss: false,
      timeframe: false,
      notes: false,
      stopLoss: false,
      entryPrice: false,
      exitPrice: false,
      position: false,
    },
    customFields: [],
  });

  // Define all available fields with their configurations
  const availableFields = {
    // Core Fields
    instrumentType: {
      label: "Instrument Type",
      hint: "Asset class — Stocks, Forex, Futures, Crypto, etc.",
      type: "select",
      category: "core",
      required: false,
    },
    tradeType: {
      label: "Trade Type",
      hint: "Long (buy) or Short (sell) direction.",
      type: "select",
      category: "core",
      required: false,
    },
    strategy: {
      label: "Strategy",
      hint: "Your trading approach, e.g. Day Trading, Swing.",
      type: "select",
      category: "core",
      required: true,
    },
    setup: {
      label: "Setup",
      hint: "Pattern or signal that triggered the trade.",
      type: "select",
      category: "core",
      required: true,
    },

    // Market Analysis
    marketCondition: {
      label: "Market Condition",
      hint: "Overall market state — Trending, Volatile, etc.",
      type: "select",
      category: "market",
      required: false,
    },
    marketDirection: {
      label: "Market Direction",
      hint: "Broad bias — Bullish, Bearish, or Sideways.",
      type: "select",
      category: "market",
      required: false,
    },
    timeframe: {
      label: "Timeframe",
      hint: "Chart timeframe used for the trade decision.",
      type: "select",
      category: "market",
      required: false,
    },

    // Risk Management
    riskRewardRatio: {
      label: "Risk/Reward Ratio",
      hint: "Target reward relative to risk, e.g. 1:2.",
      type: "text",
      category: "risk",
      required: false,
    },
    targetProfit: {
      label: "Target Profit ($)",
      hint: "Profit goal in dollars for this trade.",
      type: "number",
      category: "risk",
      required: false,
    },
    maxLoss: {
      label: "Max Loss ($)",
      hint: "Maximum dollar loss you are willing to accept.",
      type: "number",
      category: "risk",
      required: false,
    },
    stopLoss: {
      label: "Stop Loss ($)",
      hint: "Price level where the position is closed to limit loss.",
      type: "number",
      category: "risk",
      required: false,
    },

    // Trade Execution
    entryPrice: {
      label: "Entry Price",
      hint: "Default price at which the trade is entered.",
      type: "number",
      category: "execution",
      required: false,
    },
    exitPrice: {
      label: "Exit Price",
      hint: "Default price at which the trade is closed.",
      type: "number",
      category: "execution",
      required: false,
    },
    position: {
      label: "Position Size",
      hint: "Number of shares, contracts, or units.",
      type: "number",
      category: "execution",
      required: false,
    },

    // Additional
    screenshots: {
      label: "Screenshots & Attachments",
      hint: "Let traders attach chart images, screenshots or files to each trade.",
      type: "file",
      category: "additional",
      required: false,
      isNew: true,
    },
    notes: {
      label: "Notes",
      hint: "Free-text notes or trade rationale.",
      type: "textarea",
      category: "additional",
      required: false,
    },
  };

  const fieldCategories = {
    core:       { label: "Core Trading",    Icon: BarChart },
    market:     { label: "Market Analysis", Icon: TrendingUp },
    risk:       { label: "Risk Management", Icon: Shield },
    execution:  { label: "Trade Execution", Icon: Zap },
    additional: { label: "Additional Info", Icon: Paperclip },
  };

  const [showFieldCustomization, setShowFieldCustomization] = useState(false);
  const [showFieldModal, setShowFieldModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [activeTemplateTab, setActiveTemplateTab] = useState("basic");
  const [fieldSearchQuery, setFieldSearchQuery] = useState("");

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

  const getUserManagedRiskParams = () => {
    const stored = localStorage.getItem("tradeJournalRiskParams");
    return stored
      ? JSON.parse(stored)
      : [
          {
            id: 1,
            name: "Default Risk per Trade",
            value: "2",
            unit: "%",
            description: "Percentage of account to risk per trade",
          },
          {
            id: 2,
            name: "Maximum Daily Loss",
            value: "6",
            unit: "%",
            description: "Stop trading if daily loss exceeds this",
          },
        ];
  };

  // Helper: get user-managed list from localStorage with defaults
  const getStoredList = (key, defaults) => {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaults;
  };
  const saveStoredList = (key, list, setter) => {
    localStorage.setItem(key, JSON.stringify(list));
    setter(list);
  };

  // Strategy and Setup management
  const [showAddStrategyModal, setShowAddStrategyModal] = useState(false);
  const [showAddSetupModal, setShowAddSetupModal] = useState(false);
  const [newStrategyName, setNewStrategyName] = useState("");
  const [newStrategyDescription, setNewStrategyDescription] = useState("");
  const [newSetupName, setNewSetupName] = useState("");
  const [newSetupDescription, setNewSetupDescription] = useState("");
  const [userStrategies, setUserStrategies] = useState(getUserManagedStrategies());
  const [userSetups, setUserSetups] = useState(getUserManagedSetups());

  // User-managed option lists for optional dropdowns
  const [userInstrumentTypes, setUserInstrumentTypes] = useState(() =>
    getStoredList("tradeJournalInstrumentTypes", ["Stocks", "Options", "Futures", "Forex", "Crypto"])
  );
  const [userTradeTypes, setUserTradeTypes] = useState(() =>
    getStoredList("tradeJournalTradeTypes", ["Long", "Short"])
  );
  const [userMarketConditions, setUserMarketConditions] = useState(() =>
    getStoredList("tradeJournalMarketConditions", ["Trending Up", "Trending Down", "Consolidating", "Volatile", "Low Volume"])
  );
  const [userMarketDirections, setUserMarketDirections] = useState(() =>
    getStoredList("tradeJournalMarketDirections", ["Bullish", "Bearish", "Sideways", "Mixed"])
  );

  // Dropdown open state for all 5 custom selects
  const [strategyDropdownOpen, setStrategyDropdownOpen] = useState(false);
  const [setupDropdownOpen, setSetupDropdownOpen] = useState(false);
  const [instrumentTypeDropdownOpen, setInstrumentTypeDropdownOpen] = useState(false);
  const [tradeTypeDropdownOpen, setTradeTypeDropdownOpen] = useState(false);
  const [marketConditionDropdownOpen, setMarketConditionDropdownOpen] = useState(false);
  const [marketDirectionDropdownOpen, setMarketDirectionDropdownOpen] = useState(false);

  // Custom add-input state for each dropdown
  const [showCustomStrategyInput, setShowCustomStrategyInput] = useState(false);
  const [customStrategyValue, setCustomStrategyValue] = useState("");
  const [showCustomSetupInput, setShowCustomSetupInput] = useState(false);
  const [customSetupValue, setCustomSetupValue] = useState("");
  const [showCustomInstrumentTypeInput, setShowCustomInstrumentTypeInput] = useState(false);
  const [customInstrumentTypeValue, setCustomInstrumentTypeValue] = useState("");
  const [showCustomTradeTypeInput, setShowCustomTradeTypeInput] = useState(false);
  const [customTradeTypeValue, setCustomTradeTypeValue] = useState("");
  const [showCustomMarketConditionInput, setShowCustomMarketConditionInput] = useState(false);
  const [customMarketConditionValue, setCustomMarketConditionValue] = useState("");
  const [showCustomMarketDirectionInput, setShowCustomMarketDirectionInput] = useState(false);
  const [customMarketDirectionValue, setCustomMarketDirectionValue] = useState("");

  const [rrMode, setRrMode] = useState("ratio");
  const [rrDropdownOpen, setRrDropdownOpen] = useState(false);
  const [rrListsByMode, setRrListsByMode] = useState(() =>
    Object.fromEntries(Object.keys(RR_MODES).map((m) => [m, getUserRRList(m)]))
  );
  const [showCustomRRInput, setShowCustomRRInput] = useState(false);
  const [customRRValue, setCustomRRValue] = useState("");

  // Risk Management
  const [showAddRiskParamModal, setShowAddRiskParamModal] = useState(false);
  const [newRiskParamName, setNewRiskParamName] = useState("");
  const [newRiskParamValue, setNewRiskParamValue] = useState("");
  const [newRiskParamUnit, setNewRiskParamUnit] = useState("%");
  const [newRiskParamDescription, setNewRiskParamDescription] = useState("");
  const [userRiskParams, setUserRiskParams] = useState(
    getUserManagedRiskParams()
  );
  // Removed expandedCategories since we're showing all categories expanded now

  const strategies = userStrategies;
  const setups = userSetups;

  const handleExportData = async () => {
    try {
      await exportToExcel(trades, "complete-trade-data");
      toast.success("Data exported successfully!");
    } catch (error) {
      toast.error("Failed to export data");
      console.error("Export error:", error);
    }
  };

  const handleImportData = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      await importFromFile(file);
      toast.success("Data imported successfully!");
    } catch (error) {
      toast.error("Failed to import data");
      console.error("Import error:", error);
    }
  };

  const handleClearData = () => {
    if (
      window.confirm(
        "Are you sure you want to clear all trade data? This action cannot be undone."
      )
    ) {
      localStorage.removeItem("tradeJournalTrades");
      toast.success("All data cleared successfully");
      window.location.reload();
    }
  };

  const handleSavePreferences = () => {
    localStorage.setItem(
      "tradeJournalPreferences",
      JSON.stringify(preferences)
    );
    toast.success("Preferences saved successfully!");
  };

  // Template management functions
  const handleCreateNewTemplate = () => {
    setShowTemplateModal(true);
    setActiveTemplateTab("basic");
    setFieldSearchQuery("");
    setIsCreatingTemplate(true);
    setEditingTemplate(null);
    setStrategyDropdownOpen(false);
    setSetupDropdownOpen(false);
    setInstrumentTypeDropdownOpen(false);
    setTradeTypeDropdownOpen(false);
    setMarketConditionDropdownOpen(false);
    setMarketDirectionDropdownOpen(false);
    setRrMode("ratio");
    setRrDropdownOpen(false);
    setShowCustomStrategyInput(false);
    setShowCustomSetupInput(false);
    setShowCustomInstrumentTypeInput(false);
    setShowCustomTradeTypeInput(false);
    setShowCustomMarketConditionInput(false);
    setShowCustomMarketDirectionInput(false);
    setShowCustomRRInput(false);
    setCustomStrategyValue("");
    setCustomSetupValue("");
    setCustomInstrumentTypeValue("");
    setCustomTradeTypeValue("");
    setCustomMarketConditionValue("");
    setCustomMarketDirectionValue("");
    setCustomRRValue("");
    setTemplateFormData({
      name: "",
      description: "",
      fields: {
        instrumentType: "",
        tradeType: "",
        strategy: "",
        setup: "",
        marketCondition: "",
        marketDirection: "",
        riskRewardRatio: "",
        targetProfit: "",
        maxLoss: "",
      },
      visibleFields: {
        instrumentType: true,
        tradeType: true,
        strategy: true,
        setup: true,
        marketCondition: true,
        marketDirection: false,
        riskRewardRatio: true,
        targetProfit: false,
        maxLoss: false,
        timeframe: false,
        notes: false,
        stopLoss: false,
        entryPrice: false,
        exitPrice: false,
        position: false,
      },
      customFields: [],
    });
    setShowFieldCustomization(false);
  };

  // Field visibility management
  const toggleFieldVisibility = (fieldKey) => {
    setTemplateFormData((prev) => ({
      ...prev,
      visibleFields: {
        ...prev.visibleFields,
        [fieldKey]: !prev.visibleFields[fieldKey],
      },
    }));
  };

  // Removed toggleCategoryExpansion since we're showing all categories expanded

  const addCustomField = () => {
    const fieldName = prompt("Enter custom field name:");
    if (fieldName && fieldName.trim()) {
      const fieldKey = fieldName.toLowerCase().replace(/\s+/g, "_");
      setTemplateFormData((prev) => ({
        ...prev,
        customFields: [
          ...prev.customFields,
          {
            key: fieldKey,
            label: fieldName.trim(),
            type: "text",
            value: "",
          },
        ],
        visibleFields: {
          ...prev.visibleFields,
          [fieldKey]: true,
        },
      }));
    }
  };

  const removeCustomField = (fieldKey) => {
    setTemplateFormData((prev) => ({
      ...prev,
      customFields: prev.customFields.filter((field) => field.key !== fieldKey),
      visibleFields: Object.fromEntries(
        Object.entries(prev.visibleFields).filter(([key]) => key !== fieldKey)
      ),
    }));
  };

  // Auto-switch R:R mode when instrument type changes
  useEffect(() => {
    if (showTemplateModal && templateFormData.fields.instrumentType) {
      setRrMode(getDefaultModeForInstrument(templateFormData.fields.instrumentType));
    }
  }, [templateFormData.fields.instrumentType, showTemplateModal]);

  const getVisibleFieldsCount = () => {
    return (
      Object.values(templateFormData.visibleFields).filter(Boolean).length +
      templateFormData.customFields.length
    );
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setShowTemplateModal(true);
    setActiveTemplateTab("basic");
    setFieldSearchQuery("");
    setStrategyDropdownOpen(false);
    setSetupDropdownOpen(false);
    setInstrumentTypeDropdownOpen(false);
    setTradeTypeDropdownOpen(false);
    setMarketConditionDropdownOpen(false);
    setMarketDirectionDropdownOpen(false);
    setRrMode("ratio");
    setRrDropdownOpen(false);
    setShowCustomStrategyInput(false);
    setShowCustomSetupInput(false);
    setShowCustomInstrumentTypeInput(false);
    setShowCustomTradeTypeInput(false);
    setShowCustomMarketConditionInput(false);
    setShowCustomMarketDirectionInput(false);
    setShowCustomRRInput(false);
    setCustomStrategyValue("");
    setCustomSetupValue("");
    setCustomInstrumentTypeValue("");
    setCustomTradeTypeValue("");
    setCustomMarketConditionValue("");
    setCustomMarketDirectionValue("");
    setCustomRRValue("");
    setTemplateFormData({
      name: template.name,
      description: template.description,
      fields: { ...template.fields },
      visibleFields: template.visibleFields || {
        instrumentType: true,
        tradeType: true,
        strategy: true,
        setup: true,
        marketCondition: true,
        marketDirection: false,
        riskRewardRatio: true,
        targetProfit: false,
        maxLoss: false,
        timeframe: false,
        notes: false,
        stopLoss: false,
        entryPrice: false,
        exitPrice: false,
        position: false,
      },
      customFields: template.customFields || [],
    });
    setShowFieldCustomization(false);
  };

  const handleSaveTemplate = async () => {
    if (!templateFormData.name.trim()) {
      toast.error("Template name is required");
      return;
    }
    try {
      if (editingTemplate) {
        await saveTemplate({ ...templateFormData, id: editingTemplate.id });
        toast.success("Template updated successfully");
      } else {
        await saveTemplate({ ...templateFormData, isDefault: false });
        toast.success("Template created successfully");
      }
      setIsCreatingTemplate(false);
      setShowTemplateModal(false);
      setEditingTemplate(null);
    } catch (err) {
      toast.error("Failed to save template. Please try again.");
      console.error(err);
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (window.confirm("Are you sure you want to delete this template?")) {
      try {
        await deleteTemplateFromDb(templateId);
        toast.success("Template deleted successfully");
      } catch (err) {
        toast.error("Failed to delete template. Please try again.");
        console.error(err);
      }
    }
  };

  const handleDuplicateTemplate = async (template) => {
    try {
      await saveTemplate({
        ...template,
        id: undefined,
        name: `${template.name} (Copy)`,
        isDefault: false,
      });
      toast.success("Template duplicated successfully");
    } catch (err) {
      toast.error("Failed to duplicate template. Please try again.");
      console.error(err);
    }
  };

  const toggleTemplateDefault = async (templateId) => {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;
    try {
      await saveTemplate({ ...template, isDefault: !template.isDefault });
    } catch (err) {
      toast.error("Failed to update template.");
      console.error(err);
    }
  };

  const handleTemplateFieldChange = (fieldName, value) => {
    setTemplateFormData((prev) => ({
      ...prev,
      fields: {
        ...prev.fields,
        [fieldName]: value,
      },
    }));
  };

  // Strategy Management Functions
  const handleAddStrategy = () => {
    if (!newStrategyName.trim()) {
      toast.error("Please enter a strategy name");
      return;
    }

    const updatedStrategies = [...userStrategies, newStrategyName.trim()];
    setUserStrategies(updatedStrategies);
    localStorage.setItem(
      "tradeJournalStrategies",
      JSON.stringify(updatedStrategies)
    );

    setNewStrategyName("");
    setNewStrategyDescription("");
    setShowAddStrategyModal(false);
    toast.success("Strategy added successfully!");
  };

  const handleDeleteStrategy = (strategyToDelete) => {
    if (
      window.confirm(
        `Are you sure you want to delete the strategy "${strategyToDelete}"?`
      )
    ) {
      const updatedStrategies = userStrategies.filter(
        (strategy) => strategy !== strategyToDelete
      );
      setUserStrategies(updatedStrategies);
      localStorage.setItem(
        "tradeJournalStrategies",
        JSON.stringify(updatedStrategies)
      );
      toast.success("Strategy deleted successfully!");
    }
  };

  // Setup Management Functions
  const handleAddSetup = () => {
    if (!newSetupName.trim()) {
      toast.error("Please enter a setup name");
      return;
    }

    const updatedSetups = [...userSetups, newSetupName.trim()];
    setUserSetups(updatedSetups);
    localStorage.setItem("tradeJournalSetups", JSON.stringify(updatedSetups));

    setNewSetupName("");
    setNewSetupDescription("");
    setShowAddSetupModal(false);
    toast.success("Setup added successfully!");
  };

  const handleDeleteSetup = (setupToDelete) => {
    if (
      window.confirm(
        `Are you sure you want to delete the setup "${setupToDelete}"?`
      )
    ) {
      const updatedSetups = userSetups.filter(
        (setup) => setup !== setupToDelete
      );
      setUserSetups(updatedSetups);
      localStorage.setItem("tradeJournalSetups", JSON.stringify(updatedSetups));
      toast.success("Setup deleted successfully!");
    }
  };

  const handleAddCustomStrategy = () => {
    const val = customStrategyValue.trim();
    if (!val) return;
    if (!userStrategies.includes(val)) {
      const updated = [...userStrategies, val];
      setUserStrategies(updated);
      localStorage.setItem("tradeJournalStrategies", JSON.stringify(updated));
    }
    handleTemplateFieldChange("strategy", val);
    setCustomStrategyValue("");
    setShowCustomStrategyInput(false);
    setStrategyDropdownOpen(false);
    toast.success("Strategy added");
  };

  const handleAddCustomSetup = () => {
    const val = customSetupValue.trim();
    if (!val) return;
    if (!userSetups.includes(val)) {
      const updated = [...userSetups, val];
      setUserSetups(updated);
      localStorage.setItem("tradeJournalSetups", JSON.stringify(updated));
    }
    handleTemplateFieldChange("setup", val);
    setCustomSetupValue("");
    setShowCustomSetupInput(false);
    setSetupDropdownOpen(false);
    toast.success("Setup added");
  };

  const handleAddCustomInstrumentType = () => {
    const val = customInstrumentTypeValue.trim();
    if (!val) return;
    if (!userInstrumentTypes.includes(val)) {
      saveStoredList("tradeJournalInstrumentTypes", [...userInstrumentTypes, val], setUserInstrumentTypes);
    }
    handleTemplateFieldChange("instrumentType", val);
    setCustomInstrumentTypeValue("");
    setShowCustomInstrumentTypeInput(false);
    setInstrumentTypeDropdownOpen(false);
    toast.success("Instrument type added");
  };

  const handleDeleteInstrumentType = (item) => {
    if (window.confirm(`Delete "${item}"?`)) {
      saveStoredList("tradeJournalInstrumentTypes", userInstrumentTypes.filter((x) => x !== item), setUserInstrumentTypes);
      if (templateFormData.fields.instrumentType === item) handleTemplateFieldChange("instrumentType", "");
    }
  };

  const handleAddCustomTradeType = () => {
    const val = customTradeTypeValue.trim();
    if (!val) return;
    if (!userTradeTypes.includes(val)) {
      saveStoredList("tradeJournalTradeTypes", [...userTradeTypes, val], setUserTradeTypes);
    }
    handleTemplateFieldChange("tradeType", val);
    setCustomTradeTypeValue("");
    setShowCustomTradeTypeInput(false);
    setTradeTypeDropdownOpen(false);
    toast.success("Trade type added");
  };

  const handleDeleteTradeType = (item) => {
    if (window.confirm(`Delete "${item}"?`)) {
      saveStoredList("tradeJournalTradeTypes", userTradeTypes.filter((x) => x !== item), setUserTradeTypes);
      if (templateFormData.fields.tradeType === item) handleTemplateFieldChange("tradeType", "");
    }
  };

  const handleAddCustomMarketCondition = () => {
    const val = customMarketConditionValue.trim();
    if (!val) return;
    if (!userMarketConditions.includes(val)) {
      saveStoredList("tradeJournalMarketConditions", [...userMarketConditions, val], setUserMarketConditions);
    }
    handleTemplateFieldChange("marketCondition", val);
    setCustomMarketConditionValue("");
    setShowCustomMarketConditionInput(false);
    setMarketConditionDropdownOpen(false);
    toast.success("Market condition added");
  };

  const handleDeleteMarketCondition = (item) => {
    if (window.confirm(`Delete "${item}"?`)) {
      saveStoredList("tradeJournalMarketConditions", userMarketConditions.filter((x) => x !== item), setUserMarketConditions);
      if (templateFormData.fields.marketCondition === item) handleTemplateFieldChange("marketCondition", "");
    }
  };

  const handleAddCustomMarketDirection = () => {
    const val = customMarketDirectionValue.trim();
    if (!val) return;
    if (!userMarketDirections.includes(val)) {
      saveStoredList("tradeJournalMarketDirections", [...userMarketDirections, val], setUserMarketDirections);
    }
    handleTemplateFieldChange("marketDirection", val);
    setCustomMarketDirectionValue("");
    setShowCustomMarketDirectionInput(false);
    setMarketDirectionDropdownOpen(false);
    toast.success("Market direction added");
  };

  const handleDeleteMarketDirection = (item) => {
    if (window.confirm(`Delete "${item}"?`)) {
      saveStoredList("tradeJournalMarketDirections", userMarketDirections.filter((x) => x !== item), setUserMarketDirections);
      if (templateFormData.fields.marketDirection === item) handleTemplateFieldChange("marketDirection", "");
    }
  };

  const handleAddCustomRR = () => {
    const val = customRRValue.trim();
    if (!val) return;
    const current = rrListsByMode[rrMode] || [];
    if (!current.includes(val)) {
      const updated = [...current, val];
      saveUserRRList(rrMode, updated);
      setRrListsByMode((prev) => ({ ...prev, [rrMode]: updated }));
    }
    handleTemplateFieldChange("riskRewardRatio", val);
    setCustomRRValue("");
    setShowCustomRRInput(false);
    setRrDropdownOpen(false);
    toast.success("Ratio added");
  };

  const handleDeleteRRRatio = (item) => {
    if (window.confirm(`Delete "${item}"?`)) {
      const updated = (rrListsByMode[rrMode] || []).filter((x) => x !== item);
      saveUserRRList(rrMode, updated);
      setRrListsByMode((prev) => ({ ...prev, [rrMode]: updated }));
      if (templateFormData.fields.riskRewardRatio === item) handleTemplateFieldChange("riskRewardRatio", "");
    }
  };

  // Keyboard shortcuts for modals
  const handleStrategyModalKeyDown = (e) => {
    if (e.key === "Enter" && newStrategyName.trim()) {
      handleAddStrategy();
    } else if (e.key === "Escape") {
      setShowAddStrategyModal(false);
    }
  };

  const handleSetupModalKeyDown = (e) => {
    if (e.key === "Enter" && newSetupName.trim()) {
      handleAddSetup();
    } else if (e.key === "Escape") {
      setShowAddSetupModal(false);
    }
  };

  // Risk Parameter Management Functions
  const handleAddRiskParam = () => {
    if (!newRiskParamName.trim() || !newRiskParamValue.trim()) {
      toast.error("Please enter both name and value");
      return;
    }

    const newParam = {
      id: Date.now(),
      name: newRiskParamName.trim(),
      value: newRiskParamValue.trim(),
      unit: newRiskParamUnit,
      description: newRiskParamDescription.trim(),
    };

    const updatedParams = [...userRiskParams, newParam];
    setUserRiskParams(updatedParams);
    localStorage.setItem(
      "tradeJournalRiskParams",
      JSON.stringify(updatedParams)
    );

    setNewRiskParamName("");
    setNewRiskParamValue("");
    setNewRiskParamUnit("%");
    setNewRiskParamDescription("");
    setShowAddRiskParamModal(false);
    toast.success("Risk parameter added successfully!");
  };

  const handleDeleteRiskParam = (paramId) => {
    if (
      window.confirm("Are you sure you want to delete this risk parameter?")
    ) {
      const updatedParams = userRiskParams.filter(
        (param) => param.id !== paramId
      );
      setUserRiskParams(updatedParams);
      localStorage.setItem(
        "tradeJournalRiskParams",
        JSON.stringify(updatedParams)
      );
      toast.success("Risk parameter deleted successfully!");
    }
  };

  const handleUpdateRiskParam = (paramId, field, value) => {
    const updatedParams = userRiskParams.map((param) =>
      param.id === paramId ? { ...param, [field]: value } : param
    );
    setUserRiskParams(updatedParams);
    localStorage.setItem(
      "tradeJournalRiskParams",
      JSON.stringify(updatedParams)
    );
  };

  const handleRiskParamModalKeyDown = (e) => {
    if (
      e.key === "Enter" &&
      newRiskParamName.trim() &&
      newRiskParamValue.trim()
    ) {
      handleAddRiskParam();
    } else if (e.key === "Escape") {
      setShowAddRiskParamModal(false);
    }
  };

  return (
    <div className="flex h-full">
      {/* Vertical Tab Navigation */}
      <div className="w-80 bg-white border-r border-gray-200 p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">
            Manage your preferences, templates, and data
          </p>
        </div>

        <nav className="space-y-2" aria-label="Settings Navigation">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left p-4 rounded-lg transition-all duration-200 group ${
                  activeTab === tab.id
                    ? "bg-blue-50 border-l-4 border-blue-600 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon
                    className={`h-5 w-5 ${
                      activeTab === tab.id
                        ? "text-blue-600"
                        : "text-gray-400 group-hover:text-gray-600"
                    }`}
                  />
                  <div className="flex-1">
                    <div
                      className={`font-medium ${
                        activeTab === tab.id ? "text-blue-700" : "text-gray-900"
                      }`}
                    >
                      {tab.name}
                    </div>
                    <div
                      className={`text-sm mt-1 ${
                        activeTab === tab.id ? "text-blue-600" : "text-gray-500"
                      }`}
                    >
                      {tab.description}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="flex-1 p-6 overflow-y-auto bg-gray-50">
        {/*tab content area*/}
        <div className="mt-6">
          {/* General Tab */}
          {activeTab === "general" && (
            <div className="max-w-3xl space-y-6">
              {/* Trading Preferences */}
              <div className="card">
                <div className="flex items-center space-x-3 mb-6">
                  <User className="w-5 h-5 text-primary-600" />
                  <h2 className="text-xl font-semibold text-gray-900">
                    Trading Preferences
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="label">Default Currency</label>
                    <select
                      value={preferences.currency}
                      onChange={(e) =>
                        setPreferences({
                          ...preferences,
                          currency: e.target.value,
                        })
                      }
                      className="input"
                    >
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="GBP">GBP - British Pound</option>
                      <option value="JPY">JPY - Japanese Yen</option>
                      <option value="CAD">CAD - Canadian Dollar</option>
                      <option value="AUD">AUD - Australian Dollar</option>
                    </select>
                  </div>

                  <div>
                    <label className="label">Timezone</label>
                    <select
                      value={preferences.timezone}
                      onChange={(e) =>
                        setPreferences({
                          ...preferences,
                          timezone: e.target.value,
                        })
                      }
                      className="input"
                    >
                      <option value="America/New_York">
                        Eastern Time (ET)
                      </option>
                      <option value="America/Chicago">Central Time (CT)</option>
                      <option value="America/Denver">Mountain Time (MT)</option>
                      <option value="America/Los_Angeles">
                        Pacific Time (PT)
                      </option>
                      <option value="Europe/London">London (GMT)</option>
                      <option value="Europe/Berlin">Berlin (CET)</option>
                      <option value="Asia/Tokyo">Tokyo (JST)</option>
                      <option value="Asia/Singapore">Singapore (SGT)</option>
                    </select>
                  </div>

                  <div>
                    <label className="label">Date Format</label>
                    <select
                      value={preferences.dateFormat}
                      onChange={(e) =>
                        setPreferences({
                          ...preferences,
                          dateFormat: e.target.value,
                        })
                      }
                      className="input"
                    >
                      <option value="MM/dd/yyyy">MM/DD/YYYY (US)</option>
                      <option value="dd/MM/yyyy">DD/MM/YYYY (EU)</option>
                      <option value="yyyy-MM-dd">YYYY-MM-DD (ISO)</option>
                    </select>
                  </div>

                  <div>
                    <label className="label">Default Risk Percentage (%)</label>
                    <input
                      type="number"
                      min="0.1"
                      max="10"
                      step="0.1"
                      value={preferences.defaultRiskPercentage}
                      onChange={(e) =>
                        setPreferences({
                          ...preferences,
                          defaultRiskPercentage: parseFloat(e.target.value),
                        })
                      }
                      className="input"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Default risk percentage for position sizing calculations
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="label mb-0">Enable Notifications</label>
                      <p className="text-sm text-gray-500">
                        Get alerts for important trade events
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.notifications}
                        onChange={(e) =>
                          setPreferences({
                            ...preferences,
                            notifications: e.target.checked,
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="label mb-0">Auto Backup</label>
                      <p className="text-sm text-gray-500">
                        Automatically backup your data weekly
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.autoBackup}
                        onChange={(e) =>
                          setPreferences({
                            ...preferences,
                            autoBackup: e.target.checked,
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    onClick={handleSavePreferences}
                    className="btn btn-primary flex items-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Preferences</span>
                  </button>
                </div>
              </div>

              {/* Account Statistics */}
              <div className="card">
                <div className="flex items-center space-x-3 mb-6">
                  <BarChart className="w-5 h-5 text-primary-600" />
                  <h2 className="text-xl font-semibold text-gray-900">
                    Account Statistics
                  </h2>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">
                      {trades.length}
                    </div>
                    <div className="text-sm text-gray-600">Total Trades</div>
                  </div>

                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">
                      {trades.filter((t) => t.status === "closed").length}
                    </div>
                    <div className="text-sm text-gray-600">
                      Completed Trades
                    </div>
                  </div>

                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">
                      {new Set(trades.map((t) => t.instrument)).size}
                    </div>
                    <div className="text-sm text-gray-600">
                      Instruments Traded
                    </div>
                  </div>

                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">
                      {new Set(trades.map((t) => t.strategy)).size}
                    </div>
                    <div className="text-sm text-gray-600">Strategies Used</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Templates Tab */}
          {activeTab === "templates" && (
            <div className="max-w-6xl">
              {" "}
              {/* Made larger */}
              <div className="card">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <Layout className="w-5 h-5 text-primary-600" />
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">
                        Trade Templates
                      </h2>
                      <p className="text-sm text-gray-600">
                        Create reusable templates to speed up trade entry
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleCreateNewTemplate}
                    className="btn btn-primary flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>New Template</span>
                  </button>
                </div>

                {/* Templates List */}
                <div className="space-y-3">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium text-gray-900">
                              {template.name}
                            </h3>
                            {template.isDefault && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                <Star className="w-3 h-3 mr-1" />
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {template.description}
                          </p>

                          {/* Template Preview */}
                          <div className="mt-2 flex flex-wrap gap-2">
                            {Object.entries(template.fields)
                              .slice(0, 4)
                              .map(([key, value]) => {
                                if (!value) return null;
                                return (
                                  <span
                                    key={key}
                                    className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800"
                                  >
                                    {value}
                                  </span>
                                );
                              })}
                          </div>

                          <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                            <span>Used {template.usageCount} times</span>
                            <span>Created {template.createdAt}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => toggleTemplateDefault(template.id)}
                            className="text-gray-400 hover:text-yellow-500"
                            title="Toggle default"
                          >
                            {template.isDefault ? (
                              <Star className="w-4 h-4 fill-current" />
                            ) : (
                              <StarOff className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleEditTemplate(template)}
                            className="text-gray-400 hover:text-blue-600"
                            title="Edit template"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDuplicateTemplate(template)}
                            className="text-gray-400 hover:text-green-600"
                            title="Duplicate template"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="text-gray-400 hover:text-red-600"
                            title="Delete template"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {templates.length === 0 && !isCreatingTemplate && !templatesLoading && (
                    <div className="text-center py-12">
                      <Layout className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">
                        No templates yet
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Get started by creating your first trade template.
                      </p>
                      <div className="mt-4">
                        <button
                          onClick={handleCreateNewTemplate}
                          className="btn btn-primary flex items-center space-x-2"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Create Template</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Data Management Tab */}
          {activeTab === "data" && (
            <div className="max-w-2xl">
              <div className="card">
                <div className="flex items-center space-x-3 mb-6">
                  <Database className="w-5 h-5 text-primary-600" />
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      Data Management
                    </h2>
                    <p className="text-sm text-gray-600">
                      Import, export, and manage your trading data
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">
                      Export Data
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Download your complete trading data as an Excel file for
                      backup or analysis in other tools.
                    </p>
                    <button
                      onClick={handleExportData}
                      disabled={trades.length === 0}
                      className="btn btn-secondary flex items-center space-x-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>Export to Excel</span>
                    </button>
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">
                      Import Data
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Import trade data from a CSV or Excel file. Make sure your
                      file includes the required columns.
                    </p>
                    <label className="btn btn-secondary flex items-center space-x-2 cursor-pointer">
                      <Upload className="w-4 h-4" />
                      <span>Import from File</span>
                      <input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleImportData}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div className="pt-6 border-t border-gray-200">
                    <h3 className="font-medium text-red-600 mb-2">
                      Danger Zone
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Permanently delete all your trading data. This action
                      cannot be undone.
                    </p>
                    <button
                      onClick={handleClearData}
                      className="btn btn-danger flex items-center space-x-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Clear All Data</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Strategy and Setup Tab */}
          {activeTab === "strategy-setup" && (
            <div className="max-w-3xl space-y-6">
              <div className="card">
                <div className="flex items-center space-x-3 mb-6">
                  <Target className="w-5 h-5 text-primary-600" />
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      Strategy and Setup
                    </h2>
                    <p className="text-sm text-gray-600">
                      Define your trading strategies and common setups
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Trading Strategies */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium text-gray-900">
                        Trading Strategies
                      </h3>
                      <span className="text-sm text-gray-500">
                        {userStrategies.length} strategies
                      </span>
                    </div>

                    <div className="space-y-3">
                      {userStrategies.map((strategy, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span className="font-medium text-gray-900">
                              {strategy}
                            </span>
                          </div>
                          <button
                            onClick={() => handleDeleteStrategy(strategy)}
                            className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                            title="Delete strategy"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}

                      {userStrategies.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <Target className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                          <p>No strategies added yet</p>
                          <p className="text-sm">
                            Add your first trading strategy below
                          </p>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setShowAddStrategyModal(true)}
                      className="mt-4 btn btn-secondary flex items-center space-x-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add New Strategy</span>
                    </button>
                  </div>

                  {/* Common Setups */}
                  <div className="border-t border-gray-200 pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium text-gray-900">
                        Trading Setups
                      </h3>
                      <span className="text-sm text-gray-500">
                        {userSetups.length} setups
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {userSetups.map((setup, index) => (
                        <div
                          key={index}
                          className="p-3 border border-gray-200 rounded-lg bg-white"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-gray-900">
                              {setup}
                            </span>
                            <button
                              onClick={() => handleDeleteSetup(setup)}
                              className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                              title="Delete setup"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {userSetups.length === 0 && (
                        <div className="col-span-full text-center py-8 text-gray-500">
                          <Target className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                          <p>No setups added yet</p>
                          <p className="text-sm">
                            Add your first trading setup below
                          </p>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setShowAddSetupModal(true)}
                      className="mt-4 btn btn-secondary flex items-center space-x-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add New Setup</span>
                    </button>
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="font-medium text-gray-900 mb-4">
                      Default Settings
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Default Stop Loss (%)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0.5"
                          max="10"
                          className="input"
                          placeholder="2.0"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Default Take Profit Ratio
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="1"
                          max="5"
                          className="input"
                          placeholder="2.0"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-6 border-t border-gray-200">
                    <button className="btn btn-primary">
                      Save Strategy Settings
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Risk Management Profile Tab */}
          {activeTab === "risk-management" && (
            <div className="max-w-3xl space-y-6">
              <div className="card">
                <div className="flex items-center space-x-3 mb-6">
                  <Shield className="w-5 h-5 text-primary-600" />
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      Risk Management Profile
                    </h2>
                    <p className="text-sm text-gray-600">
                      Configure your risk parameters and position sizing rules
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Risk Parameters */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium text-gray-900">
                        Risk Parameters
                      </h3>
                      <span className="text-sm text-gray-500">
                        {userRiskParams.length} parameters
                      </span>
                    </div>

                    <div className="space-y-3">
                      {userRiskParams.map((param) => (
                        <div
                          key={param.id}
                          className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-white"
                        >
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <span className="font-medium text-gray-900">
                                {param.name}
                              </span>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="number"
                                  value={param.value}
                                  onChange={(e) =>
                                    handleUpdateRiskParam(
                                      param.id,
                                      "value",
                                      e.target.value
                                    )
                                  }
                                  className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  step="0.1"
                                />
                                <select
                                  value={param.unit}
                                  onChange={(e) =>
                                    handleUpdateRiskParam(
                                      param.id,
                                      "unit",
                                      e.target.value
                                    )
                                  }
                                  className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="%">%</option>
                                  <option value="$">$</option>
                                  <option value="shares">shares</option>
                                  <option value="ratio">ratio</option>
                                </select>
                              </div>
                            </div>
                            <p className="text-sm text-gray-600">
                              {param.description}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDeleteRiskParam(param.id)}
                            className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors ml-4"
                            title="Delete parameter"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}

                      {userRiskParams.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <Shield className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                          <p>No risk parameters configured</p>
                          <p className="text-sm">
                            Add your first risk parameter below
                          </p>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setShowAddRiskParamModal(true)}
                      className="mt-4 btn btn-secondary flex items-center space-x-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Risk Parameter</span>
                    </button>
                  </div>

                  {/* Quick Risk Presets */}
                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="font-medium text-gray-900 mb-4">
                      Quick Presets
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <button
                        onClick={() => {
                          const conservativeParams = [
                            {
                              id: Date.now() + 1,
                              name: "Risk per Trade",
                              value: "1",
                              unit: "%",
                              description: "Conservative risk per trade",
                            },
                            {
                              id: Date.now() + 2,
                              name: "Daily Loss Limit",
                              value: "3",
                              unit: "%",
                              description: "Stop trading limit",
                            },
                          ];
                          setUserRiskParams(conservativeParams);
                          localStorage.setItem(
                            "tradeJournalRiskParams",
                            JSON.stringify(conservativeParams)
                          );
                          toast.success("Conservative preset applied!");
                        }}
                        className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className="font-medium text-gray-900 mb-1">
                          Conservative
                        </div>
                        <div className="text-sm text-gray-600">
                          1% risk, 3% daily limit
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          const moderateParams = [
                            {
                              id: Date.now() + 1,
                              name: "Risk per Trade",
                              value: "2",
                              unit: "%",
                              description: "Moderate risk per trade",
                            },
                            {
                              id: Date.now() + 2,
                              name: "Daily Loss Limit",
                              value: "6",
                              unit: "%",
                              description: "Stop trading limit",
                            },
                          ];
                          setUserRiskParams(moderateParams);
                          localStorage.setItem(
                            "tradeJournalRiskParams",
                            JSON.stringify(moderateParams)
                          );
                          toast.success("Moderate preset applied!");
                        }}
                        className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className="font-medium text-gray-900 mb-1">
                          Moderate
                        </div>
                        <div className="text-sm text-gray-600">
                          2% risk, 6% daily limit
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          const aggressiveParams = [
                            {
                              id: Date.now() + 1,
                              name: "Risk per Trade",
                              value: "3",
                              unit: "%",
                              description: "Aggressive risk per trade",
                            },
                            {
                              id: Date.now() + 2,
                              name: "Daily Loss Limit",
                              value: "10",
                              unit: "%",
                              description: "Stop trading limit",
                            },
                          ];
                          setUserRiskParams(aggressiveParams);
                          localStorage.setItem(
                            "tradeJournalRiskParams",
                            JSON.stringify(aggressiveParams)
                          );
                          toast.success("Aggressive preset applied!");
                        }}
                        className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className="font-medium text-gray-900 mb-1">
                          Aggressive
                        </div>
                        <div className="text-sm text-gray-600">
                          3% risk, 10% daily limit
                        </div>
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end pt-6 border-t border-gray-200">
                    <button
                      onClick={() =>
                        toast.success("Risk profile saved successfully!")
                      }
                      className="btn btn-primary"
                    >
                      Save Risk Profile
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Field Configuration Modal */}
      {showFieldModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Field Configuration
                </h3>
                <button
                  onClick={() => setShowFieldModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <p className="text-gray-600 mt-2">
                Select which fields to display in trade entry and organize them
                by category
              </p>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {/* Quick Actions */}
              <div className="flex items-center space-x-4 mb-6">
                <button
                  onClick={() => {
                    const allFields = Object.keys(availableFields);
                    setTemplateFormData((prev) => ({
                      ...prev,
                      visibleFields: allFields.reduce(
                        (acc, field) => ({
                          ...acc,
                          [field]: true,
                        }),
                        {}
                      ),
                    }));
                  }}
                  className="text-sm bg-blue-50 text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  Select All Fields
                </button>
                <button
                  onClick={() => {
                    setTemplateFormData((prev) => ({
                      ...prev,
                      visibleFields: {
                        strategy: true,
                        setup: true,
                        instrumentType: true,
                        tradeType: true,
                      },
                    }));
                  }}
                  className="text-sm bg-gray-50 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Reset to Essentials
                </button>
                <div className="text-sm text-gray-600 bg-gray-100 px-3 py-2 rounded-lg">
                  <span className="font-medium">{getVisibleFieldsCount()}</span>{" "}
                  fields selected
                </div>
              </div>

              {/* Field Categories Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {Object.entries(fieldCategories).map(
                  ([categoryKey, category]) => (
                    <div
                      key={categoryKey}
                      className="bg-white border border-gray-200 rounded-lg overflow-hidden"
                    >
                      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">{category.icon}</span>
                            <span className="font-medium text-gray-900">
                              {category.label}
                            </span>
                          </div>
                          <span className="text-sm text-gray-500 bg-gray-200 px-2 py-1 rounded">
                            {
                              Object.entries(availableFields).filter(
                                ([key, field]) =>
                                  field.category === categoryKey &&
                                  templateFormData.visibleFields[key]
                              ).length
                            }{" "}
                            selected
                          </span>
                        </div>
                      </div>

                      <div className="p-4 space-y-3 max-h-48 overflow-y-auto">
                        {Object.entries(availableFields)
                          .filter(
                            ([key, field]) => field.category === categoryKey
                          )
                          .map(([fieldKey, field]) => (
                            <div
                              key={fieldKey}
                              className="flex items-center justify-between"
                            >
                              <label className="flex items-center space-x-3 cursor-pointer flex-1">
                                <input
                                  type="checkbox"
                                  checked={
                                    templateFormData.visibleFields[fieldKey] ||
                                    false
                                  }
                                  onChange={() =>
                                    toggleFieldVisibility(fieldKey)
                                  }
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                                />
                                <div className="flex-1">
                                  <span className="text-sm text-gray-700 font-medium">
                                    {field.label}
                                  </span>
                                  {field.required && (
                                    <span className="text-xs text-red-500 font-medium ml-2">
                                      Required
                                    </span>
                                  )}
                                </div>
                              </label>
                              {templateFormData.visibleFields[fieldKey] && (
                                <Check className="w-4 h-4 text-green-600 ml-2" />
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  )
                )}
              </div>

              {/* Custom Fields Section */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-blue-50 px-4 py-3 border-b border-blue-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">⚙️</span>
                      <span className="font-medium text-gray-900">
                        Custom Fields
                      </span>
                    </div>
                    <button
                      onClick={addCustomField}
                      className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
                    >
                      + Add Field
                    </button>
                  </div>
                </div>

                {templateFormData.customFields.length > 0 ? (
                  <div className="p-4 space-y-3">
                    {templateFormData.customFields.map((field) => (
                      <div
                        key={field.key}
                        className="flex items-center justify-between bg-green-50 p-3 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <Check className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-gray-700 font-medium">
                            {field.label}
                          </span>
                          <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                            {field.type}
                          </span>
                        </div>
                        <button
                          onClick={() => removeCustomField(field.key)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-100 p-1 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-gray-500">
                    <p className="text-sm">No custom fields added yet</p>
                    <p className="text-xs mt-1">
                      Click "Add Field" to create custom fields for your
                      specific needs
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">{getVisibleFieldsCount()}</span>{" "}
                  fields selected for this template
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setShowFieldModal(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Template Creation Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {editingTemplate ? "Edit Template" : "Create New Template"}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Customize which fields appear during trade entry and set
                    default values
                  </p>
                </div>
                <button
                  onClick={() => setShowTemplateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
              <nav className="flex" aria-label="Template Tabs">
                <button
                  onClick={() => setActiveTemplateTab("basic")}
                  className={`px-6 py-3 text-sm font-medium ${
                    activeTemplateTab === "basic"
                      ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Basic Info
                </button>
                <button
                  onClick={() => setActiveTemplateTab("fields")}
                  className={`px-6 py-3 text-sm font-medium ${
                    activeTemplateTab === "fields"
                      ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Configure Fields
                </button>
              </nav>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {/* Basic Info Tab */}
              {activeTemplateTab === "basic" && (
                <div className="space-y-6">
                  {/* Template Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Template Name *
                    </label>
                    <input
                      type="text"
                      value={templateFormData.name}
                      onChange={(e) =>
                        setTemplateFormData((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter template name"
                    />
                    <div className="text-right text-sm text-gray-500 mt-1">
                      {getVisibleFieldsCount()} fields will be displayed
                    </div>
                  </div>

                  {/* Default Field Values */}
                  <div>
                    <div className="flex items-center space-x-1.5 mb-4">
                      <h4 className="text-sm font-medium text-gray-900">
                        Default Values
                      </h4>
                      <div className="relative group">
                        <Info className="w-3.5 h-3.5 text-gray-400 cursor-pointer" />
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover:block w-56 px-3 py-2 bg-gray-800 text-white text-xs rounded-md shadow-lg z-30 pointer-events-none">
                          Choose values to auto-fill when this template is applied to a new trade. All fields are optional.
                          <div className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-gray-800" />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Instrument Type */}
                      {templateFormData.visibleFields.instrumentType && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Instrument Type{" "}
                            <span className="text-xs font-normal text-gray-400">(optional)</span>
                          </label>
                          <div className="relative">
                            <div
                              className="flex items-center w-full px-3 py-2 border border-gray-300 rounded-md bg-white cursor-pointer hover:border-blue-400"
                              onClick={() => { setInstrumentTypeDropdownOpen((p) => !p); setTradeTypeDropdownOpen(false); setMarketConditionDropdownOpen(false); setStrategyDropdownOpen(false); setSetupDropdownOpen(false); }}
                            >
                              <span className={`flex-1 text-sm ${templateFormData.fields.instrumentType ? "text-gray-900" : "text-gray-400"}`}>
                                {templateFormData.fields.instrumentType || "Select type"}
                              </span>
                              {templateFormData.fields.instrumentType && (
                                <button type="button" onClick={(e) => { e.stopPropagation(); handleTemplateFieldChange("instrumentType", ""); }} className="mr-1 p-0.5 text-gray-400 hover:text-red-500 rounded" title="Clear"><X className="w-3.5 h-3.5" /></button>
                              )}
                              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-150 ${instrumentTypeDropdownOpen ? "rotate-180" : ""}`} />
                            </div>
                            {instrumentTypeDropdownOpen && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => { setInstrumentTypeDropdownOpen(false); setShowCustomInstrumentTypeInput(false); setCustomInstrumentTypeValue(""); }} />
                                <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
                                  <div className="max-h-44 overflow-y-auto">
                                    <div className="px-3 py-2 text-sm text-gray-400 hover:bg-gray-50 cursor-pointer" onClick={() => { handleTemplateFieldChange("instrumentType", ""); setInstrumentTypeDropdownOpen(false); }}>— None —</div>
                                    {userInstrumentTypes.map((item) => (
                                      <div key={item} className={`flex items-center group px-3 py-2 cursor-pointer text-sm ${templateFormData.fields.instrumentType === item ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50 text-gray-700"}`}>
                                        <span className="flex-1" onClick={() => { handleTemplateFieldChange("instrumentType", item); setInstrumentTypeDropdownOpen(false); }}>{item}</span>
                                        <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteInstrumentType(item); }} className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 rounded" title="Delete"><Trash2 className="w-3 h-3" /></button>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="border-t border-gray-100 p-2">
                                    {!showCustomInstrumentTypeInput ? (
                                      <button type="button" onClick={(e) => { e.stopPropagation(); setShowCustomInstrumentTypeInput(true); }} className="w-full flex items-center space-x-2 px-2 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded"><Plus className="w-3.5 h-3.5" /><span>Add custom type</span></button>
                                    ) : (
                                      <div className="flex space-x-1" onClick={(e) => e.stopPropagation()}>
                                        <input type="text" value={customInstrumentTypeValue} onChange={(e) => setCustomInstrumentTypeValue(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleAddCustomInstrumentType(); if (e.key === "Escape") { setShowCustomInstrumentTypeInput(false); setCustomInstrumentTypeValue(""); } }} placeholder="Type name" className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" autoFocus />
                                        <button type="button" onClick={handleAddCustomInstrumentType} className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">Add</button>
                                        <button type="button" onClick={() => { setShowCustomInstrumentTypeInput(false); setCustomInstrumentTypeValue(""); }} className="px-2 py-1 text-xs text-gray-500 border border-gray-300 rounded hover:bg-gray-50">×</button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Trade Type */}
                      {templateFormData.visibleFields.tradeType && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Trade Type{" "}
                            <span className="text-xs font-normal text-gray-400">(optional)</span>
                          </label>
                          <div className="relative">
                            <div
                              className="flex items-center w-full px-3 py-2 border border-gray-300 rounded-md bg-white cursor-pointer hover:border-blue-400"
                              onClick={() => { setTradeTypeDropdownOpen((p) => !p); setInstrumentTypeDropdownOpen(false); setMarketConditionDropdownOpen(false); setStrategyDropdownOpen(false); setSetupDropdownOpen(false); }}
                            >
                              <span className={`flex-1 text-sm ${templateFormData.fields.tradeType ? "text-gray-900" : "text-gray-400"}`}>
                                {templateFormData.fields.tradeType || "Select type"}
                              </span>
                              {templateFormData.fields.tradeType && (
                                <button type="button" onClick={(e) => { e.stopPropagation(); handleTemplateFieldChange("tradeType", ""); }} className="mr-1 p-0.5 text-gray-400 hover:text-red-500 rounded" title="Clear"><X className="w-3.5 h-3.5" /></button>
                              )}
                              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-150 ${tradeTypeDropdownOpen ? "rotate-180" : ""}`} />
                            </div>
                            {tradeTypeDropdownOpen && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => { setTradeTypeDropdownOpen(false); setShowCustomTradeTypeInput(false); setCustomTradeTypeValue(""); }} />
                                <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
                                  <div className="max-h-44 overflow-y-auto">
                                    <div className="px-3 py-2 text-sm text-gray-400 hover:bg-gray-50 cursor-pointer" onClick={() => { handleTemplateFieldChange("tradeType", ""); setTradeTypeDropdownOpen(false); }}>— None —</div>
                                    {userTradeTypes.map((item) => (
                                      <div key={item} className={`flex items-center group px-3 py-2 cursor-pointer text-sm ${templateFormData.fields.tradeType === item ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50 text-gray-700"}`}>
                                        <span className="flex-1" onClick={() => { handleTemplateFieldChange("tradeType", item); setTradeTypeDropdownOpen(false); }}>{item}</span>
                                        <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteTradeType(item); }} className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 rounded" title="Delete"><Trash2 className="w-3 h-3" /></button>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="border-t border-gray-100 p-2">
                                    {!showCustomTradeTypeInput ? (
                                      <button type="button" onClick={(e) => { e.stopPropagation(); setShowCustomTradeTypeInput(true); }} className="w-full flex items-center space-x-2 px-2 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded"><Plus className="w-3.5 h-3.5" /><span>Add custom type</span></button>
                                    ) : (
                                      <div className="flex space-x-1" onClick={(e) => e.stopPropagation()}>
                                        <input type="text" value={customTradeTypeValue} onChange={(e) => setCustomTradeTypeValue(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleAddCustomTradeType(); if (e.key === "Escape") { setShowCustomTradeTypeInput(false); setCustomTradeTypeValue(""); } }} placeholder="Type name" className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" autoFocus />
                                        <button type="button" onClick={handleAddCustomTradeType} className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">Add</button>
                                        <button type="button" onClick={() => { setShowCustomTradeTypeInput(false); setCustomTradeTypeValue(""); }} className="px-2 py-1 text-xs text-gray-500 border border-gray-300 rounded hover:bg-gray-50">×</button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Strategy — custom dropdown with delete + add */}
                      {templateFormData.visibleFields.strategy && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Strategy
                          </label>
                          <div className="relative">
                            <div
                              className="flex items-center w-full px-3 py-2 border border-gray-300 rounded-md bg-white cursor-pointer hover:border-blue-400"
                              onClick={() => {
                                setStrategyDropdownOpen((p) => !p);
                                setSetupDropdownOpen(false);
                              }}
                            >
                              <span
                                className={`flex-1 text-sm ${templateFormData.fields.strategy ? "text-gray-900" : "text-gray-400"}`}
                              >
                                {templateFormData.fields.strategy || "Select strategy"}
                              </span>
                              {templateFormData.fields.strategy && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTemplateFieldChange("strategy", "");
                                  }}
                                  className="mr-1 p-0.5 text-gray-400 hover:text-red-500 rounded"
                                  title="Clear selection"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <ChevronDown
                                className={`w-4 h-4 text-gray-400 transition-transform duration-150 ${strategyDropdownOpen ? "rotate-180" : ""}`}
                              />
                            </div>

                            {strategyDropdownOpen && (
                              <>
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={() => {
                                    setStrategyDropdownOpen(false);
                                    setShowCustomStrategyInput(false);
                                    setCustomStrategyValue("");
                                  }}
                                />
                                <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
                                  <div className="max-h-44 overflow-y-auto">
                                    <div
                                      className="px-3 py-2 text-sm text-gray-400 hover:bg-gray-50 cursor-pointer"
                                      onClick={() => {
                                        handleTemplateFieldChange("strategy", "");
                                        setStrategyDropdownOpen(false);
                                      }}
                                    >
                                      — None —
                                    </div>
                                    {userStrategies.map((strategy) => (
                                      <div
                                        key={strategy}
                                        className={`flex items-center group px-3 py-2 cursor-pointer text-sm ${
                                          templateFormData.fields.strategy === strategy
                                            ? "bg-blue-50 text-blue-700"
                                            : "hover:bg-gray-50 text-gray-700"
                                        }`}
                                      >
                                        <span
                                          className="flex-1"
                                          onClick={() => {
                                            handleTemplateFieldChange("strategy", strategy);
                                            setStrategyDropdownOpen(false);
                                          }}
                                        >
                                          {strategy}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteStrategy(strategy);
                                          }}
                                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 rounded"
                                          title="Delete option"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="border-t border-gray-100 p-2">
                                    {!showCustomStrategyInput ? (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setShowCustomStrategyInput(true);
                                        }}
                                        className="w-full flex items-center space-x-2 px-2 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>Add custom strategy</span>
                                      </button>
                                    ) : (
                                      <div
                                        className="flex space-x-1"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <input
                                          type="text"
                                          value={customStrategyValue}
                                          onChange={(e) => setCustomStrategyValue(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") handleAddCustomStrategy();
                                            if (e.key === "Escape") {
                                              setShowCustomStrategyInput(false);
                                              setCustomStrategyValue("");
                                            }
                                          }}
                                          placeholder="Strategy name"
                                          className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                          autoFocus
                                        />
                                        <button
                                          type="button"
                                          onClick={handleAddCustomStrategy}
                                          className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                        >
                                          Add
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setShowCustomStrategyInput(false);
                                            setCustomStrategyValue("");
                                          }}
                                          className="px-2 py-1 text-xs text-gray-500 border border-gray-300 rounded hover:bg-gray-50"
                                        >
                                          ×
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Setup — custom dropdown with delete + add */}
                      {templateFormData.visibleFields.setup && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Setup
                          </label>
                          <div className="relative">
                            <div
                              className="flex items-center w-full px-3 py-2 border border-gray-300 rounded-md bg-white cursor-pointer hover:border-blue-400"
                              onClick={() => {
                                setSetupDropdownOpen((p) => !p);
                                setStrategyDropdownOpen(false);
                              }}
                            >
                              <span
                                className={`flex-1 text-sm ${templateFormData.fields.setup ? "text-gray-900" : "text-gray-400"}`}
                              >
                                {templateFormData.fields.setup || "Select setup"}
                              </span>
                              {templateFormData.fields.setup && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTemplateFieldChange("setup", "");
                                  }}
                                  className="mr-1 p-0.5 text-gray-400 hover:text-red-500 rounded"
                                  title="Clear selection"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <ChevronDown
                                className={`w-4 h-4 text-gray-400 transition-transform duration-150 ${setupDropdownOpen ? "rotate-180" : ""}`}
                              />
                            </div>

                            {setupDropdownOpen && (
                              <>
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={() => {
                                    setSetupDropdownOpen(false);
                                    setShowCustomSetupInput(false);
                                    setCustomSetupValue("");
                                  }}
                                />
                                <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
                                  <div className="max-h-44 overflow-y-auto">
                                    <div
                                      className="px-3 py-2 text-sm text-gray-400 hover:bg-gray-50 cursor-pointer"
                                      onClick={() => {
                                        handleTemplateFieldChange("setup", "");
                                        setSetupDropdownOpen(false);
                                      }}
                                    >
                                      — None —
                                    </div>
                                    {userSetups.map((setup) => (
                                      <div
                                        key={setup}
                                        className={`flex items-center group px-3 py-2 cursor-pointer text-sm ${
                                          templateFormData.fields.setup === setup
                                            ? "bg-blue-50 text-blue-700"
                                            : "hover:bg-gray-50 text-gray-700"
                                        }`}
                                      >
                                        <span
                                          className="flex-1"
                                          onClick={() => {
                                            handleTemplateFieldChange("setup", setup);
                                            setSetupDropdownOpen(false);
                                          }}
                                        >
                                          {setup}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteSetup(setup);
                                          }}
                                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 rounded"
                                          title="Delete option"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="border-t border-gray-100 p-2">
                                    {!showCustomSetupInput ? (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setShowCustomSetupInput(true);
                                        }}
                                        className="w-full flex items-center space-x-2 px-2 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>Add custom setup</span>
                                      </button>
                                    ) : (
                                      <div
                                        className="flex space-x-1"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <input
                                          type="text"
                                          value={customSetupValue}
                                          onChange={(e) => setCustomSetupValue(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") handleAddCustomSetup();
                                            if (e.key === "Escape") {
                                              setShowCustomSetupInput(false);
                                              setCustomSetupValue("");
                                            }
                                          }}
                                          placeholder="Setup name"
                                          className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                          autoFocus
                                        />
                                        <button
                                          type="button"
                                          onClick={handleAddCustomSetup}
                                          className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                        >
                                          Add
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setShowCustomSetupInput(false);
                                            setCustomSetupValue("");
                                          }}
                                          className="px-2 py-1 text-xs text-gray-500 border border-gray-300 rounded hover:bg-gray-50"
                                        >
                                          ×
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Market Condition */}
                      {templateFormData.visibleFields.marketCondition && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Market Condition{" "}
                            <span className="text-xs font-normal text-gray-400">(optional)</span>
                          </label>
                          <div className="relative">
                            <div
                              className="flex items-center w-full px-3 py-2 border border-gray-300 rounded-md bg-white cursor-pointer hover:border-blue-400"
                              onClick={() => { setMarketConditionDropdownOpen((p) => !p); setInstrumentTypeDropdownOpen(false); setTradeTypeDropdownOpen(false); setStrategyDropdownOpen(false); setSetupDropdownOpen(false); }}
                            >
                              <span className={`flex-1 text-sm ${templateFormData.fields.marketCondition ? "text-gray-900" : "text-gray-400"}`}>
                                {templateFormData.fields.marketCondition || "Select condition"}
                              </span>
                              {templateFormData.fields.marketCondition && (
                                <button type="button" onClick={(e) => { e.stopPropagation(); handleTemplateFieldChange("marketCondition", ""); }} className="mr-1 p-0.5 text-gray-400 hover:text-red-500 rounded" title="Clear"><X className="w-3.5 h-3.5" /></button>
                              )}
                              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-150 ${marketConditionDropdownOpen ? "rotate-180" : ""}`} />
                            </div>
                            {marketConditionDropdownOpen && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => { setMarketConditionDropdownOpen(false); setShowCustomMarketConditionInput(false); setCustomMarketConditionValue(""); }} />
                                <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
                                  <div className="max-h-44 overflow-y-auto">
                                    <div className="px-3 py-2 text-sm text-gray-400 hover:bg-gray-50 cursor-pointer" onClick={() => { handleTemplateFieldChange("marketCondition", ""); setMarketConditionDropdownOpen(false); }}>— None —</div>
                                    {userMarketConditions.map((item) => (
                                      <div key={item} className={`flex items-center group px-3 py-2 cursor-pointer text-sm ${templateFormData.fields.marketCondition === item ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50 text-gray-700"}`}>
                                        <span className="flex-1" onClick={() => { handleTemplateFieldChange("marketCondition", item); setMarketConditionDropdownOpen(false); }}>{item}</span>
                                        <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteMarketCondition(item); }} className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 rounded" title="Delete"><Trash2 className="w-3 h-3" /></button>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="border-t border-gray-100 p-2">
                                    {!showCustomMarketConditionInput ? (
                                      <button type="button" onClick={(e) => { e.stopPropagation(); setShowCustomMarketConditionInput(true); }} className="w-full flex items-center space-x-2 px-2 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded"><Plus className="w-3.5 h-3.5" /><span>Add custom</span></button>
                                    ) : (
                                      <div className="flex space-x-1" onClick={(e) => e.stopPropagation()}>
                                        <input type="text" value={customMarketConditionValue} onChange={(e) => setCustomMarketConditionValue(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleAddCustomMarketCondition(); if (e.key === "Escape") { setShowCustomMarketConditionInput(false); setCustomMarketConditionValue(""); } }} placeholder="Condition name" className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" autoFocus />
                                        <button type="button" onClick={handleAddCustomMarketCondition} className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">Add</button>
                                        <button type="button" onClick={() => { setShowCustomMarketConditionInput(false); setCustomMarketConditionValue(""); }} className="px-2 py-1 text-xs text-gray-500 border border-gray-300 rounded hover:bg-gray-50">×</button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Market Direction */}
                      {templateFormData.visibleFields.marketDirection && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Market Direction{" "}
                            <span className="text-xs font-normal text-gray-400">(optional)</span>
                          </label>
                          <div className="relative">
                            <div
                              className="flex items-center w-full px-3 py-2 border border-gray-300 rounded-md bg-white cursor-pointer hover:border-blue-400"
                              onClick={() => { setMarketDirectionDropdownOpen((p) => !p); setMarketConditionDropdownOpen(false); setInstrumentTypeDropdownOpen(false); setTradeTypeDropdownOpen(false); setStrategyDropdownOpen(false); setSetupDropdownOpen(false); setRrDropdownOpen(false); }}
                            >
                              <span className={`flex-1 text-sm ${templateFormData.fields.marketDirection ? "text-gray-900" : "text-gray-400"}`}>
                                {templateFormData.fields.marketDirection || "Select direction"}
                              </span>
                              {templateFormData.fields.marketDirection && (
                                <button type="button" onClick={(e) => { e.stopPropagation(); handleTemplateFieldChange("marketDirection", ""); }} className="mr-1 p-0.5 text-gray-400 hover:text-red-500 rounded" title="Clear"><X className="w-3.5 h-3.5" /></button>
                              )}
                              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-150 ${marketDirectionDropdownOpen ? "rotate-180" : ""}`} />
                            </div>
                            {marketDirectionDropdownOpen && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => { setMarketDirectionDropdownOpen(false); setShowCustomMarketDirectionInput(false); setCustomMarketDirectionValue(""); }} />
                                <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
                                  <div className="max-h-44 overflow-y-auto">
                                    <div className="px-3 py-2 text-sm text-gray-400 hover:bg-gray-50 cursor-pointer" onClick={() => { handleTemplateFieldChange("marketDirection", ""); setMarketDirectionDropdownOpen(false); }}>— None —</div>
                                    {userMarketDirections.map((item) => (
                                      <div key={item} className={`flex items-center group px-3 py-2 cursor-pointer text-sm ${templateFormData.fields.marketDirection === item ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50 text-gray-700"}`}>
                                        <span className="flex-1" onClick={() => { handleTemplateFieldChange("marketDirection", item); setMarketDirectionDropdownOpen(false); }}>{item}</span>
                                        <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteMarketDirection(item); }} className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 rounded" title="Delete"><Trash2 className="w-3 h-3" /></button>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="border-t border-gray-100 p-2">
                                    {!showCustomMarketDirectionInput ? (
                                      <button type="button" onClick={(e) => { e.stopPropagation(); setShowCustomMarketDirectionInput(true); }} className="w-full flex items-center space-x-2 px-2 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded"><Plus className="w-3.5 h-3.5" /><span>Add custom direction</span></button>
                                    ) : (
                                      <div className="flex space-x-1" onClick={(e) => e.stopPropagation()}>
                                        <input type="text" value={customMarketDirectionValue} onChange={(e) => setCustomMarketDirectionValue(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleAddCustomMarketDirection(); if (e.key === "Escape") { setShowCustomMarketDirectionInput(false); setCustomMarketDirectionValue(""); } }} placeholder="Direction name" className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" autoFocus />
                                        <button type="button" onClick={handleAddCustomMarketDirection} className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">Add</button>
                                        <button type="button" onClick={() => { setShowCustomMarketDirectionInput(false); setCustomMarketDirectionValue(""); }} className="px-2 py-1 text-xs text-gray-500 border border-gray-300 rounded hover:bg-gray-50">×</button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Risk/Reward Ratio — mode-aware */}
                      {templateFormData.visibleFields.riskRewardRatio && (
                        <div className="md:col-span-2 lg:col-span-3">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Risk/Reward Ratio
                          </label>
                          {/* Mode pills */}
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {Object.entries(RR_MODES).map(([key, mode]) => (
                              <button key={key} type="button"
                                onClick={() => { setRrMode(key); setRrDropdownOpen(false); setShowCustomRRInput(false); setCustomRRValue(""); }}
                                className={`px-2.5 py-1 text-xs rounded-full border font-medium transition-colors ${
                                  rrMode === key
                                    ? "bg-blue-600 text-white border-blue-600"
                                    : "bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600"
                                }`}
                              >{mode.label}</button>
                            ))}
                          </div>
                          <p className="text-xs text-gray-400 mb-2">{RR_MODES[rrMode].hint}</p>
                          {/* Value dropdown */}
                          <div className="relative">
                            <div
                              className="flex items-center w-full px-3 py-2 border border-gray-300 rounded-md bg-white cursor-pointer hover:border-blue-400"
                              onClick={() => { setRrDropdownOpen((p) => !p); setStrategyDropdownOpen(false); setSetupDropdownOpen(false); setInstrumentTypeDropdownOpen(false); setTradeTypeDropdownOpen(false); setMarketConditionDropdownOpen(false); setMarketDirectionDropdownOpen(false); }}
                            >
                              <span className={`flex-1 text-sm ${templateFormData.fields.riskRewardRatio ? "text-gray-900" : "text-gray-400"}`}>
                                {templateFormData.fields.riskRewardRatio || `Select ${RR_MODES[rrMode].label} value`}
                              </span>
                              {templateFormData.fields.riskRewardRatio && (
                                <button type="button" onClick={(e) => { e.stopPropagation(); handleTemplateFieldChange("riskRewardRatio", ""); }} className="mr-1 p-0.5 text-gray-400 hover:text-red-500 rounded" title="Clear"><X className="w-3.5 h-3.5" /></button>
                              )}
                              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-150 ${rrDropdownOpen ? "rotate-180" : ""}`} />
                            </div>
                            {rrDropdownOpen && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => { setRrDropdownOpen(false); setShowCustomRRInput(false); setCustomRRValue(""); }} />
                                <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
                                  <div className="max-h-44 overflow-y-auto">
                                    <div className="px-3 py-2 text-sm text-gray-400 hover:bg-gray-50 cursor-pointer" onClick={() => { handleTemplateFieldChange("riskRewardRatio", ""); setRrDropdownOpen(false); }}>— None —</div>
                                    {(rrListsByMode[rrMode] || []).map((item) => (
                                      <div key={item} className={`flex items-center group px-3 py-2 cursor-pointer text-sm ${templateFormData.fields.riskRewardRatio === item ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50 text-gray-700"}`}>
                                        <span className="flex-1" onClick={() => { handleTemplateFieldChange("riskRewardRatio", item); setRrDropdownOpen(false); }}>{item}</span>
                                        <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteRRRatio(item); }} className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 rounded" title="Delete"><Trash2 className="w-3 h-3" /></button>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="border-t border-gray-100 p-2">
                                    {!showCustomRRInput ? (
                                      <button type="button" onClick={(e) => { e.stopPropagation(); setShowCustomRRInput(true); }} className="w-full flex items-center space-x-2 px-2 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded"><Plus className="w-3.5 h-3.5" /><span>Add custom</span></button>
                                    ) : (
                                      <div className="flex space-x-1" onClick={(e) => e.stopPropagation()}>
                                        <input type="text" value={customRRValue} onChange={(e) => setCustomRRValue(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleAddCustomRR(); if (e.key === "Escape") { setShowCustomRRInput(false); setCustomRRValue(""); } }} placeholder={RR_MODES[rrMode].placeholder} className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" autoFocus />
                                        <button type="button" onClick={handleAddCustomRR} className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">Add</button>
                                        <button type="button" onClick={() => { setShowCustomRRInput(false); setCustomRRValue(""); }} className="px-2 py-1 text-xs text-gray-500 border border-gray-300 rounded hover:bg-gray-50">×</button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={templateFormData.description}
                      onChange={(e) =>
                        setTemplateFormData((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Describe when to use this template"
                    />
                  </div>
                </div>
              )}

              {/* Configure Fields Tab */}
              {activeTemplateTab === "fields" && (
                <div className="space-y-5">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900">Field Configuration</h4>
                      <p className="text-xs text-blue-600 mt-0.5">
                        {getVisibleFieldsCount()} of {Object.keys(availableFields).length} fields enabled for trade entry
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                        <input
                          type="text"
                          value={fieldSearchQuery}
                          onChange={(e) => setFieldSearchQuery(e.target.value)}
                          placeholder="Search fields..."
                          className="pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-40"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const allFields = Object.keys(availableFields);
                          setTemplateFormData((prev) => ({
                            ...prev,
                            visibleFields: allFields.reduce((acc, f) => ({ ...acc, [f]: true }), {}),
                          }));
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap"
                      >
                        Select all
                      </button>
                      <span className="text-xs text-gray-300">|</span>
                      <button
                        type="button"
                        onClick={() => setTemplateFormData((prev) => ({ ...prev, visibleFields: {} }))}
                        className="text-xs text-gray-500 hover:text-gray-700 font-medium whitespace-nowrap"
                      >
                        Deselect all
                      </button>
                    </div>
                  </div>

                  {/* Categories */}
                  {Object.entries(fieldCategories).map(([categoryKey, category]) => {
                    const categoryFields = Object.entries(availableFields).filter(([, f]) => f.category === categoryKey);
                    const filtered = fieldSearchQuery.trim()
                      ? categoryFields.filter(([, f]) => f.label.toLowerCase().includes(fieldSearchQuery.toLowerCase()) || (f.hint || "").toLowerCase().includes(fieldSearchQuery.toLowerCase()))
                      : categoryFields;
                    if (filtered.length === 0) return null;
                    const enabledCount = filtered.filter(([k]) => templateFormData.visibleFields[k]).length;
                    const { Icon } = category;
                    return (
                      <div key={categoryKey}>
                        {/* Category header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <Icon className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-semibold text-gray-800">{category.label}</span>
                          </div>
                          <span className="text-xs text-gray-400 font-medium">{enabledCount}/{filtered.length} on</span>
                        </div>

                        {/* 2-column field cards */}
                        <div className="grid grid-cols-2 gap-3">
                          {filtered.map(([fieldKey, field]) => {
                            const isEnabled = templateFormData.visibleFields[fieldKey] || false;
                            const prefilledValue = templateFormData.fields?.[fieldKey] || "";
                            return (
                              <div
                                key={fieldKey}
                                className={`rounded-xl border p-4 transition-all duration-200 ${
                                  isEnabled
                                    ? "border-blue-200 bg-blue-50"
                                    : "border-gray-200 bg-white"
                                }`}
                              >
                                {/* Card top row: name + toggle */}
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                    <span className={`text-sm font-semibold leading-tight ${isEnabled ? "text-gray-900" : "text-gray-600"}`}>
                                      {field.label}
                                    </span>
                                    {field.isNew && (
                                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-green-500 text-white rounded">NEW</span>
                                    )}
                                  </div>
                                  {/* Toggle switch */}
                                  <button
                                    type="button"
                                    onClick={() => toggleFieldVisibility(fieldKey)}
                                    className={`relative shrink-0 w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none ${
                                      isEnabled ? "bg-blue-600" : "bg-gray-300"
                                    }`}
                                    aria-pressed={isEnabled}
                                  >
                                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${isEnabled ? "translate-x-5" : "translate-x-0"}`} />
                                  </button>
                                </div>

                                {/* Hint text */}
                                {field.hint && (
                                  <p className="text-xs text-gray-400 leading-relaxed mb-3">{field.hint}</p>
                                )}

                                {/* Default value row */}
                                <div className="flex items-center gap-2 mt-auto">
                                  <span className="text-xs font-medium text-blue-600 shrink-0">Default</span>
                                  <input
                                    type="text"
                                    value={prefilledValue}
                                    onChange={(e) =>
                                      setTemplateFormData((prev) => ({
                                        ...prev,
                                        fields: { ...prev.fields, [fieldKey]: e.target.value },
                                      }))
                                    }
                                    placeholder="—"
                                    className="flex-1 min-w-0 px-2 py-1 text-xs border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 placeholder-gray-300"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  <span className="font-medium text-gray-700">{getVisibleFieldsCount()} fields</span> will appear on the trade entry form
                </p>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setShowTemplateModal(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveTemplate}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2 text-sm"
                  >
                    <Save className="w-4 h-4" />
                    <span>
                      {editingTemplate ? "Update Template" : "Create Template"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Strategy Modal */}
      {showAddStrategyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Add New Strategy
                </h3>
                <button
                  onClick={() => setShowAddStrategyModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Strategy Name *
                </label>
                <input
                  type="text"
                  value={newStrategyName}
                  onChange={(e) => setNewStrategyName(e.target.value)}
                  onKeyDown={handleStrategyModalKeyDown}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Momentum Breakout"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={newStrategyDescription}
                  onChange={(e) => setNewStrategyDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe your strategy..."
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowAddStrategyModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddStrategy}
                disabled={!newStrategyName.trim()}
                className={`px-6 py-2 rounded-md transition-colors flex items-center space-x-2 ${
                  newStrategyName.trim()
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>Add Strategy</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Setup Modal */}
      {showAddSetupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Add New Setup
                </h3>
                <button
                  onClick={() => setShowAddSetupModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Setup Name *
                </label>
                <input
                  type="text"
                  value={newSetupName}
                  onChange={(e) => setNewSetupName(e.target.value)}
                  onKeyDown={handleSetupModalKeyDown}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Bull Flag"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={newSetupDescription}
                  onChange={(e) => setNewSetupDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe your setup..."
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowAddSetupModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSetup}
                disabled={!newSetupName.trim()}
                className={`px-6 py-2 rounded-md transition-colors flex items-center space-x-2 ${
                  newSetupName.trim()
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>Add Setup</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Risk Parameter Modal */}
      {showAddRiskParamModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Add Risk Parameter
                </h3>
                <button
                  onClick={() => setShowAddRiskParamModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parameter Name *
                </label>
                <input
                  type="text"
                  value={newRiskParamName}
                  onChange={(e) => setNewRiskParamName(e.target.value)}
                  onKeyDown={handleRiskParamModalKeyDown}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Risk per Trade"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Value *
                  </label>
                  <input
                    type="number"
                    value={newRiskParamValue}
                    onChange={(e) => setNewRiskParamValue(e.target.value)}
                    onKeyDown={handleRiskParamModalKeyDown}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="2.0"
                    step="0.1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unit
                  </label>
                  <select
                    value={newRiskParamUnit}
                    onChange={(e) => setNewRiskParamUnit(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="%">% (Percentage)</option>
                    <option value="$">$ (Dollar)</option>
                    <option value="shares">Shares</option>
                    <option value="ratio">Ratio</option>
                    <option value="points">Points</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={newRiskParamDescription}
                  onChange={(e) => setNewRiskParamDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe this risk parameter..."
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowAddRiskParamModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddRiskParam}
                disabled={!newRiskParamName.trim() || !newRiskParamValue.trim()}
                className={`px-6 py-2 rounded-md transition-colors flex items-center space-x-2 ${
                  newRiskParamName.trim() && newRiskParamValue.trim()
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>Add Parameter</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
