import React, { useState } from "react";
import { useBroker } from "../context/BrokerContext";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  RefreshCw,
  CheckCircle,
  Wifi,
  DollarSign,
  Shield,
  Key,
  Clock,
  AlertCircle,
  ChevronDown,
  Upload,
  ExternalLink,
  Settings,
  TrendingUp,
} from "lucide-react";
import TradovateSetupStatus from "../components/trades/TradovateSetupStatus";
import CsvImportModal from "../components/trades/CsvImportModal";

const PROP_FIRMS = [
  { id: "apex",    name: "Apex Trader Funding", logo: "🏆", brokerKey: "tradovate" },
  { id: "mff",     name: "MyFundedFutures",      logo: "💰", brokerKey: "tradovate" },
  { id: "bulenox", name: "Bulenox",              logo: "📊", brokerKey: "tradovate" },
  { id: "tpt",     name: "Take Profit Trader",   logo: "🎯", brokerKey: "tradovate" },
  { id: "topstep", name: "Topstep",              logo: "🔝", brokerKey: "tradovate" },
  { id: "other",   name: "Other / Not listed",   logo: "📋", brokerKey: "tradovate" },
];

const BrokerSelection = () => {
  const {
    connectBroker,
    disconnectBroker,
    syncTrades,
    isConnected,
    isConnecting,
    propFirm,
    accounts,
    syncStatus,
    lastSync,
    connectionError,
    autoSync,
    toggleAutoSync,
    syncInterval,
    setSyncInterval,
  } = useBroker();

  const navigate = useNavigate();
  const [accountTypes, setAccountTypes] = useState({});
  const [connectingFirm, setConnectingFirm] = useState(null);
  const [showSetupStatus, setShowSetupStatus] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [tradesSynced, setTradesSynced] = useState(false);

  const getAccountType = (firmId) => accountTypes[firmId] ?? "demo";

  const setFirmAccountType = (firmId, type) =>
    setAccountTypes((prev) => ({ ...prev, [firmId]: type }));

  const handleConnect = async (firm) => {
    setConnectingFirm(firm.id);
    try {
      await connectBroker(firm.brokerKey, {
        accountType: getAccountType(firm.id),
        propFirm: firm.id === "other" ? null : firm.name,
      });
    } finally {
      setConnectingFirm(null);
    }
  };

  const handleSync = async () => {
    await syncTrades(() => setTradesSynced(true));
  };

  const formatBalance = (amount) => {
    if (amount == null) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatLastSync = (date) => {
    if (!date) return "Never";
    return new Date(date).toLocaleString();
  };

  const connectedAccount = accounts[0] ?? null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Page header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {isConnected ? "Broker Connection" : "Connect Your Account"}
            </h1>
            <p className="mt-1 text-gray-500 dark:text-gray-400">
              {isConnected
                ? "Manage your connected prop firm and sync trades"
                : "Select your prop firm to automatically import your trades"}
            </p>
          </div>
          <button
            onClick={() => navigate("/trades")}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors whitespace-nowrap"
            data-testid="back-to-trades-btn"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Trades
          </button>
        </div>

        {/* ── CONNECTED STATE ─────────────────────────────────────── */}
        {isConnected ? (
          <div className="space-y-4">

            {/* Account card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-b border-gray-200 dark:border-gray-700 px-6 py-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <div
                        className="font-bold text-gray-900 dark:text-gray-100 text-xl"
                        data-testid="connected-firm-name"
                      >
                        {propFirm ?? connectedAccount?.name ?? "Connected Account"}
                      </div>
                      <div className="flex items-center space-x-1.5 text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        <Key className="w-3.5 h-3.5" />
                        <span>via Tradovate · OAuth 2.0 Secured</span>
                      </div>
                    </div>
                  </div>
                  <span
                    className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                    data-testid="connected-status-badge"
                  >
                    <Wifi className="w-4 h-4 mr-1.5" />
                    Connected
                  </span>
                </div>
              </div>

              <div className="px-6 py-5 space-y-5">

                {/* Balance */}
                {connectedAccount?.balance != null && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                      <DollarSign className="w-4 h-4 text-green-500" />
                      <span>Account Balance</span>
                    </div>
                    <span
                      className="font-semibold text-gray-900 dark:text-gray-100 text-lg"
                      data-testid="connected-balance"
                    >
                      {formatBalance(connectedAccount.balance)}
                    </span>
                  </div>
                )}

                {/* Error */}
                {connectionError && (
                  <div
                    className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400"
                    data-testid="broker-connection-error"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{connectionError}</span>
                  </div>
                )}

                {/* Sync row */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Trade Sync
                    </div>
                    <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      <Clock className="w-3 h-3" />
                      <span>Last synced: {formatLastSync(lastSync)}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {tradesSynced && (
                      <button
                        onClick={() => navigate("/trades")}
                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                        data-testid="view-trades-btn"
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1" />
                        View Trades
                      </button>
                    )}
                    <button
                      onClick={handleSync}
                      disabled={syncStatus === "syncing"}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
                      data-testid="sync-now-btn"
                    >
                      <RefreshCw
                        className={`w-4 h-4 mr-2 ${syncStatus === "syncing" ? "animate-spin" : ""}`}
                      />
                      {syncStatus === "syncing" ? "Syncing…" : "Sync Now"}
                    </button>
                  </div>
                </div>

                {/* Auto-sync */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
                  <label className="flex items-center space-x-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoSync}
                      onChange={(e) => toggleAutoSync(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      data-testid="autosync-toggle"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Auto-sync trades
                    </span>
                  </label>
                  {autoSync && (
                    <select
                      value={syncInterval}
                      onChange={(e) => setSyncInterval(parseInt(e.target.value))}
                      className="text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-2 py-1"
                      data-testid="sync-interval-select"
                    >
                      <option value={300000}>Every 5 min</option>
                      <option value={900000}>Every 15 min</option>
                      <option value={1800000}>Every 30 min</option>
                      <option value={3600000}>Every 1 hour</option>
                    </select>
                  )}
                </div>
              </div>
            </div>

            {/* Security note */}
            <div className="flex items-start space-x-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl text-sm">
              <Shield className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-blue-800 dark:text-blue-300">
                <span className="font-medium">Your credentials are never stored in the browser.</span>
                {" "}Tokens are kept encrypted on our servers. Revoke access anytime from your Tradovate account settings.
              </p>
            </div>

            {/* Disconnect */}
            <div className="flex justify-end">
              <button
                onClick={() => disconnectBroker()}
                className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 underline"
                data-testid="disconnect-btn"
              >
                Disconnect broker
              </button>
            </div>
          </div>

        ) : (
          /* ── CONNECT FLOW ───────────────────────────────────────── */
          <div className="space-y-8">

            {/* Prop firm cards */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Futures Prop Firms
                </h2>
                <span className="inline-flex items-center text-xs text-gray-500 dark:text-gray-400 space-x-1">
                  <Key className="w-3 h-3" />
                  <span>Powered by Tradovate OAuth</span>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {PROP_FIRMS.map((firm) => (
                  <div
                    key={firm.id}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:shadow-md dark:hover:shadow-xl transition-shadow flex flex-col"
                    data-testid={`firm-card-${firm.id}`}
                  >
                    {/* Firm identity */}
                    <div className="flex items-center space-x-3 mb-4">
                      <span className="text-3xl">{firm.logo}</span>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-tight">
                          {firm.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          via Tradovate
                        </div>
                      </div>
                    </div>

                    {/* Evaluation / Funded toggle */}
                    <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden mb-3 text-xs">
                      {[
                        { value: "demo", label: "Evaluation" },
                        { value: "live", label: "Funded" },
                      ].map(({ value, label }) => (
                        <button
                          key={value}
                          onClick={() => setFirmAccountType(firm.id, value)}
                          className={`flex-1 py-1.5 font-medium transition-colors ${
                            getAccountType(firm.id) === value
                              ? "bg-blue-600 text-white"
                              : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                          }`}
                          data-testid={`firm-${firm.id}-${value}-btn`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {/* Connect button */}
                    <button
                      onClick={() => handleConnect(firm)}
                      disabled={isConnecting || Boolean(connectingFirm)}
                      className="mt-auto w-full flex items-center justify-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
                      data-testid={`firm-connect-${firm.id}-btn`}
                    >
                      {connectingFirm === firm.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <ExternalLink className="w-4 h-4" />
                      )}
                      <span>
                        {connectingFirm === firm.id ? "Connecting…" : "Connect"}
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* CSV import alternative */}
            <div className="flex items-center justify-between p-5 bg-gray-50 dark:bg-gray-800/50 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl">
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                  No broker connection? Import via CSV
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Supports NinjaTrader, Tradovate, Rithmic, and TopstepX exports.
                </div>
              </div>
              <button
                onClick={() => setShowCsvModal(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors whitespace-nowrap ml-4"
                data-testid="csv-import-btn"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import CSV
              </button>
            </div>

            {/* Security notice */}
            <div className="flex items-start space-x-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
              <Shield className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">
                  How your connection is secured
                </div>
                <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
                  <li>• OAuth 2.0 — your broker password is never sent to us</li>
                  <li>• Access tokens are encrypted in our database, never stored in your browser</li>
                  <li>• Trade sync runs on our servers — your token never leaves it</li>
                  <li>• Revoke access anytime from your broker's app settings</li>
                </ul>
              </div>
            </div>

            {/* Developer setup — collapsible */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowSetupStatus((v) => !v)}
                className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 dark:bg-gray-800/50 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                data-testid="toggle-setup-status-btn"
              >
                <div className="flex items-center space-x-2">
                  <Settings className="w-4 h-4" />
                  <span>Developer Setup Status</span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${showSetupStatus ? "rotate-180" : ""}`}
                />
              </button>
              {showSetupStatus && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                  <TradovateSetupStatus />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* CSV Import modal */}
      {showCsvModal && (
        <CsvImportModal
          isOpen={showCsvModal}
          onClose={() => setShowCsvModal(false)}
          onImported={() => {
            setShowCsvModal(false);
            navigate("/trades");
          }}
        />
      )}
    </div>
  );
};

export default BrokerSelection;
