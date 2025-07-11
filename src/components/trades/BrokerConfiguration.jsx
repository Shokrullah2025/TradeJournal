import React, { useState } from "react";
import {
  Settings,
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ExternalLink,
  Shield,
  Key,
} from "lucide-react";
import { useBroker } from "../../context/BrokerContext";

const BrokerConfiguration = ({ onTradesImported }) => {
  const {
    brokers,
    selectedBroker,
    isConnected,
    isConnecting,
    connectionError,
    accounts,
    selectedAccount,
    syncStatus,
    lastSync,
    autoSync,
    syncInterval,
    connectBroker,
    disconnectBroker,
    syncTrades,
    toggleAutoSync,
    setSyncInterval,
  } = useBroker();

  const [showConfig, setShowConfig] = useState(false);
  const [selectedBrokerKey, setSelectedBrokerKey] = useState(selectedBroker || "");

  const handleBrokerConnect = async (brokerKey) => {
    setSelectedBrokerKey(brokerKey);
    const success = await connectBroker(brokerKey);
    if (success) {
      setShowConfig(false);
    }
  };

  const handleSync = () => {
    syncTrades(onTradesImported);
  };

  const formatLastSync = (date) => {
    if (!date) return "Never";
    return new Date(date).toLocaleString();
  };

  const getSyncStatusIcon = () => {
    switch (syncStatus) {
      case "syncing":
        return <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />;
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "error":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const currentBroker = selectedBroker ? brokers[selectedBroker] : null;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Settings className="w-5 h-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900">
            Broker Integration
          </h3>
          <div className="flex items-center space-x-1 text-sm text-green-600 bg-green-50 px-2 py-1 rounded-full">
            <Shield className="w-3 h-3" />
            <span>OAuth Secure</span>
          </div>
        </div>
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="btn btn-secondary text-sm"
        >
          {showConfig ? "Hide Brokers" : "Connect Broker"}
        </button>
      </div>

      {/* Connection Status */}
      {currentBroker && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">{currentBroker.logo}</span>
              <div>
                <div className="font-medium text-gray-900">
                  {currentBroker.name}
                </div>
                <div className="text-sm text-gray-500">
                  {currentBroker.description}
                </div>
                <div className="text-xs text-blue-600 flex items-center space-x-1 mt-1">
                  <Key className="w-3 h-3" />
                  <span>OAuth 2.0 Authentication</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {isConnected ? (
                <div className="flex items-center space-x-1 text-green-600">
                  <Wifi className="w-4 h-4" />
                  <span className="text-sm font-medium">Connected</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1 text-red-600">
                  <WifiOff className="w-4 h-4" />
                  <span className="text-sm font-medium">Disconnected</span>
                </div>
              )}
            </div>
          </div>

          {connectionError && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              <div className="flex items-center space-x-1">
                <AlertCircle className="w-4 h-4" />
                <span>{connectionError}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sync Controls */}
      {isConnected && (
        <div className="mb-4 p-3 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900">Trade Sync</h4>
            <div className="flex items-center space-x-2">
              {getSyncStatusIcon()}
              <span className="text-sm text-gray-600">
                {syncStatus === "syncing" ? "Syncing..." : "Ready"}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-600">Last sync:</span>
            <span className="text-sm font-medium text-gray-900">
              {formatLastSync(lastSync)}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleSync}
              disabled={syncStatus === "syncing"}
              className="btn btn-primary text-sm flex items-center space-x-1"
            >
              <RefreshCw className={`w-4 h-4 ${syncStatus === "syncing" ? "animate-spin" : ""}`} />
              <span>Sync Now</span>
            </button>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="autoSync"
                checked={autoSync}
                onChange={(e) => toggleAutoSync(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="autoSync" className="text-sm text-gray-700">
                Auto-sync
              </label>
            </div>

            {autoSync && (
              <select
                value={syncInterval}
                onChange={(e) => setSyncInterval(parseInt(e.target.value))}
                className="text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value={60000}>1 minute</option>
                <option value={300000}>5 minutes</option>
                <option value={900000}>15 minutes</option>
                <option value={1800000}>30 minutes</option>
                <option value={3600000}>1 hour</option>
              </select>
            )}
          </div>
        </div>
      )}

      {/* Broker Selection */}
      {showConfig && (
        <div className="space-y-4">
          <div className="border-t border-gray-200 pt-4">
            <h4 className="font-medium text-gray-900 mb-3">Select Your Broker</h4>
            <p className="text-sm text-gray-600 mb-4">
              Click on your broker to securely connect via OAuth 2.0. You'll be redirected to your broker's login page.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(brokers).map(([key, broker]) => (
                <div
                  key={key}
                  onClick={() => handleBrokerConnect(key)}
                  className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                    selectedBrokerKey === key
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  } ${isConnecting ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{broker.logo}</span>
                      <div>
                        <div className="font-medium text-gray-900">
                          {broker.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {broker.description}
                        </div>
                        <div className="text-xs text-blue-600 flex items-center space-x-1 mt-1">
                          <Shield className="w-3 h-3" />
                          <span>OAuth 2.0 Secure</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 text-blue-600">
                      <ExternalLink className="w-4 h-4" />
                      <span className="text-sm">Connect</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* OAuth Info */}
          <div className="border-t border-gray-200 pt-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h5 className="font-medium text-blue-900">Secure OAuth 2.0 Authentication</h5>
                  <p className="text-sm text-blue-700 mt-1">
                    We use OAuth 2.0 for secure authentication. Your login credentials are never shared with our application. 
                    You'll be redirected to your broker's official login page, and we'll only receive an access token to read your trade data.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 pt-4 border-t border-gray-200">
            {isConnected && (
              <button
                onClick={disconnectBroker}
                className="btn btn-secondary text-sm"
              >
                Disconnect
              </button>
            )}
            
            <button
              onClick={() => setShowConfig(false)}
              className="btn btn-secondary text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Quick Status */}
      {!showConfig && (
        <div className="text-sm text-gray-600">
          {isConnected ? (
            <div className="flex items-center space-x-2">
              <span>Connected to {currentBroker?.name}</span>
              <span>•</span>
              <span>{accounts.length} account(s)</span>
              {autoSync && (
                <>
                  <span>•</span>
                  <span>Auto-sync enabled</span>
                </>
              )}
            </div>
          ) : (
            <span>No broker connected. Click "Connect Broker" to authenticate with your trading platform using OAuth 2.0.</span>
          )}
        </div>
      )}
    </div>
  );
};

export default BrokerConfiguration;
