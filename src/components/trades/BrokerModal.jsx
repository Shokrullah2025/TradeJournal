import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  X,
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
  ExternalLink,
  TrendingUp,
} from "lucide-react";
import { useBroker } from "../../context/BrokerContext";

const BrokerModal = ({ isOpen, onClose, onTradesImported }) => {
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

  const [selectedBrokerForConnection, setSelectedBrokerForConnection] = useState("");
  const [selectedAccountType, setSelectedAccountType] = useState("demo");
  const [step, setStep] = useState(1); // 1: Choose broker, 2: Choose account type

  if (!isOpen) return null;

  const handleBrokerSelection = (brokerId) => {
    setSelectedBrokerForConnection(brokerId);
    setStep(2);
  };

  const handleBackToStep1 = () => {
    setStep(1);
    setSelectedBrokerForConnection("");
    setSelectedAccountType("demo");
  };

  const handleConnectBroker = async () => {
    try {
      await connectBroker(selectedBrokerForConnection, { accountType: selectedAccountType });
      // The OAuth flow will redirect to the broker's site and back
    } catch (error) {
      console.error("Failed to connect broker:", error);
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Broker Integration
            </h2>
            <div className="flex items-center space-x-1 text-sm text-green-600 bg-green-50 px-2 py-1 rounded-full">
              <Shield className="w-3 h-3" />
              <span>OAuth Secure</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Current Connection Status */}
          {currentBroker ? (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <span className="text-3xl">{currentBroker.logo}</span>
                  <div>
                    <div className="font-semibold text-gray-900">
                      {currentBroker.name}
                    </div>
                    <div className="text-sm text-gray-600">
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
                      <Wifi className="w-5 h-5" />
                      <span className="font-medium">Connected</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1 text-red-600">
                      <WifiOff className="w-5 h-5" />
                      <span className="font-medium">Disconnected</span>
                    </div>
                  )}
                </div>
              </div>

              {connectionError && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  <div className="flex items-center space-x-1">
                    <AlertCircle className="w-4 h-4" />
                    <span>{connectionError}</span>
                  </div>
                </div>
              )}

              {/* Sync Controls */}
              {isConnected && (
                <div className="p-3 border border-gray-200 rounded-lg">
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

                  <div className="flex items-center space-x-3">
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

              <div className="mt-3 flex space-x-3">
                <button
                  onClick={() => disconnectBroker()}
                  className="btn btn-secondary text-sm"
                >
                  Disconnect
                </button>
              </div>
            </div>
          ) : (
            /* Broker Selection */
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Connect Your Broker
                </h3>
                <p className="text-gray-600">
                  Securely connect your trading account using OAuth 2.0 to automatically sync your trades
                </p>
              </div>

              {/* Account Type Selection */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">Account Type</h4>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                      selectedAccountType === "demo"
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="accountType"
                      value="demo"
                      checked={selectedAccountType === "demo"}
                      onChange={(e) => setSelectedAccountType(e.target.value)}
                      className="sr-only"
                    />
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900">Demo</div>
                      <div className="text-sm text-gray-600">Paper trading</div>
                      <div className="text-xs text-green-600 mt-1">Recommended for testing</div>
                    </div>
                  </label>

                  <label
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                      selectedAccountType === "live"
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="accountType"
                      value="live"
                      checked={selectedAccountType === "live"}
                      onChange={(e) => setSelectedAccountType(e.target.value)}
                      className="sr-only"
                    />
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900">Live</div>
                      <div className="text-sm text-gray-600">Real trading</div>
                      <div className="text-xs text-orange-600 mt-1">Use real money</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Broker Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(brokers).map(([brokerId, broker]) => (
                  <div
                    key={brokerId}
                    className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                      selectedBrokerForConnection === brokerId
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setSelectedBrokerForConnection(brokerId)}
                  >
                    <div className="flex items-center space-x-3 mb-3">
                      <span className="text-3xl">{broker.logo}</span>
                      <div>
                        <h4 className="font-semibold text-gray-900">{broker.name}</h4>
                        <p className="text-sm text-gray-600">{broker.description}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-1 text-green-600">
                        <Shield className="w-3 h-3" />
                        <span>OAuth 2.0</span>
                      </div>
                      <div className="flex items-center space-x-1 text-blue-600">
                        <ExternalLink className="w-3 h-3" />
                        <span>Secure Connection</span>
                      </div>
                    </div>

                    {broker.features && (
                      <div className="mt-2 text-xs text-gray-500">
                        Features: {broker.features.join(", ")}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Connect Button */}
              {selectedBrokerForConnection && (
                <div className="text-center">
                  <button
                    onClick={() => handleConnectBroker(selectedBrokerForConnection)}
                    disabled={isConnecting}
                    className="btn btn-primary flex items-center space-x-2 mx-auto"
                  >
                    {isConnecting ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <ExternalLink className="w-4 h-4" />
                    )}
                    <span>
                      {isConnecting ? "Connecting..." : `Connect to ${brokers[selectedBrokerForConnection]?.name} (${selectedAccountType.toUpperCase()})`}
                    </span>
                  </button>
                  <p className="text-xs text-gray-500 mt-2">
                    You'll be redirected to {brokers[selectedBrokerForConnection]?.name} to authorize the connection
                  </p>
                </div>
              )}

              {/* Security Notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900 mb-1">
                      Secure OAuth 2.0 Authentication
                    </h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Your credentials are never stored on our servers</li>
                      <li>• All connections use industry-standard OAuth 2.0</li>
                      <li>• You can revoke access at any time</li>
                      <li>• Data is encrypted in transit and at rest</li>
                    </ul>
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

export default BrokerModal;
