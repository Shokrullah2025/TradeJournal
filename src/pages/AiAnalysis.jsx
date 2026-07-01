import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, AlertCircle } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import {
  fetchMarketCandles,
  clearCandleCache,
  aggregateTo4hSession,
} from "../utils/marketData";
import { getContract } from "../lib/futuresContracts";
import { computeLiveSignal } from "../lib/signals/engine";
import { backtestSignals, matchingCohort } from "../lib/signals/backtest";
import AssetTimeframeBar from "../components/ai-analysis/AssetTimeframeBar";
import SignalChart from "../components/ai-analysis/SignalChart";
import SignalCard from "../components/ai-analysis/SignalCard";
import HitRateCard from "../components/ai-analysis/HitRateCard";
import RiskPanel from "../components/ai-analysis/RiskPanel";
import AiNarrative from "../components/ai-analysis/AiNarrative";
import DisclaimerNotice from "../components/ai-analysis/DisclaimerNotice";

// Candle staleness budget — matches the market-data function's 5-min CDN cache.
const MAX_AGE_MS = 5 * 60 * 1000;

// Auto-refresh cadence per timeframe. Daily bars don't need polling.
const REFRESH_MS = { "5m": 60_000, "15m": 60_000, "30m": 60_000, "1h": 300_000, "4h": 300_000 };

// Risk inputs are UI preferences, not trade data — localStorage is fine here.
const RISK_PREFS_KEY = "ai_analysis_risk_prefs";

function loadRiskPrefs() {
  try {
    const raw = localStorage.getItem(RISK_PREFS_KEY);
    if (raw) {
      const { balance, riskPct } = JSON.parse(raw);
      return { balance: String(balance ?? "10000"), riskPct: String(riskPct ?? "1") };
    }
  } catch { /* corrupted prefs — fall through to defaults */ }
  return { balance: "10000", riskPct: "1" };
}

const AiAnalysis = () => {
  const { isDark } = useTheme();
  const [symbol, setSymbol] = useState("ES");
  const [timeframe, setTimeframe] = useState("15m");
  const [candles, setCandles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [riskPrefs, setRiskPrefs] = useState(loadRiskPrefs);

  const contract = useMemo(() => getContract(symbol), [symbol]);

  // Persist risk inputs so they survive reloads.
  useEffect(() => {
    try {
      localStorage.setItem(
        RISK_PREFS_KEY,
        JSON.stringify({ balance: riskPrefs.balance, riskPct: riskPrefs.riskPct }),
      );
    } catch { /* storage unavailable — inputs still work for the session */ }
  }, [riskPrefs]);

  const loadCandles = useCallback(async (cancelledRef) => {
    setError(null);
    try {
      // The edge function's 4h buckets are UTC-aligned; futures sessions open
      // at 18:00 ET, so fetch 1h and re-aggregate session-aligned (as Backtest does).
      const raw = await fetchMarketCandles(
        "futures",
        symbol,
        timeframe === "4h" ? "1h" : timeframe,
        { maxAgeMs: MAX_AGE_MS, bustSeconds: 300 },
      );
      const data = timeframe === "4h" ? aggregateTo4hSession(raw) : raw;
      if (!cancelledRef.cancelled) {
        setCandles(data);
        setLastUpdated(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      }
    } catch (err) {
      if (!cancelledRef.cancelled) {
        setCandles([]);
        setError(err.message || "Could not load chart data. Please try again.");
      }
    } finally {
      if (!cancelledRef.cancelled) setLoading(false);
    }
  }, [symbol, timeframe]);

  // Fetch on mount and whenever the selection (or a manual refresh) changes.
  useEffect(() => {
    const cancelledRef = { cancelled: false };
    setLoading(true);
    loadCandles(cancelledRef);
    return () => {
      cancelledRef.cancelled = true;
    };
  }, [loadCandles, refreshNonce]);

  // Background auto-refresh — silent (no loading flash), interval per timeframe.
  useEffect(() => {
    const ms = REFRESH_MS[timeframe];
    if (!ms) return undefined;
    const cancelledRef = { cancelled: false };
    const id = setInterval(() => loadCandles(cancelledRef), ms);
    return () => {
      cancelledRef.cancelled = true;
      clearInterval(id);
    };
  }, [loadCandles, timeframe]);

  const handleRefresh = useCallback(() => {
    clearCandleCache("futures", symbol, timeframe === "4h" ? "1h" : timeframe);
    setRefreshNonce((n) => n + 1);
  }, [symbol, timeframe]);

  // Engine → backtest → cohort, all deterministic and memoized on the candles.
  const signal = useMemo(
    () => (candles.length ? computeLiveSignal(candles, timeframe, contract) : null),
    [candles, timeframe, contract],
  );
  const results = useMemo(
    () => backtestSignals(candles, timeframe, { contract }),
    [candles, timeframe, contract],
  );
  const cohort = useMemo(() => matchingCohort(results, signal), [results, signal]);

  return (
    <div className="space-y-6" data-testid="ai-analysis-page">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">AI Analysis</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Rule-based direction, entry, stop and target for futures — with the setup&apos;s real
          historical hit rate and position sizing for your account.
        </p>
      </div>

      <DisclaimerNotice />

      <AssetTimeframeBar
        symbol={symbol}
        timeframe={timeframe}
        onSymbolChange={setSymbol}
        onTimeframeChange={setTimeframe}
        onRefresh={handleRefresh}
        loading={loading}
        lastUpdated={lastUpdated}
      />

      {loading && (
        <div
          className="card flex items-center justify-center py-16 text-gray-500 dark:text-gray-400"
          data-testid="ai-analysis-loading-spinner"
        >
          <RefreshCw className="w-6 h-6 animate-spin mr-2" />
          <span>Loading {symbol} {timeframe} data…</span>
        </div>
      )}

      {!loading && error && (
        <div
          className="card flex items-start gap-2 border-danger-100 dark:border-danger-800"
          data-testid="ai-analysis-error"
        >
          <AlertCircle className="w-5 h-5 text-danger-600 dark:text-danger-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-danger-700 dark:text-danger-300">{error}</p>
            <button
              type="button"
              onClick={handleRefresh}
              data-testid="ai-analysis-retry-btn"
              className="mt-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {!loading && !error && candles.length > 0 && (
        <>
          <div className="card p-2 sm:p-3">
            <SignalChart candles={candles} signal={signal} isDark={isDark} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SignalCard signal={signal} symbol={symbol} />
            <RiskPanel
              signal={signal}
              contract={contract}
              accountBalance={riskPrefs.balance}
              riskPct={riskPrefs.riskPct}
              onAccountBalanceChange={(v) => setRiskPrefs((p) => ({ ...p, balance: v }))}
              onRiskPctChange={(v) => setRiskPrefs((p) => ({ ...p, riskPct: v }))}
            />
          </div>

          <HitRateCard results={results} cohort={cohort} signal={signal} timeframe={timeframe} />

          <AiNarrative
            symbol={symbol}
            timeframe={timeframe}
            signal={signal}
            results={results}
            cohort={cohort}
          />
        </>
      )}
    </div>
  );
};

export default AiAnalysis;
