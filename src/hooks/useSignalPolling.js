import { useCallback, useEffect, useRef, useState } from "react";
import { fetchMarketCandles, aggregateTo4hSession } from "../utils/marketData";

const MANUAL_REFRESH_COOLDOWN_MS = 30 * 1000;

/**
 * Polls all market data the ICT signal engine needs in one cycle:
 *   entry-timeframe candles (chart + CISD/FVG), higher-timeframe candles
 *   (choppiness gate), daily candles (daily bias), and correlated symbols at
 *   the entry timeframe (SMT divergence).
 * Only the entry fetch is fatal — the others degrade gracefully (rules report
 * "data unavailable" instead of the page erroring).
 *
 * @param {object} p
 * @param {string} p.market, p.symbol, p.timeframe - the traded instrument
 * @param {string} [p.htfTimeframe] - higher timeframe for the expansion gate
 * @param {string[]} [p.correlatedSymbols] - e.g. ['ES','YM'] (same market)
 * @returns {{ datasets, candles, loading, error, lastFetchedAt, nextRefreshAt, isPaused, refresh }}
 */
export function useSignalPolling({
  market,
  symbol,
  timeframe,
  htfTimeframe = null,
  correlatedSymbols = [],
  intervalMs = 5 * 60 * 1000,
}) {
  const [datasets, setDatasets] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetchedAt, setLastFetchedAt] = useState(null);
  const [nextRefreshAt, setNextRefreshAt] = useState(null);
  const [isPaused, setIsPaused] = useState(false);

  const cancelledRef = useRef(false);
  const intervalRef = useRef(null);
  const lastFetchedRef = useRef(0);
  const fetchingRef = useRef(false);

  // Stable key so array identity changes don't restart the effect
  const correlatedKey = correlatedSymbols.join(",");

  const doFetch = useCallback(
    async (showLoading) => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      if (showLoading) setLoading(true);
      const opts = {
        maxAgeMs: intervalMs,
        // Bypass the edge function's 5-min CDN cache when polling faster
        bustSeconds: intervalMs < 5 * 60 * 1000 ? Math.max(60, intervalMs / 1000) : undefined,
      };
      const corr = correlatedKey ? correlatedKey.split(",") : [];
      try {
        const [entryRes, htfRes, dailyRes, ...corrRes] = await Promise.allSettled([
          fetchMarketCandles(market, symbol, timeframe, opts),
          // 4h is rebuilt from 1h bars so candles anchor to the 18:00 ET
          // session open (22:00, 02:00, ...) instead of UTC buckets
          htfTimeframe === "4h"
            ? fetchMarketCandles(market, symbol, "1h", opts).then(aggregateTo4hSession)
            : htfTimeframe
              ? fetchMarketCandles(market, symbol, htfTimeframe, opts)
              : Promise.resolve(null),
          fetchMarketCandles(market, symbol, "1d", opts),
          ...corr.map((s) => fetchMarketCandles(market, s, timeframe, opts)),
        ]);
        if (cancelledRef.current) return;

        if (entryRes.status === "rejected") {
          throw entryRes.reason instanceof Error
            ? entryRes.reason
            : new Error("Failed to load chart data. Please try again.");
        }

        const correlated = {};
        corr.forEach((s, i) => {
          if (corrRes[i].status === "fulfilled") correlated[s] = corrRes[i].value;
        });

        setDatasets({
          entry: entryRes.value,
          htf: htfRes.status === "fulfilled" ? htfRes.value : null,
          daily: dailyRes.status === "fulfilled" ? dailyRes.value : null,
          correlated,
        });
        setError(null);
        const now = Date.now();
        lastFetchedRef.current = now;
        setLastFetchedAt(now);
        setNextRefreshAt(now + intervalMs);
      } catch (err) {
        if (cancelledRef.current) return;
        setError(err.message || "Failed to load chart data. Please try again.");
      } finally {
        fetchingRef.current = false;
        if (!cancelledRef.current) setLoading(false);
      }
    },
    [market, symbol, timeframe, htfTimeframe, correlatedKey, intervalMs]
  );

  useEffect(() => {
    cancelledRef.current = false;
    setDatasets(null);
    setError(null);

    const startInterval = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => doFetch(false), intervalMs);
    };

    doFetch(true);
    startInterval();

    const onVisibility = () => {
      if (document.hidden) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setIsPaused(true);
      } else {
        setIsPaused(false);
        if (Date.now() - lastFetchedRef.current >= intervalMs) {
          doFetch(false);
        }
        startInterval();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelledRef.current = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [doFetch, intervalMs]);

  // Manual refresh, rate-limited client-side. Returns false when on cooldown
  // so the caller can show a toast.
  const refresh = useCallback(() => {
    if (Date.now() - lastFetchedRef.current < MANUAL_REFRESH_COOLDOWN_MS) return false;
    doFetch(true);
    return true;
  }, [doFetch]);

  return {
    datasets,
    candles: datasets ? datasets.entry : null,
    loading,
    error,
    lastFetchedAt,
    nextRefreshAt,
    isPaused,
    refresh,
  };
}
