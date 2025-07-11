import React, { useState } from "react";
import {
  Settings as SettingsIcon,
  Download,
  Upload,
  Trash2,
  Save,
} from "lucide-react";
import { useTrades } from "../context/TradeContext";
import { exportToExcel, importFromFile } from "../utils/exportUtils";
import toast from "react-hot-toast";

const Settings = () => {
  const { trades } = useTrades();
  const [preferences, setPreferences] = useState({
    currency: "USD",
    timezone: "America/New_York",
    dateFormat: "MM/dd/yyyy",
    defaultRiskPercentage: 2,
    notifications: true,
    autoBackup: false,
    theme: "light",
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">
            Manage your account preferences and data
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trading Preferences */}
        <div className="card">
          <div className="flex items-center space-x-3 mb-6">
            <SettingsIcon className="w-5 h-5 text-primary-600" />
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
