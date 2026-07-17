import React, { useState, useMemo, useRef } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import {
  Plug,
  Upload,
  Star,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  Settings,
  ShieldCheck,
  Search,
} from "lucide-react";
import { useBroker } from "../context/BrokerContext";
import { useTrades } from "../context/TradeContext";
import { useFeatureFlags } from "../context/FeatureFlagContext";
import ConnectWizard from "../components/brokers/ConnectWizard";
import ManageAccountPanel from "../components/brokers/ManageAccountPanel";
import CsvImportModal from "../components/trades/CsvImportModal";
import TradovateSetupStatus from "../components/trades/TradovateSetupStatus";

// ── Broker catalog ───────────────────────────────────────────────────────────
// Connectable brokers. ProjectX firms carry their gateway host; "other" firms let
// the user paste the host their firm documents. Class strings are written out in
// full so Tailwind's JIT detects them.

const AVAILABLE_BROKERS = [
  {
    id: "topstep",
    key: "projectx",
    name: "Topstep",
    firmName: "Topstep",
    baseUrl: "https://api.topstepx.com",
    subtitle: "Futures prop firm · via ProjectX",
    initials: "TS",
    badge: "bg-violet-500/10 text-violet-500 border-violet-500/30",
    rating: 5,
    requiresFlag: true,
  },
  {
    id: "thefuturesdesk",
    key: "projectx",
    name: "The Futures Desk",
    firmName: "The Futures Desk",
    baseUrl: "https://api.thefuturesdesk.projectx.com",
    subtitle: "Futures prop firm · via ProjectX",
    initials: "FD",
    badge: "bg-cyan-500/10 text-cyan-500 border-cyan-500/30",
    rating: 5,
    requiresFlag: true,
  },
  {
    id: "projectx-other",
    key: "projectx",
    name: "Other ProjectX firm",
    firmName: null,
    baseUrl: "",
    needsBaseUrl: true,
    subtitle: "Apex, MyFundedFutures & 19+ firms",
    initials: "PX",
    badge: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
    rating: 5,
    requiresFlag: true,
  },
  {
    id: "tradovate",
    key: "tradovate",
    name: "Tradovate",
    firmName: null,
    subtitle: "Personal funded accounts · OAuth",
    initials: "T",
    badge: "bg-amber-500/10 text-amber-500 border-amber-500/30",
    rating: 4,
    requiresFlag: false,
  },
];

const COMING_SOON_BROKERS = [
  "Rithmic",
  "NinjaTrader",
  "Interactive Brokers",
  "MT5",
  "TradeLocker",
  "DXTrade",
  "Oanda",
  "Binance",
  "ThinkorSwim",
  "Schwab",
  "AMP",
  "EdgeClear",
];

const BROKER_LABELS = { projectx: "ProjectX", tradovate: "Tradovate" };

// Short relative time label, e.g. "2m ago", "1h ago", "3d ago".
const formatRelative = (date) => {
  if (!date) return null;
  const m = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const formatBalance = (amount) => {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
};

const RatingStars = ({ rating }) => (
  <span className="inline-flex items-center gap-0.5" aria-hidden="true">
    {Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-3 h-3 ${
          i < rating ? "text-amber-400 fill-amber-400" : "text-gray-300 dark:text-gray-700"
        }`}
      />
    ))}
  </span>
);

RatingStars.propTypes = {
  rating: PropTypes.number.isRequired,
};

/**
 * Broker Hub — the /brokers page. First-time users get a hero card that walks
 * them into the Plaid-style ConnectWizard; connected users see their brokers
 * grouped with per-account sync state and a management panel.
 */
const BrokerHub = () => {
  const { accounts, connectionError } = useBroker();
  const { refreshTrades } = useTrades();
  const { getFeatureState, flags, audience } = useFeatureFlags();
  const navigate = useNavigate();

  // Same rollout gate as the previous page: the flag must exist AND be on for
  // this user (admins bypass so the dark launch stays testable).
  const projectxEnabled =
    Boolean(flags?.projectx_broker) &&
    (audience === "admin" || getFeatureState("projectx_broker") === "on");

  const [wizardBroker, setWizardBroker] = useState(null);
  // Store only the id — the panel always reads the FRESH account object from
  // context, so a rename/toggle is reflected immediately after loadConnections.
  const [manageAccountId, setManageAccountId] = useState(null);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [showSetupStatus, setShowSetupStatus] = useState(false);
  const [brokerSearch, setBrokerSearch] = useState("");
  const availableRef = useRef(null);

  const connectable = useMemo(
    () => AVAILABLE_BROKERS.filter((b) => !b.requiresFlag || projectxEnabled),
    [projectxEnabled],
  );

  const visibleBrokers = useMemo(() => {
    const q = brokerSearch.trim().toLowerCase();
    if (!q) return connectable;
    return connectable.filter(
      (b) => b.name.toLowerCase().includes(q) || b.subtitle.toLowerCase().includes(q),
    );
  }, [connectable, brokerSearch]);

  // Group connected accounts by broker for the "Connected brokers" section.
  const brokerGroups = useMemo(() => {
    const groups = {};
    for (const account of accounts) {
      const key = account.broker ?? "tradovate";
      (groups[key] ??= []).push(account);
    }
    return Object.entries(groups).map(([key, list]) => ({
      key,
      name: BROKER_LABELS[key] ?? key,
      accounts: list,
      lastSync: list.reduce(
        (latest, a) => (a.lastSync && (!latest || a.lastSync > latest) ? a.lastSync : latest),
        null,
      ),
      anySyncOn: list.some((a) => a.syncEnabled),
    }));
  }, [accounts]);

  const hasAccounts = accounts.length > 0;
  const manageAccount = useMemo(
    () => (manageAccountId ? accounts.find((a) => a.id === manageAccountId) ?? null : null),
    [accounts, manageAccountId],
  );

  const openWizard = (broker) => setWizardBroker(broker);

  const scrollToAvailable = () =>
    availableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    // Transparent so the app shell's teal gradient (App.jsx <main>) shows
    // through; negative margins cancel the shell's p-4/sm:p-6 so py-10 keeps
    // the content aligned with every other page.
    <div className="min-h-screen -m-4 sm:-m-6 py-10">
      <div className="w-full 2xl:max-w-[90%] 2xl:mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
            Broker Connections
          </h1>
          <p className="mt-2 flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            Secure connections using encrypted authentication.
          </p>
        </div>

        {/* Connection error */}
        {connectionError && (
          <div
            className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-sm text-red-700 dark:text-red-400"
            data-test-id="broker-connection-error"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{connectionError}</span>
          </div>
        )}

        {/* First-time hero */}
        {!hasAccounts && (
          <div
            className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 py-10 sm:px-10 sm:py-14 text-center"
            data-test-id="broker-hub-hero"
          >
            <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-5">
              <Plug className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50 mb-2">
              Connect your broker
            </h2>
            <p className="text-base font-medium text-gray-500 dark:text-gray-400 mb-7 max-w-md mx-auto">
              Import trades automatically. No CSV files needed.
            </p>
            <button
              onClick={scrollToAvailable}
              className="btn-gradient inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/25"
              data-test-id="broker-hub-hero-connect-btn"
            >
              <Plug className="w-4 h-4" />
              Connect broker
            </button>
          </div>
        )}

        {/* Connected brokers */}
        {hasAccounts && (
          <section className="space-y-4">
            <div className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              Connected brokers
            </div>

            {brokerGroups.map((group) => (
              <div
                key={group.key}
                className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden"
                data-test-id={`connected-broker-${group.key}`}
              >
                {/* Broker header */}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 sm:px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.18)] shrink-0" />
                    <span className="font-bold text-base text-gray-900 dark:text-gray-50">
                      {group.name}
                    </span>
                    <span className="text-xs font-semibold text-gray-400 dark:text-gray-500">
                      {group.accounts.length} account{group.accounts.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 ml-auto text-xs font-semibold text-gray-500 dark:text-gray-400">
                    <span data-test-id={`connected-broker-lastsync-${group.key}`}>
                      Last sync {formatRelative(group.lastSync) ?? "never"}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide border ${
                        group.anySyncOn
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                          : "bg-gray-500/10 text-gray-500 border-gray-500/30"
                      }`}
                    >
                      AUTO SYNC {group.anySyncOn ? "ON" : "OFF"}
                    </span>
                  </div>
                </div>

                {/* Account rows */}
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {group.accounts.map((account) => (
                    <button
                      key={account.id}
                      onClick={() => setManageAccountId(account.id)}
                      className="w-full flex items-center gap-3 sm:gap-4 px-5 sm:px-6 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      data-test-id={`account-row-${account.id}`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          account.syncEnabled ? "bg-emerald-500" : "bg-gray-400 dark:bg-gray-600"
                        }`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span
                            className="font-bold text-sm text-gray-900 dark:text-gray-50 truncate"
                            data-test-id={`account-row-name-${account.id}`}
                          >
                            {account.displayName}
                          </span>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide border ${
                              account.type === "live"
                                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                                : "bg-amber-500/10 text-amber-500 border-amber-500/30"
                            }`}
                          >
                            {account.type === "live" ? "FUNDED" : "EVALUATION"}
                          </span>
                          {account.propFirm && (
                            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide border bg-violet-500/10 text-violet-500 border-violet-500/30">
                              {account.propFirm}
                            </span>
                          )}
                        </span>
                        <span className="block text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">
                          {account.syncEnabled ? "Sync on" : "Sync off"}
                          {account.lastSync && ` · synced ${formatRelative(account.lastSync)}`}
                        </span>
                      </span>
                      <span
                        className="hidden sm:block text-sm font-bold text-gray-900 dark:text-gray-50 shrink-0"
                        data-test-id={`account-row-balance-${account.id}`}
                      >
                        {formatBalance(account.balance)}
                      </span>
                      <span className="inline-flex items-center gap-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                        Manage
                        <ChevronRight className="w-4 h-4" />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Available brokers */}
        <section ref={availableRef} className="space-y-4 scroll-mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              Available brokers
            </div>
            <div className="relative sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                value={brokerSearch}
                onChange={(e) => setBrokerSearch(e.target.value)}
                placeholder="Search brokers…"
                data-test-id="broker-search-input"
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {visibleBrokers.map((broker) => (
              <div
                key={broker.id}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 flex flex-col hover:border-gray-300 dark:hover:border-gray-700 hover:-translate-y-0.5 transition-all"
                data-test-id={`broker-card-${broker.id}`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-base border shrink-0 ${broker.badge}`}
                  >
                    {broker.initials}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm leading-tight text-gray-900 dark:text-gray-50">
                      {broker.name}
                    </div>
                    <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                      {broker.subtitle}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-5">
                  <RatingStars rating={broker.rating} />
                  <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500">
                    Automatic trade import
                  </span>
                </div>

                <button
                  onClick={() => openWizard(broker)}
                  className="mt-auto w-full flex items-center justify-center gap-1.5 px-3 py-3 text-sm font-bold rounded-xl btn-gradient"
                  data-test-id={`broker-connect-${broker.id}-btn`}
                >
                  Connect
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {brokerSearch.trim() && visibleBrokers.length === 0 && (
            <p
              className="text-sm font-medium text-gray-500 dark:text-gray-400"
              data-test-id="broker-search-empty"
            >
              No brokers match "{brokerSearch.trim()}". Clear the search, or import
              your trades with CSV below.
            </p>
          )}
        </section>

        {/* CSV import — the universal fallback */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 bg-gray-100/70 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-2xl">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center shrink-0">
              <Upload className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </div>
            <div>
              <div className="font-bold text-sm text-gray-900 dark:text-gray-50">
                No broker connection? Import via CSV
              </div>
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">
                Supports NinjaTrader, Tradovate, Rithmic, and TopstepX exports.
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowCsvModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors whitespace-nowrap shrink-0"
            data-test-id="csv-import-btn"
          >
            <Upload className="w-4 h-4" />
            Import CSV
          </button>
        </div>

        {/* Coming soon */}
        <section className="space-y-4">
          <div className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
            Coming soon
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {COMING_SOON_BROKERS.map((name) => (
              <div
                key={name}
                className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 px-4 py-3.5 text-center"
                data-test-id={`coming-soon-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
              >
                <div className="text-sm font-bold text-gray-400 dark:text-gray-500 truncate">
                  {name}
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-300 dark:text-gray-600 mt-0.5">
                  Coming soon
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Developer setup — collapsible */}
        <div className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowSetupStatus((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-3.5 bg-gray-50 dark:bg-gray-900/60 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            data-test-id="toggle-setup-status-btn"
          >
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <span>Developer Setup Status</span>
            </div>
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${showSetupStatus ? "rotate-180" : ""}`}
            />
          </button>
          {showSetupStatus && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-800">
              <TradovateSetupStatus />
            </div>
          )}
        </div>
      </div>

      {/* Connect wizard overlay */}
      {wizardBroker && (
        <ConnectWizard
          broker={wizardBroker}
          onClose={() => setWizardBroker(null)}
          onFinished={() => refreshTrades()}
          onGoToJournal={() => {
            setWizardBroker(null);
            navigate("/trades");
          }}
        />
      )}

      {/* Manage account slide-over */}
      {manageAccount && (
        <ManageAccountPanel
          account={manageAccount}
          onClose={() => setManageAccountId(null)}
          onReconnect={() => {
            const broker = AVAILABLE_BROKERS.find(
              (b) =>
                b.key === manageAccount.broker &&
                (b.firmName == null || b.firmName === manageAccount.propFirm),
            ) ?? AVAILABLE_BROKERS.find((b) => b.key === manageAccount.broker);
            setManageAccountId(null);
            if (broker) setWizardBroker(broker);
          }}
          onTradesChanged={() => refreshTrades()}
        />
      )}

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

export default BrokerHub;
