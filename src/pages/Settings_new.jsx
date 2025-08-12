import React, { useState, useEffect } from "react";
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
      id: "strategy-setup",
      name: "Strategy and Setup",
      icon: Target,
      description: "Define trading strategies and setups",
    },
    {
      id: "risk-management",
      name: "Risk Management Profile",
      icon: Shield,
      description: "Configure risk parameters and limits",
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

  // Template management state
  const [templates, setTemplates] = useState(() => {
    // Load templates from localStorage first, fall back to defaults
    const stored = localStorage.getItem("tradeJournalTemplates");
    if (stored) {
      return JSON.parse(stored);
    }
    // Default templates if none stored
    return [
      {
        id: 1,
        name: "Day Trade Long",
        description: "Standard day trading template for long positions",
        fields: {
          instrumentType: "Stocks",
          tradeType: "Long",
          strategy: "Day Trading",
          setup: "Breakout",
          marketCondition: "Trending Up",
          riskRewardRatio: "1:2",
          targetProfit: "500",
          maxLoss: "250",
        },
        isDefault: true,
        createdAt: "2025-07-01",
        usageCount: 45,
      },
      {
        id: 2,
        name: "Swing Trade",
        description: "Multi-day swing trading template",
        fields: {
          instrumentType: "Stocks",
          tradeType: "Long",
          strategy: "Swing Trading",
          setup: "Support Bounce",
          marketCondition: "Consolidating",
          riskRewardRatio: "1:3",
          targetProfit: "1000",
          maxLoss: "333",
        },
        isDefault: false,
        createdAt: "2025-07-05",
        usageCount: 23,
      },
    ];
  });

  // Save templates to localStorage whenever templates change
  useEffect(() => {
    localStorage.setItem("tradeJournalTemplates", JSON.stringify(templates));
  }, [templates]);

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
      type: "select",
      category: "core",
      required: false,
    },
    tradeType: {
      label: "Trade Type",
      type: "select",
      category: "core",
      required: false,
    },
    strategy: {
      label: "Strategy",
      type: "select",
      category: "core",
      required: true,
    },
    setup: { label: "Setup", type: "select", category: "core", required: true },

    // Market Analysis
    marketCondition: {
      label: "Market Condition",
      type: "select",
      category: "market",
      required: false,
    },
    timeframe: {
      label: "Timeframe",
      type: "select",
      category: "market",
      required: false,
    },

    // Risk Management
    riskRewardRatio: {
      label: "Risk/Reward Ratio",
      type: "text",
      category: "risk",
      required: false,
    },
    targetProfit: {
      label: "Target Profit ($)",
      type: "number",
      category: "risk",
      required: false,
    },
    maxLoss: {
      label: "Max Loss ($)",
      type: "number",
      category: "risk",
      required: false,
    },
    stopLoss: {
      label: "Stop Loss ($)",
      type: "number",
      category: "risk",
      required: false,
    },

    // Trade Execution
    entryPrice: {
      label: "Entry Price",
      type: "number",
      category: "execution",
      required: false,
    },
    exitPrice: {
      label: "Exit Price",
      type: "number",
      category: "execution",
      required: false,
    },
    position: {
      label: "Position Size",
      type: "number",
      category: "execution",
      required: false,
    },

    // Additional
    notes: {
      label: "Notes",
      type: "textarea",
      category: "additional",
      required: false,
    },
  };

  const fieldCategories = {
    core: { label: "Core Trading", icon: "📊" },
    market: { label: "Market Analysis", icon: "📈" },
    risk: { label: "Risk Management", icon: "🛡️" },
    execution: { label: "Trade Execution", icon: "⚡" },
    additional: { label: "Additional Info", icon: "📝" },
  };

  const [showFieldCustomization, setShowFieldCustomization] = useState(false);
  const [showFieldModal, setShowFieldModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [activeTemplateTab, setActiveTemplateTab] = useState("basic");

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

  // Strategy and Setup management
  const [showAddStrategyModal, setShowAddStrategyModal] = useState(false);
  const [showAddSetupModal, setShowAddSetupModal] = useState(false);
  const [newStrategyName, setNewStrategyName] = useState("");
  const [newStrategyDescription, setNewStrategyDescription] = useState("");
  const [newSetupName, setNewSetupName] = useState("");
  const [newSetupDescription, setNewSetupDescription] = useState("");
  const [userStrategies, setUserStrategies] = useState(
    getUserManagedStrategies()
  );
  const [userSetups, setUserSetups] = useState(getUserManagedSetups());

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

  const instrumentTypes = ["Stocks", "Options", "Futures", "Forex", "Crypto"];
  const tradeTypes = ["Long", "Short"];

  const strategies = userStrategies;
  const setups = userSetups;
  const marketConditions = [
    "Trending Up",
    "Trending Down",
    "Consolidating",
    "Volatile",
    "Low Volume",
  ];

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
    setIsCreatingTemplate(true);
    setEditingTemplate(null);
    setTemplateFormData({
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

  const getVisibleFieldsCount = () => {
    return (
      Object.values(templateFormData.visibleFields).filter(Boolean).length +
      templateFormData.customFields.length
    );
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setIsCreatingTemplate(true);
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

  const handleSaveTemplate = () => {
    if (!templateFormData.name.trim()) {
      toast.error("Template name is required");
      return;
    }

    if (editingTemplate) {
      setTemplates((prev) =>
        prev.map((template) =>
          template.id === editingTemplate.id
            ? {
                ...template,
                ...templateFormData,
                updatedAt: new Date().toISOString().split("T")[0],
              }
            : template
        )
      );
      toast.success("Template updated successfully");
    } else {
      const newTemplate = {
        id: Date.now(),
        ...templateFormData,
        isDefault: false,
        createdAt: new Date().toISOString().split("T")[0],
        usageCount: 0,
      };
      setTemplates((prev) => [...prev, newTemplate]);
      toast.success("Template created successfully");
    }

    setIsCreatingTemplate(false);
    setShowTemplateModal(false);
    setEditingTemplate(null);
  };

  const handleDeleteTemplate = (templateId) => {
    if (window.confirm("Are you sure you want to delete this template?")) {
      setTemplates((prev) =>
        prev.filter((template) => template.id !== templateId)
      );
      toast.success("Template deleted successfully");
    }
  };

  const handleDuplicateTemplate = (template) => {
    const newTemplate = {
      ...template,
      id: Date.now(),
      name: `${template.name} (Copy)`,
      isDefault: false,
      createdAt: new Date().toISOString().split("T")[0],
      usageCount: 0,
    };
    setTemplates((prev) => [...prev, newTemplate]);
    toast.success("Template duplicated successfully");
  };

  const toggleTemplateDefault = (templateId) => {
    setTemplates((prev) =>
      prev.map((template) => ({
        ...template,
        isDefault:
          template.id === templateId ? !template.isDefault : template.isDefault,
      }))
    );
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

                  {templates.length === 0 && !isCreatingTemplate && (
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
                    Create New Template
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

                  {/* Pre-fill Field Values */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">
                      Pre-fill Field Values
                    </h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Set default values for selected fields to speed up trade
                      entry
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Instrument Type */}
                      {templateFormData.visibleFields.instrumentType && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Instrument Type
                          </label>
                          <select
                            value={templateFormData.fields.instrumentType}
                            onChange={(e) =>
                              handleTemplateFieldChange(
                                "instrumentType",
                                e.target.value
                              )
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select type</option>
                            <option value="Stocks">Stocks</option>
                            <option value="Options">Options</option>
                            <option value="Futures">Futures</option>
                            <option value="Forex">Forex</option>
                            <option value="Crypto">Crypto</option>
                          </select>
                        </div>
                      )}

                      {/* Trade Type */}
                      {templateFormData.visibleFields.tradeType && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Trade Type
                          </label>
                          <select
                            value={templateFormData.fields.tradeType}
                            onChange={(e) =>
                              handleTemplateFieldChange(
                                "tradeType",
                                e.target.value
                              )
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select type</option>
                            <option value="Long">Long</option>
                            <option value="Short">Short</option>
                          </select>
                        </div>
                      )}

                      {/* Strategy */}
                      {templateFormData.visibleFields.strategy && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Strategy
                          </label>
                          <select
                            value={templateFormData.fields.strategy}
                            onChange={(e) =>
                              handleTemplateFieldChange(
                                "strategy",
                                e.target.value
                              )
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select strategy</option>
                            {strategies.map((strategy) => (
                              <option key={strategy} value={strategy}>
                                {strategy}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Setup */}
                      {templateFormData.visibleFields.setup && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Setup
                          </label>
                          <select
                            value={templateFormData.fields.setup}
                            onChange={(e) =>
                              handleTemplateFieldChange("setup", e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select setup</option>
                            {setups.map((setup) => (
                              <option key={setup} value={setup}>
                                {setup}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Market Condition */}
                      {templateFormData.visibleFields.marketCondition && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Market Condition
                          </label>
                          <select
                            value={templateFormData.fields.marketCondition}
                            onChange={(e) =>
                              handleTemplateFieldChange(
                                "marketCondition",
                                e.target.value
                              )
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select condition</option>
                            <option value="Trending Up">Trending Up</option>
                            <option value="Trending Down">Trending Down</option>
                            <option value="Consolidating">Consolidating</option>
                            <option value="Volatile">Volatile</option>
                            <option value="Low Volume">Low Volume</option>
                          </select>
                        </div>
                      )}

                      {/* Risk/Reward Ratio */}
                      {templateFormData.visibleFields.riskRewardRatio && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Risk/Reward Ratio
                          </label>
                          <input
                            type="text"
                            value={templateFormData.fields.riskRewardRatio}
                            onChange={(e) =>
                              handleTemplateFieldChange(
                                "riskRewardRatio",
                                e.target.value
                              )
                            }
                            placeholder="Enter risk/reward ratio"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
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
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">
                          Field Configuration
                        </h4>
                        <p className="text-sm text-gray-600">
                          Customize which fields appear during trade entry.
                          Currently {getVisibleFieldsCount()} fields are
                          selected.
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          type="button"
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
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Select All
                        </button>
                        <span className="text-xs text-gray-400">|</span>
                        <button
                          type="button"
                          onClick={() => {
                            setTemplateFormData((prev) => ({
                              ...prev,
                              visibleFields: {},
                            }));
                          }}
                          className="text-xs text-gray-600 hover:text-gray-800 font-medium"
                        >
                          Deselect All
                        </button>
                      </div>
                    </div>

                    {/* Group fields by category */}
                    {Object.entries(fieldCategories).map(
                      ([categoryKey, category]) => (
                        <div key={categoryKey} className="space-y-2 mb-4">
                          <h5 className="text-sm font-medium text-gray-700 border-b border-gray-200 pb-1 flex items-center space-x-2">
                            <span>{category.icon}</span>
                            <span>{category.label}</span>
                          </h5>
                          <div className="grid grid-cols-1 gap-2 ml-2">
                            {Object.entries(availableFields)
                              .filter(
                                ([key, field]) => field.category === categoryKey
                              )
                              .map(([fieldKey, field]) => (
                                <label
                                  key={fieldKey}
                                  className={`flex items-center justify-between space-x-2 text-sm cursor-pointer hover:bg-gray-50 p-2 rounded border transition-all duration-200 ${
                                    templateFormData.visibleFields[fieldKey]
                                      ? "border-blue-200 bg-blue-50"
                                      : "border-gray-200"
                                  }`}
                                >
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="checkbox"
                                      checked={
                                        templateFormData.visibleFields[
                                          fieldKey
                                        ] || false
                                      }
                                      onChange={() =>
                                        toggleFieldVisibility(fieldKey)
                                      }
                                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span
                                      className={
                                        templateFormData.visibleFields[fieldKey]
                                          ? "text-gray-900 font-medium"
                                          : "text-gray-500"
                                      }
                                    >
                                      {field.label}
                                    </span>
                                  </div>
                                  {templateFormData.visibleFields[fieldKey] && (
                                    <Check className="w-4 h-4 text-green-600" />
                                  )}
                                </label>
                              ))}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setShowTemplateModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTemplate}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
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
