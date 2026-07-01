import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, AlertCircle } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import {
  fetchMarketCandles,
  clearCandleCache,
  aggregateTo4hSession,
} from "../utils/marketData";
import { computeLiveBias } from "../lib/ict/bias";
import { backtestBias, biasCohort } from "../lib/ict/biasBacktest";
import { buildSessionProfiles } from "../lib/ict/sessionProfile";
import { smtPairFor } from "../lib/ict/smt";
import AssetTimeframeBar from "../components/ai-analysis/AssetTimeframeBar";
import LiquidityChart from "../components/ai-analysis/LiquidityChart";
import DailyBiasCard from "../components/ai-analysis/DailyBiasCard";
import SessionProfileCard from "../components/ai-analysis/SessionProfileCard";
import WeeklyContextCard from "../components/ai-analysis/WeeklyContextCard";
import SmtCard from "../components/ai-analysis/SmtCard";
import HitRateCard from "../components/ai-analysis/HitRateCard";
import AiNarrative from "../components/ai-analysis/AiNarrative";
import DisclaimerNotice from "../components/ai-analysis/DisclaimerNotice";

// Candle staleness budget — matches the market-data function's 5-min CDN cache.
const MAX_AGE_MS = 5 * 60 * 1000;

// Auto-refresh cadence per chart timeframe. Daily bars don't need polling.
const REFRESH_MS = { "5m": 60_000, "15m": 60_000, "30m": 60_000, "1h": 300_000, "4h": 300_000 };

const AiAnalysis = () => {
  const { isDark } = useTheme();
  const [symbol, setSymbol] = useState("ES");
  const [timeframe, setTimeframe] = useState("15m");
  const [chartCandles, setChartCandles] = useState([]);
  const [dailyCandles, setDailyCandles] = useState([]);
  const [m30Candles, setM30Candles] = useState(null); // null → session card empty state
  const [siblingDaily, setSiblingDaily] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const smtSibling = useMemo(() => smtPairFor(symbol), [symbol]);

  const loadAll = useCallback(async (cancelledRef) => {
    setError(null);
    try {
      // Chart candles and daily candles are required; the 30m session data
      // and the SMT sibling degrade gracefully when they fail.
      const [chartRaw, daily, m30, sibling] = await Promise.all([
        fetchMarketCandles(
          "futures",
          symbol,
          timeframe === "4h" ? "1h" : timeframe,
          { maxAgeMs: MAX_AGE_MS, bustSeconds: 300 },
        ),
        fetchMarketCandles("futures", symbol, "1d", { maxAgeMs: MAX_AGE_MS, bustSeconds: 300 }),
        fetchMarketCandles("futures", symbol, "30m", { maxAgeMs: MAX_AGE_MS, bustSeconds: 300 })
          .catch(() => null),
        smtSibling
          ? fetchMarketCandles("futures", smtSibling, "1d", { maxAgeMs: MAX_AGE_MS, bustSeconds: 300 })
              .catch(() => null)
          : Promise.resolve(null),
      ]);
      if (!cancelledRef.cancelled) {
        setChartCandles(timeframe === "4h" ? aggregateTo4hSession(chartRaw) : chartRaw);
        setDailyCandles(daily);
        setM30Candles(m30);
        setSiblingDaily(sibling);
        setLastUpdated(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      }
    } catch (err) {
      if (!cancelledRef.cancelled) {
        setChartCandles([]);
        setDailyCandles([]);
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
    clearCandleCache("futures", symbol, timeframe === "4h" ? "1h" : timeframe);
    clearCandleCache("futures", symbol, "1d");
    clearCandleCache("futures", symbol, "30m");
    if (smtSibling) clearCandleCache("futures", smtSibling, "1d");
    setRefreshNonce((n) => n + 1);
  }, [symbol, timeframe, smtSibling]);

  // ICT pipeline, all pure and memoized: session profiles → live bias →
  // historical bias accuracy → matching cohort.
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

  const accuracy = useMemo(
    () => backtestBias(dailyCandles, { siblingDaily, symbol }),
    [dailyCandles, siblingDaily, symbol],
  );

  const cohort = useMemo(() => biasCohort(accuracy, bias), [accuracy, bias]);

  return (
    <div className="space-y-6" data-testid="ai-analysis-page">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">AI Analysis</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          ICT top-down analysis for futures — daily bias from the candle structure, session
          profile, weekly context and correlated markets, with the measured historical accuracy
          of the same rules.
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
              isDark={isDark}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DailyBiasCard bias={bias} symbol={symbol} />
            <SessionProfileCard profiles={profiles} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WeeklyContextCard weekly={bias?.snapshot?.weekly} />
            <SmtCard smt={bias?.snapshot?.smt} symbol={symbol} />
          </div>

          <HitRateCard results={accuracy} cohort={cohort} bias={bias} />

          <AiNarrative symbol={symbol} bias={bias} accuracy={accuracy} cohort={cohort} />
        </>
      )}
    </div>
  );
};

export default AiAnalysis;
