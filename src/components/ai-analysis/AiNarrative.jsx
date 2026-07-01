import React, { useEffect, useRef, useState, useCallback } from "react";
import PropTypes from "prop-types";
import { Sparkles, RefreshCw, AlertCircle } from "lucide-react";
import { supabase } from "../../lib/supabase";

// Only computed summaries leave the browser: the signal's levels and factor
// checklist, the indicator snapshot, and the backtest aggregates. Raw candles
// never do.
function buildPayload({ symbol, timeframe, signal, results, cohort }) {
  return {
    symbol,
    timeframe,
    signal: {
      direction: signal.direction,
      entry: signal.entry,
      stopLoss: signal.stopLoss,
      takeProfit: signal.takeProfit,
      confluencePct: signal.confluencePct,
      tier: signal.tier,
      factors: (signal.factors || []).slice(0, 8).map((f) => ({
        label: f.label,
        passed: f.passed,
        detail: f.detail,
      })),
    },
    indicators: {
      ema20: signal.snapshot?.ema20 ?? null,
      ema50: signal.snapshot?.ema50 ?? null,
      rsi14: signal.snapshot?.rsi14 ?? null,
      atr14: signal.snapshot?.atr14 ?? null,
    },
    backtest: {
      winRate: cohort?.winRate ?? results?.winRate ?? null,
      sampleSize: cohort?.total ?? results?.total ?? 0,
      avgR: results?.avgR ?? null,
      expired: results?.expired ?? 0,
    },
  };
}

/**
 * Plain-English explanation of the computed signal, written by the
 * ai-signal-narrative Edge Function. Renders nothing at all when the feature
 * isn't configured server-side (missing Gemini key → 503).
 */
const AiNarrative = ({ symbol, timeframe, signal, results, cohort }) => {
  const [narrative, setNarrative] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [unavailable, setUnavailable] = useState(false);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // A new signal invalidates the old explanation.
  useEffect(() => {
    setNarrative(null);
    setError(null);
  }, [symbol, timeframe, signal?.time, signal?.direction]);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "ai-signal-narrative",
        { body: buildPayload({ symbol, timeframe, signal, results, cohort }) },
      );
      if (fnError) {
        // supabase-js surfaces non-2xx as FunctionsHttpError with the response attached
        const status = fnError.context?.status;
        if (status === 503) {
          if (mountedRef.current) setUnavailable(true);
          return;
        }
        throw fnError;
      }
      if (!data?.success) throw new Error(data?.error || "Could not generate the explanation.");
      if (mountedRef.current) setNarrative(data.data);
    } catch {
      if (mountedRef.current) setError("We couldn't generate the explanation right now. Please try again.");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [symbol, timeframe, signal, results, cohort]);

  const hasSignal = signal && signal.direction !== "neutral";
  if (!hasSignal || unavailable) return null;

  return (
    <div className="card" data-testid="ai-analysis-narrative-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">AI explanation</h3>
        </div>
        {narrative && (
          <button
            type="button"
            onClick={generate}
            disabled={loading}
            data-testid="ai-analysis-narrative-refresh-btn"
            className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium flex items-center gap-1 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        )}
      </div>

      {loading && !narrative && (
        <div
          className="flex items-center justify-center py-6 text-gray-500 dark:text-gray-400"
          data-testid="ai-analysis-narrative-loading"
        >
          <RefreshCw className="w-5 h-5 animate-spin mr-2" />
          <span className="text-sm">Writing the explanation…</span>
        </div>
      )}

      {error && !loading && (
        <div
          className="p-3 rounded-lg bg-danger-50 dark:bg-danger-900/30 border border-danger-100 dark:border-danger-800 flex items-start gap-2"
          data-testid="ai-analysis-narrative-error"
        >
          <AlertCircle className="w-4 h-4 text-danger-600 dark:text-danger-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-danger-700 dark:text-danger-300">{error}</p>
        </div>
      )}

      {!loading && !error && !narrative && (
        <div className="text-center py-2">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Get a plain-English read of this setup — what lines up, what doesn&apos;t, and what the
            history says.
          </p>
          <button
            type="button"
            onClick={generate}
            data-testid="ai-analysis-narrative-generate-btn"
            className="btn-primary inline-flex items-center gap-2 text-sm px-4 py-2 rounded-lg"
          >
            <Sparkles className="w-4 h-4" />
            <span>Explain this signal</span>
          </button>
        </div>
      )}

      {narrative && (
        <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300" data-testid="ai-analysis-narrative-text">
          <p className="font-medium text-gray-900 dark:text-gray-100">{narrative.summary}</p>
          <p>{narrative.reasoning}</p>
          <p className="p-3 rounded-lg bg-warning-50 dark:bg-warning-900/30 border border-warning-100 dark:border-warning-800 text-warning-700 dark:text-warning-300">
            {narrative.riskNotes}
          </p>
        </div>
      )}
    </div>
  );
};

AiNarrative.propTypes = {
  symbol: PropTypes.string.isRequired,
  timeframe: PropTypes.string.isRequired,
  signal: PropTypes.shape({
    time: PropTypes.number,
    direction: PropTypes.string,
    entry: PropTypes.number,
    stopLoss: PropTypes.number,
    takeProfit: PropTypes.number,
    confluencePct: PropTypes.number,
    tier: PropTypes.string,
    factors: PropTypes.array,
    snapshot: PropTypes.object,
  }),
  results: PropTypes.shape({
    winRate: PropTypes.number,
    total: PropTypes.number,
    avgR: PropTypes.number,
    expired: PropTypes.number,
  }),
  cohort: PropTypes.shape({
    winRate: PropTypes.number,
    total: PropTypes.number,
  }),
};

export default AiNarrative;
