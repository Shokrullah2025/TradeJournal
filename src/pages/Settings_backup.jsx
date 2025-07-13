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
  Bell,
  Palette,
  Shield,
} from "lucide-react";
import { useTrades } from "../context/TradeContext";
import { exportToExcel, importFromFile } from "../utils/exportUtils";
import toast from "react-hot-toast";

const Settings = () => {
  const { trades } = useTrades();
  const [activeTab, setActiveTab] = useState('general');

  const tabs = [
    {
      id: 'general',
      name: 'General',
      icon: SettingsIcon,
      description: 'Basic preferences and display settings'
    },
    {
      id: 'templates',
      name: 'Trade Templates',
      icon: Layout,
      description: 'Manage your trade entry templates'
    },
    {
      id: 'data',
      name: 'Data Management',
      icon: Database,
      description: 'Import, export, and backup your data'
    }
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
      name: 'Day Trade Long',
      description: 'Standard day trading template for long positions',
      fields: {
        instrumentType: 'Stocks',
        tradeType: 'Long',
        strategy: 'Day Trading',
        setup: 'Breakout',
        marketCondition: 'Trending Up'
      },
      isDefault: true,
      createdAt: '2025-07-01',
      usageCount: 45
    },
    {
      id: 2,
      name: 'Swing Trade',
      description: 'Multi-day swing trading template',
      fields: {
        instrumentType: 'Stocks',
        tradeType: 'Long',
        strategy: 'Swing Trading',
        setup: 'Support Bounce',
        marketCondition: 'Consolidating'
      },
      isDefault: false,
      createdAt: '2025-07-05',
      usageCount: 23
    }
  ]);

  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateFormData, setTemplateFormData] = useState({
    name: '',
    description: '',
    fields: {
      instrumentType: '',
      tradeType: '',
      strategy: '',
      setup: '',
      marketCondition: ''
    }
  });

  const instrumentTypes = ['Stocks', 'Options', 'Futures', 'Forex', 'Crypto'];
  const tradeTypes = ['Long', 'Short'];
  const strategies = ['Day Trading', 'Swing Trading', 'Scalp Trading', 'Position Trading', 'Momentum Trading'];
  const setups = ['Breakout', 'Support Bounce', 'Resistance Rejection', 'Pullback', 'Reversal'];
  const marketConditions = ['Trending Up', 'Trending Down', 'Consolidating', 'Volatile', 'Low Volume'];

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
      name: '',
      description: '',
      fields: {
        instrumentType: '',
        tradeType: '',
        strategy: '',
        setup: '',
        marketCondition: ''
      }
    });
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setIsCreatingTemplate(true);
    setTemplateFormData({
      name: template.name,
      description: template.description,
      fields: { ...template.fields }
    });
  };

  const handleSaveTemplate = () => {
    if (!templateFormData.name.trim()) {
      toast.error('Template name is required');
      return;
    }

    if (editingTemplate) {
      // Update existing template
      setTemplates(prev => prev.map(template => 
        template.id === editingTemplate.id 
          ? { ...template, ...templateFormData, updatedAt: new Date().toISOString().split('T')[0] }
          : template
      ));
      toast.success('Template updated successfully');
    } else {
      // Create new template
      const newTemplate = {
        id: Date.now(),
        ...templateFormData,
        isDefault: false,
        createdAt: new Date().toISOString().split('T')[0],
        usageCount: 0
      };
      setTemplates(prev => [...prev, newTemplate]);
      toast.success('Template created successfully');
    }

    setIsCreatingTemplate(false);
    setEditingTemplate(null);
  };

  const handleDeleteTemplate = (templateId) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      setTemplates(prev => prev.filter(template => template.id !== templateId));
      toast.success('Template deleted successfully');
    }
  };

  const handleDuplicateTemplate = (template) => {
    const newTemplate = {
      ...template,
      id: Date.now(),
      name: `${template.name} (Copy)`,
      isDefault: false,
      createdAt: new Date().toISOString().split('T')[0],
      usageCount: 0
    };
    setTemplates(prev => [...prev, newTemplate]);
    toast.success('Template duplicated successfully');
  };

  const toggleTemplateDefault = (templateId) => {
    setTemplates(prev => prev.map(template => ({
      ...template,
      isDefault: template.id === templateId ? !template.isDefault : template.isDefault
    })));
  };

  const handleTemplateFieldChange = (fieldName, value) => {
    setTemplateFormData(prev => ({
      ...prev,
      fields: {
        ...prev.fields,
        [fieldName]: value
      }
    }));
  };

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
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group relative min-w-0 overflow-hidden py-4 px-1 text-center text-sm font-medium focus:z-10 focus:outline-none transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Icon className={`h-5 w-5 ${
                    activeTab === tab.id ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'
                  }`} />
                  <span className="font-medium">{tab.name}</span>
                </div>
                <p className={`mt-1 text-xs ${
                  activeTab === tab.id ? 'text-blue-500' : 'text-gray-400'
                }`}>
                  {tab.description}
                </p>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'general' && (
          <div className="max-w-2xl space-y-6">
            {/* Trading Preferences */}
            <div className="card">
              <div className="flex items-center space-x-3 mb-6">
                <User className="w-5 h-5 text-primary-600" />
                <h2 className="text-xl font-semibold text-gray-900">
                  Trading Preferences
                </h2>
              </div>

          <div className="space-y-4">
            <div>
              <label className="label">Default Currency</label>
              <select
                value={preferences.currency}
                onChange={(e) =>
                  setPreferences({ ...preferences, currency: e.target.value })
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
                  setPreferences({ ...preferences, timezone: e.target.value })
                }
                className="input"
              >
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
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
                  setPreferences({ ...preferences, dateFormat: e.target.value })
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

            <button
              onClick={handleSavePreferences}
              className="btn btn-primary w-full flex items-center justify-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>Save Preferences</span>
            </button>
          </div>
        </div>

        {/* Trade Templates */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Layout className="w-5 h-5 text-primary-600" />
              <h2 className="text-xl font-semibold text-gray-900">
                Trade Templates
              </h2>
            </div>
            <button
              onClick={handleCreateNewTemplate}
              className="btn btn-secondary text-sm flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>New Template</span>
            </button>
          </div>

          {/* Template Creation/Edit Form */}
          {isCreatingTemplate && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingTemplate ? 'Edit Template' : 'Create New Template'}
                </h3>
                <button
                  onClick={() => setIsCreatingTemplate(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="label">Template Name *</label>
                  <input
                    type="text"
                    value={templateFormData.name}
                    onChange={(e) => setTemplateFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="input"
                    placeholder="Enter template name"
                  />
                </div>

                <div>
                  <label className="label">Description</label>
                  <textarea
                    value={templateFormData.description}
                    onChange={(e) => setTemplateFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                    className="input"
                    placeholder="Describe when to use this template"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Instrument Type</label>
                    <select
                      value={templateFormData.fields.instrumentType}
                      onChange={(e) => handleTemplateFieldChange('instrumentType', e.target.value)}
                      className="input"
                    >
                      <option value="">Select type</option>
                      {instrumentTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label">Trade Type</label>
                    <select
                      value={templateFormData.fields.tradeType}
                      onChange={(e) => handleTemplateFieldChange('tradeType', e.target.value)}
                      className="input"
                    >
                      <option value="">Select type</option>
                      {tradeTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label">Strategy</label>
                    <select
                      value={templateFormData.fields.strategy}
                      onChange={(e) => handleTemplateFieldChange('strategy', e.target.value)}
                      className="input"
                    >
                      <option value="">Select strategy</option>
                      {strategies.map(strategy => (
                        <option key={strategy} value={strategy}>{strategy}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label">Setup</label>
                    <select
                      value={templateFormData.fields.setup}
                      onChange={(e) => handleTemplateFieldChange('setup', e.target.value)}
                      className="input"
                    >
                      <option value="">Select setup</option>
                      {setups.map(setup => (
                        <option key={setup} value={setup}>{setup}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label">Market Condition</label>
                  <select
                    value={templateFormData.fields.marketCondition}
                    onChange={(e) => handleTemplateFieldChange('marketCondition', e.target.value)}
                    className="input"
                  >
                    <option value="">Select condition</option>
                    {marketConditions.map(condition => (
                      <option key={condition} value={condition}>{condition}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
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
                    <span>{editingTemplate ? 'Update Template' : 'Create Template'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Templates List */}
          <div className="space-y-3">
            {templates.map((template) => (
              <div key={template.id} className="p-4 bg-white border border-gray-200 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium text-gray-900">{template.name}</h3>
                      {template.isDefault && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <Star className="w-3 h-3 mr-1" />
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                    
                    {/* Template Preview */}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {Object.entries(template.fields).slice(0, 3).map(([key, value]) => {
                        if (!value) return null;
                        return (
                          <span key={key} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
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
                      {template.isDefault ? <Star className="w-4 h-4 fill-current" /> : <StarOff className="w-4 h-4" />}
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
              <div className="text-center py-8">
                <Layout className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No templates yet</h3>
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

        {/* Data Management */}
        <div className="space-y-6">
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Data Management
            </h2>

            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Export Data</h3>
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
                <h3 className="font-medium text-gray-900 mb-2">Import Data</h3>
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

              <div className="pt-4 border-t border-gray-200">
                <h3 className="font-medium text-danger-600 mb-2">
                  Danger Zone
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  Permanently delete all your trading data. This action cannot
                  be undone.
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

          {/* Account Statistics */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Account Statistics
            </h2>

            <div className="grid grid-cols-2 gap-4">
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
                <div className="text-sm text-gray-600">Completed Trades</div>
              </div>

              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {new Set(trades.map((t) => t.instrument)).size}
                </div>
                <div className="text-sm text-gray-600">Instruments Traded</div>
              </div>

              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {new Set(trades.map((t) => t.strategy)).size}
                </div>
                <div className="text-sm text-gray-600">Strategies Used</div>
              </div>
            </div>
          </div>

          {/* About */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              About Trade Journal Pro
            </h2>
            <div className="space-y-2 text-sm text-gray-600">
              <p>Version 1.0.0</p>
              <p>
                A comprehensive trading journal application designed to help
                traders track, analyze, and improve their trading performance.
              </p>
              <p className="mt-4">
                <strong>Features include:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Trade logging and management</li>
                <li>Performance analytics and insights</li>
                <li>Risk/reward calculator for futures, stocks, and forex</li>
                <li>Data visualization and reporting</li>
                <li>Export capabilities for external analysis</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
