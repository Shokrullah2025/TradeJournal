import React, { useState } from "react";
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
  Target,
  TrendingUp,
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
      id: "strategies",
      name: "Strategies & Setups",
      icon: TrendingUp,
      description: "Manage your trading strategies and setups",
    },
    {
      id: "risk",
      name: "Risk Management",
      icon: Target,
      description: "Configure risk/reward profiles and settings",
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
  const [templates, setTemplates] = useState([
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
        contractType: "",
        tags: "day-trade, breakout",
        riskReward: "2",
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
        contractType: "",
        tags: "swing-trade, support",
        riskReward: "3",
      },
      isDefault: false,
      createdAt: "2025-07-05",
      usageCount: 23,
    },
  ]);

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
      contractType: "",
      tags: "",
      riskReward: "",
      stopLoss: "",
      takeProfit: "",
      entryPrice: "",
      quantity: "",
    },
  });

  const instrumentTypes = ["Crypto", "Forex", "Futures", "Options", "Stocks"];
  const tradeTypes = ["Long", "Short"];

  // User-manageable strategies and setups (stored in localStorage)
  const getUserStrategies = () => {
    const stored = localStorage.getItem("tradeJournalStrategies");
    return stored
      ? JSON.parse(stored)
      : ["Day Trading", "Swing Trading", "Scalp Trading"]; // Default fallback
  };

  const getUserSetups = () => {
    const stored = localStorage.getItem("tradeJournalSetups");
    return stored
      ? JSON.parse(stored)
      : ["Breakout", "Support Bounce", "Pullback"]; // Default fallback
  };

  const [userStrategies, setUserStrategies] = useState(getUserStrategies());
  const [userSetups, setUserSetups] = useState(getUserSetups());
  const [newStrategy, setNewStrategy] = useState("");
  const [newSetup, setNewSetup] = useState("");

  // Save strategies and setups to localStorage
  const saveStrategies = (strategies) => {
    localStorage.setItem("tradeJournalStrategies", JSON.stringify(strategies));
    setUserStrategies(strategies);
  };

  const saveSetups = (setups) => {
    localStorage.setItem("tradeJournalSetups", JSON.stringify(setups));
    setUserSetups(setups);
  };

  // Add new strategy
  const addStrategy = () => {
    if (newStrategy.trim() && !userStrategies.includes(newStrategy.trim())) {
      const updated = [...userStrategies, newStrategy.trim()];
      saveStrategies(updated);
      setNewStrategy("");
      toast.success("Strategy added successfully!");
    }
  };

  // Remove strategy
  const removeStrategy = (strategy) => {
    const updated = userStrategies.filter((s) => s !== strategy);
    saveStrategies(updated);
    toast.success("Strategy removed successfully!");
  };

  // Add new setup
  const addSetup = () => {
    if (newSetup.trim() && !userSetups.includes(newSetup.trim())) {
      const updated = [...userSetups, newSetup.trim()];
      saveSetups(updated);
      setNewSetup("");
      toast.success("Setup added successfully!");
    }
  };

  // Remove setup
  const removeSetup = (setup) => {
    const updated = userSetups.filter((s) => s !== setup);
    saveSetups(updated);
    toast.success("Setup removed successfully!");
  };

  const marketConditions = [
    "Trending Up",
    "Trending Down",
    "Consolidating",
    "Volatile",
    "Low Volume",
  ];
  const contractTypes = [
    "Mini",
    "Micro",
    "Standard",
    "Weekly",
    "Monthly",
    "Quarterly",
  ];

  // Major currency pairs for forex trading
  const majorCurrencyPairs = [
    "EUR/USD",
    "GBP/USD",
    "USD/JPY",
    "USD/CHF",
    "AUD/USD",
    "USD/CAD",
    "NZD/USD",
    "EUR/GBP",
    "EUR/JPY",
    "GBP/JPY",
    "CHF/JPY",
    "EUR/CHF",
    "AUD/JPY",
    "GBP/CHF",
    "CAD/JPY",
    "NZD/JPY",
    "AUD/CAD",
    "AUD/CHF",
    "AUD/NZD",
    "CAD/CHF",
    "EUR/AUD",
    "EUR/CAD",
    "EUR/NZD",
    "GBP/AUD",
    "GBP/CAD",
    "GBP/NZD",
    "NZD/CAD",
    "NZD/CHF",
  ];

  // Risk Management state with enhanced futures/forex features
  const [riskProfiles, setRiskProfiles] = useState([
    {
      id: 1,
      name: "Conservative Futures",
      description:
        "Low-risk approach for futures trading with tight stop losses",
      riskRatio: 1,
      rewardRatio: 2,
      maxRiskPerTrade: 1,
      riskPerTradeAmount: 100,
      pointRisk: 10,
      pointProfit: 20,
      instrumentType: "futures",
      currencyPairs: [],
      accountPercentage: 1,
      usePercentage: true,
      isDefault: true,
      strategy: "Position Trading",
      createdAt: "2025-07-01",
    },
    {
      id: 2,
      name: "Moderate Forex",
      description: "Balanced risk approach for major currency pairs",
      riskRatio: 1,
      rewardRatio: 2.5,
      maxRiskPerTrade: 2,
      riskPerTradeAmount: 200,
      pointRisk: 30,
      pointProfit: 75,
      instrumentType: "forex",
      currencyPairs: ["EUR/USD", "GBP/USD", "USD/JPY"],
      accountPercentage: 2,
      usePercentage: true,
      isDefault: false,
      strategy: "Day Trading",
      createdAt: "2025-07-01",
    },
    {
      id: 3,
      name: "Aggressive Scalping",
      description: "High-frequency trading with quick entries and exits",
      riskRatio: 1,
      rewardRatio: 1.5,
      maxRiskPerTrade: 3,
      riskPerTradeAmount: 500,
      pointRisk: 5,
      pointProfit: 7.5,
      instrumentType: "futures",
      currencyPairs: [],
      accountPercentage: 3,
      usePercentage: false,
      isDefault: false,
      strategy: "Scalp Trading",
      createdAt: "2025-07-01",
    },
  ]);

  const [isCreatingRiskProfile, setIsCreatingRiskProfile] = useState(false);
  const [editingRiskProfile, setEditingRiskProfile] = useState(null);
  const [riskProfileFormData, setRiskProfileFormData] = useState({
    name: "",
    description: "",
    riskRatio: 1,
    rewardRatio: 2,
    maxRiskPerTrade: 2,
    riskPerTradeAmount: 100,
    pointRisk: 10,
    pointProfit: 20,
    instrumentType: "futures",
    currencyPairs: [],
    accountPercentage: 2,
    usePercentage: true,
    strategy: "",
  });

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
        contractType: "",
        tags: "",
        riskReward: "",
        riskProfile: "", // Add risk profile field
      },
    });
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setIsCreatingTemplate(true);
    setTemplateFormData({
      name: template.name,
      description: template.description,
      fields: { ...template.fields },
    });
  };

  const handleSaveTemplate = () => {
    if (!templateFormData.name.trim()) {
      toast.error("Template name is required");
      return;
    }

    if (editingTemplate) {
      const updatedTemplates = templates.map((template) =>
        template.id === editingTemplate.id
          ? {
              ...template,
              ...templateFormData,
              updatedAt: new Date().toISOString().split("T")[0],
            }
          : template
      );
      setTemplates(updatedTemplates);
      // Save to localStorage for TradeForm
      localStorage.setItem(
        "tradeJournalTemplates",
        JSON.stringify(updatedTemplates)
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
      const updatedTemplates = [...templates, newTemplate];
      setTemplates(updatedTemplates);
      // Save to localStorage for TradeForm
      localStorage.setItem(
        "tradeJournalTemplates",
        JSON.stringify(updatedTemplates)
      );
      toast.success("Template created successfully");
    }

    setIsCreatingTemplate(false);
    setEditingTemplate(null);
  };

  const handleDeleteTemplate = (templateId) => {
    if (window.confirm("Are you sure you want to delete this template?")) {
      const updatedTemplates = templates.filter(
        (template) => template.id !== templateId
      );
      setTemplates(updatedTemplates);
      // Save to localStorage for TradeForm
      localStorage.setItem(
        "tradeJournalTemplates",
        JSON.stringify(updatedTemplates)
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
    const updatedTemplates = [...templates, newTemplate];
    setTemplates(updatedTemplates);
    // Save to localStorage for TradeForm
    localStorage.setItem(
      "tradeJournalTemplates",
      JSON.stringify(updatedTemplates)
    );
    toast.success("Template duplicated successfully");
  };

  const toggleTemplateDefault = (templateId) => {
    const updatedTemplates = templates.map((template) => ({
      ...template,
      isDefault:
        template.id === templateId ? !template.isDefault : template.isDefault,
    }));
    setTemplates(updatedTemplates);
    // Save to localStorage for TradeForm
    localStorage.setItem(
      "tradeJournalTemplates",
      JSON.stringify(updatedTemplates)
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

  // Risk Profile management functions
  const handleCreateNewRiskProfile = () => {
    setIsCreatingRiskProfile(true);
    setEditingRiskProfile(null);
    setRiskProfileFormData({
      name: "",
      description: "",
      riskRatio: 1,
      rewardRatio: 2,
      maxRiskPerTrade: 2,
      riskPerTradeAmount: 100,
      pointRisk: 10,
      pointProfit: 20,
      instrumentType: "futures",
      currencyPairs: [],
      accountPercentage: 2,
      usePercentage: true,
      strategy: "",
    });
  };

  const handleEditRiskProfile = (profile) => {
    setEditingRiskProfile(profile);
    setIsCreatingRiskProfile(true);
    setRiskProfileFormData({
      name: profile.name,
      description: profile.description,
      riskRatio: profile.riskRatio,
      rewardRatio: profile.rewardRatio,
      maxRiskPerTrade: profile.maxRiskPerTrade,
      riskPerTradeAmount: profile.riskPerTradeAmount || 100,
      pointRisk: profile.pointRisk || 10,
      pointProfit: profile.pointProfit || 20,
      instrumentType: profile.instrumentType || "futures",
      currencyPairs: profile.currencyPairs || [],
      accountPercentage: profile.accountPercentage || 2,
      usePercentage: profile.usePercentage !== false,
      strategy: profile.strategy,
    });
  };

  const handleSaveRiskProfile = () => {
    if (!riskProfileFormData.name.trim()) {
      toast.error("Risk profile name is required");
      return;
    }

    if (editingRiskProfile) {
      const updatedProfiles = riskProfiles.map((profile) =>
        profile.id === editingRiskProfile.id
          ? {
              ...profile,
              ...riskProfileFormData,
              updatedAt: new Date().toISOString().split("T")[0],
            }
          : profile
      );
      setRiskProfiles(updatedProfiles);
      localStorage.setItem(
        "tradeJournalRiskProfiles",
        JSON.stringify(updatedProfiles)
      );
      toast.success("Risk profile updated successfully");
    } else {
      const newProfile = {
        id: Date.now(),
        ...riskProfileFormData,
        isDefault: false,
        createdAt: new Date().toISOString().split("T")[0],
      };
      const updatedProfiles = [...riskProfiles, newProfile];
      setRiskProfiles(updatedProfiles);
      localStorage.setItem(
        "tradeJournalRiskProfiles",
        JSON.stringify(updatedProfiles)
      );
      toast.success("Risk profile created successfully");
    }

    setIsCreatingRiskProfile(false);
    setEditingRiskProfile(null);
  };

  const handleDeleteRiskProfile = (profileId) => {
    if (window.confirm("Are you sure you want to delete this risk profile?")) {
      const updatedProfiles = riskProfiles.filter(
        (profile) => profile.id !== profileId
      );
      setRiskProfiles(updatedProfiles);
      localStorage.setItem(
        "tradeJournalRiskProfiles",
        JSON.stringify(updatedProfiles)
      );
      toast.success("Risk profile deleted successfully");
    }
  };

  const handleDuplicateRiskProfile = (profile) => {
    const newProfile = {
      ...profile,
      id: Date.now(),
      name: `${profile.name} (Copy)`,
      isDefault: false,
      createdAt: new Date().toISOString().split("T")[0],
    };
    const updatedProfiles = [...riskProfiles, newProfile];
    setRiskProfiles(updatedProfiles);
    localStorage.setItem(
      "tradeJournalRiskProfiles",
      JSON.stringify(updatedProfiles)
    );
    toast.success("Risk profile duplicated successfully");
  };

  const toggleRiskProfileDefault = (profileId) => {
    const updatedProfiles = riskProfiles.map((profile) => ({
      ...profile,
      isDefault:
        profile.id === profileId ? !profile.isDefault : profile.isDefault,
    }));
    setRiskProfiles(updatedProfiles);
    localStorage.setItem(
      "tradeJournalRiskProfiles",
      JSON.stringify(updatedProfiles)
    );
  };

  const handleRiskProfileFieldChange = (fieldName, value) => {
    setRiskProfileFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleModalClose = (e) => {
    if (e.target === e.currentTarget) {
      setIsCreatingTemplate(false);
      setIsCreatingRiskProfile(false);
    }
  };

  // Initialize localStorage with templates and risk profiles on component mount
  React.useEffect(() => {
    const existingTemplates = localStorage.getItem("tradeJournalTemplates");
    if (!existingTemplates) {
      localStorage.setItem("tradeJournalTemplates", JSON.stringify(templates));
    } else {
      setTemplates(JSON.parse(existingTemplates));
    }

    const existingRiskProfiles = localStorage.getItem(
      "tradeJournalRiskProfiles"
    );
    if (!existingRiskProfiles) {
      localStorage.setItem(
        "tradeJournalRiskProfiles",
        JSON.stringify(riskProfiles)
      );
    } else {
      setRiskProfiles(JSON.parse(existingRiskProfiles));
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">
            Manage your preferences, templates, and data
          </p>
        </div>
      </div>

      {/* Main Content with Sidebar Layout */}
      <div className="flex gap-8">
        {/* Left Sidebar - Tab Navigation */}
        <div className="w-64 flex-shrink-0">
          <nav className="space-y-2" aria-label="Settings Navigation">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full group flex items-start p-4 text-left text-sm font-medium rounded-lg transition-all duration-200 ${
                    activeTab === tab.id
                      ? "bg-blue-50 text-blue-700 border-l-4 border-blue-600"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50 border-l-4 border-transparent"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 mr-3 mt-0.5 flex-shrink-0 ${
                      activeTab === tab.id
                        ? "text-blue-600"
                        : "text-gray-400 group-hover:text-gray-500"
                    }`}
                  />
                  <div className="flex-1">
                    <div className="font-medium">{tab.name}</div>
                    <p
                      className={`mt-1 text-xs leading-4 ${
                        activeTab === tab.id ? "text-blue-600" : "text-gray-500"
                      }`}
                    >
                      {tab.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 min-w-0">
          {/* General Tab */}
          {activeTab === "general" && (
            <div className="space-y-6">
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
            <div>
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

                {/* Template Creation/Edit Modal */}
                {isCreatingTemplate && (
                  <div
                    className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
                    onClick={handleModalClose}
                  >
                    <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-medium text-gray-900">
                          {editingTemplate
                            ? "Edit Template"
                            : "Create New Template"}
                        </h3>
                        <button
                          onClick={() => setIsCreatingTemplate(false)}
                          className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                        >
                          ×
                        </button>
                      </div>

                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="label">Template Name *</label>
                            <input
                              type="text"
                              value={templateFormData.name}
                              onChange={(e) =>
                                setTemplateFormData((prev) => ({
                                  ...prev,
                                  name: e.target.value,
                                }))
                              }
                              className="input"
                              placeholder="Enter template name"
                            />
                          </div>

                          <div>
                            <label className="label">Instrument Type</label>
                            <select
                              value={templateFormData.fields.instrumentType}
                              onChange={(e) =>
                                handleTemplateFieldChange(
                                  "instrumentType",
                                  e.target.value
                                )
                              }
                              className="input"
                            >
                              <option value="">Select type</option>
                              {instrumentTypes.map((type) => (
                                <option key={type} value={type}>
                                  {type}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="label">Description</label>
                          <textarea
                            value={templateFormData.description}
                            onChange={(e) =>
                              setTemplateFormData((prev) => ({
                                ...prev,
                                description: e.target.value,
                              }))
                            }
                            rows={2}
                            className="input"
                            placeholder="Describe when to use this template"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div>
                            <label className="label">Trade Type</label>
                            <select
                              value={templateFormData.fields.tradeType}
                              onChange={(e) =>
                                handleTemplateFieldChange(
                                  "tradeType",
                                  e.target.value
                                )
                              }
                              className="input"
                            >
                              <option value="">Select type</option>
                              {tradeTypes.map((type) => (
                                <option key={type} value={type}>
                                  {type}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="label">Strategy</label>
                            <select
                              value={templateFormData.fields.strategy}
                              onChange={(e) =>
                                handleTemplateFieldChange(
                                  "strategy",
                                  e.target.value
                                )
                              }
                              className="input"
                            >
                              <option value="">Select strategy</option>
                              {userStrategies.map((strategy) => (
                                <option key={strategy} value={strategy}>
                                  {strategy}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="label">Setup</label>
                            <select
                              value={templateFormData.fields.setup}
                              onChange={(e) =>
                                handleTemplateFieldChange(
                                  "setup",
                                  e.target.value
                                )
                              }
                              className="input"
                            >
                              <option value="">Select setup</option>
                              {userSetups.map((setup) => (
                                <option key={setup} value={setup}>
                                  {setup}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="label">Market Condition</label>
                          <select
                            value={templateFormData.fields.marketCondition}
                            onChange={(e) =>
                              handleTemplateFieldChange(
                                "marketCondition",
                                e.target.value
                              )
                            }
                            className="input"
                          >
                            <option value="">Select condition</option>
                            {marketConditions.map((condition) => (
                              <option key={condition} value={condition}>
                                {condition}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* New additional template fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="label">Contract Type</label>
                            <select
                              value={templateFormData.fields.contractType}
                              onChange={(e) =>
                                handleTemplateFieldChange(
                                  "contractType",
                                  e.target.value
                                )
                              }
                              className="input"
                            >
                              <option value="">Select contract type</option>
                              {contractTypes.map((type) => (
                                <option key={type} value={type}>
                                  {type}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="label">
                              Risk to Reward Ratio
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              value={templateFormData.fields.riskReward}
                              onChange={(e) =>
                                handleTemplateFieldChange(
                                  "riskReward",
                                  e.target.value
                                )
                              }
                              className="input"
                              placeholder="e.g., 2.5"
                            />
                          </div>

                          <div>
                            <label className="label">
                              Default Risk Profile
                            </label>
                            <select
                              value={templateFormData.fields.riskProfile}
                              onChange={(e) =>
                                handleTemplateFieldChange(
                                  "riskProfile",
                                  e.target.value
                                )
                              }
                              className="input"
                            >
                              <option value="">
                                Select risk profile (optional)
                              </option>
                              {riskProfiles.map((profile) => (
                                <option key={profile.id} value={profile.name}>
                                  {profile.name} ({profile.riskRatio}:
                                  {profile.rewardRatio})
                                </option>
                              ))}
                            </select>
                            <p className="text-sm text-gray-500 mt-1">
                              Auto-apply this risk profile when using this
                              template
                            </p>
                          </div>
                        </div>

                        <div>
                          <label className="label">Tags</label>
                          <input
                            type="text"
                            value={templateFormData.fields.tags}
                            onChange={(e) =>
                              handleTemplateFieldChange("tags", e.target.value)
                            }
                            className="input"
                            placeholder="Enter tags separated by commas (e.g., scalp, momentum, high-volume)"
                          />
                          <p className="text-sm text-gray-500 mt-1">
                            Add tags to help categorize and filter your trades
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-end space-x-3 pt-6 mt-6 border-t border-gray-200">
                        <button
                          onClick={() => setIsCreatingTemplate(false)}
                          className="btn btn-secondary"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveTemplate}
                          className="btn btn-primary flex items-center space-x-2"
                        >
                          <Save className="w-4 h-4" />
                          <span>
                            {editingTemplate
                              ? "Update Template"
                              : "Create Template"}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

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
                              .filter(([key, value]) => value && key !== "tags") // Show all except tags
                              .slice(0, 6) // Show more fields now
                              .map(([key, value]) => {
                                return (
                                  <span
                                    key={key}
                                    className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800"
                                  >
                                    {key === "riskReward"
                                      ? `R:R ${value}`
                                      : value}
                                  </span>
                                );
                              })}
                            {/* Show tags separately if they exist */}
                            {template.fields.tags && (
                              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                                🏷️ {template.fields.tags}
                              </span>
                            )}
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

          {/* Strategies & Setups Tab */}
          {activeTab === "strategies" && (
            <div>
              <div className="card">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <TrendingUp className="w-5 h-5 text-primary-600" />
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">
                        Trading Strategies & Setups
                      </h2>
                      <p className="text-sm text-gray-600">
                        Manage your custom strategies and setups for easy
                        selection
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Strategies Management */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b">
                      <h3 className="text-lg font-medium text-gray-900">
                        📈 Trading Strategies
                      </h3>
                      <span className="text-sm text-gray-500">
                        {userStrategies.length} strategies
                      </span>
                    </div>

                    {/* Add New Strategy */}
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={newStrategy}
                        onChange={(e) => setNewStrategy(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && addStrategy()}
                        className="input flex-1"
                        placeholder="Enter new strategy name"
                      />
                      <button
                        onClick={addStrategy}
                        disabled={
                          !newStrategy.trim() ||
                          userStrategies.includes(newStrategy.trim())
                        }
                        className="btn btn-primary flex items-center space-x-1"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add</span>
                      </button>
                    </div>

                    {/* Strategies List */}
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {userStrategies.map((strategy) => (
                        <div
                          key={strategy}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <span className="font-medium text-gray-900">
                            {strategy}
                          </span>
                          <button
                            onClick={() => removeStrategy(strategy)}
                            className="text-red-500 hover:text-red-700 p-1 rounded"
                            title="Remove strategy"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}

                      {userStrategies.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <TrendingUp className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                          <p className="text-sm">No strategies yet</p>
                          <p className="text-xs">
                            Add your first trading strategy above
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Setups Management */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b">
                      <h3 className="text-lg font-medium text-gray-900">
                        🎯 Trade Setups
                      </h3>
                      <span className="text-sm text-gray-500">
                        {userSetups.length} setups
                      </span>
                    </div>

                    {/* Add New Setup */}
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={newSetup}
                        onChange={(e) => setNewSetup(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && addSetup()}
                        className="input flex-1"
                        placeholder="Enter new setup name"
                      />
                      <button
                        onClick={addSetup}
                        disabled={
                          !newSetup.trim() ||
                          userSetups.includes(newSetup.trim())
                        }
                        className="btn btn-primary flex items-center space-x-1"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add</span>
                      </button>
                    </div>

                    {/* Setups List */}
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {userSetups.map((setup) => (
                        <div
                          key={setup}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <span className="font-medium text-gray-900">
                            {setup}
                          </span>
                          <button
                            onClick={() => removeSetup(setup)}
                            className="text-red-500 hover:text-red-700 p-1 rounded"
                            title="Remove setup"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}

                      {userSetups.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <Target className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                          <p className="text-sm">No setups yet</p>
                          <p className="text-xs">
                            Add your first trade setup above
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Help Section */}
                <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="text-sm font-semibold text-blue-900 mb-2 flex items-center">
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                    How It Works
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
                    <div>
                      <h5 className="font-medium mb-1">📈 Strategies</h5>
                      <p>
                        Define your trading approaches like Day Trading, Swing
                        Trading, or custom strategies that fit your style
                      </p>
                    </div>
                    <div>
                      <h5 className="font-medium mb-1">🎯 Setups</h5>
                      <p>
                        Create specific entry patterns like Breakouts, Support
                        Bounces, or any setup you regularly trade
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-blue-700">
                    💡 <strong>Pro Tip:</strong> These custom values will appear
                    in your templates and trade entry forms for quick selection
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Risk Management Tab */}
          {activeTab === "risk" && (
            <div>
              <div className="card">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <Target className="w-5 h-5 text-primary-600" />
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">
                        Risk Management Profiles
                      </h2>
                      <p className="text-sm text-gray-600">
                        Create risk/reward profiles to automatically calculate
                        stop loss and take profit levels
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleCreateNewRiskProfile}
                    className="btn btn-primary flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>New Profile</span>
                  </button>
                </div>

                {/* Help Section */}
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="text-sm font-semibold text-blue-900 mb-2 flex items-center">
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                    How Risk Profiles Work
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
                    <div>
                      <h5 className="font-medium mb-1">📈 Trade Entry</h5>
                      <p>
                        Select a risk profile when creating trades to
                        auto-calculate stop loss and take profit levels based on
                        your entry price
                      </p>
                    </div>
                    <div>
                      <h5 className="font-medium mb-1">
                        📋 Template Integration
                      </h5>
                      <p>
                        Add risk profiles to templates for consistent risk
                        management across similar trade setups
                      </p>
                    </div>
                    <div>
                      <h5 className="font-medium mb-1">🎯 Auto-Calculation</h5>
                      <p>
                        Risk profiles automatically adjust when you change entry
                        prices, maintaining your desired risk/reward ratio
                      </p>
                    </div>
                    <div>
                      <h5 className="font-medium mb-1">⚙️ Flexible Setup</h5>
                      <p>
                        Create profiles for different strategies (scalping,
                        swing trading, etc.) with unique risk parameters
                      </p>
                    </div>
                  </div>
                </div>

                {/* Risk Profile Creation/Edit Modal */}
                {isCreatingRiskProfile && (
                  <div
                    className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
                    onClick={handleModalClose}
                  >
                    <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-medium text-gray-900">
                          {editingRiskProfile
                            ? "Edit Risk Profile"
                            : "Create New Risk Profile"}
                        </h3>
                        <button
                          onClick={() => setIsCreatingRiskProfile(false)}
                          className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                        >
                          ×
                        </button>
                      </div>

                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="label">Profile Name *</label>
                            <input
                              type="text"
                              value={riskProfileFormData.name}
                              onChange={(e) =>
                                handleRiskProfileFieldChange(
                                  "name",
                                  e.target.value
                                )
                              }
                              className="input"
                              placeholder="Enter profile name"
                            />
                          </div>

                          <div>
                            <label className="label">Trading Strategy</label>
                            <select
                              value={riskProfileFormData.strategy}
                              onChange={(e) =>
                                handleRiskProfileFieldChange(
                                  "strategy",
                                  e.target.value
                                )
                              }
                              className="input"
                            >
                              <option value="">Select strategy</option>
                              {userStrategies.map((strategy) => (
                                <option key={strategy} value={strategy}>
                                  {strategy}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="label">Description</label>
                          <textarea
                            value={riskProfileFormData.description}
                            onChange={(e) =>
                              handleRiskProfileFieldChange(
                                "description",
                                e.target.value
                              )
                            }
                            rows={2}
                            className="input"
                            placeholder="Describe when to use this risk profile"
                          />
                        </div>

                        {/* Instrument Type Selection */}
                        <div>
                          <label className="label">Instrument Type</label>
                          <select
                            value={riskProfileFormData.instrumentType}
                            onChange={(e) =>
                              handleRiskProfileFieldChange(
                                "instrumentType",
                                e.target.value
                              )
                            }
                            className="input"
                          >
                            <option value="futures">Futures</option>
                            <option value="forex">Forex</option>
                            <option value="stocks">Stocks</option>
                            <option value="crypto">Crypto</option>
                            <option value="options">Options</option>
                          </select>
                        </div>

                        {/* Currency Pairs (show only for Forex) */}
                        {riskProfileFormData.instrumentType === "forex" && (
                          <div>
                            <label className="label">Currency Pairs</label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto border rounded p-2">
                              {majorCurrencyPairs.map((pair) => (
                                <label
                                  key={pair}
                                  className="flex items-center space-x-2 text-sm"
                                >
                                  <input
                                    type="checkbox"
                                    checked={riskProfileFormData.currencyPairs.includes(
                                      pair
                                    )}
                                    onChange={(e) => {
                                      const updatedPairs = e.target.checked
                                        ? [
                                            ...riskProfileFormData.currencyPairs,
                                            pair,
                                          ]
                                        : riskProfileFormData.currencyPairs.filter(
                                            (p) => p !== pair
                                          );
                                      handleRiskProfileFieldChange(
                                        "currencyPairs",
                                        updatedPairs
                                      );
                                    }}
                                    className="rounded"
                                  />
                                  <span>{pair}</span>
                                </label>
                              ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Select currency pairs this profile applies to
                            </p>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="label">Risk Ratio</label>
                            <input
                              type="number"
                              step="0.1"
                              min="0.1"
                              value={riskProfileFormData.riskRatio}
                              onChange={(e) =>
                                handleRiskProfileFieldChange(
                                  "riskRatio",
                                  parseFloat(e.target.value)
                                )
                              }
                              className="input"
                              placeholder="1"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Risk amount (usually 1)
                            </p>
                          </div>

                          <div>
                            <label className="label">Reward Ratio</label>
                            <input
                              type="number"
                              step="0.1"
                              min="0.1"
                              value={riskProfileFormData.rewardRatio}
                              onChange={(e) =>
                                handleRiskProfileFieldChange(
                                  "rewardRatio",
                                  parseFloat(e.target.value)
                                )
                              }
                              className="input"
                              placeholder="2"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Reward multiple (e.g., 2 = 1:2)
                            </p>
                          </div>

                          <div>
                            <label className="label">
                              Max Risk per Trade (%)
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              min="0.1"
                              max="10"
                              value={riskProfileFormData.maxRiskPerTrade}
                              onChange={(e) =>
                                handleRiskProfileFieldChange(
                                  "maxRiskPerTrade",
                                  parseFloat(e.target.value)
                                )
                              }
                              className="input"
                              placeholder="2"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              % of account to risk
                            </p>
                          </div>
                        </div>

                        {/* Risk Amount Settings */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="label flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={riskProfileFormData.usePercentage}
                                onChange={(e) =>
                                  handleRiskProfileFieldChange(
                                    "usePercentage",
                                    e.target.checked
                                  )
                                }
                                className="rounded"
                              />
                              <span>Use Account Percentage</span>
                            </label>
                            {riskProfileFormData.usePercentage ? (
                              <input
                                type="number"
                                step="0.1"
                                min="0.1"
                                max="10"
                                value={riskProfileFormData.accountPercentage}
                                onChange={(e) =>
                                  handleRiskProfileFieldChange(
                                    "accountPercentage",
                                    parseFloat(e.target.value)
                                  )
                                }
                                className="input mt-2"
                                placeholder="2"
                              />
                            ) : (
                              <input
                                type="number"
                                step="1"
                                min="1"
                                value={riskProfileFormData.riskPerTradeAmount}
                                onChange={(e) =>
                                  handleRiskProfileFieldChange(
                                    "riskPerTradeAmount",
                                    parseFloat(e.target.value)
                                  )
                                }
                                className="input mt-2"
                                placeholder="100"
                              />
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                              {riskProfileFormData.usePercentage
                                ? "% of account"
                                : "Fixed dollar amount"}
                            </p>
                          </div>

                          <div>
                            <label className="label">
                              {riskProfileFormData.instrumentType === "forex"
                                ? "Pip Risk/Profit"
                                : "Point Risk/Profit"}
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="number"
                                step="0.1"
                                min="0.1"
                                value={riskProfileFormData.pointRisk}
                                onChange={(e) =>
                                  handleRiskProfileFieldChange(
                                    "pointRisk",
                                    parseFloat(e.target.value)
                                  )
                                }
                                className="input"
                                placeholder="10"
                              />
                              <input
                                type="number"
                                step="0.1"
                                min="0.1"
                                value={riskProfileFormData.pointProfit}
                                onChange={(e) =>
                                  handleRiskProfileFieldChange(
                                    "pointProfit",
                                    parseFloat(e.target.value)
                                  )
                                }
                                className="input"
                                placeholder="20"
                              />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {riskProfileFormData.instrumentType === "forex"
                                ? "Pips to risk / target"
                                : "Points to risk / target"}
                            </p>
                          </div>
                        </div>

                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                          <h4 className="font-medium text-blue-900 mb-2">
                            Risk Profile Summary
                          </h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-blue-700">Ratio:</span>
                              <span className="ml-2 font-medium">
                                {riskProfileFormData.riskRatio}:
                                {riskProfileFormData.rewardRatio}
                              </span>
                            </div>
                            <div>
                              <span className="text-blue-700">
                                Risk per Trade:
                              </span>
                              <span className="ml-2 font-medium">
                                {riskProfileFormData.usePercentage
                                  ? `${riskProfileFormData.accountPercentage}% of account`
                                  : `$${riskProfileFormData.riskPerTradeAmount}`}
                              </span>
                            </div>
                            <div>
                              <span className="text-blue-700">
                                {riskProfileFormData.instrumentType === "forex"
                                  ? "Pip"
                                  : "Point"}{" "}
                                Risk:
                              </span>
                              <span className="ml-2 font-medium">
                                {riskProfileFormData.pointRisk}
                              </span>
                            </div>
                            <div>
                              <span className="text-blue-700">
                                {riskProfileFormData.instrumentType === "forex"
                                  ? "Pip"
                                  : "Point"}{" "}
                                Target:
                              </span>
                              <span className="ml-2 font-medium">
                                {riskProfileFormData.pointProfit}
                              </span>
                            </div>
                          </div>
                          {riskProfileFormData.instrumentType === "forex" &&
                            riskProfileFormData.currencyPairs.length > 0 && (
                              <div className="mt-2">
                                <span className="text-blue-700">
                                  Currency Pairs:
                                </span>
                                <span className="ml-2 font-medium">
                                  {riskProfileFormData.currencyPairs.join(", ")}
                                </span>
                              </div>
                            )}
                        </div>
                      </div>

                      <div className="flex items-center justify-end space-x-3 pt-6 mt-6 border-t border-gray-200">
                        <button
                          onClick={() => setIsCreatingRiskProfile(false)}
                          className="btn btn-secondary"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveRiskProfile}
                          className="btn btn-primary flex items-center space-x-2"
                        >
                          <Save className="w-4 h-4" />
                          <span>
                            {editingRiskProfile
                              ? "Update Profile"
                              : "Create Profile"}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Risk Profiles List */}
                <div className="space-y-3">
                  {riskProfiles.map((profile) => (
                    <div
                      key={profile.id}
                      className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium text-gray-900">
                              {profile.name}
                            </h3>
                            {profile.isDefault && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                <Star className="w-3 h-3 mr-1" />
                                Default
                              </span>
                            )}
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {profile.riskRatio}:{profile.rewardRatio} R/R
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {profile.description}
                          </p>

                          <div className="mt-2 flex flex-wrap gap-2">
                            {profile.strategy && (
                              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                                📈 {profile.strategy}
                              </span>
                            )}
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-800">
                              🎯 {profile.maxRiskPerTrade}% max risk
                            </span>
                            {profile.instrumentType && (
                              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-indigo-100 text-indigo-800">
                                🔧{" "}
                                {profile.instrumentType
                                  .charAt(0)
                                  .toUpperCase() +
                                  profile.instrumentType.slice(1)}
                              </span>
                            )}
                            {profile.usePercentage ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-emerald-100 text-emerald-800">
                                💰 {profile.accountPercentage}% of account
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-emerald-100 text-emerald-800">
                                💵 ${profile.riskPerTradeAmount} fixed
                              </span>
                            )}
                            {profile.pointRisk && (
                              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-orange-100 text-orange-800">
                                📊 {profile.pointRisk}/{profile.pointProfit}{" "}
                                {profile.instrumentType === "forex"
                                  ? "pips"
                                  : "pts"}
                              </span>
                            )}
                          </div>

                          {/* Currency Pairs for Forex */}
                          {profile.instrumentType === "forex" &&
                            profile.currencyPairs &&
                            profile.currencyPairs.length > 0 && (
                              <div className="mt-2">
                                <div className="flex flex-wrap gap-1">
                                  <span className="text-xs text-gray-500 mr-1">
                                    Pairs:
                                  </span>
                                  {profile.currencyPairs
                                    .slice(0, 3)
                                    .map((pair) => (
                                      <span
                                        key={pair}
                                        className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
                                      >
                                        {pair}
                                      </span>
                                    ))}
                                  {profile.currencyPairs.length > 3 && (
                                    <span className="text-xs text-gray-500">
                                      +{profile.currencyPairs.length - 3} more
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                          <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                            <span>Created {profile.createdAt}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => toggleRiskProfileDefault(profile.id)}
                            className="text-gray-400 hover:text-yellow-500"
                            title="Toggle default"
                          >
                            {profile.isDefault ? (
                              <Star className="w-4 h-4 fill-current" />
                            ) : (
                              <StarOff className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleEditRiskProfile(profile)}
                            className="text-gray-400 hover:text-blue-600"
                            title="Edit profile"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDuplicateRiskProfile(profile)}
                            className="text-gray-400 hover:text-green-600"
                            title="Duplicate profile"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteRiskProfile(profile.id)}
                            className="text-gray-400 hover:text-red-600"
                            title="Delete profile"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {riskProfiles.length === 0 && !isCreatingRiskProfile && (
                    <div className="text-center py-12">
                      <Target className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">
                        No risk profiles yet
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Get started by creating your first risk management
                        profile.
                      </p>
                      <div className="mt-4">
                        <button
                          onClick={handleCreateNewRiskProfile}
                          className="btn btn-primary flex items-center space-x-2"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Create Profile</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Risk Profile Analytics Section */}
                  {riskProfiles.length > 0 && (
                    <div className="mt-8 p-6 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <BarChart className="w-5 h-5 mr-2 text-blue-600" />
                        Risk Profile Insights
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-4 rounded-lg border border-gray-100">
                          <h5 className="font-medium text-gray-700 mb-2">
                            📊 Profile Distribution
                          </h5>
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>Futures Profiles:</span>
                              <span className="font-medium">
                                {
                                  riskProfiles.filter(
                                    (p) => p.instrumentType === "futures"
                                  ).length
                                }
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Forex Profiles:</span>
                              <span className="font-medium">
                                {
                                  riskProfiles.filter(
                                    (p) => p.instrumentType === "forex"
                                  ).length
                                }
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Other Instruments:</span>
                              <span className="font-medium">
                                {
                                  riskProfiles.filter(
                                    (p) =>
                                      !["futures", "forex"].includes(
                                        p.instrumentType
                                      )
                                  ).length
                                }
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white p-4 rounded-lg border border-gray-100">
                          <h5 className="font-medium text-gray-700 mb-2">
                            ⚖️ Risk Tolerance
                          </h5>
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>Conservative (&lt;2% risk):</span>
                              <span className="font-medium">
                                {
                                  riskProfiles.filter(
                                    (p) => p.maxRiskPerTrade < 2
                                  ).length
                                }
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Moderate (2-3% risk):</span>
                              <span className="font-medium">
                                {
                                  riskProfiles.filter(
                                    (p) =>
                                      p.maxRiskPerTrade >= 2 &&
                                      p.maxRiskPerTrade <= 3
                                  ).length
                                }
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Aggressive (&gt;3% risk):</span>
                              <span className="font-medium">
                                {
                                  riskProfiles.filter(
                                    (p) => p.maxRiskPerTrade > 3
                                  ).length
                                }
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white p-4 rounded-lg border border-gray-100">
                          <h5 className="font-medium text-gray-700 mb-2">
                            🎯 Reward Targets
                          </h5>
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>Average R/R Ratio:</span>
                              <span className="font-medium">
                                1:
                                {(
                                  riskProfiles.reduce(
                                    (sum, p) => sum + p.rewardRatio,
                                    0
                                  ) / riskProfiles.length
                                ).toFixed(1)}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Highest R/R:</span>
                              <span className="font-medium">
                                1:
                                {Math.max(
                                  ...riskProfiles.map((p) => p.rewardRatio)
                                )}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Most Conservative:</span>
                              <span className="font-medium">
                                1:
                                {Math.min(
                                  ...riskProfiles.map((p) => p.rewardRatio)
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <strong>💡 Smart Suggestions:</strong> Consider
                          creating profiles for different market conditions and
                          trading sessions. Forex traders often benefit from
                          separate profiles for major vs. minor pairs, while
                          futures traders may want different profiles for
                          trending vs. ranging markets.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Data Management Tab */}
          {activeTab === "data" && (
            <div>
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
        </div>
      </div>
    </div>
  );
};

export default Settings;
