import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
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

  const handleConnectBroker = () => {
    navigate("/brokers");
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
          onClick={handleConnectBroker}
          className="btn btn-secondary text-sm"
        >
          Connect Broker
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
              <RefreshCw
                className={`w-4 h-4 ${
                  syncStatus === "syncing" ? "animate-spin" : ""
                }`}
              />
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

      {/* Quick Status */}
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
          <span>
            No broker connected. Click "Connect Broker" to authenticate with
            your trading platform using OAuth 2.0.
          </span>
        )}
      </div>
    </div>
  );
};

export default BrokerConfiguration;
