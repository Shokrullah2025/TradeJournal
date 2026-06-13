import React, { useMemo, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { Radar, AlertTriangle } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import { useSignalPolling } from "../hooks/useSignalPolling";
import { evaluateRuleset, MIN_CANDLES } from "../lib/signals/engine";
import LiveAnalysisChart from "../components/liveAnalysis/LiveAnalysisChart";
import SignalPanel from "../components/liveAnalysis/SignalPanel";
import RefreshCountdown from "../components/liveAnalysis/RefreshCountdown";
import DisclaimerBanner from "../components/liveAnalysis/DisclaimerBanner";

const INSTRUMENTS = [
  { market: "futures", symbol: "ES", label: "ES — S&P 500 Futures" },
  { market: "futures", symbol: "NQ", label: "NQ — Nasdaq 100 Futures" },
  { market: "futures", symbol: "YM", label: "YM — Dow Futures" },
  { market: "futures", symbol: "RTY", label: "RTY — Russell 2000 Futures" },
  { market: "futures", symbol: "CL", label: "CL — Crude Oil Futures" },
  { market: "stocks", symbol: "AAPL", label: "AAPL — Apple" },
  { market: "stocks", symbol: "MSFT", label: "MSFT — Microsoft" },
  { market: "stocks", symbol: "GOOGL", label: "GOOGL — Alphabet" },
];

// 1m excluded for v1 — too noisy for session-based rules
const TIMEFRAMES = ["5m", "15m", "30m", "1h"];

// Higher timeframe used by the "supports expansion" gate, per entry timeframe
const HTF_MAP = { "5m": "1h", "15m": "4h", "30m": "4h", "1h": "1d" };

// Correlated index futures for SMT divergence (futures only)
const CORRELATED_MAP = {
  ES: ["NQ", "YM"],
  NQ: ["ES", "YM"],
  YM: ["ES", "NQ"],
  RTY: ["ES", "NQ"],
};

const REFRESH_OPTIONS = [
  { label: "Refresh: 1m", ms: 60 * 1000 },
  { label: "Refresh: 2m", ms: 2 * 60 * 1000 },
  { label: "Refresh: 5m", ms: 5 * 60 * 1000 },
];

const LiveAnalysis = () => {
  const { isDark } = useTheme();
  const [instrumentKey, setInstrumentKey] = useState("futures:ES");
  const [timeframe, setTimeframe] = useState("15m");
  const [refreshMs, setRefreshMs] = useState(REFRESH_OPTIONS[0].ms);

  const instrument =
    INSTRUMENTS.find((i) => `${i.market}:${i.symbol}` === instrumentKey) ||
    INSTRUMENTS[0];

  const correlatedSymbols = useMemo(
    () => (instrument.market === "futures" ? CORRELATED_MAP[instrument.symbol] || [] : []),
    [instrument.market, instrument.symbol]
  );

  const { datasets, candles, loading, error, nextRefreshAt, isPaused, refresh } =
    useSignalPolling({
      market: instrument.market,
      symbol: instrument.symbol,
      timeframe,
      htfTimeframe: HTF_MAP[timeframe] || "4h",
      correlatedSymbols,
      intervalMs: refreshMs,
    });

  const { signal, signalError } = useMemo(() => {
    if (!datasets || !datasets.entry || datasets.entry.length < MIN_CANDLES) {
      return { signal: null, signalError: null };
    }
    try {
      return {
        signal: evaluateRuleset(datasets, Math.floor(Date.now() / 1000), {
          symbol: instrument.symbol,
          timeframe,
        }),
        signalError: null,
      };
    } catch (err) {
      return { signal: null, signalError: err.message };
    }
  }, [datasets, instrument.symbol, timeframe]);

  const handleRefresh = useCallback(() => {
    if (!refresh()) {
      toast("Please wait at least 30 seconds between manual refreshes.");
    }
  }, [refresh]);

  return (
    <div className="flex flex-col gap-4 xl:h-full">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Radar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Live Analysis
          </h1>
        </div>
        <RefreshCountdown
          nextRefreshAt={nextRefreshAt}
          isPaused={isPaused}
          onRefresh={handleRefresh}
          loading={loading}
        />
      </div>

      <DisclaimerBanner />

      <div className="flex items-center gap-3 flex-wrap">
        <select
          data-testid="live-analysis-symbol-select"
          value={instrumentKey}
          onChange={(e) => setInstrumentKey(e.target.value)}
          className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
        >
          {INSTRUMENTS.map((i) => (
            <option key={`${i.market}:${i.symbol}`} value={`${i.market}:${i.symbol}`}>
              {i.label}
            </option>
          ))}
        </select>
        <select
          data-testid="live-analysis-timeframe-select"
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value)}
          className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
        >
          {TIMEFRAMES.map((tf) => (
            <option key={tf} value={tf}>
              {tf}
            </option>
          ))}
        </select>
        <select
          data-testid="live-analysis-refresh-interval-select"
          value={refreshMs}
          onChange={(e) => setRefreshMs(Number(e.target.value))}
          className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
        >
          {REFRESH_OPTIONS.map((o) => (
            <option key={o.ms} value={o.ms}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div
          data-testid="live-analysis-error-banner"
          className="flex items-start gap-2 p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm"
        >
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && !candles && (
        <div
          data-testid="live-analysis-loading-spinner"
          className="flex items-center justify-center h-64"
        >
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      )}

      {candles && (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 xl:flex-1 xl:min-h-0">
          <div className="xl:col-span-3 xl:h-full xl:min-h-0">
            <LiveAnalysisChart
              candles={candles}
              signal={signal}
              isDark={isDark}
              htfCandles={datasets ? datasets.htf : null}
              htfTimeframe={HTF_MAP[timeframe] || "4h"}
            />
          </div>
          <div className="xl:h-full xl:min-h-0 xl:overflow-y-auto">
            {signal ? (
              <SignalPanel signal={signal} />
            ) : (
              <div
                data-testid="live-analysis-empty-state"
                className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400"
              >
                {signalError ||
                  "Not enough chart history to run the analysis yet. Try a different symbol or timeframe."}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveAnalysis;
