import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import toast from "react-hot-toast";
import {
  X,
  RefreshCw,
  Pencil,
  Unplug,
  Trash2,
  AlertTriangle,
  Check,
} from "lucide-react";
import { useBroker } from "../../context/BrokerContext";

const BROKER_LABELS = { projectx: "ProjectX", tradovate: "Tradovate" };

const formatSyncTime = (date) => {
  if (!date) return "Never";
  const d = new Date(date);
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : d.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
};

/**
 * Slide-over management panel for one connected broker account: sync now,
 * rename, per-account auto-sync toggle, disconnect and delete imported trades.
 */
const ManageAccountPanel = ({ account, onClose, onReconnect, onTradesChanged }) => {
  const {
    syncAccount,
    renameAccount,
    setAccountSyncEnabled,
    disconnectAccount,
    deleteImportedTrades,
  } = useBroker();

  const [syncing, setSyncing] = useState(false);
  const [needsReconnect, setNeedsReconnect] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nickname, setNicknameValue] = useState(account.nickname ?? "");
  const [confirming, setConfirming] = useState(null); // "disconnect" | "delete" | null
  const [working, setWorking] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSyncNow = async () => {
    setSyncing(true);
    setNeedsReconnect(false);
    try {
      const { imported = 0, skipped = 0 } = await syncAccount(account.broker, account.id);
      toast.success(
        imported > 0
          ? `Imported ${imported} trade${imported !== 1 ? "s" : ""} (${skipped} already in your journal)`
          : "You're up to date — no new trades",
      );
      if (imported > 0 && typeof onTradesChanged === "function") onTradesChanged();
    } catch (err) {
      const msg = (err.message || "").toLowerCase();
      if (msg.includes("expired") || msg.includes("reconnect") || msg.includes("unauthorized")) {
        setNeedsReconnect(true);
      } else {
        toast.error(err.message || "Sync failed. Please try again.");
      }
    } finally {
      setSyncing(false);
    }
  };

  const handleRename = async () => {
    setWorking(true);
    try {
      await renameAccount(account.id, nickname);
      setEditingName(false);
      toast.success("Account renamed");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setWorking(false);
    }
  };

  const handleToggleSync = async () => {
    try {
      await setAccountSyncEnabled(account.id, !account.syncEnabled);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDisconnect = async () => {
    setWorking(true);
    try {
      await disconnectAccount(account.id);
      toast.success("Account disconnected — your imported trades are untouched");
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setWorking(false);
    }
  };

  const handleDeleteImported = async () => {
    setWorking(true);
    try {
      const count = await deleteImportedTrades(account.id);
      toast.success(`Deleted ${count} imported trade${count !== 1 ? "s" : ""}`);
      if (typeof onTradesChanged === "function") onTradesChanged();
      setConfirming(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setWorking(false);
    }
  };

  const rows = [
    { label: "Account #", value: account.externalId || "—" },
    { label: "Broker", value: BROKER_LABELS[account.broker] ?? account.broker },
    ...(account.propFirm ? [{ label: "Prop firm", value: account.propFirm }] : []),
    { label: "Type", value: account.type === "live" ? "Funded" : "Evaluation" },
    { label: "Last sync", value: formatSyncTime(account.lastSync) },
  ];

  return (
    <div
      className="fixed inset-0 z-[9999] flex justify-end bg-gray-900/50 dark:bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      data-test-id="manage-account-panel"
    >
      <div
        className="w-full sm:max-w-md h-full overflow-y-auto bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 p-5 sm:p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-6">
          <div className="min-w-0">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNicknameValue(e.target.value)}
                  maxLength={60}
                  autoFocus
                  className="w-full px-3 py-2 text-sm font-bold rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  data-test-id="manage-nickname-input"
                />
                <button
                  onClick={handleRename}
                  disabled={working}
                  className="p-2 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-60 transition-colors shrink-0"
                  aria-label="Save nickname"
                  data-test-id="manage-nickname-save-btn"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-50 truncate">
                {account.displayName}
              </h2>
            )}
            <div className="flex items-center gap-1.5 mt-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
              <span className={`w-2 h-2 rounded-full ${account.syncEnabled ? "bg-emerald-500" : "bg-gray-400"}`} />
              {account.syncEnabled ? "Connected · Sync on" : "Connected · Sync off"}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors shrink-0"
            aria-label="Close"
            data-test-id="manage-close-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Reconnect banner — shown instead of a raw error when the session died */}
        {needsReconnect && (
          <div
            className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-4 mb-6"
            data-test-id="manage-reconnect-banner"
          >
            <div className="flex items-center gap-2 font-bold text-sm text-amber-800 dark:text-amber-300 mb-1">
              <AlertTriangle className="w-4 h-4" />
              Connection needs attention
            </div>
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-3">
              Your {BROKER_LABELS[account.broker] ?? account.broker} session expired.
              Reconnect to continue syncing.
            </p>
            <button
              onClick={onReconnect}
              className="w-full px-3 py-2.5 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-600 text-white transition-colors"
              data-test-id="manage-reconnect-btn"
            >
              Reconnect
            </button>
          </div>
        )}

        {/* Detail rows */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 mb-6">
          {rows.map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between px-4 py-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {label}
              </span>
              <span
                className="text-sm font-bold text-gray-900 dark:text-gray-50 truncate max-w-[55%]"
                data-test-id={`manage-detail-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
              >
                {value}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Auto sync
            </span>
            <button
              onClick={handleToggleSync}
              role="switch"
              aria-checked={account.syncEnabled}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                account.syncEnabled ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-700"
              }`}
              data-test-id="manage-autosync-toggle"
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${
                  account.syncEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Primary actions */}
        <div className="space-y-3">
          <button
            onClick={handleSyncNow}
            disabled={syncing}
            className="w-full btn-gradient inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold disabled:opacity-60"
            data-test-id="manage-sync-now-btn"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing…" : "Sync now"}
          </button>

          <button
            onClick={() => setEditingName(true)}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            data-test-id="manage-rename-btn"
          >
            <Pencil className="w-4 h-4" />
            Rename
          </button>
        </div>

        {/* Danger zone */}
        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 space-y-3">
          {confirming === "disconnect" ? (
            <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
              <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-3">
                Disconnect this account? Syncing stops, but every trade already in
                your journal stays.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleDisconnect}
                  disabled={working}
                  className="flex-1 px-3 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white disabled:opacity-60 transition-colors"
                  data-test-id="manage-disconnect-confirm-btn"
                >
                  Yes, disconnect
                </button>
                <button
                  onClick={() => setConfirming(null)}
                  className="flex-1 px-3 py-2 rounded-xl text-xs font-bold border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200"
                  data-test-id="manage-disconnect-cancel-btn"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirming("disconnect")}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              data-test-id="manage-disconnect-btn"
            >
              <Unplug className="w-4 h-4" />
              Disconnect
            </button>
          )}

          {confirming === "delete" ? (
            <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
              <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-3">
                Permanently delete every trade imported from this account? Trades
                you journaled manually are kept. This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleDeleteImported}
                  disabled={working}
                  className="flex-1 px-3 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white disabled:opacity-60 transition-colors"
                  data-test-id="manage-delete-confirm-btn"
                >
                  {working ? "Deleting…" : "Yes, delete imported trades"}
                </button>
                <button
                  onClick={() => setConfirming(null)}
                  className="flex-1 px-3 py-2 rounded-xl text-xs font-bold border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200"
                  data-test-id="manage-delete-cancel-btn"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirming("delete")}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              data-test-id="manage-delete-imported-btn"
            >
              <Trash2 className="w-4 h-4" />
              Delete imported trades
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

ManageAccountPanel.propTypes = {
  account: PropTypes.shape({
    id: PropTypes.string.isRequired,
    displayName: PropTypes.string.isRequired,
    nickname: PropTypes.string,
    broker: PropTypes.string.isRequired,
    type: PropTypes.string,
    propFirm: PropTypes.string,
    externalId: PropTypes.string,
    syncEnabled: PropTypes.bool,
    lastSync: PropTypes.string,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onReconnect: PropTypes.func.isRequired,
  onTradesChanged: PropTypes.func,
};

export default ManageAccountPanel;
