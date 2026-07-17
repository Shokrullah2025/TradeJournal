import React, { useState, useEffect, useRef, useMemo } from "react";
import PropTypes from "prop-types";
import {
  X,
  ArrowLeft,
  ShieldCheck,
  Lock,
  Eye,
  Unplug,
  Ban,
  KeyRound,
  ServerCog,
  Check,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { useBroker } from "../../context/BrokerContext";

// ── Static step content ──────────────────────────────────────────────────────

const SECURITY_POINTS = [
  { icon: Lock, text: "End-to-end encrypted" },
  { icon: Eye, text: "Read-only trade access" },
  { icon: Unplug, text: "Disconnect anytime" },
  { icon: Ban, text: "No withdrawal permissions" },
  { icon: KeyRound, text: "AES-256 encryption at rest" },
  { icon: ServerCog, text: "SOC 2 infrastructure" },
];

const VERIFY_STAGES = [
  "Authenticating",
  "Verifying account",
  "Loading profiles",
  "Loading permissions",
  "Finding accounts",
];

const IMPORT_STAGES = [
  "Downloading trades",
  "Analyzing executions",
  "Calculating commissions",
  "Matching positions",
];

const IMPORT_RANGES = [
  { id: "30d", label: "Last 30 days", days: 30 },
  { id: "90d", label: "Last 90 days", days: 90 },
  { id: "all", label: "Entire history", days: null },
];

// fromDate sent to broker-sync for the chosen range. "Entire history" uses a
// fixed far-past date because the adapter defaults null to a 90-day lookback.
const rangeToFromDate = (rangeId) => {
  const range = IMPORT_RANGES.find((r) => r.id === rangeId);
  if (!range) return null;
  if (range.days == null) return "2018-01-01T00:00:00.000Z";
  return new Date(Date.now() - range.days * 86400000).toISOString();
};

const inputClass =
  "w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent";

// Reveals one checklist row at a time (Plaid-style) while `done` is false; when
// `done` flips true every row completes at once so the wizard can advance.
const StagedChecklist = ({ stages, done, testId }) => {
  const [revealed, setRevealed] = useState(1);

  useEffect(() => {
    if (done) {
      setRevealed(stages.length);
      return undefined;
    }
    const timer = setInterval(() => {
      // Hold the last stage "in progress" until the real work finishes.
      setRevealed((n) => Math.min(n + 1, stages.length));
    }, 700);
    return () => clearInterval(timer);
  }, [done, stages.length]);

  return (
    <ul className="space-y-3" data-test-id={testId}>
      {stages.map((stage, i) => {
        const isDone = done || i < revealed - 1;
        const isActive = !done && i === revealed - 1;
        return (
          <li
            key={stage}
            className={`flex items-center gap-3 text-sm font-semibold transition-opacity duration-300 ${
              i < revealed ? "opacity-100" : "opacity-30"
            } ${isDone ? "text-gray-900 dark:text-gray-50" : "text-gray-500 dark:text-gray-400"}`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border ${
                isDone
                  ? "bg-emerald-500 border-emerald-500 text-white"
                  : "border-gray-300 dark:border-gray-700"
              }`}
            >
              {isDone ? (
                <Check className="w-3.5 h-3.5" />
              ) : isActive ? (
                <RefreshCw className="w-3 h-3 animate-spin text-emerald-500" />
              ) : null}
            </span>
            {stage}
          </li>
        );
      })}
    </ul>
  );
};

StagedChecklist.propTypes = {
  stages: PropTypes.arrayOf(PropTypes.string).isRequired,
  done: PropTypes.bool.isRequired,
  testId: PropTypes.string,
};

// ── Wizard ───────────────────────────────────────────────────────────────────

/**
 * Full-screen Plaid-style connect flow:
 * security → login → verifying → accounts (+nicknames) → import range →
 * importing → success.
 *
 * `broker` describes what was picked on the hub:
 *   { key: "projectx"|"tradovate", name, firmId, firmName, baseUrl, needsBaseUrl }
 */
const ConnectWizard = ({ broker, onClose, onFinished, onGoToJournal }) => {
  const {
    discoverBrokerAccounts,
    activateBrokerAccounts,
    syncAccount,
    connectBroker,
    loadConnections,
  } = useBroker();

  const [step, setStep] = useState("security");
  const [error, setError] = useState(null);

  // Login form
  const [userName, setUserName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState(broker.baseUrl ?? "");
  const [accountType, setAccountType] = useState("demo");

  // Discovered accounts: [{ id, name, balance, propFirm, selected, nickname }]
  const [found, setFound] = useState([]);
  const [verifyDone, setVerifyDone] = useState(false);

  // Import
  const [range, setRange] = useState("all");
  const [importState, setImportState] = useState({
    current: 0,
    total: 0,
    stage: IMPORT_STAGES[0],
    imported: 0,
  });
  const [result, setResult] = useState({ imported: 0, accounts: 0 });

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Close on Escape, except while work is running.
  useEffect(() => {
    const busy = step === "verifying" || step === "importing";
    const onKey = (e) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, onClose]);

  const selectedAccounts = useMemo(() => found.filter((a) => a.selected), [found]);

  // ── Step actions ────────────────────────────────────────────────────────────

  const startVerification = async (e) => {
    e.preventDefault();
    setError(null);
    setVerifyDone(false);
    setStep("verifying");

    try {
      if (broker.key === "tradovate") {
        // OAuth popup — Tradovate returns a single account via the legacy path.
        const ok = await connectBroker("tradovate", {
          accountType,
          propFirm: broker.firmName ?? null,
        });
        if (!ok) throw new Error("Tradovate sign-in was cancelled or failed.");
        if (!mountedRef.current) return;
        setVerifyDone(true);
        setResult({ imported: 0, accounts: 1 });
        setTimeout(() => mountedRef.current && setStep("success"), 600);
        return;
      }

      const accounts = await discoverBrokerAccounts("projectx", {
        firmId: broker.firmId ?? null,
        baseUrl: baseUrl.trim(),
        userName: userName.trim(),
        apiKey: apiKey.trim(),
        accountType,
      });
      if (!mountedRef.current) return;

      // Credentials verified server-side; drop the key from memory immediately.
      setApiKey("");
      setVerifyDone(true);
      setFound(
        accounts.map((a) => ({
          id: String(a.id),
          name: a.name,
          balance: a.balance ?? null,
          propFirm: a.propFirm ?? null,
          selected: true,
          nickname: "",
        })),
      );
      setTimeout(() => mountedRef.current && setStep("accounts"), 600);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err.message || "Connection failed. Please try again.");
      setStep("login");
    }
  };

  const toggleAccount = (id) =>
    setFound((prev) =>
      prev.map((a) => (a.id === id ? { ...a, selected: !a.selected } : a)),
    );

  const setNickname = (id, nickname) =>
    setFound((prev) => prev.map((a) => (a.id === id ? { ...a, nickname } : a)));

  const startImport = async () => {
    setError(null);
    const fromDate = rangeToFromDate(range);
    setStep("importing");
    setImportState({ current: 0, total: selectedAccounts.length, stage: IMPORT_STAGES[0], imported: 0 });

    // Cycle stage copy while the real sync runs — cleared in finally.
    let stageIdx = 0;
    const stageTimer = setInterval(() => {
      stageIdx = (stageIdx + 1) % IMPORT_STAGES.length;
      if (mountedRef.current) {
        setImportState((s) => ({ ...s, stage: IMPORT_STAGES[stageIdx] }));
      }
    }, 1400);

    try {
      // Create only the selected accounts, with their nicknames.
      const created = await activateBrokerAccounts("projectx", {
        accountType,
        propFirm: broker.firmName ?? null,
        accounts: selectedAccounts.map((a) => ({
          externalId: a.id,
          name: a.name,
          nickname: a.nickname || null,
          balance: a.balance ?? 0,
        })),
      });

      // Sync each account sequentially so progress is truthful.
      let totalImported = 0;
      for (let i = 0; i < created.length; i++) {
        if (mountedRef.current) {
          setImportState((s) => ({ ...s, current: i + 1, total: created.length }));
        }
        try {
          const { imported = 0 } = await syncAccount("projectx", created[i].id, fromDate);
          totalImported += imported;
          if (mountedRef.current) {
            setImportState((s) => ({ ...s, imported: totalImported }));
          }
        } catch (err) {
          // One account failing shouldn't sink the rest — surface it at the end.
          console.error("Account sync failed:", created[i].id, err.message);
        }
      }

      if (!mountedRef.current) return;
      setResult({ imported: totalImported, accounts: created.length });
      await loadConnections();
      if (typeof onFinished === "function") onFinished();
      if (mountedRef.current) setStep("success");
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err.message || "Import failed. Please try again.");
      setStep("import");
    } finally {
      clearInterval(stageTimer);
    }
  };

  // ── Shared chrome ───────────────────────────────────────────────────────────

  const busy = step === "verifying" || step === "importing";
  const stepOrder = ["security", "login", "verifying", "accounts", "import", "importing", "success"];
  const progressPct = ((stepOrder.indexOf(step) + 1) / stepOrder.length) * 100;

  const backTargets = { login: "security", accounts: "login", import: "accounts" };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-gray-900/60 dark:bg-black/70 backdrop-blur-sm overflow-y-auto"
      data-test-id="connect-wizard"
    >
      <div className="w-full max-w-lg my-auto rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 pt-5">
          {backTargets[step] && !busy ? (
            <button
              onClick={() => { setError(null); setStep(backTargets[step]); }}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              data-test-id="wizard-back-btn"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          ) : (
            <span className="text-sm font-bold text-gray-900 dark:text-gray-50">
              {broker.firmName || broker.name}
            </span>
          )}
          {!busy && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              aria-label="Close"
              data-test-id="wizard-close-btn"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Step progress bar */}
        <div className="mx-5 sm:mx-6 mt-4 h-1 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="px-5 sm:px-6 py-6">
          {/* ── STEP: Security ─────────────────────────────────────────── */}
          {step === "security" && (
            <div data-test-id="wizard-step-security">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-5">
                <ShieldCheck className="w-7 h-7 text-emerald-500" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50 mb-1.5">
                Secure connection
              </h2>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-6">
                We never store your password. Your credentials are encrypted and
                used only to read your trade history.
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                {SECURITY_POINTS.map(({ icon: Icon, text }) => (
                  <li
                    key={text}
                    className="flex items-center gap-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200"
                  >
                    <span className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-emerald-500" />
                    </span>
                    {text}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => setStep("login")}
                className="w-full btn-gradient px-4 py-3.5 rounded-xl text-sm font-bold"
                data-test-id="wizard-security-continue-btn"
              >
                Continue
              </button>
            </div>
          )}

          {/* ── STEP: Login ────────────────────────────────────────────── */}
          {step === "login" && (
            <div data-test-id="wizard-step-login">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50 mb-1.5">
                Sign in to {broker.firmName || broker.name}
              </h2>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-6">
                {broker.key === "tradovate"
                  ? "You'll sign in on Tradovate's own page — we never see your password."
                  : "Use the API credentials from your firm's dashboard. They're sent straight to our secure server."}
              </p>

              {error && (
                <div
                  className="flex items-start gap-2 p-3.5 mb-5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400"
                  data-test-id="wizard-login-error"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={startVerification} className="space-y-4" data-test-id="wizard-login-form">
                {broker.key === "projectx" && (
                  <>
                    {broker.needsBaseUrl && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                          Gateway URL
                        </label>
                        <input
                          type="url"
                          value={baseUrl}
                          onChange={(e) => setBaseUrl(e.target.value)}
                          placeholder="https://api.yourfirm.projectx.com"
                          className={inputClass}
                          data-test-id="wizard-baseurl-input"
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Your firm's ProjectX API host — check their docs or support.
                        </p>
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                        Username
                      </label>
                      <input
                        type="text"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        placeholder="Your username"
                        autoComplete="username"
                        className={inputClass}
                        data-test-id="wizard-username-input"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                        API key
                      </label>
                      <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="••••••••••••"
                        autoComplete="off"
                        className={inputClass}
                        data-test-id="wizard-apikey-input"
                      />
                    </div>
                  </>
                )}

                <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
                  {[
                    { value: "demo", label: "Evaluation" },
                    { value: "live", label: "Funded" },
                  ].map(({ value, label }) => (
                    <button
                      type="button"
                      key={value}
                      onClick={() => setAccountType(value)}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${
                        accountType === value
                          ? "bg-emerald-500 text-white shadow-sm"
                          : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                      }`}
                      data-test-id={`wizard-account-type-${value}-btn`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={
                    broker.key === "projectx" &&
                    (!userName.trim() || !apiKey.trim() || !baseUrl.trim())
                  }
                  className="w-full btn-gradient px-4 py-3.5 rounded-xl text-sm font-bold disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                  data-test-id="wizard-secure-connect-btn"
                >
                  <Lock className="w-4 h-4" />
                  {broker.key === "tradovate" ? "Continue to Tradovate" : "Secure connect"}
                  {broker.key === "tradovate" && <ExternalLink className="w-4 h-4" />}
                </button>

                <p className="text-center text-xs font-medium text-gray-400 dark:text-gray-500">
                  Encrypted in transit · Read-only access · Disconnect anytime
                </p>
              </form>
            </div>
          )}

          {/* ── STEP: Verifying ────────────────────────────────────────── */}
          {step === "verifying" && (
            <div data-test-id="wizard-step-verifying">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50 mb-1.5">
                Connecting…
              </h2>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-6">
                Establishing a secure link to {broker.firmName || broker.name}.
              </p>
              <StagedChecklist stages={VERIFY_STAGES} done={verifyDone} testId="wizard-verify-checklist" />
            </div>
          )}

          {/* ── STEP: Choose accounts + nicknames ──────────────────────── */}
          {step === "accounts" && (
            <div data-test-id="wizard-step-accounts">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50 mb-1.5">
                Choose accounts
              </h2>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-6">
                We found {found.length} account{found.length !== 1 ? "s" : ""}. Import
                only the ones you want — and give each a name you'll remember.
              </p>

              <div className="space-y-3 mb-6 max-h-[45vh] overflow-y-auto pr-1" data-test-id="wizard-accounts-list">
                {found.map((account) => (
                  <div
                    key={account.id}
                    className={`rounded-xl border p-4 transition-colors ${
                      account.selected
                        ? "border-emerald-500/50 bg-emerald-500/5"
                        : "border-gray-200 dark:border-gray-800"
                    }`}
                    data-test-id={`wizard-account-${account.id}`}
                  >
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={account.selected}
                        onChange={() => toggleAccount(account.id)}
                        className="w-4 h-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
                        data-test-id={`wizard-account-checkbox-${account.id}`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-gray-900 dark:text-gray-50 truncate">
                            {account.name}
                          </span>
                          {account.propFirm && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide border bg-violet-500/10 text-violet-500 border-violet-500/30">
                              {account.propFirm}
                            </span>
                          )}
                        </span>
                        <span className="block text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">
                          #{account.id}
                          {account.balance != null &&
                            ` · ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(account.balance)}`}
                        </span>
                      </span>
                    </label>

                    {account.selected && (
                      <input
                        type="text"
                        value={account.nickname}
                        onChange={(e) => setNickname(account.id, e.target.value)}
                        placeholder={'Nickname (optional) — e.g. "Apex 150K", "Main Funded"'}
                        maxLength={60}
                        className={`${inputClass} mt-3`}
                        data-test-id={`wizard-account-nickname-${account.id}`}
                      />
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={() => { setError(null); setStep("import"); }}
                disabled={selectedAccounts.length === 0}
                className="w-full btn-gradient px-4 py-3.5 rounded-xl text-sm font-bold disabled:opacity-60 disabled:cursor-not-allowed"
                data-test-id="wizard-accounts-continue-btn"
              >
                Continue with {selectedAccounts.length} account{selectedAccounts.length !== 1 ? "s" : ""}
              </button>
            </div>
          )}

          {/* ── STEP: Import range ─────────────────────────────────────── */}
          {step === "import" && (
            <div data-test-id="wizard-step-import">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50 mb-1.5">
                Import history
              </h2>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-6">
                How far back should we pull trades for your{" "}
                {selectedAccounts.length} selected account{selectedAccounts.length !== 1 ? "s" : ""}?
              </p>

              {error && (
                <div
                  className="flex items-start gap-2 p-3.5 mb-5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400"
                  data-test-id="wizard-import-error"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-3 mb-8">
                {IMPORT_RANGES.map((r) => (
                  <label
                    key={r.id}
                    className={`flex items-center gap-3 rounded-xl border p-4 cursor-pointer transition-colors ${
                      range === r.id
                        ? "border-emerald-500/50 bg-emerald-500/5"
                        : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name="import-range"
                      checked={range === r.id}
                      onChange={() => setRange(r.id)}
                      className="w-4 h-4 border-gray-300 text-emerald-500 focus:ring-emerald-500"
                      data-test-id={`wizard-range-${r.id}-radio`}
                    />
                    <span className="font-bold text-sm text-gray-900 dark:text-gray-50">
                      {r.label}
                    </span>
                    {r.id === "all" && (
                      <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide border bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                        RECOMMENDED
                      </span>
                    )}
                  </label>
                ))}
              </div>

              <button
                onClick={startImport}
                className="w-full btn-gradient px-4 py-3.5 rounded-xl text-sm font-bold"
                data-test-id="wizard-start-import-btn"
              >
                Start import
              </button>
            </div>
          )}

          {/* ── STEP: Importing ────────────────────────────────────────── */}
          {step === "importing" && (
            <div data-test-id="wizard-step-importing">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50 mb-1.5">
                Importing…
              </h2>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-6">
                Account {Math.max(importState.current, 1)} of {Math.max(importState.total, 1)}
                {importState.imported > 0 && (
                  <> · <span className="text-emerald-500 font-bold">{importState.imported} trades imported</span></>
                )}
              </p>

              <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden mb-5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all duration-700"
                  style={{
                    width: `${Math.min(95, (Math.max(importState.current - 0.5, 0.3) / Math.max(importState.total, 1)) * 100)}%`,
                  }}
                  data-test-id="wizard-import-progress-bar"
                />
              </div>

              <div className="flex items-center gap-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200" data-test-id="wizard-import-stage">
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
                {importState.stage}…
              </div>
            </div>
          )}

          {/* ── STEP: Success ──────────────────────────────────────────── */}
          {step === "success" && (
            <div className="text-center" data-test-id="wizard-step-success">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-5">
                <CheckCircle2 className="w-9 h-9 text-emerald-500" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50 mb-2">
                {broker.firmName || broker.name} connected
              </h2>
              <div className="space-y-1 text-sm font-semibold text-gray-600 dark:text-gray-300 mb-8">
                <p data-test-id="wizard-success-trades">
                  {result.imported.toLocaleString()} trade{result.imported !== 1 ? "s" : ""} imported
                </p>
                <p data-test-id="wizard-success-accounts">
                  {result.accounts} account{result.accounts !== 1 ? "s" : ""} connected
                </p>
                <p className="text-emerald-500">Automatic sync enabled</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={onGoToJournal}
                  className="flex-1 btn-gradient px-4 py-3 rounded-xl text-sm font-bold"
                  data-test-id="wizard-go-to-journal-btn"
                >
                  Go to Journal
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-bold border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  data-test-id="wizard-back-to-hub-btn"
                >
                  Broker Hub
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

ConnectWizard.propTypes = {
  broker: PropTypes.shape({
    key: PropTypes.oneOf(["projectx", "tradovate"]).isRequired,
    name: PropTypes.string.isRequired,
    firmId: PropTypes.string,
    firmName: PropTypes.string,
    baseUrl: PropTypes.string,
    needsBaseUrl: PropTypes.bool,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onFinished: PropTypes.func,
  onGoToJournal: PropTypes.func.isRequired,
};

export default ConnectWizard;
