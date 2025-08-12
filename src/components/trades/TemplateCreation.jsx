import React, { useState, useEffect } from "react";
import {
  Plus,
  Save,
  Copy,
  Edit3,
  Trash2,
  Eye,
  Star,
  StarOff,
  Settings,
  CheckCircle,
  AlertCircle,
  Layout,
  Minus,
  Check,
} from "lucide-react";
import toast from "react-hot-toast";

const TemplateCreation = () => {
  const [templates, setTemplates] = useState([
    // Start with empty templates - user creates their own
  ]);

  // Load risk profiles from settings
  const [riskProfiles, setRiskProfiles] = useState(() => {
    const stored = localStorage.getItem("tradeJournalRiskProfiles");
    return stored ? JSON.parse(stored) : [];
  });

  // Load risk profiles on component mount and update when localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem("tradeJournalRiskProfiles");
      const profiles = stored ? JSON.parse(stored) : [];
      setRiskProfiles(profiles);
    };

    // Listen for storage events
    window.addEventListener("storage", handleStorageChange);

    // Also check periodically for updates in same tab
    const interval = setInterval(handleStorageChange, 1000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const [isCreating, setIsCreating] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    fields: {
      instrumentType: "",
      tradeType: "",
      strategy: "",
      setup: "",
      marketCondition: "",
      entryPrice: "",
      stopLoss: "",
      takeProfit: "",
      quantity: "",
      defaultRiskProfile: "",
      status: "Open",
    },
  });

  // Available fields that can be included in templates
  const availableFields = [
    { key: 'instrumentType', label: 'Instrument Type', category: 'Basic Info' },
    { key: 'tradeType', label: 'Trade Type', category: 'Basic Info' },
    { key: 'strategy', label: 'Strategy', category: 'Trading Setup' },
    { key: 'setup', label: 'Setup', category: 'Trading Setup' },
    { key: 'marketCondition', label: 'Market Condition', category: 'Trading Setup' },
    { key: 'entryPrice', label: 'Entry Price', category: 'Price & Risk' },
    { key: 'stopLoss', label: 'Stop Loss', category: 'Price & Risk' },
    { key: 'takeProfit', label: 'Take Profit', category: 'Price & Risk' },
    { key: 'quantity', label: 'Quantity', category: 'Price & Risk' },
    { key: 'defaultRiskProfile', label: 'Default Risk Profile', category: 'Price & Risk' },
    { key: 'status', label: 'Status', category: 'Basic Info' }
  ];

  // State to track which fields are included in the template
  const [includedFields, setIncludedFields] = useState(() => {
    const defaultFields = ['instrumentType', 'tradeType', 'strategy', 'setup', 'defaultRiskProfile'];
    return new Set(defaultFields);
  });

  const instrumentTypes = ["Stocks", "Options", "Futures", "Forex", "Crypto"];
  const tradeTypes = ["Long", "Short"];
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

  const strategies = getUserManagedStrategies();
  const setups = getUserManagedSetups();
  const marketConditions = [
    "Trending Up",
    "Trending Down",
    "Consolidating",
    "Volatile",
    "Low Volume",
  ];
  const statuses = ["Open", "Closed", "Partial"];

  const handleCreateNew = () => {
    setIsCreating(true);
    setEditingTemplate(null);
    setFormData({
      name: "",
      description: "",
      fields: {
        instrumentType: "",
        tradeType: "",
        strategy: "",
        setup: "",
        marketCondition: "",
        entryPrice: "",
        stopLoss: "",
        takeProfit: "",
        quantity: "",
        defaultRiskProfile: "",
        status: "Open",
      },
    });
    // Reset to default included fields
    const defaultFields = ['instrumentType', 'tradeType', 'strategy', 'setup', 'defaultRiskProfile'];
    setIncludedFields(new Set(defaultFields));
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setIsCreating(true);
    setFormData({
      name: template.name,
      description: template.description,
      fields: { ...template.fields },
    });
    // Set included fields based on template data
    const templateIncludedFields = template.includedFields || Object.keys(template.fields);
    setIncludedFields(new Set(templateIncludedFields));
  };

  const toggleField = (fieldKey) => {
    setIncludedFields(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fieldKey)) {
        newSet.delete(fieldKey);
        // Clear the field value when removing
        setFormData(prevFormData => ({
          ...prevFormData,
          fields: {
            ...prevFormData.fields,
            [fieldKey]: ''
          }
        }));
      } else {
        newSet.add(fieldKey);
      }
      return newSet;
    });
  };

  const selectAllFields = () => {
    setIncludedFields(new Set(availableFields.map(field => field.key)));
  };

  const deselectAllFields = () => {
    setIncludedFields(new Set());
    // Clear all field values
    setFormData(prevFormData => ({
      ...prevFormData,
      fields: Object.keys(prevFormData.fields).reduce((acc, key) => ({
        ...acc,
        [key]: key === 'status' ? 'Open' : '' // Keep default status
      }), {})
    }));
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error("Template name is required");
      return;
    }

    if (editingTemplate) {
      // Update existing template
      setTemplates((prev) =>
        prev.map((template) =>
          template.id === editingTemplate.id
            ? {
                ...template,
                ...formData,
                includedFields: Array.from(includedFields),
                updatedAt: new Date().toISOString().split("T")[0],
              }
            : template
        )
      );
      toast.success("Template updated successfully");
    } else {
      // Create new template
      const newTemplate = {
        id: Date.now(),
        ...formData,
        includedFields: Array.from(includedFields),
        isDefault: false,
        createdAt: new Date().toISOString().split("T")[0],
        usageCount: 0,
      };
      setTemplates((prev) => [...prev, newTemplate]);
      toast.success("Template created successfully");
    }

    setIsCreating(false);
    setEditingTemplate(null);
  };

  const handleDelete = (templateId) => {
    if (window.confirm("Are you sure you want to delete this template?")) {
      setTemplates((prev) =>
        prev.filter((template) => template.id !== templateId)
      );
      toast.success("Template deleted successfully");
    }
  };

  const handleDuplicate = (template) => {
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

  const toggleDefault = (templateId) => {
    setTemplates((prev) =>
      prev.map((template) => ({
        ...template,
        isDefault:
          template.id === templateId ? !template.isDefault : template.isDefault,
      }))
    );
  };

  const handleFieldChange = (fieldName, value) => {
    setFormData((prev) => ({
      ...prev,
      fields: {
        ...prev.fields,
        [fieldName]: value,
      },
    }));
  };

  return (
    <div className="template-creation space-y-6">
      {/* Header Actions */}
      <div className="template-creation__header flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Trade Templates</h2>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Create reusable templates to speed up trade entry
          </p>
        </div>
        <button
          onClick={handleCreateNew}
          className="btn btn-primary inline-flex items-center px-4 py-2 text-sm font-medium rounded-md"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Template
        </button>
      </div>

      {/* Template Creation/Edit Form */}
      {isCreating && (
        <div className="template-creation__form card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              {editingTemplate ? "Edit Template" : "Create New Template"}
            </h3>
            <button
              onClick={() => setIsCreating(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter template name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe when to use this template"
                />
              </div>

              {/* Field Selection */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Template Fields
                  </label>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={selectAllFields}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Select All
                    </button>
                    <span className="text-xs text-gray-400">|</span>
                    <button
                      type="button"
                      onClick={deselectAllFields}
                      className="text-xs text-gray-600 hover:text-gray-800 font-medium"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <p className="text-sm text-gray-600 mb-3">
                    Select which fields to include in this template ({includedFields.size} selected):
                  </p>
                  
                  {/* Group fields by category */}
                  {['Basic Info', 'Trading Setup', 'Price & Risk'].map(category => (
                    <div key={category} className="space-y-2">
                      <h5 className="text-sm font-medium text-gray-700 border-b border-gray-200 pb-1">
                        {category}
                      </h5>
                      <div className="grid grid-cols-1 gap-2 ml-2">
                        {availableFields
                          .filter(field => field.category === category)
                          .map(field => (
                            <label key={field.key} className={`flex items-center justify-between space-x-2 text-sm cursor-pointer hover:bg-gray-100 p-2 rounded border-2 transition-all duration-200 ${
                              includedFields.has(field.key) 
                                ? 'border-blue-200 bg-blue-50' 
                                : 'border-transparent'
                            }`}>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={includedFields.has(field.key)}
                                  onChange={() => toggleField(field.key)}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className={includedFields.has(field.key) ? 'text-gray-900 font-medium' : 'text-gray-500'}>
                                  {field.label}
                                </span>
                              </div>
                              {includedFields.has(field.key) && (
                                <Check className="w-4 h-4 text-blue-600" />
                              )}
                            </label>
                          ))
                        }
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Template Fields */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">
                Default Field Values
              </h4>
              
              {includedFields.size === 0 ? (
                <div className="text-sm text-gray-500 text-center py-8 bg-gray-50 rounded-lg">
                  No fields selected. Use the checkboxes on the left to add fields to your template.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {/* Render fields conditionally based on includedFields */}
                  {includedFields.has('instrumentType') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Instrument Type
                      </label>
                      <select
                        value={formData.fields.instrumentType}
                        onChange={(e) =>
                          handleFieldChange("instrumentType", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select type</option>
                        {instrumentTypes.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {includedFields.has('tradeType') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Trade Type
                      </label>
                      <select
                        value={formData.fields.tradeType}
                        onChange={(e) =>
                          handleFieldChange("tradeType", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select type</option>
                        {tradeTypes.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {includedFields.has('strategy') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Strategy
                      </label>
                      <select
                        value={formData.fields.strategy}
                        onChange={(e) =>
                          handleFieldChange("strategy", e.target.value)
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

                  {includedFields.has('setup') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Setup
                      </label>
                      <select
                        value={formData.fields.setup}
                        onChange={(e) => handleFieldChange("setup", e.target.value)}
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

                  {includedFields.has('marketCondition') && (
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Market Condition
                      </label>
                      <select
                        value={formData.fields.marketCondition}
                        onChange={(e) =>
                          handleFieldChange("marketCondition", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select condition</option>
                        {marketConditions.map((condition) => (
                          <option key={condition} value={condition}>
                            {condition}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {includedFields.has('entryPrice') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Entry Price
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.fields.entryPrice}
                        onChange={(e) =>
                          handleFieldChange("entryPrice", e.target.value)
                        }
                        placeholder="0.00"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}

                  {includedFields.has('defaultRiskProfile') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Default Risk Profile
                      </label>
                      {riskProfiles.length > 0 ? (
                        <select
                          value={formData.fields.defaultRiskProfile}
                          onChange={(e) =>
                            handleFieldChange("defaultRiskProfile", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select risk profile</option>
                          {riskProfiles.map((profile) => (
                            <option
                              key={profile.id}
                              value={profile.name}
                            >
                              {profile.name} ({profile.riskRatio}:{profile.rewardRatio})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-500 text-sm">
                          No risk profiles available - Create them in Settings
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Auto-apply this risk profile when using this template
                      </p>
                    </div>
                  )}

                  {includedFields.has('stopLoss') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Stop Loss
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.fields.stopLoss}
                        onChange={(e) =>
                          handleFieldChange("stopLoss", e.target.value)
                        }
                        placeholder="0.00"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}

                  {includedFields.has('takeProfit') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Take Profit
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.fields.takeProfit}
                        onChange={(e) =>
                          handleFieldChange("takeProfit", e.target.value)
                        }
                        placeholder="0.00"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}

                  {includedFields.has('quantity') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        value={formData.fields.quantity}
                        onChange={(e) =>
                          handleFieldChange("quantity", e.target.value)
                        }
                        placeholder="100"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}

                  {includedFields.has('status') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <select
                        value={formData.fields.status}
                        onChange={(e) => handleFieldChange("status", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {statuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Save className="mr-2 h-4 w-4" />
              {editingTemplate ? "Update Template" : "Create Template"}
            </button>
          </div>
        </div>
      )}

      {/* Templates List */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {templates.map((template) => (
          <div
            key={template.id}
            className="bg-white shadow rounded-lg overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-medium text-gray-900">
                      {template.name}
                    </h3>
                    {template.isDefault && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <Star className="w-3 h-3 mr-1" />
                        Default
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-600">
                    {template.description}
                  </p>
                </div>
                <button
                  onClick={() => toggleDefault(template.id)}
                  className="text-gray-400 hover:text-yellow-500"
                >
                  {template.isDefault ? (
                    <Star className="w-5 h-5 fill-current" />
                  ) : (
                    <StarOff className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Template Preview */}
              <div className="mt-4 space-y-2">
                {/* Show included fields count */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Included Fields:</span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {template.includedFields ? template.includedFields.length : Object.keys(template.fields).filter(key => template.fields[key]).length} fields
                  </span>
                </div>
                
                {/* Show field preview */}
                {template.includedFields 
                  ? template.includedFields.slice(0, 3).map(fieldKey => {
                      const fieldValue = template.fields[fieldKey];
                      if (!fieldValue) return null;
                      return (
                        <div key={fieldKey} className="flex justify-between text-sm">
                          <span className="text-gray-500 capitalize">
                            {availableFields.find(f => f.key === fieldKey)?.label || fieldKey.replace(/([A-Z])/g, " $1").trim()}:
                          </span>
                          <span className="text-gray-900 truncate ml-2">{fieldValue}</span>
                        </div>
                      );
                    })
                  : Object.entries(template.fields)
                      .slice(0, 3)
                      .map(([key, value]) => {
                        if (!value) return null;
                        return (
                          <div key={key} className="flex justify-between text-sm">
                            <span className="text-gray-500 capitalize">
                              {key.replace(/([A-Z])/g, " $1").trim()}:
                            </span>
                            <span className="text-gray-900 truncate ml-2">{value}</span>
                          </div>
                        );
                      })
                }
              </div>

              {/* Stats */}
              <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                <span>Used {template.usageCount} times</span>
                <span>Created {template.createdAt}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-gray-50 px-6 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleEdit(template)}
                  className="text-gray-400 hover:text-blue-600"
                  title="Edit template"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDuplicate(template)}
                  className="text-gray-400 hover:text-green-600"
                  title="Duplicate template"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(template.id)}
                  className="text-gray-400 hover:text-red-600"
                  title="Delete template"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <button
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                title="Use template"
              >
                Use Template
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {templates.length === 0 && !isCreating && (
        <div className="text-center py-12">
          <Layout className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No templates yet
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating your first trade template.
          </p>
          <div className="mt-6">
            <button
              onClick={handleCreateNew}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Template
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateCreation;
