import React, { useState } from "react";
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
  ChevronRight,
  Building2,
  DollarSign,
} from "lucide-react";
import { useBroker } from "../../context/BrokerContext";

const PROP_FIRMS = {
  tradovate: [
    { id: "apex", name: "Apex Trader Funding", logo: "🏆" },
    { id: "mff",  name: "MyFundedFutures",     logo: "💰" },
    { id: "bulenox",  name: "Bulenox",          logo: "📊" },
    { id: "tpt", name: "Take Profit Trader",    logo: "🎯" },
    { id: "topstep", name: "Topstep",           logo: "🔝" },
    { id: "other", name: "Other / Not listed",  logo: "📋" },
  ],
};

const BrokerModal = ({ isOpen, onClose, onTradesImported }) => {
  const {
    brokers,
    selectedBroker,
    propFirm,
    isConnected,
    isConnecting,
    connectionError,
    accounts,
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

  const [selectedBrokerKey, setSelectedBrokerKey] = useState("");
  const [selectedAccountType, setSelectedAccountType] = useState("demo");
  const [selectedFirm, setSelectedFirm] = useState("");
  // step: 1=choose broker+type, 2=choose prop firm (Tradovate only), 3=connecting
  const [step, setStep] = useState(1);

  if (!isOpen) return null;

  const hasPropFirms = (brokerKey) => Boolean(PROP_FIRMS[brokerKey]);

  const handleBrokerClick = (brokerKey) => {
    setSelectedBrokerKey(brokerKey);
  };

  const handleNextStep = () => {
    if (!selectedBrokerKey) return;
    if (hasPropFirms(selectedBrokerKey)) {
      setStep(2);
    } else {
      handleConnect();
    }
  };

  const handleConnect = async () => {
    const firmLabel = PROP_FIRMS[selectedBrokerKey]?.find((f) => f.id === selectedFirm)?.name ?? null;
    setStep(3);
    try {
      await connectBroker(selectedBrokerKey, {
        accountType: selectedAccountType,
        propFirm: firmLabel,
      });
    } catch (err) {
      console.error("Connection error:", err);
    } finally {
      setStep(hasPropFirms(selectedBrokerKey) ? 2 : 1);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setSelectedFirm("");
    }
  };

  const handleSync = () => {
    syncTrades(onTradesImported);
  };

  const formatLastSync = (date) => {
    if (!date) return "Never";
    return new Date(date).toLocaleString();
  };

  const formatBalance = (amount) => {
    if (amount == null) return "—";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
  };

  const getSyncStatusIcon = () => {
    switch (syncStatus) {
      case "syncing": return <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />;
      case "success": return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "error":   return <XCircle className="w-4 h-4 text-red-500" />;
      default:        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const currentBroker = selectedBroker ? brokers[selectedBroker] : null;
  const connectedAccount = accounts[0] ?? null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      data-testid="broker-modal"
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center rounded-t-xl">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {isConnected ? "Broker Connection" : "Connect Broker"}
            </h2>
            <div className="flex items-center space-x-1 text-xs text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded-full">
              <Shield className="w-3 h-3" />
              <span>Secure</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            data-testid="modal-close-btn"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* ── CONNECTED STATE ─────────────────────────────────────── */}
          {isConnected && currentBroker ? (
            <div className="space-y-4">
              {/* Account card */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-3xl">{currentBroker.logo}</span>
                    <div>
                      {propFirm ? (
                        <>
                          <div className="font-semibold text-gray-900 dark:text-gray-100 text-lg" data-testid="broker-firm-name">
                            {propFirm}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center space-x-1">
                            <span>via</span>
                            <span className="font-medium">{currentBroker.name}</span>
                          </div>
                        </>
                      ) : (
                        <div className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
                          {connectedAccount?.name ?? currentBroker.name}
                        </div>
                      )}
                      <div className="text-xs text-blue-600 dark:text-blue-400 flex items-center space-x-1 mt-1">
                        <Key className="w-3 h-3" />
                        <span>OAuth 2.0 — tokens stored server-side</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded-full text-sm font-medium">
                    <Wifi className="w-4 h-4" />
                    <span>Connected</span>
                  </div>
                </div>

                {/* Balance row */}
                {connectedAccount?.balance != null && (
                  <div className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700/50 rounded-lg px-3 py-2">
                    <DollarSign className="w-4 h-4 text-green-500" />
                    <span>Account balance:</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100" data-testid="broker-account-balance">
                      {formatBalance(connectedAccount.balance)}
                    </span>
                  </div>
                )}

                {connectionError && (
                  <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-400 flex items-center space-x-1" data-testid="broker-connection-error">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{connectionError}</span>
                  </div>
                )}
              </div>

              {/* Sync Controls */}
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100">Trade Sync</h4>
                  <div className="flex items-center space-x-2">
                    {getSyncStatusIcon()}
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {syncStatus === "syncing" ? "Syncing…" : "Ready"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4 text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Last sync</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{formatLastSync(lastSync)}</span>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleSync}
                    disabled={syncStatus === "syncing"}
                    className="btn btn-primary text-sm flex items-center space-x-1.5 disabled:opacity-60"
                    data-testid="broker-sync-now-btn"
                  >
                    <RefreshCw className={`w-4 h-4 ${syncStatus === "syncing" ? "animate-spin" : ""}`} />
                    <span>Sync Now</span>
                  </button>

                  <label className="flex items-center space-x-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      id="autoSync"
                      checked={autoSync}
                      onChange={(e) => toggleAutoSync(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      data-testid="broker-autosync-toggle"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Auto-sync</span>
                  </label>

                  {autoSync && (
                    <select
                      value={syncInterval}
                      onChange={(e) => setSyncInterval(parseInt(e.target.value))}
                      className="text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-2 py-1.5"
                      data-testid="broker-sync-interval-select"
                    >
                      <option value={300000}>Every 5 min</option>
                      <option value={900000}>Every 15 min</option>
                      <option value={1800000}>Every 30 min</option>
                      <option value={3600000}>Every 1 hour</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Disconnect */}
              <div className="flex justify-end">
                <button
                  onClick={() => disconnectBroker()}
                  className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 underline"
                  data-testid="broker-disconnect-btn"
                >
                  Disconnect broker
                </button>
              </div>
            </div>

          ) : (
            /* ── CONNECTION FLOW ─────────────────────────────────────── */
            <div className="space-y-6">

              {/* Step 1 — Choose broker + account type */}
              {step === 1 && (
                <>
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      Connect Your Trading Platform
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Trades are imported server-side — your credentials never leave our secure servers.
                    </p>
                  </div>

                  {/* Account Type */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
                      Account Type
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {["demo", "live"].map((type) => (
                        <label
                          key={type}
                          className={`p-3 border-2 rounded-xl cursor-pointer transition-all text-center ${
                            selectedAccountType === type
                              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                              : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                          }`}
                        >
                          <input
                            type="radio"
                            name="accountType"
                            value={type}
                            checked={selectedAccountType === type}
                            onChange={(e) => setSelectedAccountType(e.target.value)}
                            className="sr-only"
                          />
                          <div className="font-semibold text-gray-900 dark:text-gray-100 capitalize">{type}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {type === "demo" ? "Evaluation / paper" : "Funded / real money"}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Broker Grid */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
                      Trading Platform
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {Object.entries(brokers).map(([brokerKey, broker]) => (
                        <div
                          key={brokerKey}
                          onClick={() => handleBrokerClick(brokerKey)}
                          className={`p-4 border-2 rounded-xl cursor-pointer transition-all hover:shadow-md ${
                            selectedBrokerKey === brokerKey
                              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                              : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                          }`}
                          data-testid={`broker-option-${brokerKey}`}
                        >
                          <div className="flex items-center space-x-3 mb-2">
                            <span className="text-2xl">{broker.logo}</span>
                            <div>
                              <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{broker.name}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{broker.description}</div>
                            </div>
                          </div>
                          {broker.propFirms && (
                            <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-lg">
                              <Building2 className="w-3 h-3 inline mr-1" />
                              Apex, MyFundedFutures, Topstep +more
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {selectedBrokerKey && (
                    <button
                      onClick={handleNextStep}
                      disabled={isConnecting}
                      className="w-full btn btn-primary flex items-center justify-center space-x-2"
                      data-testid="broker-next-btn"
                    >
                      <span>
                        {hasPropFirms(selectedBrokerKey)
                          ? "Next — Choose Prop Firm"
                          : `Connect to ${brokers[selectedBrokerKey]?.name}`}
                      </span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </>
              )}

              {/* Step 2 — Prop Firm Selector (Tradovate only) */}
              {step === 2 && (
                <>
                  <div>
                    <button
                      onClick={handleBack}
                      className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center space-x-1 mb-4"
                    >
                      <span>← Back</span>
                    </button>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      Which prop firm are you with?
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      This helps us label your account correctly. All firms use Tradovate for order routing.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {(PROP_FIRMS[selectedBrokerKey] ?? []).map((firm) => (
                      <div
                        key={firm.id}
                        onClick={() => setSelectedFirm(firm.id)}
                        className={`p-3 border-2 rounded-xl cursor-pointer transition-all hover:shadow-sm ${
                          selectedFirm === firm.id
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                        }`}
                        data-testid={`prop-firm-option-${firm.id}`}
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-xl">{firm.logo}</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{firm.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleConnect}
                    disabled={isConnecting || !selectedFirm}
                    className="w-full btn btn-primary flex items-center justify-center space-x-2 disabled:opacity-60"
                    data-testid="broker-connect-btn"
                  >
                    {isConnecting ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <ExternalLink className="w-4 h-4" />
                    )}
                    <span>
                      {isConnecting
                        ? "Connecting…"
                        : selectedFirm
                          ? `Connect ${PROP_FIRMS[selectedBrokerKey]?.find((f) => f.id === selectedFirm)?.name ?? ""}`
                          : "Select a firm above"}
                    </span>
                  </button>
                </>
              )}

              {/* Step 3 — Connecting spinner */}
              {step === 3 && (
                <div className="text-center py-8">
                  <RefreshCw className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-3" />
                  <p className="text-gray-700 dark:text-gray-300 font-medium">Opening Tradovate login…</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Complete the login in the popup window</p>
                </div>
              )}

              {/* Security notice — always visible on step 1 */}
              {step === 1 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                  <div className="flex items-start space-x-2">
                    <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-1 text-sm">
                        How your connection is secured
                      </h4>
                      <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
                        <li>• OAuth 2.0 — your broker password is never sent to us</li>
                        <li>• Access tokens are stored encrypted in our database, never in your browser</li>
                        <li>• Trade import happens on our server — your token never leaves it</li>
                        <li>• You can revoke access from your broker's settings at any time</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BrokerModal;
