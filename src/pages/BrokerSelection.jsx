import React, { useState, useMemo } from "react";
import { useBroker } from "../context/BrokerContext";
import { useTrades } from "../context/TradeContext";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  RefreshCw,
  CheckCircle,
  Key,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Upload,
  ExternalLink,
  Settings,
  Plus,
  Shield,
  Lock,
  RotateCcw,
} from "lucide-react";
import TradovateSetupStatus from "../components/trades/TradovateSetupStatus";
import CsvImportModal from "../components/trades/CsvImportModal";

// Each firm carries the Tailwind badge classes for its colored initials tile.
// Class strings are written out in full so Tailwind's JIT can detect them.
const PROP_FIRMS = [
  {
    id: "apex",
    name: "Apex Trader Funding",
    initials: "A",
    brokerKey: "tradovate",
    badge: "bg-amber-500/10 text-amber-500 border-amber-500/30",
  },
  {
    id: "mff",
    name: "MyFundedFutures",
    initials: "MF",
    brokerKey: "tradovate",
    badge: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
  },
  {
    id: "bulenox",
    name: "Bulenox",
    initials: "B",
    brokerKey: "tradovate",
    badge: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
  },
  {
    id: "tpt",
    name: "Take Profit Trader",
    initials: "TP",
    brokerKey: "tradovate",
    badge: "bg-rose-500/10 text-rose-400 border-rose-500/30",
  },
  {
    id: "topstep",
    name: "Topstep",
    initials: "TS",
    brokerKey: "tradovate",
    badge: "bg-violet-500/10 text-violet-400 border-violet-500/30",
  },
  {
    id: "other",
    name: "Other / Not listed",
    initials: "+",
    brokerKey: "tradovate",
    badge: "bg-slate-500/10 text-slate-400 border-slate-500/30",
  },
];

const DEFAULT_BADGE = "bg-emerald-500/10 text-emerald-500 border-emerald-500/30";

// Resolve the colored badge (initials + classes) for a connected account by
// matching its firm name against the known prop firms; falls back to initials
// derived from the name.
const getFirmVisual = (name) => {
  if (!name) return { initials: "?", badge: DEFAULT_BADGE };
  const match = PROP_FIRMS.find(
    (f) => f.id !== "other" && f.name.toLowerCase() === name.toLowerCase(),
  );
  if (match) return { initials: match.initials, badge: match.badge };
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join("")
    .toUpperCase();
  return { initials: initials || "?", badge: DEFAULT_BADGE };
};

// Map a series of numbers to an SVG polyline `points` string within the given
// box. Returns "" for fewer than two points so callers can skip rendering.
const buildSparkPoints = (values, width = 104, height = 38, pad = 4) => {
  if (!Array.isArray(values) || values.length < 2) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = width / (values.length - 1);
  return values
    .map((v, i) => {
      const x = i * stepX;
      const y = height - pad - ((v - min) / range) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
};

// Short relative time label, e.g. "2m", "1h", "3d".
const formatRelative = (date) => {
  if (!date) return null;
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
};

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

  const { trades, stats } = useTrades();

  const navigate = useNavigate();
  const [view, setView] = useState("accounts"); // "accounts" | "connect"
  const [accountTypes, setAccountTypes] = useState({});
  const [connectingFirm, setConnectingFirm] = useState(null);
  const [showSetupStatus, setShowSetupStatus] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [tradesSynced, setTradesSynced] = useState(false);

  const getAccountType = (firmId) => accountTypes[firmId] ?? "demo";

  const setFirmAccountType = (firmId, type) =>
    setAccountTypes((prev) => ({ ...prev, [firmId]: type }));

  const handleConnect = async (firm) => {
    setConnectingFirm(firm.id);
    try {
      const ok = await connectBroker(firm.brokerKey, {
        accountType: getAccountType(firm.id),
        propFirm: firm.id === "other" ? null : firm.name,
      });
      if (ok) setView("accounts");
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

  const formatPnL = (amount) => {
    if (amount == null) return "—";
    const sign = amount > 0 ? "+" : amount < 0 ? "-" : "";
    return `${sign}${formatBalance(Math.abs(amount))}`;
  };

  const formatLastSync = (date) => {
    if (!date) return "Never";
    return new Date(date).toLocaleString();
  };

  // Sum balances across every connected account for the summary header.
  const totalBalance = useMemo(
    () => accounts.reduce((sum, a) => sum + (a.balance ?? 0), 0),
    [accounts],
  );

  // Performance derived from imported/synced trades. Win rate and trade count
  // reuse the context-computed stats; 30-day P&L and the equity sparkline are
  // derived here from the closed-trade series.
  const performance = useMemo(() => {
    const closed = trades.filter((t) => t.status === "closed");
    const ordered = [...closed].sort((a, b) => {
      const da = new Date(a.exitDate || a.entryDate).getTime();
      const db = new Date(b.exitDate || b.entryDate).getTime();
      return da - db;
    });

    const cutoff = Date.now() - 30 * 86400000;
    const net30dPnL = ordered.reduce((sum, t) => {
      const when = new Date(t.exitDate || t.entryDate).getTime();
      return when >= cutoff ? sum + (t.pnl ?? 0) : sum;
    }, 0);

    let running = 0;
    const equity = ordered.map((t) => (running += t.pnl ?? 0));

    return {
      net30dPnL,
      totalPnL: stats.totalPnL ?? 0,
      sparkPoints: buildSparkPoints(equity.slice(-40)),
      sparkPositive: equity.length === 0 || equity[equity.length - 1] >= 0,
    };
  }, [trades, stats.totalPnL]);

  // Build a per-account view-model. Account-level P&L / sparkline data isn't
  // tracked per broker account yet, so the primary account falls back to the
  // trade-derived aggregate; additional accounts use any data carried on the
  // account object (populated as richer sync data arrives).
  const displayAccounts = useMemo(() => {
    return accounts.map((account, index) => {
      const name = account.propFirm ?? (index === 0 ? propFirm : null) ?? account.name;
      const visual = getFirmVisual(name);
      const isFunded = account.type === "live" || account.type === "funded";

      const pnl = account.pnl ?? (index === 0 ? performance.totalPnL : null);
      const pnlPct =
        account.pnlPct ??
        (account.balance > 0 && pnl != null ? (pnl / account.balance) * 100 : null);
      const sparkPoints =
        (Array.isArray(account.equity) ? buildSparkPoints(account.equity.slice(-40)) : null) ??
        (index === 0 ? performance.sparkPoints : "");
      const sparkPositive = account.equity
        ? account.equity[account.equity.length - 1] >= 0
        : index === 0
          ? performance.sparkPositive
          : (pnl ?? 0) >= 0;

      return {
        id: account.id ?? `account-${index}`,
        name: name ?? "Connected Account",
        ...visual,
        typeLabel: isFunded ? "FUNDED" : "EVALUATION",
        typeClass: isFunded
          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
          : "bg-amber-500/10 text-amber-500 border-amber-500/30",
        subtitle: `${account.size ? formatBalance(account.size) + " · " : ""}via Tradovate`,
        balance: account.balance ?? null,
        pnl,
        pnlPct,
        sparkPoints,
        sparkPositive,
        syncedLabel: formatRelative(account.lastSync ?? lastSync),
      };
    });
  }, [accounts, propFirm, performance, lastSync]);

  const headerSync = formatRelative(lastSync);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        {view === "accounts" ? (
          /* ── ACCOUNTS DASHBOARD ─────────────────────────────────── */
          <div className="space-y-8">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
                  Accounts
                </h1>
                <div className="mt-2 flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.18)]" />
                  <span data-test-id="connected-summary">
                    {accounts.length} connected
                    {headerSync ? ` · synced ${headerSync === "just now" ? "just now" : headerSync + " ago"}` : " · not synced yet"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setView("connect")}
                className="btn-gradient inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/25 transition-colors whitespace-nowrap"
                data-test-id="connect-account-btn"
              >
                <Plus className="w-4 h-4" />
                Connect account
              </button>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2.5">
                  Total balance
                </div>
                <div
                  className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50"
                  data-test-id="summary-total-balance"
                >
                  {formatBalance(totalBalance)}
                </div>
              </div>
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2.5">
                  Net P&amp;L · 30d
                </div>
                <div
                  className={`text-2xl font-bold tracking-tight ${
                    performance.net30dPnL > 0
                      ? "text-emerald-500"
                      : performance.net30dPnL < 0
                        ? "text-rose-500"
                        : "text-gray-900 dark:text-gray-50"
                  }`}
                  data-test-id="summary-net-pnl-30d"
                >
                  {formatPnL(performance.net30dPnL)}
                </div>
              </div>
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2.5">
                  Avg win rate
                </div>
                <div
                  className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50"
                  data-test-id="summary-win-rate"
                >
                  {Math.round(stats.winRate ?? 0)}%
                </div>
              </div>
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2.5">
                  Total trades
                </div>
                <div
                  className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50"
                  data-test-id="summary-trade-count"
                >
                  {(stats.totalTrades ?? 0).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              Connected accounts
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

            {/* Account rows */}
            <div className="space-y-3.5" data-test-id="connected-accounts-list">
              {displayAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center gap-5 px-6 py-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
                  data-test-id={`account-row-${account.id}`}
                >
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-base border shrink-0 ${account.badge}`}
                  >
                    {account.initials}
                  </div>

                  <div className="min-w-0 sm:w-56 shrink-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="font-bold text-base text-gray-900 dark:text-gray-50 truncate"
                        data-test-id={`account-row-name-${account.id}`}
                      >
                        {account.name}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide border ${account.typeClass}`}
                      >
                        {account.typeLabel}
                      </span>
                    </div>
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate">
                      {account.subtitle}
                    </div>
                  </div>

                  {/* Sparkline */}
                  {account.sparkPoints ? (
                    <svg
                      width="104"
                      height="38"
                      viewBox="0 0 104 38"
                      fill="none"
                      className={`hidden md:block shrink-0 ${account.sparkPositive ? "text-emerald-500" : "text-rose-500"}`}
                      data-test-id={`account-row-sparkline-${account.id}`}
                      aria-hidden="true"
                    >
                      <polyline
                        points={account.sparkPoints}
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <div className="hidden md:block w-[104px] shrink-0" />
                  )}

                  <div className="flex-1" />

                  {/* Balance + P&L */}
                  <div className="text-right shrink-0">
                    <div
                      className="text-lg font-bold tracking-tight text-gray-900 dark:text-gray-50"
                      data-test-id={`account-row-balance-${account.id}`}
                    >
                      {formatBalance(account.balance)}
                    </div>
                    {account.pnl != null && (
                      <div
                        className={`text-xs font-semibold ${
                          account.pnl > 0
                            ? "text-emerald-500"
                            : account.pnl < 0
                              ? "text-rose-500"
                              : "text-gray-500 dark:text-gray-400"
                        }`}
                        data-test-id={`account-row-pnl-${account.id}`}
                      >
                        {formatPnL(account.pnl)}
                        {account.pnlPct != null && (
                          <> · {account.pnlPct > 0 ? "+" : ""}{account.pnlPct.toFixed(1)}%</>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Sync status */}
                  <div className="hidden sm:flex items-center gap-1.5 shrink-0 w-24 text-xs font-semibold text-gray-500 dark:text-gray-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {account.syncedLabel ? `Synced ${account.syncedLabel}` : "—"}
                  </div>

                  <button
                    onClick={() => setShowManage((v) => !v)}
                    className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    aria-label="Manage account"
                    data-test-id={`account-row-manage-${account.id}`}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              ))}

              {/* Connect another account */}
              <button
                onClick={() => setView("connect")}
                className="w-full flex items-center gap-4 px-6 py-5 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 text-left hover:border-emerald-500/50 transition-colors group"
                data-test-id="connect-another-btn"
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shrink-0">
                  <Plus className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </div>
                <div>
                  <div className="font-bold text-sm text-gray-900 dark:text-gray-50">
                    Connect another account
                  </div>
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">
                    Link a prop firm via Tradovate, or import a CSV
                  </div>
                </div>
              </button>
            </div>

            {/* Manage panel — sync controls + disconnect for the connection */}
            {isConnected && showManage && (
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 py-5 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                      Trade Sync
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      <Clock className="w-3 h-3" />
                      <span>Last synced: {formatLastSync(lastSync)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {tradesSynced && (
                      <button
                        onClick={() => navigate("/trades")}
                        className="inline-flex items-center px-3 py-2 text-sm font-semibold rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                        data-test-id="view-trades-btn"
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                        View Trades
                      </button>
                    )}
                    <button
                      onClick={handleSync}
                      disabled={syncStatus === "syncing"}
                      className="inline-flex items-center px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
                      data-test-id="sync-now-btn"
                    >
                      <RefreshCw
                        className={`w-4 h-4 mr-2 ${syncStatus === "syncing" ? "animate-spin" : ""}`}
                      />
                      {syncStatus === "syncing" ? "Syncing…" : "Sync Now"}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoSync}
                      onChange={(e) => toggleAutoSync(e.target.checked)}
                      className="rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
                      data-test-id="autosync-toggle"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Auto-sync trades
                    </span>
                  </label>
                  {autoSync && (
                    <select
                      value={syncInterval}
                      onChange={(e) => setSyncInterval(parseInt(e.target.value))}
                      className="text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-2 py-1.5"
                      data-test-id="sync-interval-select"
                    >
                      <option value={300000}>Every 5 min</option>
                      <option value={900000}>Every 15 min</option>
                      <option value={1800000}>Every 30 min</option>
                      <option value={3600000}>Every 1 hour</option>
                    </select>
                  )}
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={() => disconnectBroker()}
                    className="text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 underline"
                    data-test-id="disconnect-btn"
                  >
                    Disconnect broker
                  </button>
                </div>
              </div>
            )}
          </div>

        ) : (
          /* ── CONNECT FLOW ───────────────────────────────────────── */
          <div className="space-y-8">

            <button
              onClick={() => setView("accounts")}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              data-test-id="back-to-accounts-btn"
            >
              <ArrowLeft className="w-4 h-4" />
              Accounts
            </button>

            <div className="max-w-xl">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50 mb-2.5">
                Connect an account
              </h1>
              <p className="text-base font-medium leading-relaxed text-gray-500 dark:text-gray-400">
                Pick your prop firm to securely import trades and sync performance
                automatically — no passwords shared.
              </p>
            </div>

            {/* Prop firm cards */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                  Futures prop firms
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500">
                  <Key className="w-3.5 h-3.5" />
                  Powered by Tradovate OAuth
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {PROP_FIRMS.map((firm) => {
                  const isConnectingFirm = connectingFirm === firm.id;
                  return (
                    <div
                      key={firm.id}
                      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 flex flex-col hover:border-gray-300 dark:hover:border-gray-700 hover:-translate-y-0.5 transition-all"
                      data-test-id={`firm-card-${firm.id}`}
                    >
                      <div className="flex items-center gap-3 mb-5">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-base border shrink-0 ${firm.badge}`}
                        >
                          {firm.initials}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-sm leading-tight text-gray-900 dark:text-gray-50">
                            {firm.name}
                          </div>
                          <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 mt-0.5">
                            via Tradovate
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl mb-3.5">
                        {[
                          { value: "demo", label: "Evaluation" },
                          { value: "live", label: "Funded" },
                        ].map(({ value, label }) => (
                          <button
                            key={value}
                            onClick={() => setFirmAccountType(firm.id, value)}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${
                              getAccountType(firm.id) === value
                                ? "bg-emerald-500 text-white shadow-sm"
                                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                            }`}
                            data-test-id={`firm-${firm.id}-${value}-btn`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={() => handleConnect(firm)}
                        disabled={isConnecting || Boolean(connectingFirm)}
                        className={`mt-auto w-full flex items-center justify-center gap-2 px-3 py-3 text-sm font-bold rounded-xl transition-colors ${
                          isConnectingFirm
                            ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500"
                            : "btn-gradient disabled:opacity-60"
                        }`}
                        data-test-id={`firm-connect-${firm.id}-btn`}
                      >
                        {isConnectingFirm ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Connecting…</span>
                          </>
                        ) : (
                          <>
                            <span>Connect</span>
                            <ExternalLink className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CSV import alternative */}
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

            {/* Trust strip */}
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                <Shield className="w-4 h-4 text-emerald-500" />
                OAuth 2.0 — password never shared
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                <Lock className="w-4 h-4 text-emerald-500" />
                Tokens encrypted at rest
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                <RotateCcw className="w-4 h-4 text-emerald-500" />
                Revoke access anytime
              </div>
            </div>

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
