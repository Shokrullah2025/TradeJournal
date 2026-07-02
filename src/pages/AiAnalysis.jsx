import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, AlertCircle } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import {
  fetchMarketCandles,
  clearCandleCache,
  aggregateTo4hSession,
} from "../utils/marketData";
import { getContract } from "../lib/futuresContracts";
import { computeLiveBias, buildBiasSeries } from "../lib/ict/bias";
import { backtestBias, biasCohort } from "../lib/ict/biasBacktest";
import { buildSessionProfiles } from "../lib/ict/sessionProfile";
import { smtPairFor } from "../lib/ict/smt";
import { buildObTimeline } from "../lib/ict/orderBlocks";
import { splitForming4h, buildBucketIndex, computeSetupState } from "../lib/ict/entryEngine";
import { backtestEntries, setupCohort } from "../lib/ict/entryBacktest";
import AssetTimeframeBar from "../components/ai-analysis/AssetTimeframeBar";
import LiquidityChart from "../components/ai-analysis/LiquidityChart";
import TradeSetupCard from "../components/ai-analysis/TradeSetupCard";
import DailyBiasCard from "../components/ai-analysis/DailyBiasCard";
import SessionProfileCard from "../components/ai-analysis/SessionProfileCard";
import WeeklyContextCard from "../components/ai-analysis/WeeklyContextCard";
import SmtCard from "../components/ai-analysis/SmtCard";
import HitRateCard from "../components/ai-analysis/HitRateCard";
import SetupAccuracyCard from "../components/ai-analysis/SetupAccuracyCard";
import AiNarrative from "../components/ai-analysis/AiNarrative";
import DisclaimerNotice from "../components/ai-analysis/DisclaimerNotice";

// Candle staleness budget — matches the market-data function's 5-min CDN cache.
const MAX_AGE_MS = 5 * 60 * 1000;

// Auto-refresh cadence per chart timeframe. The setup card depends on fresh
// data too, so even the daily view polls gently.
const REFRESH_MS = {
  "5m": 60_000, "15m": 60_000, "30m": 60_000,
  "1h": 300_000, "4h": 300_000, "1d": 300_000,
};

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
  const [chartCandles, setChartCandles] = useState([]);
  const [dailyCandles, setDailyCandles] = useState([]);
  const [m30Candles, setM30Candles] = useState(null); // null → session card empty state
  const [siblingDaily, setSiblingDaily] = useState(null);
  const [h1Candles, setH1Candles] = useState([]);
  const [sibling1h, setSibling1h] = useState(null);
  const [m15Candles, setM15Candles] = useState(null); // null → indicative 4h-close entry
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [riskPrefs, setRiskPrefs] = useState(loadRiskPrefs);

  const smtSibling = useMemo(() => smtPairFor(symbol), [symbol]);
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

  const loadAll = useCallback(async (cancelledRef) => {
    setError(null);
    const opts = { maxAgeMs: MAX_AGE_MS, bustSeconds: 300 };
    try {
      // Chart, daily and 1h are required; 30m (sessions), the sibling series
      // (SMT) and 15m (entry precision) degrade gracefully when they fail.
      const [chartRaw, daily, m30, sibDaily, h1, sib1h, m15] = await Promise.all([
        fetchMarketCandles("futures", symbol, timeframe === "4h" ? "1h" : timeframe, opts),
        fetchMarketCandles("futures", symbol, "1d", opts),
        fetchMarketCandles("futures", symbol, "30m", opts).catch(() => null),
        smtSibling
          ? fetchMarketCandles("futures", smtSibling, "1d", opts).catch(() => null)
          : Promise.resolve(null),
        fetchMarketCandles("futures", symbol, "1h", opts),
        smtSibling
          ? fetchMarketCandles("futures", smtSibling, "1h", opts).catch(() => null)
          : Promise.resolve(null),
        fetchMarketCandles("futures", symbol, "15m", opts).catch(() => null),
      ]);
      if (!cancelledRef.cancelled) {
        setChartCandles(timeframe === "4h" ? aggregateTo4hSession(chartRaw) : chartRaw);
        setDailyCandles(daily);
        setM30Candles(m30);
        setSiblingDaily(sibDaily);
        setH1Candles(h1);
        setSibling1h(sib1h);
        setM15Candles(m15);
        setLastUpdated(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      }
    } catch (err) {
      if (!cancelledRef.cancelled) {
        setChartCandles([]);
        setDailyCandles([]);
        setH1Candles([]);
        setError(err.message || "Could not load chart data. Please try again.");
      }
    } finally {
      if (!cancelledRef.cancelled) setLoading(false);
    }
  }, [symbol, timeframe, smtSibling]);

  // Fetch on mount and whenever the selection (or a manual refresh) changes.
  useEffect(() => {
    const cancelledRef = { cancelled: false };
    setLoading(true);
    loadAll(cancelledRef);
    return () => {
      cancelledRef.cancelled = true;
    };
  }, [loadAll, refreshNonce]);

  // Background auto-refresh — silent (no loading flash), interval per timeframe.
  useEffect(() => {
    const ms = REFRESH_MS[timeframe];
    if (!ms) return undefined;
    const cancelledRef = { cancelled: false };
    const id = setInterval(() => loadAll(cancelledRef), ms);
    return () => {
      cancelledRef.cancelled = true;
      clearInterval(id);
    };
  }, [loadAll, timeframe]);

  const handleRefresh = useCallback(() => {
    for (const tf of [timeframe === "4h" ? "1h" : timeframe, "1d", "30m", "1h", "15m"]) {
      clearCandleCache("futures", symbol, tf);
    }
    if (smtSibling) {
      clearCandleCache("futures", smtSibling, "1d");
      clearCandleCache("futures", smtSibling, "1h");
    }
    setRefreshNonce((n) => n + 1);
  }, [symbol, timeframe, smtSibling]);

  // ── ICT pipeline, all pure and memoized ────────────────────────────────
  const profiles = useMemo(
    () =>
      m30Candles && dailyCandles.length
        ? buildSessionProfiles(m30Candles, dailyCandles, { days: 2 })
        : null,
    [m30Candles, dailyCandles],
  );

  // The bias factor uses the latest COMPLETED day's session annotations.
  const latestCompletedDay = useMemo(() => {
    if (!profiles?.length) return null;
    for (let k = profiles.length - 1; k >= 0; k--) {
      if (profiles[k].complete) return profiles[k];
    }
    return null;
  }, [profiles]);

  const bias = useMemo(
    () =>
      dailyCandles.length
        ? computeLiveBias(dailyCandles, { siblingDaily, symbol, sessionDay: latestCompletedDay })
        : null,
    [dailyCandles, siblingDaily, symbol, latestCompletedDay],
  );

  // One bias series feeds the bias backtest, the entry backtest and the gate.
  const biasSeries = useMemo(
    () => (dailyCandles.length ? buildBiasSeries(dailyCandles, { siblingDaily, symbol }) : null),
    [dailyCandles, siblingDaily, symbol],
  );

  const accuracy = useMemo(
    () => backtestBias(dailyCandles, { siblingDaily, symbol, series: biasSeries }),
    [dailyCandles, siblingDaily, symbol, biasSeries],
  );

  const cohort = useMemo(() => biasCohort(accuracy, bias), [accuracy, bias]);

  // ── Entry engine: 4H structure from the 1h series ──────────────────────
  const fourH = useMemo(() => {
    if (!h1Candles.length) return { completed: [], forming: null };
    return splitForming4h(
      aggregateTo4hSession(h1Candles),
      h1Candles[h1Candles.length - 1].time,
    );
  }, [h1Candles]);

  const siblingByTime = useMemo(() => {
    if (!sibling1h?.length) return null;
    const { completed } = splitForming4h(
      aggregateTo4hSession(sibling1h),
      sibling1h[sibling1h.length - 1].time,
    );
    return buildBucketIndex(completed);
  }, [sibling1h]);

  const obTimeline = useMemo(
    () => (fourH.completed.length ? buildObTimeline(fourH.completed) : null),
    [fourH],
  );

  const setup = useMemo(
    () =>
      obTimeline
        ? computeSetupState({
            bias,
            candles4h: fourH.completed,
            forming4h: fourH.forming,
            obTimeline,
            siblingByTime,
            hasPair: !!smtSibling,
            m15Candles,
            levels: bias?.snapshot?.levels ?? null,
            contract,
            now: Date.now() / 1000,
          })
        : null,
    [obTimeline, bias, fourH, siblingByTime, smtSibling, m15Candles, contract],
  );

  const setupAccuracy = useMemo(
    () =>
      backtestEntries(h1Candles, dailyCandles, {
        siblingDaily, sibling1h, symbol, contract, biasSeries,
      }),
    [h1Candles, dailyCandles, siblingDaily, sibling1h, symbol, contract, biasSeries],
  );

  const setupCohortMemo = useMemo(() => setupCohort(setupAccuracy, setup), [setupAccuracy, setup]);

  return (
    <div className="space-y-6" data-testid="ai-analysis-page">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">AI Analysis</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          ICT top-down analysis for futures — daily bias, 4H order-block setups with
          lower-timeframe entries, and the measured historical accuracy of the same rules.
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
          <span>Loading {symbol} data…</span>
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

      {!loading && !error && chartCandles.length > 0 && (
        <>
          <div className="card p-2 sm:p-3">
            <LiquidityChart
              candles={chartCandles}
              levels={bias?.snapshot?.levels}
              obZone={setup?.ob ? { high: setup.ob.zoneHigh, low: setup.ob.zoneLow } : null}
              setupLines={
                setup?.state === "SETUP_ACTIVE" && setup.plan
                  ? { entry: setup.plan.entry, stop: setup.plan.stop, target: setup.plan.target }
                  : null
              }
              isDark={isDark}
            />
          </div>

          <TradeSetupCard
            setup={setup}
            symbol={symbol}
            contract={contract}
            accountBalance={riskPrefs.balance}
            riskPct={riskPrefs.riskPct}
            onAccountBalanceChange={(v) => setRiskPrefs((p) => ({ ...p, balance: v }))}
            onRiskPctChange={(v) => setRiskPrefs((p) => ({ ...p, riskPct: v }))}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DailyBiasCard bias={bias} symbol={symbol} />
            <SessionProfileCard profiles={profiles} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WeeklyContextCard weekly={bias?.snapshot?.weekly} />
            <SmtCard smt={bias?.snapshot?.smt} symbol={symbol} />
          </div>

          <HitRateCard results={accuracy} cohort={cohort} bias={bias} />

          <SetupAccuracyCard results={setupAccuracy} cohort={setupCohortMemo} setup={setup} />

          <AiNarrative
            symbol={symbol}
            bias={bias}
            accuracy={accuracy}
            cohort={cohort}
            setup={setup}
            setupAccuracy={setupAccuracy}
          />
        </>
      )}
    </div>
  );
};

export default AiAnalysis;
