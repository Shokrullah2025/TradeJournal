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
  Shield,
  Key,
  DollarSign,
} from "lucide-react";
import { useBroker } from "../../context/BrokerContext";

const BrokerConfiguration = ({ onTradesImported }) => {
  const navigate = useNavigate();
  const {
    brokers,
    selectedBroker,
    propFirm,
    isConnected,
    connectionError,
    accounts,
    syncStatus,
    lastSync,
    autoSync,
    syncInterval,
    syncTrades,
    toggleAutoSync,
    setSyncInterval,
  } = useBroker();

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

  const formatBalance = (amount) => {
    if (amount == null) return null;
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
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
  const connectedAccount = accounts[0] ?? null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Settings className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Broker
          </h3>
          <div className="flex items-center space-x-1 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded-full">
            <Shield className="w-3 h-3" />
            <span>Secure</span>
          </div>
        </div>
        {!isConnected && (
          <button
            onClick={handleConnectBroker}
            className="btn btn-secondary text-sm"
            data-testid="broker-config-connect-btn"
          >
            Connect
          </button>
        )}
      </div>

      {/* Connection Status */}
      {currentBroker && (
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">{currentBroker.logo}</span>
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  {propFirm ?? currentBroker.name}
                </div>
                {propFirm && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">via {currentBroker.name}</div>
                )}
                <div className="text-xs text-blue-600 dark:text-blue-400 flex items-center space-x-1 mt-0.5">
                  <Key className="w-3 h-3" />
                  <span>OAuth 2.0</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {isConnected ? (
                <div className="flex items-center space-x-1 text-green-600 dark:text-green-400">
                  <Wifi className="w-4 h-4" />
                  <span className="text-sm font-medium">Connected</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1 text-red-500 dark:text-red-400">
                  <WifiOff className="w-4 h-4" />
                  <span className="text-sm font-medium">Disconnected</span>
                </div>
              )}
            </div>
          </div>

          {/* Balance */}
          {connectedAccount && formatBalance(connectedAccount.balance) && (
            <div className="mt-2 flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-300">
              <DollarSign className="w-3.5 h-3.5 text-green-500" />
              <span className="font-medium" data-testid="broker-config-balance">
                {formatBalance(connectedAccount.balance)}
              </span>
            </div>
          )}

          {connectionError && (
            <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-400">
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
      <div className="text-sm text-gray-500 dark:text-gray-400">
        {isConnected ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>{propFirm ?? currentBroker?.name}</span>
            {autoSync && (
              <>
                <span>•</span>
                <span className="text-green-600 dark:text-green-400">Auto-sync on</span>
              </>
            )}
          </div>
        ) : (
          <span>No broker connected. Click Connect to link your prop firm account.</span>
        )}
      </div>
    </div>
  );
};

export default BrokerConfiguration;
